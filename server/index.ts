
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { initializeDatabase, testConnection, getDatabaseInfo, cleanupExpiredSessions } from './database/index.js';
import { authRoutes } from './routes/auth.js';
import { invoiceRoutes } from './routes/invoices.js';
import { creditNoteRoutes } from './routes/credit-notes.js';
import { receiptRoutes } from './routes/receipts.js';
import { proposalRoutes } from './routes/proposals.js';
import { prospectRoutes } from './routes/prospects.js';
import { clientRoutes } from './routes/clients.js';
import { userRoutes } from './routes/users.js';
import { notificationRoutes } from './routes/notifications.js';
import { notificationAutomationRoutes } from './routes/notification-automation.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { guideCancellationRoutes } from './routes/guide-cancellations.js';
import { ticketRoutes } from './routes/tickets.js';
import { staticServeRoutes } from './static-serve.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize database and start server function
export async function startServer(port?: number): Promise<void> {
  const app = express();
  const PORT = port || process.env.PORT || 3001;

  console.log('📦 Boxito: Starting server initialization...');

  try {
    // Test database connection first
    console.log('📦 Boxito: Testing database connection...');
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.error('📦 Boxito: Database connection failed - attempting initialization');
      const dbInitialized = await initializeDatabase();
      
      if (!dbInitialized) {
        console.error('📦 Boxito: Database initialization failed');
        throw new Error('Database initialization failed');
      }
      
      // Test again after initialization
      const retryConnection = await testConnection();
      if (!retryConnection) {
        throw new Error('Database connection still failing after initialization');
      }
    }
    
    console.log('📦 Boxito: Database connection successful');

    // Middleware
    app.use(cors());
    app.use(express.json({ 
      limit: '10mb',
      strict: true
    }));
    app.use(express.urlencoded({ 
      extended: true, 
      limit: '10mb'
    }));

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        service: '📦 Boxito CRM',
        version: '1.0.0'
      });
    });

    // Database info endpoint
    app.get('/api/db-info', async (req, res) => {
      try {
        const info = getDatabaseInfo();
        res.json({
          database: info,
          environment: process.env.NODE_ENV || 'development',
          dataDirectory: process.env.DATA_DIRECTORY || './data'
        });
      } catch (error) {
        console.error('📦 Boxito: Error getting DB info:', error);
        res.status(500).json({
          error: 'Error obteniendo información de la base de datos'
        });
      }
    });

    // API Routes
    app.use('/api/auth', authRoutes);
    app.use('/api/invoices', invoiceRoutes);
    app.use('/api/credit-notes', creditNoteRoutes);
    app.use('/api/receipts', receiptRoutes);
    app.use('/api/proposals', proposalRoutes);
    app.use('/api/prospects', prospectRoutes);
    app.use('/api/clients', clientRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/notifications', notificationRoutes);
    app.use('/api/notification-automation', notificationAutomationRoutes);
    app.use('/api/dashboard', dashboardRoutes);
    app.use('/api/guide-cancellations', guideCancellationRoutes);
    app.use('/api/tickets', ticketRoutes);

    // Serve static files in production
    if (process.env.NODE_ENV === 'production') {
      const publicPath = join(__dirname, '../public');
      console.log('📦 Boxito: Setting up static file serving from:', publicPath);
      
      if (fs.existsSync(publicPath)) {
        app.use(express.static(publicPath, {
          maxAge: '1d',
          etag: true,
          lastModified: true
        }));
        
        // Serve React app for all non-API routes
        app.get('/*splat', (req, res) => {
          const indexPath = join(publicPath, 'index.html');
          if (fs.existsSync(indexPath)) {
            res.sendFile(indexPath);
          } else {
            res.status(404).send('Index file not found');
          }
        });
      } else {
        console.error('📦 Boxito: Public directory not found:', publicPath);
        app.get('/*splat', (req, res) => {
          res.status(503).json({ 
            error: 'Static files not available',
            path: publicPath,
            exists: false
          });
        });
      }
    } else {
      // Development mode - API only
      app.use('/api/static-serve', staticServeRoutes);
      
      app.get('/*splat', (req, res) => {
        res.json({ 
          message: '📦 Boxito CRM API Server',
          version: '1.0.0',
          environment: 'development',
          note: 'Frontend served separately in development'
        });
      });
    }

    // Error handling middleware
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('📦 Boxito: Server error:', err);
      res.status(500).json({ 
        error: 'Error interno del servidor',
        message: err.message,
        timestamp: new Date().toISOString()
      });
    });

    // Initial cleanup
    await cleanupExpiredSessions();
    
    // Start the server
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`📦 Boxito: Server running on port ${PORT}`);
      console.log(`📦 Boxito: Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📦 Boxito: Data directory: ${process.env.DATA_DIRECTORY || './data'}`);
      console.log('📦 Boxito: Server is ready to accept connections! 🚀');
    });

    // Graceful shutdown handling
    const gracefulShutdown = (signal: string) => {
      console.log(`📦 Boxito: Received ${signal}. Starting graceful shutdown...`);
      
      server.close((err) => {
        if (err) {
          console.error('📦 Boxito: Error during server shutdown:', err);
          process.exit(1);
        }
        
        console.log('📦 Boxito: Server closed successfully');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('📦 Boxito: Server startup failed:', error);
    console.error('📦 Boxito: Error details:', {
      message: (error as Error).message,
      stack: (error as Error).stack
    });
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('📦 Boxito: Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('📦 Boxito: Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Auto-start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('📦 Boxito: Starting server directly...');
  startServer().catch(error => {
    console.error('📦 Boxito: Failed to start server:', error);
    process.exit(1);
  });
}
