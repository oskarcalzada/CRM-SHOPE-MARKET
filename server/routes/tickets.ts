import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/index.js';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { createNotification } from './notifications.js';
import { z } from 'zod';

const router = express.Router();

// Validation schema for tickets
const ticketSchema = z.object({
  cliente: z.string().min(1, 'Cliente es obligatorio'),
  asunto: z.string().min(5, 'El asunto debe tener al menos 5 caracteres'),
  descripcion: z.string().min(10, 'La descripción debe tener al menos 10 caracteres'),
  categoria: z.enum(['Facturacion', 'Cobranza', 'Cancelaciones', 'Informacion', 'Soporte Tecnico', 'Quejas', 'Sugerencias', 'Otros']),
  prioridad: z.enum(['Baja', 'Media', 'Alta', 'Urgente']).optional().default('Media'),
  estatus: z.enum(['Abierto', 'En Proceso', 'Esperando Cliente', 'Resuelto', 'Cerrado']).optional().default('Abierto'),
  fecha_creacion: z.string().min(1, 'Fecha de creación es obligatoria'),
  fecha_limite: z.string().optional(),
  solicitante_nombre: z.string().min(1, 'Nombre del solicitante es obligatorio'),
  solicitante_email: z.union([
    z.string().email('Email inválido'),
    z.literal(''),
    z.undefined()
  ]).optional(),
  solicitante_telefono: z.string().optional(),
  asignado_a: z.string().optional(),
  comentarios_internos: z.string().optional(),
  solucion_aplicada: z.string().optional(),
  archivos_adjuntos: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  numero_seguimiento: z.string().optional(),
  canal_origen: z.enum(['Email', 'Telefono', 'Chat', 'Presencial', 'Portal Web', 'WhatsApp']).optional().default('Portal Web'),
  requiere_seguimiento: z.boolean().optional().default(false)
});

// Generate unique ticket number
const generateTicketNumber = (): string => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  
  return `TK${year}${month}${day}${random}`;
};

// GET /api/tickets - Get all tickets
router.get('/', authMiddleware, requirePermission('soporte', 'read'), async (req, res) => {
  try {
    console.log('📦 Boxito: Getting all tickets...');
    
    const { estatus, categoria, prioridad, cliente, asignado_a, limit, offset } = req.query;
    
    let query = db
      .selectFrom('tickets')
      .selectAll()
      .orderBy('created_at', 'desc');
    
    if (estatus && estatus !== 'all') {
      query = query.where('estatus', '=', estatus as string);
    }
    
    if (categoria && categoria !== 'all') {
      query = query.where('categoria', '=', categoria as string);
    }
    
    if (prioridad && prioridad !== 'all') {
      query = query.where('prioridad', '=', prioridad as string);
    }
    
    if (cliente) {
      query = query.where('cliente', 'like', `%${cliente}%`);
    }
    
    if (asignado_a) {
      query = query.where('asignado_a', 'like', `%${asignado_a}%`);
    }
    
    if (limit) {
      query = query.limit(Number(limit));
    }
    
    if (offset) {
      query = query.offset(Number(offset));
    }
    
    const tickets = await query.execute();
    
    // Transform JSON fields
    const transformedTickets = tickets.map(ticket => ({
      ...ticket,
      archivos_adjuntos: ticket.archivos_adjuntos ? JSON.parse(ticket.archivos_adjuntos) : [],
      tags: ticket.tags ? JSON.parse(ticket.tags) : [],
      requiere_seguimiento: ticket.requiere_seguimiento === 1
    }));
    
    console.log(`📦 Boxito: Retrieved ${transformedTickets.length} tickets`);
    res.json(transformedTickets);
  } catch (error) {
    console.error('📦 Boxito: Error getting tickets:', error);
    res.status(500).json({ error: 'Error al obtener tickets' });
  }
});

// POST /api/tickets - Create new ticket
router.post('/', authMiddleware, requirePermission('soporte', 'create'), async (req, res) => {
  try {
    console.log('📦 Boxito: Creating new ticket...', req.body);
    
    const validationResult = ticketSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      console.log('📦 Boxito: Validation failed:', validationResult.error.errors);
      res.status(400).json({ 
        error: 'Datos inválidos',
        details: validationResult.error.errors?.map(e => `${e.path.join('.')}: ${e.message}`) || ['Error de validación']
      });
      return;
    }
    
    const validatedData = validationResult.data;
    
    const ticketId = uuidv4();
    const numeroTicket = generateTicketNumber();
    const now = new Date().toISOString();
    
    // Calculate deadline based on priority
    let fechaLimite = null;
    if (validatedData.prioridad) {
      const creationDate = new Date(validatedData.fecha_creacion);
      const deadlineDate = new Date(creationDate);
      
      switch (validatedData.prioridad) {
        case 'Urgente':
          deadlineDate.setHours(creationDate.getHours() + 4); // 4 hours
          break;
        case 'Alta':
          deadlineDate.setDate(creationDate.getDate() + 1); // 1 day
          break;
        case 'Media':
          deadlineDate.setDate(creationDate.getDate() + 3); // 3 days
          break;
        case 'Baja':
          deadlineDate.setDate(creationDate.getDate() + 7); // 1 week
          break;
      }
      
      fechaLimite = deadlineDate.toISOString().split('T')[0];
    }
    
    const newTicket = await db
      .insertInto('tickets')
      .values({
        id: ticketId,
        numero_ticket: numeroTicket,
        cliente: validatedData.cliente,
        asunto: validatedData.asunto,
        descripcion: validatedData.descripcion,
        categoria: validatedData.categoria,
        prioridad: validatedData.prioridad || 'Media',
        estatus: validatedData.estatus || 'Abierto',
        fecha_creacion: validatedData.fecha_creacion,
        fecha_limite: fechaLimite,
        fecha_resolucion: null,
        solicitante_nombre: validatedData.solicitante_nombre,
        solicitante_email: validatedData.solicitante_email || null,
        solicitante_telefono: validatedData.solicitante_telefono || null,
        asignado_a: validatedData.asignado_a || null,
        tiempo_respuesta_horas: 0,
        satisfaccion_cliente: null,
        comentarios_internos: validatedData.comentarios_internos || null,
        solucion_aplicada: validatedData.solucion_aplicada || null,
        archivos_adjuntos: validatedData.archivos_adjuntos ? JSON.stringify(validatedData.archivos_adjuntos) : null,
        tags: validatedData.tags ? JSON.stringify(validatedData.tags) : null,
        numero_seguimiento: validatedData.numero_seguimiento || null,
        canal_origen: validatedData.canal_origen || 'Portal Web',
        requiere_seguimiento: validatedData.requiere_seguimiento ? 1 : 0,
        created_at: now,
        updated_at: now
      })
      .returningAll()
      .executeTakeFirst();
    
    console.log(`📦 Boxito: Created ticket ${numeroTicket} for client ${validatedData.cliente}`);
    
    // Create notification
    await createNotification(
      'Nuevo Ticket de Soporte',
      `Ticket ${numeroTicket} creado: ${validatedData.asunto} (${validatedData.categoria} - ${validatedData.prioridad})`,
      'info'
    );
    
    // Transform response
    const transformedTicket = {
      ...newTicket!,
      archivos_adjuntos: newTicket!.archivos_adjuntos ? JSON.parse(newTicket!.archivos_adjuntos) : [],
      tags: newTicket!.tags ? JSON.parse(newTicket!.tags) : [],
      requiere_seguimiento: newTicket!.requiere_seguimiento === 1
    };
    
    res.status(201).json(transformedTicket);
  } catch (error) {
    console.error('📦 Boxito: Error creating ticket:', error);
    res.status(500).json({ error: 'Error al crear ticket' });
  }
});

// PUT /api/tickets/:id - Update ticket
router.put('/:id', authMiddleware, requirePermission('soporte', 'update'), async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📦 Boxito: Updating ticket ${id}...`, req.body);
    
    const validationResult = ticketSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      console.log('📦 Boxito: Validation failed:', validationResult.error.errors);
      res.status(400).json({ 
        error: 'Datos inválidos',
        details: validationResult.error.errors?.map(e => `${e.path.join('.')}: ${e.message}`) || ['Error de validación']
      });
      return;
    }
    
    const validatedData = validationResult.data;
    
    // Check if ticket exists
    const existingTicket = await db
      .selectFrom('tickets')
      .select(['numero_ticket', 'estatus'])
      .where('id', '=', id)
      .executeTakeFirst();
    
    if (!existingTicket) {
      res.status(404).json({ error: 'Ticket no encontrado' });
      return;
    }
    
    // Set resolution date if status changed to resolved/closed
    let fechaResolucion = null;
    if ((validatedData.estatus === 'Resuelto' || validatedData.estatus === 'Cerrado') && 
        existingTicket.estatus !== 'Resuelto' && existingTicket.estatus !== 'Cerrado') {
      fechaResolucion = new Date().toISOString().split('T')[0];
    }
    
    const updatedTicket = await db
      .updateTable('tickets')
      .set({
        cliente: validatedData.cliente,
        asunto: validatedData.asunto,
        descripcion: validatedData.descripcion,
        categoria: validatedData.categoria,
        prioridad: validatedData.prioridad || 'Media',
        estatus: validatedData.estatus || 'Abierto',
        fecha_creacion: validatedData.fecha_creacion,
        fecha_limite: validatedData.fecha_limite || null,
        fecha_resolucion: fechaResolucion,
        solicitante_nombre: validatedData.solicitante_nombre,
        solicitante_email: validatedData.solicitante_email || null,
        solicitante_telefono: validatedData.solicitante_telefono || null,
        asignado_a: validatedData.asignado_a || null,
        comentarios_internos: validatedData.comentarios_internos || null,
        solucion_aplicada: validatedData.solucion_aplicada || null,
        archivos_adjuntos: validatedData.archivos_adjuntos ? JSON.stringify(validatedData.archivos_adjuntos) : null,
        tags: validatedData.tags ? JSON.stringify(validatedData.tags) : null,
        numero_seguimiento: validatedData.numero_seguimiento || null,
        canal_origen: validatedData.canal_origen || 'Portal Web',
        requiere_seguimiento: validatedData.requiere_seguimiento ? 1 : 0,
        updated_at: new Date().toISOString()
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();
    
    console.log(`📦 Boxito: Updated ticket ${updatedTicket!.numero_ticket}`);
    
    // Transform response
    const transformedTicket = {
      ...updatedTicket!,
      archivos_adjuntos: updatedTicket!.archivos_adjuntos ? JSON.parse(updatedTicket!.archivos_adjuntos) : [],
      tags: updatedTicket!.tags ? JSON.parse(updatedTicket!.tags) : [],
      requiere_seguimiento: updatedTicket!.requiere_seguimiento === 1
    };
    
    res.json(transformedTicket);
  } catch (error) {
    console.error('📦 Boxito: Error updating ticket:', error);
    res.status(500).json({ error: 'Error al actualizar ticket' });
  }
});

// PUT /api/tickets/:id/status - Update ticket status
router.put('/:id/status', authMiddleware, requirePermission('soporte', 'update'), async (req, res) => {
  try {
    const { id } = req.params;
    const { estatus, asignado_a, comentarios_internos, solucion_aplicada, satisfaccion_cliente } = req.body;
    
    console.log(`📦 Boxito: Updating status for ticket ${id} to ${estatus}...`);
    
    // Calculate response time if resolving
    let tiempoRespuesta = 0;
    let fechaResolucion = null;
    
    if (estatus === 'Resuelto' || estatus === 'Cerrado') {
      const ticket = await db
        .selectFrom('tickets')
        .select(['fecha_creacion', 'estatus'])
        .where('id', '=', id)
        .executeTakeFirst();
      
      if (ticket && ticket.estatus !== 'Resuelto' && ticket.estatus !== 'Cerrado') {
        const creationDate = new Date(ticket.fecha_creacion);
        const resolutionDate = new Date();
        tiempoRespuesta = Math.ceil((resolutionDate.getTime() - creationDate.getTime()) / (1000 * 60 * 60)); // hours
        fechaResolucion = resolutionDate.toISOString().split('T')[0];
      }
    }
    
    const updatedTicket = await db
      .updateTable('tickets')
      .set({
        estatus,
        asignado_a: asignado_a || null,
        comentarios_internos: comentarios_internos || null,
        solucion_aplicada: solucion_aplicada || null,
        satisfaccion_cliente: satisfaccion_cliente ? Number(satisfaccion_cliente) : null,
        tiempo_respuesta_horas: tiempoRespuesta || 0,
        fecha_resolucion: fechaResolucion,
        updated_at: new Date().toISOString()
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();
    
    if (!updatedTicket) {
      res.status(404).json({ error: 'Ticket no encontrado' });
      return;
    }
    
    console.log(`📦 Boxito: Updated status for ticket ${updatedTicket.numero_ticket} to ${estatus}`);
    
    // Create notification
    await createNotification(
      'Estado de Ticket Actualizado',
      `Ticket ${updatedTicket.numero_ticket}: ${estatus}${tiempoRespuesta > 0 ? ` - Tiempo respuesta: ${tiempoRespuesta}h` : ''}`,
      estatus === 'Resuelto' || estatus === 'Cerrado' ? 'success' : 'info'
    );
    
    // Transform response
    const transformedTicket = {
      ...updatedTicket,
      archivos_adjuntos: updatedTicket.archivos_adjuntos ? JSON.parse(updatedTicket.archivos_adjuntos) : [],
      tags: updatedTicket.tags ? JSON.parse(updatedTicket.tags) : [],
      requiere_seguimiento: updatedTicket.requiere_seguimiento === 1
    };
    
    res.json(transformedTicket);
  } catch (error) {
    console.error('📦 Boxito: Error updating ticket status:', error);
    res.status(500).json({ error: 'Error al actualizar estado del ticket' });
  }
});

// DELETE /api/tickets/:id - Delete ticket
router.delete('/:id', authMiddleware, requirePermission('soporte', 'delete'), async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📦 Boxito: Deleting ticket ${id}...`);
    
    const deletedTicket = await db
      .deleteFrom('tickets')
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();
    
    if (!deletedTicket) {
      res.status(404).json({ error: 'Ticket no encontrado' });
      return;
    }
    
    console.log(`📦 Boxito: Deleted ticket ${deletedTicket.numero_ticket}`);
    res.json({ message: 'Ticket eliminado exitosamente' });
  } catch (error) {
    console.error('📦 Boxito: Error deleting ticket:', error);
    res.status(500).json({ error: 'Error al eliminar ticket' });
  }
});

// GET /api/tickets/:id - Get ticket by ID
router.get('/:id', authMiddleware, requirePermission('soporte', 'read'), async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📦 Boxito: Getting ticket ${id}...`);
    
    const ticket = await db
      .selectFrom('tickets')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    
    if (!ticket) {
      res.status(404).json({ error: 'Ticket no encontrado' });
      return;
    }
    
    // Transform response
    const transformedTicket = {
      ...ticket,
      archivos_adjuntos: ticket.archivos_adjuntos ? JSON.parse(ticket.archivos_adjuntos) : [],
      tags: ticket.tags ? JSON.parse(ticket.tags) : [],
      requiere_seguimiento: ticket.requiere_seguimiento === 1
    };
    
    console.log(`📦 Boxito: Retrieved ticket ${ticket.numero_ticket}`);
    res.json(transformedTicket);
  } catch (error) {
    console.error('📦 Boxito: Error getting ticket:', error);
    res.status(500).json({ error: 'Error al obtener ticket' });
  }
});

// GET /api/tickets/stats/summary - Get ticket statistics
router.get('/stats/summary', authMiddleware, requirePermission('soporte', 'read'), async (req, res) => {
  try {
    const [totalTickets, avgResponseTime] = await Promise.all([
      db.selectFrom('tickets').select(db.fn.countAll().as('count')).executeTakeFirst(),
      db.selectFrom('tickets')
        .select(db.fn.avg('tiempo_respuesta_horas').as('avg'))
        .where('tiempo_respuesta_horas', '>', 0)
        .executeTakeFirst()
    ]);

    // Get tickets by status
    const ticketsByStatus = await db
      .selectFrom('tickets')
      .select(['estatus', db.fn.countAll().as('count')])
      .groupBy('estatus')
      .execute();

    // Get tickets by category
    const ticketsByCategory = await db
      .selectFrom('tickets')
      .select(['categoria', db.fn.countAll().as('count')])
      .groupBy('categoria')
      .execute();

    // Get tickets by priority
    const ticketsByPriority = await db
      .selectFrom('tickets')
      .select(['prioridad', db.fn.countAll().as('count')])
      .groupBy('prioridad')
      .execute();

    // Get satisfaction rating
    const satisfactionData = await db
      .selectFrom('tickets')
      .select(db.fn.avg('satisfaccion_cliente').as('avg'))
      .where('satisfaccion_cliente', 'is not', null)
      .executeTakeFirst();

    const stats = {
      total: {
        tickets: Number(totalTickets?.count || 0),
        avgResponseTime: Number(avgResponseTime?.avg || 0),
        avgSatisfaction: Number(satisfactionData?.avg || 0)
      },
      byStatus: ticketsByStatus.map(item => ({
        estatus: item.estatus,
        count: Number(item.count)
      })),
      byCategory: ticketsByCategory.map(item => ({
        categoria: item.categoria,
        count: Number(item.count)
      })),
      byPriority: ticketsByPriority.map(item => ({
        prioridad: item.prioridad,
        count: Number(item.count)
      }))
    };

    res.json(stats);
  } catch (error) {
    console.error('📦 Boxito: Error getting ticket stats:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas de tickets' });
  }
});

export { router as ticketRoutes };
