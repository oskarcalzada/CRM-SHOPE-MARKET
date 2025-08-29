import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Static serve routes for development
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: '📦 Boxito Static Serve',
    timestamp: new Date().toISOString()
  });
});

// Serve static files info
router.get('/info', (req, res) => {
  const distPath = path.resolve(__dirname, '..', 'public');
  
  res.json({
    message: '📦 Boxito Static Serve Info',
    distPath,
    environment: process.env.NODE_ENV || 'development',
    note: 'This endpoint is for development only'
  });
});

export { router as staticServeRoutes };

export function setupStaticServing(app: express.Application) {
  console.log('📦 Boxito: Setting up static serving for production');
  
  // Get the absolute path to the dist directory
  const distPath = path.resolve(__dirname, '..', 'public');
  console.log('📦 Boxito: Static files path:', distPath);
  
  // Serve static files from the public directory
  app.use(express.static(distPath, {
    maxAge: '1d', // Cache static assets for 1 day
    setHeaders: (res, path) => {
      // Set cache headers for different file types
      if (path.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      } else if (path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
      }
    }
  }));

  // Handle client-side routing - serve index.html for all non-API routes
  app.get('/*splat', (req, res) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
      res.status(404).json({ error: 'API endpoint not found' });
      return;
    }
    
    // Serve index.html for all other routes (SPA routing)
    const indexPath = path.join(distPath, 'index.html');
    console.log('📦 Boxito: Serving SPA route:', req.path, 'from', indexPath);
    
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error('📦 Boxito: Error serving index.html:', err);
        res.status(500).send('Error serving application');
        return;
      }
    });
  });
  
  console.log('📦 Boxito: Static serving setup complete');
}
