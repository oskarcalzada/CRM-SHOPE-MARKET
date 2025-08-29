import { Kysely, SqliteDialect } from 'kysely';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { DatabaseSchema } from './schema.js';
import bcrypt from 'bcryptjs';

const dataDir = process.env.DATA_DIRECTORY || './data';
const dbPath = path.join(dataDir, 'database.sqlite');

console.log(`📦 Boxito: Database path: ${dbPath}`);
console.log(`📦 Boxito: Data directory: ${dataDir}`);

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  console.log(`📦 Boxito: Creating data directory: ${dataDir}`);
  fs.mkdirSync(dataDir, { recursive: true });
}

let sqliteDb: Database.Database;
let db: Kysely<DatabaseSchema>;

// Initialize database connection with error handling
export function initializeDatabaseConnection(): void {
  try {
    console.log('📦 Boxito: Initializing database connection...');
    
    sqliteDb = new Database(dbPath, {
      timeout: 30000,
      verbose: undefined
    });
    
    // Basic SQLite configuration
    console.log('📦 Boxito: Configuring SQLite...');
    sqliteDb.pragma('foreign_keys = ON');
    sqliteDb.pragma('temp_store = MEMORY');
    
    db = new Kysely<DatabaseSchema>({
      dialect: new SqliteDialect({
        database: sqliteDb,
      }),
      log: ['query', 'error']
    });

    console.log('📦 Boxito: Database connection initialized successfully');

  } catch (error) {
    console.error('📦 Boxito: CRITICAL ERROR initializing database connection:', error);
    throw error;
  }
}

// Initialize the connection when module loads
initializeDatabaseConnection();

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    if (!db) {
      console.error('📦 Boxito: Database not initialized');
      return false;
    }
    
    console.log('📦 Boxito: Testing database connection...');
    
    const result = await db.selectFrom('sqlite_master')
      .select(db.fn.count('name').as('total'))
      .executeTakeFirst();
    
    console.log('📦 Boxito: Database connection successful, tables found:', result?.total || 0);
    return true;
  } catch (error) {
    console.error('📦 Boxito: Database connection test failed:', (error as Error).message);
    return false;
  }
}

// Create default admin user
async function createDefaultAdmin(): Promise<void> {
  try {
    if (!db) {
      throw new Error('Database not initialized');
    }
    
    console.log('📦 Boxito: Checking for admin user...');
    
    // Check if admin exists
    const adminExists = await db.selectFrom('users')
      .select(['id'])
      .where('username', '=', 'admin')
      .limit(1)
      .executeTakeFirst();
    
    if (!adminExists) {
      console.log('📦 Boxito: Creating default admin user...');
      
      // Hash password for admin user (password: "admin123")
      const passwordHash = await bcrypt.hash('admin123', 12);
      
      await db.insertInto('users')
        .values({
          id: 'admin-default-001',
          username: 'admin',
          name: 'Administrador Principal',
          email: 'admin@boxito.com',
          password_hash: passwordHash,
          role: 'admin',
          is_active: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .execute();
      
      console.log('📦 Boxito: ✅ Admin user created - Username: admin, Password: admin123');
    } else {
      console.log('📦 Boxito: Admin user already exists');
    }
  } catch (error) {
    console.error('📦 Boxito: Error creating admin user:', error);
    throw error;
  }
}

// Initialize database with all necessary tables
export async function initializeDatabase(): Promise<boolean> {
  try {
    if (!sqliteDb || !db) {
      console.log('📦 Boxito: Initializing database connection first...');
      initializeDatabaseConnection();
    }
    
    console.log('📦 Boxito: Initializing database schema...');
    
    // Check if essential tables exist
    const tablesResult = await db.selectFrom('sqlite_master')
      .select(['name'])
      .where('type', '=', 'table')
      .where('name', 'in', ['users', 'sessions', 'notifications', 'invoices', 'clients'])
      .execute();
    
    console.log('📦 Boxito: Found existing tables:', tablesResult.map(t => t.name));
    
    if (tablesResult.length < 5) {
      console.log('📦 Boxito: Creating missing tables...');
      
      // Create all essential tables
      await sqliteDb.exec(`
        -- Users table
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          email TEXT,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'employee', 'readonly')),
          is_active INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Sessions table
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          token TEXT UNIQUE NOT NULL,
          expires_at DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        
        -- Notifications table
        CREATE TABLE IF NOT EXISTS notifications (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('success', 'error', 'info', 'warning')),
          is_read INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        
        -- Clients table
        CREATE TABLE IF NOT EXISTS clients (
          id TEXT PRIMARY KEY,
          id_cliente TEXT,
          cliente TEXT NOT NULL,
          rfc TEXT NOT NULL,
          credito INTEGER DEFAULT 0,
          contacto TEXT,
          direccion TEXT,
          mail TEXT,
          tel TEXT,
          constancia_fiscal TEXT,
          acta_constitutiva TEXT,
          identificacion TEXT,
          comprobante_domicilio TEXT,
          contacto_cobro1_nombre TEXT,
          contacto_cobro1_correo TEXT,
          contacto_cobro2_nombre TEXT,
          contacto_cobro2_correo TEXT,
          porcentaje_completado INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Invoices table
        CREATE TABLE IF NOT EXISTS invoices (
          id TEXT PRIMARY KEY,
          paqueteria TEXT NOT NULL,
          numero_comprobante TEXT UNIQUE NOT NULL,
          cliente TEXT NOT NULL,
          rfc TEXT NOT NULL,
          credito INTEGER DEFAULT 0,
          fecha_creacion DATE NOT NULL,
          fecha_vencimiento DATE NOT NULL,
          total DECIMAL(12,2) NOT NULL,
          pago1 DECIMAL(12,2) DEFAULT 0,
          fecha_pago1 DATE,
          pago2 DECIMAL(12,2) DEFAULT 0,
          fecha_pago2 DATE,
          pago3 DECIMAL(12,2) DEFAULT 0,
          fecha_pago3 DATE,
          nc DECIMAL(12,2) DEFAULT 0,
          por_cobrar DECIMAL(12,2) DEFAULT 0,
          estatus TEXT NOT NULL CHECK (estatus IN ('Pendiente', 'Pagada')),
          comentarios TEXT,
          cfdi TEXT,
          soporte TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Create indexes for better performance
        CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
        CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
        CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_clients_cliente ON clients(cliente);
        CREATE INDEX IF NOT EXISTS idx_clients_rfc ON clients(rfc);
        CREATE INDEX IF NOT EXISTS idx_invoices_numero ON invoices(numero_comprobante);
        CREATE INDEX IF NOT EXISTS idx_invoices_cliente ON invoices(cliente);
        CREATE INDEX IF NOT EXISTS idx_invoices_fecha ON invoices(fecha_creacion);
        CREATE INDEX IF NOT EXISTS idx_invoices_estatus ON invoices(estatus);
      `);
      
      console.log('📦 Boxito: Essential tables created successfully');
    }

    // Create admin user
    await createDefaultAdmin();
    
    // Final test
    const testQuery = await db.selectFrom('users').selectAll().limit(1).execute();
    console.log('📦 Boxito: ✅ Database initialization complete, users found:', testQuery.length);
    
    return true;
  } catch (error) {
    console.error('📦 Boxito: ❌ Database initialization failed:', error);
    return false;
  }
}

// Cleanup expired sessions
export async function cleanupExpiredSessions() {
  try {
    if (!db) {
      console.warn('📦 Boxito: Database not available for cleanup');
      return 0;
    }
    
    const result = await db
      .deleteFrom('sessions')
      .where('expires_at', '<=', new Date().toISOString())
      .execute();
    
    if (result.numDeletedRows > 0) {
      console.log(`📦 Boxito: 🧹 Cleaned ${result.numDeletedRows} expired sessions`);
    }
    
    return result.numDeletedRows;
  } catch (error) {
    console.error('📦 Boxito: Error cleaning expired sessions:', error);
    return 0;
  }
}

// Get database info
export function getDatabaseInfo() {
  try {
    const info = {
      path: dbPath,
      exists: fs.existsSync(dbPath),
      size: fs.existsSync(dbPath) ? Math.round(fs.statSync(dbPath).size / 1024) + ' KB' : '0 KB',
      mode: 'Default',
      optimizations: 'Enabled'
    };
    
    return info;
  } catch (error) {
    console.error('📦 Boxito: Error getting database info:', error);
    return {
      path: dbPath,
      exists: false,
      size: '0 KB',
      error: (error as Error).message
    };
  }
}

// Export database instance
export { db };
export * from './schema.js';
