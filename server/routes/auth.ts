import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/index.js';
import { loginSchema } from '../validators/index.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'boxito-crm-super-secret-key-2024';

// Initialize admin user on startup
const initializeAdminUser = async () => {
  try {
    console.log('📦 Boxito: Checking for admin user...');
    
    // Check if admin user already exists
    const adminExists = await db
      .selectFrom('users')
      .select(['id', 'username', 'name', 'password_hash'])
      .where('username', '=', 'admin')
      .executeTakeFirst();

    if (!adminExists) {
      console.log('📦 Boxito: Creating default admin user...');
      
      // Create default admin user
      const hashedPassword = await bcrypt.hash('admin123', 12); // Increased salt rounds for better security
      const adminId = uuidv4();
      
      console.log('📦 Boxito: Generated admin ID:', adminId);
      console.log('📦 Boxito: Generated password hash length:', hashedPassword.length);

      await db
        .insertInto('users')
        .values({
          id: adminId,
          username: 'admin',
          name: 'Administrador Boxito',
          email: 'admin@shopeenvios.com',
          password_hash: hashedPassword,
          role: 'admin',
          is_active: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .execute();

      console.log('📦 Boxito: Admin user created successfully');
      
      // Verify the user was created
      const verifyUser = await db
        .selectFrom('users')
        .select(['id', 'username', 'name', 'role', 'is_active'])
        .where('username', '=', 'admin')
        .executeTakeFirst();
        
      if (verifyUser) {
        console.log('📦 Boxito: Admin user verified in database:', {
          id: verifyUser.id,
          username: verifyUser.username,
          name: verifyUser.name,
          role: verifyUser.role,
          is_active: verifyUser.is_active
        });
      } else {
        console.error('📦 Boxito: Failed to verify admin user creation');
      }
    } else {
      console.log('📦 Boxito: Admin user already exists:', {
        id: adminExists.id,
        username: adminExists.username,
        name: adminExists.name,
        hasHash: !!adminExists.password_hash,
        hashLength: adminExists.password_hash?.length || 0
      });
      
      // Test password verification with existing hash
      try {
        const testPassword = await bcrypt.compare('admin123', adminExists.password_hash);
        console.log('📦 Boxito: Admin password verification test:', testPassword ? 'PASS' : 'FAIL');
        
        if (!testPassword) {
          console.warn('📦 Boxito: Warning - Admin password verification failed! This may cause login issues.');
          // Optionally update the password hash if it's corrupted
          const newHashedPassword = await bcrypt.hash('admin123', 12);
          await db
            .updateTable('users')
            .set({
              password_hash: newHashedPassword,
              updated_at: new Date().toISOString()
            })
            .where('username', '=', 'admin')
            .execute();
          console.log('📦 Boxito: Admin password hash updated');
        }
      } catch (hashError) {
        console.error('📦 Boxito: Error testing admin password hash:', hashError);
      }
    }
  } catch (error) {
    console.error('📦 Boxito: Error initializing admin user:', error);
    throw error;
  }
};

// Test database connectivity
const testDatabase = async () => {
  try {
    console.log('📦 Boxito: Testing database connection...');
    const result = await db.selectFrom('users')
      .select(['id', 'username'])
      .limit(1)
      .execute();
    console.log('📦 Boxito: Database connection successful, found', result.length, 'users');
    return true;
  } catch (error) {
    console.error('📦 Boxito: Database connection failed:', error);
    return false;
  }
};

// Initialize admin user when module loads
const initAuth = async () => {
  try {
    console.log('📦 Boxito: Initializing authentication system...');
    const dbConnected = await testDatabase();
    if (dbConnected) {
      await initializeAdminUser();
      console.log('📦 Boxito: Authentication system initialized successfully');
    } else {
      console.error('📦 Boxito: Cannot initialize auth - database not connected');
    }
  } catch (error) {
    console.error('📦 Boxito: Auth initialization failed:', error);
  }
};

// Initialize on module load
initAuth();

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    console.log('📦 Boxito: Login attempt received for username:', req.body?.username || 'undefined');
    
    // Validate request body
    let validatedData;
    try {
      validatedData = loginSchema.parse(req.body);
    } catch (validationError) {
      console.error('📦 Boxito: Login validation error:', validationError);
      res.status(400).json({ error: 'Datos de entrada inválidos' });
      return;
    }
    
    const { username, password } = validatedData;
    console.log(`📦 Boxito: Processing login for user: ${username}`);

    // Test database connection before proceeding
    const dbConnected = await testDatabase();
    if (!dbConnected) {
      console.error('📦 Boxito: Database connection failed during login');
      res.status(500).json({ error: 'Error de conexión a la base de datos' });
      return;
    }

    // Find user in database
    const user = await db
      .selectFrom('users')
      .select(['id', 'username', 'name', 'email', 'password_hash', 'role', 'is_active'])
      .where('username', '=', username)
      .executeTakeFirst();

    console.log('📦 Boxito: User lookup result:', user ? 'User found' : 'User not found');

    if (!user) {
      console.log(`📦 Boxito: User not found: ${username}`);
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    // Check if user is active
    if (user.is_active !== 1) {
      console.log(`📦 Boxito: User is inactive: ${username}`);
      res.status(401).json({ error: 'Usuario inactivo' });
      return;
    }

    console.log('📦 Boxito: User found:', {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      hasHash: !!user.password_hash,
      hashLength: user.password_hash?.length || 0,
      isActive: user.is_active
    });

    // Check password
    console.log('📦 Boxito: Comparing passwords...');
    let isValidPassword = false;
    
    try {
      isValidPassword = await bcrypt.compare(password, user.password_hash);
      console.log('📦 Boxito: Password validation result:', isValidPassword);
    } catch (bcryptError) {
      console.error('📦 Boxito: Bcrypt comparison error:', bcryptError);
      res.status(500).json({ error: 'Error interno de autenticación' });
      return;
    }
    
    if (!isValidPassword) {
      console.log(`📦 Boxito: Invalid password for user: ${username}`);
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    // Limpiar sesiones expiradas del usuario antes de crear una nueva
    try {
      const cleanupResult = await db
        .deleteFrom('sessions')
        .where('user_id', '=', user.id)
        .where('expires_at', '<=', new Date().toISOString())
        .execute();
      
      if (cleanupResult.numDeletedRows > 0) {
        console.log(`📦 Boxito: Cleaned ${cleanupResult.numDeletedRows} expired sessions for user ${username}`);
      }
    } catch (cleanupError) {
      console.error('📦 Boxito: Error cleaning expired sessions:', cleanupError);
    }

    // Generate JWT token con expiración más larga
    const tokenPayload = { 
      userId: user.id, 
      username: user.username,
      role: user.role 
    };
    
    console.log('📦 Boxito: Generating JWT token with payload:', tokenPayload);
    
    // Aumentar la duración del token a 24 horas
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

    // Create session in database
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    try {
      await db
        .insertInto('sessions')
        .values({
          id: sessionId,
          user_id: user.id,
          token,
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString()
        })
        .execute();
      
      console.log('📦 Boxito: Session created successfully:', sessionId, 'expires at:', expiresAt.toISOString());
    } catch (sessionError) {
      console.error('📦 Boxito: Error creating session:', sessionError);
      res.status(500).json({ error: 'Error interno de sesión' });
      return;
    }

    // Get user permissions based on role
    const permissions = getPermissions(user.role);

    console.log(`📦 Boxito: Login successful for ${user.name} (${user.role}) with ${permissions.length} permissions`);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions
      }
    });
  } catch (error) {
    console.error('📦 Boxito: Login error details:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Verify token endpoint con manejo mejorado de errores
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      res.status(401).json({ 
        error: 'Token requerido',
        code: 'TOKEN_MISSING' 
      });
      return;
    }

    console.log('📦 Boxito: Verifying token...');

    // Verify JWT con manejo de errores mejorado
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as any;
      console.log('📦 Boxito: JWT verified successfully for user:', decoded.username);
    } catch (jwtError: any) {
      console.log('📦 Boxito: JWT verification failed:', jwtError.name);
      
      // Si el token está expirado, limpiar la sesión
      if (jwtError.name === 'TokenExpiredError') {
        try {
          await db
            .deleteFrom('sessions')
            .where('token', '=', token)
            .execute();
          console.log('📦 Boxito: Cleaned expired session during verify');
        } catch (cleanupError) {
          console.error('📦 Boxito: Error cleaning session during verify:', cleanupError);
        }
        
        res.status(401).json({ 
          error: 'Token expirado',
          code: 'TOKEN_EXPIRED' 
        });
        return;
      }
      
      res.status(401).json({ 
        error: 'Token inválido',
        code: 'TOKEN_INVALID' 
      });
      return;
    }
    
    // Check session in database
    const session = await db
      .selectFrom('sessions')
      .innerJoin('users', 'sessions.user_id', 'users.id')
      .select([
        'users.id', 'users.username', 'users.name', 'users.email', 'users.role', 'users.is_active',
        'sessions.expires_at'
      ])
      .where('sessions.token', '=', token)
      .where('sessions.expires_at', '>', new Date().toISOString())
      .executeTakeFirst();

    if (!session) {
      console.log('📦 Boxito: Session not found or expired for token');
      
      // Limpiar sesiones expiradas
      try {
        await db
          .deleteFrom('sessions')
          .where('expires_at', '<=', new Date().toISOString())
          .execute();
        console.log('📦 Boxito: Cleaned expired sessions during verify');
      } catch (cleanupError) {
        console.error('📦 Boxito: Error cleaning sessions during verify:', cleanupError);
      }
      
      res.status(401).json({ 
        error: 'Sesión inválida o expirada',
        code: 'SESSION_EXPIRED' 
      });
      return;
    }

    if (session.is_active !== 1) {
      console.log('📦 Boxito: User is inactive:', session.username);
      res.status(401).json({ 
        error: 'Usuario inactivo',
        code: 'USER_INACTIVE' 
      });
      return;
    }

    const permissions = getPermissions(session.role);

    console.log(`📦 Boxito: Token verified for user: ${session.username} (${session.role})`);

    res.json({
      id: session.id,
      username: session.username,
      name: session.name,
      email: session.email,
      role: session.role,
      permissions
    });
  } catch (error) {
    console.error('📦 Boxito: Token verification error:', error);
    res.status(401).json({ 
      error: 'Error de verificación',
      code: 'VERIFICATION_ERROR' 
    });
  }
});

// Logout endpoint
router.post('/logout', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
      // Delete session from database
      const result = await db
        .deleteFrom('sessions')
        .where('token', '=', token)
        .execute();
      
      console.log('📦 Boxito: Session deleted from database, rows affected:', result.numDeletedRows);
    }

    console.log('📦 Boxito: User logged out successfully');
    res.json({ message: 'Logout exitoso' });
  } catch (error) {
    console.error('📦 Boxito: Logout error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Setup endpoint to manually create admin user and test database
router.post('/setup', async (req, res) => {
  try {
    console.log('📦 Boxito: Manual setup requested');
    
    const dbConnected = await testDatabase();
    if (!dbConnected) {
      res.status(500).json({ 
        error: 'Database connection failed',
        database_connected: false,
        admin_exists: false,
        password_test: false
      });
      return;
    }
    
    await initializeAdminUser();
    
    // Test login with the admin user
    const testUser = await db
      .selectFrom('users')
      .select(['id', 'username', 'name', 'role', 'password_hash'])
      .where('username', '=', 'admin')
      .executeTakeFirst();
    
    let testPassword = false;
    if (testUser) {
      try {
        testPassword = await bcrypt.compare('admin123', testUser.password_hash);
        console.log('📦 Boxito: Setup password test result:', testPassword);
      } catch (testError) {
        console.error('📦 Boxito: Setup password test error:', testError);
      }
    }
    
    res.json({ 
      message: 'Admin user setup completed',
      database_connected: dbConnected,
      admin_exists: !!testUser,
      password_test: testPassword,
      user_details: testUser ? {
        id: testUser.id,
        username: testUser.username,
        name: testUser.name,
        role: testUser.role
      } : null
    });
  } catch (error) {
    console.error('📦 Boxito: Setup error:', error);
    res.status(500).json({ error: 'Error in admin setup: ' + (error as Error).message });
  }
});

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    const dbConnected = await testDatabase();
    const adminExists = await db
      .selectFrom('users')
      .select(['username', 'name'])
      .where('username', '=', 'admin')
      .executeTakeFirst();

    res.json({
      status: 'ok',
      database: {
        connected: dbConnected,
        admin_user_exists: !!adminExists
      },
      admin_user: adminExists ? {
        username: adminExists.username,
        name: adminExists.name
      } : null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('📦 Boxito: Health check error:', error);
    res.status(500).json({ 
      error: 'Health check failed',
      details: (error as Error).message 
    });
  }
});

// Cleanup expired sessions endpoint (for maintenance)
router.post('/cleanup-sessions', async (req, res) => {
  try {
    console.log('📦 Boxito: Cleaning up expired sessions...');
    
    const result = await db
      .deleteFrom('sessions')
      .where('expires_at', '<=', new Date().toISOString())
      .execute();
    
    console.log(`📦 Boxito: Cleaned ${result.numDeletedRows} expired sessions`);
    
    res.json({ 
      message: 'Sesiones expiradas limpiadas',
      cleaned: Number(result.numDeletedRows)
    });
  } catch (error) {
    console.error('📦 Boxito: Error cleaning sessions:', error);
    res.status(500).json({ error: 'Error limpiando sesiones' });
  }
});

function getPermissions(role: string): string[] {
  const permissions: Record<string, string[]> = {
    admin: [
      'dashboard:read', 'dashboard:export',
      'facturacion:create', 'facturacion:read', 'facturacion:update', 'facturacion:delete', 'facturacion:export',
      'pagos:create', 'pagos:read', 'pagos:update', 'pagos:delete', 'pagos:export',
      'comprobantes:create', 'comprobantes:read', 'comprobantes:update', 'comprobantes:delete', 'comprobantes:export',
      'estado-cuenta:read', 'estado-cuenta:export',
      'directorio:create', 'directorio:read', 'directorio:update', 'directorio:delete', 'directorio:export',
      'propuestas:create', 'propuestas:read', 'propuestas:update', 'propuestas:delete', 'propuestas:export',
      'comercial:create', 'comercial:read', 'comercial:update', 'comercial:delete', 'comercial:export',
      'reportes:read', 'reportes:export',
      'usuarios:create', 'usuarios:read', 'usuarios:update', 'usuarios:delete',
      'notas-credito:create', 'notas-credito:read', 'notas-credito:update', 'notas-credito:delete', 'notas-credito:export'
    ],
    manager: [
      'dashboard:read', 'dashboard:export',
      'facturacion:create', 'facturacion:read', 'facturacion:update', 'facturacion:export',
      'pagos:create', 'pagos:read', 'pagos:update', 'pagos:export',
      'comprobantes:create', 'comprobantes:read', 'comprobantes:update', 'comprobantes:export',
      'estado-cuenta:read', 'estado-cuenta:export',
      'directorio:create', 'directorio:read', 'directorio:update', 'directorio:export',
      'propuestas:create', 'propuestas:read', 'propuestas:update', 'propuestas:export',
      'comercial:create', 'comercial:read', 'comercial:update', 'comercial:export',
      'reportes:read', 'reportes:export',
      'notas-credito:create', 'notas-credito:read', 'notas-credito:update', 'notas-credito:export'
    ],
    employee: [
      'dashboard:read',
      'facturacion:create', 'facturacion:read', 'facturacion:update',
      'pagos:create', 'pagos:read',
      'comprobantes:create', 'comprobantes:read',
      'directorio:read', 'directorio:update',
      'comercial:create', 'comercial:read', 'comercial:update',
      'notas-credito:create', 'notas-credito:read'
    ],
    readonly: [
      'dashboard:read',
      'facturacion:read',
      'pagos:read',
      'comprobantes:read',
      'estado-cuenta:read',
      'directorio:read',
      'propuestas:read',
      'comercial:read',
      'reportes:read',
      'notas-credito:read'
    ]
  };

  return permissions[role] || [];
}

export { router as authRoutes };
