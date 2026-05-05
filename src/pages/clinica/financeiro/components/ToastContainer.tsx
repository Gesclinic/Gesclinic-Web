import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useToastManager, type Toast } from '../hooks/useToastManager';

const getToastColors = (type: Toast['type']) => {
  switch (type) {
    case 'success':
      return {
        bg: 'bg-green-50',
        border: 'border-green-200',
        icon: 'text-green-600',
        title: 'text-green-900',
        description: 'text-green-700',
      };
    case 'error':
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        icon: 'text-red-600',
        title: 'text-red-900',
        description: 'text-red-700',
      };
    case 'warning':
      return {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        icon: 'text-amber-600',
        title: 'text-amber-900',
        description: 'text-amber-700',
      };
    case 'info':
    default:
      return {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        icon: 'text-blue-600',
        title: 'text-blue-900',
        description: 'text-blue-700',
      };
  }
};

const getIcon = (type: Toast['type']) => {
  switch (type) {
    case 'success':
      return CheckCircle;
    case 'error':
      return AlertCircle;
    case 'warning':
      return AlertTriangle;
    case 'info':
    default:
      return Info;
  }
};

const ToastItem: React.FC<{ toast: Toast; onRemove: (id: string) => void }> = ({
  toast,
  onRemove,
}) => {
  const colors = getToastColors(toast.type);
  const Icon = getIcon(toast.type);

  useEffect(() => {
    if (!toast.duration || toast.duration <= 0) return;

    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, toast.duration);

    return () => clearTimeout(timer);
  }, [toast, onRemove]);

  return (
    <div
      className={`${colors.bg} border ${colors.border} rounded-lg p-4 mb-3 flex items-start gap-3 shadow-md animate-in fade-in slide-in-from-right-2 duration-300`}
      role="alert"
    >
      <Icon className={`${colors.icon} flex-shrink-0 mt-0.5`} size={20} />
      <div className="flex-1 min-w-0">
        <p className={`${colors.title} font-semibold text-sm`}>{toast.title}</p>
        {toast.description && (
          <p className={`${colors.description} text-xs mt-1`}>{toast.description}</p>
        )}
        {toast.action && (
          <button
            onClick={toast.action.onClick}
            className={`${colors.title} text-xs font-semibold mt-2 hover:underline`}
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className={`${colors.icon} flex-shrink-0 hover:opacity-70 transition-opacity`}
        aria-label="Fechar notificação"
      >
        <X size={18} />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastManager();

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md pointer-events-auto">
      <div className="flex flex-col">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </div>
  );
};
