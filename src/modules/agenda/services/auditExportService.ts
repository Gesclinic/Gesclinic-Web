import { AuditLogEntry } from '../types';
import { customSupabaseClient } from '@/lib/customSupabaseClient';

/**
 * Export audit logs to CSV format
 */
export const exportAuditLogsToCSV = (auditEntries: AuditLogEntry[], filename?: string): void => {
  const headers = [
    'ID',
    'Appointment ID',
    'Operação',
    'Data/Hora',
    'Modificado Por',
    'Campos Alterados',
    'Resumo',
  ];

  const rows = auditEntries.map(entry => [
    entry.id,
    entry.appointment_id,
    entry.operation,
    new Date(entry.changed_at).toLocaleString('pt-BR'),
    entry.changed_by.substring(0, 8),
    entry.changed_fields?.join(', ') || '-',
    entry.operation === 'CREATE' 
      ? 'Novo agendamento criado'
      : entry.operation === 'DELETE'
      ? 'Agendamento deletado'
      : `${entry.changed_fields?.length || 0} campo(s) alterado(s)`,
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename || `audit_export_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Export audit logs to JSON format
 */
export const exportAuditLogsToJSON = (auditEntries: AuditLogEntry[], filename?: string): void => {
  const exportData = {
    exportDate: new Date().toISOString(),
    entriesCount: auditEntries.length,
    entries: auditEntries.map(entry => ({
      id: entry.id,
      appointmentId: entry.appointment_id,
      operation: entry.operation,
      changedAt: entry.changed_at,
      changedBy: entry.changed_by,
      changedFields: entry.changed_fields,
      beforeSnapshot: entry.before_snapshot,
      afterSnapshot: entry.after_snapshot,
      source: entry.source,
    })),
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename || `audit_export_${new Date().toISOString().split('T')[0]}.json`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Export audit logs to HTML table format (for printing)
 */
export const exportAuditLogsToHTML = (
  auditEntries: AuditLogEntry[],
  clinicName?: string,
  filename?: string
): void => {
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Relatório de Auditoria</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          margin: 20px;
          background: white;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 20px;
        }
        .header h1 {
          margin: 0;
          color: #1f2937;
          font-size: 24px;
        }
        .header p {
          margin: 5px 0;
          color: #6b7280;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        th {
          background-color: #f3f4f6;
          color: #1f2937;
          padding: 12px;
          text-align: left;
          font-weight: 600;
          border: 1px solid #d1d5db;
          font-size: 12px;
        }
        td {
          padding: 12px;
          border: 1px solid #d1d5db;
          font-size: 11px;
          color: #374151;
        }
        tr:nth-child(even) {
          background-color: #f9fafb;
        }
        .operation-create {
          background-color: #dcfce7;
          color: #166534;
          padding: 4px 8px;
          border-radius: 4px;
          font-weight: 500;
        }
        .operation-update {
          background-color: #dbeafe;
          color: #1e40af;
          padding: 4px 8px;
          border-radius: 4px;
          font-weight: 500;
        }
        .operation-delete {
          background-color: #fee2e2;
          color: #991b1b;
          padding: 4px 8px;
          border-radius: 4px;
          font-weight: 500;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          color: #6b7280;
          font-size: 11px;
          text-align: right;
        }
        @media print {
          body { margin: 0; }
          .header { page-break-after: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Relatório de Auditoria de Agendamentos</h1>
        ${clinicName ? `<p><strong>Clínica:</strong> ${clinicName}</p>` : ''}
        <p><strong>Data do Relatório:</strong> ${new Date().toLocaleString('pt-BR')}</p>
        <p><strong>Total de Registros:</strong> ${auditEntries.length}</p>
      </div>

      <table>
        <thead>
          <tr>
            <th>ID Auditoria</th>
            <th>ID Agendamento</th>
            <th>Operação</th>
            <th>Data/Hora</th>
            <th>Usuário</th>
            <th>Campos Alterados</th>
          </tr>
        </thead>
        <tbody>
          ${auditEntries
            .map(
              entry => `
            <tr>
              <td>${entry.id.substring(0, 8)}...</td>
              <td>${entry.appointment_id.substring(0, 8)}...</td>
              <td>
                <span class="operation-${entry.operation.toLowerCase()}">
                  ${entry.operation}
                </span>
              </td>
              <td>${new Date(entry.changed_at).toLocaleString('pt-BR')}</td>
              <td>${entry.changed_by.substring(0, 8)}...</td>
              <td>${entry.changed_fields?.join(', ') || '-'}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>

      <div class="footer">
        <p>Gerado automaticamente pelo sistema Gesclinic</p>
        <p>Relatório confidencial - Apenas para uso autorizado</p>
      </div>
    </body>
    </html>
  `;

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename || `audit_report_${new Date().toISOString().split('T')[0]}.html`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Archive old audit logs (older than specified days)
 * Returns count of archived records
 */
export const archiveOldAuditLogs = async (
  clinicId: string,
  daysOld: number = 180, // Default: 6 months
): Promise<{ archived: number; error?: string }> => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    // Note: This would require a stored procedure or RPC function on Supabase
    // For now, we're providing the framework
    const { data, error } = await customSupabaseClient.rpc(
      'archive_old_audit_logs',
      {
        p_clinic_id: clinicId,
        p_cutoff_date: cutoffDate.toISOString(),
      }
    );

    if (error) throw error;

    return { archived: data?.archived_count || 0 };
  } catch (error) {
    console.error('Error archiving audit logs:', error);
    return {
      archived: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Get archive statistics for a clinic
 */
export const getArchiveStats = async (clinicId: string) => {
  try {
    const { data, error } = await customSupabaseClient.rpc(
      'get_archive_stats',
      { p_clinic_id: clinicId }
    );

    if (error) throw error;

    return {
      archivedRecords: data?.archived_count || 0,
      lastArchivedDate: data?.last_archived_date || null,
      nextArchivalDate: data?.next_archival_date || null,
    };
  } catch (error) {
    console.error('Error getting archive stats:', error);
    return {
      archivedRecords: 0,
      lastArchivedDate: null,
      nextArchivalDate: null,
    };
  }
};
