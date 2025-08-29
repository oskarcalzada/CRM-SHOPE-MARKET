
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/hooks/useNotification';
import { PlusCircle, Edit, Trash2, FileDown, Search, X } from 'lucide-react';
import { Invoice } from '@/types';
import { normalizeDateString } from '@/lib/utils';

// Helper para extraer el mes de una fecha YYYY-MM-DD sin problemas de zona horaria
const getMonthFromYYYYMMDD = (fechaYYYYMMDD: string): number => {
  if (!fechaYYYYMMDD || typeof fechaYYYYMMDD !== 'string' || !fechaYYYYMMDD.includes('-')) {
    return 0; // Devuelve un valor inválido si la fecha no es correcta
  }
  const partes = fechaYYYYMMDD.split('-');
  const mes = parseInt(partes[1], 10);
  return mes;
};

export default function Pagos() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    cliente: '',
    mes: 'all',
    anio: new Date().getFullYear().toString(),
    estatus: 'all',
  });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const { hasPermission } = useAuth();
  const { showNotification } = useNotification();

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const fetchInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/invoices', { headers: getAuthHeaders() });
      if (!response.ok) throw new Error('Error al cargar las facturas');
      const data = await response.json();
      setInvoices(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Un error desconocido ocurrió');
      showNotification('Error al cargar facturas', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  useEffect(() => {
    let result = invoices;

    if (filters.cliente) {
      result = result.filter(invoice =>
        invoice.cliente.toLowerCase().includes(filters.cliente.toLowerCase())
      );
    }

    if (filters.estatus !== 'all') {
      result = result.filter(invoice => invoice.estatus === filters.estatus);
    }

    if (filters.anio !== 'all') {
      result = result.filter(invoice => 
        invoice.fecha_creacion.startsWith(filters.anio)
      );
    }

    if (filters.mes !== 'all') {
      const mesSeleccionado = parseInt(filters.mes, 10);
      result = result.filter(invoice => {
        const mesFactura = getMonthFromYYYYMMDD(invoice.fecha_creacion);
        return mesFactura === mesSeleccionado;
      });
    }

    setFilteredInvoices(result);
  }, [filters, invoices]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      cliente: '',
      mes: 'all',
      anio: new Date().getFullYear().toString(),
      estatus: 'all',
    });
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const invoiceData: Partial<Invoice> = {
      ...editingInvoice,
      pago1: parseFloat(formData.get('pago1') as string || '0'),
      fecha_pago1: formData.get('fecha_pago1') ? normalizeDateString(formData.get('fecha_pago1') as string) : null,
      pago2: parseFloat(formData.get('pago2') as string || '0'),
      fecha_pago2: formData.get('fecha_pago2') ? normalizeDateString(formData.get('fecha_pago2') as string) : null,
      pago3: parseFloat(formData.get('pago3') as string || '0'),
      fecha_pago3: formData.get('fecha_pago3') ? normalizeDateString(formData.get('fecha_pago3') as string) : null,
      nc: parseFloat(formData.get('nc') as string || '0'),
      comentarios: formData.get('comentarios') as string,
    };

    // Recalculate por_cobrar and estatus
    const totalPaid = (invoiceData.pago1 || 0) + (invoiceData.pago2 || 0) + (invoiceData.pago3 || 0) + (invoiceData.nc || 0);
    invoiceData.por_cobrar = Math.max(0, (editingInvoice?.total || 0) - totalPaid);
    invoiceData.estatus = invoiceData.por_cobrar <= 0.01 ? 'Pagada' : 'Pendiente';

    try {
      const response = await fetch(`/api/invoices/${editingInvoice!.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ...editingInvoice, ...invoiceData }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar el pago');
      }

      showNotification('Pago actualizado exitosamente', 'success');
      setIsFormOpen(false);
      setEditingInvoice(null);
      fetchInvoices();
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Error desconocido', 'error');
    }
  };

  const openEditForm = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setIsFormOpen(true);
  };

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());
  }, []);

  const meses = [
    { value: '1', label: 'Enero' }, { value: '2', label: 'Febrero' }, { value: '3', label: 'Marzo' },
    { value: '4', label: 'Abril' }, { value: '5', label: 'Mayo' }, { value: '6', label: 'Junio' },
    { value: '7', label: 'Julio' }, { value: '8', label: 'Agosto' }, { value: '9', label: 'Septiembre' },
    { value: '10', label: 'Octubre' }, { value: '11', label: 'Noviembre' }, { value: '12', label: 'Diciembre' }
  ];

  const formatCurrency = (amount: number | null | undefined) => {
    return (amount || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Pagos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            <Input
              placeholder="Buscar por cliente..."
              value={filters.cliente}
              onChange={(e) => handleFilterChange('cliente', e.target.value)}
              className="lg:col-span-2"
            />
            <Select value={filters.mes} onValueChange={(value) => handleFilterChange('mes', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Mes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los meses</SelectItem>
                {meses.map(mes => (
                  <SelectItem key={mes.value} value={mes.value}>{mes.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.anio} onValueChange={(value) => handleFilterChange('anio', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Año" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los años</SelectItem>
                {years.map(year => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.estatus} onValueChange={(value) => handleFilterChange('estatus', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Estatus" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estatus</SelectItem>
                <SelectItem value="Pendiente">Pendiente</SelectItem>
                <SelectItem value="Pagada">Pagada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end">
            <Button onClick={resetFilters} variant="ghost" size="sm">
              <X className="mr-2 h-4 w-4" />
              Limpiar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Lista de Facturas</CardTitle>
            <Button size="sm" disabled>
              <FileDown className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Cargando...</p>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No. Comprobante</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Pagado</TableHead>
                    <TableHead>Por Cobrar</TableHead>
                    <TableHead>Estatus</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>{invoice.numero_comprobante}</TableCell>
                      <TableCell>{invoice.cliente}</TableCell>
                      <TableCell>{formatCurrency(invoice.total)}</TableCell>
                      <TableCell>{formatCurrency((invoice.pago1 || 0) + (invoice.pago2 || 0) + (invoice.pago3 || 0) + (invoice.nc || 0))}</TableCell>
                      <TableCell>{formatCurrency(invoice.por_cobrar)}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          invoice.estatus === 'Pagada' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {invoice.estatus}
                        </span>
                      </TableCell>
                      <TableCell>
                        {hasPermission('pagos', 'update') && (
                          <Button variant="ghost" size="sm" onClick={() => openEditForm(invoice)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar/Editar Pago</DialogTitle>
          </DialogHeader>
          {editingInvoice && (
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <h3 className="font-semibold">{editingInvoice.cliente}</h3>
                <p className="text-sm text-gray-500">Factura: {editingInvoice.numero_comprobante}</p>
                <p className="text-lg font-bold">{formatCurrency(editingInvoice.total)}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pago1">Pago 1</Label>
                  <Input id="pago1" name="pago1" type="number" step="0.01" defaultValue={editingInvoice.pago1 || ''} />
                </div>
                <div>
                  <Label htmlFor="fecha_pago1">Fecha Pago 1</Label>
                  <Input id="fecha_pago1" name="fecha_pago1" type="date" defaultValue={editingInvoice.fecha_pago1 || ''} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pago2">Pago 2</Label>
                  <Input id="pago2" name="pago2" type="number" step="0.01" defaultValue={editingInvoice.pago2 || ''} />
                </div>
                <div>
                  <Label htmlFor="fecha_pago2">Fecha Pago 2</Label>
                  <Input id="fecha_pago2" name="fecha_pago2" type="date" defaultValue={editingInvoice.fecha_pago2 || ''} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pago3">Pago 3</Label>
                  <Input id="pago3" name="pago3" type="number" step="0.01" defaultValue={editingInvoice.pago3 || ''} />
                </div>
                <div>
                  <Label htmlFor="fecha_pago3">Fecha Pago 3</Label>
                  <Input id="fecha_pago3" name="fecha_pago3" type="date" defaultValue={editingInvoice.fecha_pago3 || ''} />
                </div>
              </div>
              <div>
                <Label htmlFor="nc">Nota de Crédito (NC)</Label>
                <Input id="nc" name="nc" type="number" step="0.01" defaultValue={editingInvoice.nc || ''} />
              </div>
              <div>
                <Label htmlFor="comentarios">Comentarios</Label>
                <Input id="comentarios" name="comentarios" defaultValue={editingInvoice.comentarios || ''} />
              </div>
              <Button type="submit">Guardar Cambios</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
