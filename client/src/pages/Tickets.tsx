import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/context/AuthContext';
import { NotificationContext } from '@/App';
import { FileUpload } from '@/components/ui/file-upload';
import { Plus, Upload, Download, Ticket, Clock, CheckCircle, AlertTriangle, FileText, Star, Trophy, Target, Gift, User, Calendar, Tag, X } from 'lucide-react';
import * as XLSX from 'xlsx';

const MENSAJES_BOXITO_TICKETS = {
  ticket: [
    "¡Perfecto! Ticket registrado con éxito ✨",
    "¡Excelente! Solicitud procesada correctamente 🎉",
    "¡Increíble! Tu gestión de tickets es impecable 💯",
    "¡Genial! Otro ticket más en seguimiento 🌟",
    "¡Boxito está orgulloso de tu atención al cliente! 🚀"
  ],
  resuelto: [
    "¡INCREÍBLE! ¡Ticket resuelto exitosamente! 🎊",
    "¡VICTORIA! ¡Otra solicitud completada! 🏆",
    "¡ÉXITO TOTAL! ¡Cliente satisfecho! ✨",
    "¡GENIAL! ¡Problema solucionado! 🎯",
    "¡PERFECTO! ¡Excelente servicio al cliente! 💪"
  ],
  consejos: [
    "💡 Tip: Respuestas rápidas mejoran la satisfacción",
    "⭐ Consejo: Documentar bien la solución ayuda a futuros casos",
    "🎯 Meta: Mantener tiempo de respuesta bajo control",
    "📅 Recuerda: Asignar responsables acelera la resolución",
    "💪 ¡Cada ticket resuelto mejora la experiencia del cliente!"
  ],
  motivacion: [
    "¡Tu atención al cliente hace la diferencia! 🌟",
    "¡Boxito valora tu dedicación al servicio! 🎉",
    "¡Eres clave en la satisfacción del cliente! 💼",
    "¡Tu trabajo construye relaciones duraderas! ⚡",
    "¡Cada ticket bien manejado suma a la excelencia! 📈"
  ]
};

interface SupportTicket {
  id: string;
  numero_ticket: string;
  cliente: string;
  asunto: string;
  descripcion: string;
  categoria: 'Facturacion' | 'Cobranza' | 'Cancelaciones' | 'Informacion' | 'Soporte Tecnico' | 'Quejas' | 'Sugerencias' | 'Otros';
  prioridad: 'Baja' | 'Media' | 'Alta' | 'Urgente';
  estatus: 'Abierto' | 'En Proceso' | 'Esperando Cliente' | 'Resuelto' | 'Cerrado';
  fecha_creacion: string;
  fecha_limite?: string;
  fecha_resolucion?: string;
  solicitante_nombre: string;
  solicitante_email?: string;
  solicitante_telefono?: string;
  asignado_a?: string;
  tiempo_respuesta_horas: number;
  satisfaccion_cliente?: number;
  comentarios_internos?: string;
  solucion_aplicada?: string;
  archivos_adjuntos: string[];
  tags: string[];
  numero_seguimiento?: string;
  canal_origen: 'Email' | 'Telefono' | 'Chat' | 'Presencial' | 'Portal Web' | 'WhatsApp';
  requiere_seguimiento: boolean;
  created_at: string;
  updated_at: string;
}

export default function Tickets() {
  const { hasPermission } = useAuth();
  const { showNotification } = React.useContext(NotificationContext);
  const [tickets, setTickets] = React.useState<SupportTicket[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [showDialog, setShowDialog] = React.useState(false);
  const [showStatusDialog, setShowStatusDialog] = React.useState(false);
  const [editingTicket, setEditingTicket] = React.useState<SupportTicket | null>(null);
  const [selectedForStatus, setSelectedForStatus] = React.useState<SupportTicket | null>(null);
  const [mostrarMensajeMotivacional, setMostrarMensajeMotivacional] = React.useState(false);
  const [initialLoad, setInitialLoad] = React.useState(true);

  const [filtros, setFiltros] = React.useState({
    estatus: 'all',
    categoria: 'all',
    prioridad: 'all',
    cliente: '',
    asignado: ''
  });

  const [formData, setFormData] = React.useState({
    cliente: '',
    asunto: '',
    descripcion: '',
    categoria: 'Informacion' as SupportTicket['categoria'],
    prioridad: 'Media' as SupportTicket['prioridad'],
    fecha_creacion: new Date().toISOString().split('T')[0],
    solicitante_nombre: '',
    solicitante_email: '',
    solicitante_telefono: '',
    canal_origen: 'Portal Web' as SupportTicket['canal_origen'],
    tags: [] as string[],
    requiere_seguimiento: false
  });

  const [statusFormData, setStatusFormData] = React.useState({
    estatus: 'Abierto' as SupportTicket['estatus'],
    asignado_a: '',
    comentarios_internos: '',
    solucion_aplicada: '',
    satisfaccion_cliente: 0
  });

  const [attachmentFiles, setAttachmentFiles] = React.useState<File[]>([]);
  const [tagInput, setTagInput] = React.useState('');

  const obtenerMensajeAleatorio = (categoria: keyof typeof MENSAJES_BOXITO_TICKETS): string => {
    const mensajes = MENSAJES_BOXITO_TICKETS[categoria];
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

  // Load tickets
  const loadTickets = React.useCallback(async () => {
    if (!hasPermission('soporte', 'read')) {
      setLoading(false);
      setInitialLoad(false);
      return;
    }
    
    try {
      setLoading(true);
      console.log('📦 Boxito: Loading tickets...');
      
      const response = await fetch('/api/tickets', {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Boxito: Raw tickets data:', data);
        setTickets(data);
        console.log(`📦 Boxito: Loaded ${data.length} tickets`);
        
        if (initialLoad && data.length > 0) {
          const abiertos = data.filter((t: SupportTicket) => t.estatus === 'Abierto').length;
          const resueltos = data.filter((t: SupportTicket) => t.estatus === 'Resuelto').length;
          
          setTimeout(() => {
            if (abiertos === 0) {
              mostrarNotificacionBoxito("¡Increíble! No hay tickets abiertos. ¡Excelente servicio! 🏆", 'success');
            } else {
              mostrarNotificacionBoxito(`Tienes ${resueltos} tickets resueltos y ${abiertos} abiertos. ¡Vamos a atenderlos! 💪`, 'info');
            }
          }, 1000);
        }
      } else {
        console.error('📦 Boxito: Error response loading tickets:', response.status);
        showNotification('Error al cargar tickets', 'error');
      }
    } catch (error) {
      console.error('📦 Boxito: Error loading tickets:', error);
      showNotification('Error de conexión al cargar tickets', 'error');
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, [hasPermission, getAuthHeaders, showNotification, mostrarNotificacionBoxito, initialLoad]);

  React.useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const handleFileUpload = (files: File[]) => {
    setAttachmentFiles(files);
    if (files.length > 0) {
      mostrarNotificacionBoxito(`¡Perfecto! ${files.length} archivo(s) adjuntado(s) correctamente 📎`, 'success');
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
      mostrarNotificacionBoxito(`Tag "${tagInput.trim()}" agregado para mejor organización 🏷️`, 'info');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const validateFormData = () => {
    if (!formData.cliente.trim()) {
      mostrarNotificacionBoxito('El cliente es obligatorio 👤', 'warning');
      return false;
    }
    
    if (!formData.asunto.trim() || formData.asunto.trim().length < 5) {
      mostrarNotificacionBoxito('El asunto debe tener al menos 5 caracteres 📝', 'warning');
      return false;
    }
    
    if (!formData.descripcion.trim() || formData.descripcion.trim().length < 10) {
      mostrarNotificacionBoxito('La descripción debe tener al menos 10 caracteres 📄', 'warning');
      return false;
    }
    
    if (!formData.solicitante_nombre.trim()) {
      mostrarNotificacionBoxito('El nombre del solicitante es obligatorio 👤', 'warning');
      return false;
    }
    
    if (formData.solicitante_email && formData.solicitante_email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.solicitante_email)) {
        mostrarNotificacionBoxito('El email no es válido. Ejemplo: cliente@empresa.com 📧', 'warning');
        return false;
      }
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hasPermission('soporte', 'create') && !hasPermission('soporte', 'update')) {
      mostrarNotificacionBoxito('No tienes permisos para esta acción. ¡Contacta a tu administrador! 🔐', 'warning');
      return;
    }
    
    if (!validateFormData()) {
      return;
    }
    
    try {
      setLoading(true);
      
      const procesandoMsg = obtenerMensajeAleatorio('motivacion');
      mostrarNotificacionBoxito(`${procesandoMsg} Procesando ticket...`, 'info');
      
      const ticketData = {
        cliente: formData.cliente.trim(),
        asunto: formData.asunto.trim(),
        descripcion: formData.descripcion.trim(),
        categoria: formData.categoria,
        prioridad: formData.prioridad,
        fecha_creacion: formData.fecha_creacion,
        solicitante_nombre: formData.solicitante_nombre.trim(),
        solicitante_email: formData.solicitante_email && formData.solicitante_email.trim() !== '' ? formData.solicitante_email.trim() : undefined,
        solicitante_telefono: formData.solicitante_telefono && formData.solicitante_telefono.trim() !== '' ? formData.solicitante_telefono.trim() : undefined,
        canal_origen: formData.canal_origen,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
        requiere_seguimiento: formData.requiere_seguimiento,
        archivos_adjuntos: attachmentFiles.length > 0 ? attachmentFiles.map(f => f.name) : undefined
      };
      
      const url = editingTicket 
        ? `/api/tickets/${editingTicket.id}`
        : '/api/tickets';
      const method = editingTicket ? 'PUT' : 'POST';
      
      console.log('📦 Boxito: Submitting ticket:', method, ticketData);
      
      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(ticketData)
      });
      
      if (response.ok) {
        const result = await response.json();
        const mensajeExito = obtenerMensajeAleatorio('ticket');
        const accion = editingTicket ? 'actualizado' : 'registrado';
        mostrarNotificacionBoxito(
          `${mensajeExito} Ticket ${result.numero_ticket} ${accion} para ${formData.cliente} 🎫`,
          'success'
        );
        
        setTimeout(() => {
          if (formData.prioridad === 'Urgente') {
            mostrarNotificacionBoxito('¡Prioridad URGENTE! El equipo será notificado inmediatamente 🚨', 'warning');
          } else if (formData.prioridad === 'Alta') {
            mostrarNotificacionBoxito('¡Prioridad ALTA! Se dará seguimiento prioritario 🔴', 'info');
          } else {
            mostrarNotificacionBoxito('¡Ticket registrado! Se procesará según el flujo establecido 📋', 'info');
          }
        }, 2500);
        
        setTimeout(() => {
          activarMensajeMotivacional();
        }, 5000);
        
        setShowDialog(false);
        setEditingTicket(null);
        resetForm();
        await loadTickets();
      } else {
        const errorData = await response.json();
        console.error('📦 Boxito: Error response:', errorData);
        
        if (errorData.details && Array.isArray(errorData.details)) {
          const errorMessages = errorData.details.join(', ');
          mostrarNotificacionBoxito(`Errores de validación: ${errorMessages} 📝`, 'warning');
        } else {
          mostrarNotificacionBoxito(`Algo no salió como esperaba: ${errorData.error || 'Error al procesar ticket'} 😅`, 'error');
        }
      }
    } catch (error) {
      console.error('📦 Boxito: Error submitting ticket:', error);
      mostrarNotificacionBoxito('Error de conexión al procesar ticket. ¡Inténtalo de nuevo! 🔄', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedForStatus || !hasPermission('soporte', 'update')) {
      mostrarNotificacionBoxito('No tienes permisos para actualizar estados 🔐', 'warning');
      return;
    }
    
    try {
      setLoading(true);
      
      const mensajeProcesando = obtenerMensajeAleatorio('motivacion');
      mostrarNotificacionBoxito(`${mensajeProcesando} Actualizando estado...`, 'info');
      
      const response = await fetch(`/api/tickets/${selectedForStatus.id}/status`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(statusFormData)
      });
      
      if (response.ok) {
        const result = await response.json();
        const mensajeExito = obtenerMensajeAleatorio('motivacion');
        mostrarNotificacionBoxito(
          `${mensajeExito} Ticket ${selectedForStatus.numero_ticket} → ${statusFormData.estatus} 🔄`,
          'success'
        );
        
        setTimeout(() => {
          if (statusFormData.estatus === 'Resuelto' || statusFormData.estatus === 'Cerrado') {
            const mensajeResuelto = obtenerMensajeAleatorio('resuelto');
            const tiempoRespuesta = result.tiempo_respuesta_horas;
            mostrarNotificacionBoxito(`${mensajeResuelto} Tiempo de respuesta: ${tiempoRespuesta}h 🏆`, 'success');
          } else if (statusFormData.estatus === 'En Proceso') {
            mostrarNotificacionBoxito('¡Excelente! Ticket en proceso. El cliente sabe que estamos trabajando 💪', 'info');
          } else if (statusFormData.estatus === 'Esperando Cliente') {
            mostrarNotificacionBoxito('Ticket esperando respuesta del cliente. Seguimiento activado ⏳', 'info');
          }
        }, 2500);
        
        setTimeout(() => {
          activarMensajeMotivacional();
        }, 5000);
        
        setShowStatusDialog(false);
        setSelectedForStatus(null);
        resetStatusForm();
        await loadTickets();
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
      cliente: '',
      asunto: '',
      descripcion: '',
      categoria: 'Informacion',
      prioridad: 'Media',
      fecha_creacion: new Date().toISOString().split('T')[0],
      solicitante_nombre: '',
      solicitante_email: '',
      solicitante_telefono: '',
      canal_origen: 'Portal Web',
      tags: [],
      requiere_seguimiento: false
    });
    setAttachmentFiles([]);
    setTagInput('');
  };

  const resetStatusForm = () => {
    setStatusFormData({
      estatus: 'Abierto',
      asignado_a: '',
      comentarios_internos: '',
      solucion_aplicada: '',
      satisfaccion_cliente: 0
    });
  };

  const handleEdit = (ticket: SupportTicket) => {
    setEditingTicket(ticket);
    setFormData({
      cliente: ticket.cliente,
      asunto: ticket.asunto,
      descripcion: ticket.descripcion,
      categoria: ticket.categoria,
      prioridad: ticket.prioridad,
      fecha_creacion: ticket.fecha_creacion,
      solicitante_nombre: ticket.solicitante_nombre,
      solicitante_email: ticket.solicitante_email || '',
      solicitante_telefono: ticket.solicitante_telefono || '',
      canal_origen: ticket.canal_origen,
      tags: ticket.tags || [],
      requiere_seguimiento: ticket.requiere_seguimiento
    });
    setShowDialog(true);
    mostrarNotificacionBoxito('Editando ticket de soporte. ¡Perfecciona los detalles! ✏️', 'info');
  };

  const handleStatusChange = (ticket: SupportTicket) => {
    setSelectedForStatus(ticket);
    setStatusFormData({
      estatus: ticket.estatus,
      asignado_a: ticket.asignado_a || '',
      comentarios_internos: ticket.comentarios_internos || '',
      solucion_aplicada: ticket.solucion_aplicada || '',
      satisfaccion_cliente: ticket.satisfaccion_cliente || 0
    });
    setShowStatusDialog(true);
    mostrarNotificacionBoxito('Gestionando estado del ticket. ¡Control total del proceso! 🎯', 'info');
  };

  const handleDelete = async (ticket: SupportTicket) => {
    if (!hasPermission('soporte', 'delete')) {
      mostrarNotificacionBoxito('No tienes permisos para eliminar tickets. ¡Contacta a tu administrador! 🔐', 'warning');
      return;
    }
    
    if (!confirm(`📦 Boxito pregunta: ¿Confirmas que quieres eliminar el ticket ${ticket.numero_ticket}?`)) {
      return;
    }
    
    try {
      setLoading(true);
      
      const response = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        mostrarNotificacionBoxito('¡Ticket eliminado exitosamente! Gestión limpia y organizada 🗑️✨', 'success');
        await loadTickets();
      } else {
        const errorData = await response.json();
        mostrarNotificacionBoxito(`Error al eliminar: ${errorData.error || 'Error desconocido'} 😅`, 'error');
      }
    } catch (error) {
      console.error('📦 Boxito: Error deleting ticket:', error);
      mostrarNotificacionBoxito('Error de conexión al eliminar ticket. ¡Inténtalo de nuevo! 🔄', 'error');
    } finally {
      setLoading(false);
    }
  };

  const ticketsFiltrados = React.useMemo(() => {
    return tickets.filter(t => {
      const cumpleEstatus = filtros.estatus === 'all' || t.estatus === filtros.estatus;
      const cumpleCategoria = filtros.categoria === 'all' || t.categoria === filtros.categoria;
      const cumplePrioridad = filtros.prioridad === 'all' || t.prioridad === filtros.prioridad;
      const cumpleCliente = !filtros.cliente || t.cliente.toLowerCase().includes(filtros.cliente.toLowerCase());
      const cumpleAsignado = !filtros.asignado || (t.asignado_a && t.asignado_a.toLowerCase().includes(filtros.asignado.toLowerCase()));
      
      return cumpleEstatus && cumpleCategoria && cumplePrioridad && cumpleCliente && cumpleAsignado;
    });
  }, [tickets, filtros]);

  const exportarTickets = () => {
    if (ticketsFiltrados.length === 0) {
      mostrarNotificacionBoxito('No hay tickets para exportar en los filtros actuales 📊', 'warning');
      return;
    }

    const datosExport = ticketsFiltrados.map((ticket, index) => ({
      '#': index + 1,
      'Número Ticket': ticket.numero_ticket,
      'Cliente': ticket.cliente,
      'Asunto': ticket.asunto,
      'Descripción': ticket.descripcion,
      'Categoría': ticket.categoria,
      'Prioridad': ticket.prioridad,
      'Estado': ticket.estatus,
      'Fecha Creación': ticket.fecha_creacion,
      'Fecha Límite': ticket.fecha_limite || '',
      'Fecha Resolución': ticket.fecha_resolucion || '',
      'Solicitante': ticket.solicitante_nombre,
      'Email': ticket.solicitante_email || '',
      'Teléfono': ticket.solicitante_telefono || '',
      'Asignado a': ticket.asignado_a || '',
      'Tiempo Respuesta (hrs)': ticket.tiempo_respuesta_horas,
      'Satisfacción': ticket.satisfaccion_cliente || '',
      'Canal Origen': ticket.canal_origen,
      'Requiere Seguimiento': ticket.requiere_seguimiento ? 'Sí' : 'No',
      'Tags': ticket.tags.join(', '),
      'Solución': ticket.solucion_aplicada || '',
      'Comentarios Internos': ticket.comentarios_internos || ''
    }));

    const ws = XLSX.utils.json_to_sheet(datosExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tickets_Soporte');
    XLSX.writeFile(wb, `📦_Boxito_Tickets_Soporte_${new Date().toISOString().split('T')[0]}.xlsx`);
    mostrarNotificacionBoxito('¡Reporte de tickets exportado exitosamente! Tu organización es excepcional 📊✨', 'success');
  };

  const estadisticasMotivacionales = React.useMemo(() => {
    const totalAbiertos = ticketsFiltrados.filter(t => t.estatus === 'Abierto').length;
    const totalEnProceso = ticketsFiltrados.filter(t => t.estatus === 'En Proceso').length;
    const totalResueltos = ticketsFiltrados.filter(t => t.estatus === 'Resuelto').length;
    const totalCerrados = ticketsFiltrados.filter(t => t.estatus === 'Cerrado').length;
    const ticketsUrgentes = ticketsFiltrados.filter(t => t.prioridad === 'Urgente').length;
    const tiempoPromedioRespuesta = ticketsFiltrados.length > 0 
      ? ticketsFiltrados.filter(t => t.tiempo_respuesta_horas > 0).reduce((sum, t) => sum + t.tiempo_respuesta_horas, 0) / ticketsFiltrados.filter(t => t.tiempo_respuesta_horas > 0).length
      : 0;
    const tasaResolucion = ticketsFiltrados.length > 0 ? ((totalResueltos + totalCerrados) / ticketsFiltrados.length) * 100 : 0;
    
    return {
      totalAbiertos,
      totalEnProceso,
      totalResueltos,
      totalCerrados,
      ticketsUrgentes,
      tiempoPromedioRespuesta,
      tasaResolucion
    };
  }, [ticketsFiltrados]);

  const getStatusBadge = (estatus: SupportTicket['estatus']) => {
    const statusStyles = {
      'Abierto': 'bg-blue-100 text-blue-800 border-blue-300',
      'En Proceso': 'bg-orange-100 text-orange-800 border-orange-300',
      'Esperando Cliente': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'Resuelto': 'bg-green-100 text-green-800 border-green-300',
      'Cerrado': 'bg-gray-100 text-gray-800 border-gray-300'
    };

    const statusIcons = {
      'Abierto': '🆕',
      'En Proceso': '🔄',
      'Esperando Cliente': '⏳',
      'Resuelto': '✅',
      'Cerrado': '🔒'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusStyles[estatus]}`}>
        {statusIcons[estatus]} {estatus}
      </span>
    );
  };

  const getPriorityBadge = (prioridad: SupportTicket['prioridad']) => {
    const priorityStyles = {
      'Baja': 'bg-green-100 text-green-800 border-green-300',
      'Media': 'bg-blue-100 text-blue-800 border-blue-300',
      'Alta': 'bg-orange-100 text-orange-800 border-orange-300',
      'Urgente': 'bg-red-100 text-red-800 border-red-300'
    };

    const priorityIcons = {
      'Baja': '🟢',
      'Media': '🔵',
      'Alta': '🟡',
      'Urgente': '🔴'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${priorityStyles[prioridad]}`}>
        {priorityIcons[prioridad]} {prioridad}
      </span>
    );
  };

  if (!hasPermission('soporte', 'read')) {
    return (
      <div className="p-6">
        <Card className="card-shope">
          <CardContent className="p-6 text-center">
            <Ticket className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No tienes permisos para ver los tickets de soporte.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white border-0 shadow-2xl overflow-hidden relative">
        <CardContent className="p-6 relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">🎫 Sistema de Tickets de Soporte</h1>
              <p className="text-indigo-100">
                📦 Boxito gestiona las solicitudes de clientes con excelencia - {ticketsFiltrados.length} tickets activos
              </p>
              {estadisticasMotivacionales.tasaResolucion >= 80 && (
                <div className="mt-2 flex items-center gap-2 bg-white/20 rounded-lg px-3 py-1">
                  <Trophy className="w-4 h-4" />
                  <span className="text-sm font-medium">¡Excelente tasa de resolución: {estadisticasMotivacionales.tasaResolucion.toFixed(1)}%!</span>
                </div>
              )}
            </div>
            
            <div className="flex gap-3">
              <Button 
                onClick={exportarTickets} 
                variant="secondary" 
                className="bg-white/20 hover:bg-white/30 text-white border-white/20"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar Reporte
              </Button>
              
              {hasPermission('soporte', 'create') && (
                <Dialog open={showDialog} onOpenChange={(open) => {
                  setShowDialog(open);
                  if (!open) {
                    setEditingTicket(null);
                    resetForm();
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button className="btn-shope-secondary" onClick={resetForm}>
                      <Plus className="w-4 h-4 mr-2" />
                      Nuevo Ticket
                    </Button>
                  </DialogTrigger>
                </Dialog>
              )}
            </div>
          </div>
        </CardContent>
        
        <div className="absolute top-4 right-4 opacity-10">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
            <span className="text-2xl">🎫</span>
          </div>
        </div>
      </Card>

      {/* Mensaje Motivacional Emergente */}
      {mostrarMensajeMotivacional && (
        <Card className="bg-gradient-to-r from-purple-500 to-pink-600 text-white border-0 shadow-xl animate-pulse">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                <span className="text-lg">🎫</span>
              </div>
              <div>
                <h3 className="font-bold">¡Boxito te felicita! 🎉</h3>
                <p className="text-blue-100 text-sm">Tu gestión de tickets mantiene clientes satisfechos</p>
              </div>
              <Gift className="w-6 h-6 text-yellow-300 animate-bounce" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Indicadores de Rendimiento */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className={`border-2 transition-all duration-300 ${
          estadisticasMotivacionales.tasaResolucion >= 90 
            ? 'border-green-400 bg-gradient-to-br from-green-50 to-green-100' 
            : estadisticasMotivacionales.tasaResolucion >= 70 
            ? 'border-blue-400 bg-gradient-to-br from-blue-50 to-blue-100'
            : 'border-orange-400 bg-gradient-to-br from-orange-50 to-orange-100'
        }`}>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              {estadisticasMotivacionales.tasaResolucion >= 90 ? (
                <Trophy className="w-6 h-6 text-green-600" />
              ) : estadisticasMotivacionales.tasaResolucion >= 70 ? (
                <Star className="w-6 h-6 text-blue-600" />
              ) : (
                <Target className="w-6 h-6 text-orange-600" />
              )}
            </div>
            <div className="text-2xl font-bold mb-1">
              {estadisticasMotivacionales.tasaResolucion.toFixed(1)}%
            </div>
            <div className="text-sm font-medium">Tasa de Resolución</div>
            <div className="text-xs mt-1">
              {estadisticasMotivacionales.tasaResolucion >= 90 ? '¡Excepcional! 🏆' : 
               estadisticasMotivacionales.tasaResolucion >= 70 ? '¡Muy bien! ⭐' : 
               '¡Mejorando! 💪'}
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4 text-center">
            <div className="text-blue-600 text-sm font-medium mb-1">Tickets Abiertos</div>
            <div className="text-2xl font-bold text-blue-700 mb-1">
              {estadisticasMotivacionales.totalAbiertos}
            </div>
            <div className="text-xs text-blue-600">
              {estadisticasMotivacionales.totalAbiertos === 0 ? '¡Todo resuelto! 🎯' : 'Requieren atención 📋'}
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-4 text-center">
            <div className="text-green-600 text-sm font-medium mb-1">Tickets Resueltos</div>
            <div className="text-2xl font-bold text-green-700 mb-1">
              {estadisticasMotivacionales.totalResueltos}
            </div>
            <div className="text-xs text-green-600">
              {estadisticasMotivacionales.totalResueltos > estadisticasMotivacionales.totalAbiertos ? '¡Liderando! 🌟' : 'Progresando 📈'}
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-4 text-center">
            <div className="text-purple-600 text-sm font-medium mb-1">Tiempo Promedio</div>
            <div className="text-2xl font-bold text-purple-700 mb-1">
              {estadisticasMotivacionales.tiempoPromedioRespuesta.toFixed(1)}h
            </div>
            <div className="text-xs text-purple-600">
              {estadisticasMotivacionales.tiempoPromedioRespuesta < 24 ? '¡Rápido! 🚀' : 
               estadisticasMotivacionales.tiempoPromedioRespuesta < 48 ? 'Bueno 📊' : 
               'Mejorable 🎯'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="card-shope">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            Filtros de Tickets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label>Estado</Label>
              <Select value={filtros.estatus} onValueChange={(value) => {
                setFiltros(prev => ({ ...prev, estatus: value }));
                
                setTimeout(() => {
                  if (value === 'Abierto') {
                    mostrarNotificacionBoxito('¡Enfocándonos en tickets abiertos! A atenderlos 💪', 'info');
                  } else if (value === 'Resuelto') {
                    mostrarNotificacionBoxito('¡Revisando tickets resueltos! Excelente gestión 🏆', 'success');
                  }
                }, 500);
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">🔍 Todos</SelectItem>
                  <SelectItem value="Abierto">🆕 Abiertos</SelectItem>
                  <SelectItem value="En Proceso">🔄 En Proceso</SelectItem>
                  <SelectItem value="Esperando Cliente">⏳ Esperando Cliente</SelectItem>
                  <SelectItem value="Resuelto">✅ Resueltos</SelectItem>
                  <SelectItem value="Cerrado">🔒 Cerrados</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Categoría</Label>
              <Select value={filtros.categoria} onValueChange={(value) => setFiltros(prev => ({ ...prev, categoria: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">📋 Todas</SelectItem>
                  <SelectItem value="Facturacion">💰 Facturación</SelectItem>
                  <SelectItem value="Cobranza">💳 Cobranza</SelectItem>
                  <SelectItem value="Cancelaciones">❌ Cancelaciones</SelectItem>
                  <SelectItem value="Informacion">ℹ️ Información</SelectItem>
                  <SelectItem value="Soporte Tecnico">🔧 Soporte Técnico</SelectItem>
                  <SelectItem value="Quejas">😤 Quejas</SelectItem>
                  <SelectItem value="Sugerencias">💡 Sugerencias</SelectItem>
                  <SelectItem value="Otros">📌 Otros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Prioridad</Label>
              <Select value={filtros.prioridad} onValueChange={(value) => setFiltros(prev => ({ ...prev, prioridad: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">🎯 Todas</SelectItem>
                  <SelectItem value="Urgente">🔴 Urgente</SelectItem>
                  <SelectItem value="Alta">🟡 Alta</SelectItem>
                  <SelectItem value="Media">🔵 Media</SelectItem>
                  <SelectItem value="Baja">🟢 Baja</SelectItem>
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
              <Label>Asignado a</Label>
              <Input
                placeholder="Buscar responsable"
                value={filtros.asignado}
                onChange={(e) => setFiltros(prev => ({ ...prev, asignado: e.target.value }))}
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
            <Ticket className="w-5 h-5 text-indigo-600" />
            Tickets de Soporte ({ticketsFiltrados.length})
            {estadisticasMotivacionales.totalAbiertos === 0 && ticketsFiltrados.length > 0 && (
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
              <div className="w-8 h-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <span className="text-white font-bold">🎫</span>
              </div>
              <p className="text-gray-600">📦 Boxito está cargando los tickets...</p>
            </div>
          ) : ticketsFiltrados.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-bold text-indigo-700 mb-2">
                🎫 No hay tickets que coincidan con los filtros
              </h3>
              <p className="text-indigo-600">
                Boxito sugiere: Ajusta los filtros o registra un nuevo ticket
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-indigo-600 to-purple-700">
                    <TableHead className="text-white font-semibold">No. Ticket</TableHead>
                    <TableHead className="text-white font-semibold">Cliente</TableHead>
                    <TableHead className="text-white font-semibold">Asunto</TableHead>
                    <TableHead className="text-white font-semibold">Categoría</TableHead>
                    <TableHead className="text-white font-semibold">Prioridad</TableHead>
                    <TableHead className="text-white font-semibold">Estado</TableHead>
                    <TableHead className="text-white font-semibold">Asignado a</TableHead>
                    <TableHead className="text-white font-semibold">Fecha</TableHead>
                    <TableHead className="text-white font-semibold">🎫 Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ticketsFiltrados.map((ticket) => (
                    <TableRow key={ticket.id} className="hover:bg-indigo-50 transition-colors">
                      <TableCell className="font-medium font-mono">
                        {ticket.numero_ticket}
                        {ticket.requiere_seguimiento && (
                          <div className="text-xs text-orange-600">🔔 Seguimiento</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{ticket.cliente}</div>
                          <div className="text-xs text-gray-600">{ticket.solicitante_nombre}</div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate" title={ticket.asunto}>
                        {ticket.asunto}
                        {ticket.tags.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {ticket.tags.slice(0, 2).map(tag => (
                              <span key={tag} className="px-1 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                                {tag}
                              </span>
                            ))}
                            {ticket.tags.length > 2 && (
                              <span className="text-xs text-gray-500">+{ticket.tags.length - 2}</span>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-xs font-medium">
                          {ticket.categoria}
                        </span>
                      </TableCell>
                      <TableCell>
                        {getPriorityBadge(ticket.prioridad)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(ticket.estatus)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {ticket.asignado_a || (
                            <span className="text-gray-400">Sin asignar</span>
                          )}
                        </div>
                        {ticket.tiempo_respuesta_horas > 0 && (
                          <div className="text-xs text-gray-500">
                            {ticket.tiempo_respuesta_horas}h respuesta
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {ticket.fecha_creacion}
                        {ticket.fecha_limite && (
                          <div className="text-xs text-orange-600">
                            Límite: {ticket.fecha_limite}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {hasPermission('soporte', 'update') && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(ticket)}
                                className="hover:bg-indigo-100 text-indigo-600 hover:scale-105 transition-transform"
                              >
                                ✏️ Editar
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleStatusChange(ticket)}
                                className="hover:bg-green-100 text-green-600 hover:scale-105 transition-transform"
                              >
                                🔄 Estado
                              </Button>
                            </>
                          )}
                          {hasPermission('soporte', 'delete') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(ticket)}
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

      {/* Dialog for New/Edit Ticket */}
      <Dialog open={showDialog} onOpenChange={(open) => {
        setShowDialog(open);
        if (!open) {
          setEditingTicket(null);
          resetForm();
        }
      }}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTicket ? 'Editar Ticket de Soporte' : 'Nuevo Ticket de Soporte'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card className="bg-indigo-50 border-indigo-200">
              <CardHeader>
                <CardTitle className="text-indigo-700 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Información del Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
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
                  <Label htmlFor="solicitante_nombre">Nombre del Solicitante *</Label>
                  <Input
                    id="solicitante_nombre"
                    value={formData.solicitante_nombre}
                    onChange={(e) => setFormData(prev => ({ ...prev, solicitante_nombre: e.target.value }))}
                    required
                    placeholder="Persona que solicita el soporte"
                    className="input-shope"
                  />
                </div>
                
                <div>
                  <Label htmlFor="solicitante_email">Email del Solicitante</Label>
                  <Input
                    id="solicitante_email"
                    type="email"
                    value={formData.solicitante_email}
                    onChange={(e) => setFormData(prev => ({ ...prev, solicitante_email: e.target.value }))}
                    placeholder="email@cliente.com"
                    className="input-shope"
                  />
                </div>
                
                <div>
                  <Label htmlFor="solicitante_telefono">Teléfono del Solicitante</Label>
                  <Input
                    id="solicitante_telefono"
                    type="tel"
                    value={formData.solicitante_telefono}
                    onChange={(e) => setFormData(prev => ({ ...prev, solicitante_telefono: e.target.value }))}
                    placeholder="+52 55 1234 5678"
                    className="input-shope"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-200">
              <CardHeader>
                <CardTitle className="text-green-700 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Información del Ticket
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="categoria">Categoría *</Label>
                    <Select value={formData.categoria} onValueChange={(value: SupportTicket['categoria']) => setFormData(prev => ({ ...prev, categoria: value }))}>
                      <SelectTrigger className="input-shope">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Facturacion">💰 Facturación</SelectItem>
                        <SelectItem value="Cobranza">💳 Cobranza</SelectItem>
                        <SelectItem value="Cancelaciones">❌ Cancelaciones</SelectItem>
                        <SelectItem value="Informacion">ℹ️ Información</SelectItem>
                        <SelectItem value="Soporte Tecnico">🔧 Soporte Técnico</SelectItem>
                        <SelectItem value="Quejas">😤 Quejas</SelectItem>
                        <SelectItem value="Sugerencias">💡 Sugerencias</SelectItem>
                        <SelectItem value="Otros">📌 Otros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="prioridad">Prioridad *</Label>
                    <Select value={formData.prioridad} onValueChange={(value: SupportTicket['prioridad']) => setFormData(prev => ({ ...prev, prioridad: value }))}>
                      <SelectTrigger className="input-shope">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Baja">🟢 Baja</SelectItem>
                        <SelectItem value="Media">🔵 Media</SelectItem>
                        <SelectItem value="Alta">🟡 Alta</SelectItem>
                        <SelectItem value="Urgente">🔴 Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="canal_origen">Canal de Origen</Label>
                    <Select value={formData.canal_origen} onValueChange={(value: SupportTicket['canal_origen']) => setFormData(prev => ({ ...prev, canal_origen: value }))}>
                      <SelectTrigger className="input-shope">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Email">📧 Email</SelectItem>
                        <SelectItem value="Telefono">📞 Teléfono</SelectItem>
                        <SelectItem value="Chat">💬 Chat</SelectItem>
                        <SelectItem value="Presencial">🏢 Presencial</SelectItem>
                        <SelectItem value="Portal Web">🌐 Portal Web</SelectItem>
                        <SelectItem value="WhatsApp">📱 WhatsApp</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="fecha_creacion">Fecha de Creación</Label>
                    <Input
                      id="fecha_creacion"
                      type="date"
                      value={formData.fecha_creacion}
                      onChange={(e) => setFormData(prev => ({ ...prev, fecha_creacion: e.target.value }))}
                      className="input-shope"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="asunto">Asunto *</Label>
                  <Input
                    id="asunto"
                    value={formData.asunto}
                    onChange={(e) => setFormData(prev => ({ ...prev, asunto: e.target.value }))}
                    required
                    placeholder="Resumen breve del problema o solicitud"
                    className="input-shope"
                    minLength={5}
                  />
                </div>
                
                <div>
                  <Label htmlFor="descripcion">Descripción Detallada *</Label>
                  <Textarea
                    id="descripcion"
                    value={formData.descripcion}
                    onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                    required
                    rows={4}
                    placeholder="Describe detalladamente el problema, solicitud o situación (mínimo 10 caracteres)..."
                    className="input-shope"
                    minLength={10}
                  />
                  <p className="text-xs text-green-600 mt-1">
                    📝 Descripción clara acelera la resolución ({formData.descripcion.length}/10 caracteres mínimos)
                  </p>
                </div>
                
                <div>
                  <Label>Tags de Clasificación</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder="Agregar tag..."
                      className="input-shope flex-1"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    />
                    <Button type="button" onClick={handleAddTag} variant="outline" size="sm">
                      <Tag className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map(tag => (
                      <span key={tag} className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="requiere_seguimiento"
                    checked={formData.requiere_seguimiento}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requiere_seguimiento: checked }))}
                  />
                  <Label htmlFor="requiere_seguimiento">Requiere seguimiento especial</Label>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 border-purple-200">
              <CardHeader>
                <CardTitle className="text-purple-700 flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Archivos Adjuntos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FileUpload
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.txt"
                  onFileSelect={handleFileUpload}
                  files={attachmentFiles}
                  maxSize={10 * 1024 * 1024}
                  multiple
                >
                  <div className="text-center py-8">
                    <Upload className="mx-auto h-12 w-12 text-purple-400 mb-4" />
                    <p className="text-lg font-medium text-gray-700">
                      📎 Arrastra archivos de evidencia aquí
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      PDF, imágenes, documentos • Máximo 10MB por archivo
                    </p>
                    <p className="text-xs text-purple-600 mt-1">
                      💡 Boxito recomienda: Capturas de pantalla aceleran la resolución
                    </p>
                  </div>
                </FileUpload>
              </CardContent>
            </Card>
            
            <div className="flex gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowDialog(false);
                  setEditingTicket(null);
                  resetForm();
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="btn-shope-primary flex-1">
                {loading ? '🎫 Procesando...' : (editingTicket ? 'Actualizar' : 'Registrar')} Ticket
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
              🔄 Actualizar Estado del Ticket
            </DialogTitle>
            <p className="text-sm text-gray-600">
              Ticket: {selectedForStatus?.numero_ticket} - {selectedForStatus?.cliente}
            </p>
          </DialogHeader>
          
          <form onSubmit={handleStatusUpdate} className="space-y-4">
            <div>
              <Label htmlFor="estatus">Nuevo Estado *</Label>
              <Select 
                value={statusFormData.estatus} 
                onValueChange={(value: SupportTicket['estatus']) => {
                  setStatusFormData(prev => ({ ...prev, estatus: value }));
                  
                  setTimeout(() => {
                    if (value === 'Resuelto') {
                      mostrarNotificacionBoxito('¡Excelente! Estado RESUELTO - Cliente satisfecho 🏆', 'success');
                    } else if (value === 'En Proceso') {
                      mostrarNotificacionBoxito('Estado EN PROCESO - Cliente informado del progreso 🔄', 'info');
                    } else if (value === 'Esperando Cliente') {
                      mostrarNotificacionBoxito('Estado ESPERANDO CLIENTE - Pendiente de respuesta ⏳', 'warning');
                    }
                  }, 500);
                }}
              >
                <SelectTrigger className="input-shope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Abierto">🆕 Abierto</SelectItem>
                  <SelectItem value="En Proceso">🔄 En Proceso</SelectItem>
                  <SelectItem value="Esperando Cliente">⏳ Esperando Cliente</SelectItem>
                  <SelectItem value="Resuelto">✅ Resuelto</SelectItem>
                  <SelectItem value="Cerrado">🔒 Cerrado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="asignado_a">Asignar a</Label>
              <Input
                id="asignado_a"
                value={statusFormData.asignado_a}
                onChange={(e) => setStatusFormData(prev => ({ ...prev, asignado_a: e.target.value }))}
                placeholder="Nombre del responsable"
                className="input-shope"
              />
            </div>
            
            <div>
              <Label htmlFor="solucion_aplicada">Solución Aplicada</Label>
              <Textarea
                id="solucion_aplicada"
                value={statusFormData.solucion_aplicada}
                onChange={(e) => setStatusFormData(prev => ({ ...prev, solucion_aplicada: e.target.value }))}
                rows={3}
                placeholder="Describe la solución aplicada para este ticket..."
                className="input-shope"
              />
            </div>
            
            <div>
              <Label htmlFor="comentarios_internos">Comentarios Internos</Label>
              <Textarea
                id="comentarios_internos"
                value={statusFormData.comentarios_internos}
                onChange={(e) => setStatusFormData(prev => ({ ...prev, comentarios_internos: e.target.value }))}
                rows={3}
                placeholder="Notas internas del equipo (no visibles para el cliente)..."
                className="input-shope"
              />
            </div>
            
            {(statusFormData.estatus === 'Resuelto' || statusFormData.estatus === 'Cerrado') && (
              <div>
                <Label htmlFor="satisfaccion_cliente">Satisfacción del Cliente (1-5)</Label>
                <Select 
                  value={statusFormData.satisfaccion_cliente.toString()} 
                  onValueChange={(value) => setStatusFormData(prev => ({ ...prev, satisfaccion_cliente: Number(value) }))}
                >
                  <SelectTrigger className="input-shope">
                    <SelectValue placeholder="Calificar satisfacción" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Sin calificar</SelectItem>
                    <SelectItem value="1">⭐ Muy insatisfecho</SelectItem>
                    <SelectItem value="2">⭐⭐ Insatisfecho</SelectItem>
                    <SelectItem value="3">⭐⭐⭐ Neutral</SelectItem>
                    <SelectItem value="4">⭐⭐⭐⭐ Satisfecho</SelectItem>
                    <SelectItem value="5">⭐⭐⭐⭐⭐ Muy satisfecho</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
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
                {loading ? '🔄 Actualizando...' : 'Actualizar Estado'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Summary */}
      <Card className="card-shope bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-indigo-600" />
            📦 Resumen de Gestión de Tickets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-4 rounded-lg border border-blue-200 text-center">
              <div className="text-blue-600 text-sm font-medium mb-1">Tickets Abiertos</div>
              <div className="text-2xl font-bold text-blue-700">
                {estadisticasMotivacionales.totalAbiertos}
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-green-200 text-center">
              <div className="text-green-600 text-sm font-medium mb-1">Tickets Resueltos</div>
              <div className="text-2xl font-bold text-green-700">
                {estadisticasMotivacionales.totalResueltos}
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-purple-200 text-center">
              <div className="text-purple-600 text-sm font-medium mb-1">Tiempo Promedio</div>
              <div className="text-2xl font-bold text-purple-700">
                {estadisticasMotivacionales.tiempoPromedioRespuesta.toFixed(1)}h
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-orange-200 text-center">
              <div className="text-orange-600 text-sm font-medium mb-1">Tasa de Resolución</div>
              <div className="text-2xl font-bold text-orange-700">
                {estadisticasMotivacionales.tasaResolucion.toFixed(1)}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
