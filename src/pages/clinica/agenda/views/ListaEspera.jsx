// src/pages/clinica/agenda/views/ListaEspera.jsx
import React from "react";

export default function ListaEspera() {
  return (
    <div>
      <h2 className="text-lg font-semibold text-[hsl(var(--primary))]">
        Lista de Espera
      </h2>

      <p className="text-gray-600 mb-4">
        Pacientes aguardando horários disponíveis.
      </p>

      <div className="rounded-lg border p-4 bg-gray-50">
        <p className="text-gray-500 italic">Nenhum paciente na lista no momento.</p>
      </div>
    </div>
  );
}

