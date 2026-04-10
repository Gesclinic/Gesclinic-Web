import React from "react";

export default function DashboardAgenda() {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-[hsl(var(--primary))]">
        Agenda Unificada
      </h2>

      <p className="text-gray-600">
        Visualização geral de todos os agendamentos por profissional.
      </p>

      <div className="mt-4 text-sm text-gray-400 italic">
        O calendário completo é renderizado automaticamente pelo AgendaLayout.
      </div>
    </div>
  );
}

