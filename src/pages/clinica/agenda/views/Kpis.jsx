// src/pages/clinica/agenda/views/Kpis.jsx
import React from "react";

export default function Kpis() {
  return (
    <div>
      <h2 className="text-lg font-semibold text-[hsl(var(--primary))] mb-4">
        KPIs da Agenda
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 shadow-sm rounded bg-white border">
          <p className="text-xs text-gray-500">Ocupação</p>
          <p className="text-xl font-bold text-[hsl(var(--primary))]">82%</p>
        </div>

        <div className="p-4 shadow-sm rounded bg-white border">
          <p className="text-xs text-gray-500">Faltas</p>
          <p className="text-xl font-bold text-red-600">12%</p>
        </div>

        <div className="p-4 shadow-sm rounded bg-white border">
          <p className="text-xs text-gray-500">Cancelamentos</p>
          <p className="text-xl font-bold text-yellow-600">8%</p>
        </div>

        <div className="p-4 shadow-sm rounded bg-white border">
          <p className="text-xs text-gray-500">Novos Pacientes</p>
          <p className="text-xl font-bold text-green-600">25</p>
        </div>
      </div>
    </div>
  );
}

