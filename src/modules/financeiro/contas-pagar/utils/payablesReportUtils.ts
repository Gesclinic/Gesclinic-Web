/**
 * Utilitários para Relatórios Avançados de Contas a Pagar
 * Com totalizações, agrupamentos, formatação visual e gráficos
 */

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Payable } from '../types';

interface PayablesReportConfig {
  title?: string;
  clinic?: any;
  payables: Payable[];
  groupBy?: 'status' | 'supplier' | 'category' | 'none';
  includeCharts?: boolean;
  format: 'excel' | 'pdf' | 'csv';
}

interface GroupedPayables {
  [key: string]: Payable[];
}

function sanitizeFileName(name: string): string {
  return String(name || 'relatorio')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '_');
}

function triggerBrowserDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Delay revoke to avoid canceling downloads in embedded browsers/webviews.
  setTimeout(() => URL.revokeObjectURL(url), 15000);
}

function openPdfPreviewOrDownload(blob: Blob, fileName: string): void {
  const previewUrl = URL.createObjectURL(blob);
  const popup = window.open(previewUrl, '_blank', 'noopener,noreferrer');

  if (!popup) {
    URL.revokeObjectURL(previewUrl);
    triggerBrowserDownload(blob, fileName);
    return;
  }

  // Keep URL alive while the preview tab loads.
  setTimeout(() => URL.revokeObjectURL(previewUrl), 30000);
}

/**
 * Agrupar contas a pagar por campo
 */
export function groupPayables(payables: Payable[], groupBy: 'status' | 'supplier' | 'category' | 'none' = 'status'): GroupedPayables {
  if (groupBy === 'none') {
    return { 'Todas as contas': payables };
  }

  const grouped: GroupedPayables = {};

  payables.forEach((payable) => {
    let key = '';

    if (groupBy === 'status') {
      key = payable.status || 'Sem Status';
    } else if (groupBy === 'supplier') {
      key = payable.supplier_name || 'Fornecedor Desconhecido';
    } else if (groupBy === 'category') {
      key = payable.category || 'Sem Categoria';
    }

    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(payable);
  });

  return grouped;
}

/**
 * Calcular totalizações por grupo
 */
export function calculateGroupTotals(grouped: GroupedPayables) {
  const totals: Record<string, { amount: number; count: number; overdue: number }> = {};

  Object.entries(grouped).forEach(([key, payables]) => {
    const amount = payables.reduce((sum, p) => sum + Number(p.net_amount || p.amount || 0), 0);
    const count = payables.length;
    const overdue = payables.filter((p) => {
      const dueDate = new Date(p.due_date);
      return dueDate < new Date() && ['OPEN', 'open', 'aberto', 'PARTIAL', 'partial', 'parcial'].includes(p.status);
    }).length;

    totals[key] = { amount, count, overdue };
  });

  return totals;
}

/**
 * Exportar para Excel com formatação avançada
 */
export function exportPayablesToExcel(config: PayablesReportConfig): void {
  const { payables, title = 'Relatório de Contas a Pagar', clinic, groupBy = 'status' } = config;

  const grouped = groupPayables(payables, groupBy);
  const totals = calculateGroupTotals(grouped);

  // Criar workbook
  const wb = XLSX.utils.book_new();

  // ====== SHEET 1: RESUMO EXECUTIVO ======
  const summaryData: (string | number)[][] = [
    ['RESUMO EXECUTIVO - CONTAS A PAGAR'],
    [],
    ['Data do Relatório', new Date().toLocaleDateString('pt-BR')],
    ['Clínica', clinic?.brand_name || 'Não informada'],
    [],
    ['INDICADORES GERAIS'],
    ['Total de Contas', payables.length],
    ['Total em Aberto', `R$ ${payables.reduce((sum, p) => sum + Number(p.net_amount || p.amount || 0), 0).toFixed(2)}`],
    ['Total Vencido', `R$ ${payables
      .filter((p) => new Date(p.due_date) < new Date() && ['OPEN', 'open', 'aberto', 'PARTIAL', 'partial', 'parcial'].includes(p.status))
      .reduce((sum, p) => sum + Number(p.net_amount || p.amount || 0), 0)
      .toFixed(2)}`],
    [],
    ['RESUMO POR ' + groupBy.toUpperCase()],
  ];

  // Adicionar resumo por grupo
  Object.entries(totals).forEach(([group, stats]) => {
    summaryData.push([
      group,
      stats.count,
      `R$ ${stats.amount.toFixed(2)}`,
      stats.overdue,
    ]);
  });

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [
    { wch: 30 },
    { wch: 15 },
    { wch: 20 },
    { wch: 15 },
  ];

  // Estilos para resumo
  summarySheet['A1'].s = {
    font: { bold: true, size: 14, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '1F4E78' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };

  XLSX.utils.book_append_sheet(wb, summarySheet, 'Resumo');

  // ====== SHEET 2: DETALHADO POR GRUPO ======
  let detailStartRow = 0;
  const detailSheet = XLSX.utils.aoa_to_sheet([]);
  detailSheet['!cols'] = [
    { wch: 12 }, // Vencimento
    { wch: 25 }, // Fornecedor
    { wch: 35 }, // Descrição
    { wch: 15 }, // Documento
    { wch: 15 }, // Categoria
    { wch: 15 }, // Valor
    { wch: 12 }, // Desconto
    { wch: 15 }, // Saldo
    { wch: 12 }, // Status
  ];

  Object.entries(grouped).forEach(([group, groupPayables], groupIndex) => {
    const groupStats = totals[group];

    // Cabeçalho do grupo
    detailSheet[`A${detailStartRow + 1}`] = {
      v: group,
      s: {
        font: { bold: true, size: 12, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '4472C4' } },
        alignment: { horizontal: 'left', vertical: 'center' },
      },
    };

    // Merge cells para header
    if (!detailSheet['!merges']) detailSheet['!merges'] = [];
    detailSheet['!merges'].push({ s: { r: detailStartRow, c: 0 }, e: { r: detailStartRow, c: 8 } });

    detailStartRow += 1;

    // Estatísticas do grupo
    const statsRow = `Qtd: ${groupStats.count} | Total: R$ ${groupStats.amount.toFixed(2)} | Vencidos: ${groupStats.overdue}`;
    detailSheet[`A${detailStartRow + 1}`] = {
      v: statsRow,
      s: { font: { italic: true, size: 9 }, fill: { fgColor: { rgb: 'E7E6E6' } } },
    };
    detailStartRow += 1;

    // Cabeçalho das colunas
    const headerRow = ['Vencimento', 'Fornecedor', 'Descrição', 'Documento', 'Categoria', 'Valor', 'Desconto', 'Saldo', 'Status'];
    const headerCells = headerRow.map((header) => ({
      v: header,
      s: {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '70AD47' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      },
    }));

    headerCells.forEach((cell, colIndex) => {
      const cellAddress = XLSX.utils.encode_col(colIndex) + (detailStartRow + 1);
      detailSheet[cellAddress] = cell;
    });

    detailStartRow += 1;

    // Dados de cada conta
    groupPayables.forEach((payable) => {
      const dueDate = new Date(payable.due_date);
      const isOverdue = dueDate < new Date() && ['OPEN', 'open', 'aberto', 'PARTIAL', 'partial', 'parcial'].includes(payable.status);

      const rowData = [
        payable.due_date ? new Date(payable.due_date).toLocaleDateString('pt-BR') : '',
        payable.supplier_name || '',
        payable.description || '',
        payable.document_number || '',
        payable.category || '',
        Number(payable.net_amount || payable.amount || 0),
        Number(payable.discount_amount || 0),
        Number((payable.net_amount || payable.amount || 0) - (payable.paid_value || 0)),
        payable.status || '',
      ];

      rowData.forEach((value, colIndex) => {
        const cellAddress = XLSX.utils.encode_col(colIndex) + (detailStartRow + 1);
        let cellStyle: any = {
          alignment: { horizontal: colIndex >= 5 ? 'right' : 'left', vertical: 'center' },
        };

        // Formatação de valores monetários
        if ([5, 6, 7].includes(colIndex) && typeof value === 'number') {
          cellStyle.numFmt = '_("R$"* #,##0.00_);_("R$"* (#,##0.00);_("R$"* "-"??_);_(@_)';
          if (isOverdue && colIndex === 7) {
            cellStyle.fill = { fgColor: { rgb: 'FFE699' } }; // Destaque amarelo para vencidos
          }
        }

        detailSheet[cellAddress] = { v: value, s: cellStyle };
      });

      detailStartRow += 1;
    });

    // Linha em branco entre grupos
    detailStartRow += 1;
  });

  XLSX.utils.book_append_sheet(wb, detailSheet, 'Detalhado');

  // ====== SHEET 3: ANÁLISE POR STATUS ======
  const statusData: (string | number)[][] = [
    ['ANÁLISE POR STATUS'],
    [],
    ['Status', 'Quantidade', 'Valor Total', 'Valor Médio', '% do Total'],
  ];

  const statusGroups = groupPayables(payables, 'status');
  const totalAmount = payables.reduce((sum, p) => sum + Number(p.net_amount || p.amount || 0), 0);

  Object.entries(statusGroups).forEach(([status, items]) => {
    const statusTotal = items.reduce((sum, p) => sum + Number(p.net_amount || p.amount || 0), 0);
    const avgValue = statusTotal / items.length;
    const percentage = (statusTotal / totalAmount) * 100;

    statusData.push([status, items.length, statusTotal, avgValue, percentage]);
  });

  const statusSheet = XLSX.utils.aoa_to_sheet(statusData);
  statusSheet['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 15 }];

  statusSheet['A1'].s = {
    font: { bold: true, size: 12, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '1F4E78' } },
  };

  XLSX.utils.book_append_sheet(wb, statusSheet, 'Por Status');

  // Download
  const fileName = `${sanitizeFileName(title)}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`;
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  triggerBrowserDownload(blob, fileName);
}

/**
 * Exportar para PDF com formatação e gráficos
 */
export function exportPayablesToPdf(config: PayablesReportConfig): void {
  const { payables, title = 'Relatório de Contas a Pagar', clinic, groupBy = 'status' } = config;

  const grouped = groupPayables(payables, groupBy);
  const totals = calculateGroupTotals(grouped);

  const doc = new jsPDF({ orientation: 'landscape' });

  // Título
  doc.setFontSize(16);
  doc.text(title, 14, 20);

  // Informações da clínica
  doc.setFontSize(9);
  if (clinic) {
    doc.text(`Clínica: ${clinic.brand_name || 'Não informada'}`, 14, 28);
  }
  doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 34);

  // Resumo executivo
  const summaryTable: string[][] = [
    ['INDICADOR', 'VALOR'],
    ['Total de Contas', String(payables.length)],
    ['Total em Aberto', `R$ ${payables.reduce((sum, p) => sum + Number(p.net_amount || p.amount || 0), 0).toFixed(2)}`],
    ['Total Vencido', `R$ ${payables
      .filter((p) => new Date(p.due_date) < new Date() && ['OPEN', 'open', 'aberto', 'PARTIAL', 'partial', 'parcial'].includes(p.status))
      .reduce((sum, p) => sum + Number(p.net_amount || p.amount || 0), 0)
      .toFixed(2)}`],
  ];

  autoTable(doc, {
    head: summaryTable.slice(0, 1),
    body: summaryTable.slice(1),
    startY: 42,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [75, 85, 99], textColor: [255, 255, 255] },
  });

  // Tabela de detalhes por grupo
  let currentY = (doc as any).lastAutoTable.finalY + 10;

  Object.entries(grouped).forEach(([group, groupPayables]) => {
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }

    // Cabeçalho do grupo
    doc.setFontSize(10);
    doc.setTextColor(68, 114, 196);
    doc.text(`${group} (${groupPayables.length} contas)`, 14, currentY);

    currentY += 8;

    // Tabela do grupo
    const groupTableData: string[][] = [
      ['Vencimento', 'Fornecedor', 'Descrição', 'Valor', 'Saldo', 'Status'],
      ...groupPayables.map((p) => [
        p.due_date ? new Date(p.due_date).toLocaleDateString('pt-BR') : '',
        p.supplier_name || '',
        (p.description || '').substring(0, 30),
        `R$ ${Number(p.net_amount || p.amount || 0).toFixed(2)}`,
        `R$ ${(Number(p.net_amount || p.amount || 0) - Number(p.paid_value || 0)).toFixed(2)}`,
        p.status || '',
      ]),
    ];

    autoTable(doc, {
      head: [groupTableData[0]],
      body: groupTableData.slice(1),
      startY: currentY,
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [112, 173, 71], textColor: [255, 255, 255] },
      margin: { left: 14, right: 14 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 5;
  });

  const fileName = `${sanitizeFileName(title)}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`;
  const pdfBlob = doc.output('blob');
  openPdfPreviewOrDownload(pdfBlob, fileName);
}

/**
 * Exportar para CSV
 */
export function exportPayablesToCsv(config: PayablesReportConfig): void {
  const { payables, title = 'Contas a Pagar' } = config;

  const headers = ['Vencimento', 'Fornecedor', 'Descrição', 'Documento', 'Categoria', 'Valor', 'Desconto', 'Saldo', 'Status'];
  const rows = payables.map((p) => [
    p.due_date ? new Date(p.due_date).toLocaleDateString('pt-BR') : '',
    p.supplier_name || '',
    p.description || '',
    p.document_number || '',
    p.category || '',
    Number(p.net_amount || p.amount || 0),
    Number(p.discount_amount || 0),
    Number((p.net_amount || p.amount || 0) - (p.paid_value || 0)),
    p.status || '',
  ]);

  const csv = [
    headers,
    ...rows.map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(';')),
  ]
    .join('\n');

  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const fileName = `${sanitizeFileName(title)}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.csv`;
  triggerBrowserDownload(blob, fileName);
}

/**
 * Função principal para exportar
 */
export function generatePayablesReport(config: PayablesReportConfig): void {
  try {
    switch (config.format) {
      case 'excel':
        exportPayablesToExcel(config);
        break;
      case 'pdf':
        exportPayablesToPdf(config);
        break;
      case 'csv':
        exportPayablesToCsv(config);
        break;
      default:
        console.error('Formato desconhecido:', config.format);
    }
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    throw error;
  }
}
