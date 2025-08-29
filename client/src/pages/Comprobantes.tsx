import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BulkUploadPreview } from '@/components/BulkUploadPreview';
import { useAuth } from '@/context/AuthContext';
import { NotificationContext } from '@/App';
import { Comprobante } from '@/types';
import { Download, Upload, FileSpreadsheet, AlertTriangle, CheckCircle, Info, Star, Trophy, Target, Gift } from 'lucide-react';
import * as XLSX from 'xlsx';

const MESES_NOMBRES = [
  "Todos", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

// Mensajes motivacionales de Boxito para Comprobantes
const MENSAJES_BOXITO_COMPROBANTES = {
  registro: [
    "¡Perfecto! Comprobante registrado con éxito ✨",
    "¡Excelente! Todo salió genial en el registro 🎉",
    "¡Increíble! Tu gestión de comprobantes es impecable 💯",
    "¡Genial! Otro comprobante más en el sistema 🌟",
    "¡Boxito está orgulloso de tu trabajo! 🚀"
  ],
  cargaMasiva: [
    "¡WOW! Carga masiva completada exitosamente 🎊",
    "¡INCREÍBLE! Procesamiento masivo sin errores 🏆",
    "¡FANTÁSTICO! Todos los comprobantes fueron procesados 💪",
    "¡ÉXITO TOTAL! Carga masiva de nivel profesional ✨",
    "¡BOXITO CELEBRA! Tu eficiencia es excepcional 🎯"
  ],
  consejos: [
    "💡 Tip: Mantener links organizados facilita auditorías",
    "⭐ Consejo: Verificar montos ayuda a prevenir errores",
    "🎯 Meta: Comprobantes completos mejoran la gestión",
    "📅 Recuerda: Fechas correctas son clave para reportes",
    "💪 ¡Cada comprobante registrado suma al control financiero!"
  ],
  motivacion: [
    "¡Tu dedicación hace la diferencia en cada registro! 🌟",
    "¡Boxito valora tu atención al detalle! 🎉",
    "¡Eres parte fundamental del éxito de Shope Envíos! 💼",
    "¡Tu trabajo mantiene la transparencia financiera! ⚡",
    "¡Cada comprobante cuenta para la excelencia! 📈"
  ],
  validacion: [
    "¡Datos validados exitosamente! Listos para procesar 🔍",
    "¡Validación completa! Todo está en orden 📋",
    "¡Análisis terminado! Información verificada ✅",
    "¡Control de calidad aprobado! Excelente trabajo 🎯",
    "¡Boxito certifica: Datos impecables! 🏆"
  ]
};

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

export default function Comprobantes() {
  const { hasPermission } = useAuth();
  const { showNotification } = React.useContext(NotificationContext);
  const [comprobantes, setComprobantes] = React.useState<Comprobante[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [editIndex, setEditIndex] = React.useState<number | null>(null);
  const [showPreview, setShowPreview] = React.useState(false);
  const [validationResult, setValidationResult] = React.useState<ValidationResult | null>(null);
  const [mostrarMensajeMotivacional, setMostrarMensajeMotivacional] = React.useState(false);
  const [initialLoad, setInitialLoad] = React.useState(true);
  
  const [filtros, setFiltros] = React.useState({
    id: '',
    status: '',
    tipo: '',
    factura: '',
    mes: 'all'
  });

  const [formData, setFormData] = React.useState<Partial<Comprobante>>({
    id_asociado: '',
    status: '',
    monto: 0,
    tipo: '',
    fecha: '',
    link: '',
    factura: ''
  });

  const obtenerMensajeAleatorio = (categoria: keyof typeof MENSAJES_BOXITO_COMPROBANTES): string => {
    const mensajes = MENSAJES_BOXITO_COMPROBANTES[categoria];
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

  // Load receipts from API
  const loadReceipts = React.useCallback(async () => {
    if (!hasPermission('comprobantes', 'read')) {
      setLoading(false);
      setInitialLoad(false);
      return;
    }
    
    try {
      setLoading(true);
      console.log('📦 Boxito: Loading receipts...');
      
      const response = await fetch('/api/receipts', {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Boxito: Raw receipts data:', data);
        setComprobantes(data);
        console.log(`📦 Boxito: Loaded ${data.length} receipts`);
        
        // Mensaje de bienvenida motivacional solo en carga inicial
        if (initialLoad && data.length > 0) {
          const aprobados = data.filter((c: Comprobante) => c.status === 'APROBADO').length;
          const pendientes = data.filter((c: Comprobante) => c.status === 'PENDIENTE').length;
          
          setTimeout(() => {
            if (pendientes === 0) {
              mostrarNotificacionBoxito("¡Increíble! Todos los comprobantes están aprobados. ¡Excelente gestión! 🏆", 'success');
            } else {
              mostrarNotificacionBoxito(`Tienes ${aprobados} comprobantes aprobados y ${pendientes} pendientes. ¡Vamos a completarlos! 💪`, 'info');
            }
          }, 1000);
        }
      } else {
        console.error('📦 Boxito: Error response loading receipts:', response.status);
        showNotification('Error al cargar comprobantes', 'error');
      }
    } catch (error) {
      console.error('📦 Boxito: Error loading receipts:', error);
      showNotification('Error de conexión al cargar comprobantes', 'error');
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, [hasPermission, getAuthHeaders, showNotification, mostrarNotificacionBoxito, initialLoad]);

  React.useEffect(() => {
    loadReceipts();
  }, [loadReceipts]);

  // Función para normalizar fechas en diferentes formatos
  const normalizarFecha = (fechaInput: any): string => {
    if (!fechaInput) return '';
    
    let fecha: Date;
    
    // Si es un número (fecha de Excel)
    if (typeof fechaInput === 'number') {
      // Excel fecha base es 1900-01-01, pero JavaScript usa 1970-01-01
      // Necesitamos ajustar por la diferencia
      const excelEpoch = new Date(1899, 11, 30); // 30 de diciembre de 1899
      fecha = new Date(excelEpoch.getTime() + fechaInput * 24 * 60 * 60 * 1000);
    }
    // Si es string, intentar parsearlo
    else if (typeof fechaInput === 'string') {
      // Limpiar la fecha de espacios y caracteres extraños
      const fechaLimpia = fechaInput.trim();
      
      // Intentar diferentes formatos comunes
      const formatosFecha = [
        // ISO format YYYY-MM-DD
        /^\d{4}-\d{2}-\d{2}$/,
        // DD/MM/YYYY or DD-MM-YYYY
        /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/,
        // MM/DD/YYYY or MM-DD-YYYY  
        /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/,
        // DD.MM.YYYY
        /^\d{1,2}\.\d{1,2}\.\d{4}$/
      ];
      
      if (formatosFecha[0].test(fechaLimpia)) {
        // Ya está en formato ISO
        fecha = new Date(fechaLimpia);
      } else if (formatosFecha[1].test(fechaLimpia) || formatosFecha[3].test(fechaLimpia)) {
        // DD/MM/YYYY o DD-MM-YYYY o DD.MM.YYYY
        const partes = fechaLimpia.split(/[\/\-\.]/);
        const dia = parseInt(partes[0]);
        const mes = parseInt(partes[1]);
        const año = parseInt(partes[2]);
        
        // Validar rangos
        if (dia <= 31 && mes <= 12 && año >= 1900) {
          fecha = new Date(año, mes - 1, dia); // mes - 1 porque JavaScript usa 0-based months
        } else {
          throw new Error(`Fecha inválida: ${fechaInput}`);
        }
      } else {
        // Intentar parseo directo
        fecha = new Date(fechaLimpia);
        if (isNaN(fecha.getTime())) {
          throw new Error(`Formato de fecha no reconocido: ${fechaInput}`);
        }
      }
    }
    // Si ya es un objeto Date
    else if (fechaInput instanceof Date) {
      fecha = fechaInput;
    }
    // Si no se reconoce el formato
    else {
      throw new Error(`Tipo de fecha no soportado: ${typeof fechaInput} - ${fechaInput}`);
    }
    
    // Validar que la fecha sea válida
    if (isNaN(fecha.getTime())) {
      throw new Error(`Fecha inválida después del parseo: ${fechaInput}`);
    }
    
    // Devolver en formato ISO (YYYY-MM-DD)
    return fecha.toISOString().split('T')[0];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hasPermission('comprobantes', 'create') && !hasPermission('comprobantes', 'update')) {
      mostrarNotificacionBoxito('No tienes permisos para esta acción. ¡Contacta a tu administrador! 🔐', 'warning');
      return;
    }
    
    try {
      setLoading(true);
      
      // Mensaje de procesamiento motivacional
      const procesandoMsg = obtenerMensajeAleatorio('motivacion');
      mostrarNotificacionBoxito(`${procesandoMsg} Procesando comprobante...`, 'info');
      
      // Normalizar fecha antes de enviar
      const receiptData = {
        ...formData,
        fecha: normalizarFecha(formData.fecha)
      };
      
      let url = '/api/receipts';
      let method = 'POST';
      
      if (editIndex !== null) {
        const comprobante = comprobantes[editIndex];
        if (comprobante?.id) {
          url = `/api/receipts/${comprobante.id}`;
          method = 'PUT';
        }
      }
      
      console.log('📦 Boxito: Submitting receipt:', method, receiptData);
      
      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(receiptData)
      });
      
      if (response.ok) {
        const mensajeExito = obtenerMensajeAleatorio('registro');
        const accion = editIndex !== null ? 'actualizado' : 'registrado';
        mostrarNotificacionBoxito(
          `${mensajeExito} Comprobante ${accion} para ID ${formData.id_asociado} por $${formData.monto?.toLocaleString('es-MX')} 💰`,
          'success'
        );
        
        // Mensaje adicional motivacional
        setTimeout(() => {
          if (formData.status === 'APROBADO') {
            mostrarNotificacionBoxito('¡Estado APROBADO! Tu gestión de calidad marca la diferencia 🌟', 'success');
          } else {
            mostrarNotificacionBoxito('¡Registro exitoso! Cada comprobante nos acerca más al control total 🎯', 'info');
          }
        }, 2500);
        
        setTimeout(() => {
          activarMensajeMotivacional();
        }, 5000);
        
        resetForm();
        await loadReceipts();
      } else {
        const errorData = await response.json();
        mostrarNotificacionBoxito(`Algo no salió como esperaba: ${errorData.error || 'Error al procesar comprobante'} 😅`, 'error');
      }
    } catch (error) {
      console.error('📦 Boxito: Error submitting receipt:', error);
      mostrarNotificacionBoxito('Error de conexión al procesar comprobante. ¡Inténtalo de nuevo! 🔄', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      id_asociado: '',
      status: '',
      monto: 0,
      tipo: '',
      fecha: '',
      link: '',
      factura: ''
    });
    setEditIndex(null);
  };

  const comprobantesFiltrados = React.useMemo(() => {
    return comprobantes.filter(c => {
      const cumpleId = !filtros.id || String(c.id_asociado).toLowerCase().includes(filtros.id.toLowerCase());
      const cumpleStatus = !filtros.status || c.status.toLowerCase().includes(filtros.status.toLowerCase());
      const cumpleTipo = !filtros.tipo || c.tipo.toLowerCase().includes(filtros.tipo.toLowerCase());
      const cumpleFactura = !filtros.factura || (c.factura || '').toLowerCase().includes(filtros.factura.toLowerCase());
      const cumpleMes = filtros.mes === 'all' || (new Date(c.fecha).getMonth() + 1) == parseInt(filtros.mes);
      
      return cumpleId && cumpleStatus && cumpleTipo && cumpleFactura && cumpleMes;
    });
  }, [comprobantes, filtros]);

  const editarComprobante = (index: number) => {
    const comprobante = comprobantes[index];
    setFormData(comprobante);
    setEditIndex(index);
    mostrarNotificacionBoxito('Editando comprobante. ¡Perfecciona los detalles! ✏️', 'info');
  };

  const eliminarComprobante = async (index: number) => {
    if (!hasPermission('comprobantes', 'delete')) {
      mostrarNotificacionBoxito('No tienes permisos para eliminar comprobantes. ¡Contacta a tu administrador! 🔐', 'warning');
      return;
    }
    
    if (!confirm('📦 Boxito pregunta: ¿Confirmas que quieres eliminar este comprobante?')) {
      return;
    }
    
    try {
      setLoading(true);
      const comprobante = comprobantes[index];
      
      if (!comprobante?.id) {
        mostrarNotificacionBoxito('Error: No se puede eliminar comprobante sin ID válido 😅', 'error');
        return;
      }
      
      const response = await fetch(`/api/receipts/${comprobante.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        mostrarNotificacionBoxito('¡Comprobante eliminado exitosamente! Gestión limpia y organizada 🗑️✨', 'success');
        await loadReceipts();
      } else {
        const errorData = await response.json();
        mostrarNotificacionBoxito(`Error al eliminar: ${errorData.error || 'Error desconocido'} 😅`, 'error');
      }
    } catch (error) {
      console.error('📦 Boxito: Error deleting receipt:', error);
      mostrarNotificacionBoxito('Error de conexión al eliminar comprobante. ¡Inténtalo de nuevo! 🔄', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Descargar plantilla/layout de ejemplo
  const descargarLayout = () => {
    const headers = [
      "id_asociado", 
      "status", 
      "monto", 
      "tipo", 
      "fecha", 
      "link", 
      "factura"
    ];
    
    const ejemplos = [
      ["649", "APROBADO", 1838.50, "ABONO", "04/08/2025", "https://app.shopeenvios.com/comprobante/file?id_estado=1010170", ""],
      ["649", "APROBADO", 1511.25, "ABONO", "2025-08-04", "https://app.shopeenvios.com/comprobante/file?id_estado=1010157", ""],
      ["463", "PENDIENTE", 2000.00, "CARGO", "04/08/25", "https://app.shopeenvios.com/comprobante/file?id_estado=1009958", "A12345"],
      ["301", "APROBADO", 750.75, "ABONO", "3/8/2025", "", "B67890"],
      ["", "", "", "", "INSTRUCCIONES:", "", ""],
      ["", "", "", "", "- Fecha: Usar DD/MM/YYYY o YYYY-MM-DD", "", ""],
      ["", "", "", "", "- Monto: Solo números, decimales con punto", "", ""],
      ["", "", "", "", "- Status: APROBADO, PENDIENTE, RECHAZADO", "", ""],
      ["", "", "", "", "- Tipo: ABONO, CARGO, TRANSFERENCIA", "", ""],
      ["", "", "", "", "- Link: URL completa (opcional)", "", ""],
      ["", "", "", "", "- Factura: Número de factura (opcional)", "", ""]
    ];
    
    const ws = XLSX.utils.aoa_to_sheet([headers, ...ejemplos]);
    
    // Configurar anchos de columnas
    ws['!cols'] = [
      { wch: 12 }, // id_asociado
      { wch: 12 }, // status
      { wch: 10 }, // monto
      { wch: 15 }, // tipo
      { wch: 12 }, // fecha
      { wch: 50 }, // link
      { wch: 15 }  // factura
    ];
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Layout_Comprobantes");
    XLSX.writeFile(wb, "📦_Boxito_Layout_Comprobantes.xlsx");
    mostrarNotificacionBoxito('¡Layout descargado con éxito! Usa este formato para la carga masiva perfecta 📋✨', 'success');
    
    setTimeout(() => {
      mostrarNotificacionBoxito('💡 Tip: Sigue exactamente el formato para un procesamiento sin errores', 'info');
    }, 3000);
  };

  // Validar y procesar archivo para vista previa
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
            const numeroFila = index + 2; // +2 porque empezamos desde fila 1 y saltamos header
            
            // Validar que la fila tenga datos
            if (!row || row.length === 0 || !row[0]) {
              return; // Fila vacía, saltar silenciosamente
            }
            
            resultado.totalLineas++;
            
            // Extraer datos de la fila
            const [id_asociado, status, monto, tipo, fecha, link, factura] = row;
            let tieneErrores = false;
            
            // Validaciones obligatorias
            if (!id_asociado) {
              resultado.errores.push({
                fila: numeroFila,
                campo: 'id_asociado',
                valor: id_asociado,
                error: 'ID asociado es obligatorio',
                severidad: 'error'
              });
              tieneErrores = true;
            }
            
            if (!status) {
              resultado.errores.push({
                fila: numeroFila,
                campo: 'status',
                valor: status,
                error: 'Status es obligatorio',
                severidad: 'error'
              });
              tieneErrores = true;
            }
            
            if (!monto || isNaN(parseFloat(String(monto).replace(',', '')))) {
              resultado.errores.push({
                fila: numeroFila,
                campo: 'monto',
                valor: monto,
                error: 'Monto debe ser un número válido',
                severidad: 'error'
              });
              tieneErrores = true;
            }
            
            if (!tipo) {
              resultado.errores.push({
                fila: numeroFila,
                campo: 'tipo',
                valor: tipo,
                error: 'Tipo es obligatorio',
                severidad: 'error'
              });
              tieneErrores = true;
            }
            
            if (!fecha) {
              resultado.errores.push({
                fila: numeroFila,
                campo: 'fecha',
                valor: fecha,
                error: 'Fecha es obligatoria',
                severidad: 'error'
              });
              tieneErrores = true;
            }
            
            // Validaciones de formato
            const montoNumerico = parseFloat(String(monto).replace(',', ''));
            if (!isNaN(montoNumerico) && montoNumerico < 0) {
              resultado.errores.push({
                fila: numeroFila,
                campo: 'monto',
                valor: monto,
                error: 'El monto no puede ser negativo',
                severidad: 'error'
              });
              tieneErrores = true;
            }
            
            // Validar fecha
            if (fecha) {
              try {
                normalizarFecha(fecha);
              } catch (fechaError) {
                resultado.errores.push({
                  fila: numeroFila,
                  campo: 'fecha',
                  valor: fecha,
                  error: `Formato de fecha inválido: ${fechaError}`,
                  severidad: 'error'
                });
                tieneErrores = true;
              }
            }
            
            // Validaciones de advertencia
            const statusValidos = ['APROBADO', 'PENDIENTE', 'RECHAZADO'];
            if (status && !statusValidos.includes(String(status).toUpperCase())) {
              resultado.errores.push({
                fila: numeroFila,
                campo: 'status',
                valor: status,
                error: `Status no estándar. Se recomienda: ${statusValidos.join(', ')}`,
                severidad: 'warning'
              });
              resultado.lineasConAdvertencias++;
            }
            
            const tiposValidos = ['ABONO', 'CARGO', 'TRANSFERENCIA'];
            if (tipo && !tiposValidos.includes(String(tipo).toUpperCase())) {
              resultado.errores.push({
                fila: numeroFila,
                campo: 'tipo',
                valor: tipo,
                error: `Tipo no estándar. Se recomienda: ${tiposValidos.join(', ')}`,
                severidad: 'warning'
              });
            }
            
            // Si no hay errores, agregar a datos correctos
            if (!tieneErrores) {
              try {
                const comprobanteData = {
                  id_asociado: String(id_asociado).trim(),
                  status: String(status).trim(),
                  monto: montoNumerico,
                  tipo: String(tipo).trim(),
                  fecha: normalizarFecha(fecha),
                  link: link ? String(link).trim() : '',
                  factura: factura ? String(factura).trim() : ''
                };
                
                resultado.datosCorrectos.push(comprobanteData);
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
          
          // Mensaje motivacional de validación
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
      
      // Mensaje según el resultado
      if (resultado.lineasConErrores === 0) {
        mostrarNotificacionBoxito('¡PERFECTO! Archivo sin errores. ¡Listo para procesar! 🏆', 'success');
      } else {
        mostrarNotificacionBoxito(`Análisis completo: ${resultado.lineasCorrectas} líneas correctas encontradas. ¡Revisemos los detalles! 📋`, 'info');
      }
    } catch (error) {
      console.error('Error analyzing file:', error);
      mostrarNotificacionBoxito('Error al analizar el archivo. ¡Verifica el formato! 📄', 'error');
    }
    
    // Limpiar input
    e.target.value = '';
  };

  const confirmarCargaMasiva = async (datosCorrectos: any[]) => {
    if (!hasPermission('comprobantes', 'create')) {
      mostrarNotificacionBoxito('No tienes permisos para crear comprobantes. ¡Contacta a tu administrador! 🔐', 'warning');
      return;
    }
    
    try {
      setLoading(true);
      const mensajeProcesando = obtenerMensajeAleatorio('cargaMasiva');
      mostrarNotificacionBoxito(`${mensajeProcesando} Procesando ${datosCorrectos.length} comprobantes...`, 'info');
      
      console.log('📦 Boxito: Sending bulk upload:', { count: datosCorrectos.length });
      
      const response = await fetch('/api/receipts/bulk', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ receipts: datosCorrectos })
      });
      
      if (response.ok) {
        const result = await response.json();
        const mensajeExito = obtenerMensajeAleatorio('cargaMasiva');
        mostrarNotificacionBoxito(`${mensajeExito} ${result.message} 🎊`, 'success');
        
        // Mensaje motivacional adicional
        setTimeout(() => {
          mostrarNotificacionBoxito('¡Tu eficiencia en carga masiva es impresionante! Boxito está orgulloso 🌟', 'success');
        }, 3000);
        
        setTimeout(() => {
          activarMensajeMotivacional();
        }, 6000);
        
        setShowPreview(false);
        setValidationResult(null);
        await loadReceipts();
      } else {
        const errorData = await response.json();
        mostrarNotificacionBoxito(`Error en carga masiva: ${errorData.error || 'Error desconocido'} 😅`, 'error');
      }
    } catch (error) {
      console.error('📦 Boxito: Bulk upload error:', error);
      mostrarNotificacionBoxito('Error procesando los comprobantes. ¡Inténtalo de nuevo! 🔄', 'error');
    } finally {
      setLoading(false);
    }
  };

  const exportarComprobantes = () => {
    if (comprobantesFiltrados.length === 0) {
      mostrarNotificacionBoxito('No hay comprobantes para exportar en los filtros actuales 📊', 'warning');
      return;
    }

    const datosExport = comprobantesFiltrados.map((comp, index) => ({
      '#': index + 1,
      'ID Asociado': comp.id_asociado,
      'Status': comp.status,
      'Monto': comp.monto,
      'Tipo': comp.tipo,
      'Fecha': comp.fecha,
      'Link': comp.link || '',
      'Factura': comp.factura || ''
    }));

    const ws = XLSX.utils.json_to_sheet(datosExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Comprobantes');
    XLSX.writeFile(wb, `📦_Boxito_Comprobantes_${new Date().toISOString().split('T')[0]}.xlsx`);
    mostrarNotificacionBoxito('¡Comprobantes exportados exitosamente! Tu organización es excepcional 📊✨', 'success');
    
    setTimeout(() => {
      mostrarNotificacionBoxito('💡 Tip: Los reportes regulares ayudan a mantener el control perfecto', 'info');
    }, 3000);
  };

  // Estadísticas motivacionales
  const estadisticasMotivacionales = React.useMemo(() => {
    const totalAprobados = comprobantesFiltrados.filter(c => c.status === 'APROBADO').length;
    const totalPendientes = comprobantesFiltrados.filter(c => c.status === 'PENDIENTE').length;
    const totalRechazados = comprobantesFiltrados.filter(c => c.status === 'RECHAZADO').length;
    const montoTotal = comprobantesFiltrados.reduce((sum, c) => sum + c.monto, 0);
    const tasaAprobacion = comprobantesFiltrados.length > 0 ? (totalAprobados / comprobantesFiltrados.length) * 100 : 0;
    
    return {
      totalAprobados,
      totalPendientes,
      totalRechazados,
      montoTotal,
      tasaAprobacion
    };
  }, [comprobantesFiltrados]);

  if (!hasPermission('comprobantes', 'read')) {
    return (
      <div className="p-6">
        <Card className="card-shope">
          <CardContent className="p-6 text-center">
            <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No tienes permisos para ver los comprobantes.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Motivacional */}
      <Card className="bg-gradient-to-r from-purple-600 to-pink-700 text-white border-0 shadow-2xl overflow-hidden relative">
        <CardContent className="p-6 relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">📄 Comprobantes / Recargas</h1>
              <p className="text-purple-100">
                📦 Boxito gestiona tus comprobantes con precisión - {comprobantesFiltrados.length} registros activos
              </p>
              {estadisticasMotivacionales.tasaAprobacion >= 80 && (
                <div className="mt-2 flex items-center gap-2 bg-white/20 rounded-lg px-3 py-1">
                  <Trophy className="w-4 h-4" />
                  <span className="text-sm font-medium">¡Excelente tasa de aprobación: {estadisticasMotivacionales.tasaAprobacion.toFixed(1)}%!</span>
                </div>
              )}
            </div>
            
            <div className="flex gap-3">
              <Button 
                onClick={exportarComprobantes} 
                variant="secondary" 
                className="bg-white/20 hover:bg-white/30 text-white border-white/20"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar Excel
              </Button>
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
                <p className="text-blue-100 text-sm">Tu gestión de comprobantes mantiene la transparencia perfecta</p>
              </div>
              <Gift className="w-6 h-6 text-yellow-300 animate-bounce" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Indicadores de Rendimiento */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className={`border-2 transition-all duration-300 ${
          estadisticasMotivacionales.tasaAprobacion >= 90 
            ? 'border-green-400 bg-gradient-to-br from-green-50 to-green-100' 
            : estadisticasMotivacionales.tasaAprobacion >= 70 
            ? 'border-blue-400 bg-gradient-to-br from-blue-50 to-blue-100'
            : 'border-orange-400 bg-gradient-to-br from-orange-50 to-orange-100'
        }`}>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              {estadisticasMotivacionales.tasaAprobacion >= 90 ? (
                <Trophy className="w-6 h-6 text-green-600" />
              ) : estadisticasMotivacionales.tasaAprobacion >= 70 ? (
                <Star className="w-6 h-6 text-blue-600" />
              ) : (
                <Target className="w-6 h-6 text-orange-600" />
              )}
            </div>
            <div className="text-2xl font-bold mb-1">
              {estadisticasMotivacionales.tasaAprobacion.toFixed(1)}%
            </div>
            <div className="text-sm font-medium">Tasa de Aprobación</div>
            <div className="text-xs mt-1">
              {estadisticasMotivacionales.tasaAprobacion >= 90 ? '¡Excepcional! 🏆' : 
               estadisticasMotivacionales.tasaAprobacion >= 70 ? '¡Muy bien! ⭐' : 
               '¡Mejorando! 💪'}
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-4 text-center">
            <div className="text-green-600 text-sm font-medium mb-1">Aprobados</div>
            <div className="text-2xl font-bold text-green-700 mb-1">
              {estadisticasMotivacionales.totalAprobados}
            </div>
            <div className="text-xs text-green-600">
              {estadisticasMotivacionales.totalAprobados > estadisticasMotivacionales.totalPendientes ? '¡Liderando! 🌟' : 'Progresando 📈'}
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4 text-center">
            <div className="text-blue-600 text-sm font-medium mb-1">Monto Total</div>
            <div className="text-2xl font-bold text-blue-700 mb-1">
              ${estadisticasMotivacionales.montoTotal.toLocaleString('es-MX')}
            </div>
            <div className="text-xs text-blue-600">
              {estadisticasMotivacionales.montoTotal > 1000000 ? '¡Millonario! 💎' : 
               estadisticasMotivacionales.montoTotal > 500000 ? '¡Excelente! 🚀' : 
               estadisticasMotivacionales.montoTotal > 100000 ? '¡Muy bien! ⭐' : 'En crecimiento 🌱'}
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="p-4 text-center">
            <div className="text-orange-600 text-sm font-medium mb-1">Pendientes</div>
            <div className="text-2xl font-bold text-orange-700 mb-1">
              {estadisticasMotivacionales.totalPendientes}
            </div>
            <div className="text-xs text-orange-600">
              {estadisticasMotivacionales.totalPendientes === 0 ? '¡Todo al día! 🎯' : 'En proceso 🔄'}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="card-shope">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            📦 Registro Individual de Comprobantes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="id_asociado">ID Asociado *</Label>
                <Input
                  id="id_asociado"
                  value={formData.id_asociado || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, id_asociado: e.target.value }))}
                  required
                  className="input-shope"
                  placeholder="Ej: 649"
                />
              </div>
              
              <div>
                <Label htmlFor="status">Status *</Label>
                <Select 
                  value={formData.status || ''} 
                  onValueChange={(value) => {
                    setFormData(prev => ({ ...prev, status: value }));
                    // Mensaje motivacional según el status
                    if (value === 'APROBADO') {
                      setTimeout(() => {
                        mostrarNotificacionBoxito('¡Excelente elección! Status APROBADO significa calidad garantizada 🏆', 'success');
                      }, 500);
                    }
                  }}
                >
                  <SelectTrigger className="input-shope">
                    <SelectValue placeholder="Selecciona status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="APROBADO">✅ APROBADO</SelectItem>
                    <SelectItem value="PENDIENTE">🟡 PENDIENTE</SelectItem>
                    <SelectItem value="RECHAZADO">🔴 RECHAZADO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="monto">Monto *</Label>
                <Input
                  id="monto"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.monto || 0}
                  onChange={(e) => setFormData(prev => ({ ...prev, monto: Number(e.target.value) }))}
                  required
                  className="input-shope"
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <Label htmlFor="tipo">Tipo *</Label>
                <Select 
                  value={formData.tipo || ''} 
                  onValueChange={(value) => {
                    setFormData(prev => ({ ...prev, tipo: value }));
                    // Mensaje contextual según el tipo
                    setTimeout(() => {
                      if (value === 'ABONO') {
                        mostrarNotificacionBoxito('¡Perfecto! ABONO registrado. ¡Flujo positivo! 💚', 'success');
                      } else if (value === 'CARGO') {
                        mostrarNotificacionBoxito('CARGO registrado. Control de salidas activado 📊', 'info');
                      }
                    }, 500);
                  }}
                >
                  <SelectTrigger className="input-shope">
                    <SelectValue placeholder="Selecciona tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ABONO">💚 ABONO</SelectItem>
                    <SelectItem value="CARGO">🔴 CARGO</SelectItem>
                    <SelectItem value="TRANSFERENCIA">🔄 TRANSFERENCIA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="fecha">Fecha *</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={formData.fecha || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, fecha: e.target.value }))}
                  required
                  className="input-shope"
                />
                <p className="text-xs text-gray-500 mt-1">
                  📦 Formato automático: DD/MM/YYYY o YYYY-MM-DD
                </p>
              </div>
              
              <div>
                <Label htmlFor="link">Link del Comprobante</Label>
                <Input
                  id="link"
                  type="url"
                  value={formData.link || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, link: e.target.value }))}
                  className="input-shope"
                  placeholder="https://..."
                />
              </div>
              
              <div>
                <Label htmlFor="factura">Factura Relacionada</Label>
                <Input
                  id="factura"
                  value={formData.factura || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, factura: e.target.value }))}
                  className="input-shope"
                  placeholder="Ej: A12345"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="btn-shope-primary hover:scale-105 transition-transform" disabled={loading}>
                {loading ? '📦 Procesando...' : (editIndex !== null ? '✏️ Actualizar' : '💾 Guardar')} Comprobante
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                🔄 Limpiar Formulario
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Sección de Carga Masiva */}
      <Card className="card-shope">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-green-600" />
            🚀 Carga Masiva Inteligente de Comprobantes
          </CardTitle>
          <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border border-orange-200">
            <Info className="w-4 h-4" />
            <span className="font-medium">
              📦 Boxito ahora incluye vista previa y validación completa antes de procesar
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            <Button 
              onClick={descargarLayout} 
              variant="outline" 
              className="gap-2 bg-gradient-to-r from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 border-blue-300 hover:scale-105 transition-transform"
            >
              <Download className="w-4 h-4" />
              📦 Descargar Layout de Ejemplo
            </Button>
            
            <div className="flex items-center gap-2">
              <Label htmlFor="carga-masiva" className="cursor-pointer">
                <Button 
                  variant="outline" 
                  asChild
                  className="gap-2 bg-gradient-to-r from-green-100 to-green-200 hover:from-green-200 hover:to-green-300 border-green-300 hover:scale-105 transition-transform"
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
                disabled={!hasPermission('comprobantes', 'create')}
              />
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">📋 Proceso de Carga Masiva Mejorado con Boxito:</h4>
            <ul className="text-sm text-blue-600 dark:text-blue-300 space-y-1">
              <li>• <strong>Paso 1:</strong> Descarga el layout de ejemplo con el botón azul 📥</li>
              <li>• <strong>Paso 2:</strong> Llena tu archivo Excel siguiendo exactamente el formato 📝</li>
              <li>• <strong>Paso 3:</strong> Sube tu archivo con el botón verde para <strong>análisis inteligente</strong> 🔍</li>
              <li>• <strong>Paso 4:</strong> 📦 Boxito te mostrará <strong>vista previa completa</strong> con líneas correctas y errores ✨</li>
              <li>• <strong>Paso 5:</strong> Decide si procesar líneas correctas o corregir archivo completo 🎯</li>
            </ul>
            <div className="mt-3 p-2 bg-green-100 rounded border border-green-300">
              <p className="text-xs text-green-700">
                💡 <strong>Boxito sugiere:</strong> ¡Un archivo bien formateado desde el inicio ahorra tiempo y aumenta la eficiencia!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="card-shope">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            📊 Comprobantes Registrados ({comprobantesFiltrados.length})
            {estadisticasMotivacionales.totalPendientes === 0 && comprobantesFiltrados.length > 0 && (
              <div className="ml-auto flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                <Trophy className="w-4 h-4" />
                ¡Sin pendientes!
              </div>
            )}
          </CardTitle>
          <div className="flex flex-wrap gap-4 items-center">
            <Input
              placeholder="🔍 Buscar ID asociado"
              value={filtros.id}
              onChange={(e) => setFiltros(prev => ({ ...prev, id: e.target.value }))}
              className="max-w-48 input-shope"
            />
            
            <Input
              placeholder="Status"
              value={filtros.status}
              onChange={(e) => setFiltros(prev => ({ ...prev, status: e.target.value }))}
              className="max-w-32 input-shope"
            />
            
            <Select value={filtros.mes} onValueChange={(value) => {
              setFiltros(prev => ({ ...prev, mes: value }));
              if (value !== 'all') {
                setTimeout(() => {
                  mostrarNotificacionBoxito(`¡Perfecto! Filtrando por ${MESES_NOMBRES[parseInt(value)]}. ¡A revisar esos comprobantes! 🔍`, 'info');
                }, 500);
              }
            }}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Mes" />
              </SelectTrigger>
              <SelectContent>
                {MESES_NOMBRES.map((mes, idx) => (
                  <SelectItem key={idx} value={idx === 0 ? 'all' : idx.toString()}>{mes}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button onClick={exportarComprobantes} variant="outline" className="gap-2 hover:scale-105 transition-transform">
              <Download className="w-4 h-4" />
              📊 Exportar Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <span className="text-white font-bold">📄</span>
              </div>
              <p className="text-gray-600">📦 Boxito está cargando los comprobantes...</p>
            </div>
          ) : comprobantesFiltrados.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-bold text-purple-700 mb-2">
                📋 No hay comprobantes que coincidan con los filtros
              </h3>
              <p className="text-purple-600">
                Boxito sugiere: Ajusta los filtros o registra tu primer comprobante
              </p>
              <div className="mt-4 bg-purple-50 p-4 rounded-lg border border-purple-200">
                <p className="text-sm text-purple-700">
                  💡 <strong>Boxito sugiere:</strong> ¡Este es el momento perfecto para registrar nuevos comprobantes o generar reportes!
                </p>
              </div>
            </div>
          ) : (
            <div className="table-shope">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-purple-600 to-pink-700">
                    <TableHead className="text-white font-semibold">#</TableHead>
                    <TableHead className="text-white font-semibold">ID Asociado</TableHead>
                    <TableHead className="text-white font-semibold">Status</TableHead>
                    <TableHead className="text-white font-semibold">Monto</TableHead>
                    <TableHead className="text-white font-semibold">Tipo</TableHead>
                    <TableHead className="text-white font-semibold">Fecha</TableHead>
                    <TableHead className="text-white font-semibold">Link</TableHead>
                    <TableHead className="text-white font-semibold">Factura</TableHead>
                    <TableHead className="text-white font-semibold">📦 Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comprobantesFiltrados.map((comprobante, index) => {
                    const originalIndex = comprobantes.findIndex(c => c.id === comprobante.id);
                    return (
                      <TableRow key={comprobante.id || index} className="hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
                        <TableCell>{index + 1}</TableCell>
                        <TableCell className="font-medium">{comprobante.id_asociado}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            comprobante.status === 'APROBADO' 
                              ? 'bg-green-100 text-green-800' 
                              : comprobante.status === 'PENDIENTE'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {comprobante.status}
                            {comprobante.status === 'APROBADO' && ' 🏆'}
                          </span>
                        </TableCell>
                        <TableCell className="font-bold text-purple-600">
                          ${Number(comprobante.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            comprobante.tipo === 'ABONO' 
                              ? 'bg-green-50 text-green-700 border border-green-200' 
                              : comprobante.tipo === 'CARGO'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {comprobante.tipo}
                            {comprobante.tipo === 'ABONO' && ' 💚'}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">
                          {new Date(comprobante.fecha).toLocaleDateString('es-MX')}
                        </TableCell>
                        <TableCell>
                          {comprobante.link ? (
                            <a 
                              href={comprobante.link} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-blue-600 hover:text-blue-800 hover:underline text-sm font-medium hover:scale-105 transition-transform inline-block"
                            >
                              📎 Ver comprobante
                            </a>
                          ) : (
                            <span className="text-gray-400 text-sm">Sin link</span>
                          )}
                        </TableCell>
                        <TableCell>{comprobante.factura || '--'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {hasPermission('comprobantes', 'update') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => editarComprobante(originalIndex)}
                                className="hover:bg-blue-100 text-blue-600 hover:scale-105 transition-transform"
                                disabled={originalIndex === -1}
                              >
                                ✏️ Editar
                              </Button>
                            )}
                            {hasPermission('comprobantes', 'delete') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => eliminarComprobante(originalIndex)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-100 hover:scale-105 transition-transform"
                                disabled={originalIndex === -1}
                              >
                                🗑️ Eliminar
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Motivacional */}
      <Card className="card-shope bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-purple-600" />
            📦 Resumen de Gestión de Comprobantes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-4 rounded-lg border border-green-200 text-center">
              <div className="text-green-600 text-sm font-medium mb-1">Comprobantes Aprobados</div>
              <div className="text-2xl font-bold text-green-700">
                {estadisticasMotivacionales.totalAprobados}
              </div>
              <div className="text-xs text-green-500 mt-1">
                {estadisticasMotivacionales.totalAprobados > 50 ? '¡Volumen alto! 📊' : 
                 estadisticasMotivacionales.totalAprobados > 20 ? 'Buen flujo 📈' : 
                 estadisticasMotivacionales.totalAprobados > 0 ? 'Creciendo ✨' : 'Empezando 🌱'}
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-blue-200 text-center">
              <div className="text-blue-600 text-sm font-medium mb-1">Monto Total Procesado</div>
              <div className="text-2xl font-bold text-blue-700">
                ${estadisticasMotivacionales.montoTotal.toLocaleString('es-MX')}
              </div>
              <div className="text-xs text-blue-500 mt-1">
                {estadisticasMotivacionales.montoTotal > 1000000 ? '¡Millonario! 💎' : 
                 estadisticasMotivacionales.montoTotal > 500000 ? '¡Excelente! 🚀' : 
                 estadisticasMotivacionales.montoTotal > 100000 ? '¡Muy bien! ⭐' : 'En crecimiento 🌱'}
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-orange-200 text-center">
              <div className="text-orange-600 text-sm font-medium mb-1">Comprobantes Pendientes</div>
              <div className="text-2xl font-bold text-orange-700">
                {estadisticasMotivacionales.totalPendientes}
              </div>
              <div className="text-xs text-orange-500 mt-1">
                {estadisticasMotivacionales.totalPendientes === 0 ? '¡Todo al día! 🎯' : 
                 estadisticasMotivacionales.totalPendientes < 5 ? 'Controlado 📊' : 
                 'Foco aquí 🎯'}
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-purple-200 text-center">
              <div className="text-purple-600 text-sm font-medium mb-1">Tasa de Éxito</div>
              <div className="text-2xl font-bold text-purple-700">
                {estadisticasMotivacionales.tasaAprobacion.toFixed(1)}%
              </div>
              <div className="text-xs text-purple-500 mt-1">
                {estadisticasMotivacionales.tasaAprobacion >= 90 ? '¡Perfecto! 👑' : 
                 estadisticasMotivacionales.tasaAprobacion >= 70 ? '¡Excelente! 🌟' : 
                 'Mejorando 💪'}
              </div>
            </div>
          </div>
          
          {/* Mensaje motivacional basado en performance */}
          <div className="mt-6 p-4 rounded-lg border-2 border-dashed border-purple-300 bg-gradient-to-r from-purple-50 to-pink-50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">📦</span>
              </div>
              <div>
                <h4 className="font-bold text-gray-800">
                  {estadisticasMotivacionales.tasaAprobacion >= 90 ? '🏆 ¡GESTIÓN EXCEPCIONAL!' :
                   estadisticasMotivacionales.tasaAprobacion >= 70 ? '⭐ ¡MUY BUEN TRABAJO!' :
                   estadisticasMotivacionales.tasaAprobacion >= 50 ? '💪 ¡SIGUE ASÍ!' :
                   '🎯 ¡ENFOQUE EN CALIDAD!'}
                </h4>
                <p className="text-gray-600 text-sm">
                  {estadisticasMotivacionales.tasaAprobacion >= 90 ? 
                    'Boxito está impresionado: Tu gestión de comprobantes es de nivel mundial. ¡Sigue así!' :
                   estadisticasMotivacionales.tasaAprobacion >= 70 ? 
                    'Boxito dice: Tu trabajo está dando excelentes resultados en el control de comprobantes. ¡Muy bien!' :
                   estadisticasMotivacionales.tasaAprobacion >= 50 ? 
                    'Boxito te anima: Vas por buen camino, cada comprobante cuenta. ¡No te rindas!' :
                    'Boxito sugiere: Verifica los datos antes del envío. ¡Tú puedes mejorar la calidad!'}
                </p>
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
        titulo="Comprobantes"
        descripcion="Análisis detallado de tu archivo de carga masiva con validación Boxito"
        loading={loading}
      />
    </div>
  );
}
