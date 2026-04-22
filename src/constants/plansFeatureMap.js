// src/constants/plansFeatureMap.js
/**
 * Mapeamento completo de Planos vs Funcionalidades
 * Define quais módulos/funcionalidades estão disponíveis em cada plano
 */

export const PLANS_FEATURES = {
  basic: {
    name: 'Plano Básico',
    price: { monthly: 99, annual: 990 },
    maxUsers: 2,
    maxDoctors: 2,
    features: {
      // Agenda - INCLUÍDO
      agenda: {
        unificada: true,
        porProfissional: true,
        porSala: true,
        confirmacao: true,
        listaEspera: true,
        relatorios: true,
        kpis: true,
        notificacoes: true,
      },
      // Pacientes - INCLUÍDO
      pacientes: {
        cadastro: true,
        historico: true,
        anamnese: true,
        documentos: true,
      },
      // Profissionais - INCLUÍDO
      profissionais: {
        cadastro: true,
        horarios: true,
        especialidades: true,
      },
      // Serviços - INCLUÍDO
      servicos: {
        cadastro: true,
        salas: true,
        equipamentos: false,
      },
      // Estoque - BLOQUEADO
      estoque: false,
      // Financeiro - BLOQUEADO
      financeiro: false,
      // Relatórios - BLOQUEADO
      relatorios: false,
      // Multiunidades - BLOQUEADO
      multiunidades: false,
    },
  },

  professional: {
    name: 'Plano Profissional',
    price: { monthly: 249, annual: 2490 },
    maxUsers: 10,
    maxDoctors: 5,
    features: {
      // Agenda - COMPLETO
      agenda: {
        unificada: true,
        porProfissional: true,
        porSala: true,
        confirmacao: true,
        listaEspera: true,
        relatorios: true,
        kpis: true,
        notificacoes: true,
      },
      // Pacientes - COMPLETO
      pacientes: {
        cadastro: true,
        historico: true,
        anamnese: true,
        documentos: true,
        fotoVídeo: true,
      },
      // Profissionais - COMPLETO
      profissionais: {
        cadastro: true,
        horarios: true,
        especialidades: true,
        documentos: true,
        desempenho: true,
      },
      // Serviços - COMPLETO
      servicos: {
        cadastro: true,
        salas: true,
        equipamentos: true,
        convênios: true,
      },
      // Estoque - INCLUÍDO
      estoque: {
        dashboard: true,
        produtos: true,
        categorias: true,
        fornecedores: true,
        movimentacoes: true,
        locais: true,
        entradas: true,
        saidas: true,
        unidades: true,
        transferencias: true,
        requisicoes: true,
        inventario: true,
        relatorios: true,
      },
      // Financeiro - INCLUÍDO
      financeiro: {
        dashboard: true,
        contasPagar: true,
        contasReceber: true,
        fluxoCaixa: true,
        relatorios: true,
        invoices: true,
        recibos: true,
        caixa: true,
        caixaGerencial: false,
      },
      // Relatórios - INCLUÍDO
      relatorios: {
        agenda: true,
        financeiro: true,
        estoque: true,
        pacientes: true,
        profissionais: true,
      },
      // Multiunidades - BLOQUEADO
      multiunidades: false,
    },
  },

  enterprise: {
    name: 'Plano Enterprise',
    price: { monthly: 489, annual: 4890 },
    maxUsers: 999,
    maxDoctors: 999,
    features: {
      // Agenda - COMPLETO
      agenda: {
        unificada: true,
        porProfissional: true,
        porSala: true,
        porUnidade: true,
        confirmacao: true,
        listaEspera: true,
        relatorios: true,
        kpis: true,
        notificacoes: true,
        automacoes: true,
      },
      // Pacientes - COMPLETO + AVANÇADO
      pacientes: {
        cadastro: true,
        historico: true,
        anamnese: true,
        documentos: true,
        fotoVídeo: true,
        seguradoras: true,
        familiar: true,
      },
      // Profissionais - COMPLETO + AVANÇADO
      profissionais: {
        cadastro: true,
        horarios: true,
        especialidades: true,
        documentos: true,
        desempenho: true,
        repasse: true,
        comissoes: true,
        meta: true,
      },
      // Serviços - COMPLETO + AVANÇADO
      servicos: {
        cadastro: true,
        salas: true,
        equipamentos: true,
        convênios: true,
        pacotes: true,
      },
      // Estoque - COMPLETO + MULTIUNIDADES
      estoque: {
        dashboard: true,
        produtos: true,
        categorias: true,
        fornecedores: true,
        movimentacoes: true,
        locais: true,
        entradas: true,
        saidas: true,
        unidades: true,
        transferencias: true,
        requisicoes: true,
        inventario: true,
        relatorios: true,
        multiunidades: true,
      },
      // Financeiro - COMPLETO + MULTIUNIDADES
      financeiro: {
        dashboard: true,
        contasPagar: true,
        contasReceber: true,
        fluxoCaixa: true,
        relatorios: true,
        invoices: true,
        recibos: true,
        centrosCusto: true,
        multiunidades: true,
        conciliacao: true,
        caixa: true,
        caixaGerencial: true,
      },
      // Relatórios - AVANÇADO
      relatorios: {
        agenda: true,
        financeiro: true,
        estoque: true,
        pacientes: true,
        profissionais: true,
        gerencial: true,
        multiunidades: true,
        exportar: true,
      },
      // Multiunidades - INCLUÍDO
      multiunidades: {
        gerenciamento: true,
        transferencias: true,
        consolidacao: true,
        relatorios: true,
      },
    },
  },
};

/**
 * Função helper para verificar se um recurso está disponível
 * @param {string} planSlug - basic, professional, enterprise
 * @param {string} path - e.g., 'estoque.produtos', 'financeiro.fluxoCaixa'
 */
export function hasFeatureAccess(planSlug, featurePath) {
  const plan = PLANS_FEATURES[planSlug];
  if (!plan) return false;

  const keys = featurePath.split('.');
  let feature = plan.features;

  for (const key of keys) {
    if (typeof feature === 'object' && feature[key] !== undefined) {
      feature = feature[key];
    } else {
      return false;
    }
  }

  return feature === true;
}

/**
 * Função helper para obter todas as features de um plano
 */
export function getPlanFeatures(planSlug) {
  return PLANS_FEATURES[planSlug]?.features || {};
}

/**
 * Função helper para obter informações do plano
 */
export function getPlanInfo(planSlug) {
  const plan = PLANS_FEATURES[planSlug];
  if (!plan) return null;

  return {
    name: plan.name,
    price: plan.price,
    maxUsers: plan.maxUsers,
    maxDoctors: plan.maxDoctors,
  };
}
