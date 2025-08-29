import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/index.js';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { createNotification } from './notifications.js';
import { z } from 'zod';

const router = express.Router();

// FUNCIÓN UNIFICADA para normalizar fechas SIN zona horaria - solo preservar string exacto
const normalizeDateString = (dateInput: any): string => {
  if (!dateInput) return '';
  
  // Si ya está en formato YYYY-MM-DD, retornar exactamente como está
  if (typeof dateInput === 'string') {
    const cleanDate = dateInput.trim();
    const isoPattern = /^\d{4}-\d{2}-\d{2}$/;
    if (isoPattern.test(cleanDate)) {
      console.log(`📦 Boxito: Fecha ya en formato YYYY-MM-DD: ${cleanDate}`);
      return cleanDate;
    }
    
    // Si es DD/MM/YYYY, convertir a YYYY-MM-DD
    const ddmmPattern = /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/;
    const ddmmMatch = cleanDate.match(ddmmPattern);
    if (ddmmMatch) {
      const day = ddmmMatch[1].padStart(2, '0');
      const month = ddmmMatch[2].padStart(2, '0');
      const year = ddmmMatch[3];
      const resultado = `${year}-${month}-${day}`;
      console.log(`📦 Boxito: Convertido ${cleanDate} → ${resultado}`);
      return resultado;
    }
  }
  
  // Si es número (Excel), convertir sin zona horaria
  if (typeof dateInput === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    const resultDate = new Date(excelEpoch.getTime() + dateInput * 24 * 60 * 60 * 1000);
    const year = resultDate.getFullYear();
    const month = String(resultDate.getMonth() + 1).padStart(2, '0');
    const day = String(resultDate.getDate()).padStart(2, '0');
    const resultado = `${year}-${month}-${day}`;
    console.log(`📦 Boxito: Fecha Excel ${dateInput} → ${resultado}`);
    return resultado;
  }
  
  throw new Error(`Formato de fecha no soportado: ${dateInput} (tipo: ${typeof dateInput})`);
};

// Validation schemas con normalización mejorada
const invoiceSchema = z.object({
  paqueteria: z.string().min(1, 'Paquetería es requerida'),
  numero_comprobante: z.string().min(1, 'Número de comprobante es requerido'),
  cliente: z.string().min(1, 'Cliente es requerido'),
  rfc: z.string().min(12, 'RFC debe tener al menos 12 caracteres').max(13, 'RFC debe tener máximo 13 caracteres'),
  credito: z.number().int().min(0, 'Crédito debe ser un número positivo'),
  fecha_creacion: z.string().transform((val) => normalizeDateString(val)),
  fecha_vencimiento: z.string().transform((val) => normalizeDateString(val)),
  total: z.number().min(0, 'Total debe ser un número positivo'),
  pago1: z.number().min(0).optional().default(0),
  fecha_pago1: z.string().nullable().optional().transform((val) => val ? normalizeDateString(val) : null),
  pago2: z.number().min(0).optional().default(0),
  fecha_pago2: z.string().nullable().optional().transform((val) => val ? normalizeDateString(val) : null),
  pago3: z.number().min(0).optional().default(0),
  fecha_pago3: z.string().nullable().optional().transform((val) => val ? normalizeDateString(val) : null),
  nc: z.number().min(0).optional().default(0),
  por_cobrar: z.number().min(0),
  estatus: z.enum(['Pendiente', 'Pagada']),
  comentarios: z.string().optional(),
  cfdi: z.string().optional(),
  soporte: z.string().optional()
});

const bulkUploadSchema = z.object({
  invoices: z.array(invoiceSchema).min(1, 'Al menos una factura es requerida')
});

// GET /api/invoices - Get all invoices
router.get('/', authMiddleware, requirePermission('facturacion', 'read'), async (req, res) => {
  try {
    console.log('📦 Boxito: Getting all invoices...');
    
    const { estatus, cliente, numero_comprobante, limit, offset } = req.query;
    
    let query = db
      .selectFrom('invoices')
      .selectAll()
      .orderBy('created_at', 'desc');
    
    if (estatus) {
      query = query.where('estatus', '=', estatus as string);
    }
    
    if (cliente) {
      query = query.where('cliente', 'like', `%${cliente}%`);
    }
    
    if (numero_comprobante) {
      query = query.where('numero_comprobante', 'like', `%${numero_comprobante}%`);
    }
    
    if (limit) {
      query = query.limit(Number(limit));
    }
    
    if (offset) {
      query = query.offset(Number(offset));
    }
    
    const invoices = await query.execute();
    
    console.log(`📦 Boxito: Retrieved ${invoices.length} invoices`);
    console.log('📦 Boxito: Sample invoice dates:', invoices.slice(0, 2).map(i => ({
      numero: i.numero_comprobante,
      fecha_creacion: i.fecha_creacion,
      fecha_vencimiento: i.fecha_vencimiento
    })));
    
    res.json(invoices);
  } catch (error) {
    console.error('📦 Boxito: Error getting invoices:', error);
    res.status(500).json({ error: 'Error al obtener facturas' });
  }
});

// POST /api/invoices - Create new invoice
router.post('/', authMiddleware, requirePermission('facturacion', 'create'), async (req, res) => {
  try {
    console.log('📦 Boxito: Creating new invoice...', {
      numero_comprobante: req.body.numero_comprobante,
      fecha_creacion: req.body.fecha_creacion,
      cliente: req.body.cliente
    });
    
    // Validate input
    const validatedData = invoiceSchema.parse(req.body);
    
    console.log('📦 Boxito: Validated data:', {
      numero_comprobante: validatedData.numero_comprobante,
      fecha_creacion: validatedData.fecha_creacion,
      fecha_vencimiento: validatedData.fecha_vencimiento,
      total: validatedData.total,
      cliente: validatedData.cliente
    });
    
    // Check if numero_comprobante already exists
    const existingInvoice = await db
      .selectFrom('invoices')
      .select(['id'])
      .where('numero_comprobante', '=', validatedData.numero_comprobante)
      .executeTakeFirst();
    
    if (existingInvoice) {
      res.status(400).json({ error: 'Ya existe una factura con ese número de comprobante' });
      return;
    }
    
    const invoiceId = uuidv4();
    const now = new Date().toISOString();
    
    // Auto-calculate por_cobrar and status
    const totalPaid = (validatedData.pago1 || 0) + (validatedData.pago2 || 0) + (validatedData.pago3 || 0) + (validatedData.nc || 0);
    const calculatedPorCobrar = Math.max(0, validatedData.total - totalPaid);
    const calculatedStatus = calculatedPorCobrar <= 0 ? 'Pagada' : 'Pendiente';
    
    console.log('📦 Boxito: Auto-calculated values:', {
      total: validatedData.total,
      totalPaid,
      calculatedPorCobrar,
      calculatedStatus
    });
    
    const newInvoice = await db
      .insertInto('invoices')
      .values({
        id: invoiceId,
        paqueteria: validatedData.paqueteria,
        numero_comprobante: validatedData.numero_comprobante,
        cliente: validatedData.cliente,
        rfc: validatedData.rfc,
        credito: validatedData.credito,
        fecha_creacion: validatedData.fecha_creacion,
        fecha_vencimiento: validatedData.fecha_vencimiento,
        total: validatedData.total,
        pago1: validatedData.pago1 || 0,
        fecha_pago1: validatedData.fecha_pago1 || null,
        pago2: validatedData.pago2 || 0,
        fecha_pago2: validatedData.fecha_pago2 || null,
        pago3: validatedData.pago3 || 0,
        fecha_pago3: validatedData.fecha_pago3 || null,
        nc: validatedData.nc || 0,
        por_cobrar: calculatedPorCobrar,
        estatus: calculatedStatus,
        comentarios: validatedData.comentarios || null,
        cfdi: validatedData.cfdi || null,
        soporte: validatedData.soporte || null,
        created_at: now,
        updated_at: now
      })
      .returningAll()
      .executeTakeFirst();
    
    console.log(`📦 Boxito: Created invoice ${newInvoice!.numero_comprobante} with dates:`, {
      fecha_creacion: newInvoice!.fecha_creacion,
      fecha_vencimiento: newInvoice!.fecha_vencimiento,
      status: calculatedStatus
    });
    
    // Create notification
    await createNotification(
      'Nueva Factura Creada',
      `Factura ${validatedData.numero_comprobante} creada para ${validatedData.cliente} por $${validatedData.total.toLocaleString('es-MX')} - Estado: ${calculatedStatus}`,
      'success'
    );
    
    res.status(201).json(newInvoice);
  } catch (error) {
    console.error('📦 Boxito: Error creating invoice:', error);
    
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        error: 'Datos inválidos',
        details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      });
      return;
    }
    
    res.status(500).json({ error: 'Error al crear factura' });
  }
});

// POST /api/invoices/bulk-upload - Bulk upload invoices
router.post('/bulk-upload', authMiddleware, requirePermission('facturacion', 'create'), async (req, res) => {
  try {
    console.log('📦 Boxito: Starting bulk upload...', { count: req.body.invoices?.length });
    
    const validationResult = bulkUploadSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      console.log('📦 Boxito: Validation failed:', validationResult.error);
      res.status(400).json({ 
        error: 'Datos inválidos en el archivo',
        details: validationResult.error.errors?.map(e => `${e.path.join('.')}: ${e.message}`) || ['Error de validación desconocido']
      });
      return;
    }
    
    const { invoices } = validationResult.data;
    
    let created = 0;
    let errors = 0;
    const errorDetails: string[] = [];
    
    // Process each invoice
    for (let i = 0; i < invoices.length; i++) {
      try {
        const invoice = invoices[i];
        
        // Check if numero_comprobante already exists
        const existing = await db
          .selectFrom('invoices')
          .select(['id'])
          .where('numero_comprobante', '=', invoice.numero_comprobante)
          .executeTakeFirst();
        
        if (existing) {
          errors++;
          errorDetails.push(`Fila ${i + 1}: Número de comprobante ${invoice.numero_comprobante} ya existe`);
          continue;
        }
        
        const invoiceId = uuidv4();
        const now = new Date().toISOString();
        
        // Auto-calculate por_cobrar and status for bulk upload
        const totalPaid = (invoice.pago1 || 0) + (invoice.pago2 || 0) + (invoice.pago3 || 0) + (invoice.nc || 0);
        const calculatedPorCobrar = Math.max(0, invoice.total - totalPaid);
        const calculatedStatus = calculatedPorCobrar <= 0 ? 'Pagada' : 'Pendiente';
        
        console.log(`📦 Boxito: Processing invoice ${i + 1}: ${invoice.numero_comprobante}, fecha: ${invoice.fecha_creacion} → ${calculatedStatus}`);
        
        await db
          .insertInto('invoices')
          .values({
            id: invoiceId,
            paqueteria: invoice.paqueteria,
            numero_comprobante: invoice.numero_comprobante,
            cliente: invoice.cliente,
            rfc: invoice.rfc,
            credito: invoice.credito,
            fecha_creacion: invoice.fecha_creacion, // Fecha exacta sin conversión
            fecha_vencimiento: invoice.fecha_vencimiento,
            total: invoice.total,
            pago1: invoice.pago1 || 0,
            fecha_pago1: invoice.fecha_pago1 || null,
            pago2: invoice.pago2 || 0,
            fecha_pago2: invoice.fecha_pago2 || null,
            pago3: invoice.pago3 || 0,
            fecha_pago3: invoice.fecha_pago3 || null,
            nc: invoice.nc || 0,
            por_cobrar: calculatedPorCobrar,
            estatus: calculatedStatus,
            comentarios: invoice.comentarios || null,
            cfdi: invoice.cfdi || null,
            soporte: invoice.soporte || null,
            created_at: now,
            updated_at: now
          })
          .execute();
        
        created++;
        console.log(`📦 Boxito: Created invoice ${invoice.numero_comprobante} with status ${calculatedStatus} (${created}/${invoices.length})`);
        
      } catch (invoiceError) {
        errors++;
        errorDetails.push(`Fila ${i + 1}: ${invoiceError instanceof Error ? invoiceError.message : 'Error desconocido'}`);
        console.error(`📦 Boxito: Error creating invoice at row ${i + 1}:`, invoiceError);
      }
    }
    
    console.log(`📦 Boxito: Bulk upload completed - Created: ${created}, Errors: ${errors}`);
    
    // Create notification
    await createNotification(
      'Carga Masiva Completada',
      `${created} facturas creadas exitosamente${errors > 0 ? `, ${errors} errores` : ''}`,
      errors === 0 ? 'success' : 'warning'
    );
    
    res.json({
      message: `Carga masiva completada: ${created} facturas creadas, ${errors} errores`,
      created,
      errors,
      errorDetails: errors > 0 ? errorDetails : undefined
    });
  } catch (error) {
    console.error('📦 Boxito: Error in bulk upload:', error);
    res.status(500).json({ error: 'Error en carga masiva' });
  }
});

// PUT /api/invoices/:id - Update invoice
router.put('/:id', authMiddleware, requirePermission('facturacion', 'update'), async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📦 Boxito: Updating invoice ${id}...`);
    
    // Validate input
    const validatedData = invoiceSchema.parse(req.body);
    
    // Check if invoice exists
    const existingInvoice = await db
      .selectFrom('invoices')
      .select(['numero_comprobante'])
      .where('id', '=', id)
      .executeTakeFirst();
    
    if (!existingInvoice) {
      res.status(404).json({ error: 'Factura no encontrada' });
      return;
    }
    
    // Check if numero_comprobante is used by another invoice
    if (existingInvoice.numero_comprobante !== validatedData.numero_comprobante) {
      const duplicateInvoice = await db
        .selectFrom('invoices')
        .select(['id'])
        .where('numero_comprobante', '=', validatedData.numero_comprobante)
        .where('id', '!=', id)
        .executeTakeFirst();
      
      if (duplicateInvoice) {
        res.status(400).json({ error: 'Ya existe una factura con ese número de comprobante' });
        return;
      }
    }
    
    // Auto-calculate por_cobrar and status
    const totalPaid = (validatedData.pago1 || 0) + (validatedData.pago2 || 0) + (validatedData.pago3 || 0) + (validatedData.nc || 0);
    const calculatedPorCobrar = Math.max(0, validatedData.total - totalPaid);
    const calculatedStatus = calculatedPorCobrar <= 0 ? 'Pagada' : 'Pendiente';
    
    console.log('📦 Boxito: Update calculation:', {
      total: validatedData.total,
      totalPaid,
      calculatedPorCobrar,
      calculatedStatus,
      fecha_creacion: validatedData.fecha_creacion
    });
    
    const updatedInvoice = await db
      .updateTable('invoices')
      .set({
        paqueteria: validatedData.paqueteria,
        numero_comprobante: validatedData.numero_comprobante,
        cliente: validatedData.cliente,
        rfc: validatedData.rfc,
        credito: validatedData.credito,
        fecha_creacion: validatedData.fecha_creacion, // Fecha exacta preservada
        fecha_vencimiento: validatedData.fecha_vencimiento,
        total: validatedData.total,
        pago1: validatedData.pago1 || 0,
        fecha_pago1: validatedData.fecha_pago1 || null,
        pago2: validatedData.pago2 || 0,
        fecha_pago2: validatedData.fecha_pago2 || null,
        pago3: validatedData.pago3 || 0,
        fecha_pago3: validatedData.fecha_pago3 || null,
        nc: validatedData.nc || 0,
        por_cobrar: calculatedPorCobrar,
        estatus: calculatedStatus,
        comentarios: validatedData.comentarios || null,
        cfdi: validatedData.cfdi || null,
        soporte: validatedData.soporte || null,
        updated_at: new Date().toISOString()
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();
    
    console.log(`📦 Boxito: Updated invoice ${updatedInvoice!.numero_comprobante} with dates:`, {
      fecha_creacion: updatedInvoice!.fecha_creacion,
      fecha_vencimiento: updatedInvoice!.fecha_vencimiento,
      status: calculatedStatus
    });
    
    res.json(updatedInvoice);
  } catch (error) {
    console.error('📦 Boxito: Error updating invoice:', error);
    
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        error: 'Datos inválidos',
        details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      });
      return;
    }
    
    res.status(500).json({ error: 'Error al actualizar factura' });
  }
});

// DELETE /api/invoices/:id - Delete invoice
router.delete('/:id', authMiddleware, requirePermission('facturacion', 'delete'), async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📦 Boxito: Deleting invoice ${id}...`);
    
    const deletedInvoice = await db
      .deleteFrom('invoices')
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();
    
    if (!deletedInvoice) {
      res.status(404).json({ error: 'Factura no encontrada' });
      return;
    }
    
    console.log(`📦 Boxito: Deleted invoice ${deletedInvoice.numero_comprobante}`);
    res.json({ message: 'Factura eliminada exitosamente' });
  } catch (error) {
    console.error('📦 Boxito: Error deleting invoice:', error);
    res.status(500).json({ error: 'Error al eliminar factura' });
  }
});

// GET /api/invoices/:id - Get invoice by ID
router.get('/:id', authMiddleware, requirePermission('facturacion', 'read'), async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📦 Boxito: Getting invoice ${id}...`);
    
    const invoice = await db
      .selectFrom('invoices')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    
    if (!invoice) {
      res.status(404).json({ error: 'Factura no encontrada' });
      return;
    }
    
    console.log(`📦 Boxito: Retrieved invoice ${invoice.numero_comprobante}`);
    res.json(invoice);
  } catch (error) {
    console.error('📦 Boxito: Error getting invoice:', error);
    res.status(500).json({ error: 'Error al obtener factura' });
  }
});

// GET /api/invoices/overdue - Get overdue invoices
router.get('/overdue', authMiddleware, requirePermission('facturacion', 'read'), async (req, res) => {
  try {
    console.log('📦 Boxito: Getting overdue invoices...');
    
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    const overdueInvoices = await db
      .selectFrom('invoices')
      .selectAll()
      .where('estatus', '=', 'Pendiente')
      .where('fecha_vencimiento', '<', today)
      .where('por_cobrar', '>', 0)
      .orderBy('fecha_vencimiento', 'asc')
      .execute();
    
    console.log(`📦 Boxito: Found ${overdueInvoices.length} overdue invoices`);
    res.json(overdueInvoices);
  } catch (error) {
    console.error('📦 Boxito: Error getting overdue invoices:', error);
    res.status(500).json({ error: 'Error al obtener facturas vencidas' });
  }
});

export { router as invoiceRoutes, normalizeDateString };
