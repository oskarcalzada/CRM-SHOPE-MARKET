import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/context/AuthContext';
import { NotificationContext } from '@/App';
import { FileUpload } from '@/components/ui/file-upload';
import { Plus, Upload, Download, Package, XCircle, Clock, CheckCircle, AlertTriangle, FileText, Star, Trophy, Target, Gift } from 'lucide-react';
import * as XLSX from 'xlsx';

// Mensajes motivacionales de Boxito para Cancelación de Guías
const MENSAJES_BOXITO_CANCELACIONES = {
  solicitud: [
    "¡Perfecto! Solicitud de cancelación registrada ✨",
    "¡Excelente! Todo salió genial en el registro 🎉",
    "¡Increíble! Tu gestión de cancelaciones es impecable 💯",
    "¡Genial! Otra solicitud más en proceso 🌟",
    "¡Boxito está orgulloso de tu organización! 🚀"
  ],
  procesada: [
    "¡INCREÍBLE! ¡Cancelación procesada exitosamente! 🎊",
    "¡VICTORIA! ¡Otra guía cancelada sin problemas! 🏆",
    "¡ÉXITO TOTAL! ¡Cliente satisfecho! ✨",
    "¡GENIAL! ¡Proceso completado! 🎯",
    "¡PERFECTO! ¡Gestión impecable! 💪"
  ],
  consejos: [
    "💡 Tip: Adjuntar PDF facilita el proceso de cancelación",
    "⭐ Consejo: Detalles claros en el motivo aceleran el trámite",
    "🎯 Meta: Documentar bien reduce tiempo de respuesta",
    "📅 Recuerda: Solicitudes tempranas tienen mejor probabilidad",
    "💪 ¡Cada cancelación bien gestionada mejora la satisfacción!"
  ],
  motivacion: [
    "¡Tu atención al cliente hace la diferencia! 🌟",
    "¡Boxito valora tu eficiencia en cancelaciones! 🎉",
    "¡Eres clave en la satisfacción del cliente! 💼",
    "¡Tu trabajo mantiene la calidad del servicio! ⚡",
    "¡Cada solicitud bien manejada suma puntos! 📈"
  ],
  estadoActualizado: [
    "¡Estado actualizado correctamente! Todo bajo control 🔄",
    "¡Cambio de estado exitoso! Seguimiento perfecto 📊",
    "¡Actualización completada! Gestión de primera 🌟",
    "¡Estado modificado! Control total del proceso ⚡",
    "¡Cambio registrado! Tu organización es excepcional 🎯"
  ]
};

interface GuideCancellation {
  id: string;
  numero_guia: string;
  paqueteria: string;
  cliente: string;
  motivo: string;
  fecha_solicitud: string;
  url_guia?: string;
  archivo_guia?: string;
  estatus: 'Pendiente' | 'En Proceso' | 'Cancelada' | 'Rechazada';
  comentarios?: string;
  fecha_respuesta?: string;
  responsable?: string;
  costo_cancelacion: number;
  reembolso: number;
  numero_referencia?: string;
  created_at: string;
  updated_at: string;
}

export default function CancelacionGuias() {
  const { hasPermission } = useAuth();
  const { showNotification } = React.useContext(NotificationContext);
  const [cancelaciones, setCancelaciones] = React.useState<GuideCancellation[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [showDialog, setShowDialog] = React.useState(false);
  const [showStatusDialog, setShowStatusDialog] = React.useState(false);
  const [editingCancellation, setEditingCancellation] = React.useState<GuideCancellation | null>(null);
  const [selectedForStatus, setSelectedForStatus] = React.useState<GuideCancellation | null>(null);
  const [mostrarMensajeMotivacional, setMostrarMensajeMotivacional] = React.useState(false);
  const [initialLoad, setInitialLoad] = React.useState(true);

  const [filtros, setFiltros] = React.useState({
    estatus: 'all',
    cliente: '',
    paqueteria: '',
    numero_guia: ''
  });

  const [formData, setFormData] = React.useState({
    numero_guia: '',
    paqueteria: '',
    cliente: '',
    motivo: '',
    fecha_solicitud: new Date().toISOString().split('T')[0],
    url_guia: '',
    archivo_guia: '',
    comentarios: ''
  });

  const [statusFormData, setStatusFormData] = React.useState({
    estatus: 'Pendiente' as GuideCancellation['estatus'],
    comentarios: '',
    responsable: '',
    costo_cancelacion: 0,
    reembolso: 0,
    numero_referencia: ''
  });

  const [guideFiles, setGuideFiles] = React.useState<File[]>([]);

  const obtenerMensajeAleatorio = (categoria: keyof typeof MENSAJES_BOXITO_CANCELACIONES): string => {
    const mensajes = MENSAJES_BOXITO_CANCELACIONES[categoria];
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

  // Load guide cancellations
  const loadCancelaciones = React.useCallback(async () => {
    if (!hasPermission('facturacion', 'read')) {
      setLoading(false);
      setInitialLoad(false);
      return;
    }
    
    try {
      setLoading(true);
      console.log('📦 Boxito: Loading guide cancellations...');
      
      const response = await fetch('/api/guide-cancellations', {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Boxito: Raw cancellations data:', data);
        setCancelaciones(data);
        console.log(`📦 Boxito: Loaded ${data.length} guide cancellations`);
        
        // Mensaje de bienvenida motivacional solo en carga inicial
        if (initialLoad && data.length > 0) {
          const pendientes = data.filter((c: GuideCancellation) => c.estatus === 'Pendiente').length;
          const canceladas = data.filter((c: GuideCancellation) => c.estatus === 'Cancelada').length;
          
          setTimeout(() => {
            if (pendientes === 0) {
              mostrarNotificacionBoxito("¡Increíble! No hay cancelaciones pendientes. ¡Todo al día! 🏆", 'success');
            } else {
              mostrarNotificacionBoxito(`Tienes ${canceladas} guías canceladas exitosamente y ${pendientes} solicitudes pendientes. ¡Vamos a procesarlas! 💪`, 'info');
            }
          }, 1000);
        }
      } else {
        console.error('📦 Boxito: Error response loading cancellations:', response.status);
        showNotification('Error al cargar cancelaciones de guías', 'error');
      }
    } catch (error) {
      console.error('📦 Boxito: Error loading cancellations:', error);
      showNotification('Error de conexión al cargar cancelaciones', 'error');
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, [hasPermission, getAuthHeaders, showNotification, mostrarNotificacionBoxito, initialLoad]);

  React.useEffect(() => {
    loadCancelaciones();
  }, [loadCancelaciones]);

  const handleFileUpload = (files: File[]) => {
    setGuideFiles(files);
    if (files.length > 0) {
      setFormData(prev => ({ ...prev, archivo_guia: files[0].name }));
      mostrarNotificacionBoxito('¡Perfecto! Archivo de guía adjuntado correctamente 📎', 'success');
    }
  };

  const validateFormData = () => {
    // Basic validations
    if (!formData.numero_guia.trim()) {
      mostrarNotificacionBoxito('El número de guía es obligatorio 📦', 'warning');
      return false;
    }
    
    if (!formData.paqueteria.trim()) {
      mostrarNotificacionBoxito('La paquetería es obligatoria 📦', 'warning');
      return false;
    }
    
    if (!formData.cliente.trim()) {
      mostrarNotificacionBoxito('El cliente es obligatorio 👤', 'warning');
      return false;
    }
    
    if (!formData.motivo.trim() || formData.motivo.trim().length < 10) {
      mostrarNotificacionBoxito('El motivo debe tener al menos 10 caracteres 📝', 'warning');
      return false;
    }
    
    if (!formData.fecha_solicitud) {
      mostrarNotificacionBoxito('La fecha de solicitud es obligatoria 📅', 'warning');
      return false;
    }
    
    // URL validation - only if provided
    if (formData.url_guia && formData.url_guia.trim() !== '') {
      try {
        new URL(formData.url_guia);
      } catch {
        mostrarNotificacionBoxito('La URL de la guía no es válida. Ejemplo: https://tracking.paqueteria.com/guia/123456 🔗', 'warning');
        return false;
      }
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hasPermission('facturacion', 'create') && !hasPermission('facturacion', 'update')) {
      mostrarNotificacionBoxito('No tienes permisos para esta acción. ¡Contacta a tu administrador! 🔐', 'warning');
      return;
    }
    
    // Validate form data before submitting
    if (!validateFormData()) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Mensaje de procesamiento motivacional
      const procesandoMsg = obtenerMensajeAleatorio('motivacion');
      mostrarNotificacionBoxito(`${procesandoMsg} Procesando solicitud...`, 'info');
      
      // Clean and prepare data
      const cancellationData = {
        numero_guia: formData.numero_guia.trim(),
        paqueteria: formData.paqueteria.trim(),
        cliente: formData.cliente.trim(),
        motivo: formData.motivo.trim(),
        fecha_solicitud: formData.fecha_solicitud,
        url_guia: formData.url_guia && formData.url_guia.trim() !== '' ? formData.url_guia.trim() : undefined,
        archivo_guia: formData.archivo_guia && formData.archivo_guia.trim() !== '' ? formData.archivo_guia.trim() : undefined,
        comentarios: formData.comentarios && formData.comentarios.trim() !== '' ? formData.comentarios.trim() : undefined
      };
      
      const url = editingCancellation 
        ? `/api/guide-cancellations/${editingCancellation.id}`
        : '/api/guide-cancellations';
      const method = editingCancellation ? 'PUT' : 'POST';
      
      console.log('📦 Boxito: Submitting guide cancellation:', method, cancellationData);
      
      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(cancellationData)
      });
      
      if (response.ok) {
        const mensajeExito = obtenerMensajeAleatorio('solicitud');
        const accion = editingCancellation ? 'actualizada' : 'registrada';
        mostrarNotificacionBoxito(
          `${mensajeExito} Solicitud ${accion} para guía ${formData.numero_guia} de ${formData.paqueteria} 📦`,
          'success'
        );
        
        // Mensaje adicional motivacional
        setTimeout(() => {
          if (formData.url_guia || formData.archivo_guia) {
            mostrarNotificacionBoxito('¡Documentación completa! Esto agilizará el proceso de cancelación 🚀', 'success');
          } else {
            mostrarNotificacionBoxito('¡Registro exitoso! Considera adjuntar documentación para acelerar el proceso 💡', 'info');
          }
        }, 2500);
        
        setTimeout(() => {
          activarMensajeMotivacional();
        }, 5000);
        
        setShowDialog(false);
        setEditingCancellation(null);
        resetForm();
        await loadCancelaciones();
      } else {
        const errorData = await response.json();
        console.error('📦 Boxito: Error response:', errorData);
        
        // Show detailed validation errors if available
        if (errorData.details && Array.isArray(errorData.details)) {
          const errorMessages = errorData.details.join(', ');
          mostrarNotificacionBoxito(`Errores de validación: ${errorMessages} 📝`, 'warning');
        } else {
          mostrarNotificacionBoxito(`Algo no salió como esperaba: ${errorData.error || 'Error al procesar solicitud'} 😅`, 'error');
        }
      }
    } catch (error) {
      console.error('📦 Boxito: Error submitting cancellation:', error);
      mostrarNotificacionBoxito('Error de conexión al procesar solicitud. ¡Inténtalo de nuevo! 🔄', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedForStatus || !hasPermission('facturacion', 'update')) {
      mostrarNotificacionBoxito('No tienes permisos para actualizar estados 🔐', 'warning');
      return;
    }
    
    try {
      setLoading(true);
      
      const mensajeProcesando = obtenerMensajeAleatorio('motivacion');
      mostrarNotificacionBoxito(`${mensajeProcesando} Actualizando estado...`, 'info');
      
      const response = await fetch(`/api/guide-cancellations/${selectedForStatus.id}/status`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(statusFormData)
      });
      
      if (response.ok) {
        const mensajeExito = obtenerMensajeAleatorio('estadoActualizado');
        mostrarNotificacionBoxito(
          `${mensajeExito} Guía ${selectedForStatus.numero_guia} → ${statusFormData.estatus} 🔄`,
          'success'
        );
        
        // Mensaje según el nuevo estado
        setTimeout(() => {
          if (statusFormData.estatus === 'Cancelada') {
            const mensajeCancelada = obtenerMensajeAleatorio('procesada');
            mostrarNotificacionBoxito(`${mensajeCancelada} Cliente satisfecho con la gestión 🏆`, 'success');
          } else if (statusFormData.estatus === 'En Proceso') {
            mostrarNotificacionBoxito('¡Excelente seguimiento! El cliente sabe que estamos trabajando en su solicitud 💪', 'info');
          }
        }, 2500);
        
        setTimeout(() => {
          activarMensajeMotivacional();
        }, 5000);
        
        setShowStatusDialog(false);
        setSelectedForStatus(null);
        resetStatusForm();
        await loadCancelaciones();
      } else {
        const errorData = await response.json();
        mostrarNotificacionBoxito(`Error al actualizar estado: ${errorData.error || 'Error desconocido'} 😅`, 'error');
      }
    } catch (error) {
      console.error('📦 Boxito: Error updating status:', error);
      mostrarNotificacionBoxito('Error de conexión al actualizar estado. ¡Inténtalo de nuevo! 🔄', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      numero_guia: '',
      paqueteria: '',
      cliente: '',
      motivo: '',
      fecha_solicitud: new Date().toISOString().split('T')[0],
      url_guia: '',
      archivo_guia: '',
      comentarios: ''
    });
    setGuideFiles([]);
  };

  const resetStatusForm = () => {
    setStatusFormData({
      estatus: 'Pendiente',
      comentarios: '',
      responsable: '',
      costo_cancelacion: 0,
      reembolso: 0,
      numero_referencia: ''
    });
  };

  const handleEdit = (cancellation: GuideCancellation) => {
    setEditingCancellation(cancellation);
    setFormData({
      numero_guia: cancellation.numero_guia,
      paqueteria: cancellation.paqueteria,
      cliente: cancellation.cliente,
      motivo: cancellation.motivo,
      fecha_solicitud: cancellation.fecha_solicitud,
      url_guia: cancellation.url_guia || '',
      archivo_guia: cancellation.archivo_guia || '',
      comentarios: cancellation.comentarios || ''
    });
    setShowDialog(true);
    mostrarNotificacionBoxito('Editando solicitud de cancelación. ¡Perfecciona los detalles! ✏️', 'info');
  };

  const handleStatusChange = (cancellation: GuideCancellation) => {
    setSelectedForStatus(cancellation);
    setStatusFormData({
      estatus: cancellation.estatus,
      comentarios: cancellation.comentarios || '',
      responsable: cancellation.responsable || '',
      costo_cancelacion: cancellation.costo_cancelacion,
      reembolso: cancellation.reembolso,
      numero_referencia: cancellation.numero_referencia || ''
    });
    setShowStatusDialog(true);
    mostrarNotificacionBoxito('Gestionando estado de cancelación. ¡Control total del proceso! 🎯', 'info');
  };

  const handleDelete = async (cancellation: GuideCancellation) => {
    if (!hasPermission('facturacion', 'delete')) {
      mostrarNotificacionBoxito('No tienes permisos para eliminar solicitudes. ¡Contacta a tu administrador! 🔐', 'warning');
      return;
    }
    
    if (!confirm(`📦 Boxito pregunta: ¿Confirmas que quieres eliminar la solicitud de cancelación para la guía ${cancellation.numero_guia}?`)) {
      return;
    }
    
    try {
      setLoading(true);
      
      const response = await fetch(`/api/guide-cancellations/${cancellation.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        mostrarNotificacionBoxito('¡Solicitud eliminada exitosamente! Gestión limpia y organizada 🗑️✨', 'success');
        await loadCancelaciones();
      } else {
        const errorData = await response.json();
        mostrarNotificacionBoxito(`Error al eliminar: ${errorData.error || 'Error desconocido'} 😅`, 'error');
      }
    } catch (error) {
      console.error('📦 Boxito: Error deleting cancellation:', error);
      mostrarNotificacionBoxito('Error de conexión al eliminar solicitud. ¡Inténtalo de nuevo! 🔄', 'error');
    } finally {
      setLoading(false);
    }
  };

  const cancelacionesFiltradas = React.useMemo(() => {
    return cancelaciones.filter(c => {
      const cumpleEstatus = filtros.estatus === 'all' || c.estatus === filtros.estatus;
      const cumpleCliente = !filtros.cliente || c.cliente.toLowerCase().includes(filtros.cliente.toLowerCase());
      const cumplePaqueteria = !filtros.paqueteria || c.paqueteria.toLowerCase().includes(filtros.paqueteria.toLowerCase());
      const cumpleNumero = !filtros.numero_guia || c.numero_guia.toLowerCase().includes(filtros.numero_guia.toLowerCase());
      
      return cumpleEstatus && cumpleCliente && cumplePaqueteria && cumpleNumero;
    });
  }, [cancelaciones, filtros]);

  const exportarCancelaciones = () => {
    if (cancelacionesFiltradas.length === 0) {
      mostrarNotificacionBoxito('No hay cancelaciones para exportar en los filtros actuales 📊', 'warning');
      return;
    }

    const datosExport = cancelacionesFiltradas.map((canc, index) => ({
      '#': index + 1,
      'Número Guía': canc.numero_guia,
      'Paquetería': canc.paqueteria,
      'Cliente': canc.cliente,
      'Motivo': canc.motivo,
      'Fecha Solicitud': canc.fecha_solicitud,
      'Estado': canc.estatus,
      'URL Guía': canc.url_guia || '',
      'Archivo': canc.archivo_guia || '',
      'Responsable': canc.responsable || '',
      'Costo Cancelación': canc.costo_cancelacion,
      'Reembolso': canc.reembolso,
      'Número Referencia': canc.numero_referencia || '',
      'Fecha Respuesta': canc.fecha_respuesta || '',
      'Comentarios': canc.comentarios || ''
    }));

    const ws = XLSX.utils.json_to_sheet(datosExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cancelacion_Guias');
    XLSX.writeFile(wb, `📦_Boxito_Cancelacion_Guias_${new Date().toISOString().split('T')[0]}.xlsx`);
    mostrarNotificacionBoxito('¡Reporte de cancelaciones exportado exitosamente! Tu organización es excepcional 📊✨', 'success');
    
    setTimeout(() => {
      mostrarNotificacionBoxito('💡 Tip: Los reportes ayudan a identificar patrones en cancelaciones', 'info');
    }, 3000);
  };

  // Estadísticas motivacionales
  const estadisticasMotivacionales = React.useMemo(() => {
    const totalPendientes = cancelacionesFiltradas.filter(c => c.estatus === 'Pendiente').length;
    const totalEnProceso = cancelacionesFiltradas.filter(c => c.estatus === 'En Proceso').length;
    const totalCanceladas = cancelacionesFiltradas.filter(c => c.estatus === 'Cancelada').length;
    const totalRechazadas = cancelacionesFiltradas.filter(c => c.estatus === 'Rechazada').length;
    const costoTotal = cancelacionesFiltradas.reduce((sum, c) => sum + c.costo_cancelacion, 0);
    const reembolsoTotal = cancelacionesFiltradas.reduce((sum, c) => sum + c.reembolso, 0);
    const tasaExito = cancelacionesFiltradas.length > 0 ? (totalCanceladas / cancelacionesFiltradas.length) * 100 : 0;
    
    return {
      totalPendientes,
      totalEnProceso,
      totalCanceladas,
      totalRechazadas,
      costoTotal,
      reembolsoTotal,
      tasaExito
    };
  }, [cancelacionesFiltradas]);

  const getStatusBadge = (estatus: GuideCancellation['estatus']) => {
    const statusStyles = {
      'Pendiente': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'En Proceso': 'bg-blue-100 text-blue-800 border-blue-300',
      'Cancelada': 'bg-green-100 text-green-800 border-green-300',
      'Rechazada': 'bg-red-100 text-red-800 border-red-300'
    };

    const statusIcons = {
      'Pendiente': '⏳',
      'En Proceso': '🔄',
      'Cancelada': '✅',
      'Rechazada': '❌'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusStyles[estatus]}`}>
        {statusIcons[estatus]} {estatus}
      </span>
    );
  };

  if (!hasPermission('facturacion', 'read')) {
    return (
      <div className="p-6">
        <Card className="card-shope">
          <CardContent className="p-6 text-center">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No tienes permisos para ver las cancelaciones de guías.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Motivacional */}
      <Card className="bg-gradient-to-r from-red-600 to-orange-700 text-white border-0 shadow-2xl overflow-hidden relative">
        <CardContent className="p-6 relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">📦 Cancelación de Guías</h1>
              <p className="text-red-100">
                📦 Boxito gestiona las cancelaciones con eficiencia - {cancelacionesFiltradas.length} solicitudes activas
              </p>
              {estadisticasMotivacionales.tasaExito >= 80 && (
                <div className="mt-2 flex items-center gap-2 bg-white/20 rounded-lg px-3 py-1">
                  <Trophy className="w-4 h-4" />
                  <span className="text-sm font-medium">¡Excelente tasa de éxito: {estadisticasMotivacionales.tasaExito.toFixed(1)}%!</span>
                </div>
              )}
            </div>
            
            <div className="flex gap-3">
              <Button 
                onClick={exportarCancelaciones} 
                variant="secondary" 
                className="bg-white/20 hover:bg-white/30 text-white border-white/20"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar Reporte
              </Button>
              
              {hasPermission('facturacion', 'create') && (
                <Dialog open={showDialog} onOpenChange={(open) => {
                  setShowDialog(open);
                  if (!open) {
                    setEditingCancellation(null);
                    resetForm();
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button className="btn-shope-secondary" onClick={resetForm}>
                      <Plus className="w-4 h-4 mr-2" />
                      Nueva Solicitud
                    </Button>
                  </DialogTrigger>
                </Dialog>
              )}
            </div>
          </div>
        </CardContent>
        
        {/* Elemento decorativo de Boxito */}
        <div className="absolute top-4 right-4 opacity-10">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
            <span className="text-2xl">📦</span>
          </div>
        </div>
      </Card>

      {/* Mensaje Motivacional Emergente */}
      {mostrarMensajeMotivacional && (
        <Card className="bg-gradient-to-r from-purple-500 to-pink-600 text-white border-0 shadow-xl animate-pulse">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                <span className="text-lg">📦</span>
              </div>
              <div>
                <h3 className="font-bold">¡Boxito te felicita! 🎉</h3>
                <p className="text-blue-100 text-sm">Tu gestión de cancelaciones mantiene clientes satisfechos</p>
              </div>
              <Gift className="w-6 h-6 text-yellow-300 animate-bounce" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Indicadores de Rendimiento */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className={`border-2 transition-all duration-300 ${
          estadisticasMotivacionales.tasaExito >= 90 
            ? 'border-green-400 bg-gradient-to-br from-green-50 to-green-100' 
            : estadisticasMotivacionales.tasaExito >= 70 
            ? 'border-blue-400 bg-gradient-to-br from-blue-50 to-blue-100'
            : 'border-orange-400 bg-gradient-to-br from-orange-50 to-orange-100'
        }`}>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              {estadisticasMotivacionales.tasaExito >= 90 ? (
                <Trophy className="w-6 h-6 text-green-600" />
              ) : estadisticasMotivacionales.tasaExito >= 70 ? (
                <Star className="w-6 h-6 text-blue-600" />
              ) : (
                <Target className="w-6 h-6 text-orange-600" />
              )}
            </div>
            <div className="text-2xl font-bold mb-1">
              {estadisticasMotivacionales.tasaExito.toFixed(1)}%
            </div>
            <div className="text-sm font-medium">Tasa de Éxito</div>
            <div className="text-xs mt-1">
              {estadisticasMotivacionales.tasaExito >= 90 ? '¡Excepcional! 🏆' : 
               estadisticasMotivacionales.tasaExito >= 70 ? '¡Muy bien! ⭐' : 
               '¡Mejorando! 💪'}
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-gradient-to-br from-yellow-50 to-yellow-100">
          <CardContent className="p-4 text-center">
            <div className="text-yellow-600 text-sm font-medium mb-1">Pendientes</div>
            <div className="text-2xl font-bold text-yellow-700 mb-1">
              {estadisticasMotivacionales.totalPendientes}
            </div>
            <div className="text-xs text-yellow-600">
              {estadisticasMotivacionales.totalPendientes === 0 ? '¡Todo procesado! 🎯' : 'Por procesar 📋'}
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-4 text-center">
            <div className="text-green-600 text-sm font-medium mb-1">Canceladas</div>
            <div className="text-2xl font-bold text-green-700 mb-1">
              {estadisticasMotivacionales.totalCanceladas}
            </div>
            <div className="text-xs text-green-600">
              {estadisticasMotivacionales.totalCanceladas > estadisticasMotivacionales.totalRechazadas ? '¡Excelente! 🌟' : 'Progresando 📈'}
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-4 text-center">
            <div className="text-purple-600 text-sm font-medium mb-1">Reembolsos</div>
            <div className="text-2xl font-bold text-purple-700 mb-1">
              ${estadisticasMotivacionales.reembolsoTotal.toLocaleString('es-MX')}
            </div>
            <div className="text-xs text-purple-600">
              {estadisticasMotivacionales.reembolsoTotal > 0 ? 'Gestionando 💼' : 'Sin reembolsos 📊'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="card-shope">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-red-600" />
            Filtros de Cancelaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Estado</Label>
              <Select value={filtros.estatus} onValueChange={(value) => {
                setFiltros(prev => ({ ...prev, estatus: value }));
                
                // Mensaje contextual según el estatus
                setTimeout(() => {
                  if (value === 'Cancelada') {
                    mostrarNotificacionBoxito('¡Revisando cancelaciones exitosas! Excelente gestión 🏆', 'success');
                  } else if (value === 'Pendiente') {
                    mostrarNotificacionBoxito('Enfocándonos en solicitudes pendientes. ¡A procesarlas! 💪', 'info');
                  } else if (value === 'En Proceso') {
                    mostrarNotificacionBoxito('Revisando solicitudes en proceso. ¡Gran seguimiento! 🔄', 'info');
                  }
                }, 500);
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">🔍 Todas</SelectItem>
                  <SelectItem value="Pendiente">⏳ Pendientes</SelectItem>
                  <SelectItem value="En Proceso">🔄 En Proceso</SelectItem>
                  <SelectItem value="Cancelada">✅ Canceladas</SelectItem>
                  <SelectItem value="Rechazada">❌ Rechazadas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Cliente</Label>
              <Input
                placeholder="Buscar cliente"
                value={filtros.cliente}
                onChange={(e) => setFiltros(prev => ({ ...prev, cliente: e.target.value }))}
                className="input-shope"
              />
            </div>
            
            <div>
              <Label>Paquetería</Label>
              <Input
                placeholder="Buscar paquetería"
                value={filtros.paqueteria}
                onChange={(e) => setFiltros(prev => ({ ...prev, paqueteria: e.target.value }))}
                className="input-shope"
              />
            </div>
            
            <div>
              <Label>No. Guía</Label>
              <Input
                placeholder="Buscar # guía"
                value={filtros.numero_guia}
                onChange={(e) => setFiltros(prev => ({ ...prev, numero_guia: e.target.value }))}
                className="input-shope"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card className="table-shope">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-600" />
            Solicitudes de Cancelación ({cancelacionesFiltradas.length})
            {estadisticasMotivacionales.totalPendientes === 0 && cancelacionesFiltradas.length > 0 && (
              <div className="ml-auto flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                <Trophy className="w-4 h-4" />
                ¡Sin pendientes!
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 bg-gradient-to-r from-red-600 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <span className="text-white font-bold">📦</span>
              </div>
              <p className="text-gray-600">📦 Boxito está cargando las solicitudes...</p>
            </div>
          ) : cancelacionesFiltradas.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-bold text-red-700 mb-2">
                📋 No hay solicitudes que coincidan con los filtros
              </h3>
              <p className="text-red-600">
                Boxito sugiere: Ajusta los filtros o registra una nueva solicitud
              </p>
              <div className="mt-4 bg-red-50 p-4 rounded-lg border border-red-200">
                <p className="text-sm text-red-700">
                  💡 <strong>Boxito sugiere:</strong> ¡Menos cancelaciones significa mejor satisfacción del cliente!
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-red-600 to-orange-700">
                    <TableHead className="text-white font-semibold">No. Guía</TableHead>
                    <TableHead className="text-white font-semibold">Paquetería</TableHead>
                    <TableHead className="text-white font-semibold">Cliente</TableHead>
                    <TableHead className="text-white font-semibold">Motivo</TableHead>
                    <TableHead className="text-white font-semibold">Fecha Solicitud</TableHead>
                    <TableHead className="text-white font-semibold">Estado</TableHead>
                    <TableHead className="text-white font-semibold">Documentación</TableHead>
                    <TableHead className="text-white font-semibold">Reembolso</TableHead>
                    <TableHead className="text-white font-semibold">📦 Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cancelacionesFiltradas.map((cancelacion) => (
                    <TableRow key={cancelacion.id} className="hover:bg-red-50 transition-colors">
                      <TableCell className="font-medium font-mono">
                        {cancelacion.numero_guia}
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                          {cancelacion.paqueteria}
                        </span>
                      </TableCell>
                      <TableCell>{cancelacion.cliente}</TableCell>
                      <TableCell className="max-w-xs truncate" title={cancelacion.motivo}>
                        {cancelacion.motivo}
                      </TableCell>
                      <TableCell>{cancelacion.fecha_solicitud}</TableCell>
                      <TableCell>
                        {getStatusBadge(cancelacion.estatus)}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {cancelacion.url_guia && (
                            <div>
                              <a 
                                href={cancelacion.url_guia} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-blue-600 hover:text-blue-800 hover:underline text-xs font-medium hover:scale-105 transition-transform inline-block"
                              >
                                🔗 Ver URL
                              </a>
                            </div>
                          )}
                          {cancelacion.archivo_guia && (
                            <div>
                              <span className="text-green-600 text-xs font-medium">
                                📎 {cancelacion.archivo_guia}
                              </span>
                            </div>
                          )}
                          {!cancelacion.url_guia && !cancelacion.archivo_guia && (
                            <span className="text-gray-400 text-xs">Sin documentos</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {cancelacion.reembolso > 0 ? (
                          <div className="text-green-600 font-medium">
                            ${cancelacion.reembolso.toLocaleString('es-MX')}
                          </div>
                        ) : (
                          <span className="text-gray-400">--</span>
                        )}
                        {cancelacion.costo_cancelacion > 0 && (
                          <div className="text-red-600 text-xs">
                            Costo: ${cancelacion.costo_cancelacion.toLocaleString('es-MX')}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {hasPermission('facturacion', 'update') && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(cancelacion)}
                                className="hover:bg-blue-100 text-blue-600 hover:scale-105 transition-transform"
                              >
                                ✏️ Editar
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleStatusChange(cancelacion)}
                                className="hover:bg-green-100 text-green-600 hover:scale-105 transition-transform"
                              >
                                🔄 Estado
                              </Button>
                            </>
                          )}
                          {hasPermission('facturacion', 'delete') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(cancelacion)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-100 hover:scale-105 transition-transform"
                            >
                              🗑️ Eliminar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="card-shope bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-red-600" />
            📦 Resumen de Gestión de Cancelaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-4 rounded-lg border border-yellow-200 text-center">
              <div className="text-yellow-600 text-sm font-medium mb-1">Solicitudes Pendientes</div>
              <div className="text-2xl font-bold text-yellow-700">
                {estadisticasMotivacionales.totalPendientes}
              </div>
              <div className="text-xs text-yellow-500 mt-1">
                {estadisticasMotivacionales.totalPendientes === 0 ? '¡Excelente! 🎯' : 'Requieren atención 📋'}
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-green-200 text-center">
              <div className="text-green-600 text-sm font-medium mb-1">Cancelaciones Exitosas</div>
              <div className="text-2xl font-bold text-green-700">
                {estadisticasMotivacionales.totalCanceladas}
              </div>
              <div className="text-xs text-green-500 mt-1">
                {estadisticasMotivacionales.totalCanceladas > 10 ? '¡Gran gestión! 📊' : 
                 estadisticasMotivacionales.totalCanceladas > 5 ? 'Buen manejo 📈' : 
                 estadisticasMotivacionales.totalCanceladas > 0 ? 'Progresando ✨' : 'Iniciando 🌱'}
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-blue-200 text-center">
              <div className="text-blue-600 text-sm font-medium mb-1">En Proceso</div>
              <div className="text-2xl font-bold text-blue-700">
                {estadisticasMotivacionales.totalEnProceso}
              </div>
              <div className="text-xs text-blue-500 mt-1">
                {estadisticasMotivacionales.totalEnProceso > 0 ? 'Gestionando 🔄' : 'Sin procesos 📊'}
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-purple-200 text-center">
              <div className="text-purple-600 text-sm font-medium mb-1">Reembolsos Totales</div>
              <div className="text-2xl font-bold text-purple-700">
                ${estadisticasMotivacionales.reembolsoTotal.toLocaleString('es-MX')}
              </div>
              <div className="text-xs text-purple-500 mt-1">
                {estadisticasMotivacionales.reembolsoTotal > 50000 ? 'Alto impacto 💰' : 
                 estadisticasMotivacionales.reembolsoTotal > 10000 ? 'Moderado 📊' : 
                 'Controlado 🎯'}
              </div>
            </div>
          </div>
          
          {/* Mensaje motivacional basado en performance */}
          <div className="mt-6 p-4 rounded-lg border-2 border-dashed border-red-300 bg-gradient-to-r from-red-50 to-orange-50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">📦</span>
              </div>
              <div>
                <h4 className="font-bold text-gray-800">
                  {estadisticasMotivacionales.tasaExito >= 90 ? '🏆 ¡GESTIÓN EXCEPCIONAL DE CANCELACIONES!' :
                   estadisticasMotivacionales.tasaExito >= 70 ? '⭐ ¡MUY BUEN MANEJO DE SOLICITUDES!' :
                   estadisticasMotivacionales.tasaExito >= 50 ? '💪 ¡SIGUE ASÍ CON LAS CANCELACIONES!' :
                   '🎯 ¡ENFOQUE EN MEJORA DE PROCESOS!'}
                </h4>
                <p className="text-gray-600 text-sm">
                  {estadisticasMotivacionales.tasaExito >= 90 ? 
                    'Boxito está impresionado: Tu gestión de cancelaciones es de nivel mundial. ¡Los clientes están muy satisfechos!' :
                   estadisticasMotivacionales.tasaExito >= 70 ? 
                    'Boxito dice: Tu trabajo en cancelaciones está dando excelentes resultados. ¡Sigue así!' :
                   estadisticasMotivacionales.tasaExito >= 50 ? 
                    'Boxito te anima: Vas por buen camino, cada cancelación bien gestionada cuenta. ¡No te rindas!' :
                    'Boxito sugiere: Documenta bien las solicitudes y da seguimiento oportuno. ¡Tú puedes mejorar!'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog for New/Edit Cancellation */}
      <Dialog open={showDialog} onOpenChange={(open) => {
        setShowDialog(open);
        if (!open) {
          setEditingCancellation(null);
          resetForm();
        }
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCancellation ? 'Editar Solicitud de Cancelación' : 'Nueva Solicitud de Cancelación'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información de la Guía */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-700 flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Información de la Guía
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="numero_guia">Número de Guía *</Label>
                  <Input
                    id="numero_guia"
                    value={formData.numero_guia}
                    onChange={(e) => setFormData(prev => ({ ...prev, numero_guia: e.target.value }))}
                    required
                    placeholder="Ej: 1234567890"
                    className="input-shope"
                  />
                </div>
                
                <div>
                  <Label htmlFor="paqueteria">Paquetería *</Label>
                  <Select 
                    value={formData.paqueteria} 
                    onValueChange={(value) => {
                      setFormData(prev => ({ ...prev, paqueteria: value }));
                      setTimeout(() => {
                        mostrarNotificacionBoxito(`¡Perfecto! Paquetería ${value} seleccionada. ¡Procesemos esa cancelación! 📦`, 'info');
                      }, 500);
                    }}
                  >
                    <SelectTrigger className="input-shope">
                      <SelectValue placeholder="Selecciona paquetería" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DHL">📦 DHL</SelectItem>
                      <SelectItem value="FedEx">📦 FedEx</SelectItem>
                      <SelectItem value="UPS">📦 UPS</SelectItem>
                      <SelectItem value="Estafeta">📦 Estafeta</SelectItem>
                      <SelectItem value="Paquetexpress">📦 Paquetexpress</SelectItem>
                      <SelectItem value="Redpack">📦 Redpack</SelectItem>
                      <SelectItem value="Otro">📦 Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="cliente">Cliente *</Label>
                  <Input
                    id="cliente"
                    value={formData.cliente}
                    onChange={(e) => setFormData(prev => ({ ...prev, cliente: e.target.value }))}
                    required
                    placeholder="Nombre del cliente"
                    className="input-shope"
                  />
                </div>
                
                <div>
                  <Label htmlFor="fecha_solicitud">Fecha de Solicitud *</Label>
                  <Input
                    id="fecha_solicitud"
                    type="date"
                    value={formData.fecha_solicitud}
                    onChange={(e) => setFormData(prev => ({ ...prev, fecha_solicitud: e.target.value }))}
                    required
                    className="input-shope"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Motivo y Documentación */}
            <Card className="bg-green-50 border-green-200">
              <CardHeader>
                <CardTitle className="text-green-700 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Motivo y Documentación
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="motivo">Motivo de Cancelación *</Label>
                  <Textarea
                    id="motivo"
                    value={formData.motivo}
                    onChange={(e) => setFormData(prev => ({ ...prev, motivo: e.target.value }))}
                    required
                    rows={3}
                    placeholder="Describe detalladamente el motivo de la cancelación (mínimo 10 caracteres)..."
                    className="input-shope"
                    minLength={10}
                  />
                  <p className="text-xs text-green-600 mt-1">
                    📦 Tip: Motivos claros aceleran el proceso de cancelación ({formData.motivo.length}/10 caracteres mínimos)
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="url_guia">URL de la Guía (Opcional)</Label>
                  <Input
                    id="url_guia"
                    type="url"
                    value={formData.url_guia}
                    onChange={(e) => setFormData(prev => ({ ...prev, url_guia: e.target.value }))}
                    placeholder="https://tracking.paqueteria.com/guia/123456"
                    className="input-shope"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    🔗 Link directo al tracking de la guía (opcional, pero debe ser una URL válida si se proporciona)
                  </p>
                </div>
                
                <div>
                  <Label>Archivo PDF de la Guía (Opcional)</Label>
                  <FileUpload
                    accept=".pdf,.jpg,.jpeg,.png"
                    onFileSelect={handleFileUpload}
                    files={guideFiles}
                    maxSize={5 * 1024 * 1024}
                    className="mt-2"
                  >
                    <div className="text-center py-8">
                      <Upload className="mx-auto h-12 w-12 text-green-400 mb-4" />
                      <p className="text-lg font-medium text-gray-700">
                        📦 Arrastra el PDF de la guía aquí
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        PDF, JPG, PNG • Máximo 5MB
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        💡 Boxito recomienda: PDF de la guía original acelera el proceso
                      </p>
                    </div>
                  </FileUpload>
                </div>
                
                <div>
                  <Label htmlFor="comentarios">Comentarios Adicionales</Label>
                  <Textarea
                    id="comentarios"
                    value={formData.comentarios}
                    onChange={(e) => setFormData(prev => ({ ...prev, comentarios: e.target.value }))}
                    rows={2}
                    placeholder="Información adicional que pueda ayudar en el proceso..."
                    className="input-shope"
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
                  setEditingCancellation(null);
                  resetForm();
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="btn-shope-primary flex-1">
                {loading ? '📦 Procesando...' : (editingCancellation ? 'Actualizar' : 'Registrar')} Solicitud
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              🔄 Actualizar Estado de Cancelación
            </DialogTitle>
            <p className="text-sm text-gray-600">
              Guía: {selectedForStatus?.numero_guia} - {selectedForStatus?.paqueteria}
            </p>
          </DialogHeader>
          
          <form onSubmit={handleStatusUpdate} className="space-y-4">
            <div>
              <Label htmlFor="estatus">Nuevo Estado *</Label>
              <Select 
                value={statusFormData.estatus} 
                onValueChange={(value: GuideCancellation['estatus']) => {
                  setStatusFormData(prev => ({ ...prev, estatus: value }));
                  
                  // Mensaje contextual según el estado
                  setTimeout(() => {
                    if (value === 'Cancelada') {
                      mostrarNotificacionBoxito('¡Excelente! Estado CANCELADA - Cliente satisfecho 🏆', 'success');
                    } else if (value === 'En Proceso') {
                      mostrarNotificacionBoxito('Estado EN PROCESO - Cliente informado del progreso 🔄', 'info');
                    } else if (value === 'Rechazada') {
                      mostrarNotificacionBoxito('Estado RECHAZADA - Documenta bien las razones ⚠️', 'warning');
                    }
                  }, 500);
                }}
              >
                <SelectTrigger className="input-shope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pendiente">⏳ Pendiente</SelectItem>
                  <SelectItem value="En Proceso">🔄 En Proceso</SelectItem>
                  <SelectItem value="Cancelada">✅ Cancelada</SelectItem>
                  <SelectItem value="Rechazada">❌ Rechazada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="responsable">Responsable</Label>
              <Input
                id="responsable"
                value={statusFormData.responsable}
                onChange={(e) => setStatusFormData(prev => ({ ...prev, responsable: e.target.value }))}
                placeholder="Nombre del responsable del procesamiento"
                className="input-shope"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="costo_cancelacion">Costo de Cancelación</Label>
                <Input
                  id="costo_cancelacion"
                  type="number"
                  step="0.01"
                  min="0"
                  value={statusFormData.costo_cancelacion}
                  onChange={(e) => setStatusFormData(prev => ({ ...prev, costo_cancelacion: Number(e.target.value) }))}
                  placeholder="0.00"
                  className="input-shope"
                />
              </div>
              
              <div>
                <Label htmlFor="reembolso">Reembolso al Cliente</Label>
                <Input
                  id="reembolso"
                  type="number"
                  step="0.01"
                  min="0"
                  value={statusFormData.reembolso}
                  onChange={(e) => setStatusFormData(prev => ({ ...prev, reembolso: Number(e.target.value) }))}
                  placeholder="0.00"
                  className="input-shope"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="numero_referencia">Número de Referencia</Label>
              <Input
                id="numero_referencia"
                value={statusFormData.numero_referencia}
                onChange={(e) => setStatusFormData(prev => ({ ...prev, numero_referencia: e.target.value }))}
                placeholder="Referencia de la paquetería o sistema interno"
                className="input-shope"
              />
            </div>
            
            <div>
              <Label htmlFor="comentarios_status">Comentarios del Procesamiento</Label>
              <Textarea
                id="comentarios_status"
                value={statusFormData.comentarios}
                onChange={(e) => setStatusFormData(prev => ({ ...prev, comentarios: e.target.value }))}
                rows={3}
                placeholder="Detalles del procesamiento, comunicación con paquetería, etc..."
                className="input-shope"
              />
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowStatusDialog(false);
                  setSelectedForStatus(null);
                  resetStatusForm();
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="btn-shope-primary flex-1">
                {loading ? '📦 Actualizando...' : 'Actualizar Estado'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
