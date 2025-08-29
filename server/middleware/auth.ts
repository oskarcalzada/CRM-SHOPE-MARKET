import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { db } from '../database/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'boxito-crm-super-secret-key-2024';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    name: string;
    role: string;
    permissions: string[];
  };
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      res.status(401).json({ error: 'Token de autenticación requerido' });
      return;
    }

    // Verificar token JWT con manejo mejorado de errores
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError: any) {
      console.log('📦 Boxito: JWT verification failed:', jwtError.name);
      
      // Si el token está expirado, limpiar la sesión en la BD
      if (jwtError.name === 'TokenExpiredError') {
        try {
          await db
            .deleteFrom('sessions')
            .where('token', '=', token)
            .execute();
          console.log('📦 Boxito: Cleaned expired session from database');
        } catch (cleanupError) {
          console.error('📦 Boxito: Error cleaning expired session:', cleanupError);
        }
        
        res.status(401).json({ 
          error: 'Token expirado',
          code: 'TOKEN_EXPIRED',
          expiredAt: jwtError.expiredAt 
        });
        return;
      }
      
      // Otros errores de JWT
      res.status(401).json({ 
        error: 'Token inválido',
        code: 'TOKEN_INVALID' 
      });
      return;
    }
    
    // Verificar si la sesión existe en la base de datos
    const session = await db
      .selectFrom('sessions')
      .innerJoin('users', 'sessions.user_id', 'users.id')
      .selectAll()
      .where('sessions.token', '=', token)
      .where('sessions.expires_at', '>', new Date().toISOString())
      .where('users.is_active', '=', 1)
      .executeTakeFirst();

    if (!session) {
      console.log('📦 Boxito: Session not found or expired for token');
      
      // Intentar limpiar sesiones expiradas del usuario
      try {
        await db
          .deleteFrom('sessions')
          .where('expires_at', '<=', new Date().toISOString())
          .execute();
        console.log('📦 Boxito: Cleaned expired sessions from database');
      } catch (cleanupError) {
        console.error('📦 Boxito: Error cleaning expired sessions:', cleanupError);
      }
      
      res.status(401).json({ 
        error: 'Sesión inválida o expirada',
        code: 'SESSION_EXPIRED' 
      });
      return;
    }

    // Agregar información del usuario a la request
    req.user = {
      id: session.id,
      username: session.username,
      name: session.name,
      role: session.role,
      permissions: getPermissions(session.role)
    };

    console.log(`📦 Boxito: Usuario autenticado: ${session.username} (${session.role})`);
    next();
  } catch (error) {
    console.error('📦 Boxito: Error en autenticación:', error);
    res.status(401).json({ 
      error: 'Error de autenticación',
      code: 'AUTH_ERROR' 
    });
    return;
  }
};

export const requirePermission = (module: string, action: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ 
        error: 'Usuario no autenticado',
        code: 'USER_NOT_AUTHENTICATED' 
      });
      return;
    }

    const hasPermission = checkPermission(req.user.role, module, action);
    
    if (!hasPermission) {
      console.log(`📦 Boxito: Permiso denegado para ${req.user.username}: ${module}:${action}`);
      res.status(403).json({ 
        error: 'Permisos insuficientes',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: `${module}:${action}`,
        userRole: req.user.role
      });
      return;
    }

    next();
  };
};

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
      'notas-credito:create', 'notas-credito:read', 'notas-credito:update', 'notas-credito:delete', 'notas-credito:export',
      'soporte:create', 'soporte:read', 'soporte:update', 'soporte:delete', 'soporte:export'
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
      'notas-credito:create', 'notas-credito:read', 'notas-credito:update', 'notas-credito:export',
      'soporte:create', 'soporte:read', 'soporte:update', 'soporte:export'
    ],
    employee: [
      'dashboard:read',
      'facturacion:create', 'facturacion:read', 'facturacion:update',
      'pagos:create', 'pagos:read',
      'comprobantes:create', 'comprobantes:read',
      'directorio:read', 'directorio:update',
      'comercial:create', 'comercial:read', 'comercial:update',
      'notas-credito:create', 'notas-credito:read',
      'soporte:create', 'soporte:read', 'soporte:update'
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
      'notas-credito:read',
      'soporte:read'
    ]
  };

  return permissions[role] || [];
}

function checkPermission(role: string, module: string, action: string): boolean {
  const userPermissions = getPermissions(role);
  const permission = `${module}:${action}`;
  return userPermissions.includes(permission);
}
