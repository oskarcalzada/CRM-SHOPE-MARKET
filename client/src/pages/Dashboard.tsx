import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { NotificationContext } from '@/App';
import { BarChart3, TrendingUp, AlertTriangle, Calendar, DollarSign, CreditCard, FileText, Clock, Users, Target, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

interface DashboardStats {
  ingresos_hoy: number;
  recargas_dia: number;
  facturas_pendientes: number;
  saldos_vencidos: number;
  total_facturas: number;
  total_facturado: number;
  total_por_cobrar: number;
  facturas_vencidas: number;
}

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Dashboard() {
  const { hasPermission } = useAuth();
  const { showNotification } = React.useContext(NotificationContext);
  const [stats, setStats] = React.useState<DashboardStats>({
    ingresos_hoy: 0,
    recargas_dia: 0,
    facturas_pendientes: 0,
    saldos_vencidos: 0,
    total_facturas: 0,
    total_facturado: 0,
    total_por_cobrar: 0,
    facturas_vencidas: 0
  });
  const [loading, setLoading] = React.useState(true);
  const [overviewData, setOverviewData] = React.useState<any>(null);

  // Get auth headers for API calls
  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  // Load dashboard statistics
  const loadDashboardStats = async () => {
    if (!hasPermission('dashboard', 'read')) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      console.log('📦 Boxito: Loading dashboard statistics...');
      
      // Load basic stats
      const response = await fetch('/api/dashboard/stats', {
        headers: getAuthHeaders()
      });
      
      // Load advanced overview
      const overviewResponse = await fetch('/api/dashboard/overview', {
        headers: getAuthHeaders()
      });
      
      if (response.ok && overviewResponse.ok) {
        const data = await response.json();
        const overview = await overviewResponse.json();
        
        setStats(data);
        setOverviewData(overview);
        console.log('📦 Boxito: Dashboard stats loaded:', data);
      } else {
        console.error('📦 Boxito: Error loading dashboard stats');
        showNotification('Error al cargar estadísticas del dashboard', 'error');
      }
    } catch (error) {
      console.error('📦 Boxito: Error loading dashboard stats:', error);
      showNotification('Error de conexión al cargar dashboard', 'error');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadDashboardStats();
    
    // Refresh stats every 5 minutes
    const interval = setInterval(loadDashboardStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [hasPermission]);

  if (!hasPermission('dashboard', 'read')) {
    return (
      <div className="p-6">
        <Card className="card-shope">
          <CardContent className="p-6 text-center">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No tienes permisos para ver el dashboard.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-600 to-purple-700 text-white border-0 shadow-2xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">📊 Dashboard Principal</h1>
              <p className="text-blue-100">
                Métricas en tiempo real del rendimiento del negocio
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-blue-200">Última actualización</div>
                <div className="text-white font-medium">
                  {new Date().toLocaleTimeString('es-MX')}
                </div>
              </div>
              <Calendar className="w-8 h-8 text-blue-200" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Stats Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-4"></div>
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Ingresos Hoy */}
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-green-100 text-sm font-medium">Ingresos hoy</h3>
                  <div className="text-3xl font-bold mt-2">
                    ${stats.ingresos_hoy.toLocaleString('es-MX')}
                  </div>
                </div>
                <div className="bg-white/20 p-3 rounded-full">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>
              <div className="flex items-center text-green-100 text-sm">
                <span className="mr-2">💰</span>
                <span>Hoy</span>
              </div>
            </CardContent>
          </Card>

          {/* Recargas del Día */}
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-blue-100 text-sm font-medium">Recargas del día</h3>
                  <div className="text-3xl font-bold mt-2">
                    ${stats.recargas_dia.toLocaleString('es-MX')}
                  </div>
                </div>
                <div className="bg-white/20 p-3 rounded-full">
                  <CreditCard className="w-6 h-6" />
                </div>
              </div>
              <div className="flex items-center text-blue-100 text-sm">
                <span className="mr-2">📈</span>
                <span>Hoy</span>
              </div>
            </CardContent>
          </Card>

          {/* Facturas Pendientes */}
          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-orange-100 text-sm font-medium">Facturas pendientes</h3>
                  <div className="text-3xl font-bold mt-2">
                    {stats.facturas_pendientes}
                  </div>
                </div>
                <div className="bg-white/20 p-3 rounded-full">
                  <FileText className="w-6 h-6" />
                </div>
              </div>
              <div className="flex items-center text-orange-100 text-sm">
                <span className="mr-2">⚠️</span>
                <span>Pendientes</span>
              </div>
            </CardContent>
          </Card>

          {/* Saldos Vencidos */}
          <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-red-100 text-sm font-medium">Saldos vencidos</h3>
                  <div className="text-3xl font-bold mt-2">
                    ${stats.saldos_vencidos.toLocaleString('es-MX')}
                  </div>
                </div>
                <div className="bg-white/20 p-3 rounded-full">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              </div>
              <div className="flex items-center text-red-100 text-sm">
                <span className="mr-2">⚠️</span>
                <span>Vencidos</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Section */}
      {overviewData && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Monthly Trends */}
          <Card className="card-shope">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Tendencias Mensuales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={overviewData.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: any) => `$${Number(value).toLocaleString('es-MX')}`} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="#6366f1" 
                      name="Facturado"
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="paid" 
                      stroke="#10b981" 
                      name="Cobrado"
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="outstanding" 
                      stroke="#f59e0b" 
                      name="Pendiente"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Status Distribution */}
          <Card className="card-shope">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-green-600" />
                Distribución de Facturas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Pagadas', value: overviewData.totals.paidInvoices, fill: '#10b981' },
                        { name: 'Pendientes', value: overviewData.totals.pendingInvoices, fill: '#f59e0b' },
                        { name: 'Vencidas', value: overviewData.totals.overdueInvoices, fill: '#ef4444' }
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label={({name, value}) => `${name}: ${value}`}
                    >
                      {[
                        { name: 'Pagadas', value: overviewData.totals.paidInvoices, fill: '#10b981' },
                        { name: 'Pendientes', value: overviewData.totals.pendingInvoices, fill: '#f59e0b' },
                        { name: 'Vencidas', value: overviewData.totals.overdueInvoices, fill: '#ef4444' }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Additional Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Facturas */}
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-purple-100 text-sm font-medium mb-2">Total Facturas</h3>
                <div className="text-2xl font-bold">{stats.total_facturas}</div>
              </div>
              <FileText className="w-8 h-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>

        {/* Total Facturado */}
        <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-indigo-100 text-sm font-medium mb-2">Total Facturado</h3>
                <div className="text-2xl font-bold">${stats.total_facturado.toLocaleString('es-MX')}</div>
              </div>
              <TrendingUp className="w-8 h-8 text-indigo-200" />
            </div>
          </CardContent>
        </Card>

        {/* Por Cobrar */}
        <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-yellow-100 text-sm font-medium mb-2">Por Cobrar</h3>
                <div className="text-2xl font-bold">${stats.total_por_cobrar.toLocaleString('es-MX')}</div>
              </div>
              <Clock className="w-8 h-8 text-yellow-200" />
            </div>
          </CardContent>
        </Card>

        {/* Facturas Vencidas */}
        <Card className="bg-gradient-to-br from-pink-500 to-pink-600 text-white border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-pink-100 text-sm font-medium mb-2">Fact. Vencidas</h3>
                <div className="text-2xl font-bold">{stats.facturas_vencidas}</div>
              </div>
              <AlertTriangle className="w-8 h-8 text-pink-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Clients */}
      {overviewData?.topClients && (
        <Card className="card-shope">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Top 5 Clientes por Facturación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {overviewData.topClients.slice(0, 5).map((client: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-white rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                      index === 0 ? 'bg-yellow-500' : 
                      index === 1 ? 'bg-gray-400' : 
                      index === 2 ? 'bg-amber-600' : 'bg-blue-500'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{client.cliente}</p>
                      <p className="text-xs text-gray-600">{client.rfc}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-blue-600">
                      ${client.totalAmount.toLocaleString('es-MX')}
                    </p>
                    <p className="text-xs text-gray-600">{client.invoiceCount} facturas</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Metrics */}
      {overviewData?.financial && (
        <Card className="card-shope">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-green-600" />
              Métricas de Rendimiento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <Activity className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-700">
                  {overviewData.financial.collectionRate.toFixed(1)}%
                </div>
                <div className="text-sm text-green-600">Tasa de Cobro</div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <DollarSign className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-700">
                  ${overviewData.summary.avgInvoiceAmount.toLocaleString('es-MX')}
                </div>
                <div className="text-sm text-blue-600">Ticket Promedio</div>
              </div>
              
              <div className="bg-orange-50 p-4 rounded-lg text-center">
                <AlertTriangle className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-orange-700">
                  {overviewData.financial.overdueRate.toFixed(1)}%
                </div>
                <div className="text-sm text-orange-600">Cartera Vencida</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Message */}
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <div>
              <h3 className="font-semibold text-gray-800">📦 Sistema Boxito - Estado Operativo</h3>
              <p className="text-gray-600 text-sm mt-1">
                Todas las métricas se actualizan en tiempo real. 
                {stats.total_facturas === 0 ? 
                  ' Comienza creando tu primera factura para ver las estadísticas.' :
                  ` Mostrando datos de ${stats.total_facturas} facturas registradas.`
                }
                {overviewData && ` - Tasa de cobro actual: ${overviewData.financial.collectionRate.toFixed(1)}%`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
