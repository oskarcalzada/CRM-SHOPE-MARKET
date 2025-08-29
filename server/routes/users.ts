
import express from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/index.js';
import { userSchema, updateUserSchema } from '../validators/index.js';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { createNotification } from './notifications.js';

const router = express.Router();

// Get all users
router.get('/', authMiddleware, requirePermission('usuarios', 'read'), async (req, res) => {
  try {
    const users = await db
      .selectFrom('users')
      .select(['id', 'username', 'name', 'email', 'role', 'is_active', 'created_at', 'updated_at'])
      .orderBy('name', 'asc')
      .execute();
    
    res.json(users);
  } catch (error) {
    console.error('📦 Boxito: Error getting users:', error);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

// Create new user
router.post('/', authMiddleware, requirePermission('usuarios', 'create'), async (req, res) => {
  try {
    const userData = userSchema.parse(req.body);
    
    // Check if username or email already exists
    const existingUser = await db
      .selectFrom('users')
      .select(['id'])
      .where((eb) => eb.or([
        eb('username', '=', userData.username),
        ...(userData.email ? [eb('email', '=', userData.email)] : [])
      ]))
      .executeTakeFirst();
    
    if (existingUser) {
      res.status(400).json({ error: 'El nombre de usuario o email ya está en uso' });
      return;
    }
    
    const hashedPassword = await bcrypt.hash(userData.password, 12);
    const userId = uuidv4();
    const now = new Date().toISOString();

    const newUser = await db
      .insertInto('users')
      .values({
        id: userId,
        username: userData.username,
        name: userData.name,
        email: userData.email || null,
        password_hash: hashedPassword,
        role: userData.role,
        is_active: userData.is_active ? 1 : 0,
        created_at: now,
        updated_at: now
      })
      .returning(['id', 'username', 'name', 'email', 'role', 'is_active'])
      .executeTakeFirst();

    // Create notification
    await createNotification(
      'Nuevo Usuario Creado',
      `Usuario ${userData.name} (${userData.role}) ha sido creado`,
      'success'
    );

    res.status(201).json(newUser);
  } catch (error) {
    console.error('📦 Boxito: Error creating user:', error);
    res.status(400).json({ error: 'Error al crear usuario' });
  }
});

// Update user
router.put('/:id', authMiddleware, requirePermission('usuarios', 'update'), async (req, res) => {
  try {
    const { id } = req.params;
    const userData = updateUserSchema.parse(req.body);

    // Check for duplicate username/email
    const existingUser = await db
      .selectFrom('users')
      .select(['id'])
      .where('id', '!=', id)
      .where((eb) => eb.or([
        eb('username', '=', userData.username),
        ...(userData.email ? [eb('email', '=', userData.email)] : [])
      ]))
      .executeTakeFirst();

    if (existingUser) {
      res.status(400).json({ error: 'El nombre de usuario o email ya está en uso por otro usuario' });
      return;
    }

    const updateData: any = {
      username: userData.username,
      name: userData.name,
      email: userData.email || null,
      role: userData.role,
      is_active: userData.is_active ? 1 : 0,
      updated_at: new Date().toISOString()
    };

    if (userData.password) {
      updateData.password_hash = await bcrypt.hash(userData.password, 12);
    }

    const updatedUser = await db
      .updateTable('users')
      .set(updateData)
      .where('id', '=', id)
      .returning(['id', 'username', 'name', 'email', 'role', 'is_active'])
      .executeTakeFirst();

    if (!updatedUser) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    res.json(updatedUser);
  } catch (error) {
    console.error('📦 Boxito: Error updating user:', error);
    res.status(400).json({ error: 'Error al actualizar usuario' });
  }
});

// Delete user
router.delete('/:id', authMiddleware, requirePermission('usuarios', 'delete'), async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting the default admin user
    if (id === 'admin-default-001') {
      res.status(403).json({ error: 'No se puede eliminar al administrador principal' });
      return;
    }

    const deletedUser = await db
      .deleteFrom('users')
      .where('id', '=', id)
      .returning(['id', 'name'])
      .executeTakeFirst();

    if (!deletedUser) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    res.json({ message: `Usuario ${deletedUser.name} eliminado exitosamente` });
  } catch (error) {
    console.error('📦 Boxito: Error deleting user:', error);
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
});

// Get user by ID
router.get('/:id', authMiddleware, requirePermission('usuarios', 'read'), async (req, res) => {
  try {
    const { id } = req.params;

    const user = await db
      .selectFrom('users')
      .select(['id', 'username', 'name', 'email', 'role', 'is_active'])
      .where('id', '=', id)
      .executeTakeFirst();

    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('📦 Boxito: Error getting user:', error);
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
});

export { router as userRoutes };
