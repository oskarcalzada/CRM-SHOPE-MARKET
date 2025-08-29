import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { FileUpload } from '@/components/ui/file-upload';
import { useAuth } from '@/context/AuthContext';
import { NotificationContext } from '@/App';
import { DataTable } from '@/components/DataTable';
import { Users, Plus, Building, Mail, Phone, FileText, Star, Trophy, Target, Gift } from 'lucide-react';

// Mensajes motivacionales de Boxito para Directorio
const MENSAJES_BOXITO_DIRECTORIO = {
  cliente: [
    "¡Perfecto! Cliente registrado con éxito ✨",
    "¡Excelente! Directorio actualizado correctamente 🎉",
    "¡Increíble! Tu gestión de clientes es impecable 💯",
    "¡Genial! Otro cliente más en la base de datos 🌟",
    "¡Boxito está orgulloso de tu organización! 🚀"
  ],
  completado: [
    "¡WOW! Cliente 100% completado 🎊",
    "¡INCREÍBLE! Información completa sin errores 🏆",
    "¡FANTÁSTICO! Documentación perfecta 💪",
    "¡ÉXITO TOTAL! Cliente completamente documentado ✨",
    "¡BOXITO CELEBRA! Tu atención al detalle es excepcional 🎯"
  ],
  consejos: [
    "💡 Tip: Información completa mejora la facturación",
    "⭐ Consejo: Documentos actualizados facilitan auditorías",
    "🎯 Meta: Clientes 100% documentados son oro",
    "📅 Recuerda: Contactos de cobro aceleran pagos",
    "💪 ¡Cada cliente bien documentado suma al éxito!"
  ],
  motivacion: [
    "¡Tu dedicación construye relaciones sólidas! 🌟",
    "¡Boxito valora tu trabajo en el directorio! 🎉",
    "¡Eres la base del éxito comercial! 💼",
    "¡Tu organización mantiene todo funcionando! ⚡",
    "¡Cada cliente registrado es un paso al crecimiento! 📈"
  ]
};

interface Cliente {
  id: string;
  id_cliente?: string;
  cliente: string;
  rfc: string;
  credito: number;
  contacto?: string;
  direccion?: string;
  mail?: string;
  tel?: string;
  constancia_fiscal?: string;
  acta_constitutiva?: string;
  identificacion?: string;
  comprobante_domicilio?: string;
  contacto_cobro1_nombre?: string;
  contacto_cobro1_correo?: string;
  contacto_cobro2_nombre?: string;
  contacto_cobro2_correo?: string;
  porcentaje_completado: number;
  created_at: string;
  updated_at: string;
}

export default function Directorio() {
  const { hasPermission } = useAuth();
  const { showNotification } = React.useContext(NotificationContext);
  const [clientes, setClientes] = React.useState<Cliente[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [showDialog, setShowDialog] = React.useState(false);
  const [editingCliente, setEditingCliente] = React.useState<Cliente | null>(null);
  const [mostrarMensajeMotivacional, setMostrarMensajeMotivacional] = React.useState(false);
  const [initialLoad, setInitialLoad] = React.useState(true);

  const [filtros, setFiltros] = React.useState({
    nombre: '',
    rfc: '',
    completado: 'all'
  });

  const [formData, setFormData] = React.useState({
    id_cliente: '',
    cliente: '',
    rfc: '',
    credito: 0,
    contacto: '',
    direccion: '',
    mail: '',
    tel: '',
    documentos: {
      constanciaFiscal: '',
      actaConstitutiva: '',
      identificacion: '',
      comprobanteDomicilio: ''
    },
    contactoCobro1: {
      nombre: '',
      correo: ''
    },
    contactoCobro2: {
      nombre: '',
      correo: ''
    }
  });

  const [documentFiles, setDocumentFiles] = React.useState<Record<string, File[]>>({
    constanciaFiscal: [],
    actaConstitutiva: [],
    identificacion: [],
    comprobanteDomicilio: []
  });

  const obtenerMensajeAleatorio = (categoria: keyof typeof MENSAJES_BOXITO_DIRECTORIO): string => {
    const mensajes = MENSAJES_BOXITO_DIRECTORIO[categoria];
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

  // Load clients
  const loadClientes = React.useCallback(async () => {
    if (!hasPermission('directorio', 'read')) {
      setLoading(false);
      setInitialLoad(false);
      return;
    }
    
    try {
      setLoading(true);
      console.log('📦 Boxito: Loading clients...');
      
      const response = await fetch('/api/clients', {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Boxito: Raw clients data:', data);
        setClientes(data);
        console.log(`📦 Boxito: Loaded ${data.length} clients`);
        
        // Mensaje de bienvenida motivacional solo en carga inicial
        if (initialLoad && data.length > 0) {
          const completos = data.filter((c: Cliente) => c.porcentaje_completado === 100).length;
          const parciales = data.filter((c: Cliente) => c.porcentaje_completado >= 50 && c.porcentaje_completado < 100).length;
          
          setTimeout(() => {
            if (completos > parciales) {
              mostrarNotificacionBoxito(`¡Increíble! Tienes ${completos} clientes 100% documentados. ¡Excelente trabajo! 🏆`, 'success');
            } else {
              mostrarNotificacionBoxito(`Tienes ${completos} clientes completos y ${parciales} por completar. ¡Vamos a documentarlos! 💪`, 'info');
            }
          }, 1000);
        }
      } else {
        console.error('📦 Boxito: Error response loading clients:', response.status);
        showNotification('Error al cargar clientes', 'error');
      }
    } catch (error) {
      console.error('📦 Boxito: Error loading clients:', error);
      showNotification('Error de conexión al cargar clientes', 'error');
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, [hasPermission, getAuthHeaders, showNotification, mostrarNotificacionBoxito, initialLoad]);

  React.useEffect(() => {
    loadClientes();
  }, [loadClientes]);

  const handleFileUpload = (documentType: string, files: File[]) => {
    setDocumentFiles(prev => ({
      ...prev,
      [documentType]: files
    }));
    
    if (files.length > 0) {
      setFormData(prev => ({
        ...prev,
        documentos: {
          ...prev.documentos,
          [documentType]: files[0].name
        }
      }));
      mostrarNotificacionBoxito(`¡Perfecto! Documento ${documentType} adjuntado correctamente 📎`, 'success');
    }
  };

  const calcularPorcentajeCompletado = (data: any): number => {
    const campos = [
      data.cliente, data.rfc, data.credito,
      data.contacto, data.direccion, data.mail, data.tel,
      data.documentos?.constanciaFiscal,
      data.documentos?.actaConstitutiva,
      data.documentos?.identificacion,
      data.documentos?.comprobanteDomicilio,
      data.contactoCobro1?.nombre && data.contactoCobro1?.correo
    ];
    
    const camposCompletos = campos.filter(campo => campo && String(campo).trim() !== '').length;
    return Math.round((camposCompletos / campos.length) * 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hasPermission('directorio', editingCliente ? 'update' : 'create')) {
      mostrarNotificacionBoxito('No tienes permisos para esta acción. ¡Contacta a tu administrador! 🔐', 'warning');
      return;
    }
    
    try {
      setLoading(true);
      
      // Mensaje de procesamiento motivacional
      const procesandoMsg = obtenerMensajeAleatorio('motivacion');
      mostrarNotificacionBoxito(`${procesandoMsg} Procesando cliente...`, 'info');
      
      const porcentajeCompletado = calcularPorcentajeCompletado(formData);
      
      const clienteData = {
        ...formData,
        porcentajeCompletado
      };
      
      const url = editingCliente 
        ? `/api/clients/${editingCliente.id}`
        : '/api/clients';
      const method = editingCliente ? 'PUT' : 'POST';
      
      console.log('📦 Boxito: Submitting client:', method, clienteData);
      
      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(clienteData)
      });
      
      if (response.ok) {
        const mensajeExito = obtenerMensajeAleatorio('cliente');
        const accion = editingCliente ? 'actualizado' : 'registrado';
        mostrarNotificacionBoxito(
          `${mensajeExito} Cliente ${formData.cliente} ${accion} con ${porcentajeCompletado}% de información 📊`,
          'success'
        );
        
        // Mensaje adicional según completado
        setTimeout(() => {
          if (porcentajeCompletado === 100) {
            const mensajeCompleto = obtenerMensajeAleatorio('completado');
            mostrarNotificacionBoxito(`${mensajeCompleto} ¡Cliente completamente documentado! 🏆`, 'success');
          } else if (porcentajeCompletado >= 80) {
            mostrarNotificacionBoxito('¡Casi perfecto! Solo faltan algunos detalles para completar al 100% 🌟', 'info');
          } else {
            mostrarNotificacionBoxito('¡Buen inicio! Cada campo completado mejora la gestión del cliente 💪', 'info');
          }
        }, 2500);
        
        setTimeout(() => {
          activarMensajeMotivacional();
        }, 5000);
        
        setShowDialog(false);
        setEditingCliente(null);
        resetForm();
        await loadClientes();
      } else {
        const errorData = await response.json();
        mostrarNotificacionBoxito(`Algo no salió como esperaba: ${errorData.error || 'Error al procesar cliente'} 😅`, 'error');
      }
    } catch (error) {
      console.error('📦 Boxito: Error submitting client:', error);
      mostrarNotificacionBoxito('Error de conexión al procesar cliente. ¡Inténtalo de nuevo! 🔄', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setFormData({
      id_cliente: cliente.id_cliente || '',
      cliente: cliente.cliente,
      rfc: cliente.rfc,
      credito: cliente.credito,
      contacto: cliente.contacto || '',
      direccion: cliente.direccion || '',
      mail: cliente.mail || '',
      tel: cliente.tel || '',
      documentos: {
        constanciaFiscal: cliente.constancia_fiscal || '',
        actaConstitutiva: cliente.acta_constitutiva || '',
        identificacion: cliente.identificacion || '',
        comprobanteDomicilio: cliente.comprobante_domicilio || ''
      },
      contactoCobro1: {
        nombre: cliente.contacto_cobro1_nombre || '',
        correo: cliente.contacto_cobro1_correo || ''
      },
      contactoCobro2: {
        nombre: cliente.contacto_cobro2_nombre || '',
        correo: cliente.contacto_cobro2_correo || ''
      }
    });
    setShowDialog(true);
    mostrarNotificacionBoxito('Editando información del cliente. ¡Perfecciona los detalles! ✏️', 'info');
  };

  const handleDelete = async (cliente: Cliente) => {
    if (!hasPermission('directorio', 'delete')) {
      mostrarNotificacionBoxito('No tienes permisos para eliminar clientes. ¡Contacta a tu administrador! 🔐', 'warning');
      return;
    }
    
    if (!confirm(`📦 Boxito pregunta: ¿Confirmas que quieres eliminar al cliente ${cliente.cliente}?`)) {
      return;
    }
    
    try {
      setLoading(true);
      
      const response = await fetch(`/api/clients/${cliente.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        mostrarNotificacionBoxito('¡Cliente eliminado exitosamente! Directorio limpio y organizado 🗑️✨', 'success');
        await loadClientes();
      } else {
        const errorData = await response.json();
        mostrarNotificacionBoxito(`Error al eliminar: ${errorData.error || 'Error desconocido'} 😅`, 'error');
      }
    } catch (error) {
      console.error('📦 Boxito: Error deleting client:', error);
      mostrarNotificacionBoxito('Error de conexión al eliminar cliente. ¡Inténtalo de nuevo! 🔄', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      id_cliente: '',
      cliente: '',
      rfc: '',
      credito: 0,
      contacto: '',
      direccion: '',
      mail: '',
      tel: '',
      documentos: {
        constanciaFiscal: '',
        actaConstitutiva: '',
        identificacion: '',
        comprobanteDomicilio: ''
      },
      contactoCobro1: {
        nombre: '',
        correo: ''
      },
      contactoCobro2: {
        nombre: '',
        correo: ''
      }
    });
    setDocumentFiles({
      constanciaFiscal: [],
      actaConstitutiva: [],
      identificacion: [],
      comprobanteDomicilio: []
    });
  };

  const clientesFiltrados = React.useMemo(() => {
    return clientes.filter(c => {
      const cumpleNombre = !filtros.nombre || c.cliente.toLowerCase().includes(filtros.nombre.toLowerCase());
      const cumpleRfc = !filtros.rfc || c.rfc.toLowerCase().includes(filtros.rfc.toLowerCase());
      const cumpleCompletado = filtros.completado === 'all' || 
        (filtros.completado === 'completo' && c.porcentaje_completado === 100) ||
        (filtros.completado === 'incompleto' && c.porcentaje_completado < 100);
      
      return cumpleNombre && cumpleRfc && cumpleCompletado;
    });
  }, [clientes, filtros]);

  // Estadísticas motivacionales
  const estadisticasMotivacionales = React.useMemo(() => {
    const clientesCompletos = clientesFiltrados.filter(c => c.porcentaje_completado === 100).length;
    const clientesParciales = clientesFiltrados.filter(c => c.porcentaje_completado >= 50 && c.porcentaje_completado < 100).length;
    const clientesIncompletos = clientesFiltrados.filter(c => c.porcentaje_completado < 50).length;
    const promedioCompletado = clientesFiltrados.length > 0 
      ? clientesFiltrados.reduce((sum, c) => sum + c.porcentaje_completado, 0) / clientesFiltrados.length 
      : 0;
    
    return {
      clientesCompletos,
      clientesParciales,
      clientesIncompletos,
      promedioCompletado
    };
  }, [clientesFiltrados]);

  const getCompletionBadge = (porcentaje: number) => {
    if (porcentaje === 100) {
      return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">✅ Completo</span>;
    } else if (porcentaje >= 80) {
      return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">🌟 Casi listo</span>;
    } else if (porcentaje >= 50) {
      return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">🔄 En progreso</span>;
    } else {
      return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">📝 Incompleto</span>;
    }
  };

  const columns = [
    { key: 'cliente', header: 'Cliente', sortable: true, filterable: true },
    { key: 'rfc', header: 'RFC', sortable: true },
    { key: 'credito', header: 'Crédito (días)', sortable: true },
    { key: 'mail', header: 'Email' },
    { key: 'tel', header: 'Teléfono' },
    { 
      key: 'porcentaje_completado', 
      header: 'Completado',
      sortable: true,
      render: (value: number, row: Cliente) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Progress value={value} className="flex-1 h-2" />
            <span className="text-sm font-medium w-12">{value}%</span>
          </div>
          {getCompletionBadge(value)}
        </div>
      )
    }
  ];

  if (!hasPermission('directorio', 'read')) {
    return (
      <div className="p-6">
        <Card className="card-shope">
          <CardContent className="p-6 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No tienes permisos para ver el directorio de clientes.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Motivacional */}
      <Card className="bg-gradient-to-r from-blue-600 to-purple-700 text-white border-0 shadow-2xl overflow-hidden relative">
        <CardContent className="p-6 relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">👥 Directorio de Clientes</h1>
              <p className="text-blue-100">
                📦 Boxito organiza tu directorio con precisión - {clientesFiltrados.length} clientes activos
              </p>
              {estadisticasMotivacionales.promedioCompletado >= 80 && (
                <div className="mt-2 flex items-center gap-2 bg-white/20 rounded-lg px-3 py-1">
                  <Trophy className="w-4 h-4" />
                  <span className="text-sm font-medium">¡Excelente documentación: {estadisticasMotivacionales.promedioCompletado.toFixed(1)}% promedio!</span>
                </div>
              )}
            </div>
            
            <div className="flex gap-3">
              {hasPermission('directorio', 'create') && (
                <Dialog open={showDialog} onOpenChange={(open) => {
                  setShowDialog(open);
                  if (!open) {
                    setEditingCliente(null);
                    resetForm();
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button className="btn-shope-secondary" onClick={resetForm}>
                      <Plus className="w-4 h-4 mr-2" />
                      Nuevo Cliente
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
        <Card className="bg-gradient-to-r from-green-500 to-blue-600 text-white border-0 shadow-xl animate-pulse">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                <span className="text-lg">📦</span>
              </div>
              <div>
                <h3 className="font-bold">¡Boxito te felicita! 🎉</h3>
                <p className="text-blue-100 text-sm">Tu organización del directorio es la base del éxito</p>
              </div>
              <Gift className="w-6 h-6 text-yellow-300 animate-bounce" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Indicadores de Rendimiento */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className={`border-2 transition-all duration-300 ${
          estadisticasMotivacionales.promedioCompletado >= 90 
            ? 'border-green-400 bg-gradient-to-br from-green-50 to-green-100' 
            : estadisticasMotivacionales.promedioCompletado >= 70 
            ? 'border-blue-400 bg-gradient-to-br from-blue-50 to-blue-100'
            : 'border-orange-400 bg-gradient-to-br from-orange-50 to-orange-100'
        }`}>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              {estadisticasMotivacionales.promedioCompletado >= 90 ? (
                <Trophy className="w-6 h-6 text-green-600" />
              ) : estadisticasMotivacionales.promedioCompletado >= 70 ? (
                <Star className="w-6 h-6 text-blue-600" />
              ) : (
                <Target className="w-6 h-6 text-orange-600" />
              )}
            </div>
            <div className="text-2xl font-bold mb-1">
              {estadisticasMotivacionales.promedioCompletado.toFixed(1)}%
            </div>
            <div className="text-sm font-medium">Documentación Promedio</div>
            <div className="text-xs mt-1">
              {estadisticasMotivacionales.promedioCompletado >= 90 ? '¡Excepcional! 🏆' : 
               estadisticasMotivacionales.promedioCompletado >= 70 ? '¡Muy bien! ⭐' : 
               '¡Mejorando! 💪'}
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-4 text-center">
            <div className="text-green-600 text-sm font-medium mb-1">100% Completos</div>
            <div className="text-2xl font-bold text-green-700 mb-1">
              {estadisticasMotivacionales.clientesCompletos}
            </div>
            <div className="text-xs text-green-600">
              {estadisticasMotivacionales.clientesCompletos > estadisticasMotivacionales.clientesIncompletos ? '¡Liderando! 🌟' : 'Progresando 📈'}
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4 text-center">
            <div className="text-blue-600 text-sm font-medium mb-1">En Progreso</div>
            <div className="text-2xl font-bold text-blue-700 mb-1">
              {estadisticasMotivacionales.clientesParciales}
            </div>
            <div className="text-xs text-blue-600">
              50-99% completados
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="p-4 text-center">
            <div className="text-orange-600 text-sm font-medium mb-1">Por Completar</div>
            <div className="text-2xl font-bold text-orange-700 mb-1">
              {estadisticasMotivacionales.clientesIncompletos}
            </div>
            <div className="text-xs text-orange-600">
              {estadisticasMotivacionales.clientesIncompletos === 0 ? '¡Todo listo! 🎯' : 'Requieren atención 📋'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="card-shope">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5 text-blue-600" />
            Filtros del Directorio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Buscar Cliente</Label>
              <Input
                placeholder="Nombre del cliente..."
                value={filtros.nombre}
                onChange={(e) => setFiltros(prev => ({ ...prev, nombre: e.target.value }))}
                className="input-shope"
              />
            </div>
            
            <div>
              <Label>RFC</Label>
              <Input
                placeholder="RFC del cliente..."
                value={filtros.rfc}
                onChange={(e) => setFiltros(prev => ({ ...prev, rfc: e.target.value }))}
                className="input-shope"
              />
            </div>
            
            <div>
              <Label>Estado de Documentación</Label>
              <select 
                value={filtros.completado} 
                onChange={(e) => {
                  setFiltros(prev => ({ ...prev, completado: e.target.value }));
                  
                  // Mensaje contextual según el filtro
                  setTimeout(() => {
                    if (e.target.value === 'completo') {
                      mostrarNotificacionBoxito('¡Revisando clientes 100% documentados! Excelente trabajo 🏆', 'success');
                    } else if (e.target.value === 'incompleto') {
                      mostrarNotificacionBoxito('Enfocándonos en clientes por completar. ¡A documentar! 💪', 'info');
                    }
                  }, 500);
                }}
                className="w-full h-9 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">🔍 Todos los clientes</option>
                <option value="completo">✅ 100% Completos</option>
                <option value="incompleto">📝 Por completar</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card className="table-shope">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Clientes Registrados ({clientesFiltrados.length})
            {estadisticasMotivacionales.clientesIncompletos === 0 && clientesFiltrados.length > 0 && (
              <div className="ml-auto flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                <Trophy className="w-4 h-4" />
                ¡Todos completos!
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <span className="text-white font-bold">👥</span>
              </div>
              <p className="text-gray-600">📦 Boxito está cargando el directorio...</p>
            </div>
          ) : (
            <DataTable
              data={clientesFiltrados}
              columns={columns}
              loading={loading}
              onEdit={hasPermission('directorio', 'update') ? handleEdit : undefined}
              onDelete={hasPermission('directorio', 'delete') ? handleDelete : undefined}
              searchPlaceholder="Buscar cliente o RFC..."
              emptyMessage="No hay clientes que coincidan con los filtros"
              exportFileName="📦_Boxito_Directorio_Clientes"
            />
          )}
        </CardContent>
      </Card>

      {/* Dialog for New/Edit Client */}
      <Dialog open={showDialog} onOpenChange={(open) => {
        setShowDialog(open);
        if (!open) {
          setEditingCliente(null);
          resetForm();
        }
      }}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCliente ? 'Editar Cliente' : 'Nuevo Cliente'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información Básica */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-700 flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  Información Básica
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cliente">Nombre del Cliente *</Label>
                  <Input
                    id="cliente"
                    value={formData.cliente}
                    onChange={(e) => setFormData(prev => ({ ...prev, cliente: e.target.value }))}
                    required
                    placeholder="Nombre completo o razón social"
                    className="input-shope"
                  />
                </div>
                
                <div>
                  <Label htmlFor="rfc">RFC *</Label>
                  <Input
                    id="rfc"
                    value={formData.rfc}
                    onChange={(e) => setFormData(prev => ({ ...prev, rfc: e.target.value.toUpperCase() }))}
                    required
                    placeholder="RFC de 12 o 13 caracteres"
                    className="input-shope"
                    maxLength={13}
                    minLength={12}
                  />
                </div>
                
                <div>
                  <Label htmlFor="id_cliente">ID Cliente (Opcional)</Label>
                  <Input
                    id="id_cliente"
                    value={formData.id_cliente}
                    onChange={(e) => setFormData(prev => ({ ...prev, id_cliente: e.target.value }))}
                    placeholder="ID interno del cliente"
                    className="input-shope"
                  />
                </div>
                
                <div>
                  <Label htmlFor="credito">Días de Crédito</Label>
                  <Input
                    id="credito"
                    type="number"
                    min="0"
                    value={formData.credito}
                    onChange={(e) => setFormData(prev => ({ ...prev, credito: Number(e.target.value) }))}
                    placeholder="Días de crédito otorgados"
                    className="input-shope"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Información de Contacto */}
            <Card className="bg-green-50 border-green-200">
              <CardHeader>
                <CardTitle className="text-green-700 flex items-center gap-2">
                  <Phone className="w-5 h-5" />
                  Información de Contacto
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contacto">Contacto Principal</Label>
                  <Input
                    id="contacto"
                    value={formData.contacto}
                    onChange={(e) => setFormData(prev => ({ ...prev, contacto: e.target.value }))}
                    placeholder="Nombre del contacto principal"
                    className="input-shope"
                  />
                </div>
                
                <div>
                  <Label htmlFor="tel">Teléfono</Label>
                  <Input
                    id="tel"
                    value={formData.tel}
                    onChange={(e) => setFormData(prev => ({ ...prev, tel: e.target.value }))}
                    placeholder="+52 xxx xxx xxxx"
                    className="input-shope"
                  />
                </div>
                
                <div>
                  <Label htmlFor="mail">Email</Label>
                  <Input
                    id="mail"
                    type="email"
                    value={formData.mail}
                    onChange={(e) => setFormData(prev => ({ ...prev, mail: e.target.value }))}
                    placeholder="cliente@empresa.com"
                    className="input-shope"
                  />
                </div>
                
                <div>
                  <Label htmlFor="direccion">Dirección</Label>
                  <Input
                    id="direccion"
                    value={formData.direccion}
                    onChange={(e) => setFormData(prev => ({ ...prev, direccion: e.target.value }))}
                    placeholder="Dirección completa"
                    className="input-shope"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Contactos de Cobro */}
            <Card className="bg-purple-50 border-purple-200">
              <CardHeader>
                <CardTitle className="text-purple-700 flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Contactos de Cobranza
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contacto_cobro1_nombre">Contacto Cobro 1 - Nombre</Label>
                    <Input
                      id="contacto_cobro1_nombre"
                      value={formData.contactoCobro1.nombre}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        contactoCobro1: { ...prev.contactoCobro1, nombre: e.target.value }
                      }))}
                      placeholder="Nombre del responsable de cuentas por pagar"
                      className="input-shope"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="contacto_cobro1_correo">Contacto Cobro 1 - Email</Label>
                    <Input
                      id="contacto_cobro1_correo"
                      type="email"
                      value={formData.contactoCobro1.correo}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        contactoCobro1: { ...prev.contactoCobro1, correo: e.target.value }
                      }))}
                      placeholder="cobranza@cliente.com"
                      className="input-shope"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="contacto_cobro2_nombre">Contacto Cobro 2 - Nombre</Label>
                    <Input
                      id="contacto_cobro2_nombre"
                      value={formData.contactoCobro2.nombre}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        contactoCobro2: { ...prev.contactoCobro2, nombre: e.target.value }
                      }))}
                      placeholder="Contacto alterno de cobranza"
                      className="input-shope"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="contacto_cobro2_correo">Contacto Cobro 2 - Email</Label>
                    <Input
                      id="contacto_cobro2_correo"
                      type="email"
                      value={formData.contactoCobro2.correo}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        contactoCobro2: { ...prev.contactoCobro2, correo: e.target.value }
                      }))}
                      placeholder="alterno@cliente.com"
                      className="input-shope"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Documentación */}
            <Card className="bg-yellow-50 border-yellow-200">
              <CardHeader>
                <CardTitle className="text-yellow-700 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Documentación Legal
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Constancia de Situación Fiscal</Label>
                  <FileUpload
                    accept=".pdf,.jpg,.jpeg,.png"
                    onFileSelect={(files) => handleFileUpload('constanciaFiscal', files)}
                    files={documentFiles.constanciaFiscal}
                    maxSize={5 * 1024 * 1024}
                  />
                </div>
                
                <div>
                  <Label>Acta Constitutiva</Label>
                  <FileUpload
                    accept=".pdf,.jpg,.jpeg,.png"
                    onFileSelect={(files) => handleFileUpload('actaConstitutiva', files)}
                    files={documentFiles.actaConstitutiva}
                    maxSize={5 * 1024 * 1024}
                  />
                </div>
                
                <div>
                  <Label>Identificación Oficial</Label>
                  <FileUpload
                    accept=".pdf,.jpg,.jpeg,.png"
                    onFileSelect={(files) => handleFileUpload('identificacion', files)}
                    files={documentFiles.identificacion}
                    maxSize={5 * 1024 * 1024}
                  />
                </div>
                
                <div>
                  <Label>Comprobante de Domicilio</Label>
                  <FileUpload
                    accept=".pdf,.jpg,.jpeg,.png"
                    onFileSelect={(files) => handleFileUpload('comprobanteDomicilio', files)}
                    files={documentFiles.comprobanteDomicilio}
                    maxSize={5 * 1024 * 1024}
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
                  setEditingCliente(null);
                  resetForm();
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="btn-shope-primary flex-1">
                {loading ? '📦 Procesando...' : (editingCliente ? 'Actualizar' : 'Registrar')} Cliente
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Summary */}
      <Card className="card-shope bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            📦 Resumen del Directorio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-4 rounded-lg border border-green-200 text-center">
              <div className="text-green-600 text-sm font-medium mb-1">Clientes 100% Documentados</div>
              <div className="text-2xl font-bold text-green-700">
                {estadisticasMotivacionales.clientesCompletos}
              </div>
              <div className="text-xs text-green-500 mt-1">
                {estadisticasMotivacionales.clientesCompletos > 20 ? '¡Impresionante! 📊' : 
                 estadisticasMotivacionales.clientesCompletos > 10 ? 'Excelente 📈' : 
                 estadisticasMotivacionales.clientesCompletos > 0 ? 'Progresando ✨' : 'Empezando 🌱'}
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-blue-200 text-center">
              <div className="text-blue-600 text-sm font-medium mb-1">Documentación Promedio</div>
              <div className="text-2xl font-bold text-blue-700">
                {estadisticasMotivacionales.promedioCompletado.toFixed(1)}%
              </div>
              <div className="text-xs text-blue-500 mt-1">
                {estadisticasMotivacionales.promedioCompletado >= 90 ? '¡Excepcional! 💎' : 
                 estadisticasMotivacionales.promedioCompletado >= 70 ? '¡Muy bien! 🚀' : 
                 estadisticasMotivacionales.promedioCompletado >= 50 ? '¡Avanzando! ⭐' : 'En desarrollo 🌱'}
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-orange-200 text-center">
              <div className="text-orange-600 text-sm font-medium mb-1">En Progreso</div>
              <div className="text-2xl font-bold text-orange-700">
                {estadisticasMotivacionales.clientesParciales}
              </div>
              <div className="text-xs text-orange-500 mt-1">
                50-99% completados
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-purple-200 text-center">
              <div className="text-purple-600 text-sm font-medium mb-1">Total Clientes</div>
              <div className="text-2xl font-bold text-purple-700">
                {clientesFiltrados.length}
              </div>
              <div className="text-xs text-purple-500 mt-1">
                {clientesFiltrados.length > 100 ? '¡Gran cartera! 💼' : 
                 clientesFiltrados.length > 50 ? 'Creciendo 📈' : 
                 clientesFiltrados.length > 0 ? 'Desarrollando 🌱' : 'Iniciando ✨'}
              </div>
            </div>
          </div>
          
          {/* Mensaje motivacional basado en performance */}
          <div className="mt-6 p-4 rounded-lg border-2 border-dashed border-blue-300 bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">📦</span>
              </div>
              <div>
                <h4 className="font-bold text-gray-800">
                  {estadisticasMotivacionales.promedioCompletado >= 90 ? '🏆 ¡DIRECTORIO EXCEPCIONAL!' :
                   estadisticasMotivacionales.promedioCompletado >= 70 ? '⭐ ¡MUY BUENA ORGANIZACIÓN!' :
                   estadisticasMotivacionales.promedioCompletado >= 50 ? '💪 ¡SIGUE ASÍ!' :
                   '🎯 ¡ENFOQUE EN DOCUMENTACIÓN!'}
                </h4>
                <p className="text-gray-600 text-sm">
                  {estadisticasMotivacionales.promedioCompletado >= 90 ? 
                    'Boxito está impresionado: Tu directorio es de nivel mundial. ¡La documentación perfecta facilita todo!' :
                   estadisticasMotivacionales.promedioCompletado >= 70 ? 
                    'Boxito dice: Tu organización está dando excelentes resultados. ¡Sigue documentando!' :
                   estadisticasMotivacionales.promedioCompletado >= 50 ? 
                    'Boxito te anima: Vas por buen camino, cada cliente documentado cuenta. ¡No te rindas!' :
                    'Boxito sugiere: Documenta paso a paso. ¡Un directorio completo es la base del éxito!'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
