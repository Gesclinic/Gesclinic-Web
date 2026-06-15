import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Service para exportar dashboard financeiro como PDF
 * Inclui: KPIs, gráficos, resumos e alertas
 */

export const exportDashboardToPDF = async (dashboardData, clinicName = 'Gesclinic') => {
  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    let yPosition = margin;

    // ========== HEADER ==========
    pdf.setFillColor(26, 91, 138); // #1A5B8A
    pdf.rect(0, 0, pageWidth, 30, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(20);
    pdf.text('RELATÓRIO FINANCEIRO', margin, 15);
    
    pdf.setFontSize(10);
    pdf.text(clinicName, margin, 22);
    
    // Data do relatório
    const today = new Date().toLocaleDateString('pt-BR');
    pdf.text(`Gerado em: ${today}`, pageWidth - margin - 60, 22);

    yPosition = 40;

    // ========== KPI CARDS ==========
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(12);
    pdf.setFont(undefined, 'bold');
    pdf.text('INDICADORES PRINCIPAIS', margin, yPosition);
    yPosition += 8;

    // Prepare KPI data
    const kpiData = [];
    if (dashboardData?.kpis) {
      const metrics = [
        { label: 'Caixa Disponível', value: dashboardData.kpis.available_cash },
        { label: 'Contas a Receber', value: dashboardData.kpis.total_receivable },
        { label: 'Contas a Pagar', value: dashboardData.kpis.total_payable },
        { label: 'Resultado Líquido', value: dashboardData.kpis.net_result },
      ];

      for (let i = 0; i < metrics.length; i += 2) {
        const row = [];
        row.push([
          metrics[i].label,
          `R$ ${Number(metrics[i].value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        ]);
        if (metrics[i + 1]) {
          row.push([
            metrics[i + 1].label,
            `R$ ${Number(metrics[i + 1].value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          ]);
        }
        kpiData.push(row.flat());
      }
    }

    autoTable(pdf, {
      startY: yPosition,
      head: [['Métrica', 'Valor', 'Métrica', 'Valor']],
      body: kpiData,
      margin: { left: margin, right: margin },
      didDrawPage: function () {
        // Can add headers/footers here if needed
      },
      styles: {
        fontSize: 9,
        cellPadding: 3,
        textColor: [0, 0, 0],
      },
      headStyles: {
        fillColor: [26, 91, 138],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
    });

    yPosition = pdf.lastAutoTable.finalY + 10;

    // ========== FLUXO DE CAIXA ==========
    if (yPosition + 40 > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
    }

    pdf.setFontSize(12);
    pdf.setFont(undefined, 'bold');
    pdf.text('RESUMO DO FLUXO DE CAIXA', margin, yPosition);
    yPosition += 8;

    const cashflowData = [];
    if (dashboardData?.cashflow) {
      cashflowData.push(
        ['Saldo Inicial', `R$ ${Number(dashboardData.cashflow.initial_balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
        ['+ Entradas', `R$ ${Number(dashboardData.cashflow.inflows || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
        ['- Saídas', `R$ ${Number(dashboardData.cashflow.outflows || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
        ['= Saldo Final', `R$ ${Number(dashboardData.cashflow.final_balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`]
      );
    }

    autoTable(pdf, {
      startY: yPosition,
      head: [['Descrição', 'Valor']],
      body: cashflowData,
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 9,
        cellPadding: 4,
      },
      headStyles: {
        fillColor: [26, 91, 138],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
    });

    yPosition = pdf.lastAutoTable.finalY + 10;

    // ========== ALERTAS ==========
    if (yPosition + 30 > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
    }

    pdf.setFontSize(12);
    pdf.setFont(undefined, 'bold');
    pdf.text('ALERTAS FINANCEIROS', margin, yPosition);
    yPosition += 8;

    const alertsData = [];
    if (dashboardData?.alerts && dashboardData.alerts.length > 0) {
      dashboardData.alerts.forEach((alert) => {
        alertsData.push([
          alert.type || 'Info',
          alert.message || alert.title || 'Sem descrição',
          alert.severity || 'Normal',
        ]);
      });
    } else {
      alertsData.push(['✓', 'Nenhum alerta no momento', 'Normal']);
    }

    autoTable(pdf, {
      startY: yPosition,
      head: [['Tipo', 'Mensagem', 'Severidade']],
      body: alertsData,
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 95 },
        2: { cellWidth: 30 },
      },
      styles: {
        fontSize: 8,
        cellPadding: 3,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [26, 91, 138],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
    });

    // ========== FOOTER ==========
    const totalPages = pdf.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(150);
      pdf.text(
        `Página ${i} de ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }

    // Download PDF
    pdf.save(`Relatorio-Financeiro-${new Date().toISOString().split('T')[0]}.pdf`);
    
    return { success: true, message: 'PDF exportado com sucesso' };
  } catch (error) {
    console.error('Erro ao exportar PDF:', error);
    return { success: false, error: error.message };
  }
};

export const exportDashboardToPNG = async (elementId = 'dashboard-container') => {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Elemento com ID "${elementId}" não encontrado`);
    }

    // Dynamic import to avoid bundle bloat
    const html2canvas = (await import('html2canvas')).default;
    
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
    });

    // Convert to PNG and download
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `dashboard-snapshot-${new Date().toISOString().split('T')[0]}.png`;
    link.click();

    return { success: true, message: 'Screenshot exportado com sucesso' };
  } catch (error) {
    console.error('Erro ao exportar PNG:', error);
    return { success: false, error: error.message };
  }
};
