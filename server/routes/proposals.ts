import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/index.js';
import { proposalSchema } from '../validators/index.js';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { createNotification } from './notifications.js';

const router = express.Router();

// Get all proposals
router.get('/', authMiddleware, requirePermission('propuestas', 'read'), async (req, res) => {
  try {
    console.log('📦 Boxito: Getting all proposals...');
    
    const { cliente, anio } = req.query;
    
    let query = db.selectFrom('proposals').selectAll().orderBy('created_at', 'desc');

    // Apply filters
    if (cliente) {
      query = query.where('cliente', 'like', `%${cliente}%`);
    }

    if (anio && anio !== 'all') {
      query = query.where('anio', '=', anio as string);
    }

    const proposals = await query.execute();
    
    console.log(`📦 Boxito: Retrieved ${proposals.length} proposals`);
    res.json(proposals);
  } catch (error) {
    console.error('📦 Boxito: Error getting proposals:', error);
    res.status(500).json({ error: 'Error al obtener propuestas' });
  }
});

// Create new proposal
router.post('/', authMiddleware, requirePermission('propuestas', 'create'), async (req, res) => {
  try {
    console.log('📦 Boxito: Creating new proposal...');
    
    const proposalData = proposalSchema.parse(req.body);
    
    const proposalId = uuidv4();
    const now = new Date().toISOString();

    const newProposal = await db
      .insertInto('proposals')
      .values({
        id: proposalId,
        id_cliente: proposalData.id_cliente,
        cliente: proposalData.cliente,
        anio: proposalData.anio,
        pdf: proposalData.pdf || null,
        xlsx: proposalData.xlsx || null,
        comentarios: proposalData.comentarios || null,
        created_at: now,
        updated_at: now
      })
      .returningAll()
      .executeTakeFirst();

    console.log(`📦 Boxito: Created proposal for ${proposalData.cliente}`);

    // Create notification
    await createNotification(
      'Nueva Propuesta Creada',
      `Propuesta ${proposalData.anio} creada para ${proposalData.cliente}`,
      'success'
    );

    res.status(201).json(newProposal);
  } catch (error) {
    console.error('📦 Boxito: Error creating proposal:', error);
    res.status(400).json({ error: 'Error al crear propuesta' });
  }
});

// Update proposal
router.put('/:id', authMiddleware, requirePermission('propuestas', 'update'), async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📦 Boxito: Updating proposal ${id}...`);
    
    const proposalData = proposalSchema.parse(req.body);

    const updatedProposal = await db
      .updateTable('proposals')
      .set({
        id_cliente: proposalData.id_cliente,
        cliente: proposalData.cliente,
        anio: proposalData.anio,
        pdf: proposalData.pdf || null,
        xlsx: proposalData.xlsx || null,
        comentarios: proposalData.comentarios || null,
        updated_at: new Date().toISOString()
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();

    if (!updatedProposal) {
      res.status(404).json({ error: 'Propuesta no encontrada' });
      return;
    }

    console.log(`📦 Boxito: Updated proposal for ${updatedProposal.cliente}`);
    res.json(updatedProposal);
  } catch (error) {
    console.error('📦 Boxito: Error updating proposal:', error);
    res.status(400).json({ error: 'Error al actualizar propuesta' });
  }
});

// Delete proposal
router.delete('/:id', authMiddleware, requirePermission('propuestas', 'delete'), async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📦 Boxito: Deleting proposal ${id}...`);

    const deletedProposal = await db
      .deleteFrom('proposals')
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();

    if (!deletedProposal) {
      res.status(404).json({ error: 'Propuesta no encontrada' });
      return;
    }

    console.log(`📦 Boxito: Deleted proposal for ${deletedProposal.cliente}`);
    res.json({ message: 'Propuesta eliminada exitosamente' });
  } catch (error) {
    console.error('📦 Boxito: Error deleting proposal:', error);
    res.status(500).json({ error: 'Error al eliminar propuesta' });
  }
});

// Get proposal by ID
router.get('/:id', authMiddleware, requirePermission('propuestas', 'read'), async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📦 Boxito: Getting proposal ${id}...`);

    const proposal = await db
      .selectFrom('proposals')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (!proposal) {
      res.status(404).json({ error: 'Propuesta no encontrada' });
      return;
    }

    res.json(proposal);
  } catch (error) {
    console.error('📦 Boxito: Error getting proposal:', error);
    res.status(500).json({ error: 'Error al obtener propuesta' });
  }
});

export { router as proposalRoutes };
