import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BulkUploadPreview } from '@/components/BulkUploadPreview';
import { useAuth } from '@/context/AuthContext';
import { NotificationContext } from '@/App';
import { FileUpload } from '@/components/ui/file-upload';
import { Plus, Upload, Download, FileText, Calendar, Filter, Star, Trophy, Target, Gift, CheckCircle, Info, Eye, FileIcon, X } from 'lucide-react';
import * as XLSX from 'xlsx';

// Mensajes motivacionales de Boxito para Propuestas
const MENSAJES_BOXITO_PROPUESTAS = {
  propuesta: [
    "¡Excelente! Propuesta registrada con éxito ✨",
    "¡Perfecto! Nueva propuesta en el sistema 🎉",
    "¡Increíble! Tu gestión de propuestas es excepcional 💯",
    "¡Genial! Una propuesta más para cerrar negocios 🌟",
    "¡Boxito está orgulloso de tu trabajo! 🚀"
  ],
  vista: [
    "¡Perfecto! Vista previa cargada correctamente 👀",
    "¡Excelente! Documento listo para revisar 📄",
    "¡Increíble! Vista previa de nivel profesional ✨",
    "¡Genial! Boxito presenta tu propuesta 🎯",
    "¡Fantástico! Revisión completa disponible 💫"
  ],
  consejos: [
    "💡 Tip: Las propuestas claras cierran más ventas",
    "⭐ Consejo: Revisa siempre antes de enviar al cliente",
    "🎯 Meta: Propuestas detalladas generan confianza",
    "📊 Recuerda: Cada propuesta es una oportunidad de oro",
    "💪 ¡Cada propuesta bien hecha suma al éxito!"
  ],
  motivacion: [
    "¡Tu precisión en propuestas hace la diferencia! 🌟",
    "¡Boxito valora tu atención al detalle! 🎉",
    "¡Eres clave para cerrar negocios! 💼",
    "¡Tu trabajo genera oportunidades! ⚡",
    "¡Cada propuesta suma al crecimiento! 📈"
  ]
};

interface Proposal {
  id: string;
  id_cliente: string;
  cliente: string;
  anio: string;
  pdf: string | null;
  xlsx: string | null;
  comentarios: string | null;
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

export default function Propuestas() {
  const { hasPermission } = useAuth();
  const { showNotification } = React.useContext(NotificationContext);
  const [propuestas, setPropuestas] = React.useState<Proposal[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [showDialog, setShowDialog] = React.useState(false);
  const [showPreview, setShowPreview] = React.useState(false);
  const [showPdfPreview, setShowPdfPreview] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState<string>('');
  const [previewType, setPreviewType] = React.useState<'pdf' | 'xlsx'>('pdf');
  const [validationResult, setValidationResult] = React.useState<ValidationResult | null>(null);
  const [editingPropuesta, setEditingPropuesta] = React.useState<Proposal | null>(null);
  const [mostrarMensajeMotivacional, setMostrarMensajeMotivacional] = React.useState(false);
  const [initialLoad, setInitialLoad] = React.useState(true);

  const [filtros, setFiltros] = React.useState({
    cliente: '',
    anio: 'all'
  });

  const [formData, setFormData] = React.useState({
    id_cliente: '',
    cliente: '',
    anio: new Date().getFullYear().toString(),
    pdf: '',
    xlsx: '',
    comentarios: ''
  });

  const [pdfFiles, setPdfFiles] = React.useState<File[]>([]);
  const [xlsxFiles, setXlsxFiles] = React.useState<File[]>([]);

  const obtenerMensajeAleatorio = (categoria: keyof typeof MENSAJES_BOXITO_PROPUESTAS): string => {
    const mensajes = MENSAJES_BOXITO_PROPUESTAS[categoria];
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

  // Load proposals
  const loadPropuestas = React.useCallback(async () => {
    if (!hasPermission('propuestas', 'read')) {
      setLoading(false);
      setInitialLoad(false);
      return;
    }
    
    try {
      setLoading(true);
      console.log('📦 Boxito: Loading proposals...');
      
      const response = await fetch('/api/proposals', {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Boxito: Raw proposals data:', data);
        setPropuestas(data);
        console.log(`📦 Boxito: Loaded ${data.length} proposals`);
        
        if (initialLoad && data.length > 0) {
          setTimeout(() => {
            mostrarNotificacionBoxito(`¡Excelente! Tienes ${data.length} propuestas registradas. ¡Gran trabajo en ventas! 💼`, 'success');
          }, 1000);
        }
      } else {
        console.error('📦 Boxito: Error response loading proposals:', response.status);
        showNotification('Error al cargar propuestas', 'error');
      }
    } catch (error) {
      console.error('📦 Boxito: Error loading proposals:', error);
      showNotification('Error de conexión al cargar propuestas', 'error');
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, [hasPermission, getAuthHeaders, showNotification, mostrarNotificacionBoxito, initialLoad]);

  React.useEffect(() => {
    loadPropuestas();
  }, [loadPropuestas]);

  const handleFileUpload = (files: File[], type: 'pdf' | 'xlsx') => {
    if (type === 'pdf') {
      setPdfFiles(files);
      if (files.length > 0) {
        setFormData(prev => ({ ...prev, pdf: files[0].name }));
        mostrarNotificacionBoxito('¡Perfecto! PDF adjuntado correctamente 📎', 'success');
      }
    } else {
      setXlsxFiles(files);
      if (files.length > 0) {
        setFormData(prev => ({ ...prev, xlsx: files[0].name }));
        mostrarNotificacionBoxito('¡Perfecto! Excel adjuntado correctamente 📊', 'success');
      }
    }
  };

  const validateFormData = () => {
    if (!formData.cliente.trim()) {
      mostrarNotificacionBoxito('El cliente es obligatorio 👤', 'warning');
      return false;
    }
    
    if (!formData.anio.trim()) {
      mostrarNotificacionBoxito('El año es obligatorio 📅', 'warning');
      return false;
    }
    
    if (!formData.pdf && !formData.xlsx && pdfFiles.length === 0 && xlsxFiles.length === 0) {
      mostrarNotificacionBoxito('Debes adjuntar al menos un archivo (PDF o Excel) 📄', 'warning');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hasPermission('propuestas', 'create') && !hasPermission('propuestas', 'update')) {
      mostrarNotificacionBoxito('No tienes permisos para esta acción. ¡Contacta a tu administrador! 🔐', 'warning');
      return;
    }
    
    if (!validateFormData()) {
      return;
    }
    
    try {
      setLoading(true);
      
      const procesandoMsg = obtenerMensajeAleatorio('motivacion');
      mostrarNotificacionBoxito(`${procesandoMsg} Procesando propuesta...`, 'info');
      
      const proposalData = {
        id_cliente: formData.id_cliente.trim() || formData.cliente.trim(),
        cliente: formData.cliente.trim(),
        anio: formData.anio.trim(),
        pdf: formData.pdf.trim() || null,
        xlsx: formData.xlsx.trim() || null,
        comentarios: formData.comentarios.trim() || null
      };
      
      const url = editingPropuesta 
        ? `/api/proposals/${editingPropuesta.id}`
        : '/api/proposals';
      const method = editingPropuesta ? 'PUT' : 'POST';
      
      console.log('📦 Boxito: Submitting proposal:', method, proposalData);
      
      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(proposalData)
      });
      
      if (response.ok) {
        const result = await response.json();
        const mensajeExito = obtenerMensajeAleatorio('propuesta');
        const accion = editingPropuesta ? 'actualizada' : 'registrada';
        mostrarNotificacionBoxito(
          `${mensajeExito} Propuesta ${formData.anio} ${accion} para ${formData.cliente} 💼`,
          'success'
        );
        
        setTimeout(() => {
          mostrarNotificacionBoxito('¡Propuesta lista para presentar al cliente! Excelente trabajo comercial 🎯', 'success');
        }, 2500);
        
        setTimeout(() => {
          activarMensajeMotivacional();
        }, 5000);
        
        setShowDialog(false);
        setEditingPropuesta(null);
        resetForm();
        await loadPropuestas();
      } else {
        const errorData = await response.json();
        console.error('📦 Boxito: Error response:', errorData);
        mostrarNotificacionBoxito(`Algo no salió como esperaba: ${errorData.error || 'Error al procesar propuesta'} 😅`, 'error');
      }
    } catch (error) {
      console.error('📦 Boxito: Error submitting proposal:', error);
      mostrarNotificacionBoxito('Error de conexión al procesar propuesta. ¡Inténtalo de nuevo! 🔄', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      id_cliente: '',
      cliente: '',
      anio: new Date().getFullYear().toString(),
      pdf: '',
      xlsx: '',
      comentarios: ''
    });
    setPdfFiles([]);
    setXlsxFiles([]);
  };

  const handleEdit = (propuesta: Proposal) => {
    setEditingPropuesta(propuesta);
    setFormData({
      id_cliente: propuesta.id_cliente,
      cliente: propuesta.cliente,
      anio: propuesta.anio,
      pdf: propuesta.pdf || '',
      xlsx: propuesta.xlsx || '',
      comentarios: propuesta.comentarios || ''
    });
    setShowDialog(true);
    mostrarNotificacionBoxito('Editando propuesta. ¡Perfecciona los detalles! ✏️', 'info');
  };

  const handleDelete = async (propuesta: Proposal) => {
    if (!hasPermission('propuestas', 'delete')) {
      mostrarNotificacionBoxito('No tienes permisos para eliminar propuestas. ¡Contacta a tu administrador! 🔐', 'warning');
      return;
    }
    
    if (!confirm(`📦 Boxito pregunta: ¿Confirmas que quieres eliminar la propuesta ${propuesta.anio} de ${propuesta.cliente}?`)) {
      return;
    }
    
    try {
      setLoading(true);
      
      const response = await fetch(`/api/proposals/${propuesta.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        mostrarNotificacionBoxito('¡Propuesta eliminada exitosamente! Gestión limpia y organizada 🗑️✨', 'success');
        await loadPropuestas();
      } else {
        const errorData = await response.json();
        mostrarNotificacionBoxito(`Error al eliminar: ${errorData.error || 'Error desconocido'} 😅`, 'error');
      }
    } catch (error) {
      console.error('📦 Boxito: Error deleting proposal:', error);
      mostrarNotificacionBoxito('Error de conexión al eliminar propuesta. ¡Inténtalo de nuevo! 🔄', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = (propuesta: Proposal, type: 'pdf' | 'xlsx') => {
    const filename = type === 'pdf' ? propuesta.pdf : propuesta.xlsx;
    if (!filename) {
      mostrarNotificacionBoxito(`No hay archivo ${type.toUpperCase()} disponible para esta propuesta 📄`, 'warning');
      return;
    }

    // Simular URL del archivo (en una implementación real, esto vendría del servidor)
    const mockUrl = `./assets/proposals/${filename}`;
    setPreviewUrl(mockUrl);
    setPreviewType(type);
    setShowPdfPreview(true);
    
    const mensajeVista = obtenerMensajeAleatorio('vista');
    mostrarNotificacionBoxito(`${mensajeVista} Abriendo vista previa de ${filename}`, 'info');
  };

  const handleDownload = (propuesta: Proposal, type: 'pdf' | 'xlsx') => {
    const filename = type === 'pdf' ? propuesta.pdf : propuesta.xlsx;
    if (!filename) {
      mostrarNotificacionBoxito(`No hay archivo ${type.toUpperCase()} disponible para esta propuesta 📄`, 'warning');
      return;
    }

    // Simular descarga (en una implementación real, esto sería un enlace real del servidor)
    const link = document.createElement('a');
    link.href = `./assets/proposals/${filename}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    mostrarNotificacionBoxito(`¡Perfecto! Descargando ${filename} ⬇️`, 'success');
  };

  const propuestasFiltradas = React.useMemo(() => {
    return propuestas.filter(p => {
      const cumpleCliente = !filtros.cliente || p.cliente.toLowerCase().includes(filtros.cliente.toLowerCase());
      const cumpleAnio = filtros.anio === 'all' || p.anio === filtros.anio;
      
      return cumpleCliente && cumpleAnio;
    });
  }, [propuestas, filtros]);

  const exportarPropuestas = () => {
    if (propuestasFiltradas.length === 0) {
      mostrarNotificacionBoxito('No hay propuestas para exportar en los filtros actuales 📊', 'warning');
      return;
    }

    const datosExport = propuestasFiltradas.map((propuesta, index) => ({
      '#': index + 1,
      'Cliente': propuesta.cliente,
      'Año': propuesta.anio,
      'PDF': propuesta.pdf || 'No disponible',
      'Excel': propuesta.xlsx || 'No disponible',
      'Comentarios': propuesta.comentarios || '',
      'Fecha Creación': propuesta.created_at.split('T')[0]
    }));

    const ws = XLSX.utils.json_to_sheet(datosExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Propuestas');
    XLSX.writeFile(wb, `📦_Boxito_Propuestas_${new Date().toISOString().split('T')[0]}.xlsx`);
    mostrarNotificacionBoxito('¡Propuestas exportadas exitosamente! Tu organización es excepcional 📊✨', 'success');
  };

  const estadisticasMotivacionales = React.useMemo(() => {
    const totalPropuestas = propuestasFiltradas.length;
    const conPdf = propuestasFiltradas.filter(p => p.pdf).length;
    const conExcel = propuestasFiltradas.filter(p => p.xlsx).length;
    const completas = propuestasFiltradas.filter(p => p.pdf && p.xlsx).length;
    
    return {
      totalPropuestas,
      conPdf,
      conExcel,
      completas,
      tasaCompletitud: totalPropuestas > 0 ? (completas / totalPropuestas) * 100 : 0
    };
  }, [propuestasFiltradas]);

  if (!hasPermission('propuestas', 'read')) {
    return (
      <div className="p-6">
        <Card className="card-shope">
          <CardContent className="p-6 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No tienes permisos para ver las propuestas.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Motivacional */}
      <Card className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white border-0 shadow-2xl overflow-hidden relative">
        <CardContent className="p-6 relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">📋 Propuestas Comerciales</h1>
              <p className="text-purple-100">
                📦 Boxito gestiona tus propuestas con excelencia - {propuestasFiltradas.length} propuestas activas
              </p>
              {estadisticasMotivacionales.tasaCompletitud >= 80 && (
                <div className="mt-2 flex items-center gap-2 bg-white/20 rounded-lg px-3 py-1">
                  <Trophy className="w-4 h-4" />
                  <span className="text-sm font-medium">¡Excelente completitud: {estadisticasMotivacionales.tasaCompletitud.toFixed(1)}%!</span>
                </div>
              )}
            </div>
            
            <div className="flex gap-3">
              <Button 
                onClick={exportarPropuestas} 
                variant="secondary" 
                className="bg-white/20 hover:bg-white/30 text-white border-white/20"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar Excel
              </Button>
              
              {hasPermission('propuestas', 'create') && (
                <Dialog open={showDialog} onOpenChange={(open) => {
                  setShowDialog(open);
                  if (!open) {
                    setEditingPropuesta(null);
                    resetForm();
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button className="btn-shope-secondary" onClick={resetForm}>
                      <Plus className="w-4 h-4 mr-2" />
                      Nueva Propuesta
                    </Button>
                  </DialogTrigger>
                </Dialog>
              )}
            </div>
          </div>
        </CardContent>
        
        <div className="absolute top-4 right-4 opacity-10">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
            <span className="text-2xl">📋</span>
          </div>
        </div>
      </Card>

      {/* Mensaje Motivacional Emergente */}
      {mostrarMensajeMotivacional && (
        <Card className="bg-gradient-to-r from-green-500 to-blue-600 text-white border-0 shadow-xl animate-pulse">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                <span className="text-lg">📋</span>
              </div>
              <div>
                <h3 className="font-bold">¡Boxito te felicita! 🎉</h3>
                <p className="text-blue-100 text-sm">Tu gestión de propuestas impulsa el crecimiento comercial</p>
              </div>
              <Gift className="w-6 h-6 text-yellow-300 animate-bounce" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="card-shope">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-purple-600" />
            Filtros de Propuestas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <Label>Año</Label>
              <Select value={filtros.anio} onValueChange={(value) => setFiltros(prev => ({ ...prev, anio: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">🔍 Todos los años</SelectItem>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card className="table-shope">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-600" />
            Propuestas Comerciales ({propuestasFiltradas.length})
            {estadisticasMotivacionales.completas === propuestasFiltradas.length && propuestasFiltradas.length > 0 && (
              <div className="ml-auto flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                <Trophy className="w-4 h-4" />
                ¡Todas completas!
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <span className="text-white font-bold">📋</span>
              </div>
              <p className="text-gray-600">📦 Boxito está cargando las propuestas...</p>
            </div>
          ) : propuestasFiltradas.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-bold text-purple-700 mb-2">
                📋 No hay propuestas que coincidan con los filtros
              </h3>
              <p className="text-purple-600">
                Boxito sugiere: Ajusta los filtros o crea una nueva propuesta
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-purple-600 to-indigo-700">
                    <TableHead className="text-white font-semibold">Cliente</TableHead>
                    <TableHead className="text-white font-semibold">Año</TableHead>
                    <TableHead className="text-white font-semibold">PDF</TableHead>
                    <TableHead className="text-white font-semibold">Excel</TableHead>
                    <TableHead className="text-white font-semibold">Comentarios</TableHead>
                    <TableHead className="text-white font-semibold">Fecha Creación</TableHead>
                    <TableHead className="text-white font-semibold">📦 Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {propuestasFiltradas.map((propuesta) => (
                    <TableRow key={propuesta.id} className="hover:bg-purple-50 transition-colors">
                      <TableCell className="font-medium">
                        {propuesta.cliente}
                      </TableCell>
                      <TableCell className="font-bold text-purple-600">
                        {propuesta.anio}
                      </TableCell>
                      <TableCell>
                        {propuesta.pdf ? (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePreview(propuesta, 'pdf')}
                              className="text-blue-600 hover:bg-blue-100"
                              title="Vista previa"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(propuesta, 'pdf')}
                              className="text-green-600 hover:bg-green-100"
                              title="Descargar"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-gray-400">Sin PDF</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {propuesta.xlsx ? (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePreview(propuesta, 'xlsx')}
                              className="text-blue-600 hover:bg-blue-100"
                              title="Vista previa"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(propuesta, 'xlsx')}
                              className="text-green-600 hover:bg-green-100"
                              title="Descargar"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-gray-400">Sin Excel</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-32 truncate" title={propuesta.comentarios || ''}>
                        {propuesta.comentarios || '-'}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {propuesta.created_at.split('T')[0]}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {hasPermission('propuestas', 'update') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(propuesta)}
                              className="hover:bg-purple-100 text-purple-600 hover:scale-105 transition-transform"
                            >
                              ✏️ Editar
                            </Button>
                          )}
                          {hasPermission('propuestas', 'delete') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(propuesta)}
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

      {/* Dialog for New/Edit Proposal */}
      <Dialog open={showDialog} onOpenChange={(open) => {
        setShowDialog(open);
        if (!open) {
          setEditingPropuesta(null);
          resetForm();
        }
      }}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPropuesta ? 'Editar Propuesta' : 'Nueva Propuesta Comercial'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card className="bg-purple-50 border-purple-200">
              <CardHeader>
                <CardTitle className="text-purple-700 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Información de la Propuesta
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
                  <Label htmlFor="anio">Año *</Label>
                  <Select value={formData.anio} onValueChange={(value) => setFormData(prev => ({ ...prev, anio: value }))}>
                    <SelectTrigger className="input-shope">
                      <SelectValue placeholder="Selecciona el año" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2024">2024</SelectItem>
                      <SelectItem value="2025">2025</SelectItem>
                      <SelectItem value="2026">2026</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="col-span-2">
                  <Label htmlFor="comentarios">Comentarios</Label>
                  <Textarea
                    id="comentarios"
                    value={formData.comentarios}
                    onChange={(e) => setFormData(prev => ({ ...prev, comentarios: e.target.value }))}
                    placeholder="Comentarios adicionales sobre la propuesta"
                    className="input-shope"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-700 flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Archivos de la Propuesta
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Archivo PDF</Label>
                  <FileUpload
                    accept=".pdf"
                    onFileSelect={(files) => handleFileUpload(files, 'pdf')}
                    files={pdfFiles}
                    maxSize={50 * 1024 * 1024} // 50MB
                  />
                </div>
                
                <div>
                  <Label>Archivo Excel</Label>
                  <FileUpload
                    accept=".xlsx,.xls"
                    onFileSelect={(files) => handleFileUpload(files, 'xlsx')}
                    files={xlsxFiles}
                    maxSize={50 * 1024 * 1024} // 50MB
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
                  setEditingPropuesta(null);
                  resetForm();
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="btn-shope-primary flex-1">
                {loading ? '📦 Procesando...' : (editingPropuesta ? 'Actualizar' : 'Registrar')} Propuesta
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Vista Previa de Documentos */}
      <Dialog open={showPdfPreview} onOpenChange={setShowPdfPreview}>
        <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" />
              Vista Previa del Documento {previewType.toUpperCase()}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPdfPreview(false)}
                className="ml-auto"
              >
                <X className="w-4 h-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          <div className="h-[70vh] bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
            {previewType === 'pdf' ? (
              <div className="text-center">
                <FileIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Vista Previa de PDF</h3>
                <p className="text-gray-600 mb-4">
                  En una implementación real, aquí se mostraría el PDF embebido
                </p>
                <div className="bg-white p-6 rounded-lg shadow-lg max-w-md mx-auto">
                  <div className="text-center">
                    <h4 className="font-bold text-red-600 mb-2">📋 PROPUESTA COMERCIAL 2025</h4>
                    <p className="text-sm text-gray-600 mb-4">SHOPE ENVÍOS - SERVICIOS DE PAQUETERÍA</p>
                    <div className="space-y-2 text-left text-xs">
                      <p><strong>Cliente:</strong> Empresa Demo SA</p>
                      <p><strong>Vigencia:</strong> 365 días</p>
                      <p><strong>Descuentos:</strong> Hasta 15%</p>
                      <p><strong>Zonas:</strong> Nacional e Internacional</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <FileIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Vista Previa de Excel</h3>
                <p className="text-gray-600 mb-4">
                  En una implementación real, aquí se mostraría el Excel como tabla
                </p>
                <div className="bg-white p-6 rounded-lg shadow-lg max-w-md mx-auto">
                  <div className="text-center">
                    <h4 className="font-bold text-green-600 mb-2">📊 TARIFARIO 2025</h4>
                    <table className="w-full text-xs border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-green-100">
                          <th className="border border-gray-300 p-1">Zona</th>
                          <th className="border border-gray-300 p-1">Peso</th>
                          <th className="border border-gray-300 p-1">Precio</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-gray-300 p-1">Local</td>
                          <td className="border border-gray-300 p-1">1-5kg</td>
                          <td className="border border-gray-300 p-1">$120</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 p-1">Nacional</td>
                          <td className="border border-gray-300 p-1">1-5kg</td>
                          <td className="border border-gray-300 p-1">$180</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowPdfPreview(false)}
              className="flex-1"
            >
              Cerrar Vista Previa
            </Button>
            <Button 
              onClick={() => {
                // Simular descarga desde la vista previa
                mostrarNotificacionBoxito('¡Descarga iniciada desde la vista previa! 📥', 'success');
              }}
              className="btn-shope-primary flex-1"
            >
              <Download className="w-4 h-4 mr-2" />
              Descargar Documento
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Summary */}
      <Card className="card-shope bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-purple-600" />
            📦 Resumen de Propuestas Comerciales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-4 rounded-lg border border-purple-200 text-center">
              <div className="text-purple-600 text-sm font-medium mb-1">Total Propuestas</div>
              <div className="text-2xl font-bold text-purple-700">
                {estadisticasMotivacionales.totalPropuestas}
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-red-200 text-center">
              <div className="text-red-600 text-sm font-medium mb-1">Con PDF</div>
              <div className="text-2xl font-bold text-red-700">
                {estadisticasMotivacionales.conPdf}
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-green-200 text-center">
              <div className="text-green-600 text-sm font-medium mb-1">Con Excel</div>
              <div className="text-2xl font-bold text-green-700">
                {estadisticasMotivacionales.conExcel}
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-blue-200 text-center">
              <div className="text-blue-600 text-sm font-medium mb-1">Completitud</div>
              <div className="text-2xl font-bold text-blue-700">
                {estadisticasMotivacionales.tasaCompletitud.toFixed(1)}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
