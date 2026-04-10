export function mapearPorSala(agenda = []) {
  const grupos = {};

  agenda.forEach(item => {
    const sala =
      item.room_name && item.room_name.trim()
        ? item.room_name
        : "Sem sala";

    if (!grupos[sala]) {
      grupos[sala] = [];
    }

    grupos[sala].push(item);
  });

  return grupos;
}
