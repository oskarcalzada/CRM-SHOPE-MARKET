import * as React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { ShieldX } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  module: string;
  action: string;
  fallback?: React.ReactNode;
}

export default function ProtectedRoute({ 
  children, 
  module, 
  action, 
  fallback 
}: ProtectedRouteProps) {
  const { hasPermission } = useAuth();

  if (!hasPermission(module, action)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <ShieldX className="w-16 h-16 text-red-500 mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Acceso Restringido
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          No tienes permisos para acceder a esta funcionalidad
        </p>
        <Button variant="outline" onClick={() => window.history.back()}>
          Volver
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}