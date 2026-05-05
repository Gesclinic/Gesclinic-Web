import React from 'react';

export default function AgendaTable({ appointments = [], loading, onClickSlot }) {
  if (loading) {
    return <p className="text-center py-6 text-gray-500">Carregando…</p>;
  }

  if (!appointments.length) {
    return <p className="text-center py-10 text-gray-400">Nenhum agendamento encontrado.</p>;
  }

  return (
    <table className="w-full border-collapse">
      <thead className="bg-gray-100 text-sm">
        <tr>
          <th className="px-3 py-2 text-left">Horário</th>
          <th className="px-3 py-2 text-left">Paciente</th>
          <th className="px-3 py-2 text-left">Profissional</th>
          <th className="px-3 py-2 text-left">Serviço</th>
        </tr>
      </thead>

      <tbody>
        {appointments.map((a) => (
          <tr
            key={a.id}
            className="border-b hover:bg-gray-50 cursor-pointer"
            onClick={() => onClickSlot(a)}
          >
            <td className="px-3 py-2">{a.scheduled_time?.slice(0, 5)}</td>
            <td className="px-3 py-2">{a.patient_name}</td>
            <td className="px-3 py-2">{a.professional_name}</td>
            <td className="px-3 py-2">{a.service_name}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
