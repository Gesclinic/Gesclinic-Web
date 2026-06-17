/**
 * 📊 KPIs DEFINITIVOS — GESCLINIC DASHBOARD
 *
 * Estrutura completa de indicadores para cada módulo
 * Pronto para ser integrado ao Supabase RPC
 *
 * 🎯 PRINCÍPIOS:
 * - Um KPI deve responder uma pergunta importante para o negócio
 * - Incluir período (dia, mês, trimestre, ano)
 * - Mostrar tendência (comparação período anterior)
 * - Ser acionável (levar a uma ação específica)
 */

// ============================================
// 📈 DASHBOARD GERAL (Global View)
// ============================================
export const KPI_DASHBOARD_GERAL = {
  grupo: 'Dashboard Geral',
  descricao: 'Visão executiva da clínica',
  indicadores: [
    {
      id: 'faturamento_mes',
      label: 'Faturamento do Mês',
      metrica: 'currency',
      periodo: 'month',
      valor: 0,
      meta: 50000,
      acao: '/clinica/financeiro/receber',
      descricao: 'Total de serviços faturados (convênio + particular)',
      tendencia: {
        anterior: 45000,
        percentual: 11.1,
        direcao: 'up',
      },
    },
    {
      id: 'lucro_estimado',
      label: 'Lucro Estimado',
      metrica: 'currency',
      periodo: 'month',
      valor: 0,
      formula: 'faturamento - despesas_operacionais',
      acao: '/clinica/financeiro',
      descricao: 'Faturamento menos despesas operacionais e CPP',
      tendencia: {
        anterior: 8000,
        percentual: 5.2,
        direcao: 'up',
      },
    },
    {
      id: 'atendimentos_realizados',
      label: 'Atendimentos Realizados',
      metrica: 'number',
      periodo: 'month',
      valor: 0,
      acao: '/clinica/agenda',
      descricao: 'Total de consultas/procedimentos executados',
      tendencia: {
        anterior: 312,
        percentual: 8.3,
        direcao: 'up',
      },
    },
    {
      id: 'taxa_ocupacao',
      label: 'Taxa de Ocupação da Agenda',
      metrica: 'percent',
      periodo: 'month',
      valor: 0,
      meta: 75,
      acao: '/clinica/agenda',
      descricao: 'Percentual de slots preenchidos vs disponíveis',
      tendencia: {
        anterior: 68,
        percentual: -2.1,
        direcao: 'down',
      },
    },
    {
      id: 'caixa_atual',
      label: 'Caixa Atual',
      metrica: 'currency',
      valor: 0,
      acao: '/clinica/financeiro/fluxo',
      descricao: 'Saldo disponível em conta corrente + caixa',
      tendencia: {
        anterior: 35000,
        percentual: 14.3,
        direcao: 'up',
      },
    },
    {
      id: 'alertas_criticos',
      label: 'Alertas Críticos',
      metrica: 'number',
      valor: 0,
      severity: 'danger',
      acao: '/clinica/dashboard',
      descricao: 'Estoque crítico + contas vencidas + inadimplência',
      subItens: [
        { label: 'Estoque crítico', valor: 0 },
        { label: 'Contas vencidas', valor: 0 },
        { label: 'Inadimplentes', valor: 0 },
      ],
    },
  ],
};

// ============================================
// 📅 KPIs AGENDA
// ============================================
export const KPI_AGENDA = {
  grupo: 'Agenda',
  descricao: 'Indicadores de agendamento e eficiência',
  indicadores: [
    {
      id: 'consultas_dia',
      label: 'Consultas do Dia',
      metrica: 'number',
      periodo: 'today',
      valor: 0,
      acao: '/clinica/agenda',
      descricao: 'Total de consultas agendadas para hoje',
    },
    {
      id: 'taxa_faltas',
      label: 'Taxa de Faltas',
      metrica: 'percent',
      periodo: 'month',
      valor: 0,
      acao: '/clinica/agenda',
      descricao: 'Pacientes que faltaram sem cancelar',
      tendencia: {
        anterior: 12,
        percentual: 3.5,
        direcao: 'up',
      },
    },
    {
      id: 'tempo_medio_atendimento',
      label: 'Tempo Médio por Atendimento',
      metrica: 'duration',
      periodo: 'month',
      valor: 0,
      acao: '/clinica/agenda',
      descricao: 'Duração média das consultas',
      unidade: 'minutos',
    },
    {
      id: 'agenda_futura_7dias',
      label: 'Agenda — 7 Dias',
      metrica: 'number',
      periodo: 'week',
      valor: 0,
      acao: '/clinica/agenda',
      descricao: 'Consultas agendadas para os próximos 7 dias',
    },
    {
      id: 'agenda_futura_30dias',
      label: 'Agenda — 30 Dias',
      metrica: 'number',
      periodo: 'month',
      valor: 0,
      acao: '/clinica/agenda',
      descricao: 'Consultas agendadas para os próximos 30 dias',
    },
    {
      id: 'profissionais_disponibilidade',
      label: 'Disponibilidade de Profissionais',
      metrica: 'percent',
      periodo: 'week',
      valor: 0,
      acao: '/clinica/cadastros/profissionais',
      descricao: 'Percentual de profissionais com agenda aberta',
    },
  ],
};

// ============================================
// 💰 KPIs FINANCEIRO
// ============================================
export const KPI_FINANCEIRO = {
  grupo: 'Financeiro',
  descricao: 'Controle econômico e fluxo de caixa',
  indicadores: [
    {
      id: 'contas_receber_aberto',
      label: 'Contas a Receber - Aberto',
      metrica: 'currency',
      valor: 0,
      acao: '/clinica/financeiro/receber',
      descricao: 'Total de receitas em aberto (não recebidas)',
    },
    {
      id: 'contas_receber_vencido',
      label: 'Contas a Receber - Vencido',
      metrica: 'currency',
      severity: 'danger',
      valor: 0,
      acao: '/clinica/financeiro/receber',
      descricao: 'Total de receitas vencidas',
    },
    {
      id: 'contas_pagar_7dias',
      label: 'Contas a Pagar - Próximos 7 Dias',
      metrica: 'currency',
      valor: 0,
      acao: '/clinica/financeiro/pagar',
      descricao: 'Despesas que vencem nos próximos 7 dias',
    },
    {
      id: 'resultado_mensal',
      label: 'Resultado Mensal',
      metrica: 'currency',
      periodo: 'month',
      valor: 0,
      acao: '/clinica/financeiro',
      descricao: 'Receita total - Despesa total do mês',
      formula: 'total_receita - total_despesa',
    },
    {
      id: 'fluxo_caixa_semanal',
      label: 'Fluxo de Caixa - Próximos 7 Dias',
      metrica: 'currency',
      periodo: 'week',
      valor: 0,
      acao: '/clinica/financeiro/fluxo',
      descricao: 'Entrada/saída esperada de caixa (próximos 7 dias)',
    },
    {
      id: 'ticket_medio',
      label: 'Ticket Médio',
      metrica: 'currency',
      periodo: 'month',
      valor: 0,
      acao: '/clinica/financeiro',
      descricao: 'Valor médio por atendimento',
    },
  ],
};

// ============================================
// 👨‍⚕️ KPIs REPASSE MÉDICO
// ============================================
export const KPI_REPASSE = {
  grupo: 'Repasse Médico',
  descricao: 'Gestão de valores a repassar para profissionais',
  indicadores: [
    {
      id: 'total_repassar',
      label: 'Total a Repassar',
      metrica: 'currency',
      periodo: 'month',
      valor: 0,
      acao: '/clinica/repasse',
      descricao: 'Valor total a ser repassado este mês',
    },
    {
      id: 'profissionais_pendencia',
      label: 'Profissionais com Pendência',
      metrica: 'number',
      valor: 0,
      acao: '/clinica/repasse',
      descricao: 'Quantidade de profissionais aguardando repasse',
    },
    {
      id: 'repasse_por_convenio',
      label: 'Repasse por Convênio',
      metrica: 'currency',
      periodo: 'month',
      valor: 0,
      acao: '/clinica/repasse',
      descricao: 'Valor de repasse agrupado por convênio',
      subItens: [
        { label: 'Particular', valor: 0 },
        { label: 'Convênio A', valor: 0 },
        { label: 'Convênio B', valor: 0 },
      ],
    },
    {
      id: 'historico_mensal',
      label: 'Histórico - Últimos 3 Meses',
      metrica: 'currency',
      periodo: 'quarter',
      valor: 0,
      acao: '/clinica/repasse/historico',
      descricao: 'Valor médio de repasse nos últimos 3 meses',
      detalhes: [
        { mes: 'Janeiro', valor: 12500 },
        { mes: 'Fevereiro', valor: 13200 },
        { mes: 'Março', valor: 12800 },
      ],
    },
  ],
};

// ============================================
// 📦 KPIs ESTOQUE
// ============================================
export const KPI_ESTOQUE = {
  grupo: 'Estoque',
  descricao: 'Gestão de inventário e movimentações',
  indicadores: [
    {
      id: 'itens_criticos',
      label: 'Itens Críticos',
      metrica: 'number',
      severity: 'warning',
      valor: 0,
      acao: '/clinica/estoque/produtos',
      descricao: 'Produtos com estoque abaixo do mínimo',
    },
    {
      id: 'giro_medio',
      label: 'Giro Médio',
      metrica: 'number',
      periodo: 'month',
      valor: 0,
      acao: '/clinica/estoque/relatorios',
      descricao: 'Número de vezes que o estoque se renova por mês',
      unidade: 'vezes/mês',
    },
    {
      id: 'valor_total_estoque',
      label: 'Valor Total em Estoque',
      metrica: 'currency',
      valor: 0,
      acao: '/clinica/estoque',
      descricao: 'Valor total investido em inventário',
    },
    {
      id: 'consumo_por_servico',
      label: 'Consumo por Serviço',
      metrica: 'currency',
      periodo: 'month',
      valor: 0,
      acao: '/clinica/estoque/relatorios',
      descricao: 'Quais serviços mais consomem material',
      subItens: [
        { label: 'Consulta', valor: 1500 },
        { label: 'Procedimento A', valor: 2300 },
        { label: 'Procedimento B', valor: 890 },
      ],
    },
    {
      id: 'produtos_vencimento',
      label: 'Produtos Próximos ao Vencimento',
      metrica: 'number',
      severity: 'danger',
      valor: 0,
      acao: '/clinica/estoque/produtos',
      descricao: 'Produtos que vencem nos próximos 30 dias',
    },
  ],
};

// ============================================
// 📋 FUNÇÃO AUXILIAR: Buscar KPI por módulo
// ============================================
export function getKPIsByModule(module) {
  const modules = {
    dashboard: KPI_DASHBOARD_GERAL,
    agenda: KPI_AGENDA,
    financeiro: KPI_FINANCEIRO,
    repasse: KPI_REPASSE,
    estoque: KPI_ESTOQUE,
  };

  return modules[module] || null;
}

// ============================================
// 📋 FUNÇÃO: Listar todos os KPIs
// ============================================
export function getAllKPIs() {
  return {
    dashboard: KPI_DASHBOARD_GERAL,
    agenda: KPI_AGENDA,
    financeiro: KPI_FINANCEIRO,
    repasse: KPI_REPASSE,
    estoque: KPI_ESTOQUE,
  };
}

// ============================================
// 📊 EXEMPLO DE USO NO COMPONENTE
// ============================================
/*
import { getKPIsByModule } from "@/config/kpi-config";

function DashboardFinanceiro() {
  const kpis = getKPIsByModule("financeiro");

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {kpis.indicadores.map((kpi) => (
        <KPICard
          key={kpi.id}
          label={kpi.label}
          value={kpi.valor}
          metric={kpi.metrica}
          action={kpi.acao}
          severity={kpi.severity}
          tendencia={kpi.tendencia}
        />
      ))}
    </div>
  );
}
*/
