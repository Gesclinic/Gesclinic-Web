/**
 * Financial Module Services - ETAPAS 6-12 (Consolidated)
 * 
 * 6: Intelligent Reconciliation
 * 7: Financial Cockpit Premium
 * 8: Alerts and Automation
 * 9: Enterprise Performance
 * 10: Enterprise Security
 * 11-12: Testing and Reporting
 */

import { customSupabaseClient } from '@/lib/customSupabaseClient';

// ============================================================================
// ETAPA 6: INTELLIGENT RECONCILIATION
// ============================================================================

export async function importBankStatement(
  clinicId: string,
  fileName: string,
  transactions: any[]
): Promise<any> {
  try {
    // Create import record
    const { data: import_data, error: import_error } = await customSupabaseClient
      .from('bank_statement_imports')
      .insert({
        clinic_id: clinicId,
        import_file_name: fileName,
        total_transactions: transactions.length,
        status: 'processing',
      })
      .select()
      .single();

    if (import_error) throw import_error;

    // Insert transactions
    for (const tx of transactions) {
      await customSupabaseClient
        .from('bank_transactions')
        .insert({
          clinic_id: clinicId,
          import_id: import_data.id,
          transaction_date: tx.date,
          transaction_amount: tx.amount,
          transaction_type: tx.type,
          transaction_description: tx.description,
          transaction_reference: tx.reference,
        });
    }

    // Run fuzzy matching
    const { data: match_result } = await customSupabaseClient
      .rpc('fuzzy_match_transactions', {
        p_clinic_id: clinicId,
        p_import_id: import_data.id,
      });

    return { import_id: import_data.id, ...match_result };
  } catch (err) {
    console.error('[importBankStatement] Error:', err);
    throw err;
  }
}

export async function getUnmatchedTransactions(clinicId: string) {
  try {
    const { data, error } = await customSupabaseClient
      .from('bank_transactions')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('is_matched', false)
      .eq('is_reconciled', false);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[getUnmatchedTransactions] Error:', err);
    throw err;
  }
}

export async function reconcileTransaction(
  transactionId: number,
  approved: boolean
): Promise<any> {
  try {
    const { data, error } = await customSupabaseClient
      .rpc('reconcile_bank_transaction', {
        p_transaction_id: transactionId,
        p_approved: approved,
      });

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[reconcileTransaction] Error:', err);
    throw err;
  }
}

// ============================================================================
// ETAPA 7: COCKPIT PREMIUM
// ============================================================================

export async function calculateFinancialHealthScore(clinicId: string): Promise<number> {
  try {
    const { data, error } = await customSupabaseClient
      .rpc('calculate_financial_health_score', { p_clinic_id: clinicId });

    if (error) throw error;
    return data || 0;
  } catch (err) {
    console.error('[calculateFinancialHealthScore] Error:', err);
    throw err;
  }
}

export async function getHeatmapMetrics(clinicId: string): Promise<any[]> {
  try {
    const { data, error } = await customSupabaseClient
      .from('financial_heatmap_metrics')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('metric_date', { ascending: false })
      .limit(30);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[getHeatmapMetrics] Error:', err);
    throw err;
  }
}

export async function getFinancialIndicators(clinicId: string): Promise<any[]> {
  try {
    const { data, error } = await customSupabaseClient
      .from('financial_indicators')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('indicator_date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[getFinancialIndicators] Error:', err);
    throw err;
  }
}

export async function getCockpitSummary(clinicId: string): Promise<any> {
  try {
    const healthScore = await calculateFinancialHealthScore(clinicId);
    const heatmap = await getHeatmapMetrics(clinicId);
    const indicators = await getFinancialIndicators(clinicId);

    return {
      healthScore,
      heatmap: heatmap.slice(0, 10),
      indicators,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    console.error('[getCockpitSummary] Error:', err);
    throw err;
  }
}

// ============================================================================
// ETAPA 8: ALERTAS E AUTOMAÇÕES
// ============================================================================

export async function triggerFinancialAlerts(clinicId: string): Promise<any> {
  try {
    const { data, error } = await customSupabaseClient
      .rpc('trigger_financial_alerts', { p_clinic_id: clinicId });

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[triggerFinancialAlerts] Error:', err);
    throw err;
  }
}

export async function getActiveAlerts(clinicId: string): Promise<any[]> {
  try {
    const { data, error } = await customSupabaseClient
      .from('financial_alerts')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('is_read', false)
      .order('triggered_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[getActiveAlerts] Error:', err);
    throw err;
  }
}

export async function markAlertAsRead(alertId: number): Promise<any> {
  try {
    const { data, error } = await customSupabaseClient
      .from('financial_alerts')
      .update({ is_read: true })
      .eq('id', alertId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[markAlertAsRead] Error:', err);
    throw err;
  }
}

export async function createAutomationRule(
  clinicId: string,
  ruleName: string,
  triggerCondition: any,
  actionType: string,
  actionConfig: any
): Promise<any> {
  try {
    const { data, error } = await customSupabaseClient
      .from('financial_automation_rules')
      .insert({
        clinic_id: clinicId,
        rule_name: ruleName,
        trigger_condition: triggerCondition,
        action_type: actionType,
        action_config: actionConfig,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[createAutomationRule] Error:', err);
    throw err;
  }
}

// ============================================================================
// ETAPA 9: PERFORMANCE (Views, Índices)
// ============================================================================

export async function getFinancialSummary(clinicId: string): Promise<any> {
  try {
    const { data, error } = await customSupabaseClient
      .from('mv_financial_summary')
      .select('*')
      .eq('clinic_id', clinicId)
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[getFinancialSummary] Error:', err);
    throw err;
  }
}

export async function refreshMaterializedView(): Promise<any> {
  try {
    const { error } = await customSupabaseClient
      .rpc('refresh_mv_financial_summary');

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('[refreshMaterializedView] Error:', err);
    throw err;
  }
}

// ============================================================================
// ETAPA 10: APPROVAL WORKFLOWS
// ============================================================================

export async function createApprovalWorkflow(
  clinicId: string,
  workflowName: string,
  workflowType: string,
  approvalThreshold: number,
  requiredApprovers: number = 2
): Promise<any> {
  try {
    const { data, error } = await customSupabaseClient
      .from('financial_approval_workflows')
      .insert({
        clinic_id: clinicId,
        workflow_name: workflowName,
        workflow_type: workflowType,
        approval_threshold: approvalThreshold,
        required_approvers: requiredApprovers,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[createApprovalWorkflow] Error:', err);
    throw err;
  }
}

export async function requireApprovalForTransaction(
  clinicId: string,
  documentType: string,
  documentId: string,
  amount: number
): Promise<any> {
  try {
    const { data, error } = await customSupabaseClient
      .rpc('require_approval_for_large_transaction', {
        p_clinic_id: clinicId,
        p_document_type: documentType,
        p_document_id: documentId,
        p_amount: amount,
      });

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[requireApprovalForTransaction] Error:', err);
    throw err;
  }
}

export async function getPendingApprovals(clinicId: string): Promise<any[]> {
  try {
    const { data, error } = await customSupabaseClient
      .from('financial_approvals')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[getPendingApprovals] Error:', err);
    throw err;
  }
}

export async function approveTransaction(
  approvalId: number,
  approverId: string,
  comments?: string
): Promise<any> {
  try {
    const { data, error } = await customSupabaseClient
      .from('financial_approvals')
      .update({
        status: 'approved',
        approver_id: approverId,
        approval_date: new Date().toISOString(),
        comments,
      })
      .eq('id', approvalId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[approveTransaction] Error:', err);
    throw err;
  }
}

// ============================================================================
// AUDIT LOG
// ============================================================================

export async function getAuditLog(
  clinicId: string,
  filters?: {
    entityType?: string;
    auditType?: string;
    daysBack?: number;
  }
): Promise<any[]> {
  try {
    let query = customSupabaseClient
      .from('financial_audit_log')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('audit_timestamp', { ascending: false });

    if (filters?.entityType) {
      query = query.eq('entity_type', filters.entityType);
    }
    if (filters?.auditType) {
      query = query.eq('audit_type', filters.auditType);
    }
    if (filters?.daysBack) {
      const since = new Date();
      since.setDate(since.getDate() - filters.daysBack);
      query = query.gte('audit_timestamp', since.toISOString());
    }

    const { data, error } = await query.limit(1000);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[getAuditLog] Error:', err);
    throw err;
  }
}

// ============================================================================
// ETAPA 11-12: TESTING & REPORTING
// ============================================================================

export async function recordTestResult(
  clinicId: string,
  testName: string,
  testType: string,
  passed: boolean,
  durationMs: number
): Promise<any> {
  try {
    const { data, error } = await customSupabaseClient
      .from('financial_test_results')
      .insert({
        clinic_id: clinicId,
        test_name: testName,
        test_type: testType,
        test_status: passed ? 'passed' : 'failed',
        test_duration_ms: durationMs,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[recordTestResult] Error:', err);
    throw err;
  }
}

export async function markEtapaAsCompleted(
  clinicId: string,
  etapaNumber: number,
  etapaName: string,
  notes?: string
): Promise<any> {
  try {
    const { data, error } = await customSupabaseClient
      .from('financial_implementation_checklist')
      .upsert(
        {
          clinic_id: clinicId,
          etapa_number: etapaNumber,
          etapa_name: etapaName,
          is_completed: true,
          completion_date: new Date().toISOString(),
          notes,
        },
        {
          onConflict: 'clinic_id,etapa_number',
        }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[markEtapaAsCompleted] Error:', err);
    throw err;
  }
}

export async function getImplementationSummary(clinicId: string): Promise<any> {
  try {
    const { data, error } = await customSupabaseClient
      .rpc('get_implementation_summary', {
        p_clinic_id: clinicId,
      });

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[getImplementationSummary] Error:', err);
    throw err;
  }
}

export async function getTestResults(clinicId: string): Promise<any[]> {
  try {
    const { data, error } = await customSupabaseClient
      .from('financial_test_results')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('executed_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[getTestResults] Error:', err);
    throw err;
  }
}

export async function getImplementationChecklist(clinicId: string): Promise<any[]> {
  try {
    const { data, error } = await customSupabaseClient
      .from('financial_implementation_checklist')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('etapa_number', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[getImplementationChecklist] Error:', err);
    throw err;
  }
}

export default {
  // ETAPA 6
  importBankStatement,
  getUnmatchedTransactions,
  reconcileTransaction,

  // ETAPA 7
  calculateFinancialHealthScore,
  getHeatmapMetrics,
  getFinancialIndicators,
  getCockpitSummary,

  // ETAPA 8
  triggerFinancialAlerts,
  getActiveAlerts,
  markAlertAsRead,
  createAutomationRule,

  // ETAPA 9
  getFinancialSummary,
  refreshMaterializedView,

  // ETAPA 10
  createApprovalWorkflow,
  requireApprovalForTransaction,
  getPendingApprovals,
  approveTransaction,
  getAuditLog,

  // ETAPA 11-12
  recordTestResult,
  markEtapaAsCompleted,
  getImplementationSummary,
  getTestResults,
  getImplementationChecklist,
};
