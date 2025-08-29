import React from 'react';

interface User {
  id: string;
  username: string;
  name: string;
  email: string | null;
  role: 'admin' | 'manager' | 'employee' | 'readonly';
  permissions: string[];
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  hasPermission: (module: string, action: string) => boolean;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);

  // Helper function to handle auth errors and cleanup
  const handleAuthError = (error: any, context: string) => {
    console.log(`📦 Boxito: Auth error in ${context}:`, error);
    
    // Si es error de token expirado o inválido, limpiar localStorage
    if (error.code === 'TOKEN_EXPIRED' || 
        error.code === 'TOKEN_INVALID' || 
        error.code === 'SESSION_EXPIRED' ||
        error.status === 401) {
      console.log('📦 Boxito: Token expired/invalid, cleaning localStorage...');
      localStorage.removeItem('auth_token');
      setUser(null);
    }
  };

  // Check if user is already logged in when app loads
  React.useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
          console.log('📦 Boxito: No auth token found');
          setLoading(false);
          return;
        }

        console.log('📦 Boxito: Verifying existing token...');
        const response = await fetch('/api/auth/verify', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const userData = await response.json();
          console.log('📦 Boxito: Usuario autenticado:', userData.name);
          setUser(userData);
        } else {
          console.log('📦 Boxito: Token verification failed, status:', response.status);
          
          // Intentar obtener detalles del error
          try {
            const errorData = await response.json();
            handleAuthError(errorData, 'checkAuth');
          } catch (parseError) {
            console.log('📦 Boxito: Could not parse error response, clearing token');
            localStorage.removeItem('auth_token');
            setUser(null);
          }
        }
      } catch (error) {
        console.error('📦 Boxito: Error verificando autenticación:', error);
        
        // En caso de error de red, mantener el token pero mostrar como no autenticado
        // para que el usuario pueda intentar login nuevamente
        handleAuthError({ code: 'NETWORK_ERROR' }, 'checkAuth');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      console.log('📦 Boxito: Intentando login para usuario:', username);
      
      if (!username || !password) {
        throw new Error('Usuario y contraseña son requeridos');
      }

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          username: username.trim(), 
          password: password 
        })
      });

      console.log('📦 Boxito: Login response status:', response.status);

      if (!response.ok) {
        let errorMessage = 'Error de login';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          console.error('📦 Boxito: Login failed with error:', errorData);
          
          // Manejar errores específicos
          if (errorData.code === 'TOKEN_EXPIRED') {
            errorMessage = 'Sesión expirada - inicia sesión nuevamente';
          }
        } catch (parseError) {
          console.error('📦 Boxito: Could not parse error response');
          if (response.status === 401) {
            errorMessage = 'Credenciales inválidas';
          } else if (response.status >= 500) {
            errorMessage = 'Error del servidor - intenta más tarde';
          }
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('📦 Boxito: Login exitoso para usuario:', data.user.name);
      
      if (!data.token || !data.user) {
        throw new Error('Respuesta de login inválida');
      }
      
      // Limpiar cualquier token anterior antes de guardar el nuevo
      localStorage.removeItem('auth_token');
      localStorage.setItem('auth_token', data.token);
      setUser(data.user);
      
      console.log('📦 Boxito: Token stored and user set successfully');
    } catch (error) {
      console.error('📦 Boxito: Login error:', error);
      
      // Limpiar token en caso de error
      localStorage.removeItem('auth_token');
      setUser(null);
      
      // Re-throw with more specific error message
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error('Error de conexión - verifica tu red');
      }
    }
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        console.log('📦 Boxito: Cerrando sesión en el servidor...');
        try {
          const response = await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            console.log('📦 Boxito: Server logout successful');
          } else {
            console.log('📦 Boxito: Server logout failed, but continuing with local logout');
          }
        } catch (error) {
          console.error('📦 Boxito: Error al cerrar sesión en servidor:', error);
          // Continue with logout even if server call fails
        }
      }
    } catch (error) {
      console.error('📦 Boxito: Logout error:', error);
    } finally {
      localStorage.removeItem('auth_token');
      setUser(null);
      console.log('📦 Boxito: Usuario desconectado localmente');
    }
  };

  const hasPermission = (module: string, action: string): boolean => {
    if (!user || !user.permissions) {
      return false;
    }
    
    const permission = `${module}:${action}`;
    return user.permissions.includes(permission);
  };

  // Setup interceptor for handling 401 responses globally
  React.useEffect(() => {
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      
      // Interceptar respuestas 401 para limpiar tokens automáticamente
      if (response.status === 401) {
        try {
          const errorData = await response.clone().json();
          
          if (errorData.code === 'TOKEN_EXPIRED' || 
              errorData.code === 'TOKEN_INVALID' || 
              errorData.code === 'SESSION_EXPIRED') {
            console.log('📦 Boxito: Detected expired/invalid token, auto-logout...');
            
            // Auto-logout sin mostrar error
            localStorage.removeItem('auth_token');
            setUser(null);
          }
        } catch (parseError) {
          // Si no se puede parsear, asumir que es token inválido
          console.log('📦 Boxito: 401 response without parseable JSON, cleaning token...');
          localStorage.removeItem('auth_token');
          setUser(null);
        }
      }
      
      return response;
    };
    
    // Cleanup function para restaurar fetch original
    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  const value = {
    user,
    login,
    logout,
    loading,
    hasPermission
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
