import * as React from 'react';

export interface NotificationData {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

export function useNotification() {
  const [notification, setNotification] = React.useState<NotificationData | null>(null);

  const showNotification = React.useCallback((message: string, type: NotificationData['type'] = 'info', duration: number = 3000) => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, duration);
  }, []);

  return { notification, showNotification };
}