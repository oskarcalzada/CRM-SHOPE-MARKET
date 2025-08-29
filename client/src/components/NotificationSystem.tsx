import React from 'react';
import { NotificationData } from '@/hooks/useNotification';

interface NotificationSystemProps {
  notification: NotificationData | null;
}

export default function NotificationSystem({ notification }: NotificationSystemProps) {
  if (!notification) return null;

  const getNotificationStyles = (type: NotificationData['type']) => {
    switch (type) {
      case 'success':
        return 'bg-gradient-to-r from-green-500 to-emerald-600 border-green-400 shadow-green-200';
      case 'error':
        return 'bg-gradient-to-r from-red-500 to-red-600 border-red-400 shadow-red-200';
      case 'warning':
        return 'bg-gradient-to-r from-orange-500 to-amber-600 border-orange-400 shadow-orange-200';
      default:
        return 'bg-gradient-to-r from-blue-500 to-blue-600 border-blue-400 shadow-blue-200';
    }
  };

  const getBoxitoMessage = (type: NotificationData['type'], message: string) => {
    // Si el mensaje ya incluye "Boxito" o referencias específicas, no modificar
    if (message.includes('Boxito') || message.includes('📦')) {
      return message;
    }

    // Agregar prefijo de Boxito según el tipo
    switch (type) {
      case 'success':
        return `¡Boxito dice: ${message}!`;
      case 'error':
        return `Boxito informa: ${message}`;
      case 'warning':
        return `Boxito advierte: ${message}`;
      default:
        return `Boxito: ${message}`;
    }
  };

  const getBoxitoGreeting = (type: NotificationData['type']) => {
    switch (type) {
      case 'success':
        return '¡Perfecto, todo salió genial! ✨';
      case 'error':
        return '¡Ups! Algo no salió como esperaba... 😅';
      case 'warning':
        return '¡Atención! Boxito tiene algo importante que decirte ⚠️';
      default:
        return '¡Hola! Boxito tiene información para ti 💬';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-[9999] animate-in slide-in-from-right-5 duration-300">
      <div className={`
        ${getNotificationStyles(notification.type)}
        text-white px-6 py-4 rounded-2xl shadow-2xl border-2
        flex items-center space-x-4 max-w-md min-w-80
        backdrop-blur-md transform hover:scale-105 transition-transform
        relative overflow-hidden
      `}>
        {/* Mascota Boxito con imagen real */}
        <div className="flex-shrink-0 relative z-10">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center animate-bounce shadow-lg border-2 border-white/20 overflow-hidden">
            <img 
              src="/assets/boxito-mascot.jpg" 
              alt="Boxito - Mascota de Shope Envios"
              className="w-full h-full object-contain rounded-full"
              onError={(e) => {
                // Fallback a emoji si la imagen no carga
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.parentElement!.innerHTML = '<span class="text-3xl filter drop-shadow-lg">📦</span>';
              }}
            />
          </div>
          
          {/* Texto "Shope Envios" pequeño debajo de la mascota */}
          <div className="text-center mt-1">
            <div className="text-[8px] font-bold text-white/80 leading-tight">
              SHOPE<br/>ENVIOS
            </div>
          </div>
        </div>
        
        {/* Contenido de Boxito */}
        <div className="flex-1 relative z-10">
          <div className="font-bold text-sm mb-1 filter drop-shadow-sm">
            {getBoxitoGreeting(notification.type)}
          </div>
          <div className="text-sm opacity-95 font-medium leading-relaxed">
            {getBoxitoMessage(notification.type, notification.message)}
          </div>
        </div>

        {/* Indicador de progreso con brillo */}
        <div className="absolute bottom-0 left-0 h-1.5 bg-white/40 rounded-full overflow-hidden w-full">
          <div className="h-full bg-white/80 animate-progress-bar shadow-sm"></div>
        </div>

        {/* Efecto de brillo en el borde */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-white/10 via-transparent to-white/10 pointer-events-none"></div>
        
        {/* Partículas decorativas */}
        <div className="absolute top-2 right-2 w-2 h-2 bg-white/50 rounded-full animate-pulse"></div>
        <div className="absolute top-4 right-6 w-1 h-1 bg-white/40 rounded-full animate-ping delay-500"></div>
        <div className="absolute bottom-3 left-3 w-1.5 h-1.5 bg-white/30 rounded-full animate-pulse delay-1000"></div>
        
        {/* Logo de Shope Envios sutil en el fondo */}
        <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
          <img 
            src="/assets/boxito-mascot.jpg" 
            alt="Shope Envios Background"
            className="w-24 h-24 object-contain"
          />
        </div>
      </div>
    </div>
  );
}
