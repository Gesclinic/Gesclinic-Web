// Mapper para agrupar agenda por profissional
export function mapAgendaPorProfissional(agendaData) {
  const grouped = {};
  agendaData.forEach((item) => {
    const profId = item.profissional_id;
    if (!grouped[profId]) {
      grouped[profId] = [];
    }
    grouped[profId].push(item);
  });
  return grouped;
}
