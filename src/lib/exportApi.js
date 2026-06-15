/**
 * exportApi.js
 * Funções para exportar dados de auditoria com relatório avançado
 */

import { jsPDF } from 'jspdf';
import { AUDIT_ACTION_LABELS, AUDIT_ROLE_LABELS } from '@/lib/auditApi';

/**
 * Exportar logs de auditoria para CSV
 */
export function exportAuditLogsToCSV(logs, filename = 'auditoria-agendamentos.csv') {
  if (!logs || logs.length === 0) {
    console.warn('Nenhum log para exportar');
    return;
  }

  // Preparar headers
  const headers = ['Data/Hora', 'Ação', 'Paciente', 'Profissional', 'Realizado por', 'Role'];

  // Preparar dados
  const rows = logs.map(log => [
    new Date(log.created_at).toLocaleString('pt-BR'),
    log.action_type,
    log.patient?.name || '-',
    log.professional?.name || '-',
    log.performed_by || '-',
    log.performed_by_role || '-',
  ]);

  // Criar CSV
  let csv = headers.join(',') + '\n';
  rows.forEach(row => {
    csv += row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(',') + '\n';
  });

  // Download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

/**
 * Exportar logs de auditoria para PDF com tabela simples
 */
export function exportAuditLogsToPDF(logs, filename = 'auditoria-agendamentos.pdf') {
  if (!logs || logs.length === 0) {
    console.warn('Nenhum log para exportar');
    return;
  }

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const lineHeight = 7;
  let yPos = margin;

  // ===== PAGE 1: SUMMARY =====
  
  // Title
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text('Relatório de Auditoria', margin, yPos);
  yPos += 12;

  // Date
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  const genDate = new Date().toLocaleString('pt-BR');
  doc.text(`Gerado em: ${genDate}`, margin, yPos);
  yPos += 8;

  // Summary box
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 35, 'F');
  
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text('Resumo Executivo', margin + 3, yPos + 5);
  
  // Count by action
  const actionCounts = logs.reduce((acc, log) => {
    acc[log.action_type] = (acc[log.action_type] || 0) + 1;
    return acc;
  }, {});
  
  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  let summaryY = yPos + 12;
  doc.text(`Total de Ações: ${logs.length}`, margin + 3, summaryY);
  doc.text(`Criados: ${actionCounts['CREATED'] || 0}`, margin + 3, summaryY + 6);
  doc.text(`Atualizados: ${actionCounts['UPDATED'] || 0}`, pageWidth / 2, summaryY);
  doc.text(`Deletados: ${actionCounts['DELETED'] || 0}`, pageWidth / 2, summaryY + 6);
  
  yPos += 40;

  // Page break for logs table
  doc.addPage();
  yPos = margin;
  
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('Detalhes das Alterações', margin, yPos);
  yPos += 8;

  // Headers
  const headers = ['Data/Hora', 'Ação', 'Paciente', 'Profissional', 'Realizado por'];
  const colWidths = [30, 20, 40, 35, 20];
  
  // Draw header row
  doc.setFillColor(41, 128, 185);
  doc.setTextColor(255, 255, 255);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(9);
  
  let xPos = margin;
  headers.forEach((header, idx) => {
    doc.text(header, xPos + 1, yPos + 4, { maxWidth: colWidths[idx] - 2 });
    doc.rect(xPos, yPos - 2, colWidths[idx], lineHeight + 2, 'F');
    xPos += colWidths[idx];
  });
  yPos += lineHeight + 2;

  // Draw data rows
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(8);
  
  let bgColor = true;
  logs.forEach(log => {
    // Check if we need a new page
    if (yPos + lineHeight > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
      bgColor = true;
    }

    const row = [
      new Date(log.created_at).toLocaleString('pt-BR'),
      AUDIT_ACTION_LABELS[log.action_type] || log.action_type,
      log.patient?.name || '-',
      log.professional?.name || '-',
      log.performed_by ? log.performed_by.substring(0, 8) : 'Sistema',
    ];

    // Alternate row colors
    if (bgColor) {
      doc.setFillColor(245, 245, 245);
      xPos = margin;
      headers.forEach((_, idx) => {
        doc.rect(xPos, yPos - 2, colWidths[idx], lineHeight, 'F');
        xPos += colWidths[idx];
      });
    }

    // Draw text
    xPos = margin;
    row.forEach((cell, idx) => {
      doc.text((cell || '').toString(), xPos + 1, yPos + 2, { maxWidth: colWidths[idx] - 2 });
      doc.rect(xPos, yPos - 2, colWidths[idx], lineHeight);
      xPos += colWidths[idx];
    });

    yPos += lineHeight;
    bgColor = !bgColor;
  });

  // Download
  doc.save(filename);
}

/**
 * Exportar detalhes de um log específico
 */
export function exportLogDetails(log, filename = 'log-detalhes.json') {
  if (!log) {
    console.warn('Nenhum log para exportar');
    return;
  }

  const details = {
    id: log.id,
    appointmentId: log.appointment_id,
    action: log.action_type,
    performedBy: log.performed_by,
    performedByRole: log.performed_by_role,
    patient: log.patient,
    professional: log.professional,
    createdAt: log.created_at,
    context: log.context,
  };

  const json = JSON.stringify(details, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}
