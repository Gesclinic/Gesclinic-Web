export function mapearPorProfissional(agenda = []) {
  const grupos = {};

  agenda.forEach(item => {
    const profissional =
      item.professional_name && item.professional_name.trim()
        ? item.professional_name
        : "Sem profissional";

    if (!grupos[profissional]) {
      grupos[profissional] = [];
    }

    grupos[profissional].push(item);
  });

  return grupos;
}
