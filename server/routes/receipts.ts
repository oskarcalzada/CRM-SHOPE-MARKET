import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/index.js';
import { receiptSchema } from '../validators/index.js';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { createNotification } from './notifications.js';

const router = express.Router();

// Get all receipts
router.get('/', authMiddleware, requirePermission('comprobantes', 'read'), async (req, res) => {
  try {
    const { id_asociado, status, tipo, factura, mes } = req.query;
    
    let query = db.selectFrom('receipts').selectAll().orderBy('created_at', 'desc');

    // Apply filters
    if (id_asociado) {
      query = query.where('id_asociado', 'like', `%${id_asociado}%`);
    }

    if (status) {
      query = query.where('status', 'like', `%${status}%`);
    }

    if (tipo) {
      query = query.where('tipo', 'like', `%${tipo}%`);
    }

    if (factura) {
      query = query.where('factura', 'like', `%${factura}%`);
    }

    if (mes && mes !== 'all') {
      const year = new Date().getFullYear();
      const startDate = `${year}-${String(mes).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(mes).padStart(2, '0')}-31`;
      query = query.where('fecha', '>=', startDate)
                   .where('fecha', '<=', endDate);
    }

    const receipts = await query.execute();

    // Transform database format to frontend format
    const transformedReceipts = receipts.map(receipt => ({
      id: receipt.id,
      id_asociado: receipt.id_asociado,
      status: receipt.status,
      monto: receipt.monto,
      tipo: receipt.tipo,
      fecha: receipt.fecha,
      link: receipt.link,
      factura: receipt.factura,
      created_at: receipt.created_at,
      updated_at: receipt.updated_at
    }));

    console.log(`📦 Boxito: Enviando ${transformedReceipts.length} comprobantes`);
    res.json(transformedReceipts);
  } catch (error) {
    console.error('📦 Boxito: Error obteniendo comprobantes:', error);
    res.status(500).json({ error: 'Error al obtener comprobantes' });
  }
});

// Create new receipt
router.post('/', authMiddleware, requirePermission('comprobantes', 'create'), async (req, res) => {
  try {
    const receiptData = receiptSchema.parse(req.body);
    
    const receiptId = uuidv4();
    const now = new Date().toISOString();

    await db
      .insertInto('receipts')
      .values({
        id: receiptId,
        id_asociado: receiptData.id_asociado,
        status: receiptData.status,
        monto: receiptData.monto,
        tipo: receiptData.tipo,
        fecha: receiptData.fecha,
        link: receiptData.link || null,
        factura: receiptData.factura || null,
        created_at: now,
        updated_at: now
      })
      .execute();

    console.log(`📦 Boxito: Comprobante creado: ${receiptId} para ID asociado ${receiptData.id_asociado}`);

    // Create notification
    await createNotification(
      'Comprobante Registrado',
      `Comprobante ${receiptData.tipo} registrado para ID ${receiptData.id_asociado} por $${receiptData.monto}`,
      'info'
    );

    res.status(201).json({
      message: '📦 Comprobante registrado exitosamente',
      receiptId
    });
  } catch (error) {
    console.error('📦 Boxito: Error creando comprobante:', error);
    res.status(400).json({ error: 'Error al crear comprobante' });
  }
});

// Bulk create receipts
router.post('/bulk', authMiddleware, requirePermission('comprobantes', 'create'), async (req, res) => {
  try {
    const { receipts } = req.body;
    
    if (!Array.isArray(receipts) || receipts.length === 0) {
      res.status(400).json({ error: 'Se requiere un array de comprobantes' });
      return;
    }

    const validatedReceipts = receipts.map(receipt => receiptSchema.parse(receipt));
    const now = new Date().toISOString();

    const receiptsToInsert = validatedReceipts.map(receipt => ({
      id: uuidv4(),
      id_asociado: receipt.id_asociado,
      status: receipt.status,
      monto: receipt.monto,
      tipo: receipt.tipo,
      fecha: receipt.fecha,
      link: receipt.link || null,
      factura: receipt.factura || null,
      created_at: now,
      updated_at: now
    }));

    await db
      .insertInto('receipts')
      .values(receiptsToInsert)
      .execute();

    console.log(`📦 Boxito: ${receiptsToInsert.length} comprobantes creados en lote`);

    // Create notification
    await createNotification(
      'Carga Masiva Completada',
      `${receiptsToInsert.length} comprobantes registrados exitosamente`,
      'success'
    );

    res.status(201).json({
      message: `📦 ${receiptsToInsert.length} comprobantes registrados exitosamente`,
      count: receiptsToInsert.length
    });
  } catch (error) {
    console.error('📦 Boxito: Error en carga masiva de comprobantes:', error);
    res.status(400).json({ error: 'Error en carga masiva de comprobantes' });
  }
});

// Update receipt
router.put('/:id', authMiddleware, requirePermission('comprobantes', 'update'), async (req, res) => {
  try {
    const { id } = req.params;
    const receiptData = receiptSchema.parse(req.body);

    const result = await db
      .updateTable('receipts')
      .set({
        id_asociado: receiptData.id_asociado,
        status: receiptData.status,
        monto: receiptData.monto,
        tipo: receiptData.tipo,
        fecha: receiptData.fecha,
        link: receiptData.link || null,
        factura: receiptData.factura || null,
        updated_at: new Date().toISOString()
      })
      .where('id', '=', id)
      .execute();

    if (result.numUpdatedRows === 0n) {
      res.status(404).json({ error: 'Comprobante no encontrado' });
      return;
    }

    console.log(`📦 Boxito: Comprobante actualizado: ${id}`);

    res.json({ message: '📦 Comprobante actualizado exitosamente' });
  } catch (error) {
    console.error('📦 Boxito: Error actualizando comprobante:', error);
    res.status(400).json({ error: 'Error al actualizar comprobante' });
  }
});

// Delete receipt
router.delete('/:id', authMiddleware, requirePermission('comprobantes', 'delete'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db
      .deleteFrom('receipts')
      .where('id', '=', id)
      .execute();

    if (result.numDeletedRows === 0n) {
      res.status(404).json({ error: 'Comprobante no encontrado' });
      return;
    }

    console.log(`📦 Boxito: Comprobante eliminado: ${id}`);

    res.json({ message: '📦 Comprobante eliminado exitosamente' });
  } catch (error) {
    console.error('📦 Boxito: Error eliminando comprobante:', error);
    res.status(500).json({ error: 'Error al eliminar comprobante' });
  }
});

// Get receipt by ID
router.get('/:id', authMiddleware, requirePermission('comprobantes', 'read'), async (req, res) => {
  try {
    const { id } = req.params;

    const receipt = await db
      .selectFrom('receipts')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (!receipt) {
      res.status(404).json({ error: 'Comprobante no encontrado' });
      return;
    }

    // Transform database format to frontend format
    const transformedReceipt = {
      id: receipt.id,
      id_asociado: receipt.id_asociado,
      status: receipt.status,
      monto: receipt.monto,
      tipo: receipt.tipo,
      fecha: receipt.fecha,
      link: receipt.link,
      factura: receipt.factura,
      created_at: receipt.created_at,
      updated_at: receipt.updated_at
    };

    res.json(transformedReceipt);
  } catch (error) {
    console.error('📦 Boxito: Error obteniendo comprobante:', error);
    res.status(500).json({ error: 'Error al obtener comprobante' });
  }
});

// Get receipts stats
router.get('/stats/summary', authMiddleware, requirePermission('comprobantes', 'read'), async (req, res) => {
  try {
    const [totalReceipts, totalAmount, avgAmount] = await Promise.all([
      db.selectFrom('receipts').select(db.fn.countAll().as('count')).executeTakeFirst(),
      db.selectFrom('receipts').select(db.fn.sum('monto').as('sum')).executeTakeFirst(),
      db.selectFrom('receipts').select(db.fn.avg('monto').as('avg')).executeTakeFirst()
    ]);

    // Get receipts by type
    const receiptsByType = await db
      .selectFrom('receipts')
      .select(['tipo', db.fn.countAll().as('count'), db.fn.sum('monto').as('total')])
      .groupBy('tipo')
      .execute();

    // Get receipts by status
    const receiptsByStatus = await db
      .selectFrom('receipts')
      .select(['status', db.fn.countAll().as('count')])
      .groupBy('status')
      .execute();

    const stats = {
      total: {
        receipts: Number(totalReceipts?.count || 0),
        amount: Number(totalAmount?.sum || 0),
        average: Number(avgAmount?.avg || 0)
      },
      byType: receiptsByType.map(item => ({
        tipo: item.tipo,
        count: Number(item.count),
        total: Number(item.total || 0)
      })),
      byStatus: receiptsByStatus.map(item => ({
        status: item.status,
        count: Number(item.count)
      }))
    };

    res.json(stats);
  } catch (error) {
    console.error('📦 Boxito: Error obteniendo estadísticas de comprobantes:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas de comprobantes' });
  }
});

export { router as receiptRoutes };