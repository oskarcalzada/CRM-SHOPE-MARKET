
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/index.js';
import { creditNoteSchema } from '../validators/index.js';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { createNotification } from './notifications.js';
import { normalizeDateString } from './invoices.js';

const router = express.Router();

// Get all credit notes
router.get('/', authMiddleware, requirePermission('notas-credito', 'read'), async (req, res) => {
  try {
    const { cliente, estatus, anio } = req.query;
    
    let query = db.selectFrom('credit_notes').selectAll().orderBy('created_at', 'desc');

    if (cliente) {
      query = query.where('cliente', 'like', `%${cliente}%`);
    }

    if (estatus) {
      query = query.where('estatus', '=', estatus as string);
    }

    if (anio && anio !== 'all') {
      query = query.where('fecha', 'like', `${anio}-%`);
    }

    const creditNotes = await query.execute();
    
    res.json(creditNotes);
  } catch (error) {
    console.error('📦 Boxito: Error getting credit notes:', error);
    res.status(500).json({ error: 'Error al obtener notas de crédito' });
  }
});

// Create new credit note
router.post('/', authMiddleware, requirePermission('notas-credito', 'create'), async (req, res) => {
  try {
    const rawData = req.body;
    rawData.fecha = normalizeDateString(rawData.fecha);
    const creditNoteData = creditNoteSchema.parse(rawData);
    
    const creditNoteId = uuidv4();
    const now = new Date().toISOString();

    const newCreditNote = await db
      .insertInto('credit_notes')
      .values({
        id: creditNoteId,
        id_cliente: creditNoteData.id_cliente,
        cliente: creditNoteData.cliente,
        razon_social: creditNoteData.razon_social || null,
        fecha: creditNoteData.fecha,
        motivo: creditNoteData.motivo,
        factura_aplicada: creditNoteData.factura_aplicada || null,
        monto: creditNoteData.monto,
        detalles: creditNoteData.detalles ? JSON.stringify(creditNoteData.detalles) : null,
        cfdi: creditNoteData.cfdi || null,
        estatus: creditNoteData.estatus || 'Pendiente',
        created_at: now,
        updated_at: now
      })
      .returningAll()
      .executeTakeFirst();

    // Create notification
    await createNotification(
      'Nota de Crédito Creada',
      `Nota de crédito por $${creditNoteData.monto} creada para ${creditNoteData.cliente}`,
      'success'
    );

    res.status(201).json(newCreditNote);
  } catch (error) {
    console.error('📦 Boxito: Error creating credit note:', error);
    res.status(400).json({ error: 'Error al crear nota de crédito' });
  }
});

// Update credit note
router.put('/:id', authMiddleware, requirePermission('notas-credito', 'update'), async (req, res) => {
  try {
    const { id } = req.params;
    const rawData = req.body;
    rawData.fecha = normalizeDateString(rawData.fecha);
    const creditNoteData = creditNoteSchema.parse(rawData);

    const updatedCreditNote = await db
      .updateTable('credit_notes')
      .set({
        id_cliente: creditNoteData.id_cliente,
        cliente: creditNoteData.cliente,
        razon_social: creditNoteData.razon_social || null,
        fecha: creditNoteData.fecha,
        motivo: creditNoteData.motivo,
        factura_aplicada: creditNoteData.factura_aplicada || null,
        monto: creditNoteData.monto,
        detalles: creditNoteData.detalles ? JSON.stringify(creditNoteData.detalles) : null,
        cfdi: creditNoteData.cfdi || null,
        estatus: creditNoteData.estatus || 'Pendiente',
        updated_at: new Date().toISOString()
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();

    if (!updatedCreditNote) {
      res.status(404).json({ error: 'Nota de crédito no encontrada' });
      return;
    }

    res.json(updatedCreditNote);
  } catch (error) {
    console.error('📦 Boxito: Error updating credit note:', error);
    res.status(400).json({ error: 'Error al actualizar nota de crédito' });
  }
});

// Delete credit note
router.delete('/:id', authMiddleware, requirePermission('notas-credito', 'delete'), async (req, res) => {
  try {
    const { id } = req.params;

    const deletedCreditNote = await db
      .deleteFrom('credit_notes')
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();

    if (!deletedCreditNote) {
      res.status(404).json({ error: 'Nota de crédito no encontrada' });
      return;
    }

    res.json({ message: 'Nota de crédito eliminada exitosamente' });
  } catch (error) {
    console.error('📦 Boxito: Error deleting credit note:', error);
    res.status(500).json({ error: 'Error al eliminar nota de crédito' });
  }
});

// Get credit note by ID
router.get('/:id', authMiddleware, requirePermission('notas-credito', 'read'), async (req, res) => {
  try {
    const { id } = req.params;

    const creditNote = await db
      .selectFrom('credit_notes')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (!creditNote) {
      res.status(404).json({ error: 'Nota de crédito no encontrada' });
      return;
    }

    res.json(creditNote);
  } catch (error) {
    console.error('📦 Boxito: Error getting credit note:', error);
    res.status(500).json({ error: 'Error al obtener nota de crédito' });
  }
});

export { router as creditNoteRoutes };
