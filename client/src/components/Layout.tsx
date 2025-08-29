
import * as React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Home, FileText, CreditCard, Receipt, BarChart3, Users, 
  FileSpreadsheet, TrendingUp, Settings, LogOut, User,
  Menu, X, Building, Package, Bell, AlertCircle, Clock, CheckCircle, XCircle, Ticket
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  is_read: number;
  created_at: string;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout, hasPermission } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [notificationOpen, setNotificationOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  // Get auth headers for API calls
  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  // Load notifications
  const loadNotifications = React.useCallback(async () => {
    if (!hasPermission('dashboard', 'read')) return;
    
    try {
      const response = await fetch('/api/notifications?limit=20', {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
        
        // Get unread count
        const countsResponse = await fetch('/api/notifications/counts', {
          headers: getAuthHeaders()
        });
        
        if (countsResponse.ok) {
          const countsData = await countsResponse.json();
          setUnreadCount(countsData.unread);
        }
      }
    } catch (error) {
      console.error('📦 Boxito: Error loading notifications:', error);
    }
  }, [hasPermission]);

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, is_read: 1 } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('📦 Boxito: Error marking notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/notifications/read-all', {
        method: 'PUT',
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('📦 Boxito: Error marking all notifications as read:', error);
    } finally {
      setLoading(false);
    }
  };

  // Trigger manual notification check
  const triggerNotificationCheck = async () => {
    if (!hasPermission('dashboard', 'read')) return;
    
    try {
      setLoading(true);
      const response = await fetch('/api/notification-automation/check-invoices', {
        method: 'POST',
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('📦 Boxito: Manual notification check completed:', result);
        
        // Reload notifications after check
        setTimeout(() => {
          loadNotifications();
        }, 2000);
      }
    } catch (error) {
      console.error('📦 Boxito: Error triggering notification check:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load notifications on mount and set up polling
  React.useEffect(() => {
    loadNotifications();
    
    // Poll for new notifications every 60 seconds
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const menuItems = [
    { path: '/', icon: Home, label: 'Dashboard', module: 'dashboard', action: 'read' },
    { path: '/facturacion', icon: FileText, label: 'Facturación', module: 'facturacion', action: 'read' },
    { path: '/pagos', icon: CreditCard, label: 'Pagos', module: 'pagos', action: 'read' },
    { path: '/comprobantes', icon: Receipt, label: 'Comprobantes', module: 'comprobantes', action: 'read' },
    { path: '/estado-cuenta', icon: BarChart3, label: 'Estado de Cuenta', module: 'estado-cuenta', action: 'read' },
    { path: '/directorio', icon: Users, label: 'Directorio', module: 'directorio', action: 'read' },
    { path: '/propuestas', icon: FileSpreadsheet, label: 'Propuestas', module: 'propuestas', action: 'read' },
    { path: '/comercial', icon: TrendingUp, label: 'Comercial', module: 'comercial', action: 'read' },
    { path: '/tickets', icon: Ticket, label: 'Tickets', module: 'soporte', action: 'read' },
    { path: '/cancelacion-guias', icon: XCircle, label: 'Cancelación Guías', module: 'facturacion', action: 'read' },
    { path: '/notas-credito', icon: CreditCard, label: 'Notas de Crédito', module: 'notas-credito', action: 'read' },
    { path: '/reportes', icon: BarChart3, label: 'Reportes', module: 'reportes', action: 'read' },
    { path: '/usuarios', icon: Settings, label: 'Usuarios', module: 'usuarios', action: 'read' },
    { path: '/configuracion-notificaciones', icon: Bell, label: 'Config. Notificaciones', module: 'usuarios', action: 'read' }
  ];

  const availableItems = menuItems.filter(item => hasPermission(item.module, item.action));

  const handleLogout = () => {
    logout();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <Clock className="w-4 h-4 text-blue-500" />;
    }
  };

  const formatNotificationTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Hace unos minutos';
    if (diffInHours < 24) return `Hace ${diffInHours}h`;
    return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  };

  const NotificationBell = () => (
    <Popover open={notificationOpen} onOpenChange={setNotificationOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative text-white hover:bg-white/10 p-2"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs animate-pulse"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0 mr-4" align="end">
        <div className="border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Notificaciones</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  disabled={loading}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  {loading ? 'Marcando...' : 'Marcar como leídas'}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={triggerNotificationCheck}
                disabled={loading}
                className="text-xs text-green-600 hover:text-green-800"
                title="Verificar facturas vencidas"
              >
                {loading ? '🔄' : '🔔 Verificar'}
              </Button>
            </div>
          </div>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-600 mt-1">
              Tienes {unreadCount} notificación{unreadCount === 1 ? '' : 'es'} sin leer
            </p>
          )}
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-6 text-center">
              <Bell className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">No tienes notificaciones</p>
              <Button
                variant="outline"
                size="sm"
                onClick={triggerNotificationCheck}
                disabled={loading}
                className="mt-2 text-xs"
              >
                {loading ? 'Verificando...' : '🔔 Verificar Facturas'}
              </Button>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`border-b border-gray-100 p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                  notification.is_read === 0 ? 'bg-blue-50/50' : ''
                }`}
                onClick={() => {
                  if (notification.is_read === 0) {
                    markAsRead(notification.id);
                  }
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className={`text-sm font-medium text-gray-900 truncate ${
                        notification.is_read === 0 ? 'font-semibold' : ''
                      }`}>
                        {notification.title}
                      </p>
                      {notification.is_read === 0 && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 ml-2"></div>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatNotificationTime(notification.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        {notifications.length > 0 && (
          <div className="border-t border-gray-200 p-3">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-blue-600 hover:text-blue-800"
              onClick={() => {
                setNotificationOpen(false);
                // Future: Navigate to notifications page
              }}
            >
              Ver todas las notificaciones
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header del sidebar con mascota - FIJO */}
      <div className="p-4 border-b border-blue-200/30 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg overflow-hidden">
            <img 
              src="/assets/boxito-mascot.jpg" 
              alt="Boxito - Mascota de Shope Envios"
              className="w-full h-full object-contain rounded-full"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.parentElement!.innerHTML = '<Package class="w-5 h-5 text-blue-600" />';
              }}
            />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Shope Envíos</h1>
            <p className="text-blue-100 text-xs">Sistema CRM</p>
          </div>
        </div>
      </div>

      {/* Información del usuario - FIJO */}
      <div className="p-3 border-b border-blue-200/30 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
            <User className="w-3 h-3 text-white" />
          </div>
          <div>
            <p className="text-white text-xs font-medium truncate">{user?.name}</p>
            <p className="text-blue-100 text-xs capitalize">{user?.role}</p>
          </div>
        </div>
      </div>

      {/* Menú de navegación - SCROLLABLE */}
      <nav className="flex-1 p-2 overflow-y-auto">
        <div className="space-y-1">
          {availableItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200
                  ${isActive 
                    ? 'bg-white text-blue-600 shadow-lg transform scale-105' 
                    : 'text-blue-100 hover:bg-white/10 hover:text-white hover:transform hover:scale-105'
                  }
                `}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer del sidebar - FIJO */}
      <div className="p-3 border-t border-blue-200/30 flex-shrink-0">
        <Button
          onClick={handleLogout}
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-blue-100 hover:bg-red-500/20 hover:text-white text-xs"
        >
          <LogOut className="w-4 h-4" />
          Cerrar Sesión
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Sidebar para desktop - MEJORADO */}
      <div className="hidden lg:flex lg:w-60 lg:flex-col lg:fixed lg:inset-y-0 lg:z-50">
        <div className="flex flex-col h-full bg-gradient-to-b from-blue-600 via-blue-700 to-blue-800 shadow-xl">
          <SidebarContent />
        </div>
      </div>

      {/* Header móvil */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center overflow-hidden">
              <img 
                src="/assets/boxito-mascot.jpg" 
                alt="Boxito"
                className="w-full h-full object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.parentElement!.innerHTML = '<Package class="w-4 h-4 text-blue-600" />';
                }}
              />
            </div>
            <h1 className="text-lg font-bold text-white">Shope Envíos</h1>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              className="text-white hover:bg-white/10"
            >
              <Menu className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </div>

      {/* Overlay móvil */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-60 h-full bg-gradient-to-b from-blue-600 via-blue-700 to-blue-800 shadow-xl">
            {/* Botón cerrar */}
            <div className="flex justify-end p-3 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(false)}
                className="text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="flex flex-col h-full -mt-12">
              <SidebarContent />
            </div>
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <div className="lg:ml-60">
        <main className="p-4 lg:p-6">
          {/* Breadcrumb con mascota y notificaciones */}
          <div className="mb-6">
            <Card className="bg-white/70 backdrop-blur-sm border border-blue-200/50 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-orange-500 rounded-full flex items-center justify-center overflow-hidden">
                      <img 
                        src="/assets/boxito-mascot.jpg" 
                        alt="Boxito"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.parentElement!.innerHTML = '<Package class="w-4 h-4 text-white" />';
                        }}
                      />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-800">
                        {availableItems.find(item => item.path === location.pathname)?.label || 'Dashboard'}
                      </h2>
                      <p className="text-sm text-gray-600">
                        Boxito te da la bienvenida al sistema de Shope Envíos
                      </p>
                    </div>
                  </div>
                  
                  {/* Desktop notification bell */}
                  <div className="hidden lg:block">
                    <NotificationBell />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {children}
        </main>
      </div>
    </div>
  );
}
