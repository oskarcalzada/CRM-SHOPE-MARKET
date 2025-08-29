
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/index.js';
import { prospectSchema } from '../validators/index.js';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { createNotification } from './notifications.js';
import { normalizeDateString } from './invoices.js';

const router = express.Router();

// Get all prospects
router.get('/', authMiddleware, requirePermission('comercial', 'read'), async (req, res) => {
  try {
    const { estado, responsable, anio } = req.query;
    
    let query = db.selectFrom('prospects').selectAll().orderBy('created_at', 'desc');

    if (estado) {
      query = query.where('estado', '=', estado as string);
    }

    if (responsable) {
      query = query.where('responsable', 'like', `%${responsable}%`);
    }

    if (anio && anio !== 'all') {
      query = query.where('fecha_registro', 'like', `${anio}-%`);
    }

    const prospects = await query.execute();
    
    res.json(prospects);
  } catch (error) {
    console.error('📦 Boxito: Error getting prospects:', error);
    res.status(500).json({ error: 'Error al obtener prospectos' });
  }
});

// Create new prospect
router.post('/', authMiddleware, requirePermission('comercial', 'create'), async (req, res) => {
  try {
    const rawData = req.body;
    rawData.fecha_registro = normalizeDateString(rawData.fecha_registro);
    const prospectData = prospectSchema.parse(rawData);
    
    const prospectId = uuidv4();
    const now = new Date().toISOString();

    const newProspect = await db
      .insertInto('prospects')
      .values({
        id: prospectId,
        nombre: prospectData.nombre,
        apellido: prospectData.apellido,
        monto: prospectData.monto,
        compania: prospectData.compania || null,
        responsable: prospectData.responsable || null,
        estado: prospectData.estado || 'nuevo',
        tipo_persona: prospectData.tipo_persona || null,
        rfc: prospectData.rfc || null,
        razon_social: prospectData.razon_social || null,
        giro: prospectData.giro || null,
        valor_lead: prospectData.valor_lead || null,
        tipo_prospeccion: prospectData.tipo_prospeccion || null,
        ejecutivo: prospectData.ejecutivo || null,
        comentarios: prospectData.comentarios || null,
        fecha_registro: prospectData.fecha_registro,
        created_at: now,
        updated_at: now
      })
      .returningAll()
      .executeTakeFirst();

    // Create notification
    await createNotification(
      'Nuevo Prospecto Creado',
      `Prospecto ${prospectData.nombre} ${prospectData.apellido} creado con estado "${prospectData.estado}"`,
      'info'
    );

    res.status(201).json(newProspect);
  } catch (error) {
    console.error('📦 Boxito: Error creating prospect:', error);
    res.status(400).json({ error: 'Error al crear prospecto' });
  }
});

// Update prospect
router.put('/:id', authMiddleware, requirePermission('comercial', 'update'), async (req, res) => {
  try {
    const { id } = req.params;
    const rawData = req.body;
    rawData.fecha_registro = normalizeDateString(rawData.fecha_registro);
    const prospectData = prospectSchema.parse(rawData);

    const updatedProspect = await db
      .updateTable('prospects')
      .set({
        nombre: prospectData.nombre,
        apellido: prospectData.apellido,
        monto: prospectData.monto,
        compania: prospectData.compania || null,
        responsable: prospectData.responsable || null,
        estado: prospectData.estado || 'nuevo',
        tipo_persona: prospectData.tipo_persona || null,
        rfc: prospectData.rfc || null,
        razon_social: prospectData.razon_social || null,
        giro: prospectData.giro || null,
        valor_lead: prospectData.valor_lead || null,
        tipo_prospeccion: prospectData.tipo_prospeccion || null,
        ejecutivo: prospectData.ejecutivo || null,
        comentarios: prospectData.comentarios || null,
        fecha_registro: prospectData.fecha_registro,
        updated_at: new Date().toISOString()
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();

    if (!updatedProspect) {
      res.status(404).json({ error: 'Prospecto no encontrado' });
      return;
    }

    res.json(updatedProspect);
  } catch (error) {
    console.error('📦 Boxito: Error updating prospect:', error);
    res.status(400).json({ error: 'Error al actualizar prospecto' });
  }
});

// Delete prospect
router.delete('/:id', authMiddleware, requirePermission('comercial', 'delete'), async (req, res) => {
  try {
    const { id } = req.params;

    const deletedProspect = await db
      .deleteFrom('prospects')
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();

    if (!deletedProspect) {
      res.status(404).json({ error: 'Prospecto no encontrado' });
      return;
    }

    res.json({ message: 'Prospecto eliminado exitosamente' });
  } catch (error) {
    console.error('📦 Boxito: Error deleting prospect:', error);
    res.status(500).json({ error: 'Error al eliminar prospecto' });
  }
});

// Get prospect by ID
router.get('/:id', authMiddleware, requirePermission('comercial', 'read'), async (req, res) => {
  try {
    const { id } = req.params;

    const prospect = await db
      .selectFrom('prospects')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (!prospect) {
      res.status(404).json({ error: 'Prospecto no encontrado' });
      return;
    }

    res.json(prospect);
  } catch (error) {
    console.error('📦 Boxito: Error getting prospect:', error);
    res.status(500).json({ error: 'Error al obtener prospecto' });
  }
});

export { router as prospectRoutes };
