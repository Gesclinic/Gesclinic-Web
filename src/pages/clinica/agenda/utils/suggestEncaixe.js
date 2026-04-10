/**
 * Sistema de Sugestão Inteligente de Encaixe
 * Analisa disponibilidade de horários, profissionais e salas
 * Gera score baseado em regras simples (sem IA externa)
 */

/**
 * Verifica se um horário está disponível para um profissional em uma sala
 * @param {string} horario - Horário (ex: "08:00")
 * @param {object} profissional - Dados do profissional
 * @param {object} sala - Dados da sala
 * @param {array} agendamentos - Agendamentos existentes
 * @param {number} duracao - Duração do agendamento em minutos
 * @returns {boolean} true se disponível
 */
export function checkDisponibilidade(horario, profissional, sala, agendamentos, duracao = 30) {
  if (!horario || !profissional?.id || !sala?.id) {
    return false;
  }

  // Converter horário para minutos
  const [hora, min] = horario.split(':').map(Number);
  const horarioMinutos = hora * 60 + min;
  const horarioFim = horarioMinutos + duracao;

  // Verificar conflitos com agendamentos existentes
  const temConflito = agendamentos.some(apt => {
    // Apenas verificar se é do mesmo profissional e sala
    if (apt.professional_id !== profissional.id || apt.room_id !== sala.id) {
      return false;
    }

    // Converter horário do agendamento para minutos
    const [aptHora, aptMin] = apt.start_time?.substring(0, 5).split(':').map(Number) || [0, 0];
    const aptInicio = aptHora * 60 + aptMin;
    const aptDuracao = apt.duration || 30;
    const aptFim = aptInicio + aptDuracao;

    // Verificar sobreposição
    return !(horarioFim <= aptInicio || horarioMinutos >= aptFim);
  });

  return !temConflito;
}

/**
 * Calcula ocupação de um horário em porcentagem
 * @param {string} horario - Horário (ex: "08:00")
 * @param {array} agendamentos - Agendamentos existentes
 * @param {array} profissionais - Lista de profissionais
 * @param {array} salas - Lista de salas
 * @returns {number} Ocupação em porcentagem (0-100)
 */
export function getOcupacaoHorario(horario, agendamentos, profissionais = [], salas = []) {
  if (!agendamentos || agendamentos.length === 0) {
    return 0;
  }

  // Contar agendamentos naquele horário
  const agendamentosNaHora = agendamentos.filter(apt => {
    const horarioApt = apt.start_time?.substring(0, 5);
    return horarioApt === horario;
  }).length;

  // Calcular slots totais (profissionais × salas)
  const totalSlots = Math.max(profissionais.length || 1, salas.length || 1);

  // Ocupação em porcentagem
  return Math.round((agendamentosNaHora / totalSlots) * 100);
}

/**
 * Conta slots consecutivos disponíveis a partir de um horário
 * @param {string} horarioInicio - Horário inicial
 * @param {array} horarios - Lista de todos os horários
 * @param {object} profissional - Profissional
 * @param {object} sala - Sala
 * @param {array} agendamentos - Agendamentos existentes
 * @returns {number} Quantidade de slots consecutivos livres
 */
export function countConsecutivosLivres(horarioInicio, horarios, profissional, sala, agendamentos) {
  const indexInicio = horarios.indexOf(horarioInicio);
  if (indexInicio === -1) return 0;

  let consecutivos = 0;
  for (let i = indexInicio; i < horarios.length; i++) {
    const livre = checkDisponibilidade(horarios[i], profissional, sala, agendamentos);
    if (livre) {
      consecutivos++;
    } else {
      break;
    }
  }

  return consecutivos;
}

/**
 * Gera sugestões de encaixe inteligentes
 * @param {object} params - Parâmetros
 * @param {array} params.horarios - Lista de horários disponíveis (ex: ["08:00", "08:30", ...])
 * @param {array} params.agendamentos - Agendamentos existentes
 * @param {array} params.profissionais - Lista de profissionais
 * @param {array} params.salas - Lista de salas
 * @param {object} params.servico - Dados do serviço (inclui duracao)
 * @param {number} params.maxSugestoes - Número máximo de sugestões (default: 3)
 * @returns {array} Array de sugestões ordenadas por score
 */
export function suggestEncaixes({
  horarios = [],
  agendamentos = [],
  profissionais = [],
  salas = [],
  servico = { duracao: 30 },
  maxSugestoes = 3,
}) {
  const suggestions = [];

  // Gerar todas as combinações possíveis
  horarios.forEach(horario => {
    profissionais.forEach(profissional => {
      salas.forEach(sala => {
        // Verificar se está disponível
        const livre = checkDisponibilidade(
          horario,
          profissional,
          sala,
          agendamentos,
          servico.duracao
        );

        if (!livre) return;

        // Calcular ocupação do horário
        const ocupacao = getOcupacaoHorario(horario, agendamentos, profissionais, salas);

        // Contar slots consecutivos livres
        const consecutivos = countConsecutivosLivres(
          horario,
          horarios,
          profissional,
          sala,
          agendamentos
        );

        // REGRA DE SCORING (sem IA)
        // 1. Preferir horários com menor ocupação (40%)
        const scoreOcupacao = (100 - ocupacao) * 0.4;

        // 2. Preferir slots consecutivos (30%)
        const scoreConsecutivos = Math.min(consecutivos * 10, 30);

        // 3. Bonus por profissional específico se houver preferência (20%)
        const scoreCompatibilidade = 20;

        // 4. Preferir horários mais cedo (10%)
        const [hora] = horario.split(':').map(Number);
        const scoreHorario = Math.max(10 - Math.max(0, hora - 8), 0);

        const score = scoreOcupacao + scoreConsecutivos + scoreCompatibilidade + scoreHorario;

        suggestions.push({
          horario,
          profissional,
          sala,
          score,
          ocupacao,
          consecutivos,
          motivo: generateMotivo(ocupacao, consecutivos),
        });
      });
    });
  });

  // Ordenar por score (maior primeiro) e retornar top N
  return suggestions
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSugestoes);
}

/**
 * Gera descrição do motivo da sugestão
 * @param {number} ocupacao - Ocupação em porcentagem
 * @param {number} consecutivos - Slots consecutivos livres
 * @returns {string} Motivo legível
 */
function generateMotivo(ocupacao, consecutivos) {
  const motivos = [];

  if (ocupacao <= 30) {
    motivos.push('Horário com baixa ocupação');
  } else if (ocupacao <= 60) {
    motivos.push('Horário disponível');
  }

  if (consecutivos >= 3) {
    motivos.push('Múltiplos slots livres');
  }

  return motivos.join(' • ') || 'Sugestão inteligente';
}

/**
 * Filtra sugestões por critério
 * @param {array} suggestions - Sugestões geradas
 * @param {object} filtro - Critérios de filtro
 * @returns {array} Sugestões filtradas
 */
export function filterSuggestions(suggestions, filtro = {}) {
  return suggestions.filter(s => {
    if (filtro.profissionalId && s.profissional.id !== filtro.profissionalId) {
      return false;
    }

    if (filtro.salaId && s.sala.id !== filtro.salaId) {
      return false;
    }

    if (filtro.maxOcupacao && s.ocupacao > filtro.maxOcupacao) {
      return false;
    }

    if (filtro.minConsecutivos && s.consecutivos < filtro.minConsecutivos) {
      return false;
    }

    return true;
  });
}
