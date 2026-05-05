// src/components/ui/toaster.jsx
import React from 'react';
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast';
import { useToast } from '@/components/ui/use-toast';

/**
 * Toaster global — renderize uma vez (ex.: em main.jsx)
 * <Toaster />
 */
export function Toaster({ duration = 3500, ...providerProps }) {
  const { toasts } = useToast();

  return (
    <ToastProvider duration={duration} {...providerProps}>
      {toasts.map(({ id, title, description, action, ...toastProps }) => (
        <Toast key={id} {...toastProps}>
          <div className="grid gap-1">
            {title ? <ToastTitle>{title}</ToastTitle> : null}
            {description ? <ToastDescription>{description}</ToastDescription> : null}
          </div>
          {action}
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}

export default Toaster;
