import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/index.js';
import { guideCancellationSchema } from '../validators/index.js';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { createNotification } from './notifications.js';

const router = express.Router();

// GET /api/guide-cancellations - Get all guide cancellations
router.get('/', authMiddleware, requirePermission('facturacion', 'read'), async (req, res) => {
  try {
    console.log('📦 Boxito: Getting all guide cancellations...');
    
    const { estatus, cliente, paqueteria, numero_guia, limit, offset } = req.query;
    
    let query = db
      .selectFrom('guide_cancellations')
      .selectAll()
      .orderBy('created_at', 'desc');
    
    if (estatus && estatus !== 'all') {
      query = query.where('estatus', '=', estatus as string);
    }
    
    if (cliente) {
      query = query.where('cliente', 'like', `%${cliente}%`);
    }
    
    if (paqueteria) {
      query = query.where('paqueteria', 'like', `%${paqueteria}%`);
    }
    
    if (numero_guia) {
      query = query.where('numero_guia', 'like', `%${numero_guia}%`);
    }
    
    if (limit) {
      query = query.limit(Number(limit));
    }
    
    if (offset) {
      query = query.offset(Number(offset));
    }
    
    const cancellations = await query.execute();
    
    console.log(`📦 Boxito: Retrieved ${cancellations.length} guide cancellations`);
    res.json(cancellations);
  } catch (error) {
    console.error('📦 Boxito: Error getting guide cancellations:', error);
    res.status(500).json({ error: 'Error al obtener cancelaciones de guías' });
  }
});

// POST /api/guide-cancellations - Create new guide cancellation
router.post('/', authMiddleware, requirePermission('facturacion', 'create'), async (req, res) => {
  try {
    console.log('📦 Boxito: Creating new guide cancellation...', req.body);
    
    const cancellationData = guideCancellationSchema.parse(req.body);
    
    const cancellationId = uuidv4();
    const now = new Date().toISOString();
    
    const newCancellation = await db
      .insertInto('guide_cancellations')
      .values({
        id: cancellationId,
        numero_guia: cancellationData.numero_guia,
        paqueteria: cancellationData.paqueteria,
        cliente: cancellationData.cliente,
        motivo: cancellationData.motivo,
        fecha_solicitud: cancellationData.fecha_solicitud,
        url_guia: cancellationData.url_guia || null,
        archivo_guia: cancellationData.archivo_guia || null,
        estatus: 'Pendiente',
        comentarios: cancellationData.comentarios || null,
        fecha_respuesta: null,
        responsable: null,
        costo_cancelacion: cancellationData.costo_cancelacion || 0,
        reembolso: cancellationData.reembolso || 0,
        numero_referencia: null,
        created_at: now,
        updated_at: now
      })
      .returningAll()
      .executeTakeFirst();
    
    console.log(`📦 Boxito: Created guide cancellation for guide ${cancellationData.numero_guia}`);
    
    // Create notification
    await createNotification(
      'Nueva Cancelación de Guía',
      `Cancelación solicitada para guía ${cancellationData.numero_guia} de ${cancellationData.cliente} (${cancellationData.paqueteria})`,
      'info'
    );
    
    res.status(201).json(newCancellation);
  } catch (error) {
    console.error('📦 Boxito: Error creating guide cancellation:', error);
    res.status(400).json({ error: 'Error al crear cancelación de guía' });
  }
});

// PUT /api/guide-cancellations/:id - Update guide cancellation
router.put('/:id', authMiddleware, requirePermission('facturacion', 'update'), async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📦 Boxito: Updating guide cancellation ${id}...`);
    
    const cancellationData = guideCancellationSchema.parse(req.body);

    const updatedCancellation = await db
      .updateTable('guide_cancellations')
      .set({
        numero_guia: cancellationData.numero_guia,
        paqueteria: cancellationData.paqueteria,
        cliente: cancellationData.cliente,
        motivo: cancellationData.motivo,
        fecha_solicitud: cancellationData.fecha_solicitud,
        url_guia: cancellationData.url_guia || null,
        archivo_guia: cancellationData.archivo_guia || null,
        comentarios: cancellationData.comentarios || null,
        costo_cancelacion: cancellationData.costo_cancelacion || 0,
        reembolso: cancellationData.reembolso || 0,
        updated_at: new Date().toISOString()
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();

    if (!updatedCancellation) {
      res.status(404).json({ error: 'Cancelación de guía no encontrada' });
      return;
    }

    console.log(`📦 Boxito: Updated guide cancellation for guide ${updatedCancellation.numero_guia}`);
    res.json(updatedCancellation);
  } catch (error) {
    console.error('📦 Boxito: Error updating guide cancellation:', error);
    res.status(400).json({ error: 'Error al actualizar cancelación de guía' });
  }
});

// PUT /api/guide-cancellations/:id/status - Update cancellation status
router.put('/:id/status', authMiddleware, requirePermission('facturacion', 'update'), async (req, res) => {
  try {
    const { id } = req.params;
    const { estatus, comentarios, responsable, numero_referencia } = req.body;
    
    console.log(`📦 Boxito: Updating status for guide cancellation ${id} to ${estatus}...`);

    const updatedCancellation = await db
      .updateTable('guide_cancellations')
      .set({
        estatus,
        comentarios: comentarios || null,
        responsable: responsable || null,
        numero_referencia: numero_referencia || null,
        fecha_respuesta: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();

    if (!updatedCancellation) {
      res.status(404).json({ error: 'Cancelación de guía no encontrada' });
      return;
    }

    console.log(`📦 Boxito: Updated status for guide cancellation ${updatedCancellation.numero_guia} to ${estatus}`);

    // Create notification
    await createNotification(
      'Estado de Cancelación Actualizado',
      `Cancelación de guía ${updatedCancellation.numero_guia}: ${estatus}`,
      estatus === 'Cancelada' ? 'success' : estatus === 'Rechazada' ? 'error' : 'info'
    );

    res.json(updatedCancellation);
  } catch (error) {
    console.error('📦 Boxito: Error updating guide cancellation status:', error);
    res.status(500).json({ error: 'Error al actualizar estado de cancelación' });
  }
});

// DELETE /api/guide-cancellations/:id - Delete guide cancellation
router.delete('/:id', authMiddleware, requirePermission('facturacion', 'delete'), async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📦 Boxito: Deleting guide cancellation ${id}...`);

    const deletedCancellation = await db
      .deleteFrom('guide_cancellations')
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();

    if (!deletedCancellation) {
      res.status(404).json({ error: 'Cancelación de guía no encontrada' });
      return;
    }

    console.log(`📦 Boxito: Deleted guide cancellation for guide ${deletedCancellation.numero_guia}`);
    res.json({ message: 'Cancelación de guía eliminada exitosamente' });
  } catch (error) {
    console.error('📦 Boxito: Error deleting guide cancellation:', error);
    res.status(500).json({ error: 'Error al eliminar cancelación de guía' });
  }
});

// GET /api/guide-cancellations/:id - Get guide cancellation by ID
router.get('/:id', authMiddleware, requirePermission('facturacion', 'read'), async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📦 Boxito: Getting guide cancellation ${id}...`);

    const cancellation = await db
      .selectFrom('guide_cancellations')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (!cancellation) {
      res.status(404).json({ error: 'Cancelación de guía no encontrada' });
      return;
    }

    res.json(cancellation);
  } catch (error) {
    console.error('📦 Boxito: Error getting guide cancellation:', error);
    res.status(500).json({ error: 'Error al obtener cancelación de guía' });
  }
});

// GET /api/guide-cancellations/stats/summary - Get cancellation statistics
router.get('/stats/summary', authMiddleware, requirePermission('facturacion', 'read'), async (req, res) => {
  try {
    const [totalCancellations, avgCost, totalReimbursement] = await Promise.all([
      db.selectFrom('guide_cancellations').select(db.fn.countAll().as('count')).executeTakeFirst(),
      db.selectFrom('guide_cancellations').select(db.fn.avg('costo_cancelacion').as('avg')).executeTakeFirst(),
      db.selectFrom('guide_cancellations').select(db.fn.sum('reembolso').as('sum')).executeTakeFirst()
    ]);

    // Get cancellations by status
    const cancellationsByStatus = await db
      .selectFrom('guide_cancellations')
      .select(['estatus', db.fn.countAll().as('count')])
      .groupBy('estatus')
      .execute();

    // Get cancellations by paqueteria
    const cancellationsByPaqueteria = await db
      .selectFrom('guide_cancellations')
      .select(['paqueteria', db.fn.countAll().as('count')])
      .groupBy('paqueteria')
      .execute();

    const stats = {
      total: {
        cancellations: Number(totalCancellations?.count || 0),
        avgCost: Number(avgCost?.avg || 0),
        totalReimbursement: Number(totalReimbursement?.sum || 0)
      },
      byStatus: cancellationsByStatus.map(item => ({
        estatus: item.estatus,
        count: Number(item.count)
      })),
      byPaqueteria: cancellationsByPaqueteria.map(item => ({
        paqueteria: item.paqueteria,
        count: Number(item.count)
      }))
    };

    res.json(stats);
  } catch (error) {
    console.error('📦 Boxito: Error getting cancellation stats:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas de cancelaciones' });
  }
});

export { router as guideCancellationRoutes };
