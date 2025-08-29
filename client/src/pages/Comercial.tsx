import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { BulkUploadPreview } from '@/components/BulkUploadPreview';
import { useAuth } from '@/context/AuthContext';
import { NotificationContext } from '@/App';
import { FileUpload } from '@/components/ui/file-upload';
import { 
  Plus, Upload, Download, TrendingUp, Users, Target, 
  DollarSign, Calendar, Filter, Star, Trophy, Gift, 
  CheckCircle, AlertCircle, Clock, ArrowRight, ArrowUp,
  User, Building, Phone, Mail, FileText, Award, Briefcase,
  BarChart3, PieChart, Activity, Zap, Rocket, Crown
} from 'lucide-react';
import * as XLSX from 'xlsx';

// Mensajes motivacionales de Boxito para Comercial
const MENSAJES_BOXITO_COMERCIAL = {
  prospecto: [
    "¡Excelente! Nuevo prospecto en el embudo de ventas ✨",
    "¡Perfecto! Oportunidad de negocio registrada 🎯",
    "¡Increíble! Tu pipeline comercial crece 💼",
    "¡Genial! Otro lead para convertir en cliente 🚀",
    "¡Boxito celebra tu gestión comercial! 🎉"
  ],
  conversion: [
    "¡WOW! Prospecto convertido a cliente exitosamente 🏆",
    "¡INCREÍBLE! Cierre de venta confirmado 💰",
    "¡FANTÁSTICO! Meta de conversión alcanzada ⭐",
    "¡ÉXITO TOTAL! Otro cliente satisfecho 👑",
    "¡BOXITO APLAUDE! Tu talento comercial es excepcional 🌟"
  ],
  consejos: [
    "💡 Tip: El seguimiento constante aumenta las conversiones",
    "⭐ Consejo: Escucha activa = propuestas ganadoras",
    "🎯 Meta: Cada 'NO' te acerca más al 'SÍ'",
    "📈 Recuerda: La persistencia es la clave del éxito",
    "💪 ¡Cada contacto es una oportunidad de oro!"
  ],
  motivacion: [
    "¡Tu talento comercial impulsa el crecimiento! 🚀",
    "¡Boxito reconoce tu excelencia en ventas! 🏆",
    "¡Eres el motor del éxito empresarial! ⚡",
    "¡Tu trabajo genera oportunidades infinitas! 🌟",
    "¡Cada venta tuya construye el futuro! 🎯"
  ]
};

interface Prospect {
  id: string;
  nombre: string;
  apellido: string;
  monto: number;
  compania: string | null;
  responsable: string | null;
  estado: 'nuevo' | 'info' | 'asignado' | 'progreso' | 'final';
  tipo_persona: 'fisica' | 'moral' | null;
  rfc: string | null;
  razon_social: string | null;
  giro: string | null;
  valor_lead: number | null;
  tipo_prospeccion: string | null;
  ejecutivo: string | null;
  comentarios: string | null;
  fecha_registro: string;
  created_at: string;
  updated_at: string;
}

interface ValidationResult {
  totalLineas: number;
  lineasCorrectas: number;
  lineasConErrores: number;
  lineasConAdvertencias: number;
  errores: Array<{
    fila: number;
    campo: string;
    valor: any;
    error: string;
    severidad: 'error' | 'warning';
  }>;
  datosCorrectos: any[];
  datosConErrores: any[];
}

// Configuración del embudo de ventas profesional
const FASES_EMBUDO = {
  nuevo: {
    label: 'Leads Nuevos',
    icon: Star,
    color: 'bg-blue-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700',
    description: 'Prospectos recién identificados',
    conversion: 25
  },
  info: {
    label: 'Calificación',
    icon: Target,
    color: 'bg-yellow-500',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    textColor: 'text-yellow-700',
    description: 'Evaluando necesidades y presupuesto',
    conversion: 40
  },
  asignado: {
    label: 'Asignados',
    icon: User,
    color: 'bg-orange-500',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-700',
    description: 'Prospecto asignado a ejecutivo',
    conversion: 60
  },
  progreso: {
    label: 'En Negociación',
    icon: TrendingUp,
    color: 'bg-purple-500',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-700',
    description: 'Propuesta enviada y en revisión',
    conversion: 75
  },
  final: {
    label: 'Cierre',
    icon: Trophy,
    color: 'bg-green-500',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-700',
    description: 'Listos para convertir en cliente',
    conversion: 90
  }
};

const EJECUTIVOS_VENTAS = [
  'Carlos Rodríguez',
  'María González',
  'Luis Fernández',
  'Ana Martínez',
  'José López',
  'Carmen Ruiz',
  'Fernando Torres',
  'Laura Sánchez'
];

export default function Comercial() {
  const { hasPermission } = useAuth();
  const { showNotification } = React.useContext(NotificationContext);
  const [prospectos, setProspectos] = React.useState<Prospect[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [showDialog, setShowDialog] = React.useState(false);
  const [showPreview, setShowPreview] = React.useState(false);
  const [validationResult, setValidationResult] = React.useState<ValidationResult | null>(null);
  const [editingProspecto, setEditingProspecto] = React.useState<Prospect | null>(null);
  const [mostrarMensajeMotivacional, setMostrarMensajeMotivacional] = React.useState(false);
  const [initialLoad, setInitialLoad] = React.useState(true);
  const [vistaActual, setVistaActual] = React.useState<'embudo' | 'lista'>('embudo');

  const [filtros, setFiltros] = React.useState({
    estado: 'all',
    ejecutivo: 'all',
    tipo_persona: 'all'
  });

  const [formData, setFormData] = React.useState({
    nombre: '',
    apellido: '',
    monto: 0,
    compania: '',
    responsable: '',
    estado: 'nuevo' as 'nuevo' | 'info' | 'asignado' | 'progreso' | 'final',
    tipo_persona: 'moral' as 'fisica' | 'moral',
    rfc: '',
    razon_social: '',
    giro: '',
    valor_lead: 0,
    tipo_prospeccion: '',
    ejecutivo: '',
    comentarios: ''
  });

  const obtenerMensajeAleatorio = (categoria: keyof typeof MENSAJES_BOXITO_COMERCIAL): string => {
    const mensajes = MENSAJES_BOXITO_COMERCIAL[categoria];
    return mensajes[Math.floor(Math.random() * mensajes.length)];
  };

  const mostrarNotificacionBoxito = React.useCallback((mensaje: string, tipo: 'success' | 'info' | 'warning' = 'success') => {
    if (showNotification) {
      showNotification(mensaje, tipo);
    }
  }, [showNotification]);

  const activarMensajeMotivacional = React.useCallback(() => {
    setMostrarMensajeMotivacional(true);
    const consejo = obtenerMensajeAleatorio('consejos');
    setTimeout(() => {
      mostrarNotificacionBoxito(consejo, 'info');
    }, 2000);
    
    setTimeout(() => {
      setMostrarMensajeMotivacional(false);
    }, 5000);
  }, [mostrarNotificacionBoxito]);

  // Get auth headers for API calls
  const getAuthHeaders = React.useCallback(() => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }, []);

  // Load prospects
  const loadProspectos = React.useCallback(async () => {
    if (!hasPermission('comercial', 'read')) {
      setLoading(false);
      setInitialLoad(false);
      return;
    }
    
    try {
      setLoading(true);
      console.log('📦 Boxito: Loading prospects...');
      
      const response = await fetch('/api/prospects', {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Boxito: Raw prospects data:', data);
        setProspectos(data);
        console.log(`📦 Boxito: Loaded ${data.length} prospects`);
        
        if (initialLoad && data.length > 0) {
          const totalValue = data.reduce((sum: number, p: Prospect) => sum + p.monto, 0);
          setTimeout(() => {
            mostrarNotificacionBoxito(`¡Increíble! Pipeline de ${data.length} prospectos por $${totalValue.toLocaleString('es-MX')}. ¡Excelente gestión comercial! 💼`, 'success');
          }, 1000);
        }
      } else {
        console.error('📦 Boxito: Error response loading prospects:', response.status);
        showNotification('Error al cargar prospectos', 'error');
      }
    } catch (error) {
      console.error('📦 Boxito: Error loading prospects:', error);
      showNotification('Error de conexión al cargar prospectos', 'error');
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, [hasPermission, getAuthHeaders, showNotification, mostrarNotificacionBoxito, initialLoad]);

  React.useEffect(() => {
    loadProspectos();
  }, [loadProspectos]);

  const validateFormData = () => {
    if (!formData.nombre.trim()) {
      mostrarNotificacionBoxito('El nombre es obligatorio 👤', 'warning');
      return false;
    }
    
    if (!formData.apellido.trim()) {
      mostrarNotificacionBoxito('El apellido es obligatorio 👤', 'warning');
      return false;
    }
    
    if (formData.monto <= 0) {
      mostrarNotificacionBoxito('El monto debe ser mayor a cero 💰', 'warning');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hasPermission('comercial', 'create') && !hasPermission('comercial', 'update')) {
      mostrarNotificacionBoxito('No tienes permisos para esta acción. ¡Contacta a tu administrador! 🔐', 'warning');
      return;
    }
    
    if (!validateFormData()) {
      return;
    }
    
    try {
      setLoading(true);
      
      const procesandoMsg = obtenerMensajeAleatorio('motivacion');
      mostrarNotificacionBoxito(`${procesandoMsg} Procesando prospecto...`, 'info');
      
      const prospectData = {
        nombre: formData.nombre.trim(),
        apellido: formData.apellido.trim(),
        monto: formData.monto,
        compania: formData.compania.trim() || null,
        responsable: formData.responsable.trim() || null,
        estado: formData.estado,
        tipoPersona: formData.tipo_persona,
        rfc: formData.rfc.trim() || null,
        razonSocial: formData.razon_social.trim() || null,
        giro: formData.giro.trim() || null,
        valorLead: formData.valor_lead || null,
        tipoProspeccion: formData.tipo_prospeccion.trim() || null,
        ejecutivo: formData.ejecutivo.trim() || null,
        comentarios: formData.comentarios.trim() || null
      };
      
      const url = editingProspecto 
        ? `/api/prospects/${editingProspecto.id}`
        : '/api/prospects';
      const method = editingProspecto ? 'PUT' : 'POST';
      
      console.log('📦 Boxito: Submitting prospect:', method, prospectData);
      
      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(prospectData)
      });
      
      if (response.ok) {
        const result = await response.json();
        const mensajeExito = obtenerMensajeAleatorio('prospecto');
        const accion = editingProspecto ? 'actualizado' : 'registrado';
        mostrarNotificacionBoxito(
          `${mensajeExito} Prospecto ${formData.nombre} ${formData.apellido} ${accion} por $${formData.monto.toLocaleString('es-MX')} 💰`,
          'success'
        );
        
        if (formData.estado === 'final') {
          setTimeout(() => {
            const mensajeConversion = obtenerMensajeAleatorio('conversion');
            mostrarNotificacionBoxito(`${mensajeConversion} ¡Prospecto listo para cierre!`, 'success');
          }, 2500);
        }
        
        setTimeout(() => {
          activarMensajeMotivacional();
        }, 5000);
        
        setShowDialog(false);
        setEditingProspecto(null);
        resetForm();
        await loadProspectos();
      } else {
        const errorData = await response.json();
        console.error('📦 Boxito: Error response:', errorData);
        mostrarNotificacionBoxito(`Algo no salió como esperaba: ${errorData.error || 'Error al procesar prospecto'} 😅`, 'error');
      }
    } catch (error) {
      console.error('📦 Boxito: Error submitting prospect:', error);
      mostrarNotificacionBoxito('Error de conexión al procesar prospecto. ¡Inténtalo de nuevo! 🔄', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      apellido: '',
      monto: 0,
      compania: '',
      responsable: '',
      estado: 'nuevo',
      tipo_persona: 'moral',
      rfc: '',
      razon_social: '',
      giro: '',
      valor_lead: 0,
      tipo_prospeccion: '',
      ejecutivo: '',
      comentarios: ''
    });
  };

  const handleEdit = (prospecto: Prospect) => {
    setEditingProspecto(prospecto);
    setFormData({
      nombre: prospecto.nombre,
      apellido: prospecto.apellido,
      monto: prospecto.monto,
      compania: prospecto.compania || '',
      responsable: prospecto.responsable || '',
      estado: prospecto.estado,
      tipo_persona: prospecto.tipo_persona || 'moral',
      rfc: prospecto.rfc || '',
      razon_social: prospecto.razon_social || '',
      giro: prospecto.giro || '',
      valor_lead: prospecto.valor_lead || 0,
      tipo_prospeccion: prospecto.tipo_prospeccion || '',
      ejecutivo: prospecto.ejecutivo || '',
      comentarios: prospecto.comentarios || ''
    });
    setShowDialog(true);
    mostrarNotificacionBoxito('Editando prospecto. ¡Optimiza la oportunidad! ✏️', 'info');
  };

  const handleDelete = async (prospecto: Prospect) => {
    if (!hasPermission('comercial', 'delete')) {
      mostrarNotificacionBoxito('No tienes permisos para eliminar prospectos. ¡Contacta a tu administrador! 🔐', 'warning');
      return;
    }
    
    if (!confirm(`📦 Boxito pregunta: ¿Confirmas que quieres eliminar el prospecto ${prospecto.nombre} ${prospecto.apellido}?`)) {
      return;
    }
    
    try {
      setLoading(true);
      
      const response = await fetch(`/api/prospects/${prospecto.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        mostrarNotificacionBoxito('¡Prospecto eliminado exitosamente! Gestión comercial optimizada 🗑️✨', 'success');
        await loadProspectos();
      } else {
        const errorData = await response.json();
        mostrarNotificacionBoxito(`Error al eliminar: ${errorData.error || 'Error desconocido'} 😅`, 'error');
      }
    } catch (error) {
      console.error('📦 Boxito: Error deleting prospect:', error);
      mostrarNotificacionBoxito('Error de conexión al eliminar prospecto. ¡Inténtalo de nuevo! 🔄', 'error');
    } finally {
      setLoading(false);
    }
  };

  const prospectosFiltrados = React.useMemo(() => {
    return prospectos.filter(p => {
      const cumpleEstado = filtros.estado === 'all' || p.estado === filtros.estado;
      const cumpleEjecutivo = filtros.ejecutivo === 'all' || p.ejecutivo === filtros.ejecutivo;
      const cumpleTipo = filtros.tipo_persona === 'all' || p.tipo_persona === filtros.tipo_persona;
      
      return cumpleEstado && cumpleEjecutivo && cumpleTipo;
    });
  }, [prospectos, filtros]);

  const estadisticasEmbudo = React.useMemo(() => {
    const stats = Object.keys(FASES_EMBUDO).reduce((acc, fase) => {
      const prospectosFase = prospectosFiltrados.filter(p => p.estado === fase);
      const valorTotal = prospectosFase.reduce((sum, p) => sum + p.monto, 0);
      
      acc[fase] = {
        cantidad: prospectosFase.length,
        valor: valorTotal,
        prospectos: prospectosFase
      };
      return acc;
    }, {} as Record<string, any>);

    const totalProspectos = prospectosFiltrados.length;
    const valorTotalPipeline = prospectosFiltrados.reduce((sum, p) => sum + p.monto, 0);
    const tasaConversionPromedio = totalProspectos > 0 
      ? (stats.final?.cantidad || 0) / totalProspectos * 100 
      : 0;

    return {
      ...stats,
      totalProspectos,
      valorTotalPipeline,
      tasaConversionPromedio
    };
  }, [prospectosFiltrados]);

  const exportarProspectos = () => {
    if (prospectosFiltrados.length === 0) {
      mostrarNotificacionBoxito('No hay prospectos para exportar en los filtros actuales 📊', 'warning');
      return;
    }

    const datosExport = prospectosFiltrados.map((prospecto, index) => ({
      '#': index + 1,
      'Nombre Completo': `${prospecto.nombre} ${prospecto.apellido}`,
      'Empresa': prospecto.compania || 'N/A',
      'Monto': prospecto.monto,
      'Estado': prospecto.estado,
      'Ejecutivo': prospecto.ejecutivo || 'Sin asignar',
      'Tipo Persona': prospecto.tipo_persona || 'No especificado',
      'RFC': prospecto.rfc || 'N/A',
      'Giro': prospecto.giro || 'N/A',
      'Valor Lead': prospecto.valor_lead || 0,
      'Fecha Registro': prospecto.fecha_registro
    }));

    const ws = XLSX.utils.json_to_sheet(datosExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pipeline_Comercial');
    XLSX.writeFile(wb, `📦_Boxito_Pipeline_Comercial_${new Date().toISOString().split('T')[0]}.xlsx`);
    mostrarNotificacionBoxito('¡Pipeline exportado exitosamente! Tu gestión comercial es excepcional 📊✨', 'success');
  };

  if (!hasPermission('comercial', 'read')) {
    return (
      <div className="p-6">
        <Card className="card-shope">
          <CardContent className="p-6 text-center">
            <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No tienes permisos para ver la sección comercial.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Comercial Profesional */}
      <Card className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-700 text-white border-0 shadow-2xl overflow-hidden relative">
        <CardContent className="p-6 relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
                <Rocket className="w-7 h-7" />
                Pipeline Comercial Profesional
              </h1>
              <p className="text-indigo-100 mb-3">
                📦 Boxito impulsa tu éxito comercial - {estadisticasEmbudo.totalProspectos} oportunidades activas
              </p>
              <div className="flex items-center gap-4 text-sm">
                <div className="bg-white/20 rounded-lg px-3 py-1">
                  <span className="font-medium">Pipeline: ${estadisticasEmbudo.valorTotalPipeline?.toLocaleString('es-MX')}</span>
                </div>
                <div className="bg-white/20 rounded-lg px-3 py-1">
                  <span className="font-medium">Conversión: {estadisticasEmbudo.tasaConversionPromedio?.toFixed(1)}%</span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button 
                onClick={() => setVistaActual(vistaActual === 'embudo' ? 'lista' : 'embudo')}
                variant="secondary" 
                className="bg-white/20 hover:bg-white/30 text-white border-white/20"
              >
                {vistaActual === 'embudo' ? <BarChart3 className="w-4 h-4 mr-2" /> : <Target className="w-4 h-4 mr-2" />}
                {vistaActual === 'embudo' ? 'Ver Lista' : 'Ver Embudo'}
              </Button>
              
              <Button 
                onClick={exportarProspectos} 
                variant="secondary" 
                className="bg-white/20 hover:bg-white/30 text-white border-white/20"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar Pipeline
              </Button>
              
              {hasPermission('comercial', 'create') && (
                <Dialog open={showDialog} onOpenChange={(open) => {
                  setShowDialog(open);
                  if (!open) {
                    setEditingProspecto(null);
                    resetForm();
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button className="bg-white text-indigo-600 hover:bg-white/90 font-semibold" onClick={resetForm}>
                      <Plus className="w-4 h-4 mr-2" />
                      Nuevo Prospecto
                    </Button>
                  </DialogTrigger>
                </Dialog>
              )}
            </div>
          </div>
        </CardContent>
        
        <div className="absolute top-4 right-4 opacity-10">
          <Crown className="w-20 h-20 text-white" />
        </div>
      </Card>

      {/* Mensaje Motivacional Emergente */}
      {mostrarMensajeMotivacional && (
        <Card className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-white border-0 shadow-xl animate-pulse">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                <Rocket className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h3 className="font-bold">¡Boxito reconoce tu talento comercial! 🏆</h3>
                <p className="text-orange-100 text-sm">Tu gestión del pipeline genera resultados excepcionales</p>
              </div>
              <Award className="w-6 h-6 text-yellow-300 animate-bounce" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros Comerciales */}
      <Card className="card-shope">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-indigo-600" />
            Filtros del Pipeline Comercial
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Estado en Pipeline</Label>
              <Select value={filtros.estado} onValueChange={(value) => setFiltros(prev => ({ ...prev, estado: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">🔍 Todos los estados</SelectItem>
                  <SelectItem value="nuevo">⭐ Leads Nuevos</SelectItem>
                  <SelectItem value="info">🎯 Calificación</SelectItem>
                  <SelectItem value="asignado">👤 Asignados</SelectItem>
                  <SelectItem value="progreso">📈 En Negociación</SelectItem>
                  <SelectItem value="final">🏆 Cierre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Ejecutivo de Ventas</Label>
              <Select value={filtros.ejecutivo} onValueChange={(value) => setFiltros(prev => ({ ...prev, ejecutivo: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">👥 Todos los ejecutivos</SelectItem>
                  {EJECUTIVOS_VENTAS.map((ejecutivo) => (
                    <SelectItem key={ejecutivo} value={ejecutivo}>👤 {ejecutivo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Tipo de Cliente</Label>
              <Select value={filtros.tipo_persona} onValueChange={(value) => setFiltros(prev => ({ ...prev, tipo_persona: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">🏢 Todos los tipos</SelectItem>
                  <SelectItem value="fisica">👤 Persona Física</SelectItem>
                  <SelectItem value="moral">🏢 Persona Moral</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vista Embudo Profesional */}
      {vistaActual === 'embudo' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {Object.entries(FASES_EMBUDO).map(([fase, config]) => {
            const data = estadisticasEmbudo[fase] || { cantidad: 0, valor: 0, prospectos: [] };
            const IconComponent = config.icon;
            
            return (
              <Card key={fase} className={`${config.bgColor} ${config.borderColor} border-2 hover:shadow-lg transition-all duration-200 transform hover:scale-105`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className={`w-10 h-10 ${config.color} rounded-full flex items-center justify-center`}>
                      <IconComponent className="w-5 h-5 text-white" />
                    </div>
                    <Badge variant="secondary" className={`${config.textColor} font-bold`}>
                      {config.conversion}% Conv.
                    </Badge>
                  </div>
                  <CardTitle className={`text-sm ${config.textColor} font-bold`}>
                    {config.label}
                  </CardTitle>
                  <p className="text-xs text-gray-600">{config.description}</p>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${config.textColor}`}>
                        {data.cantidad}
                      </div>
                      <div className="text-xs text-gray-600">
                        ${data.valor?.toLocaleString('es-MX')}
                      </div>
                    </div>
                    
                    <Progress 
                      value={estadisticasEmbudo.totalProspectos > 0 ? (data.cantidad / estadisticasEmbudo.totalProspectos) * 100 : 0} 
                      className="h-2"
                    />
                    
                    {data.prospectos?.length > 0 && (
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {data.prospectos.slice(0, 3).map((prospecto: Prospect) => (
                          <div key={prospecto.id} className="bg-white/50 rounded p-2 text-xs">
                            <div className="font-semibold text-gray-800">
                              {prospecto.nombre} {prospecto.apellido}
                            </div>
                            <div className="text-gray-600">
                              ${prospecto.monto.toLocaleString('es-MX')}
                            </div>
                            <div className="text-gray-500">
                              {prospecto.ejecutivo || 'Sin asignar'}
                            </div>
                          </div>
                        ))}
                        {data.prospectos.length > 3 && (
                          <div className="text-xs text-center text-gray-500">
                            +{data.prospectos.length - 3} más
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Vista Lista */}
      {vistaActual === 'lista' && (
        <Card className="table-shope">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Pipeline Comercial Detallado ({prospectosFiltrados.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <span className="text-white font-bold">🚀</span>
                </div>
                <p className="text-gray-600">📦 Boxito está cargando el pipeline...</p>
              </div>
            ) : prospectosFiltrados.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-bold text-indigo-700 mb-2">
                  🎯 No hay prospectos que coincidan con los filtros
                </h3>
                <p className="text-indigo-600">
                  Boxito sugiere: Ajusta los filtros o registra un nuevo prospecto
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white">
                      <th className="text-left p-3 font-semibold">Prospecto</th>
                      <th className="text-left p-3 font-semibold">Empresa</th>
                      <th className="text-left p-3 font-semibold">Monto</th>
                      <th className="text-left p-3 font-semibold">Estado</th>
                      <th className="text-left p-3 font-semibold">Ejecutivo</th>
                      <th className="text-left p-3 font-semibold">Fecha</th>
                      <th className="text-left p-3 font-semibold">🚀 Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prospectosFiltrados.map((prospecto) => {
                      const faseConfig = FASES_EMBUDO[prospecto.estado];
                      return (
                        <tr key={prospecto.id} className="hover:bg-indigo-50 transition-colors border-b">
                          <td className="p-3">
                            <div>
                              <div className="font-semibold text-gray-800">
                                {prospecto.nombre} {prospecto.apellido}
                              </div>
                              <div className="text-sm text-gray-600">
                                {prospecto.tipo_persona === 'moral' ? '🏢' : '👤'} {prospecto.tipo_persona === 'moral' ? 'Empresa' : 'Persona'}
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="text-gray-800">{prospecto.compania || '-'}</div>
                            <div className="text-sm text-gray-600">{prospecto.giro || 'Sin especificar'}</div>
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-green-600">
                              ${prospecto.monto.toLocaleString('es-MX')}
                            </div>
                            {prospecto.valor_lead && (
                              <div className="text-sm text-gray-600">
                                Lead: ${prospecto.valor_lead.toLocaleString('es-MX')}
                              </div>
                            )}
                          </td>
                          <td className="p-3">
                            <Badge 
                              className={`${faseConfig.color} text-white font-semibold`}
                            >
                              {faseConfig.label}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <div className="text-gray-800">{prospecto.ejecutivo || 'Sin asignar'}</div>
                          </td>
                          <td className="p-3">
                            <div className="text-sm text-gray-600">
                              {prospecto.fecha_registro}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex gap-1">
                              {hasPermission('comercial', 'update') && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(prospecto)}
                                  className="hover:bg-indigo-100 text-indigo-600 hover:scale-105 transition-transform"
                                >
                                  ✏️ Editar
                                </Button>
                              )}
                              {hasPermission('comercial', 'delete') && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(prospecto)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-100 hover:scale-105 transition-transform"
                                >
                                  🗑️ Eliminar
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Estadísticas del Pipeline */}
      <Card className="card-shope bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            📈 Análisis del Pipeline Comercial
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-4 rounded-lg border border-indigo-200 text-center">
              <div className="text-indigo-600 text-sm font-medium mb-1">Total Oportunidades</div>
              <div className="text-2xl font-bold text-indigo-700">
                {estadisticasEmbudo.totalProspectos}
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-green-200 text-center">
              <div className="text-green-600 text-sm font-medium mb-1">Valor Pipeline</div>
              <div className="text-2xl font-bold text-green-700">
                ${estadisticasEmbudo.valorTotalPipeline?.toLocaleString('es-MX')}
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-purple-200 text-center">
              <div className="text-purple-600 text-sm font-medium mb-1">Tasa Conversión</div>
              <div className="text-2xl font-bold text-purple-700">
                {estadisticasEmbudo.tasaConversionPromedio?.toFixed(1)}%
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-orange-200 text-center">
              <div className="text-orange-600 text-sm font-medium mb-1">Próximos Cierres</div>
              <div className="text-2xl font-bold text-orange-700">
                {estadisticasEmbudo.final?.cantidad || 0}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog for New/Edit Prospect */}
      <Dialog open={showDialog} onOpenChange={(open) => {
        setShowDialog(open);
        if (!open) {
          setEditingProspecto(null);
          resetForm();
        }
      }}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rocket className="w-5 h-5 text-indigo-600" />
              {editingProspecto ? 'Optimizar Prospecto' : 'Nuevo Prospecto Comercial'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card className="bg-indigo-50 border-indigo-200">
              <CardHeader>
                <CardTitle className="text-indigo-700 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Información Personal
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nombre">Nombre *</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                    required
                    placeholder="Nombre del prospecto"
                    className="input-shope"
                  />
                </div>
                
                <div>
                  <Label htmlFor="apellido">Apellido *</Label>
                  <Input
                    id="apellido"
                    value={formData.apellido}
                    onChange={(e) => setFormData(prev => ({ ...prev, apellido: e.target.value }))}
                    required
                    placeholder="Apellido del prospecto"
                    className="input-shope"
                  />
                </div>
                
                <div>
                  <Label htmlFor="tipo_persona">Tipo de Cliente</Label>
                  <Select value={formData.tipo_persona} onValueChange={(value: 'fisica' | 'moral') => setFormData(prev => ({ ...prev, tipo_persona: value }))}>
                    <SelectTrigger className="input-shope">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fisica">👤 Persona Física</SelectItem>
                      <SelectItem value="moral">🏢 Persona Moral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="rfc">RFC</Label>
                  <Input
                    id="rfc"
                    value={formData.rfc}
                    onChange={(e) => setFormData(prev => ({ ...prev, rfc: e.target.value.toUpperCase() }))}
                    placeholder="RFC del cliente"
                    className="input-shope"
                    maxLength={13}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-200">
              <CardHeader>
                <CardTitle className="text-green-700 flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  Información Empresarial
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="compania">Empresa</Label>
                  <Input
                    id="compania"
                    value={formData.compania}
                    onChange={(e) => setFormData(prev => ({ ...prev, compania: e.target.value }))}
                    placeholder="Nombre de la empresa"
                    className="input-shope"
                  />
                </div>
                
                <div>
                  <Label htmlFor="responsable">Responsable</Label>
                  <Input
                    id="responsable"
                    value={formData.responsable}
                    onChange={(e) => setFormData(prev => ({ ...prev, responsable: e.target.value }))}
                    placeholder="Persona responsable"
                    className="input-shope"
                  />
                </div>
                
                <div>
                  <Label htmlFor="razon_social">Razón Social</Label>
                  <Input
                    id="razon_social"
                    value={formData.razon_social}
                    onChange={(e) => setFormData(prev => ({ ...prev, razon_social: e.target.value }))}
                    placeholder="Razón social"
                    className="input-shope"
                  />
                </div>
                
                <div>
                  <Label htmlFor="giro">Giro Empresarial</Label>
                  <Input
                    id="giro"
                    value={formData.giro}
                    onChange={(e) => setFormData(prev => ({ ...prev, giro: e.target.value }))}
                    placeholder="Giro o sector"
                    className="input-shope"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 border-purple-200">
              <CardHeader>
                <CardTitle className="text-purple-700 flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Información Comercial
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="monto">Monto del Negocio *</Label>
                  <Input
                    id="monto"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.monto}
                    onChange={(e) => setFormData(prev => ({ ...prev, monto: Number(e.target.value) }))}
                    required
                    placeholder="0.00"
                    className="input-shope"
                  />
                </div>
                
                <div>
                  <Label htmlFor="valor_lead">Valor del Lead</Label>
                  <Input
                    id="valor_lead"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.valor_lead}
                    onChange={(e) => setFormData(prev => ({ ...prev, valor_lead: Number(e.target.value) }))}
                    placeholder="0.00"
                    className="input-shope"
                  />
                </div>
                
                <div>
                  <Label htmlFor="estado">Estado en Pipeline</Label>
                  <Select value={formData.estado} onValueChange={(value: 'nuevo' | 'info' | 'asignado' | 'progreso' | 'final') => setFormData(prev => ({ ...prev, estado: value }))}>
                    <SelectTrigger className="input-shope">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nuevo">⭐ Leads Nuevos</SelectItem>
                      <SelectItem value="info">🎯 Calificación</SelectItem>
                      <SelectItem value="asignado">👤 Asignados</SelectItem>
                      <SelectItem value="progreso">📈 En Negociación</SelectItem>
                      <SelectItem value="final">🏆 Cierre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="ejecutivo">Ejecutivo de Ventas</Label>
                  <Select value={formData.ejecutivo} onValueChange={(value) => setFormData(prev => ({ ...prev, ejecutivo: value }))}>
                    <SelectTrigger className="input-shope">
                      <SelectValue placeholder="Selecciona ejecutivo" />
                    </SelectTrigger>
                    <SelectContent>
                      {EJECUTIVOS_VENTAS.map((ejecutivo) => (
                        <SelectItem key={ejecutivo} value={ejecutivo}>👤 {ejecutivo}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="tipo_prospeccion">Tipo de Prospección</Label>
                  <Select value={formData.tipo_prospeccion} onValueChange={(value) => setFormData(prev => ({ ...prev, tipo_prospeccion: value }))}>
                    <SelectTrigger className="input-shope">
                      <SelectValue placeholder="Selecciona tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="llamada_fria">📞 Llamada Fría</SelectItem>
                      <SelectItem value="referido">🤝 Referido</SelectItem>
                      <SelectItem value="web">🌐 Página Web</SelectItem>
                      <SelectItem value="redes_sociales">📱 Redes Sociales</SelectItem>
                      <SelectItem value="evento">🎪 Evento</SelectItem>
                      <SelectItem value="email">📧 Email Marketing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="col-span-2">
                  <Label htmlFor="comentarios">Comentarios y Observaciones</Label>
                  <Textarea
                    id="comentarios"
                    value={formData.comentarios}
                    onChange={(e) => setFormData(prev => ({ ...prev, comentarios: e.target.value }))}
                    placeholder="Notas importantes sobre este prospecto..."
                    className="input-shope"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
            
            <div className="flex gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowDialog(false);
                  setEditingProspecto(null);
                  resetForm();
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="btn-shope-primary flex-1">
                {loading ? '🚀 Procesando...' : (editingProspecto ? 'Actualizar' : 'Registrar')} Prospecto
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
