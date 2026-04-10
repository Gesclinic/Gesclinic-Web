// src/pages/clinica/agenda/views/LogNotificacoes.jsx
import React from "react";

export default function LogNotificacoes() {
  return (
    <div>
      <h2 className="text-lg font-semibold text-[hsl(var(--primary))] mb-3">
        Log de Notificações
      </h2>

      <p className="text-gray-600 mb-4">
        Histórico completo de envios automáticos.
      </p>

      <div className="border rounded bg-white shadow-sm p-4">
        <p className="text-gray-500 italic">
          Nenhuma notificação registrada.
        </p>
      </div>
    </div>
  );
}

