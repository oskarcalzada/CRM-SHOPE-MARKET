import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/index.js';
import { clientSchema } from '../validators/index.js';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { createNotification } from './notifications.js';

const router = express.Router();

// Get all clients
router.get('/', authMiddleware, requirePermission('directorio', 'read'), async (req, res) => {
  try {
    console.log('📦 Boxito: Getting all clients...');
    
    const { search, rfc } = req.query;
    
    let query = db.selectFrom('clients').selectAll().orderBy('created_at', 'desc');

    // Apply search filters
    if (search) {
      query = query.where((eb) => 
        eb.or([
          eb('cliente', 'like', `%${search}%`),
          eb('rfc', 'like', `%${search}%`),
          eb('contacto', 'like', `%${search}%`)
        ])
      );
    }

    if (rfc) {
      query = query.where('rfc', '=', rfc as string);
    }

    const clients = await query.execute();
    
    console.log(`📦 Boxito: Retrieved ${clients.length} clients`);
    res.json(clients);
  } catch (error) {
    console.error('📦 Boxito: Error getting clients:', error);
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
});

// Create new client
router.post('/', authMiddleware, requirePermission('directorio', 'create'), async (req, res) => {
  try {
    console.log('📦 Boxito: Creating new client...');
    
    const clientData = clientSchema.parse(req.body);
    
    // Check if RFC already exists
    const existingClient = await db
      .selectFrom('clients')
      .select(['id'])
      .where('rfc', '=', clientData.rfc)
      .executeTakeFirst();
    
    if (existingClient) {
      res.status(400).json({ error: 'Ya existe un cliente con ese RFC' });
      return;
    }
    
    const clientId = uuidv4();
    const now = new Date().toISOString();

    // Calculate completion percentage
    const totalFields = 11; // Total possible fields to complete
    let completedFields = 4; // Required fields: cliente, rfc, credito, and id
    
    if (clientData.contacto) completedFields++;
    if (clientData.direccion) completedFields++;
    if (clientData.mail) completedFields++;
    if (clientData.tel) completedFields++;
    if (clientData.documentos?.constanciaFiscal) completedFields++;
    if (clientData.documentos?.actaConstitutiva) completedFields++;
    if (clientData.documentos?.identificacion) completedFields++;
    if (clientData.documentos?.comprobanteDomicilio) completedFields++;
    if (clientData.contactoCobro1?.nombre && clientData.contactoCobro1?.correo) completedFields++;
    
    const porcentajeCompletado = Math.round((completedFields / totalFields) * 100);

    const newClient = await db
      .insertInto('clients')
      .values({
        id: clientId,
        id_cliente: clientData.id_cliente || null,
        cliente: clientData.cliente,
        rfc: clientData.rfc,
        credito: clientData.credito || 0,
        contacto: clientData.contacto || null,
        direccion: clientData.direccion || null,
        mail: clientData.mail || null,
        tel: clientData.tel || null,
        constancia_fiscal: clientData.documentos?.constanciaFiscal || null,
        acta_constitutiva: clientData.documentos?.actaConstitutiva || null,
        identificacion: clientData.documentos?.identificacion || null,
        comprobante_domicilio: clientData.documentos?.comprobanteDomicilio || null,
        contacto_cobro1_nombre: clientData.contactoCobro1?.nombre || null,
        contacto_cobro1_correo: clientData.contactoCobro1?.correo || null,
        contacto_cobro2_nombre: clientData.contactoCobro2?.nombre || null,
        contacto_cobro2_correo: clientData.contactoCobro2?.correo || null,
        porcentaje_completado: porcentajeCompletado,
        created_at: now,
        updated_at: now
      })
      .returningAll()
      .executeTakeFirst();

    console.log(`📦 Boxito: Created client ${clientData.cliente} with ${porcentajeCompletado}% completion`);

    // Create notification
    await createNotification(
      'Nuevo Cliente Registrado',
      `${clientData.cliente} registrado en directorio con ${porcentajeCompletado}% de información completada`,
      'success'
    );

    res.status(201).json(newClient);
  } catch (error) {
    console.error('📦 Boxito: Error creating client:', error);
    res.status(400).json({ error: 'Error al crear cliente' });
  }
});

// Update client
router.put('/:id', authMiddleware, requirePermission('directorio', 'update'), async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📦 Boxito: Updating client ${id}...`);
    
    const clientData = clientSchema.parse(req.body);
    
    // Check if RFC is used by another client
    const existingClient = await db
      .selectFrom('clients')
      .select(['id', 'cliente'])
      .where('rfc', '=', clientData.rfc)
      .where('id', '!=', id)
      .executeTakeFirst();
    
    if (existingClient) {
      res.status(400).json({ error: 'Ya existe otro cliente con ese RFC' });
      return;
    }

    // Calculate completion percentage
    const totalFields = 11;
    let completedFields = 4; // Required fields
    
    if (clientData.contacto) completedFields++;
    if (clientData.direccion) completedFields++;
    if (clientData.mail) completedFields++;
    if (clientData.tel) completedFields++;
    if (clientData.documentos?.constanciaFiscal) completedFields++;
    if (clientData.documentos?.actaConstitutiva) completedFields++;
    if (clientData.documentos?.identificacion) completedFields++;
    if (clientData.documentos?.comprobanteDomicilio) completedFields++;
    if (clientData.contactoCobro1?.nombre && clientData.contactoCobro1?.correo) completedFields++;
    
    const porcentajeCompletado = Math.round((completedFields / totalFields) * 100);

    const updatedClient = await db
      .updateTable('clients')
      .set({
        id_cliente: clientData.id_cliente || null,
        cliente: clientData.cliente,
        rfc: clientData.rfc,
        credito: clientData.credito || 0,
        contacto: clientData.contacto || null,
        direccion: clientData.direccion || null,
        mail: clientData.mail || null,
        tel: clientData.tel || null,
        constancia_fiscal: clientData.documentos?.constanciaFiscal || null,
        acta_constitutiva: clientData.documentos?.actaConstitutiva || null,
        identificacion: clientData.documentos?.identificacion || null,
        comprobante_domicilio: clientData.documentos?.comprobanteDomicilio || null,
        contacto_cobro1_nombre: clientData.contactoCobro1?.nombre || null,
        contacto_cobro1_correo: clientData.contactoCobro1?.correo || null,
        contacto_cobro2_nombre: clientData.contactoCobro2?.nombre || null,
        contacto_cobro2_correo: clientData.contactoCobro2?.correo || null,
        porcentaje_completado: porcentajeCompletado,
        updated_at: new Date().toISOString()
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();

    if (!updatedClient) {
      res.status(404).json({ error: 'Cliente no encontrado' });
      return;
    }

    console.log(`📦 Boxito: Updated client ${updatedClient.cliente}`);
    res.json(updatedClient);
  } catch (error) {
    console.error('📦 Boxito: Error updating client:', error);
    res.status(400).json({ error: 'Error al actualizar cliente' });
  }
});

// Delete client
router.delete('/:id', authMiddleware, requirePermission('directorio', 'delete'), async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📦 Boxito: Deleting client ${id}...`);

    // Check if client has invoices
    const invoiceCount = await db
      .selectFrom('invoices')
      .select(db.fn.countAll().as('count'))
      .where('cliente', '=', (
        db.selectFrom('clients')
          .select('cliente')
          .where('id', '=', id)
      ))
      .executeTakeFirst();

    if (Number(invoiceCount?.count || 0) > 0) {
      res.status(400).json({ 
        error: 'No se puede eliminar el cliente porque tiene facturas asociadas' 
      });
      return;
    }

    const deletedClient = await db
      .deleteFrom('clients')
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();

    if (!deletedClient) {
      res.status(404).json({ error: 'Cliente no encontrado' });
      return;
    }

    console.log(`📦 Boxito: Deleted client ${deletedClient.cliente}`);
    res.json({ message: 'Cliente eliminado exitosamente' });
  } catch (error) {
    console.error('📦 Boxito: Error deleting client:', error);
    res.status(500).json({ error: 'Error al eliminar cliente' });
  }
});

// Get client by ID
router.get('/:id', authMiddleware, requirePermission('directorio', 'read'), async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📦 Boxito: Getting client ${id}...`);

    const client = await db
      .selectFrom('clients')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (!client) {
      res.status(404).json({ error: 'Cliente no encontrado' });
      return;
    }

    // Transform to frontend format
    const transformedClient = {
      ...client,
      documentos: {
        constanciaFiscal: client.constancia_fiscal,
        actaConstitutiva: client.acta_constitutiva,
        identificacion: client.identificacion,
        comprobanteDomicilio: client.comprobante_domicilio
      },
      contactoCobro1: {
        nombre: client.contacto_cobro1_nombre,
        correo: client.contacto_cobro1_correo
      },
      contactoCobro2: {
        nombre: client.contacto_cobro2_nombre,
        correo: client.contacto_cobro2_correo
      }
    };

    res.json(transformedClient);
  } catch (error) {
    console.error('📦 Boxito: Error getting client:', error);
    res.status(500).json({ error: 'Error al obtener cliente' });
  }
});

// Get client stats
router.get('/stats/summary', authMiddleware, requirePermission('directorio', 'read'), async (req, res) => {
  try {
    const [totalClients, avgCompletion] = await Promise.all([
      db.selectFrom('clients').select(db.fn.countAll().as('count')).executeTakeFirst(),
      db.selectFrom('clients').select(db.fn.avg('porcentaje_completado').as('avg')).executeTakeFirst()
    ]);

    // Get completion distribution
    const completionRanges = await db
      .selectFrom('clients')
      .select([
        db.fn.countAll().as('count'),
        db.raw('CASE WHEN porcentaje_completado < 50 THEN "Bajo" WHEN porcentaje_completado < 80 THEN "Medio" ELSE "Alto" END AS rango')
      ])
      .groupBy('rango')
      .execute();

    const stats = {
      total: {
        clients: Number(totalClients?.count || 0),
        avgCompletion: Number(avgCompletion?.avg || 0)
      },
      completionRanges: completionRanges.map(item => ({
        rango: item.rango,
        count: Number(item.count)
      }))
    };

    res.json(stats);
  } catch (error) {
    console.error('📦 Boxito: Error getting client stats:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas de clientes' });
  }
});

export { router as clientRoutes };
