import { format, startOfDay, startOfWeek, startOfMonth, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';

/**
 * Generate period-based audit reports
 * Supports: daily, weekly, monthly summaries
 */

export function generateDailyReport(logs) {
  const grouped = {};
  
  logs.forEach(log => {
    const date = format(parseISO(log.created_at), 'yyyy-MM-dd');
    if (!grouped[date]) {
      grouped[date] = {
        date,
        displayDate: format(parseISO(log.created_at), 'dd/MM/yyyy', { locale: pt }),
        totalActions: 0,
        byAction: { CREATED: 0, UPDATED: 0, DELETED: 0 },
        byProfessional: {},
        byPatient: {},
        logs: []
      };
    }
    
    grouped[date].totalActions++;
    grouped[date].byAction[log.action_type]++;
    grouped[date].logs.push(log);
    
    // By Professional
    const prof = log.professional?.name || 'Não informado';
    if (!grouped[date].byProfessional[prof]) {
      grouped[date].byProfessional[prof] = { count: 0, byAction: { CREATED: 0, UPDATED: 0, DELETED: 0 } };
    }
    grouped[date].byProfessional[prof].count++;
    grouped[date].byProfessional[prof].byAction[log.action_type]++;
    
    // By Patient
    const patient = log.patient?.name || 'Não informado';
    if (!grouped[date].byPatient[patient]) {
      grouped[date].byPatient[patient] = { count: 0, byAction: { CREATED: 0, UPDATED: 0, DELETED: 0 } };
    }
    grouped[date].byPatient[patient].count++;
    grouped[date].byPatient[patient].byAction[log.action_type]++;
  });
  
  return Object.values(grouped).sort((a, b) => new Date(b.date) - new Date(a.date));
}

export function generateWeeklyReport(logs) {
  const grouped = {};
  
  logs.forEach(log => {
    const date = parseISO(log.created_at);
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const weekKey = format(weekStart, 'yyyy-MM-dd');
    const weekNum = format(weekStart, "w'w'", { locale: pt });
    
    if (!grouped[weekKey]) {
      grouped[weekKey] = {
        weekStart: weekKey,
        displayWeek: `Semana ${weekNum} - ${format(weekStart, 'dd MMM', { locale: pt })}`,
        totalActions: 0,
        byAction: { CREATED: 0, UPDATED: 0, DELETED: 0 },
        byProfessional: {},
        byPatient: {},
        dayBreakdown: {},
        logs: []
      };
    }
    
    grouped[weekKey].totalActions++;
    grouped[weekKey].byAction[log.action_type]++;
    grouped[weekKey].logs.push(log);
    
    // Day breakdown
    const dayStr = format(date, 'yyyy-MM-dd');
    if (!grouped[weekKey].dayBreakdown[dayStr]) {
      grouped[weekKey].dayBreakdown[dayStr] = { CREATED: 0, UPDATED: 0, DELETED: 0 };
    }
    grouped[weekKey].dayBreakdown[dayStr][log.action_type]++;
    
    // By Professional
    const prof = log.professional?.name || 'Não informado';
    if (!grouped[weekKey].byProfessional[prof]) {
      grouped[weekKey].byProfessional[prof] = { count: 0, byAction: { CREATED: 0, UPDATED: 0, DELETED: 0 } };
    }
    grouped[weekKey].byProfessional[prof].count++;
    grouped[weekKey].byProfessional[prof].byAction[log.action_type]++;
    
    // By Patient
    const patient = log.patient?.name || 'Não informado';
    if (!grouped[weekKey].byPatient[patient]) {
      grouped[weekKey].byPatient[patient] = { count: 0, byAction: { CREATED: 0, UPDATED: 0, DELETED: 0 } };
    }
    grouped[weekKey].byPatient[patient].count++;
    grouped[weekKey].byPatient[patient].byAction[log.action_type]++;
  });
  
  return Object.values(grouped).sort((a, b) => new Date(b.weekStart) - new Date(a.weekStart));
}

export function generateMonthlyReport(logs) {
  const grouped = {};
  
  logs.forEach(log => {
    const date = parseISO(log.created_at);
    const monthStart = startOfMonth(date);
    const monthKey = format(monthStart, 'yyyy-MM');
    
    if (!grouped[monthKey]) {
      grouped[monthKey] = {
        month: monthKey,
        displayMonth: format(monthStart, 'MMMM yyyy', { locale: pt }),
        totalActions: 0,
        byAction: { CREATED: 0, UPDATED: 0, DELETED: 0 },
        byProfessional: {},
        byPatient: {},
        weekBreakdown: {},
        logs: []
      };
    }
    
    grouped[monthKey].totalActions++;
    grouped[monthKey].byAction[log.action_type]++;
    grouped[monthKey].logs.push(log);
    
    // Week breakdown
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const weekKey = format(weekStart, 'yyyy-MM-dd');
    if (!grouped[monthKey].weekBreakdown[weekKey]) {
      grouped[monthKey].weekBreakdown[weekKey] = { CREATED: 0, UPDATED: 0, DELETED: 0 };
    }
    grouped[monthKey].weekBreakdown[weekKey][log.action_type]++;
    
    // By Professional
    const prof = log.professional?.name || 'Não informado';
    if (!grouped[monthKey].byProfessional[prof]) {
      grouped[monthKey].byProfessional[prof] = { count: 0, byAction: { CREATED: 0, UPDATED: 0, DELETED: 0 } };
    }
    grouped[monthKey].byProfessional[prof].count++;
    grouped[monthKey].byProfessional[prof].byAction[log.action_type]++;
    
    // By Patient
    const patient = log.patient?.name || 'Não informado';
    if (!grouped[monthKey].byPatient[patient]) {
      grouped[monthKey].byPatient[patient] = { count: 0, byAction: { CREATED: 0, UPDATED: 0, DELETED: 0 } };
    }
    grouped[monthKey].byPatient[patient].count++;
    grouped[monthKey].byPatient[patient].byAction[log.action_type]++;
  });
  
  return Object.values(grouped).sort((a, b) => new Date(b.month) - new Date(a.month));
}

/**
 * Generate summary text for period report
 */
export function generateReportSummary(report, reportType) {
  const { totalActions, byAction } = report;
  const created = byAction.CREATED || 0;
  const updated = byAction.UPDATED || 0;
  const deleted = byAction.DELETED || 0;
  
  return `${totalActions} ações (${created} criações, ${updated} atualizações, ${deleted} deleções)`;
}

/**
 * Export period report to CSV
 */
export function exportReportToCSV(report, reportType, filename) {
  const { byProfessional, byPatient, displayDate, displayWeek, displayMonth } = report;
  const periodName = displayDate || displayWeek || displayMonth;
  
  let csv = `Relatório ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} - ${periodName}\n`;
  csv += `Data de Exportação: ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}\n\n`;
  
  // Professional breakdown
  csv += `PROFISSIONAIS\n`;
  csv += `Profissional,Ações,Criações,Atualizações,Deleções\n`;
  
  Object.entries(byProfessional).forEach(([prof, data]) => {
    csv += `"${prof}",${data.count},${data.byAction.CREATED},${data.byAction.UPDATED},${data.byAction.DELETED}\n`;
  });
  
  csv += `\nPACIENTES\n`;
  csv += `Paciente,Ações,Criações,Atualizações,Deleções\n`;
  
  Object.entries(byPatient).forEach(([patient, data]) => {
    csv += `"${patient}",${data.count},${data.byAction.CREATED},${data.byAction.UPDATED},${data.byAction.DELETED}\n`;
  });
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}
