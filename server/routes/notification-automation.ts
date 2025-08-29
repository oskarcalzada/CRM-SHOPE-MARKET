import express from 'express';
import { db } from '../database/index.js';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { createNotification } from './notifications.js';

const router = express.Router();

// Check for overdue invoices and send notifications
router.post('/check-invoices', authMiddleware, requirePermission('dashboard', 'read'), async (req, res) => {
  try {
    console.log('📦 Boxito: Manual check for overdue invoices triggered...');
    
    const today = new Date().toISOString().split('T')[0];
    
    // Get overdue invoices
    const overdueInvoices = await db
      .selectFrom('invoices')
      .selectAll()
      .where('estatus', '=', 'Pendiente')
      .where('fecha_vencimiento', '<', today)
      .where('por_cobrar', '>', 0)
      .execute();
    
    console.log(`📦 Boxito: Found ${overdueInvoices.length} overdue invoices`);
    
    if (overdueInvoices.length === 0) {
      await createNotification(
        'Revisión de Facturas',
        '¡Excelente! No hay facturas vencidas en el sistema',
        'success'
      );
      
      res.json({
        message: 'No hay facturas vencidas',
        overdueCount: 0
      });
      return;
    }
    
    // Group overdue invoices by severity
    const criticalOverdue = overdueInvoices.filter(invoice => {
      const daysOverdue = Math.floor((new Date().getTime() - new Date(invoice.fecha_vencimiento).getTime()) / (1000 * 60 * 60 * 24));
      return daysOverdue > 30;
    });
    
    const warningOverdue = overdueInvoices.filter(invoice => {
      const daysOverdue = Math.floor((new Date().getTime() - new Date(invoice.fecha_vencimiento).getTime()) / (1000 * 60 * 60 * 24));
      return daysOverdue <= 30 && daysOverdue > 7;
    });
    
    const recentOverdue = overdueInvoices.filter(invoice => {
      const daysOverdue = Math.floor((new Date().getTime() - new Date(invoice.fecha_vencimiento).getTime()) / (1000 * 60 * 60 * 24));
      return daysOverdue <= 7;
    });
    
    // Calculate total overdue amount
    const totalOverdueAmount = overdueInvoices.reduce((total, invoice) => total + invoice.por_cobrar, 0);
    
    // Create appropriate notifications
    if (criticalOverdue.length > 0) {
      await createNotification(
        'URGENTE: Facturas Críticas Vencidas',
        `${criticalOverdue.length} facturas vencidas hace más de 30 días por $${totalOverdueAmount.toLocaleString('es-MX')}`,
        'error'
      );
    }
    
    if (warningOverdue.length > 0) {
      await createNotification(
        'Atención: Facturas Vencidas',
        `${warningOverdue.length} facturas vencidas entre 7-30 días requieren seguimiento`,
        'warning'
      );
    }
    
    if (recentOverdue.length > 0) {
      await createNotification(
        'Facturas Recién Vencidas',
        `${recentOverdue.length} facturas vencidas en los últimos 7 días`,
        'info'
      );
    }
    
    // Create summary notification
    await createNotification(
      'Resumen de Cobranza',
      `Total: ${overdueInvoices.length} facturas vencidas por $${totalOverdueAmount.toLocaleString('es-MX')}`,
      overdueInvoices.length > 10 ? 'warning' : 'info'
    );
    
    console.log('📦 Boxito: Overdue invoice notifications created successfully');
    
    res.json({
      message: 'Verificación completada',
      overdueCount: overdueInvoices.length,
      totalAmount: totalOverdueAmount,
      breakdown: {
        critical: criticalOverdue.length,
        warning: warningOverdue.length,
        recent: recentOverdue.length
      }
    });
  } catch (error) {
    console.error('📦 Boxito: Error checking overdue invoices:', error);
    res.status(500).json({ error: 'Error al verificar facturas vencidas' });
  }
});

// Get automation settings
router.get('/settings', authMiddleware, requirePermission('usuarios', 'read'), async (req, res) => {
  try {
    // For now, return default settings since we don't have a settings table
    const settings = {
      enabled: true,
      checkInterval: '1 hour',
      warningDays: [7, 15, 30],
      recipients: ['admin'],
      lastCheck: new Date().toISOString()
    };
    
    res.json(settings);
  } catch (error) {
    console.error('📦 Boxito: Error getting automation settings:', error);
    res.status(500).json({ error: 'Error al obtener configuración de automatización' });
  }
});

// Update automation settings
router.put('/settings', authMiddleware, requirePermission('usuarios', 'update'), async (req, res) => {
  try {
    const { enabled, checkInterval, warningDays, recipients } = req.body;
    
    // For now, just validate the settings since we don't have a settings table
    const updatedSettings = {
      enabled: Boolean(enabled),
      checkInterval: checkInterval || '1 hour',
      warningDays: Array.isArray(warningDays) ? warningDays : [7, 15, 30],
      recipients: Array.isArray(recipients) ? recipients : ['admin'],
      lastUpdated: new Date().toISOString()
    };
    
    console.log('📦 Boxito: Automation settings updated:', updatedSettings);
    
    await createNotification(
      'Configuración Actualizada',
      'Configuración de automatización de notificaciones actualizada',
      'success'
    );
    
    res.json({
      message: 'Configuración actualizada exitosamente',
      settings: updatedSettings
    });
  } catch (error) {
    console.error('📦 Boxito: Error updating automation settings:', error);
    res.status(500).json({ error: 'Error al actualizar configuración de automatización' });
  }
});

export { router as notificationAutomationRoutes };
