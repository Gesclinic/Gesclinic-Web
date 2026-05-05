// src/pages/clinica/agenda/views/Relatorios.jsx
import React from 'react';

export default function Relatorios() {
  return (
    <div>
      <h2 className="text-lg font-semibold text-[hsl(var(--primary))]">Relatórios da Agenda</h2>

      <p className="text-gray-600 mb-4">Relatórios gerenciais e operacionais.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border p-4 rounded bg-white shadow-sm">
          <h3 className="font-semibold">Produtividade</h3>
          <p className="text-sm text-gray-500">Ocupação por profissional</p>
        </div>

        <div className="border p-4 rounded bg-white shadow-sm">
          <h3 className="font-semibold">Faltas / Cancelamentos</h3>
          <p className="text-sm text-gray-500">Índice e estatísticas</p>
        </div>
      </div>
    </div>
  );
}
