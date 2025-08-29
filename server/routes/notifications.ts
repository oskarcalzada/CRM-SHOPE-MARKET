import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/index.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Create notification function (used by other modules)
export const createNotification = async (
  title: string, 
  message: string, 
  type: 'success' | 'error' | 'info' | 'warning' = 'info', 
  userId?: string
) => {
  try {
    const notificationId = uuidv4();
    
    await db
      .insertInto('notifications')
      .values({
        id: notificationId,
        user_id: userId || null, // null means notification for all users
        title,
        message,
        type,
        is_read: 0,
        created_at: new Date().toISOString()
      })
      .execute();

    console.log(`📦 Boxito: Notification created: ${title}`);
    return notificationId;
  } catch (error) {
    console.error('📦 Boxito: Error creating notification:', error);
    throw error;
  }
};

// Get notifications for current user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { limit = 50, offset = 0, unread_only = false } = req.query;

    let query = db
      .selectFrom('notifications')
      .selectAll()
      .where((eb) => eb.or([
        eb('user_id', 'is', null), // Global notifications
        eb('user_id', '=', userId!) // User-specific notifications
      ]))
      .orderBy('created_at', 'desc')
      .limit(Number(limit))
      .offset(Number(offset));

    if (unread_only === 'true') {
      query = query.where('is_read', '=', 0);
    }

    const notifications = await query.execute();

    res.json(notifications);
  } catch (error) {
    console.error('📦 Boxito: Error getting notifications:', error);
    res.status(500).json({ error: 'Error al obtener notificaciones' });
  }
});

// Mark notification as read
router.put('/:id/read', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const result = await db
      .updateTable('notifications')
      .set({
        is_read: 1
      })
      .where('id', '=', id)
      .where((eb) => eb.or([
        eb('user_id', 'is', null),
        eb('user_id', '=', userId!)
      ]))
      .execute();

    if (result.numUpdatedRows === 0n) {
      res.status(404).json({ error: 'Notificación no encontrada' });
      return;
    }

    res.json({ message: 'Notificación marcada como leída' });
  } catch (error) {
    console.error('📦 Boxito: Error marking notification as read:', error);
    res.status(500).json({ error: 'Error al marcar notificación como leída' });
  }
});

// Mark all notifications as read for current user
router.put('/read-all', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;

    await db
      .updateTable('notifications')
      .set({
        is_read: 1
      })
      .where((eb) => eb.or([
        eb('user_id', 'is', null),
        eb('user_id', '=', userId!)
      ]))
      .execute();

    res.json({ message: 'Todas las notificaciones marcadas como leídas' });
  } catch (error) {
    console.error('📦 Boxito: Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Error al marcar todas las notificaciones como leídas' });
  }
});

// Get notification counts
router.get('/counts', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;

    const [total, unread] = await Promise.all([
      db.selectFrom('notifications')
        .select(db.fn.countAll().as('count'))
        .where((eb) => eb.or([
          eb('user_id', 'is', null),
          eb('user_id', '=', userId!)
        ]))
        .executeTakeFirst(),
      
      db.selectFrom('notifications')
        .select(db.fn.countAll().as('count'))
        .where('is_read', '=', 0)
        .where((eb) => eb.or([
          eb('user_id', 'is', null),
          eb('user_id', '=', userId!)
        ]))
        .executeTakeFirst()
    ]);

    res.json({
      total: Number(total?.count || 0),
      unread: Number(unread?.count || 0)
    });
  } catch (error) {
    console.error('📦 Boxito: Error getting notification counts:', error);
    res.status(500).json({ error: 'Error al obtener conteo de notificaciones' });
  }
});

export { router as notificationRoutes };
