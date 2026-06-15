import { customSupabaseClient } from './customSupabaseClient';

const supabase = customSupabaseClient;

/**
 * Financial Thresholds Configuration Service
 * Permite configurar limites para alertas automáticos
 */

// ========== THRESHOLDS CONFIG ==========

export const getFinancialThresholds = async (clinicId) => {
  try {
    const { data, error } = await supabase
      .from('financial_thresholds')
      .select('*')
      .eq('clinic_id', clinicId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    // Return defaults if not found
    return data || getDefaultThresholds();
  } catch (error) {
    console.error('Erro ao carregar thresholds:', error);
    return getDefaultThresholds();
  }
};

export const getDefaultThresholds = () => ({
  // Liquidez
  min_cash_balance: 5000, // Saldo mínimo
  min_cash_days: 7, // Dias de cobertura mínimos
  critical_cash_threshold: 1000, // Crítico

  // Contas a Receber
  max_receivable_days: 60, // Máximo dias para receber
  critical_receivable_overdue: 90, // Crítico
  warning_receivable_percentage: 30, // 30% das receitas pendentes

  // Contas a Pagar
  max_payable_days: 45, // Máximo dias para pagar
  critical_payable_overdue: 60, // Crítico
  warning_payable_percentage: 40, // 40% das despesas vencidas

  // Saúde Financeira Geral
  min_health_score: 60, // Score mínimo para saúde
  min_profitability_margin: 10, // 10% de margem mínima

  // Alertas habilitados
  enable_daily_alerts: true,
  enable_critical_alerts: true,
  enable_email_notifications: false,
});

export const updateFinancialThresholds = async (clinicId, thresholds) => {
  try {
    const { data: existing } = await supabase
      .from('financial_thresholds')
      .select('id')
      .eq('clinic_id', clinicId)
      .single();

    if (existing) {
      // Update
      const { data, error } = await supabase
        .from('financial_thresholds')
        .update({
          ...thresholds,
          updated_at: new Date().toISOString(),
        })
        .eq('clinic_id', clinicId)
        .select();

      if (error) throw error;
      return { success: true, data: data?.[0] };
    } else {
      // Insert
      const { data, error } = await supabase
        .from('financial_thresholds')
        .insert([
          {
            clinic_id: clinicId,
            ...thresholds,
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      if (error) throw error;
      return { success: true, data: data?.[0] };
    }
  } catch (error) {
    console.error('Erro ao atualizar thresholds:', error);
    return { success: false, error: error.message };
  }
};

// ========== THRESHOLD EVALUATION ==========

export const evaluateFinancialThresholds = async (clinicId, currentMetrics, thresholds = null) => {
  try {
    // Get thresholds if not provided
    const config = thresholds || (await getFinancialThresholds(clinicId));

    const violations = [];
    const warnings = [];

    // 1. Verificar saldo mínimo
    if (currentMetrics.available_cash < config.critical_cash_threshold) {
      violations.push({
        type: 'critical_low_cash',
        severity: 'critical',
        message: `Caixa crítico: R$ ${currentMetrics.available_cash.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (mínimo crítico: R$ ${config.critical_cash_threshold.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`,
        value: currentMetrics.available_cash,
        threshold: config.critical_cash_threshold,
      });
    } else if (currentMetrics.available_cash < config.min_cash_balance) {
      warnings.push({
        type: 'low_cash',
        severity: 'warning',
        message: `Saldo baixo: R$ ${currentMetrics.available_cash.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (mínimo recomendado: R$ ${config.min_cash_balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`,
        value: currentMetrics.available_cash,
        threshold: config.min_cash_balance,
      });
    }

    // 2. Verificar dias de cobertura
    if (currentMetrics.coverage_days && currentMetrics.coverage_days < config.min_cash_days) {
      warnings.push({
        type: 'low_coverage_days',
        severity: 'warning',
        message: `Cobertura baixa: ${currentMetrics.coverage_days.toFixed(1)} dias (mínimo: ${config.min_cash_days} dias)`,
        value: currentMetrics.coverage_days,
        threshold: config.min_cash_days,
      });
    }

    // 3. Verificar contas a receber vencidas
    if (currentMetrics.receivable_overdue && currentMetrics.receivable_overdue > 0) {
      if (currentMetrics.receivable_overdue > config.critical_receivable_overdue) {
        violations.push({
          type: 'critical_receivable_overdue',
          severity: 'critical',
          message: `Contas a receber crítica: R$ ${currentMetrics.receivable_overdue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} vencidas há + de ${config.critical_receivable_overdue} dias`,
          value: currentMetrics.receivable_overdue,
          threshold: config.critical_receivable_overdue,
        });
      } else if (currentMetrics.receivable_overdue > config.max_receivable_days) {
        warnings.push({
          type: 'high_receivable_overdue',
          severity: 'warning',
          message: `Contas a receber vencidas: R$ ${currentMetrics.receivable_overdue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          value: currentMetrics.receivable_overdue,
          threshold: config.max_receivable_days,
        });
      }
    }

    // 4. Verificar contas a pagar vencidas
    if (currentMetrics.payable_overdue && currentMetrics.payable_overdue > 0) {
      if (currentMetrics.payable_overdue > config.critical_payable_overdue) {
        violations.push({
          type: 'critical_payable_overdue',
          severity: 'critical',
          message: `Contas a pagar crítica: R$ ${currentMetrics.payable_overdue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} vencidas há + de ${config.critical_payable_overdue} dias`,
          value: currentMetrics.payable_overdue,
          threshold: config.critical_payable_overdue,
        });
      } else if (currentMetrics.payable_overdue > config.max_payable_days) {
        warnings.push({
          type: 'high_payable_overdue',
          severity: 'warning',
          message: `Contas a pagar vencidas: R$ ${currentMetrics.payable_overdue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          value: currentMetrics.payable_overdue,
          threshold: config.max_payable_days,
        });
      }
    }

    // 5. Verificar saúde financeira geral
    if (currentMetrics.health_score && currentMetrics.health_score < config.min_health_score) {
      warnings.push({
        type: 'low_health_score',
        severity: 'warning',
        message: `Saúde financeira baixa: ${currentMetrics.health_score.toFixed(0)}% (mínimo: ${config.min_health_score}%)`,
        value: currentMetrics.health_score,
        threshold: config.min_health_score,
      });
    }

    // 6. Verificar margem de lucratividade
    if (currentMetrics.profitability_margin && currentMetrics.profitability_margin < config.min_profitability_margin) {
      warnings.push({
        type: 'low_profitability',
        severity: 'warning',
        message: `Margem de lucro baixa: ${currentMetrics.profitability_margin.toFixed(1)}% (mínimo: ${config.min_profitability_margin}%)`,
        value: currentMetrics.profitability_margin,
        threshold: config.min_profitability_margin,
      });
    }

    return {
      violations,
      warnings,
      hasViolations: violations.length > 0,
      hasWarnings: warnings.length > 0,
      thresholds: config,
    };
  } catch (error) {
    console.error('Erro ao avaliar thresholds:', error);
    return {
      violations: [],
      warnings: [],
      hasViolations: false,
      hasWarnings: false,
      error: error.message,
    };
  }
};

// ========== AUTOMATION RULES ==========

export const createAutomationRule = async (clinicId, rule) => {
  try {
    const { data, error } = await supabase
      .from('automation_rules')
      .insert([
        {
          clinic_id: clinicId,
          rule_name: rule.name,
          rule_type: rule.type, // 'alert', 'action', 'notification'
          trigger_condition: rule.trigger_condition,
          action_config: rule.action_config,
          enabled: true,
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) throw error;
    return { success: true, rule: data?.[0] };
  } catch (error) {
    console.error('Erro ao criar regra de automação:', error);
    return { success: false, error: error.message };
  }
};

export const listAutomationRules = async (clinicId) => {
  try {
    const { data, error } = await supabase
      .from('automation_rules')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('enabled', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao listar regras:', error);
    return [];
  }
};

export const deleteAutomationRule = async (ruleId) => {
  try {
    const { error } = await supabase
      .from('automation_rules')
      .update({ enabled: false, updated_at: new Date().toISOString() })
      .eq('id', ruleId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Erro ao deletar regra:', error);
    return { success: false, error: error.message };
  }
};

// ========== PREDEFINED RULES ==========

export const PREDEFINED_RULES = {
  send_alert_critical_cash: {
    name: 'Alerta - Caixa Crítico',
    type: 'alert',
    trigger_condition: {
      metric: 'available_cash',
      operator: 'less_than',
      threshold: 'critical_cash_threshold',
    },
    action_config: {
      send_email: true,
      send_notification: true,
      alert_type: 'critical',
    },
  },
  send_alert_high_receivable: {
    name: 'Alerta - Contas a Receber Alta',
    type: 'alert',
    trigger_condition: {
      metric: 'receivable_overdue',
      operator: 'greater_than',
      threshold: 'critical_receivable_overdue',
    },
    action_config: {
      send_email: true,
      alert_type: 'warning',
    },
  },
  send_alert_high_payable: {
    name: 'Alerta - Contas a Pagar Alta',
    type: 'alert',
    trigger_condition: {
      metric: 'payable_overdue',
      operator: 'greater_than',
      threshold: 'critical_payable_overdue',
    },
    action_config: {
      send_email: true,
      alert_type: 'warning',
    },
  },
  daily_report: {
    name: 'Relatório Diário - 8AM',
    type: 'action',
    trigger_condition: {
      schedule: 'daily',
      time: '08:00',
    },
    action_config: {
      send_email: true,
      include_pdf: true,
      include_excel: false,
    },
  },
};
