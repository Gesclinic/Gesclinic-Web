import { useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  type: ToastType;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const toastStore: Toast[] = [];
let listeners: ((toasts: Toast[]) => void)[] = [];
let toastId = 0;

export function useToastManager() {
  const [toasts, setToasts] = useState<Toast[]>(toastStore);

  const subscribe = useCallback(() => {
    const listener = (newToasts: Toast[]) => {
      setToasts([...newToasts]);
    };
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);

  const notify = useCallback(
    (title: string, options?: { description?: string; type?: ToastType; duration?: number; action?: Toast['action'] }) => {
      const id = String(++toastId);
      const toast: Toast = {
        id,
        title,
        description: options?.description,
        type: options?.type || 'info',
        duration: options?.duration || 4000,
        action: options?.action
      };

      toastStore.push(toast);
      listeners.forEach((listener) => listener(toastStore));

      if (toast.duration && toast.duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, toast.duration);
      }

      return id;
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    const index = toastStore.findIndex((t) => t.id === id);
    if (index > -1) {
      toastStore.splice(index, 1);
      listeners.forEach((listener) => listener(toastStore));
    }
  }, []);

  const success = useCallback(
    (title: string, description?: string) =>
      notify(title, { description, type: 'success', duration: 3000 }),
    [notify]
  );

  const error = useCallback(
    (title: string, description?: string) =>
      notify(title, { description, type: 'error', duration: 5000 }),
    [notify]
  );

  const warning = useCallback(
    (title: string, description?: string) =>
      notify(title, { description, type: 'warning', duration: 4000 }),
    [notify]
  );

  const info = useCallback(
    (title: string, description?: string) =>
      notify(title, { description, type: 'info', duration: 3000 }),
    [notify]
  );

  // Subscribe on mount
  useCallback(() => {
    return subscribe();
  }, [subscribe])();

  return {
    toasts,
    notify,
    removeToast,
    success,
    error,
    warning,
    info
  };
}

// Export for use in non-React contexts
export const toastService = {
  notify: (title: string, options?: { description?: string; type?: ToastType; duration?: number }) => {
    const id = String(++toastId);
    const toast: Toast = {
      id,
      title,
      description: options?.description,
      type: options?.type || 'info',
      duration: options?.duration || 4000
    };

    toastStore.push(toast);
    listeners.forEach((listener) => listener(toastStore));

    if (toast.duration && toast.duration > 0) {
      setTimeout(() => {
        const index = toastStore.findIndex((t) => t.id === id);
        if (index > -1) {
          toastStore.splice(index, 1);
          listeners.forEach((listener) => listener(toastStore));
        }
      }, toast.duration);
    }

    return id;
  },
  success: (title: string, description?: string) =>
    toastService.notify(title, { description, type: 'success', duration: 3000 }),
  error: (title: string, description?: string) =>
    toastService.notify(title, { description, type: 'error', duration: 5000 }),
  warning: (title: string, description?: string) =>
    toastService.notify(title, { description, type: 'warning', duration: 4000 }),
  info: (title: string, description?: string) =>
    toastService.notify(title, { description, type: 'info', duration: 3000 })
};
