
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import NotificationSystem from './components/NotificationSystem';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Facturacion from './pages/Facturacion';
import Pagos from './pages/Pagos';
import Comprobantes from './pages/Comprobantes';
import EstadoCuenta from './pages/EstadoCuenta';
import Directorio from './pages/Directorio';
import Propuestas from './pages/Propuestas';
import Comercial from './pages/Comercial';
import Reportes from './pages/Reportes';
import Usuarios from './pages/Usuarios';
import NotasCredito from './pages/NotasCredito';
import CancelacionGuias from './pages/CancelacionGuias';
import Tickets from './pages/Tickets';
import ConfiguracionNotificaciones from './pages/ConfiguracionNotificaciones';
import { useNotification } from './hooks/useNotification';

// Contexto global para notificaciones
export const NotificationContext = React.createContext<{
  showNotification: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
} | null>(null);

function AppContent() {
  const notificationContext = useNotification();
  const { user, loading } = useAuth();

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-2xl text-white font-bold">📦</span>
          </div>
          <p className="text-gray-600 dark:text-gray-300">📦 Boxito está verificando tu autenticación...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <NotificationContext.Provider value={notificationContext}>
        <Login />
        <NotificationSystem notification={notificationContext.notification} />
      </NotificationContext.Provider>
    );
  }

  return (
    <NotificationContext.Provider value={notificationContext}>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/facturacion" element={<Facturacion />} />
          <Route path="/pagos" element={<Pagos />} />
          <Route path="/comprobantes" element={<Comprobantes />} />
          <Route path="/estado-cuenta" element={<EstadoCuenta />} />
          <Route path="/directorio" element={<Directorio />} />
          <Route path="/propuestas" element={<Propuestas />} />
          <Route path="/comercial" element={<Comercial />} />
          <Route path="/reportes" element={<Reportes />} />
          <Route path="/usuarios" element={<Usuarios />} />
          <Route path="/notas-credito" element={<NotasCredito />} />
          <Route path="/cancelacion-guias" element={<CancelacionGuias />} />
          <Route path="/tickets" element={<Tickets />} />
          <Route path="/configuracion-notificaciones" element={<ConfiguracionNotificaciones />} />
        </Routes>
        <NotificationSystem notification={notificationContext.notification} />
      </Layout>
    </NotificationContext.Provider>
  );
}

function App() {
  const notificationContext = useNotification();

  return (
    <NotificationContext.Provider value={notificationContext}>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </NotificationContext.Provider>
  );
}

export default App;
