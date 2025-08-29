
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/hooks/useNotification';
import { FileDown, BarChart, PieChart, DollarSign, Users } from 'lucide-react';
import { Bar, BarChart as RechartsBarChart, Pie, PieChart as RechartsPieChart, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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

export default function Reportes() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
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
      showNotification('Error al cargar datos para reportes', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const filteredInvoices = useMemo(() => {
    if (filters.anio === 'all') return invoices;
    return invoices.filter(invoice => invoice.fecha_creacion.startsWith(filters.anio));
  }, [filters, invoices]);

  const monthlyData = useMemo(() => {
    const data = Array.from({ length: 12 }, (_, i) => ({
      name: new Date(0, i).toLocaleString('es-MX', { month: 'short' }),
      total: 0,
      pagado: 0,
    }));

    filteredInvoices.forEach(invoice => {
      const month = getMonthFromYYYYMMDD(invoice.fecha_creacion) - 1;
      if (month >= 0 && month < 12) {
        data[month].total += invoice.total;
        data[month].pagado += (invoice.pago1 || 0) + (invoice.pago2 || 0) + (invoice.pago3 || 0) + (invoice.nc || 0);
      }
    });

    return data;
  }, [filteredInvoices]);

  const statusData = useMemo(() => {
    const data = { Pendiente: 0, Pagada: 0 };
    filteredInvoices.forEach(invoice => {
      data[invoice.estatus]++;
    });
    return [
      { name: 'Pendiente', value: data.Pendiente },
      { name: 'Pagada', value: data.Pagada },
    ];
  }, [filteredInvoices]);

  const topClientsData = useMemo(() => {
    const clientTotals: { [key: string]: number } = {};
    filteredInvoices.forEach(invoice => {
      clientTotals[invoice.cliente] = (clientTotals[invoice.cliente] || 0) + invoice.total;
    });
    return Object.entries(clientTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, value]) => ({ name, total: value }));
  }, [filteredInvoices]);

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());
  }, []);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  const formatCurrency = (value: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);

  if (loading) return <p>Cargando reportes...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Reportes y Analíticas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Select value={filters.anio} onValueChange={(value) => handleFilterChange('anio', value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Año" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los años</SelectItem>
                {years.map(year => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasPermission('reportes', 'export') && (
              <Button size="sm" disabled>
                <FileDown className="mr-2 h-4 w-4" />
                Exportar Reporte
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><BarChart className="mr-2 h-5 w-5" /> Ventas Mensuales</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsBarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={formatCurrency} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="total" fill="#8884d8" name="Total Facturado" />
                <Bar dataKey="pagado" fill="#82ca9d" name="Total Pagado" />
              </RechartsBarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><PieChart className="mr-2 h-5 w-5" /> Estatus de Facturas</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label>
                  <Cell key="cell-0" fill={COLORS[0]} />
                  <Cell key="cell-1" fill={COLORS[1]} />
                </Pie>
                <Tooltip />
                <Legend />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Users className="mr-2 h-5 w-5" /> Top 5 Clientes por Facturación</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsBarChart data={topClientsData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={formatCurrency} />
              <YAxis type="category" dataKey="name" width={150} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="total" fill="#ffc658" name="Total Facturado">
                {topClientsData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </RechartsBarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
