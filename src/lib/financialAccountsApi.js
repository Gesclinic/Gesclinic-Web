/**
 * Financial Accounts Utilities
 * Plano de Contas - Gesclinic
 */

export const accountTypeColors = {
  receita: 'text-green-600 dark:text-green-400',
  deducao: 'text-red-500 dark:text-red-400',
  custo: 'text-orange-500 dark:text-orange-400',
  despesa: 'text-blue-500 dark:text-blue-400',
  investimento: 'text-purple-500 dark:text-purple-400',
  ajuste: 'text-gray-500 dark:text-gray-400',
};

export const accountTypeBgColors = {
  receita: 'bg-green-100/50 dark:bg-green-900/20',
  deducao: 'bg-red-100/50 dark:bg-red-900/20',
  custo: 'bg-orange-100/50 dark:bg-orange-900/20',
  despesa: 'bg-blue-100/50 dark:bg-blue-900/20',
  investimento: 'bg-purple-100/50 dark:bg-purple-900/20',
  ajuste: 'bg-gray-100/50 dark:bg-gray-900/20',
};

export const accountTypeLabels = {
  receita: '💰 Receita',
  deducao: '📉 Dedução',
  custo: '🔧 Custo',
  despesa: '💸 Despesa',
  investimento: '📈 Investimento',
  ajuste: '⚙️ Ajuste',
};

/**
 * DRE Calculation
 * Demonstração de Resultado do Exercício
 */

export const calculateDRE = (transactions = []) => {
  const summary = {
    receita: 0,
    deducao: 0,
    custo: 0,
    despesa: 0,
    investimento: 0,
    ajuste: 0,
  };

  transactions.forEach((t) => {
    if (summary.hasOwnProperty(t.type)) {
      summary[t.type] += t.value || 0;
    }
  });

  const receitaLiquida = summary.receita - summary.deducao;
  const margem = receitaLiquida - summary.custo;
  const lucro = margem - summary.despesa;

  return {
    receita: summary.receita,
    deducao: summary.deducao,
    receitaLiquida,
    custos: summary.custo,
    margem,
    despesas: summary.despesa,
    lucro,
    investimentos: summary.investimento,
    ajustes: summary.ajuste,
  };
};

/**
 * Format currency BRL
 */
export const formatBRL = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
};

/**
 * Get account type icon
 */
export const getAccountTypeIcon = (type) => {
  const icons = {
    receita: '💰',
    deducao: '📉',
    custo: '🔧',
    despesa: '💸',
    investimento: '📈',
    ajuste: '⚙️',
  };
  return icons[type] || '📋';
};

/**
 * API calls for financial accounts
 */
import { supabase } from '@/lib/customSupabaseClient';

export const financialAccountsApi = {
  // ===== CONTAS CONTÁBEIS =====

  async listAccounts(clinicId, parentId = null) {
    const query = supabase
      .from('financial_accounts')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('name');

    if (parentId) {
      query.eq('parent_id', parentId);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }
    return data;
  },

  async getAccountTree(clinicId) {
    const { data, error } = await supabase
      .from('financial_accounts')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('level', 1)
      .order('name');

    if (error) {
      throw error;
    }
    return data;
  },

  async createAccount(clinicId, accountData) {
    const { data, error } = await supabase
      .from('financial_accounts')
      .insert([
        {
          clinic_id: clinicId,
          ...accountData,
        },
      ])
      .select();

    if (error) {
      throw error;
    }
    return data[0];
  },

  async updateAccount(accountId, updates) {
    const { data, error } = await supabase
      .from('financial_accounts')
      .update(updates)
      .eq('id', accountId)
      .select();

    if (error) {
      throw error;
    }
    return data[0];
  },

  async deleteAccount(accountId) {
    const { error } = await supabase.from('financial_accounts').delete().eq('id', accountId);

    if (error) {
      throw error;
    }
  },

  // ===== TRANSAÇÕES FINANCEIRAS =====

  async listTransactions(clinicId, filters = {}) {
    let query = supabase.from('financial_transactions').select('*').eq('clinic_id', clinicId);

    if (filters.type) {
      query = query.eq('type', filters.type);
    }

    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      query = query.in('status', statuses);
    }

    if (filters.startDate && filters.endDate) {
      query = query.gte('created_at', filters.startDate).lte('created_at', filters.endDate);
    }

    if (filters.accountId) {
      query = query.eq('account_id', filters.accountId);
    }

    if (filters.professionalId) {
      query = query.eq('professional_id', filters.professionalId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
      throw error;
    }
    return data || [];
  },

  async createTransaction(clinicId, transactionData) {
    const { data, error } = await supabase
      .from('financial_transactions')
      .insert([
        {
          clinic_id: clinicId,
          ...transactionData,
        },
      ])
      .select();

    if (error) {
      throw error;
    }
    return data[0];
  },

  async updateTransaction(transactionId, updates) {
    const { data, error } = await supabase
      .from('financial_transactions')
      .update(updates)
      .eq('id', transactionId)
      .select();

    if (error) {
      throw error;
    }
    return data[0];
  },

  // ===== DRE CÁLCULOS =====

  async calculateDREForPeriod(clinicId, startDate, endDate) {
    const transactions = await this.listTransactions(clinicId, {
      startDate,
      endDate,
      status: ['processed', 'paid'],
    });

    const dre = {
      receita: 0,
      deducao: 0,
      receitaLiquida: 0,
      custos: 0,
      margemBruta: 0,
      margemBrutaPct: 0,
      despesasAdmin: 0,
      despesasClinica: 0,
      despesasComercial: 0,
      despesasFinanceira: 0,
      totalDespesas: 0,
      ebitda: 0,
      ebitdaPct: 0,
      depreciacao: 0,
      lucroOperacional: 0,
      lucroOperacionalPct: 0,
      lucroLiquido: 0,
      lucroLiquidoPct: 0,
    };

    // Agregar por tipo
    transactions.forEach((t) => {
      const amount = parseFloat(t.amount) || 0;

      if (t.type === 'revenue') {
        dre.receita += amount;
      } else if (t.type === 'deduction') {
        dre.deducao += amount;
      } else if (t.type === 'cost') {
        dre.custos += amount;
      } else if (t.type === 'expense') {
        // Segregar despesas por categoria
        if (t.category === 'payroll') {
          dre.despesasAdmin += amount;
        } else if (
          t.category === 'rent' ||
          t.category === 'utilities' ||
          t.category === 'maintenance'
        ) {
          dre.despesasClinica += amount;
        } else if (t.category === 'marketing' || t.category === 'commission') {
          dre.despesasComercial += amount;
        } else {
          dre.despesasFinanceira += amount;
        }
      } else if (t.type === 'adjustment' && t.category === 'other') {
        dre.depreciacao += amount;
      }
    });

    // Cálculos
    dre.receitaLiquida = dre.receita - dre.deducao;
    dre.margemBruta = dre.receitaLiquida - dre.custos;
    dre.margemBrutaPct = dre.receitaLiquida > 0 ? (dre.margemBruta / dre.receitaLiquida) * 100 : 0;

    dre.totalDespesas =
      dre.despesasAdmin + dre.despesasClinica + dre.despesasComercial + dre.despesasFinanceira;
    dre.ebitda = dre.margemBruta - dre.totalDespesas;
    dre.ebitdaPct = dre.receitaLiquida > 0 ? (dre.ebitda / dre.receitaLiquida) * 100 : 0;

    dre.lucroOperacional = dre.ebitda - dre.depreciacao;
    dre.lucroOperacionalPct =
      dre.receitaLiquida > 0 ? (dre.lucroOperacional / dre.receitaLiquida) * 100 : 0;

    dre.lucroLiquido = dre.lucroOperacional;
    dre.lucroLiquidoPct =
      dre.receitaLiquida > 0 ? (dre.lucroLiquido / dre.receitaLiquida) * 100 : 0;

    return dre;
  },

  async getDRELines(clinicId, startDate, endDate) {
    const dre = await this.calculateDREForPeriod(clinicId, startDate, endDate);

    return [
      { label: 'Receita Bruta', value: dre.receita, type: 'receita', level: 1 },
      { label: 'Deduções (Impostos + Glosas)', value: -dre.deducao, type: 'deducao', level: 2 },
      {
        label: 'Receita Líquida',
        value: dre.receitaLiquida,
        type: 'receita',
        level: 1,
        bold: true,
      },
      { label: 'Custos Diretos', value: -dre.custos, type: 'custo', level: 2 },
      {
        label: 'Margem Bruta',
        value: dre.margemBruta,
        type: 'receita',
        level: 1,
        bold: true,
        pct: dre.margemBrutaPct,
      },
      { label: 'Despesas Administrativas', value: -dre.despesasAdmin, type: 'despesa', level: 2 },
      { label: 'Despesas da Clínica', value: -dre.despesasClinica, type: 'despesa', level: 2 },
      { label: 'Despesas Comerciais', value: -dre.despesasComercial, type: 'despesa', level: 2 },
      { label: 'Despesas Financeiras', value: -dre.despesasFinanceira, type: 'despesa', level: 2 },
      {
        label: 'EBITDA',
        value: dre.ebitda,
        type: 'receita',
        level: 1,
        bold: true,
        pct: dre.ebitdaPct,
      },
      { label: 'Depreciação e Amortização', value: -dre.depreciacao, type: 'ajuste', level: 2 },
      {
        label: 'Lucro Operacional',
        value: dre.lucroOperacional,
        type: 'receita',
        level: 1,
        bold: true,
        pct: dre.lucroOperacionalPct,
      },
      {
        label: 'Lucro Líquido',
        value: dre.lucroLiquido,
        type: 'receita',
        level: 1,
        bold: true,
        pct: dre.lucroLiquidoPct,
      },
    ];
  },

  async getFinancialSummaryByAccount(clinicId, startDate, endDate) {
    const { data, error } = await supabase
      .from('financial_transactions')
      .select(
        `
        account_id,
        type,
        amount,
        financial_accounts!inner(id, name, type)
      `,
      )
      .eq('clinic_id', clinicId)
      .in('status', ['processed', 'paid'])
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (error) {
      throw error;
    }

    const summary = {};
    (data || []).forEach((t) => {
      const accountId = t.account_id || 'unassigned';
      if (!summary[accountId]) {
        summary[accountId] = {
          accountId,
          accountName: t.financial_accounts?.name || 'Sem Conta',
          accountType: t.financial_accounts?.type || 'other',
          total: 0,
          count: 0,
        };
      }
      summary[accountId].total += parseFloat(t.amount) || 0;
      summary[accountId].count += 1;
    });

    return Object.values(summary);
  },
};
