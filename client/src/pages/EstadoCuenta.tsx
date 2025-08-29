
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/hooks/useNotification';
import { FileDown, Search, X } from 'lucide-react';
import { Invoice } from '@/types';

// Helper para extraer el mes de una fecha YYYY-MM-DD sin problemas de zona horaria
const getMonthFromYYYYMMDD = (fechaYYYYMMDD: string): number => {
  if (!fechaYYYYMMDD || typeof fechaYYYYMMDD !== 'string' || !fechaYYYYMMDD.includes('-')) {
    return 0; // Devuelve un valor inválido si la fecha no es correcta
  }
  const partes = fechaYYYYMMDD.split('-');
  const mes = parseInt(partes[1], 10);
  return mes;
};

export default function EstadoCuenta() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    cliente: '',
    mes: 'all',
    anio: new Date().getFullYear().toString(),
  });
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
    });
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

  const summary = useMemo(() => {
    const totalFacturado = filteredInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalPagado = filteredInvoices.reduce((sum, inv) => sum + (inv.pago1 || 0) + (inv.pago2 || 0) + (inv.pago3 || 0) + (inv.nc || 0), 0);
    const totalPorCobrar = filteredInvoices.reduce((sum, inv) => sum + inv.por_cobrar, 0);
    return { totalFacturado, totalPagado, totalPorCobrar };
  }, [filteredInvoices]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Estado de Cuenta</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
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
          </div>
          <div className="flex justify-end">
            <Button onClick={resetFilters} variant="ghost" size="sm">
              <X className="mr-2 h-4 w-4" />
              Limpiar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Facturado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(summary.totalFacturado)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Pagado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalPagado)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Saldo por Cobrar</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalPorCobrar)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Detalle de Facturas</CardTitle>
            {hasPermission('estado-cuenta', 'export') && (
              <Button size="sm" disabled>
                <FileDown className="mr-2 h-4 w-4" />
                Exportar
              </Button>
            )}
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
                    <TableHead>Fecha Creación</TableHead>
                    <TableHead>No. Comprobante</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Pagado</TableHead>
                    <TableHead>Por Cobrar</TableHead>
                    <TableHead>Estatus</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>{invoice.fecha_creacion}</TableCell>
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
