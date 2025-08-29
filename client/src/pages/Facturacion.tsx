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
import { Plus, Upload, Download, FileText, Calendar, Filter, Star, Trophy, Target, Gift, CheckCircle, Info } from 'lucide-react';
import * as XLSX from 'xlsx';

const MESES_NOMBRES = [
  "Todos los meses", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

// Mensajes motivacionales de Boxito para Facturación
const MENSAJES_BOXITO_FACTURACION = {
  factura: [
    "¡Perfecto! Factura registrada con éxito ✨",
    "¡Excelente! Todo salió genial en el registro 🎉",
    "¡Increíble! Tu gestión de facturación es impecable 💯",
    "¡Genial! Otra factura más en el sistema 🌟",
    "¡Boxito está orgulloso de tu trabajo! 🚀"
  ],
  cargaMasiva: [
    "¡WOW! Carga masiva completada exitosamente 🎊",
    "¡INCREÍBLE! Procesamiento masivo sin errores 🏆",
    "¡FANTÁSTICO! Todas las facturas fueron procesadas 💪",
    "¡ÉXITO TOTAL! Carga masiva de nivel profesional ✨",
    "¡BOXITO CELEBRA! Tu eficiencia es excepcional 🎯"
  ],
  consejos: [
    "💡 Tip: RFC correctos facilitan la facturación electrónica",
    "⭐ Consejo: Fechas de vencimiento precisas mejoran el cobro",
    "🎯 Meta: Facturas completas desde el inicio ahorran tiempo",
    "📅 Recuerda: Créditos justos mantienen buenas relaciones",
    "💪 ¡Cada factura bien hecha suma al éxito empresarial!"
  ],
  motivacion: [
    "¡Tu precisión en facturación hace la diferencia! 🌟",
    "¡Boxito valora tu atención al detalle! 🎉",
    "¡Eres la base del flujo de efectivo! 💼",
    "¡Tu trabajo mantiene el negocio en movimiento! ⚡",
    "¡Cada factura registrada suma al crecimiento! 📈"
  ],
  validacion: [
    "¡Datos validados exitosamente! Listos para procesar 🔍",
    "¡Validación completa! Todo está en orden 📋",
    "¡Análisis terminado! Información verificada ✅",
    "¡Control de calidad aprobado! Excelente trabajo 🎯",
    "¡Boxito certifica: Datos impecables! 🏆"
  ]
};

interface Invoice {
  id: string;
  numero_comprobante: string;
  cliente: string;
  rfc: string;
  paqueteria: string;
  credito: number;
  fecha_creacion: string;
  fecha_vencimiento: string;
  total: number;
  pago1: number;
  fecha_pago1: string | null;
  pago2: number;
  fecha_pago2: string | null;
  pago3: number;
  fecha_pago3: string | null;
  nc: number;
  por_cobrar: number;
  estatus: 'Pendiente' | 'Pagada';
  comentarios?: string;
  cfdi?: string;
  soporte?: string;
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

export default function Facturacion() {
  const { hasPermission } = useAuth();
  const { showNotification } = React.useContext(NotificationContext);
  const [facturas, setFacturas] = React.useState<Invoice[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [showDialog, setShowDialog] = React.useState(false);
  const [showPreview, setShowPreview] = React.useState(false);
  const [validationResult, setValidationResult] = React.useState<ValidationResult | null>(null);
  const [editingFactura, setEditingFactura] = React.useState<Invoice | null>(null);
  const [mostrarMensajeMotivacional, setMostrarMensajeMotivacional] = React.useState(false);
  const [initialLoad, setInitialLoad] = React.useState(true);

  const [filtros, setFiltros] = React.useState({
    estatus: 'all',
    cliente: '',
    numero: '',
    mes: '0'
  });

  const [formData, setFormData] = React.useState({
    numero_comprobante: '',
    cliente: '',
    rfc: '',
    paqueteria: '',
    credito: 0,
    fecha_creacion: new Date().toISOString().split('T')[0],
    fecha_vencimiento: '',
    total: 0,
    pago1: 0,
    fecha_pago1: '',
    pago2: 0,
    fecha_pago2: '',
    pago3: 0,
    fecha_pago3: '',
    nc: 0,
    por_cobrar: 0,
    estatus: 'Pendiente' as 'Pendiente' | 'Pagada',
    comentarios: '',
    cfdi: '',
    soporte: ''
  });

  const [cfdiFiles, setCfdiFiles] = React.useState<File[]>([]);
  const [soporteFiles, setSoporteFiles] = React.useState<File[]>([]);

  const obtenerMensajeAleatorio = (categoria: keyof typeof MENSAJES_BOXITO_FACTURACION): string => {
    const mensajes = MENSAJES_BOXITO_FACTURACION[categoria];
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

  // Load invoices
  const loadFacturas = React.useCallback(async () => {
    if (!hasPermission('facturacion', 'read')) {
      setLoading(false);
      setInitialLoad(false);
      return;
    }
    
    try {
      setLoading(true);
      console.log('📦 Boxito: Loading invoices...');
      
      const response = await fetch('/api/invoices', {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Boxito: Raw invoices data:', data);
        setFacturas(data);
        console.log(`📦 Boxito: Loaded ${data.length} invoices`);
        
        // Mensaje de bienvenida motivacional solo en carga inicial
        if (initialLoad && data.length > 0) {
          const pagadas = data.filter((f: Invoice) => f.estatus === 'Pagada').length;
          const pendientes = data.filter((f: Invoice) => f.estatus === 'Pendiente').length;
          
          setTimeout(() => {
            if (pagadas > pendientes) {
              mostrarNotificacionBoxito(`¡Increíble! Tienes ${pagadas} facturas pagadas vs ${pendientes} pendientes. ¡Excelente gestión! 🏆`, 'success');
            } else {
              mostrarNotificacionBoxito(`Tienes ${data.length} facturas registradas: ${pagadas} pagadas y ${pendientes} pendientes. ¡Gran trabajo! 💪`, 'info');
            }
          }, 1000);
        }
      } else {
        console.error('📦 Boxito: Error response loading invoices:', response.status);
        showNotification('Error al cargar facturas', 'error');
      }
    } catch (error) {
      console.error('📦 Boxito: Error loading invoices:', error);
      showNotification('Error de conexión al cargar facturas', 'error');
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, [hasPermission, getAuthHeaders, showNotification, mostrarNotificacionBoxito, initialLoad]);

  React.useEffect(() => {
    loadFacturas();
  }, [loadFacturas]);

  // FUNCIÓN UNIFICADA para extraer mes sin problemas de zona horaria
  const getMonthFromYYYYMMDD = (fechaYYYYMMDD: string): number => {
    if (typeof fechaYYYYMMDD !== 'string' || !fechaYYYYMMDD.match(/^\d{4}-\d{2}-\d{2}$/)) {
      console.error(`📦 Facturación: Formato de fecha inválido: ${fechaYYYYMMDD}`);
      return 0;
    }
    
    const partes = fechaYYYYMMDD.split('-');
    const mes = parseInt(partes[1], 10);
    console.log(`📦 Facturación: ${fechaYYYYMMDD} → Mes: ${mes}`);
    return mes;
  };

  // Auto-calculate dates and values
  React.useEffect(() => {
    if (formData.fecha_creacion && formData.credito > 0) {
      const fechaCreacion = new Date(formData.fecha_creacion + 'T12:00:00');
      fechaCreacion.setDate(fechaCreacion.getDate() + formData.credito);
      setFormData(prev => ({
        ...prev,
        fecha_vencimiento: fechaCreacion.toISOString().split('T')[0]
      }));
    }
  }, [formData.fecha_creacion, formData.credito]);

  React.useEffect(() => {
    const totalPagado = (formData.pago1 || 0) + (formData.pago2 || 0) + (formData.pago3 || 0) + (formData.nc || 0);
    const porCobrar = Math.max(0, (formData.total || 0) - totalPagado);
    const estatus = porCobrar <= 0 ? 'Pagada' : 'Pendiente';
    
    setFormData(prev => ({
      ...prev,
      por_cobrar: porCobrar,
      estatus
    }));
  }, [formData.total, formData.pago1, formData.pago2, formData.pago3, formData.nc]);

  const handleFileUpload = (files: File[], type: 'cfdi' | 'soporte') => {
    if (type === 'cfdi') {
      setCfdiFiles(files);
      if (files.length > 0) {
        setFormData(prev => ({ ...prev, cfdi: files[0].name }));
        mostrarNotificacionBoxito('¡Perfecto! CFDI adjuntado correctamente 📎', 'success');
      }
    } else {
      setSoporteFiles(files);
      if (files.length > 0) {
        setFormData(prev => ({ ...prev, soporte: files[0].name }));
        mostrarNotificacionBoxito('¡Perfecto! Archivo de soporte adjuntado correctamente 📎', 'success');
      }
    }
  };

  const validateFormData = () => {
    if (!formData.numero_comprobante.trim()) {
      mostrarNotificacionBoxito('El número de comprobante es obligatorio 📄', 'warning');
      return false;
    }
    
    if (!formData.cliente.trim()) {
      mostrarNotificacionBoxito('El cliente es obligatorio 👤', 'warning');
      return false;
    }
    
    if (!formData.rfc.trim() || formData.rfc.trim().length < 12) {
      mostrarNotificacionBoxito('RFC debe tener al menos 12 caracteres 🆔', 'warning');
      return false;
    }
    
    if (!formData.paqueteria.trim()) {
      mostrarNotificacionBoxito('La paquetería es obligatoria 📦', 'warning');
      return false;
    }
    
    if (formData.total <= 0) {
      mostrarNotificacionBoxito('El total debe ser mayor a cero 💰', 'warning');
      return false;
    }
    
    if (!formData.fecha_creacion) {
      mostrarNotificacionBoxito('La fecha de creación es obligatoria 📅', 'warning');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hasPermission('facturacion', 'create') && !hasPermission('facturacion', 'update')) {
      mostrarNotificacionBoxito('No tienes permisos para esta acción. ¡Contacta a tu administrador! 🔐', 'warning');
      return;
    }
    
    if (!validateFormData()) {
      return;
    }
    
    try {
      setLoading(true);
      
      const procesandoMsg = obtenerMensajeAleatorio('motivacion');
      mostrarNotificacionBoxito(`${procesandoMsg} Procesando factura...`, 'info');
      
      const invoiceData = {
        paqueteria: formData.paqueteria.trim(),
        numero_comprobante: formData.numero_comprobante.trim(),
        cliente: formData.cliente.trim(),
        rfc: formData.rfc.trim().toUpperCase(),
        credito: formData.credito,
        fecha_creacion: formData.fecha_creacion,
        fecha_vencimiento: formData.fecha_vencimiento,
        total: formData.total,
        pago1: formData.pago1 || 0,
        fecha_pago1: formData.fecha_pago1 || null,
        pago2: formData.pago2 || 0,
        fecha_pago2: formData.fecha_pago2 || null,
        pago3: formData.pago3 || 0,
        fecha_pago3: formData.fecha_pago3 || null,
        nc: formData.nc || 0,
        por_cobrar: formData.por_cobrar,
        estatus: formData.estatus,
        comentarios: formData.comentarios.trim() || undefined,
        cfdi: formData.cfdi.trim() || undefined,
        soporte: formData.soporte.trim() || undefined
      };
      
      const url = editingFactura 
        ? `/api/invoices/${editingFactura.id}`
        : '/api/invoices';
      const method = editingFactura ? 'PUT' : 'POST';
      
      console.log('📦 Boxito: Submitting invoice:', method, invoiceData);
      
      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(invoiceData)
      });
      
      if (response.ok) {
        const result = await response.json();
        const mensajeExito = obtenerMensajeAleatorio('factura');
        const accion = editingFactura ? 'actualizada' : 'registrada';
        mostrarNotificacionBoxito(
          `${mensajeExito} Factura ${formData.numero_comprobante} ${accion} para ${formData.cliente} por $${formData.total.toLocaleString('es-MX')} 💰`,
          'success'
        );
        
        setTimeout(() => {
          if (formData.estatus === 'Pagada') {
            mostrarNotificacionBoxito('¡Factura PAGADA registrada! Excelente flujo de efectivo 🏆', 'success');
          } else {
            mostrarNotificacionBoxito('¡Factura registrada! Lista para gestión de cobranza 📊', 'info');
          }
        }, 2500);
        
        setTimeout(() => {
          activarMensajeMotivacional();
        }, 5000);
        
        setShowDialog(false);
        setEditingFactura(null);
        resetForm();
        await loadFacturas();
      } else {
        const errorData = await response.json();
        console.error('📦 Boxito: Error response:', errorData);
        
        if (errorData.details && Array.isArray(errorData.details)) {
          const errorMessages = errorData.details.join(', ');
          mostrarNotificacionBoxito(`Errores de validación: ${errorMessages} 📝`, 'warning');
        } else {
          mostrarNotificacionBoxito(`Algo no salió como esperaba: ${errorData.error || 'Error al procesar factura'} 😅`, 'error');
        }
      }
    } catch (error) {
      console.error('📦 Boxito: Error submitting invoice:', error);
      mostrarNotificacionBoxito('Error de conexión al procesar factura. ¡Inténtalo de nuevo! 🔄', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      numero_comprobante: '',
      cliente: '',
      rfc: '',
      paqueteria: '',
      credito: 0,
      fecha_creacion: new Date().toISOString().split('T')[0],
      fecha_vencimiento: '',
      total: 0,
      pago1: 0,
      fecha_pago1: '',
      pago2: 0,
      fecha_pago2: '',
      pago3: 0,
      fecha_pago3: '',
      nc: 0,
      por_cobrar: 0,
      estatus: 'Pendiente',
      comentarios: '',
      cfdi: '',
      soporte: ''
    });
    setCfdiFiles([]);
    setSoporteFiles([]);
  };

  const handleEdit = (factura: Invoice) => {
    setEditingFactura(factura);
    setFormData({
      numero_comprobante: factura.numero_comprobante,
      cliente: factura.cliente,
      rfc: factura.rfc,
      paqueteria: factura.paqueteria,
      credito: factura.credito,
      fecha_creacion: factura.fecha_creacion,
      fecha_vencimiento: factura.fecha_vencimiento,
      total: factura.total,
      pago1: factura.pago1,
      fecha_pago1: factura.fecha_pago1 || '',
      pago2: factura.pago2,
      fecha_pago2: factura.fecha_pago2 || '',
      pago3: factura.pago3,
      fecha_pago3: factura.fecha_pago3 || '',
      nc: factura.nc,
      por_cobrar: factura.por_cobrar,
      estatus: factura.estatus,
      comentarios: factura.comentarios || '',
      cfdi: factura.cfdi || '',
      soporte: factura.soporte || ''
    });
    setShowDialog(true);
    mostrarNotificacionBoxito('Editando factura. ¡Perfecciona los detalles! ✏️', 'info');
  };

  const handleDelete = async (factura: Invoice) => {
    if (!hasPermission('facturacion', 'delete')) {
      mostrarNotificacionBoxito('No tienes permisos para eliminar facturas. ¡Contacta a tu administrador! 🔐', 'warning');
      return;
    }
    
    if (!confirm(`📦 Boxito pregunta: ¿Confirmas que quieres eliminar la factura ${factura.numero_comprobante}?`)) {
      return;
    }
    
    try {
      setLoading(true);
      
      const response = await fetch(`/api/invoices/${factura.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        mostrarNotificacionBoxito('¡Factura eliminada exitosamente! Gestión limpia y organizada 🗑️✨', 'success');
        await loadFacturas();
      } else {
        const errorData = await response.json();
        mostrarNotificacionBoxito(`Error al eliminar: ${errorData.error || 'Error desconocido'} 😅`, 'error');
      }
    } catch (error) {
      console.error('📦 Boxito: Error deleting invoice:', error);
      mostrarNotificacionBoxito('Error de conexión al eliminar factura. ¡Inténtalo de nuevo! 🔄', 'error');
    } finally {
      setLoading(false);
    }
  };

  const facturasFiltradas = React.useMemo(() => {
    return facturas.filter(f => {
      const cumpleEstatus = filtros.estatus === 'all' || f.estatus === filtros.estatus;
      const cumpleCliente = !filtros.cliente || f.cliente.toLowerCase().includes(filtros.cliente.toLowerCase());
      const cumpleNumero = !filtros.numero || f.numero_comprobante.toLowerCase().includes(filtros.numero.toLowerCase());
      
      // Filtro por mes usando función unificada
      let cumpleMes = true;
      if (filtros.mes !== '0') {
        const mesFactura = getMonthFromYYYYMMDD(f.fecha_creacion);
        const mesSeleccionado = parseInt(filtros.mes);
        cumpleMes = mesFactura === mesSeleccionado;
      }
      
      return cumpleEstatus && cumpleCliente && cumpleNumero && cumpleMes;
    });
  }, [facturas, filtros]);

  // Validate Excel file and prepare preview
  const validarArchivo = async (file: File) => {
    mostrarNotificacionBoxito('Analizando tu archivo con inteligencia Boxito... 🔍', 'info');
    
    return new Promise<ValidationResult>((resolve) => {
      const reader = new FileReader();
      reader.onload = function(evt) {
        try {
          const data = new Uint8Array(evt.target.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false }) as any[][];
          
          const resultado: ValidationResult = {
            totalLineas: 0,
            lineasCorrectas: 0,
            lineasConErrores: 0,
            lineasConAdvertencias: 0,
            errores: [],
            datosCorrectos: [],
            datosConErrores: []
          };
          
          // Procesar cada fila (saltando header)
          json.slice(1).forEach((row, index) => {
            const numeroFila = index + 2;
            
            if (!row || row.length === 0 || !row[0]) {
              return;
            }
            
            resultado.totalLineas++;
            
            const [paqueteria, numero_comprobante, cliente, rfc, credito, fecha_creacion, fecha_vencimiento, total] = row;
            let tieneErrores = false;
            
            // Validaciones obligatorias
            if (!paqueteria) {
              resultado.errores.push({
                fila: numeroFila,
                campo: 'paqueteria',
                valor: paqueteria,
                error: 'Paquetería es obligatoria',
                severidad: 'error'
              });
              tieneErrores = true;
            }
            
            if (!numero_comprobante) {
              resultado.errores.push({
                fila: numeroFila,
                campo: 'numero_comprobante',
                valor: numero_comprobante,
                error: 'Número de comprobante es obligatorio',
                severidad: 'error'
              });
              tieneErrores = true;
            }
            
            if (!cliente) {
              resultado.errores.push({
                fila: numeroFila,
                campo: 'cliente',
                valor: cliente,
                error: 'Cliente es obligatorio',
                severidad: 'error'
              });
              tieneErrores = true;
            }
            
            if (!rfc || String(rfc).length < 12) {
              resultado.errores.push({
                fila: numeroFila,
                campo: 'rfc',
                valor: rfc,
                error: 'RFC debe tener al menos 12 caracteres',
                severidad: 'error'
              });
              tieneErrores = true;
            }
            
            if (!total || isNaN(parseFloat(String(total).replace(',', '')))) {
              resultado.errores.push({
                fila: numeroFila,
                campo: 'total',
                valor: total,
                error: 'Total debe ser un número válido',
                severidad: 'error'
              });
              tieneErrores = true;
            }
            
            if (!fecha_creacion) {
              resultado.errores.push({
                fila: numeroFila,
                campo: 'fecha_creacion',
                valor: fecha_creacion,
                error: 'Fecha de creación es obligatoria',
                severidad: 'error'
              });
              tieneErrores = true;
            }
            
            // Si no hay errores, agregar a datos correctos
            if (!tieneErrores) {
              try {
                const facturaData = {
                  paqueteria: String(paqueteria).trim(),
                  numero_comprobante: String(numero_comprobante).trim(),
                  cliente: String(cliente).trim(),
                  rfc: String(rfc).trim().toUpperCase(),
                  credito: Number(credito) || 0,
                  fecha_creacion: String(fecha_creacion),
                  fecha_vencimiento: String(fecha_vencimiento) || '',
                  total: parseFloat(String(total).replace(',', '')),
                  pago1: 0,
                  fecha_pago1: null,
                  pago2: 0,
                  fecha_pago2: null,
                  pago3: 0,
                  fecha_pago3: null,
                  nc: 0,
                  por_cobrar: parseFloat(String(total).replace(',', '')),
                  estatus: 'Pendiente' as 'Pendiente' | 'Pagada',
                  comentarios: '',
                  cfdi: '',
                  soporte: ''
                };
                
                resultado.datosCorrectos.push(facturaData);
                resultado.lineasCorrectas++;
              } catch (processingError) {
                resultado.errores.push({
                  fila: numeroFila,
                  campo: 'general',
                  valor: 'N/A',
                  error: `Error procesando línea: ${processingError}`,
                  severidad: 'error'
                });
                tieneErrores = true;
              }
            }
            
            if (tieneErrores) {
              resultado.lineasConErrores++;
              resultado.datosConErrores.push(row);
            }
          });
          
          const mensajeValidacion = obtenerMensajeAleatorio('validacion');
          setTimeout(() => {
            mostrarNotificacionBoxito(`${mensajeValidacion} Análisis completo: ${resultado.lineasCorrectas} líneas correctas de ${resultado.totalLineas} 📊`, 'info');
          }, 1500);
          
          resolve(resultado);
        } catch (error) {
          console.error('Error processing file:', error);
          resolve({
            totalLineas: 0,
            lineasCorrectas: 0,
            lineasConErrores: 1,
            lineasConAdvertencias: 0,
            errores: [{
              fila: 1,
              campo: 'archivo',
              valor: file.name,
              error: `Error procesando archivo: ${error}`,
              severidad: 'error'
            }],
            datosCorrectos: [],
            datosConErrores: []
          });
        }
      };
      
      reader.readAsArrayBuffer(file);
    });
  };

  const procesarCargaMasiva = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const mensajeInicio = obtenerMensajeAleatorio('motivacion');
    mostrarNotificacionBoxito(`${mensajeInicio} Boxito está analizando tu archivo...`, 'info');
    
    try {
      const resultado = await validarArchivo(file);
      setValidationResult(resultado);
      setShowPreview(true);
      
      if (resultado.lineasConErrores === 0) {
        mostrarNotificacionBoxito('¡PERFECTO! Archivo sin errores. ¡Listo para procesar! 🏆', 'success');
      } else {
        mostrarNotificacionBoxito(`Análisis completo: ${resultado.lineasCorrectas} líneas correctas encontradas. ¡Revisemos los detalles! 📋`, 'info');
      }
    } catch (error) {
      console.error('Error analyzing file:', error);
      mostrarNotificacionBoxito('Error al analizar el archivo. ¡Verifica el formato! 📄', 'error');
    }
    
    e.target.value = '';
  };

  const confirmarCargaMasiva = async (datosCorrectos: any[]) => {
    if (!hasPermission('facturacion', 'create')) {
      mostrarNotificacionBoxito('No tienes permisos para crear facturas. ¡Contacta a tu administrador! 🔐', 'warning');
      return;
    }
    
    try {
      setLoading(true);
      const mensajeProcesando = obtenerMensajeAleatorio('cargaMasiva');
      mostrarNotificacionBoxito(`${mensajeProcesando} Procesando ${datosCorrectos.length} facturas...`, 'info');
      
      console.log('📦 Boxito: Sending bulk upload:', { count: datosCorrectos.length });
      
      const response = await fetch('/api/invoices/bulk-upload', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ invoices: datosCorrectos })
      });
      
      if (response.ok) {
        const result = await response.json();
        const mensajeExito = obtenerMensajeAleatorio('cargaMasiva');
        mostrarNotificacionBoxito(`${mensajeExito} ${result.message} 🎊`, 'success');
        
        setTimeout(() => {
          mostrarNotificacionBoxito('¡Tu eficiencia en carga masiva es impresionante! Boxito está orgulloso 🌟', 'success');
        }, 3000);
        
        setTimeout(() => {
          activarMensajeMotivacional();
        }, 6000);
        
        setShowPreview(false);
        setValidationResult(null);
        await loadFacturas();
      } else {
        const errorData = await response.json();
        mostrarNotificacionBoxito(`Error en carga masiva: ${errorData.error || 'Error desconocido'} 😅`, 'error');
      }
    } catch (error) {
      console.error('📦 Boxito: Bulk upload error:', error);
      mostrarNotificacionBoxito('Error procesando las facturas. ¡Inténtalo de nuevo! 🔄', 'error');
    } finally {
      setLoading(false);
    }
  };

  const descargarLayout = () => {
    const headers = [
      "paqueteria", "numero_comprobante", "cliente", "rfc", "credito", 
      "fecha_creacion", "fecha_vencimiento", "total"
    ];
    
    const ejemplos = [
      ["DHL", "FAC-2025-001", "EMPRESA EJEMPLO SA", "EEJ990101AAA", 30, "2025-01-15", "2025-02-14", 25000.50],
      ["FedEx", "FAC-2025-002", "CLIENTE DEMO SC", "CDE990202BBB", 15, "2025-01-16", "2025-01-31", 15750.00],
      ["UPS", "FAC-2025-003", "NEGOCIO PRUEBA", "NPR990303CCC", 0, "2025-01-17", "2025-01-17", 8500.25]
    ];
    
    const ws = XLSX.utils.aoa_to_sheet([headers, ...ejemplos]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Layout_Facturacion");
    XLSX.writeFile(wb, "📦_Boxito_Layout_Facturacion.xlsx");
    mostrarNotificacionBoxito('¡Layout descargado con éxito! Usa este formato para la carga masiva perfecta 📋✨', 'success');
  };

  const exportarFacturas = () => {
    if (facturasFiltradas.length === 0) {
      mostrarNotificacionBoxito('No hay facturas para exportar en los filtros actuales 📊', 'warning');
      return;
    }

    const datosExport = facturasFiltradas.map((factura, index) => ({
      '#': index + 1,
      'Número Comprobante': factura.numero_comprobante,
      'Cliente': factura.cliente,
      'RFC': factura.rfc,
      'Paquetería': factura.paqueteria,
      'Crédito': factura.credito,
      'Fecha Creación': factura.fecha_creacion,
      'Fecha Vencimiento': factura.fecha_vencimiento,
      'Total': factura.total,
      'Pago 1': factura.pago1,
      'Fecha Pago 1': factura.fecha_pago1 || '',
      'Pago 2': factura.pago2,
      'Fecha Pago 2': factura.fecha_pago2 || '',
      'Pago 3': factura.pago3,
      'Fecha Pago 3': factura.fecha_pago3 || '',
      'NC': factura.nc,
      'Por Cobrar': factura.por_cobrar,
      'Estado': factura.estatus,
      'Comentarios': factura.comentarios || ''
    }));

    const ws = XLSX.utils.json_to_sheet(datosExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Facturas');
    XLSX.writeFile(wb, `📦_Boxito_Facturas_${new Date().toISOString().split('T')[0]}.xlsx`);
    mostrarNotificacionBoxito('¡Facturas exportadas exitosamente! Tu organización es excepcional 📊✨', 'success');
  };

  const estadisticasMotivacionales = React.useMemo(() => {
    const totalFacturado = facturasFiltradas.reduce((sum, f) => sum + f.total, 0);
    const totalCobrado = facturasFiltradas.reduce((sum, f) => sum + (f.total - f.por_cobrar), 0);
    const tasaCobro = totalFacturado > 0 ? (totalCobrado / totalFacturado) * 100 : 0;
    const facturasPagadas = facturasFiltradas.filter(f => f.estatus === 'Pagada').length;
    
    return {
      totalFacturado,
      totalCobrado,
      tasaCobro,
      facturasPagadas,
      facturasPendientes: facturasFiltradas.filter(f => f.estatus === 'Pendiente').length
    };
  }, [facturasFiltradas]);

  if (!hasPermission('facturacion', 'read')) {
    return (
      <div className="p-6">
        <Card className="card-shope">
          <CardContent className="p-6 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No tienes permisos para ver la facturación.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Motivacional */}
      <Card className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white border-0 shadow-2xl overflow-hidden relative">
        <CardContent className="p-6 relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">📄 Facturación</h1>
              <p className="text-blue-100">
                📦 Boxito gestiona tus facturas con precisión - {facturasFiltradas.length} facturas activas
                {filtros.mes !== '0' && ` (${MESES_NOMBRES[parseInt(filtros.mes)]})`}
              </p>
              {estadisticasMotivacionales.tasaCobro >= 80 && (
                <div className="mt-2 flex items-center gap-2 bg-white/20 rounded-lg px-3 py-1">
                  <Trophy className="w-4 h-4" />
                  <span className="text-sm font-medium">¡Excelente tasa de cobro: {estadisticasMotivacionales.tasaCobro.toFixed(1)}%!</span>
                </div>
              )}
            </div>
            
            <div className="flex gap-3">
              <Button 
                onClick={exportarFacturas} 
                variant="secondary" 
                className="bg-white/20 hover:bg-white/30 text-white border-white/20"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar Excel
              </Button>
              
              {hasPermission('facturacion', 'create') && (
                <Dialog open={showDialog} onOpenChange={(open) => {
                  setShowDialog(open);
                  if (!open) {
                    setEditingFactura(null);
                    resetForm();
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button className="btn-shope-secondary" onClick={resetForm}>
                      <Plus className="w-4 h-4 mr-2" />
                      Nueva Factura
                    </Button>
                  </DialogTrigger>
                </Dialog>
              )}
            </div>
          </div>
        </CardContent>
        
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
                <p className="text-blue-100 text-sm">Tu gestión de facturación mantiene el negocio en movimiento</p>
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
            <Filter className="w-5 h-5 text-blue-600" />
            Filtros de Facturación
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Estado</Label>
              <Select value={filtros.estatus} onValueChange={(value) => setFiltros(prev => ({ ...prev, estatus: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">🔍 Todas</SelectItem>
                  <SelectItem value="Pendiente">🟡 Pendientes</SelectItem>
                  <SelectItem value="Pagada">✅ Pagadas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Mes</Label>
              <Select value={filtros.mes} onValueChange={(value) => {
                console.log('📦 Facturación: Cambiando filtro mes a:', value, MESES_NOMBRES[parseInt(value)]);
                setFiltros(prev => ({ ...prev, mes: value }));
                
                if (value !== '0') {
                  setTimeout(() => {
                    mostrarNotificacionBoxito(`¡Perfecto! Filtrando por ${MESES_NOMBRES[parseInt(value)]}. ¡A revisar esas facturas! 🔍`, 'info');
                  }, 500);
                }
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MESES_NOMBRES.map((mes, idx) => (
                    <SelectItem key={idx} value={idx.toString()}>{mes}</SelectItem>
                  ))}
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
              <Label>No. Factura</Label>
              <Input
                placeholder="Buscar # factura"
                value={filtros.numero}
                onChange={(e) => setFiltros(prev => ({ ...prev, numero: e.target.value }))}
                className="input-shope"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Upload Section */}
      <Card className="card-shope">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-green-600" />
            🚀 Carga Masiva Inteligente de Facturas
          </CardTitle>
          <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 p-3 rounded-lg border border-orange-200">
            <Info className="w-4 h-4" />
            <span className="font-medium">
              📦 Boxito incluye vista previa y validación completa antes de procesar
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            <Button 
              onClick={descargarLayout} 
              variant="outline" 
              className="gap-2 bg-gradient-to-r from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 border-blue-300"
            >
              <Download className="w-4 h-4" />
              📦 Descargar Layout de Ejemplo
            </Button>
            
            <div className="flex items-center gap-2">
              <Label htmlFor="carga-masiva" className="cursor-pointer">
                <Button 
                  variant="outline" 
                  asChild
                  className="gap-2 bg-gradient-to-r from-green-100 to-green-200 hover:from-green-200 hover:to-green-300 border-green-300"
                >
                  <span>
                    <Upload className="w-4 h-4" />
                    📦 Analizar Archivo Excel
                  </span>
                </Button>
              </Label>
              <input
                id="carga-masiva"
                type="file"
                accept=".xlsx,.xls"
                onChange={procesarCargaMasiva}
                className="hidden"
                disabled={!hasPermission('facturacion', 'create')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card className="table-shope">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Facturas ({facturasFiltradas.length})
            {estadisticasMotivacionales.facturasPendientes === 0 && facturasFiltradas.length > 0 && (
              <div className="ml-auto flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                <Trophy className="w-4 h-4" />
                ¡Todas pagadas!
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <span className="text-white font-bold">📄</span>
              </div>
              <p className="text-gray-600">📦 Boxito está cargando las facturas...</p>
            </div>
          ) : facturasFiltradas.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-bold text-blue-700 mb-2">
                📋 No hay facturas que coincidan con los filtros
              </h3>
              <p className="text-blue-600">
                Boxito sugiere: Ajusta los filtros o registra una nueva factura
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-blue-600 to-indigo-700">
                    <TableHead className="text-white font-semibold">No. Comprobante</TableHead>
                    <TableHead className="text-white font-semibold">Cliente</TableHead>
                    <TableHead className="text-white font-semibold">RFC</TableHead>
                    <TableHead className="text-white font-semibold">Paquetería</TableHead>
                    <TableHead className="text-white font-semibold">Total</TableHead>
                    <TableHead className="text-white font-semibold">Por Cobrar</TableHead>
                    <TableHead className="text-white font-semibold">Estado</TableHead>
                    <TableHead className="text-white font-semibold">Fecha Creación</TableHead>
                    <TableHead className="text-white font-semibold">📦 Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {facturasFiltradas.map((factura) => (
                    <TableRow key={factura.id} className="hover:bg-blue-50 transition-colors">
                      <TableCell className="font-medium font-mono">
                        {factura.numero_comprobante}
                      </TableCell>
                      <TableCell>{factura.cliente}</TableCell>
                      <TableCell className="font-mono text-sm">{factura.rfc}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                          {factura.paqueteria}
                        </span>
                      </TableCell>
                      <TableCell className="font-bold text-blue-600">
                        ${factura.total.toLocaleString('es-MX')}
                      </TableCell>
                      <TableCell className="font-bold text-orange-600">
                        ${factura.por_cobrar.toLocaleString('es-MX')}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          factura.estatus === 'Pagada' 
                            ? 'status-paid' 
                            : 'status-pending'
                        }`}>
                          {factura.estatus}
                          {factura.estatus === 'Pagada' && ' 🏆'}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {factura.fecha_creacion}
                        <div className="text-xs text-gray-500">
                          Mes: {getMonthFromYYYYMMDD(factura.fecha_creacion)} ({MESES_NOMBRES[getMonthFromYYYYMMDD(factura.fecha_creacion)]})
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {hasPermission('facturacion', 'update') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(factura)}
                              className="hover:bg-blue-100 text-blue-600 hover:scale-105 transition-transform"
                            >
                              ✏️ Editar
                            </Button>
                          )}
                          {hasPermission('facturacion', 'delete') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(factura)}
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

      {/* Dialog for New/Edit Invoice */}
      <Dialog open={showDialog} onOpenChange={(open) => {
        setShowDialog(open);
        if (!open) {
          setEditingFactura(null);
          resetForm();
        }
      }}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingFactura ? 'Editar Factura' : 'Nueva Factura'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-700 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Información General
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="numero_comprobante">No. Comprobante *</Label>
                  <Input
                    id="numero_comprobante"
                    value={formData.numero_comprobante}
                    onChange={(e) => setFormData(prev => ({ ...prev, numero_comprobante: e.target.value }))}
                    required
                    placeholder="Ej: FAC-2025-001"
                    className="input-shope"
                  />
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
                  <Label htmlFor="rfc">RFC *</Label>
                  <Input
                    id="rfc"
                    value={formData.rfc}
                    onChange={(e) => setFormData(prev => ({ ...prev, rfc: e.target.value.toUpperCase() }))}
                    required
                    placeholder="XAXX010101000"
                    className="input-shope"
                    maxLength={13}
                    minLength={12}
                  />
                </div>
                
                <div>
                  <Label htmlFor="paqueteria">Paquetería *</Label>
                  <Select 
                    value={formData.paqueteria} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, paqueteria: value }))}
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
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-200">
              <CardHeader>
                <CardTitle className="text-green-700 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Fechas y Montos
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fecha_creacion">Fecha de Creación *</Label>
                  <Input
                    id="fecha_creacion"
                    type="date"
                    value={formData.fecha_creacion}
                    onChange={(e) => setFormData(prev => ({ ...prev, fecha_creacion: e.target.value }))}
                    required
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
                    className="input-shope"
                  />
                </div>
                
                <div>
                  <Label htmlFor="fecha_vencimiento">Fecha de Vencimiento</Label>
                  <Input
                    id="fecha_vencimiento"
                    type="date"
                    value={formData.fecha_vencimiento}
                    onChange={(e) => setFormData(prev => ({ ...prev, fecha_vencimiento: e.target.value }))}
                    className="input-shope"
                  />
                </div>
                
                <div>
                  <Label htmlFor="total">Total *</Label>
                  <Input
                    id="total"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.total}
                    onChange={(e) => setFormData(prev => ({ ...prev, total: Number(e.target.value) }))}
                    required
                    placeholder="0.00"
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
                  setEditingFactura(null);
                  resetForm();
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="btn-shope-primary flex-1">
                {loading ? '📦 Procesando...' : (editingFactura ? 'Actualizar' : 'Registrar')} Factura
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Summary */}
      <Card className="card-shope bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-blue-600" />
            📦 Resumen de Facturación
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-4 rounded-lg border border-blue-200 text-center">
              <div className="text-blue-600 text-sm font-medium mb-1">Total Facturas</div>
              <div className="text-2xl font-bold text-blue-700">
                {facturasFiltradas.length}
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-green-200 text-center">
              <div className="text-green-600 text-sm font-medium mb-1">Total Facturado</div>
              <div className="text-2xl font-bold text-green-700">
                ${estadisticasMotivacionales.totalFacturado.toLocaleString('es-MX')}
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-orange-200 text-center">
              <div className="text-orange-600 text-sm font-medium mb-1">Facturas Pagadas</div>
              <div className="text-2xl font-bold text-orange-700">
                {estadisticasMotivacionales.facturasPagadas}
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-purple-200 text-center">
              <div className="text-purple-600 text-sm font-medium mb-1">Tasa de Cobro</div>
              <div className="text-2xl font-bold text-purple-700">
                {estadisticasMotivacionales.tasaCobro.toFixed(1)}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Vista Previa */}
      <BulkUploadPreview
        open={showPreview}
        onClose={() => {
          setShowPreview(false);
          setValidationResult(null);
          mostrarNotificacionBoxito('Vista previa cerrada. ¡Listo para el siguiente paso! 📋', 'info');
        }}
        onConfirm={confirmarCargaMasiva}
        validationResult={validationResult}
        titulo="Facturas"
        descripcion="Análisis detallado de tu archivo de carga masiva con validación Boxito"
        loading={loading}
      />
    </div>
  );
}
