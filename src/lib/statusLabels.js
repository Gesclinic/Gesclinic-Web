// ================================================
//  STATUS LABELS  —  PADRÃO OFICIAL GESCLINIC
// ================================================

export const statusLabels = {
  agendado: "Agendado",
  confirmado: "Confirmado",
  presente: "Presente",
  em_consultorio: "Em Consultório",
  atendido: "Atendido",
  cancelado: "Cancelado",
  faltou: "Faltou",

  // inglês → português
  scheduled: "Agendado",
  confirmed: "Confirmado",
  present: "Presente",
  in_office: "Em Consultório",
  attended: "Atendido",
  finished: "Finalizado",
  cancelled: "Cancelado",
  no_show: "Faltou",
  "no-show": "Faltou",
};

// ================================================
//  CORES DOS STATUS
// ================================================

export const colorForStatus = (status) => {
  const s = String(status || "").toLowerCase().trim();

  const map = {
    agendado: "bg-blue-100 text-blue-800 border-blue-300",
    scheduled: "bg-blue-100 text-blue-800 border-blue-300",

    confirmado: "bg-green-100 text-green-800 border-green-300",
    confirmed: "bg-green-100 text-green-800 border-green-300",

    presente: "bg-emerald-100 text-emerald-800 border-emerald-300",
    present: "bg-emerald-100 text-emerald-800 border-emerald-300",

    em_consultorio: "bg-purple-100 text-purple-800 border-purple-300",
    in_office: "bg-purple-100 text-purple-800 border-purple-300",

    atendido: "bg-indigo-100 text-indigo-800 border-indigo-300",
    attended: "bg-indigo-100 text-indigo-800 border-indigo-300",
    finished: "bg-indigo-100 text-indigo-800 border-indigo-300",

    cancelado: "bg-red-100 text-red-800 border-red-300",
    cancelled: "bg-red-100 text-red-800 border-red-300",

    faltou: "bg-yellow-100 text-yellow-800 border-yellow-300",
    "no-show": "bg-yellow-100 text-yellow-800 border-yellow-300",
    no_show: "bg-yellow-100 text-yellow-800 border-yellow-300",
  };

  return map[s] || "bg-gray-100 text-gray-800 border-gray-300";
};

// ================================================
//  CANONICAL
// ================================================

export const labelForStatus = (status) =>
  statusLabels[String(status || "").toLowerCase()] || status;

export const statusToCanonical = (status) => {
  const s = String(status || "").toLowerCase().trim().replace(/_/g, "-");

  if (["agendado", "scheduled"].includes(s)) return "scheduled";
  if (["confirmado", "confirmed"].includes(s)) return "confirmed";
  if (["presente", "present"].includes(s)) return "present";
  if (["em-consultorio", "in-office"].includes(s)) return "in_office";
  if (["atendido", "attended", "finished"].includes(s)) return "attended";
  if (["cancelado", "cancelled"].includes(s)) return "cancelled";
  if (["faltou", "no-show"].includes(s)) return "no_show";

  return "scheduled";
};
