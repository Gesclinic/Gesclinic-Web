// src/lib/statusColors.js

export const statusColors = {
  agenda: {
    agendado: "bg-blue-100 text-blue-800 border-blue-300",
    confirmado: "bg-green-100 text-green-800 border-green-300",
    presente: "bg-emerald-100 text-emerald-800 border-emerald-300",
    em_consultorio: "bg-purple-100 text-purple-800 border-purple-300",
    atendido: "bg-indigo-100 text-indigo-800 border-indigo-300",
    cancelado: "bg-red-100 text-red-800 border-red-300",
    faltou: "bg-yellow-100 text-yellow-800 border-yellow-300",
    livre: "bg-gray-50 text-gray-500 border-gray-200 border-dashed",
  },

  financeiro: {
    pendente: "bg-orange-100 text-orange-800 border-orange-300",
    pago: "bg-emerald-100 text-emerald-800 border-emerald-300",
    vencido: "bg-rose-100 text-rose-800 border-rose-300",
    em_aberto: "bg-gray-200 text-gray-700 border-gray-300",
  },

  faturamento: {
    enviado: "bg-blue-100 text-blue-800 border-blue-300",
    processado: "bg-green-100 text-green-800 border-green-300",
    glosado: "bg-red-100 text-red-800 border-red-300",
    faturado: "bg-teal-100 text-teal-800 border-teal-300",
    realizado: "bg-indigo-100 text-indigo-800 border-indigo-300",
    paga: "bg-emerald-100 text-emerald-800 border-emerald-300",
  },
};

export function colorForStatus(status, module = "agenda") {
  const normalized = status?.toLowerCase().replace(" ", "_");

  return (
    statusColors[module]?.[normalized] ||
    statusColors.agenda.agendado // fallback
  );
}
