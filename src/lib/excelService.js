import * as XLSX from 'xlsx';

/**
 * Service para exportar dados financeiros como Excel com formatação
 * Suporta múltiplas abas (sheets) com estilos
 */

export const exportDashboardToExcel = async (dashboardData, clinicName = 'Gesclinic') => {
  try {
    const workbook = XLSX.utils.book_new();

    // ========== ABA 1: RESUMO EXECUTIVO ==========
    const summaryData = [
      ['RELATÓRIO FINANCEIRO - ' + clinicName],
      ['Data de Geração:', new Date().toLocaleDateString('pt-BR')],
      [''],
      ['INDICADORES PRINCIPAIS'],
      ['Métrica', 'Valor'],
    ];

    if (dashboardData?.kpis) {
      summaryData.push(
        ['Caixa Disponível', dashboardData.kpis.available_cash || 0],
        ['Contas a Receber', dashboardData.kpis.total_receivable || 0],
        ['Contas a Pagar', dashboardData.kpis.total_payable || 0],
        ['Resultado Líquido', dashboardData.kpis.net_result || 0],
        ['Taxa de Saúde Financeira (%)', dashboardData.kpis.health_score || 0]
      );
    }

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    summarySheet['!cols'] = [{ wch: 30 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo');

    // ========== ABA 2: FLUXO DE CAIXA ==========
    const cashflowData = [
      ['FLUXO DE CAIXA'],
      ['Data:', new Date().toLocaleDateString('pt-BR')],
      [''],
      ['Conceito', 'Valor (R$)'],
    ];

    if (dashboardData?.cashflow) {
      cashflowData.push(
        ['Saldo Inicial', dashboardData.cashflow.initial_balance || 0],
        ['Entradas', dashboardData.cashflow.inflows || 0],
        ['Saídas', dashboardData.cashflow.outflows || 0],
        ['Saldo Final', dashboardData.cashflow.final_balance || 0]
      );
    }

    const cashflowSheet = XLSX.utils.aoa_to_sheet(cashflowData);
    cashflowSheet['!cols'] = [{ wch: 25 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(workbook, cashflowSheet, 'Fluxo Caixa');

    // ========== ABA 3: CONTAS A RECEBER ==========
    const receivablesData = [
      ['CONTAS A RECEBER'],
      [''],
      ['Paciente', 'Profissional', 'Data Serviço', 'Valor (R$)', 'Status'],
    ];

    if (dashboardData?.receivables && Array.isArray(dashboardData.receivables)) {
      dashboardData.receivables.forEach((rec) => {
        receivablesData.push([
          rec.patient_name || 'N/A',
          rec.professional_name || 'N/A',
          rec.service_date || 'N/A',
          rec.amount || 0,
          rec.status || 'Pendente',
        ]);
      });
    }

    const receivablesSheet = XLSX.utils.aoa_to_sheet(receivablesData);
    receivablesSheet['!cols'] = [
      { wch: 20 },
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
    ];
    XLSX.utils.book_append_sheet(workbook, receivablesSheet, 'Receber');

    // ========== ABA 4: CONTAS A PAGAR ==========
    const payablesData = [
      ['CONTAS A PAGAR'],
      [''],
      ['Fornecedor', 'Descrição', 'Data Vencimento', 'Valor (R$)', 'Status'],
    ];

    if (dashboardData?.payables && Array.isArray(dashboardData.payables)) {
      dashboardData.payables.forEach((pay) => {
        payablesData.push([
          pay.vendor_name || 'N/A',
          pay.description || 'N/A',
          pay.due_date || 'N/A',
          pay.amount || 0,
          pay.status || 'Aberto',
        ]);
      });
    }

    const payablesSheet = XLSX.utils.aoa_to_sheet(payablesData);
    payablesSheet['!cols'] = [
      { wch: 20 },
      { wch: 25 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
    ];
    XLSX.utils.book_append_sheet(workbook, payablesSheet, 'Pagar');

    // ========== ABA 5: ALERTAS ==========
    const alertsData = [
      ['ALERTAS FINANCEIROS'],
      [''],
      ['Tipo', 'Mensagem', 'Severidade', 'Data'],
    ];

    if (dashboardData?.alerts && Array.isArray(dashboardData.alerts)) {
      dashboardData.alerts.forEach((alert) => {
        alertsData.push([
          alert.type || 'Info',
          alert.message || alert.title || 'Sem descrição',
          alert.severity || 'Normal',
          alert.created_at || new Date().toLocaleDateString('pt-BR'),
        ]);
      });
    } else {
      alertsData.push(['✓', 'Nenhum alerta no momento', 'Normal', new Date().toLocaleDateString('pt-BR')]);
    }

    const alertsSheet = XLSX.utils.aoa_to_sheet(alertsData);
    alertsSheet['!cols'] = [
      { wch: 15 },
      { wch: 40 },
      { wch: 15 },
      { wch: 15 },
    ];
    XLSX.utils.book_append_sheet(workbook, alertsSheet, 'Alertas');

    // Download
    const fileName = `Relatorio-Financeiro-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    return { success: true, message: 'Excel exportado com sucesso' };
  } catch (error) {
    console.error('Erro ao exportar Excel:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Export table data to Excel
 * Useful for exporting specific tables/lists
 */
export const exportTableToExcel = (tableData, sheetName = 'Dados', fileName = 'export.xlsx') => {
  try {
    const worksheet = XLSX.utils.json_to_sheet(tableData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, fileName);

    return { success: true, message: `${sheetName} exportado com sucesso` };
  } catch (error) {
    console.error('Erro ao exportar tabela:', error);
    return { success: false, error: error.message };
  }
};
