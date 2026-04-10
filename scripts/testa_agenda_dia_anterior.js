// Teste manual de agendamentos para o dia anterior
// Cole este código no console do navegador na página da agenda

(async () => {
  const { listAppointments } = await import('/src/lib/appointmentsApi.js');
  // Ajuste o clinicId conforme necessário
  const clinicId = window?.GESCLINIC_CLINIC_ID || 'COLOQUE_O_ID_DA_CLINICA_AQUI';
  const start = '2026-01-19T00:00:00';
  const end = '2026-01-19T23:59:59';
  const result = await listAppointments({ clinicId, start, end });
  console.log('Agendamentos do dia 19/01/2026:', result);
})();

// Se o array vier vazio, não há agendamentos ou a query está filtrando errado.
// Se vierem agendamentos, o problema está no filtro/renderização do frontend.