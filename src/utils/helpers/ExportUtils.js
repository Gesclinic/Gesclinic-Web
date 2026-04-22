import * as XLSX from "xlsx";

export function exportToExcel(appointments) {
  const data = appointments.map((a) => ({
    Data: a.start_time?.slice(0, 10),
    Hora: a.start_time?.slice(11, 16),
    Paciente: a.patient_name,
    Serviço: a.service_name,
    Convênio: a.payer_name,
    Valor: a.price,
    Status: a.status,
    Profissional: a.professional_name,
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Agenda");
  XLSX.writeFile(wb, "agenda_gesclinic.xlsx");
}

export function printAgenda() {
  window.print();
}
