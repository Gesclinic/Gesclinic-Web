/**
 * REAL-TIME ALERTS SYSTEM
 *
 * Monitors profitability metrics and sends alerts when thresholds are exceeded
 * Uses Supabase Real-Time subscriptions for live updates
 */

import { supabase } from './customSupabaseClient';

// Alert thresholds
export const ALERT_THRESHOLDS = {
  gross_margin: { warning: 25, critical: 15 },
  operating_margin: { warning: 20, critical: 10 },
  net_margin: { warning: 15, critical: 5 },
  commission_ratio: { warning: 35, critical: 45 },
  revenue_drop: { warning: 10, critical: 20 } // percent drop vs previous month
};

// ==========================================
// Alert Types
// ==========================================
export const ALERT_TYPES = {
  MARGIN_WARNING: 'margin_warning',
  MARGIN_CRITICAL: 'margin_critical',
  COMMISSION_WARNING: 'commission_warning',
  COMMISSION_CRITICAL: 'commission_critical',
  REVENUE_DROP: 'revenue_drop',
  LOSS: 'loss',
  PAYMENT_RECEIVED: 'payment_received',
  PAYMENT_FAILED: 'payment_failed',
  SETTLEMENT_COMPLETED: 'settlement_completed',
  COMMISSION_CALCULATED: 'commission_calculated'
};

// ==========================================
// Real-Time Payment Monitoring
// ==========================================
export const subscribeToPayments = (clinicId, onAlert) => {
  return supabase
    .channel(`payments:${clinicId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'ar_payments',
        filter: `clinic_id=eq.${clinicId}`
      },
      (payload) => {
        const payment = payload.new;

        // Alert on payment received
        if (payload.old.status === 'pending' && payment.status === 'settled') {
          onAlert({
            type: ALERT_TYPES.PAYMENT_RECEIVED,
            title: 'Payment Received',
            message: `R$ ${payment.payment_amount.toFixed(2)} received via ${payment.payment_method}`,
            severity: 'success',
            timestamp: new Date()
          });
        }

        // Alert on payment failed
        if (payload.old.status === 'pending' && payment.status === 'failed') {
          onAlert({
            type: ALERT_TYPES.PAYMENT_FAILED,
            title: 'Payment Failed',
            message: `Payment of R$ ${payment.payment_amount.toFixed(2)} failed`,
            severity: 'error',
            timestamp: new Date()
          });
        }
      }
    )
    .subscribe();
};

// ==========================================
// Real-Time DRE Monitoring
// ==========================================
export const subscribeToDREMetrics = (clinicId, onAlert) => {
  return supabase
    .channel(`dre:${clinicId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'dre_periods',
        filter: `clinic_id=eq.${clinicId}`
      },
      (payload) => {
        const dre = payload.new;
        const previousDre = payload.old;

        // Check gross margin
        if (dre.gross_margin_pct < ALERT_THRESHOLDS.gross_margin.critical) {
          onAlert({
            type: ALERT_TYPES.MARGIN_CRITICAL,
            title: 'Critical Gross Margin',
            message: `Gross margin dropped to ${dre.gross_margin_pct.toFixed(2)}%`,
            severity: 'error',
            data: { metric: 'gross_margin', value: dre.gross_margin_pct },
            timestamp: new Date()
          });
        } else if (dre.gross_margin_pct < ALERT_THRESHOLDS.gross_margin.warning) {
          onAlert({
            type: ALERT_TYPES.MARGIN_WARNING,
            title: 'Low Gross Margin',
            message: `Gross margin is ${dre.gross_margin_pct.toFixed(2)}%`,
            severity: 'warning',
            data: { metric: 'gross_margin', value: dre.gross_margin_pct },
            timestamp: new Date()
          });
        }

        // Check operating margin
        if (dre.operating_margin_pct < ALERT_THRESHOLDS.operating_margin.critical) {
          onAlert({
            type: ALERT_TYPES.MARGIN_CRITICAL,
            title: 'Critical Operating Margin',
            message: `Operating margin dropped to ${dre.operating_margin_pct.toFixed(2)}%`,
            severity: 'error',
            data: { metric: 'operating_margin', value: dre.operating_margin_pct },
            timestamp: new Date()
          });
        }

        // Check net income
        if (dre.net_income < 0 && previousDre.net_income >= 0) {
          onAlert({
            type: ALERT_TYPES.LOSS,
            title: 'Operating Loss Detected',
            message: `Net income is negative: R$ ${dre.net_income.toFixed(2)}`,
            severity: 'error',
            data: { metric: 'net_income', value: dre.net_income },
            timestamp: new Date()
          });
        }

        // Check revenue drop
        if (previousDre && previousDre.gross_revenue > 0) {
          const revenueDrop = ((previousDre.gross_revenue - dre.gross_revenue) / previousDre.gross_revenue) * 100;
          if (revenueDrop > ALERT_THRESHOLDS.revenue_drop.critical) {
            onAlert({
              type: ALERT_TYPES.REVENUE_DROP,
              title: 'Critical Revenue Drop',
              message: `Revenue dropped ${revenueDrop.toFixed(2)}% from previous period`,
              severity: 'error',
              data: { metric: 'revenue_drop_percent', value: revenueDrop },
              timestamp: new Date()
            });
          } else if (revenueDrop > ALERT_THRESHOLDS.revenue_drop.warning) {
            onAlert({
              type: ALERT_TYPES.REVENUE_DROP,
              title: 'Revenue Drop',
              message: `Revenue dropped ${revenueDrop.toFixed(2)}% from previous period`,
              severity: 'warning',
              data: { metric: 'revenue_drop_percent', value: revenueDrop },
              timestamp: new Date()
            });
          }
        }
      }
    )
    .subscribe();
};

// ==========================================
// Real-Time Commission Monitoring
// ==========================================
export const subscribeToCommissions = (clinicId, onAlert) => {
  return supabase
    .channel(`commissions:${clinicId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'medical_commission_ledger',
        filter: `clinic_id=eq.${clinicId}`
      },
      (payload) => {
        const commission = payload.new;

        onAlert({
          type: ALERT_TYPES.COMMISSION_CALCULATED,
          title: 'Commission Calculated',
          message: `Professional commission: R$ ${commission.commission_net.toFixed(2)} (net)`,
          severity: 'info',
          data: commission,
          timestamp: new Date()
        });
      }
    )
    .subscribe();
};

// ==========================================
// Real-Time Settlement Monitoring
// ==========================================
export const subscribeToSettlements = (clinicId, onAlert) => {
  return supabase
    .channel(`settlements:${clinicId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'payment_settlements',
        filter: `clinic_id=eq.${clinicId}`
      },
      (payload) => {
        const settlement = payload.new;

        if (settlement.status === 'completed') {
          onAlert({
            type: ALERT_TYPES.SETTLEMENT_COMPLETED,
            title: 'Settlement Completed',
            message: `Payment settlement of R$ ${settlement.settlement_amount.toFixed(2)} completed`,
            severity: 'success',
            data: settlement,
            timestamp: new Date()
          });
        }
      }
    )
    .subscribe();
};

// ==========================================
// Real-Time Reconciliation Monitoring
// ==========================================
export const subscribeToReconciliations = (clinicId, onAlert) => {
  return supabase
    .channel(`reconciliations:${clinicId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'bank_reconciliations',
        filter: `clinic_id=eq.${clinicId}`
      },
      (payload) => {
        const reconciliation = payload.new;

        const confidencePercent = (reconciliation.confidence_score * 100).toFixed(0);

        const message = reconciliation.status === 'matched'
          ? `Bank transaction auto-matched with ${confidencePercent}% confidence`
          : `Bank transaction requires manual review (${confidencePercent}% confidence)`;

        onAlert({
          type: 'reconciliation_update',
          title: reconciliation.status === 'matched' ? 'Transaction Matched' : 'Manual Review Required',
          message,
          severity: reconciliation.status === 'matched' ? 'success' : 'warning',
          data: reconciliation,
          timestamp: new Date()
        });
      }
    )
    .subscribe();
};

// ==========================================
// Subscribe to All Real-Time Events
// ==========================================
export const subscribeToAllAlerts = (clinicId, onAlert) => {
  const subscriptions = [];

  subscriptions.push(subscribeToPayments(clinicId, onAlert));
  subscriptions.push(subscribeToDREMetrics(clinicId, onAlert));
  subscriptions.push(subscribeToCommissions(clinicId, onAlert));
  subscriptions.push(subscribeToSettlements(clinicId, onAlert));
  subscriptions.push(subscribeToReconciliations(clinicId, onAlert));

  return () => {
    subscriptions.forEach(sub => {
      if (sub && typeof sub.unsubscribe === 'function') {
        sub.unsubscribe();
      }
    });
  };
};

// ==========================================
// Unsubscribe Helper
// ==========================================
export const unsubscribeFromAlerts = async (subscriptionId) => {
  return await supabase.removeChannel(subscriptionId);
};

export default {
  ALERT_THRESHOLDS,
  ALERT_TYPES,
  subscribeToPayments,
  subscribeToDREMetrics,
  subscribeToCommissions,
  subscribeToSettlements,
  subscribeToReconciliations,
  subscribeToAllAlerts,
  unsubscribeFromAlerts
};
