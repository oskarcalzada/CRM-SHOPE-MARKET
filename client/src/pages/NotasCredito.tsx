import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { FileUpload } from '@/components/ui/file-upload';
import { useAuth } from '@/context/AuthContext';
import { NotificationContext } from '@/App';
import { DataTable } from '@/components/DataTable';
import { ClipboardList, Plus, Upload, Download, FileText, Calendar, Filter } from 'lucide-react';
import * as XLSX from 'xlsx';

const MESES_NOMBRES = [
  "Todos los meses", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

interface NotaCredito {
  id: string;
  id_cliente: string;
  cliente: string;
  razon_social?: string;
  fecha: string;
  motivo: string;
  factura_aplicada?: string;
  monto: number;
  detalles?: string;
  cfdi?: string;
  estatus: 'Pendiente' | 'Aplicada';
  created_at: string;
  updated_at: string;
}

export default function NotasCredito() {
  const { hasPermission } = useAuth();
  const { showNotification } = React.useContext(NotificationContext);
  const [creditNotes, setCreditNotes] = React.useState<NotaCredito[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [showDialog, setShowDialog] = React.useState(false);
  const [editingNote, setEditingNote] = React.useState<NotaCredito | null>(null);

  // Filter state
  const [filters, setFilters] = React.useState({
    mes: '0',
    estatus: 'all',
    cliente: '',
    factura: ''
  });

  // Form state
  const [formData, setFormData] = React.useState({
    id_cliente: '',
    cliente: '',
    razon_social: '',
    fecha: new Date().toISOString().split('T')[0],
    motivo: '',
    factura_aplicada: '',
    monto: 0,
    estatus: 'Pendiente' as 'Pendiente' | 'Aplicada',
    cfdi: ''
  });

  // File states
  const [cfdiFiles, setCfdiFiles] = React.useState<File[]>([]);
  const [evidenceFiles, setEvidenceFiles] = React.useState<File[]>([]);

  // Get auth headers for API calls
  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  // Load credit notes
  const loadCreditNotes = async () => {
    if (!hasPermission('notas-credito', 'read')) return;
    
    try {
      setLoading(true);
      console.log('📦 Boxito: Loading credit notes...');
      
      const response = await fetch('/api/credit-notes', {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        setCreditNotes(data);
        console.log(`📦 Boxito: Loaded ${data.length} credit notes`);
      } else {
        showNotification('Error al cargar notas de crédito', 'error');
      }
    } catch (error) {
      console.error('📦 Boxito: Error loading credit notes:', error);
      showNotification('Error de conexión al cargar notas de crédito', 'error');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadCreditNotes();
  }, [hasPermission]);

  // Handle file uploads
  const handleCfdiUpload = (files: File[]) => {
    setCfdiFiles(files);
    if (files.length > 0) {
      setFormData(prev => ({ ...prev, cfdi: files[0].name }));
      showNotification('📦 Archivo CFDI de NC seleccionado', 'success');
    }
  };

  const handleEvidenceUpload = (files: File[]) => {
    setEvidenceFiles(files);
    if (files.length > 0) {
      showNotification(`📦 ${files.length} archivo(s) de evidencia seleccionado(s)`, 'success');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hasPermission('notas-credito', editingNote ? 'update' : 'create')) {
      showNotification('No tienes permisos para esta acción', 'error');
      return;
    }
    
    try {
      setLoading(true);
      
      // Prepare data for API
      const noteData = {
        ...formData,
        detalles: evidenceFiles.length > 0 
          ? JSON.stringify(evidenceFiles.map(f => f.name)) 
          : null
      };
      
      const url = editingNote 
        ? `/api/credit-notes/${editingNote.id}`
        : '/api/credit-notes';
      const method = editingNote ? 'PUT' : 'POST';
      
      console.log('📦 Boxito: Submitting credit note:', method, noteData);
      
      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(noteData)
      });
      
      if (response.ok) {
        showNotification(
          editingNote 
            ? '📦 Nota de crédito actualizada exitosamente'
            : '📦 Nota de crédito creada exitosamente', 
          'success'
        );
        
        setShowDialog(false);
        setEditingNote(null);
        resetForm();
        await loadCreditNotes();
      } else {
        const errorData = await response.json();
        showNotification(errorData.error || 'Error al procesar nota de crédito', 'error');
      }
    } catch (error) {
      console.error('📦 Boxito: Error submitting credit note:', error);
      showNotification('Error de conexión', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (note: NotaCredito) => {
    setEditingNote(note);
    setFormData({
      id_cliente: note.id_cliente,
      cliente: note.cliente,
      razon_social: note.razon_social || '',
      fecha: note.fecha,
      motivo: note.motivo,
      factura_aplicada: note.factura_aplicada || '',
      monto: note.monto,
      estatus: note.estatus,
      cfdi: note.cfdi || ''
    });
    setShowDialog(true);
  };

  const handleDelete = async (note: NotaCredito) => {
    if (!hasPermission('notas-credito', 'delete')) {
      showNotification('No tienes permisos para eliminar notas de crédito', 'error');
      return;
    }
    
    if (!confirm(`¿Confirmas que quieres eliminar la nota de crédito de ${note.cliente}?`)) {
      return;
    }
    
    try {
      setLoading(true);
      console.log('📦 Boxito: Deleting credit note:', note.id);
      
      const response = await fetch(`/api/credit-notes/${note.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        showNotification('📦 Nota de crédito eliminada exitosamente', 'success');
        await loadCreditNotes();
      } else {
        const errorData = await response.json();
        showNotification(errorData.error || 'Error al eliminar nota de crédito', 'error');
      }
    } catch (error) {
      console.error('📦 Boxito: Error deleting credit note:', error);
      showNotification('Error de conexión', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      id_cliente: '',
      cliente: '',
      razon_social: '',
      fecha: new Date().toISOString().split('T')[0],
      motivo: '',
      factura_aplicada: '',
      monto: 0,
      estatus: 'Pendiente',
      cfdi: ''
    });
    setCfdiFiles([]);
    setEvidenceFiles([]);
  };

  // Filter credit notes
  const filteredCreditNotes = React.useMemo(() => {
    return creditNotes.filter(note => {
      const fecha = new Date(note.fecha);
      const cumpleMes = filters.mes === '0' || (fecha.getMonth() + 1) === parseInt(filters.mes);
      const cumpleEstatus = filters.estatus === 'all' || note.estatus === filters.estatus;
      const cumpleCliente = !filters.cliente || note.cliente.toLowerCase().includes(filters.cliente.toLowerCase());
      const cumpleFactura = !filters.factura || (note.factura_aplicada && note.factura_aplicada.toLowerCase().includes(filters.factura.toLowerCase()));
      
      return cumpleMes && cumpleEstatus && cumpleCliente && cumpleFactura;
    });
  }, [creditNotes, filters]);

  const columns = [
    { key: 'cliente', header: 'Cliente', sortable: true, filterable: true },
    { key: 'fecha', header: 'Fecha', sortable: true },
    { key: 'motivo', header: 'Motivo', sortable: true },
    { key: 'factura_aplicada', header: 'Factura Aplicada', sortable: true },
    { 
      key: 'monto', 
      header: 'Monto', 
      sortable: true,
      render: (value: number) => `$${value.toLocaleString('es-MX')}` 
    },
    { 
      key: 'estatus', 
      header: 'Estatus',
      sortable: true,
      render: (value: string) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value === 'Aplicada' 
            ? 'status-paid' 
            : 'status-pending'
        }`}>
          {value}
        </span>
      )
    },
    { 
      key: 'cfdi', 
      header: 'CFDI',
      render: (value: string) => value ? '✓' : '--' 
    }
  ];

  const exportarNotasCredito = () => {
    const datos = filteredCreditNotes.map((nota, index) => ({
      '#': index + 1,
      'Cliente': nota.cliente,
      'Razón Social': nota.razon_social || '--',
      'Fecha': nota.fecha,
      'Motivo': nota.motivo,
      'Factura Aplicada': nota.factura_aplicada || '--',
      'Monto': nota.monto,
      'Estatus': nota.estatus,
      'CFDI': nota.cfdi || '--',
      'Fecha Creación': new Date(nota.created_at).toLocaleDateString('es-MX')
    }));

    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Notas de Credito');
    XLSX.writeFile(wb, `📦_Boxito_Notas_Credito_${new Date().toISOString().split('T')[0]}.xlsx`);
    showNotification('📦 Reporte de notas de crédito exportado exitosamente', 'success');
  };

  if (!hasPermission('notas-credito', 'read')) {
    return (
      <div className="p-6">
        <Card className="card-shope">
          <CardContent className="p-6 text-center">
            <ClipboardList className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No tienes permisos para ver las notas de crédito.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-red-600 to-pink-700 text-white border-0 shadow-2xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">📋 Notas de Crédito</h1>
              <p className="text-red-100">
                Gestión de notas de crédito - {filteredCreditNotes.length} de {creditNotes.length} registros
              </p>
            </div>
            
            <div className="flex gap-3">
              <Button 
                onClick={exportarNotasCredito} 
                variant="secondary" 
                className="bg-white/20 hover:bg-white/30 text-white border-white/20"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
              
              {hasPermission('notas-credito', 'create') && (
                <Dialog open={showDialog} onOpenChange={setShowDialog}>
                  <DialogTrigger asChild>
                    <Button className="btn-shope-secondary">
                      <Plus className="w-4 h-4 mr-2" />
                      Nueva NC
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingNote ? 'Editar Nota de Crédito' : 'Nueva Nota de Crédito'}
                      </DialogTitle>
                    </DialogHeader>
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Información del Cliente */}
                      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200">
                        <CardHeader>
                          <CardTitle className="text-blue-700 dark:text-blue-300">Información del Cliente</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="cliente">Cliente</Label>
                            <Input
                              id="cliente"
                              value={formData.cliente}
                              onChange={(e) => setFormData(prev => ({ ...prev, cliente: e.target.value }))}
                              required
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="id_cliente">ID Cliente</Label>
                            <Input
                              id="id_cliente"
                              value={formData.id_cliente}
                              onChange={(e) => setFormData(prev => ({ ...prev, id_cliente: e.target.value }))}
                              required
                            />
                          </div>
                          
                          <div className="col-span-2">
                            <Label htmlFor="razon_social">Razón Social</Label>
                            <Input
                              id="razon_social"
                              value={formData.razon_social}
                              onChange={(e) => setFormData(prev => ({ ...prev, razon_social: e.target.value }))}
                            />
                          </div>
                        </CardContent>
                      </Card>

                      {/* Información de la NC */}
                      <Card className="bg-green-50 dark:bg-green-900/20 border-green-200">
                        <CardHeader>
                          <CardTitle className="text-green-700 dark:text-green-300">Información de la Nota de Crédito</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="fecha">Fecha</Label>
                            <Input
                              id="fecha"
                              type="date"
                              value={formData.fecha}
                              onChange={(e) => setFormData(prev => ({ ...prev, fecha: e.target.value }))}
                              required
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="monto">Monto</Label>
                            <Input
                              id="monto"
                              type="number"
                              step="0.01"
                              value={formData.monto}
                              onChange={(e) => setFormData(prev => ({ ...prev, monto: Number(e.target.value) }))}
                              required
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="factura_aplicada">Factura Aplicada</Label>
                            <Input
                              id="factura_aplicada"
                              value={formData.factura_aplicada}
                              onChange={(e) => setFormData(prev => ({ ...prev, factura_aplicada: e.target.value }))}
                              placeholder="Número de factura"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="estatus">Estatus</Label>
                            <Select 
                              value={formData.estatus}
                              onValueChange={(value: 'Pendiente' | 'Aplicada') => setFormData(prev => ({ ...prev, estatus: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Pendiente">Pendiente</SelectItem>
                                <SelectItem value="Aplicada">Aplicada</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="col-span-2">
                            <Label htmlFor="motivo">Motivo</Label>
                            <Textarea
                              id="motivo"
                              value={formData.motivo}
                              onChange={(e) => setFormData(prev => ({ ...prev, motivo: e.target.value }))}
                              rows={3}
                              required
                              placeholder="Describe el motivo de la nota de crédito"
                            />
                          </div>
                        </CardContent>
                      </Card>

                      {/* Documentos y Evidencias */}
                      <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200">
                        <CardHeader>
                          <CardTitle className="text-purple-700 dark:text-purple-300">Documentos y Evidencias</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Archivo CFDI de la NC</Label>
                              <FileUpload
                                accept=".xml,.pdf"
                                onFileSelect={handleCfdiUpload}
                                files={cfdiFiles}
                                maxSize={5 * 1024 * 1024}
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                Sube el archivo XML o PDF del CFDI de la nota de crédito
                              </p>
                            </div>
                            
                            <div>
                              <Label>Evidencias de Soporte</Label>
                              <FileUpload
                                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                onFileSelect={handleEvidenceUpload}
                                files={evidenceFiles}
                                maxSize={10 * 1024 * 1024}
                                multiple
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                Múltiples archivos de evidencia (fotos, documentos, etc.)
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <div className="flex gap-3 pt-4">
                        <Button type="submit" disabled={loading} className="btn-shope-primary flex-1">
                          {loading ? 'Procesando...' : (editingNote ? 'Actualizar' : 'Crear')} Nota de Crédito
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => {
                            setShowDialog(false);
                            setEditingNote(null);
                            resetForm();
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="card-shope">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-red-600" />
            Filtros de Notas de Crédito
          </CardTitle>
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <Label>Mes</Label>
              <Select value={filters.mes} onValueChange={(value) => setFilters(prev => ({ ...prev, mes: value }))}>
                <SelectTrigger className="w-48">
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
              <Label>Estatus</Label>
              <Select value={filters.estatus} onValueChange={(value) => setFilters(prev => ({ ...prev, estatus: value }))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Pendiente">Pendiente</SelectItem>
                  <SelectItem value="Aplicada">Aplicada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Cliente</Label>
              <Input
                placeholder="Buscar cliente"
                value={filters.cliente}
                onChange={(e) => setFilters(prev => ({ ...prev, cliente: e.target.value }))}
                className="w-48 input-shope"
              />
            </div>
            
            <div>
              <Label>Factura</Label>
              <Input
                placeholder="Buscar factura"
                value={filters.factura}
                onChange={(e) => setFilters(prev => ({ ...prev, factura: e.target.value }))}
                className="w-48 input-shope"
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Credit Notes Table */}
      <Card className="table-shope">
        <CardHeader>
          <CardTitle>Lista de Notas de Crédito ({filteredCreditNotes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredCreditNotes}
            columns={columns}
            loading={loading}
            onEdit={hasPermission('notas-credito', 'update') ? handleEdit : undefined}
            onDelete={hasPermission('notas-credito', 'delete') ? handleDelete : undefined}
            searchPlaceholder="Buscar por cliente o motivo..."
            emptyMessage="No hay notas de crédito registradas que coincidan con los filtros"
            exportFileName="📦_Boxito_Notas_Credito"
          />
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="card-shope">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-red-600" />
            Resumen de Notas de Crédito
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-blue-600 text-sm font-medium mb-1">Total NC</div>
              <div className="text-2xl font-bold text-blue-700">
                {filteredCreditNotes.length}
              </div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-green-600 text-sm font-medium mb-1">Monto Total</div>
              <div className="text-2xl font-bold text-green-700">
                ${filteredCreditNotes.reduce((sum, nc) => sum + nc.monto, 0).toLocaleString('es-MX')}
              </div>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-orange-600 text-sm font-medium mb-1">Pendientes</div>
              <div className="text-2xl font-bold text-orange-700">
                {filteredCreditNotes.filter(nc => nc.estatus === 'Pendiente').length}
              </div>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-purple-600 text-sm font-medium mb-1">Aplicadas</div>
              <div className="text-2xl font-bold text-purple-700">
                {filteredCreditNotes.filter(nc => nc.estatus === 'Aplicada').length}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
