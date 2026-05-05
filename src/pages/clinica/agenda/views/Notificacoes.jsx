// src/pages/clinica/agenda/views/Notificacoes.jsx
import React from 'react';

export default function Notificacoes() {
  return (
    <div>
      <h2 className="text-lg font-semibold text-[hsl(var(--primary))]">Notificações Automáticas</h2>

      <p className="text-gray-600 mb-4">Configure mensagens automáticas, envios e horários.</p>

      <div className="rounded border bg-white p-4 shadow-sm">
        <p className="text-gray-500 italic">Configurações serão carregadas do banco (em breve).</p>
      </div>
    </div>
  );
}
