import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function EmergencyLogin() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    
    try {
      await login(username, password);
    } catch (err: any) {
      console.error('Error de login:', err);
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleCleanup = async () => {
    setLoading(true);
    try {
      console.log('📦 Boxito: Solicitando limpieza de memoria...');
      
      const response = await fetch('/api/cleanup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('📦 Boxito: Limpieza completada:', result);
        
        // Reintentar login después de limpieza
        setTimeout(() => {
          handleLogin();
        }, 2000);
      } else {
        throw new Error('Error en limpieza de memoria');
      }
    } catch (err: any) {
      console.error('Error en limpieza:', err);
      setError('Error al limpiar memoria: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-600 text-white p-3 rounded-full">
              📦
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            📦 Boxito CRM
          </CardTitle>
          <CardDescription>
            Acceso de Emergencia al Sistema
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-700">
                <p className="font-medium">Error de conexión:</p>
                <p>{error}</p>
                <p className="mt-2 text-xs">
                  Si el problema persiste, intenta la limpieza de memoria.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuario</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                disabled={loading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="admin123"
                disabled={loading}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !loading) {
                    handleLogin();
                  }
                }}
              />
            </div>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Conectando...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </Button>

            <Button 
              onClick={handleCleanup}
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              {loading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Limpiando...
                </>
              ) : (
                '🧹 Limpiar Memoria y Reintentar'
              )}
            </Button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-blue-700">
              <p className="font-medium">📋 Credenciales por defecto:</p>
              <p>• Usuario: <code className="bg-blue-100 px-1 rounded">admin</code></p>
              <p>• Contraseña: <code className="bg-blue-100 px-1 rounded">admin123</code></p>
            </div>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              Sistema optimizado para bajo consumo de memoria
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
