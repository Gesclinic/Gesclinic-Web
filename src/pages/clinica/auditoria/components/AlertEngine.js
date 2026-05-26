/**
 * Automatic Alert Engine for Audit Logs
 * Detects suspicious patterns and triggers alerts
 */

export const AlertRules = {
  MULTIPLE_DELETES: 'multiple_deletes',
  OUT_OF_HOURS: 'out_of_hours',
  NEW_DELETOR: 'new_deletor',
  RAPID_CHANGES: 'rapid_changes'
};

export const AlertSeverity = {
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'critical'
};

/**
 * Check for multiple deletions of same patient in timeframe
 */
export function checkMultipleDeletions(logs, threshold = 3, timeWindowMs = 60 * 60 * 1000) {
  const alerts = [];
  const deletionsByPatient = {};
  const now = new Date().getTime();
  
  logs.forEach(log => {
    if (log.action_type !== 'DELETED') return;
    
    const logTime = new Date(log.created_at).getTime();
    if (now - logTime > timeWindowMs) return;
    
    const patientId = log.patient?.id || log.appointment_id;
    const patientName = log.patient?.name || 'Desconhecido';
    
    if (!deletionsByPatient[patientId]) {
      deletionsByPatient[patientId] = {
        name: patientName,
        count: 0,
        logs: [],
        firstDeletion: logTime
      };
    }
    
    deletionsByPatient[patientId].count++;
    deletionsByPatient[patientId].logs.push(log);
  });
  
  // Generate alerts
  Object.values(deletionsByPatient).forEach(patient => {
    if (patient.count >= threshold) {
      alerts.push({
        id: `delete_${patient.logs[0].patient?.id}`,
        type: AlertRules.MULTIPLE_DELETES,
        severity: AlertSeverity.CRITICAL,
        title: '⚠️ Múltiplos Deletions Detectados',
        message: `${patient.count} deletions de "${patient.name}" em 1 hora`,
        count: patient.count,
        patientName: patient.name,
        timestamp: new Date().toISOString(),
        details: patient.logs
      });
    }
  });
  
  return alerts;
}

/**
 * Check for deletions outside business hours
 */
export function checkOutOfHours(logs, businessStart = 6, businessEnd = 18) {
  const alerts = [];
  const outOfHoursLogs = [];
  
  logs.forEach(log => {
    if (log.action_type !== 'DELETED') return;
    
    const logHour = new Date(log.created_at).getHours();
    if (logHour >= businessStart && logHour < businessEnd) return;
    
    outOfHoursLogs.push(log);
  });
  
  if (outOfHoursLogs.length > 0) {
    alerts.push({
      id: `out_of_hours_${new Date().toISOString()}`,
      type: AlertRules.OUT_OF_HOURS,
      severity: AlertSeverity.WARNING,
      title: '🕐 Deletions Fora do Horário',
      message: `${outOfHoursLogs.length} deletion(s) detectado(s) fora das ${businessStart}h-${businessEnd}h`,
      count: outOfHoursLogs.length,
      timestamp: new Date().toISOString(),
      details: outOfHoursLogs
    });
  }
  
  return alerts;
}

/**
 * Check for new users making deletions (first time)
 */
export function checkNewDeletors(logs) {
  const alerts = [];
  const deletionHistory = JSON.parse(localStorage.getItem('audit_deletion_history') || '{}');
  
  const newDeletors = {};
  logs.forEach(log => {
    if (log.action_type !== 'DELETED') return;
    
    const performedBy = log.performed_by_role || 'system';
    const key = `${log.user_id || 'unknown'}_${performedBy}`;
    
    if (!deletionHistory[key]) {
      if (!newDeletors[performedBy]) {
        newDeletors[performedBy] = {
          role: performedBy,
          userId: log.user_id,
          count: 0,
          logs: []
        };
      }
      newDeletors[performedBy].count++;
      newDeletors[performedBy].logs.push(log);
    }
  });
  
  // Update history
  logs.forEach(log => {
    if (log.action_type === 'DELETED') {
      const performedBy = log.performed_by_role || 'system';
      const key = `${log.user_id || 'unknown'}_${performedBy}`;
      deletionHistory[key] = new Date().toISOString();
    }
  });
  localStorage.setItem('audit_deletion_history', JSON.stringify(deletionHistory));
  
  // Generate alerts
  Object.values(newDeletors).forEach(newDeletor => {
    alerts.push({
      id: `new_deletor_${newDeletor.userId}`,
      type: AlertRules.NEW_DELETOR,
      severity: AlertSeverity.INFO,
      title: '👤 Novo Deletor Detectado',
      message: `${newDeletor.role} realizou deletion pela primeira vez (${newDeletor.count} deletions)`,
      role: newDeletor.role,
      count: newDeletor.count,
      timestamp: new Date().toISOString(),
      details: newDeletor.logs
    });
  });
  
  return alerts;
}

/**
 * Check for rapid successive changes on same appointment
 */
export function checkRapidChanges(logs, timeWindowMs = 5 * 60 * 1000) {
  const alerts = [];
  const changesByAppointment = {};
  const now = new Date().getTime();
  
  logs.forEach(log => {
    const logTime = new Date(log.created_at).getTime();
    if (now - logTime > timeWindowMs) return;
    
    const appointmentId = log.appointment_id;
    if (!changesByAppointment[appointmentId]) {
      changesByAppointment[appointmentId] = [];
    }
    changesByAppointment[appointmentId].push(log);
  });
  
  // Generate alerts for rapid changes
  Object.entries(changesByAppointment).forEach(([appointmentId, apptLogs]) => {
    if (apptLogs.length >= 5) {
      alerts.push({
        id: `rapid_changes_${appointmentId}`,
        type: AlertRules.RAPID_CHANGES,
        severity: AlertSeverity.WARNING,
        title: '⚡ Mudanças Rápidas Detectadas',
        message: `${apptLogs.length} mudanças em 5 minutos - Agendamento: ${apptLogs[0].patient?.name || appointmentId}`,
        appointmentId,
        count: apptLogs.length,
        timestamp: new Date().toISOString(),
        details: apptLogs
      });
    }
  });
  
  return alerts;
}

/**
 * Run all alert checks
 */
export function runAllAlertChecks(logs) {
  const allAlerts = [];
  
  allAlerts.push(...checkMultipleDeletions(logs, 3, 60 * 60 * 1000));
  allAlerts.push(...checkOutOfHours(logs, 6, 18));
  allAlerts.push(...checkNewDeletors(logs));
  allAlerts.push(...checkRapidChanges(logs, 5 * 60 * 1000));
  
  // Deduplicate by ID
  const uniqueAlerts = {};
  allAlerts.forEach(alert => {
    uniqueAlerts[alert.id] = alert;
  });
  
  return Object.values(uniqueAlerts);
}

/**
 * Save alerts to localStorage
 */
export function saveAlertsToStorage(alerts) {
  const existingAlerts = JSON.parse(localStorage.getItem('audit_alerts') || '[]');
  const now = new Date().toISOString();
  
  // Add new alerts
  const combined = [
    ...alerts.map(a => ({ ...a, created: now, read: false })),
    ...existingAlerts.filter(a => new Date(a.created).getTime() > new Date().getTime() - 24 * 60 * 60 * 1000)
  ];
  
  localStorage.setItem('audit_alerts', JSON.stringify(combined.slice(0, 100))); // Keep last 100
}

/**
 * Get all unread alerts
 */
export function getUnreadAlerts() {
  const alerts = JSON.parse(localStorage.getItem('audit_alerts') || '[]');
  return alerts.filter(a => !a.read);
}

/**
 * Mark alert as read
 */
export function markAlertAsRead(alertId) {
  const alerts = JSON.parse(localStorage.getItem('audit_alerts') || '[]');
  const updated = alerts.map(a => 
    a.id === alertId ? { ...a, read: true } : a
  );
  localStorage.setItem('audit_alerts', JSON.stringify(updated));
}
