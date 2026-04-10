import React from "react";
import { AlertCircle, AlertTriangle, CheckCircle, Info } from "lucide-react";

/**
 * Componente de alerta padronizado para Base do Sistema
 * Exibe apenas mensagens de negócio, nunca erros técnicos
 */
export function Alert({ type = "info", title, message, onClose }) {
  const styles = {
    info: "bg-blue-50 border-blue-200 text-blue-900",
    success: "bg-green-50 border-green-200 text-green-900",
    warning: "bg-yellow-50 border-yellow-200 text-yellow-900",
    error: "bg-red-50 border-red-200 text-red-900",
  };

  const icons = {
    info: <Info className="w-5 h-5" />,
    success: <CheckCircle className="w-5 h-5" />,
    warning: <AlertTriangle className="w-5 h-5" />,
    error: <AlertCircle className="w-5 h-5" />,
  };

  return (
    <div
      className={`border rounded-lg p-4 flex items-start gap-3 ${styles[type] || styles.info}`}
    >
      <div className="flex-shrink-0 mt-0.5">{icons[type]}</div>
      <div className="flex-1">
        {title && <p className="font-medium mb-1">{title}</p>}
        <p className="text-sm">{message}</p>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 text-2xl leading-none opacity-50 hover:opacity-75"
        >
          ×
        </button>
      )}
    </div>
  );
}
