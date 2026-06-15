import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Gerenciador de exportação avançada para múltiplos formatos
 * Suporta: CSV, Excel (via CSV), PDF, JSON
 */
export class AdvancedExportManager {
  /**
   * Exportar para CSV (compatível com Excel)
   */
  static exportToCSV(logs, filename = 'auditoria.csv') {
    try {
      if (!logs || logs.length === 0) {
        console.warn('Nenhum dado para exportar');
        return;
      }

      // Headers
      const headers = [
        'ID',
        'Paciente',
        'Profissional',
        'Ação',
        'Data/Hora',
        'Realizado por',
        'Perfil',
        'Contexto',
      ];

      // Converter dados
      const rows = logs.map(log => [
        log.id?.substring(0, 8),
        log.patient?.name || 'N/A',
        log.professional?.name || 'N/A',
        this.getActionLabel(log.action_type),
        format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR }),
        log.performed_by,
        log.performed_by_role || 'Sistema',
        log.context ? JSON.stringify(log.context).substring(0, 50) : '-',
      ]);

      // Montar CSV
      const csvContent = [
        headers.join(','),
        ...rows.map(row =>
          row
            .map(cell => `"${String(cell || '').replace(/"/g, '""')}"`)
            .join(',')
        ),
      ].join('\n');

      // Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
    } catch (error) {
      console.error('Erro ao exportar para CSV:', error);
    }
  }

  /**
   * Exportar para PDF com múltiplas páginas e formatação avançada
   */
  static exportToPDF(logs, title = 'Auditoria de Agendamentos', filename = 'auditoria.pdf') {
    try {
      if (!logs || logs.length === 0) {
        console.warn('Nenhum dado para exportar');
        return;
      }

      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      // Título
      doc.setFontSize(18);
      doc.setTextColor(41, 128, 185);
      doc.text(title, 14, 20);

      // Data de geração
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}`,
        14,
        28
      );
      doc.text(`Total de registros: ${logs.length}`, 14, 33);

      // Tabela manual (sem jsPDF-autotable para evitar dependência)
      let yPosition = 45;
      const pageHeight = doc.internal.pageSize.height;
      const rowHeight = 6;
      const pageMargin = 14;
      const maxWidth = doc.internal.pageSize.width - 2 * pageMargin;

      // Cabeçalho
      doc.setFillColor(41, 128, 185);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.rect(pageMargin, yPosition - 4, maxWidth, rowHeight, 'F');
      
      const headers = ['Paciente', 'Profissional', 'Ação', 'Data/Hora', 'Realizado por'];
      const colWidths = [maxWidth * 0.25, maxWidth * 0.2, maxWidth * 0.15, maxWidth * 0.2, maxWidth * 0.2];
      let xPos = pageMargin;
      
      headers.forEach((header, i) => {
        doc.text(header, xPos + 2, yPosition);
        xPos += colWidths[i];
      });

      yPosition += 7;
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(8);

      // Dados
      logs.forEach((log, idx) => {
        if (yPosition > pageHeight - 15) {
          doc.addPage();
          yPosition = 15;
        }

        const rowColor = idx % 2 === 0 ? [240, 248, 255] : [255, 255, 255];
        doc.setFillColor(...rowColor);
        doc.rect(pageMargin, yPosition - 4, maxWidth, rowHeight, 'F');

        xPos = pageMargin;
        const row = [
          log.patient?.name || 'N/A',
          log.professional?.name || 'N/A',
          this.getActionLabel(log.action_type),
          format(new Date(log.created_at), 'dd/MM/yy HH:mm', { locale: ptBR }),
          log.performed_by || 'Sistema',
        ];

        row.forEach((cell, i) => {
          doc.text(String(cell).substring(0, 20), xPos + 2, yPosition);
          xPos += colWidths[i];
        });

        yPosition += 7;
      });

      // Rodapé
      const pageCount = doc.internal.pages.length - 1;
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Página 1 de ${pageCount}`,
        doc.internal.pageSize.width / 2,
        pageHeight - 8,
        { align: 'center' }
      );

      doc.save(filename);
    } catch (error) {
      console.error('Erro ao exportar para PDF:', error);
    }
  }

  /**
   * Exportar para JSON (para integração com outros sistemas)
   */
  static exportToJSON(logs, filename = 'auditoria.json') {
    try {
      if (!logs || logs.length === 0) {
        console.warn('Nenhum dado para exportar');
        return;
      }

      const exportData = {
        metadata: {
          exported: new Date().toISOString(),
          version: '1.0',
          totalRecords: logs.length,
        },
        records: logs.map(log => ({
          id: log.id,
          patient: log.patient?.name,
          professional: log.professional?.name,
          action: log.action_type,
          timestamp: log.created_at,
          performedBy: log.performed_by,
          role: log.performed_by_role,
          context: log.context,
        })),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
    } catch (error) {
      console.error('Erro ao exportar para JSON:', error);
    }
  }

  /**
   * Exportar para formato padrão Excel via CSV com formatação
   */
  static exportToExcelCSV(logs, filename = 'auditoria.xlsx') {
    // Nota: navegadores modernos abrem .csv no Excel automaticamente
    // Para .xlsx real, seria necessário usar biblioteca como ExcelJS
    this.exportToCSV(logs, filename.replace('.xlsx', '.csv'));
  }

  /**
   * Exportar seleção personalizada de campos
   */
  static exportCustom(logs, selectedFields = [], format = 'csv') {
    try {
      const allFields = [
        'id',
        'patient',
        'professional',
        'action',
        'timestamp',
        'performedBy',
        'role',
        'context',
      ];
      const fieldsToExport = selectedFields.length > 0 ? selectedFields : allFields;

      const customData = logs.map(log => {
        const row = {};
        if (fieldsToExport.includes('patient')) row['Paciente'] = log.patient?.name;
        if (fieldsToExport.includes('professional'))
          row['Profissional'] = log.professional?.name;
        if (fieldsToExport.includes('action'))
          row['Ação'] = this.getActionLabel(log.action_type);
        if (fieldsToExport.includes('timestamp'))
          row['Data/Hora'] = format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", {
            locale: ptBR,
          });
        if (fieldsToExport.includes('performedBy')) row['Realizado por'] = log.performed_by;
        if (fieldsToExport.includes('role')) row['Perfil'] = log.performed_by_role;
        return row;
      });

      if (format === 'json') {
        const blob = new Blob([JSON.stringify(customData, null, 2)], {
          type: 'application/json',
        });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `auditoria_customizado.json`;
        link.click();
      } else {
        const headers = Object.keys(customData[0] || {});
        const csv = [
          headers.join(','),
          ...customData.map(row =>
            headers
              .map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`)
              .join(',')
          ),
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `auditoria_customizado.csv`;
        link.click();
      }
    } catch (error) {
      console.error('Erro ao exportar customizado:', error);
    }
  }

  /**
   * Traduzir tipo de ação para português
   */
  static getActionLabel(actionType) {
    const labels = {
      CREATED: '✓ Criado',
      UPDATED: '↻ Atualizado',
      DELETED: '✕ Deletado',
      SCHEDULED: '📅 Agendado',
      CONFIRMED: '✓ Confirmado',
      CANCELLED: '✕ Cancelado',
      RESCHEDULED: '↻ Remarcado',
      NOSHOW: '⏭️ Não Compareceu',
      COMPLETED: '✓ Concluído',
    };
    return labels[actionType] || actionType;
  }
}
