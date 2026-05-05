/**
 * useAgendaFinanceMetrics.js
 * Hook para calcular métricas de Agenda × Financeiro
 * 
 * Objetivo: Gerar indicadores gerenciais simples e acionáveis
 * baseados na ocupação da agenda e receita.
 * 
 * NÃO é DRE, NÃO é análise contábil, NÃO duplica Financeiro.
 * É uma visão simplificada para DECISÃO RÁPIDA do gestor.
 */

export function useAgendaFinanceMetrics(appointments, professionals, services, selectedDate) {
  /**
   * Calcula total de receita dos agendamentos
   */
  const totalReceita = appointments.reduce((sum, a) => {
    const valor = parseFloat(a.value) || 0;
    return sum + valor;
  }, 0);

  /**
   * Calcula total de horas utilizadas
   * Considera slots de 30 min por padrão
   */
  const totalHoras = appointments.length * 0.5;

  /**
   * Receita por hora de trabalho
   * Métrica simples: quanto ganho por hora de ocupação?
   */
  const receitaPorHora = totalHoras > 0 ? totalReceita / totalHoras : 0;

  /**
   * Calcula ocupação percentual
   * Capacidade = (profissionais × salas × slots por dia)
   * Para 8h dia (08:00 às 17:00) = 10 slots de 30min
   */
  const slotsDisponiveis = Math.max(1, (professionals?.length || 1) * 10 // 10 slots = 5h úteis
  );
  const ocupacaoPercentual = Math.round(appointments.length / slotsDisponiveis * 100);

  /**
   * Calcula quantidade de serviços
   * Agrupa agendamentos por serviço para análise de mix
   */
  const servicosMais = (services || []).map(srv => ({
    id: srv.id,
    nome: srv.name || 'Sem nome',
    valor: parseFloat(srv.price || 0) || 0,
    quantidade: appointments.filter(a => a.service_id === srv.id).length
  })).filter(s => s.quantidade > 0).sort((a, b) => b.quantidade - a.quantidade).slice(0, 3); // Top 3

  /**
   * Receita por profissional
   * Permite identificar quem tem melhor rentabilidade
   */
  const receitaPorProfissional = (professionals || []).map(prof => {
    const appointmentsProf = appointments.filter(a => a.professional_id === prof.id);
    const receitaProf = appointmentsProf.reduce((sum, a) => sum + (parseFloat(a.value) || 0), 0);
    return {
      id: prof.id,
      nome: prof.name || 'Sem nome',
      agendamentos: appointmentsProf.length,
      receita: receitaProf,
      receitaMedia: appointmentsProf.length > 0 ? receitaProf / appointmentsProf.length : 0
    };
  }).filter(p => p.agendamentos > 0).sort((a, b) => b.receita - a.receita);

  /**
   * Indicador de saúde da agenda
   * Combina ocupação + receita para decisão rápida
   * Faixa: 0-100 (0=ruim, 100=ótimo)
   */
  const indicadorSaude = calcularIndicadorSaude({
    ocupacao: ocupacaoPercentual,
    receita: totalReceita,
    agendamentos: appointments.length
  });

  /**
   * Status qualitativo da agenda
   * Ajuda o gestor a entender rapidamente a situação
   */
  const statusAgenda = getStatusAgenda(ocupacaoPercentual, totalReceita);

  /**
   * Meta sugerida para o dia
   * Baseada em padrão de 70% ocupação
   */
  const metaDia = {
    ocupacaoMeta: Math.round(slotsDisponiveis * 0.7),
    receitaMeta: receitaPorHora * 3.5 * (professionals?.length || 1),
    // 3.5h úteis
    receitaAtual: totalReceita
  };
  return {
    // Receita
    totalReceita,
    receitaPorHora,
    receitaMedia: appointments.length > 0 ? totalReceita / appointments.length : 0,
    // Ocupação
    ocupacaoPercentual,
    agendamentos: appointments.length,
    slotsDisponiveis,
    // Horas
    totalHoras,
    // Análise de Mix
    servicosMais,
    receitaPorProfissional,
    // Saúde
    indicadorSaude,
    statusAgenda,
    metaDia,
    // Metadata
    data: selectedDate,
    profissionaisAtivos: professionals?.length || 0
  };
}

/**
 * Calcula indicador de saúde (0-100)
 * Fórmula simples e objetiva:
 * - 50% peso ocupação
 * - 30% peso receita
 * - 20% peso volume agendamentos
 */
function calcularIndicadorSaude({
  ocupacao,
  receita,
  agendamentos
}) {
  // Normalizar ocupação (0-100)
  const pesoOcupacao = Math.min(100, ocupacao);

  // Normalizar receita (assumir meta de R$500 como 100%)
  const metaReceita = 500;
  const pesoReceita = Math.min(100, receita / metaReceita * 100);

  // Normalizar agendamentos (assumir meta de 6 como 100%)
  const metaAgendamentos = 6;
  const pesoAgendamentos = Math.min(100, agendamentos / metaAgendamentos * 100);

  // Calcular weighted score
  const score = Math.round((pesoOcupacao * 0.5 + pesoReceita * 0.3 + pesoAgendamentos * 0.2) * 0.75 // Escala 75% para ser conservador
  );
  return Math.max(0, Math.min(100, score));
}

/**
 * Retorna status qualitativo da agenda
 * Ajuda gestor a decidir rapidamente
 */
function getStatusAgenda(ocupacao, receita) {
  if (ocupacao >= 80 && receita >= 400) {
    return {
      label: '🟢 Excelente',
      descricao: 'Agenda bem ocupada com boa receita',
      acao: 'Nenhuma ação necessária'
    };
  }
  if (ocupacao >= 60 && receita >= 300) {
    return {
      label: '🟡 Bom',
      descricao: 'Agenda com ocupação aceitável',
      acao: 'Monitorar para manter crescimento'
    };
  }
  if (ocupacao >= 40) {
    return {
      label: '🟠 Atenção',
      descricao: 'Agenda com ocupação moderada',
      acao: 'Considerar estratégias de atração'
    };
  }
  return {
    label: '🔴 Crítico',
    descricao: 'Agenda com baixa ocupação',
    acao: 'Ação imediata necessária'
  };
}

/**
 * Utilitário: Compara métricas entre dois períodos
 * Útil para análise trend
 */
export function compararMetricas(metricsAnterior, metricsAtual) {
  return {
    receitaVariacao: ((metricsAtual.totalReceita - metricsAnterior.totalReceita) / (metricsAnterior.totalReceita || 1) * 100).toFixed(1),
    ocupacaoVariacao: (metricsAtual.ocupacaoPercentual - metricsAnterior.ocupacaoPercentual).toFixed(1),
    agendamentosVariacao: metricsAtual.agendamentos - metricsAnterior.agendamentos,
    receitaHoraVariacao: ((metricsAtual.receitaPorHora - metricsAnterior.receitaPorHora) / (metricsAnterior.receitaPorHora || 1) * 100).toFixed(1)
  };
}