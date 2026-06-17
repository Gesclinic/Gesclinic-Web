/**
 * Report Generation API
 * Gera relatórios diários imprimíveis de caixa com assinatura digital
 */

import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

/**
 * Gera relatório PDF de Caixa Individual com assinatura digital
 */
export async function generateCaixaIndividualReport(drawerData, signatureBase64, operatorName) {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Cabeçalho
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('RELATÓRIO DE CAIXA INDIVIDUAL', 20, 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 20, 28);
    doc.text(`Horário: ${new Date().toLocaleTimeString('pt-BR')}`, 20, 34);
    doc.text(`Operador: ${operatorName}`, 20, 40);

    // Seção de Resumo
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('RESUMO DO CAIXA', 20, 52);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Saldo Inicial: R$ ${Number(drawerData.opening_balance || 0).toFixed(2)}`, 20, 60);
    doc.text(`Saldo Esperado: R$ ${Number(drawerData.expected_balance || 0).toFixed(2)}`, 20, 66);
    doc.text(`Saldo Fechado: R$ ${Number(drawerData.closing_balance || 0).toFixed(2)}`, 20, 72);

    const discrepancy = Number(drawerData.closing_balance || 0) - Number(drawerData.expected_balance || 0);
    doc.setTextColor(discrepancy >= 0 ? 0 : 255, discrepancy >= 0 ? 128 : 0, 0);
    doc.text(`Divergência: R$ ${discrepancy.toFixed(2)}`, 20, 78);
    doc.setTextColor(0, 0, 0);

    // Seção de Breakdown por Forma de Pagamento
    if (drawerData.paymentMethodSummary && drawerData.paymentMethodSummary.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('BREAKDOWN POR FORMA DE PAGAMENTO', 20, 90);

      let yPosition = 98;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);

      drawerData.paymentMethodSummary.forEach((method) => {
        doc.text(`${method.method}:`, 20, yPosition);
        doc.text(`Entrada: R$ ${method.entrada.toFixed(2)}`, 30, yPosition + 4);
        doc.text(`Saída: R$ ${method.saida.toFixed(2)}`, 30, yPosition + 8);
        doc.text(`Saldo: R$ ${method.saldo.toFixed(2)}`, 30, yPosition + 12);
        yPosition += 18;
      });
    }

    // Seção de Assinatura
    const signatureY = 260;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('ASSINATURA DIGITAL DO GESTOR', 20, signatureY);

    if (signatureBase64) {
      try {
        doc.addImage(signatureBase64, 'PNG', 20, signatureY + 8, 60, 20);
      } catch (err) {
        doc.text('[Assinatura digital indisponível]', 20, signatureY + 10);
      }
    } else {
      doc.text('[Assinatura digital não capturada]', 20, signatureY + 10);
    }

    // Rodapé
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Este documento foi gerado digitalmente e contém assinatura digital.', 20, 285);
    doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, 20, 290);

    // Salvar PDF
    doc.save(`Relatorio_Caixa_Individual_${new Date().toISOString().split('T')[0]}.pdf`);
    return { success: true, message: 'PDF gerado e baixado com sucesso!' };
  } catch (error) {
    console.error('Erro ao gerar PDF de caixa individual:', error);
    throw error;
  }
}

/**
 * Gera relatório PDF de Caixa Geral com consolidação
 */
export async function generateCaixaGeralReport(consolidationData, discrepancies, managerSignature) {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Cabeçalho
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('RELATÓRIO DE CAIXA GERAL', 20, 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 20, 28);

    // Seção de Consolidação
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('CONSOLIDAÇÃO DE SALDOS', 20, 40);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    if (consolidationData && consolidationData.summary) {
      const { summary } = consolidationData;
      doc.text(`Dinheiro em Espécie: R$ ${Number(summary.cashInDrawers || 0).toFixed(2)}`, 20, 48);
      doc.text(`Caixa Geral: R$ ${Number(summary.generalCash || 0).toFixed(2)}`, 20, 54);
      doc.text(`Saldos Bancários: R$ ${Number(summary.bank || 0).toFixed(2)}`, 20, 60);
      doc.text(`Cartões: R$ ${Number(summary.card || 0).toFixed(2)}`, 20, 66);
      doc.text(`PIX/TED: R$ ${Number(summary.pix || 0).toFixed(2)}`, 20, 72);
      doc.text(`Cheques: R$ ${Number(summary.check || 0).toFixed(2)}`, 20, 78);

      const total =
        Number(summary.cashInDrawers || 0) +
        Number(summary.generalCash || 0) +
        Number(summary.bank || 0) +
        Number(summary.card || 0) +
        Number(summary.pix || 0) +
        Number(summary.check || 0);

      doc.setFont('helvetica', 'bold');
      doc.text(`TOTAL: R$ ${total.toFixed(2)}`, 20, 86);
    }

    // Seção de Divergências
    if (discrepancies && discrepancies.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('DIVERGÊNCIAS DETECTADAS', 20, 98);

      let yPosition = 106;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);

      discrepancies.slice(0, 10).forEach((d) => {
        doc.text(`Caixa: ${d.date_opened ? new Date(d.date_opened).toLocaleDateString('pt-BR') : 'N/A'}`, 20, yPosition);
        doc.text(
          `Divergência: R$ ${Number(d.discrepancy || 0).toFixed(2)}`,
          20,
          yPosition + 4,
          discrepancy > 0 ? { textColor: [0, 128, 0] } : { textColor: [255, 0, 0] },
        );
        yPosition += 10;
      });
    }

    // Seção de Assinatura do Gestor
    const signatureY = 240;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('APROVAÇÃO DO GESTOR', 20, signatureY);

    if (managerSignature) {
      try {
        doc.addImage(managerSignature, 'PNG', 20, signatureY + 8, 60, 20);
      } catch (err) {
        doc.text('[Assinatura digital indisponível]', 20, signatureY + 10);
      }
    } else {
      doc.text('[Aguardando assinatura do gestor]', 20, signatureY + 10);
    }

    // Rodapé
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Este documento foi gerado digitalmente e requer assinatura do gestor.', 20, 275);
    doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, 20, 280);

    // Salvar PDF
    doc.save(`Relatorio_Caixa_Geral_${new Date().toISOString().split('T')[0]}.pdf`);
    return { success: true, message: 'PDF de Caixa Geral gerado e baixado com sucesso!' };
  } catch (error) {
    console.error('Erro ao gerar PDF de caixa geral:', error);
    throw error;
  }
}

/**
 * Gera relatório de Divergências em Excel
 */
export async function generateDivergenciesReport(discrepancies, operatorMetrics) {
  try {
    const data = [
      ['RELATÓRIO DE DIVERGÊNCIAS'],
      [`Data: ${new Date().toLocaleDateString('pt-BR')}`],
      [],
      ['RESUMO POR OPERADOR'],
      ['Operador', 'Total Divergências', 'Valor Total', 'Divergência Média', 'Taxa %'],
      ...(operatorMetrics || []).map((m) => [
        m.operatorName,
        m.divergences,
        m.totalAmount.toFixed(2),
        m.avgDivergence.toFixed(2),
        m.divergenceRate.toFixed(2),
      ]),
      [],
      ['DETALHES DAS DIVERGÊNCIAS'],
      ['Data', 'Operador', 'Saldo Esperado', 'Saldo Real', 'Divergência'],
      ...(discrepancies || []).map((d) => [
        new Date(d.date_opened).toLocaleDateString('pt-BR'),
        d.operator?.name || 'N/A',
        Number(d.expected_balance || 0).toFixed(2),
        Number(d.closing_balance || 0).toFixed(2),
        Number(d.discrepancy || 0).toFixed(2),
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Divergências');

    // Formatar colunas
    ws['!cols'] = [
      { wch: 15 },
      { wch: 20 },
      { wch: 18 },
      { wch: 18 },
      { wch: 15 },
    ];

    XLSX.writeFile(wb, `Relatorio_Divergencias_${new Date().toISOString().split('T')[0]}.xlsx`);
    return { success: true, message: 'Relatório Excel de divergências gerado!' };
  } catch (error) {
    console.error('Erro ao gerar relatório de divergências:', error);
    throw error;
  }
}

/**
 * Gera relatório de Reconciliação com histórico de aprovações
 */
export async function generateReconciliationReport(transfers, approvalHistory) {
  try {
    const data = [
      ['RELATÓRIO DE RECONCILIAÇÃO'],
      [`Data: ${new Date().toLocaleDateString('pt-BR')}`],
      [],
      ['RESUMO DE APROVAÇÕES'],
      ['Transferência ID', 'De', 'Para', 'Valor', 'Status', 'Aprovado Por', 'Data Aprovação'],
      ...(transfers || []).map((t) => [
        t.id.substring(0, 8),
        t.from_drawer?.operator?.name || 'N/A',
        t.to_account?.account_name || 'N/A',
        Number(t.amount || 0).toFixed(2),
        t.status || 'pending',
        t.approved_by || 'Aguardando',
        t.approval_timestamp ? new Date(t.approval_timestamp).toLocaleDateString('pt-BR') : 'N/A',
      ]),
      [],
      ['HISTÓRICO DE AÇÕES'],
      ['Data/Hora', 'Ação', 'Usuário', 'Transferência', 'Detalhes'],
      ...(approvalHistory || []).map((h) => [
        new Date(h.created_at).toLocaleString('pt-BR'),
        h.action,
        h.performed_by || 'Sistema',
        h.transfer_id?.substring(0, 8) || 'N/A',
        h.action_data || '',
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reconciliação');

    ws['!cols'] = [
      { wch: 15 },
      { wch: 20 },
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
      { wch: 20 },
      { wch: 18 },
    ];

    XLSX.writeFile(wb, `Relatorio_Reconciliacao_${new Date().toISOString().split('T')[0]}.xlsx`);
    return { success: true, message: 'Relatório de reconciliação gerado!' };
  } catch (error) {
    console.error('Erro ao gerar relatório de reconciliação:', error);
    throw error;
  }
}

export default {
  generateCaixaIndividualReport,
  generateCaixaGeralReport,
  generateDivergenciesReport,
  generateReconciliationReport,
};
