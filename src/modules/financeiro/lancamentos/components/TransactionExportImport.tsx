import React, { useRef } from 'react';
import {
  Download,
  Upload,
  FileDown,
  Printer,
  BarChart3,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { FinancialTransaction, TransactionStatus, TRANSACTION_STATUS_LABELS } from '../types';

interface TransactionExportImportProps {
  transactions: FinancialTransaction[];
  onImport?: (data: any[]) => void;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
};

const formatDate = (dateString: string | Date | null): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR');
};

export function TransactionExportImport({
  transactions,
  onImport,
}: TransactionExportImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ============================================
  // EXPORT TO EXCEL
  // ============================================
  const exportToExcel = () => {
    const data = [
      [
        'DATA',
        'DESCRIÇÃO',
        'TIPO DE TRANSAÇÃO',
        'TIPO DE MOVIMENTO',
        'VALOR',
        'STATUS',
        'OBSERVAÇÕES',
      ],
      ...transactions.map((t) => [
        formatDate(t.transaction_date),
        t.description,
        t.transaction_type === 'INCOME' ? 'RECEITA' : t.transaction_type === 'EXPENSE' ? 'DESPESA' : t.transaction_type === 'TRANSFER' ? 'TRANSFERÊNCIA' : t.transaction_type === 'REVERSAL' ? 'REVERSÃO' : t.transaction_type === 'FEE' ? 'TAXA' : 'AJUSTE',
        t.movement_type === 'REALIZED' ? 'REALIZADO' : 'PREVISTO',
        t.amount,
        t.status === 'PENDING' ? 'PENDENTE' : t.status === 'PAID' ? 'PAGO' : t.status === 'CANCELED' ? 'CANCELADO' : 'PARCIAL',
        t.notes || '',
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // Ajustar largura das colunas - mesma do template
    ws['!cols'] = [
      { wch: 15 },
      { wch: 30 },
      { wch: 20 },
      { wch: 18 },
      { wch: 12 },
      { wch: 12 },
      { wch: 40 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lançamentos');
    XLSX.writeFile(wb, `Lancamentos_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // ============================================
  // EXPORT TO PDF
  // ============================================
  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text('LANÇAMENTOS FINANCEIROS', 14, 15);

    doc.setFontSize(10);
    doc.text(`Data de Geração: ${new Date().toLocaleDateString('pt-BR')}`, 14, 25);
    doc.text(`Total de Lançamentos: ${transactions.length}`, 14, 32);

    // Tabela de Lançamentos
    if (transactions.length > 0) {
      const tableData = transactions.map((t) => [
        formatDate(t.transaction_date),
        t.description,
        t.transaction_type === 'INCOME' ? 'RECEITA' : t.transaction_type === 'EXPENSE' ? 'DESPESA' : t.transaction_type === 'TRANSFER' ? 'TRANSFERÊNCIA' : t.transaction_type === 'REVERSAL' ? 'REVERSÃO' : t.transaction_type === 'FEE' ? 'TAXA' : 'AJUSTE',
        t.movement_type === 'REALIZED' ? 'REALIZADO' : 'PREVISTO',
        formatCurrency(t.amount),
        t.status === 'PENDING' ? 'PENDENTE' : t.status === 'PAID' ? 'PAGO' : t.status === 'CANCELED' ? 'CANCELADO' : 'PARCIAL',
        t.notes || '',
      ]);

      (doc as any).autoTable({
        head: [
          ['DATA', 'DESCRIÇÃO', 'TIPO DE TRANSAÇÃO', 'TIPO DE MOVIMENTO', 'VALOR', 'STATUS', 'OBSERVAÇÕES'],
        ],
        body: tableData,
        startY: 40,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [66, 133, 244], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: {
          4: { halign: 'right' }, // Valor alinhado à direita
        },
      });
    }

    doc.save(`Lancamentos_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // ============================================
  // DOWNLOAD TEMPLATE
  // ============================================
  const downloadTemplate = () => {
    const templateData = [
      ['DATA', 'DESCRIÇÃO', 'TIPO DE TRANSAÇÃO', 'TIPO DE MOVIMENTO', 'VALOR', 'STATUS', 'OBSERVAÇÕES'],
      ['2026-05-13', 'Receita de Consultas - Maio', 'RECEITA', 'REALIZADO', '5000.00', 'PAGO', 'Consultas realizadas de 01 a 13 de maio'],
      ['2026-05-14', 'Compra de Materiais Clínicos', 'DESPESA', 'REALIZADO', '1200.50', 'PENDENTE', 'Seringas, gazes e desinfetantes'],
      ['2026-05-15', 'Aluguel do Consultório', 'DESPESA', 'REALIZADO', '3500.00', 'PAGO', 'Aluguel - Sala 101, Bloco A'],
      ['2026-05-20', 'Serviço de Limpeza', 'DESPESA', 'REALIZADO', '450.00', 'PENDENTE', 'Higienização de salas'],
      ['2026-05-25', 'Receita de Procedimentos', 'RECEITA', 'PREVISTO', '2500.00', 'PENDENTE', 'Procedimentos agendados para fim de maio'],
      ['2026-05-28', 'Transferência Bancária', 'TRANSFERÊNCIA', 'REALIZADO', '10000.00', 'PAGO', 'Transferência entre contas'],
      ['2026-05-30', 'Taxa Bancária', 'TAXA', 'REALIZADO', '25.00', 'PAGO', 'Taxa de manutenção'],
      ['2026-05-31', 'Ajuste de Arredondamento', 'AJUSTE', 'REALIZADO', '0.50', 'PAGO', 'Ajuste contábil'],
      ['', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    ws['!cols'] = [
      { wch: 15 },
      { wch: 30 },
      { wch: 20 },
      { wch: 18 },
      { wch: 12 },
      { wch: 12 },
      { wch: 40 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lançamentos');
    XLSX.writeFile(wb, 'Template_Lancamentos.xlsx');
  };

  // ============================================
  // HANDLE IMPORT
  // ============================================
  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      // Skip header row
      const importedData = jsonData.slice(1).filter((row) => row.length > 0);

      if (onImport) {
        onImport(importedData);
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Erro ao importar arquivo:', error);
      alert('Erro ao processar o arquivo. Verifique se é um Excel válido.');
    }
  };

  // ============================================
  // HANDLE PRINT
  // ============================================
  const handlePrint = () => {
    window.print();
  };

  // ============================================
  // GENERATE REPORT (Summary with Charts)
  // ============================================
  const generateReport = () => {
    const doc = new jsPDF({ orientation: 'portrait' });
    
    // Titulo
    doc.setFontSize(18);
    doc.text('RELATÓRIO EXECUTIVO - LANÇAMENTOS FINANCEIROS', 14, 15);
    
    doc.setFontSize(10);
    doc.text(`Período: ${new Date().toLocaleDateString('pt-BR')}`, 14, 25);

    // Resumo por Tipo
    const typesSummary = {
      INCOME: 0,
      EXPENSE: 0,
      TRANSFER: 0,
      REVERSAL: 0,
      FEE: 0,
      ADJUSTMENT: 0,
    };

    const movementSummary = {
      REALIZED: 0,
      PREDICTED: 0,
    };

    transactions.forEach((t) => {
      typesSummary[t.transaction_type as keyof typeof typesSummary] += t.amount || 0;
      movementSummary[t.movement_type as keyof typeof movementSummary] += t.amount || 0;
    });

    // Seção 1: Resumo Geral
    doc.setFontSize(12);
    doc.text('1. RESUMO GERAL', 14, 40);
    doc.setFontSize(10);
    doc.text(`Total de Lançamentos: ${transactions.length}`, 14, 48);
    doc.text(`Total Realizado: ${formatCurrency(movementSummary.REALIZED)}`, 14, 55);
    doc.text(`Total Previsto: ${formatCurrency(movementSummary.PREDICTED)}`, 14, 62);

    // Seção 2: Por Tipo de Transação
    doc.setFontSize(12);
    doc.text('2. RESUMO POR TIPO DE TRANSAÇÃO', 14, 75);
    doc.setFontSize(10);
    let yPos = 82;
    Object.entries(typesSummary).forEach(([type, amount]) => {
      if (amount !== 0) {
        doc.text(`${type}: ${formatCurrency(amount)}`, 14, yPos);
        yPos += 7;
      }
    });

    // Seção 3: Por Status
    doc.setFontSize(12);
    doc.text('3. RESUMO POR STATUS', 14, yPos + 10);
    doc.setFontSize(10);
    yPos += 17;

    const statusSummary = {
      PENDING: 0,
      PAID: 0,
      CANCELED: 0,
      PARTIAL: 0,
    };

    transactions.forEach((t) => {
      statusSummary[t.status as keyof typeof statusSummary] += t.amount || 0;
    });

    Object.entries(statusSummary).forEach(([status, amount]) => {
      if (amount !== 0) {
        doc.text(
          `${TRANSACTION_STATUS_LABELS[status as TransactionStatus] || status}: ${formatCurrency(amount)}`,
          14,
          yPos,
        );
        yPos += 7;
      }
    });

    doc.save(`Relatorio_Lancamentos_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="flex gap-2 flex-wrap">
      {/* Exportar Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            Exportar
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Exportar como</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={exportToExcel}>
            <FileDown className="w-4 h-4 mr-2" />
            Exportar Excel
          </DropdownMenuItem>
          <DropdownMenuItem onClick={exportToPDF}>
            <FileText className="w-4 h-4 mr-2" />
            Exportar PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Importar */}
      <Button variant="outline" size="sm" className="gap-2" onClick={() => fileInputRef.current?.click()}>
        <Upload className="w-4 h-4" />
        Importar
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileImport}
        className="hidden"
      />

      {/* Template */}
      <Button variant="outline" size="sm" className="gap-2" onClick={downloadTemplate}>
        <FileDown className="w-4 h-4" />
        Template
      </Button>

      {/* Imprimir */}
      <Button variant="outline" size="sm" className="gap-2" onClick={handlePrint}>
        <Printer className="w-4 h-4" />
        Imprimir
      </Button>

      {/* Relatório */}
      <Button variant="outline" size="sm" className="gap-2" onClick={generateReport}>
        <BarChart3 className="w-4 h-4" />
        Relatório
      </Button>
    </div>
  );
}
