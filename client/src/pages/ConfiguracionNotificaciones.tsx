import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { NotificationContext } from '@/App';
import { Settings, Mail, MessageSquare, Bell, AlertTriangle, Clock, CheckCircle } from 'lucide-react';

interface NotificationSettings {
  email_enabled: boolean;
  sms_enabled: boolean;
  factoring_email: string;
  factoring_phone: string;
  overdue_days_alert: number;
  due_soon_days_alert: number;
}

export default function ConfiguracionNotificaciones() {
  const { hasPermission } = useAuth();
  const { showNotification } = React.useContext(NotificationContext);
  const [loading, setLoading] = React.useState(false);
  const [testingAlerts, setTestingAlerts] = React.useState(false);
  
  const [settings, setSettings] = React.useState<NotificationSettings>({
    email_enabled: true,
    sms_enabled: false,
    factoring_email: 'facturacion@shopeenvios.com',
    factoring_phone: '+52XXXXXXXXXX',
    overdue_days_alert: 1,
    due_soon_days_alert: 3
  });

  // Get auth headers for API calls
  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  // Load current settings
  const loadSettings = async () => {
    try {
      setLoading(true);
      console.log('📦 Boxito: Loading notification settings...');
      
      const response = await fetch('/api/notification-automation/settings', {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        console.log('📦 Boxito: Notification settings loaded');
      } else {
        showNotification('Error al cargar configuración', 'error');
      }
    } catch (error) {
      console.error('📦 Boxito: Error loading settings:', error);
      showNotification('Error de conexión al cargar configuración', 'error');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (hasPermission('usuarios', 'read')) {
      loadSettings();
    }
  }, [hasPermission]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hasPermission('usuarios', 'update')) {
      showNotification('No tienes permisos para actualizar configuración', 'error');
      return;
    }
    
    try {
      setLoading(true);
      console.log('📦 Boxito: Saving notification settings...', settings);
      
      const response = await fetch('/api/notification-automation/settings', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(settings)
      });
      
      if (response.ok) {
        const result = await response.json();
        showNotification('📦 Configuración de notificaciones actualizada exitosamente', 'success');
        console.log('📦 Boxito: Settings updated:', result);
      } else {
        const errorData = await response.json();
        showNotification(errorData.error || 'Error al guardar configuración', 'error');
      }
    } catch (error) {
      console.error('📦 Boxito: Error saving settings:', error);
      showNotification('Error de conexión al guardar', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTestAlerts = async () => {
    if (!hasPermission('dashboard', 'read')) {
      showNotification('No tienes permisos para ejecutar pruebas', 'error');
      return;
    }
    
    try {
      setTestingAlerts(true);
      showNotification('📦 Boxito está revisando las facturas para generar alertas...', 'info');
      
      console.log('📦 Boxito: Running manual alert check...');
      
      const response = await fetch('/api/notification-automation/check-invoices', {
        method: 'POST',
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('📦 Boxito: Alert check result:', result);
        
        const { overdue, dueSoon, totalOverdueAmount, totalDueSoonAmount } = result.result;
        
        if (overdue === 0 && dueSoon === 0) {
          showNotification('📦 ¡Excelente! No hay facturas vencidas ni por vencer en los próximos días', 'success');
        } else {
          let message = '';
          if (overdue > 0) {
            message += `${overdue} facturas vencidas ($${totalOverdueAmount.toLocaleString('es-MX')})`;
          }
          if (dueSoon > 0) {
            if (message) message += ' y ';
            message += `${dueSoon} facturas por vencer ($${totalDueSoonAmount.toLocaleString('es-MX')})`;
          }
          showNotification(`📦 Alertas generadas: ${message}`, 'warning');
        }
      } else {
        const errorData = await response.json();
        showNotification(errorData.error || 'Error al ejecutar prueba de alertas', 'error');
      }
    } catch (error) {
      console.error('📦 Boxito: Error testing alerts:', error);
      showNotification('Error de conexión en la prueba', 'error');
    } finally {
      setTestingAlerts(false);
    }
  };

  if (!hasPermission('usuarios', 'read')) {
    return (
      <div className="p-6">
        <Card className="card-shope">
          <CardContent className="p-6 text-center">
            <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No tienes permisos para ver la configuración de notificaciones.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-purple-600 to-pink-700 text-white border-0 shadow-2xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">🔔 Sistema de Notificaciones</h1>
              <p className="text-purple-100">
                Configuración de alertas automáticas para facturas vencidas y por vencer
              </p>
            </div>
            
            <div className="flex gap-3">
              <Button 
                onClick={handleTestAlerts}
                disabled={testingAlerts}
                variant="secondary" 
                className="bg-white/20 hover:bg-white/30 text-white border-white/20"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                {testingAlerts ? 'Probando...' : 'Probar Alertas'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Email Configuration */}
        <Card className="card-shope">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-600" />
              Configuración de Email
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="email-enabled"
                checked={settings.email_enabled}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, email_enabled: checked }))}
              />
              <Label htmlFor="email-enabled">Habilitar notificaciones por email</Label>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="factoring_email">Email del equipo de facturación</Label>
                <Input
                  id="factoring_email"
                  type="email"
                  value={settings.factoring_email}
                  onChange={(e) => setSettings(prev => ({ ...prev, factoring_email: e.target.value }))}
                  placeholder="facturacion@shopeenvios.com"
                  disabled={!settings.email_enabled}
                  className="input-shope"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Email donde se enviarán las alertas de facturas vencidas y por vencer
                </p>
              </div>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-2">¿Qué incluyen los emails?</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Listado detallado de facturas vencidas o por vencer</li>
                <li>• Información del cliente y días de retraso/anticipación</li>
                <li>• Montos totales por cobrar</li>
                <li>• Recomendaciones de acciones a tomar</li>
                <li>• Formato profesional con tablas y colores</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* SMS Configuration */}
        <Card className="card-shope">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-green-600" />
              Configuración de SMS
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="sms-enabled"
                checked={settings.sms_enabled}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, sms_enabled: checked }))}
              />
              <Label htmlFor="sms-enabled">Habilitar notificaciones por SMS</Label>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="factoring_phone">Teléfono del equipo de facturación</Label>
                <Input
                  id="factoring_phone"
                  type="tel"
                  value={settings.factoring_phone}
                  onChange={(e) => setSettings(prev => ({ ...prev, factoring_phone: e.target.value }))}
                  placeholder="+52XXXXXXXXXX"
                  disabled={!settings.sms_enabled}
                  className="input-shope"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Número de teléfono donde se enviarán alertas críticas por SMS
                </p>
              </div>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <h4 className="font-semibold text-yellow-800 mb-2">📱 Configuración de SMS</h4>
              <p className="text-sm text-yellow-700 mb-2">
                Los SMS se envían solo para alertas críticas de facturas vencidas
              </p>
              <p className="text-xs text-yellow-600">
                <strong>Nota:</strong> Se requiere configurar un servicio de SMS (Twilio, AWS SNS, etc.) para el funcionamiento completo
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Alert Timing Configuration */}
        <Card className="card-shope">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-600" />
              Configuración de Tiempos de Alerta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="due_soon_days_alert">Días antes del vencimiento para alertar</Label>
                <Input
                  id="due_soon_days_alert"
                  type="number"
                  min="1"
                  max="30"
                  value={settings.due_soon_days_alert}
                  onChange={(e) => setSettings(prev => ({ ...prev, due_soon_days_alert: Number(e.target.value) }))}
                  className="input-shope"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Alertar cuando una factura vence en X días
                </p>
              </div>
              
              <div>
                <Label htmlFor="overdue_days_alert">Días después del vencimiento para alertar</Label>
                <Input
                  id="overdue_days_alert"
                  type="number"
                  min="0"
                  max="30"
                  value={settings.overdue_days_alert}
                  onChange={(e) => setSettings(prev => ({ ...prev, overdue_days_alert: Number(e.target.value) }))}
                  className="input-shope"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Alertar cuando una factura lleva X días vencida
                </p>
              </div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-800 mb-2">⏰ Programación Automática</h4>
              <div className="text-sm text-green-700 space-y-1">
                <p>• <strong>Frecuencia:</strong> Cada 2 horas durante horario laboral</p>
                <p>• <strong>Horario:</strong> Lunes a Viernes, 8:00 AM a 8:00 PM</p>
                <p>• <strong>Tipos de alerta:</strong> Facturas vencidas y por vencer</p>
                <p>• <strong>Notificaciones:</strong> Sistema + Email + SMS (si están habilitados)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Status */}
        <Card className="bg-gray-50 border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-gray-600" />
              Estado Actual del Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                <div className={`w-3 h-3 rounded-full ${settings.email_enabled ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <div>
                  <p className="font-medium">Email</p>
                  <p className="text-sm text-gray-600">{settings.email_enabled ? 'Habilitado' : 'Deshabilitado'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                <div className={`w-3 h-3 rounded-full ${settings.sms_enabled ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <div>
                  <p className="font-medium">SMS</p>
                  <p className="text-sm text-gray-600">{settings.sms_enabled ? 'Habilitado' : 'Deshabilitado'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <div>
                  <p className="font-medium">Programación</p>
                  <p className="text-sm text-gray-600">Cada 2 horas</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button 
            type="submit" 
            disabled={loading || !hasPermission('usuarios', 'update')} 
            className="btn-shope-primary"
          >
            {loading ? 'Guardando...' : 'Guardar Configuración'}
          </Button>
          
          <Button 
            type="button"
            variant="outline" 
            onClick={() => loadSettings()}
            disabled={loading}
          >
            Recargar
          </Button>
        </div>
      </form>
    </div>
  );
}
