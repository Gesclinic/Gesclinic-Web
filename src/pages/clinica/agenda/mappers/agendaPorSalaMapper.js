// Mapper para agrupar agenda por sala
export function mapAgendaPorSala(agendaData) {
  const grouped = {};
  agendaData.forEach(item => {
    const salaId = item.sala_id;
    if (!grouped[salaId]) grouped[salaId] = [];
    grouped[salaId].push(item);
  });
  return grouped;
}
