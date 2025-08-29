import express from 'express';
import { db } from '../database/index.js';
import { authMiddleware, requirePermission } from '../middleware/auth.js';

const router = express.Router();

// Get dashboard statistics
router.get('/stats', authMiddleware, requirePermission('dashboard', 'read'), async (req, res) => {
  try {
    console.log('📦 Boxito: Loading dashboard statistics...');
    
    const today = new Date().toISOString().split('T')[0];
    const currentDate = new Date();
    
    // Get all invoices for calculations
    const allInvoices = await db
      .selectFrom('invoices')
      .selectAll()
      .execute();
    
    console.log(`📦 Boxito: Found ${allInvoices.length} total invoices`);
    
    // Calculate today's income (payments made today)
    const ingresos_hoy = allInvoices.reduce((total, invoice) => {
      let todayPayments = 0;
      
      if (invoice.fecha_pago1 === today) {
        todayPayments += Number(invoice.pago1 || 0);
      }
      if (invoice.fecha_pago2 === today) {
        todayPayments += Number(invoice.pago2 || 0);
      }
      if (invoice.fecha_pago3 === today) {
        todayPayments += Number(invoice.pago3 || 0);
      }
      
      return total + todayPayments;
    }, 0);
    
    // Calculate today's charges (invoices created today)
    const recargas_dia = allInvoices
      .filter(invoice => invoice.fecha_creacion === today)
      .reduce((total, invoice) => total + Number(invoice.total), 0);
    
    // Count pending invoices
    const facturas_pendientes = allInvoices.filter(invoice => 
      invoice.estatus === 'Pendiente' && Number(invoice.por_cobrar) > 0
    ).length;
    
    // Calculate overdue amounts
    const saldos_vencidos = allInvoices
      .filter(invoice => 
        invoice.estatus === 'Pendiente' && 
        new Date(invoice.fecha_vencimiento) < currentDate &&
        Number(invoice.por_cobrar) > 0
      )
      .reduce((total, invoice) => total + Number(invoice.por_cobrar), 0);
    
    // Total statistics
    const total_facturas = allInvoices.length;
    const total_facturado = allInvoices.reduce((total, invoice) => total + Number(invoice.total), 0);
    const total_por_cobrar = allInvoices
      .filter(invoice => invoice.estatus === 'Pendiente')
      .reduce((total, invoice) => total + Number(invoice.por_cobrar), 0);
    
    const facturas_vencidas = allInvoices.filter(invoice => 
      invoice.estatus === 'Pendiente' && 
      new Date(invoice.fecha_vencimiento) < currentDate &&
      Number(invoice.por_cobrar) > 0
    ).length;

    const stats = {
      ingresos_hoy,
      recargas_dia,
      facturas_pendientes,
      saldos_vencidos,
      total_facturas,
      total_facturado,
      total_por_cobrar,
      facturas_vencidas
    };
    
    console.log('📦 Boxito: Dashboard stats calculated:', stats);
    
    res.json(stats);
  } catch (error) {
    console.error('📦 Boxito: Error calculating dashboard stats:', error);
    res.status(500).json({ error: 'Error al calcular estadísticas del dashboard' });
  }
});

// Get overdue invoices
router.get('/overdue', authMiddleware, requirePermission('dashboard', 'read'), async (req, res) => {
  try {
    console.log('📦 Boxito: Getting overdue invoices...');
    
    const today = new Date().toISOString().split('T')[0];
    
    const overdueInvoices = await db
      .selectFrom('invoices')
      .selectAll()
      .where('estatus', '=', 'Pendiente')
      .where('fecha_vencimiento', '<', today)
      .where('por_cobrar', '>', 0)
      .orderBy('fecha_vencimiento', 'asc')
      .limit(10) // Limit to 10 most critical overdue invoices
      .execute();
    
    console.log(`📦 Boxito: Found ${overdueInvoices.length} overdue invoices`);
    res.json(overdueInvoices);
  } catch (error) {
    console.error('📦 Boxito: Error getting overdue invoices:', error);
    res.status(500).json({ error: 'Error al obtener facturas vencidas' });
  }
});

// Get recent activity
router.get('/recent-activity', authMiddleware, requirePermission('dashboard', 'read'), async (req, res) => {
  try {
    console.log('📦 Boxito: Getting recent activity...');
    
    const recentInvoices = await db
      .selectFrom('invoices')
      .select(['numero_comprobante', 'cliente', 'total', 'estatus', 'created_at'])
      .orderBy('created_at', 'desc')
      .limit(5)
      .execute();
    
    const recentCreditNotes = await db
      .selectFrom('credit_notes')
      .select(['cliente', 'monto', 'estatus', 'created_at'])
      .orderBy('created_at', 'desc')
      .limit(3)
      .execute();
    
    const activity = {
      recent_invoices: recentInvoices,
      recent_credit_notes: recentCreditNotes
    };
    
    console.log('📦 Boxito: Recent activity loaded');
    res.json(activity);
  } catch (error) {
    console.error('📦 Boxito: Error getting recent activity:', error);
    res.status(500).json({ error: 'Error al obtener actividad reciente' });
  }
});

// NEW: Advanced dashboard overview for Estado de Cuenta
router.get('/overview', authMiddleware, requirePermission('dashboard', 'read'), async (req, res) => {
  try {
    console.log('📦 Boxito: Loading advanced dashboard overview...');
    
    const { year, month, clientId, clientName } = req.query;
    const currentYear = new Date().getFullYear();
    
    // Get all invoices with optional filters
    let invoiceQuery = db.selectFrom('invoices').selectAll();
    
    // Apply year filter
    if (year && year !== 'all') {
      invoiceQuery = invoiceQuery.where('fecha_creacion', '>=', `${year}-01-01`)
                                  .where('fecha_creacion', '<=', `${year}-12-31`);
    }
    
    // Apply month filter
    if (month && month !== '0') {
      const monthPadded = String(month).padStart(2, '0');
      const selectedYear = year && year !== 'all' ? year : currentYear;
      invoiceQuery = invoiceQuery.where('fecha_creacion', '>=', `${selectedYear}-${monthPadded}-01`)
                                  .where('fecha_creacion', '<=', `${selectedYear}-${monthPadded}-31`);
    }
    
    const allInvoices = await invoiceQuery.execute();
    
    // Get all credit notes
    const allCreditNotes = await db
      .selectFrom('credit_notes')
      .selectAll()
      .execute();
    
    // Get all clients for additional data
    const allClients = await db
      .selectFrom('clients')
      .selectAll()
      .execute();
    
    console.log(`📦 Boxito: Processing ${allInvoices.length} invoices for advanced dashboard`);
    
    // Calculate comprehensive metrics
    const totalRevenue = allInvoices.reduce((sum, inv) => sum + Number(inv.total), 0);
    const totalPaid = allInvoices.reduce((sum, inv) => sum + Number(inv.pago1 || 0) + Number(inv.pago2 || 0) + Number(inv.pago3 || 0), 0);
    const totalOutstanding = allInvoices.reduce((sum, inv) => sum + Number(inv.por_cobrar || 0), 0);
    const totalCreditNotes = allInvoices.reduce((sum, inv) => sum + Number(inv.nc || 0), 0);
    
    const today = new Date().toISOString().split('T')[0];
    const overdueInvoices = allInvoices.filter(inv => 
      inv.estatus === 'Pendiente' && 
      inv.fecha_vencimiento < today &&
      Number(inv.por_cobrar) > 0
    );
    const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + Number(inv.por_cobrar), 0);
    
    // Monthly breakdown
    const monthlyData = [];
    for (let i = 1; i <= 12; i++) {
      const monthInvoices = allInvoices.filter(inv => {
        const invDate = new Date(inv.fecha_creacion);
        return invDate.getMonth() + 1 === i;
      });
      
      if (monthInvoices.length > 0) {
        monthlyData.push({
          month: `${currentYear}-${String(i).padStart(2, '0')}`,
          count: monthInvoices.length,
          amount: monthInvoices.reduce((sum, inv) => sum + Number(inv.total), 0),
          paid: monthInvoices.reduce((sum, inv) => sum + Number(inv.pago1 || 0) + Number(inv.pago2 || 0) + Number(inv.pago3 || 0), 0),
          outstanding: monthInvoices.reduce((sum, inv) => sum + Number(inv.por_cobrar || 0), 0)
        });
      }
    }
    
    // Top clients analysis
    const clientAnalysis = {};
    allInvoices.forEach(invoice => {
      const clientKey = invoice.cliente;
      if (!clientAnalysis[clientKey]) {
        clientAnalysis[clientKey] = {
          cliente: invoice.cliente,
          rfc: invoice.rfc,
          totalAmount: 0,
          totalPaid: 0,
          totalOutstanding: 0,
          invoiceCount: 0
        };
      }
      
      clientAnalysis[clientKey].totalAmount += Number(invoice.total);
      clientAnalysis[clientKey].totalPaid += Number(invoice.pago1 || 0) + Number(invoice.pago2 || 0) + Number(invoice.pago3 || 0);
      clientAnalysis[clientKey].totalOutstanding += Number(invoice.por_cobrar || 0);
      clientAnalysis[clientKey].invoiceCount += 1;
    });
    
    const topClients = Object.values(clientAnalysis)
      .sort((a: any, b: any) => b.totalAmount - a.totalAmount)
      .slice(0, 10);
    
    // Comprehensive overview object
    const overview = {
      financial: {
        totalRevenue,
        totalPaid,
        totalOutstanding,
        totalOverdue,
        totalCreditNotes,
        collectionRate: totalRevenue > 0 ? (totalPaid / totalRevenue) * 100 : 0,
        overdueRate: totalRevenue > 0 ? (totalOverdue / totalRevenue) * 100 : 0
      },
      totals: {
        invoices: allInvoices.length,
        pendingInvoices: allInvoices.filter(inv => inv.estatus === 'Pendiente').length,
        paidInvoices: allInvoices.filter(inv => inv.estatus === 'Pagada').length,
        overdueInvoices: overdueInvoices.length,
        clients: [...new Set(allInvoices.map(inv => inv.cliente))].length,
        creditNotes: allCreditNotes.length
      },
      monthlyData,
      topClients,
      summary: {
        avgInvoiceAmount: allInvoices.length > 0 ? totalRevenue / allInvoices.length : 0,
        avgClientRevenue: [...new Set(allInvoices.map(inv => inv.cliente))].length > 0 
          ? totalRevenue / [...new Set(allInvoices.map(inv => inv.cliente))].length 
          : 0,
        paymentEfficiency: allInvoices.length > 0 ? (allInvoices.filter(inv => inv.estatus === 'Pagada').length / allInvoices.length) * 100 : 0
      }
    };
    
    console.log('📦 Boxito: Advanced dashboard overview calculated');
    res.json(overview);
    
  } catch (error) {
    console.error('📦 Boxito: Error loading dashboard overview:', error);
    res.status(500).json({ error: 'Error al cargar vista general del dashboard' });
  }
});

export { router as dashboardRoutes };
