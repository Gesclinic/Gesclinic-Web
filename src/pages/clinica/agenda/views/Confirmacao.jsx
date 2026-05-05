// src/pages/clinica/agenda/views/Confirmacao.jsx
import React from 'react';

export default function Confirmacao() {
  return (
    <div>
      <h2 className="text-lg font-semibold text-[hsl(var(--primary))]">Confirmação de Consultas</h2>

      <p className="text-gray-600 mb-4">Gerencie confirmações automáticas e manuais.</p>

      <div className="rounded-lg border p-4 bg-gray-50">
        <ul className="text-sm text-gray-700 space-y-2">
          <li>✔ Lista de pacientes pendentes</li>
          <li>✔ Envio de WhatsApp</li>
          <li>✔ Controle de respostas</li>
          <li>✔ Status automático</li>
        </ul>
      </div>
    </div>
  );
}
