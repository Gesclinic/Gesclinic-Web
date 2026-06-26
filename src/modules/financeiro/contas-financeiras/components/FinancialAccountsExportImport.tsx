import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Upload, FileText, FileSpreadsheet, Printer, BarChart3 } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useToast } from '@/components/ui/use-toast';
import { AccountType, ACCOUNT_TYPE_LABELS, FinancialAccount } from '../types';

// Estender tipos do jsPDF para incluir autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: any;
  }
}

interface ExportImportProps {
  accounts: FinancialAccount[];
  onImportSuccess?: (accounts: Partial<FinancialAccount>[]) => void;
}

export const FinancialAccountsExportImport: React.FC<ExportImportProps> = ({
  accounts,
  onImportSuccess,
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  // Formatação de moeda
  const formatCurrency = (value: number | null | undefined): string => {
    if (!value && value !== 0) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const normalizeAccountType = (value: unknown): AccountType => {
    const raw = String(value || '').trim().toUpperCase();
    const labelToType = Object.entries(ACCOUNT_TYPE_LABELS).reduce<Record<string, AccountType>>((acc, [type, label]) => {
      acc[label.toUpperCase()] = type as AccountType;
      return acc;
    }, {});

    if (Object.values(AccountType).includes(raw as AccountType)) {
      return raw as AccountType;
    }

    if (labelToType[raw]) {
      return labelToType[raw];
    }

    return AccountType.CHECKING;
  };

  // ========================================
  // EXPORTAR EXCEL
  // ========================================
  const exportToExcel = () => {
    try {
      const data = [
        ['RELATÓRIO DE CONTAS FINANCEIRAS', '', '', '', '', '', '', ''],
        ['Data de Geração', new Date().toLocaleDateString('pt-BR'), '', '', '', '', '', ''],
        ['Total de Contas', accounts.length, '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        [
          'Código',
          'Banco',
          'Conta',
          'Tipo',
          'Agência',
          'Número da Conta',
          'Saldo Atual',
          'Saldo Disponível',
          'Moeda',
          'Status',
          'Padrão',
          'Conciliação',
        ],
        ...accounts.map((acc) => [
          acc.bank_code || '',
          acc.bank_name || '',
          acc.account_name || '',
          acc.account_type || '',
          acc.agency || '',
          acc.account_number || '',
          acc.current_balance || 0,
          acc.available_balance || 0,
          acc.currency || 'BRL',
          acc.is_active ? 'Ativa' : 'Inativa',
          acc.is_default ? 'Sim' : 'Não',
          acc.reconciliation_status || 'Pendente',
        ]),
      ];

      const ws = XLSX.utils.aoa_to_sheet(data);

      // Formatar largura das colunas
      ws['!cols'] = [
        { wch: 10 },
        { wch: 15 },
        { wch: 20 },
        { wch: 15 },
        { wch: 10 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 8 },
        { wch: 10 },
        { wch: 8 },
        { wch: 12 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Contas Financeiras');
      XLSX.writeFile(wb, `Contas_Financeiras_${new Date().toISOString().split('T')[0]}.xlsx`);

      toast({
        title: 'Sucesso',
        description: `${accounts.length} contas exportadas para Excel`,
      });
    } catch (error) {
      console.error('Erro ao exportar Excel:', error);
      toast({
        title: 'Erro ao exportar Excel',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  };

  // ========================================
  // EXPORTAR PDF
  // ========================================
  const exportToPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 20;

      // Cabeçalho
      doc.setFontSize(18);
      doc.setTextColor(25, 118, 210);
      doc.text('RELATÓRIO DE CONTAS FINANCEIRAS', pageWidth / 2, yPosition, { align: 'center' });

      // Informações gerais
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      yPosition += 12;
      doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, yPosition);
      doc.text(`Total de Contas: ${accounts.length}`, 14, yPosition + 6);

      yPosition += 16;

      // Desenhar tabela manualmente
      const headers = ['Código', 'Banco', 'Conta', 'Tipo', 'Agência', 'Nº Conta', 'Saldo Atual', 'Disponível', 'Moeda', 'Status', 'Padrão'];
      const colWidths = [12, 18, 22, 16, 14, 16, 20, 20, 11, 14, 11];
      const rowHeight = 6;
      
      // Cabeçalho da tabela
      doc.setFillColor(25, 118, 210);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');

      let xPos = 14;
      for (let i = 0; i < headers.length; i++) {
        doc.rect(xPos, yPosition, colWidths[i], rowHeight, 'F');
        doc.text(headers[i], xPos + 1, yPosition + 4, { maxWidth: colWidths[i] - 2 });
        xPos += colWidths[i];
      }

      yPosition += rowHeight;

      // Linhas de dados
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);

      accounts.forEach((account, idx) => {
        // Alternating row colors
        if (idx % 2 === 0) {
          doc.setFillColor(245, 245, 245);
          xPos = 14;
          for (let i = 0; i < colWidths.length; i++) {
            doc.rect(xPos, yPosition, colWidths[i], rowHeight, 'F');
            xPos += colWidths[i];
          }
        }

        const rowData = [
          account.bank_code || '—',
          account.bank_name || '—',
          account.account_name || '—',
          account.account_type || '—',
          account.agency || '—',
          account.account_number || '—',
          formatCurrency(account.current_balance),
          formatCurrency(account.available_balance),
          account.currency || 'BRL',
          account.is_active ? '✓ Ativa' : '✗ Inativa',
          account.is_default ? '★' : '—',
        ];

        xPos = 14;
        for (let i = 0; i < rowData.length; i++) {
          doc.text(String(rowData[i]), xPos + 1, yPosition + 4, { maxWidth: colWidths[i] - 2 });
          xPos += colWidths[i];
        }

        yPosition += rowHeight;

        // Verificar se precisa de nova página
        if (yPosition > pageHeight - 20) {
          doc.addPage();
          yPosition = 20;
          
          // Redraw header
          doc.setFillColor(25, 118, 210);
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(9);
          doc.setFont(undefined, 'bold');

          xPos = 14;
          for (let i = 0; i < headers.length; i++) {
            doc.rect(xPos, yPosition, colWidths[i], rowHeight, 'F');
            doc.text(headers[i], xPos + 1, yPosition + 4, { maxWidth: colWidths[i] - 2 });
            xPos += colWidths[i];
          }

          yPosition += rowHeight;
          doc.setTextColor(0, 0, 0);
          doc.setFont(undefined, 'normal');
          doc.setFontSize(8);
        }
      });

      // Linha divisória final
      yPosition += 5;
      doc.setDrawColor(25, 118, 210);
      doc.line(14, yPosition, pageWidth - 14, yPosition);

      // Total
      yPosition += 5;
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text(`Total: ${accounts.length} contas`, 14, yPosition);

      doc.save(`Contas_Financeiras_${new Date().toISOString().split('T')[0]}.pdf`);

      toast({
        title: 'Sucesso',
        description: 'Relatório PDF exportado com sucesso',
      });
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast({
        title: 'Erro ao exportar PDF',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  };

  // ========================================
  // IMPORTAR CSV / XLSX
  // ========================================
  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const importedAccounts: Partial<FinancialAccount>[] = [];

      if (file.name.endsWith('.xlsx')) {
        // Ler arquivo XLSX
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as Array<any[]>;

        // Pular header (primeira linha)
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (!row || row.length === 0) continue;

          const [bank_code, bank_name, account_name, account_type, agency, account_number, currency, is_active, is_default] = row;

          if (!bank_name || !account_name) {
            console.warn('Pulando linha inválida:', row);
            continue;
          }

          importedAccounts.push({
            bank_code: (bank_code ? String(bank_code).trim() : '') || undefined,
            bank_name: String(bank_name).trim(),
            account_name: String(account_name).trim(),
            account_type: normalizeAccountType(account_type),
            agency: (agency ? String(agency).trim() : '') || '',
            account_number: (account_number ? String(account_number).trim() : '') || '',
            current_balance: 0,
            available_balance: 0,
            currency: (currency ? String(currency).trim() : 'BRL') || 'BRL',
            is_active: String(is_active).toLowerCase() === 'sim' || String(is_active).toLowerCase() === 'true' || is_active === true,
            is_default: String(is_default).toLowerCase() === 'sim' || String(is_default).toLowerCase() === 'true' || is_default === true,
          });
        }
      } else {
        // Ler arquivo CSV
        const text = await file.text();
        const lines = text
          .split('\n')
          .filter((line) => line.trim())
          .slice(1); // Pular header

        for (const line of lines) {
          const [
            bank_code,
            bank_name,
            account_name,
            account_type,
            agency,
            account_number,
            currency,
            is_active,
            is_default,
          ] = line.split(',').map((v) => v.trim());

          if (!bank_name || !account_name) {
            console.warn('Pulando linha inválida:', line);
            continue;
          }

          importedAccounts.push({
            bank_code: bank_code || undefined,
            bank_name,
            account_name,
            account_type: normalizeAccountType(account_type),
            agency: agency || '',
            account_number: account_number || '',
            current_balance: 0,
            available_balance: 0,
            currency: currency || 'BRL',
            is_active: is_active?.toLowerCase() === 'sim' || is_active?.toLowerCase() === 'true',
            is_default: is_default?.toLowerCase() === 'sim' || is_default?.toLowerCase() === 'true',
          });
        }
      }

      if (importedAccounts.length === 0) {
        toast({
          title: 'Aviso',
          description: 'Nenhuma conta foi importada. Verifique o formato do arquivo.',
          variant: 'default',
        });
        setImporting(false);
        return;
      }

      if (onImportSuccess) {
        onImportSuccess(importedAccounts);
      }

      toast({
        title: 'Sucesso',
        description: `${importedAccounts.length} contas importadas com sucesso`,
      });

      // Limpar input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Erro ao importar:', error);
      toast({
        title: 'Erro ao importar',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  // ========================================
  // IMPRIMIR
  // ========================================
  const handlePrint = () => {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast({
          title: 'Erro',
          description: 'Não foi possível abrir a janela de impressão',
          variant: 'destructive',
        });
        return;
      }

      const html = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Contas Financeiras</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 100%; padding: 40px 20px; }
            h1 { text-align: center; color: #1976d2; margin-bottom: 10px; font-size: 24px; }
            .info { text-align: center; color: #666; margin-bottom: 20px; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #1976d2; color: white; padding: 10px; text-align: left; font-weight: bold; font-size: 12px; }
            td { padding: 8px 10px; border-bottom: 1px solid #ddd; font-size: 11px; }
            tr:nth-child(even) { background-color: #f5f5f5; }
            tr:hover { background-color: #efefef; }
            .total { text-align: right; font-weight: bold; margin-top: 20px; padding-top: 10px; border-top: 2px solid #1976d2; }
            .right { text-align: right; }
            .center { text-align: center; }
            @media print {
              body { margin: 0; padding: 0; }
              .container { padding: 10mm; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>RELATÓRIO DE CONTAS FINANCEIRAS</h1>
            <div class="info">
              <p>Data: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
              <p>Total de Contas: ${accounts.length}</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Banco</th>
                  <th>Conta</th>
                  <th>Tipo</th>
                  <th>Agência</th>
                  <th>Nº Conta</th>
                  <th class="right">Saldo Atual</th>
                  <th class="right">Disponível</th>
                  <th class="center">Moeda</th>
                  <th class="center">Status</th>
                  <th class="center">Padrão</th>
                </tr>
              </thead>
              <tbody>
                ${accounts.map((acc) => `
                  <tr>
                    <td>${acc.bank_code || '—'}</td>
                    <td>${acc.bank_name || '—'}</td>
                    <td>${acc.account_name || '—'}</td>
                    <td>${acc.account_type || '—'}</td>
                    <td>${acc.agency || '—'}</td>
                    <td>${acc.account_number || '—'}</td>
                    <td class="right">${formatCurrency(acc.current_balance)}</td>
                    <td class="right">${formatCurrency(acc.available_balance)}</td>
                    <td class="center">${acc.currency || 'BRL'}</td>
                    <td class="center">${acc.is_active ? '<span style="color: green;">✓ Ativa</span>' : '<span style="color: red;">✗ Inativa</span>'}</td>
                    <td class="center">${acc.is_default ? '★' : '—'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="total">Total de Contas: ${accounts.length}</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => window.close(), 1000);
            };
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();

      toast({
        title: 'Sucesso',
        description: 'Janela de impressão aberta',
      });
    } catch (error) {
      console.error('Erro ao imprimir:', error);
      toast({
        title: 'Erro ao imprimir',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  };

  // ========================================
  // GERAR RELATÓRIO DETALHADO
  // ========================================
  const generateDetailedReport = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 20;

      // Cabeçalho
      doc.setFontSize(20);
      doc.setTextColor(25, 118, 210);
      doc.text('RELATÓRIO DETALHADO', pageWidth / 2, yPosition, { align: 'center' });
      doc.text('CONTAS FINANCEIRAS', pageWidth / 2, yPosition + 8, { align: 'center' });

      yPosition += 22;

      // Info geral
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, yPosition);
      doc.text(`Hora: ${new Date().toLocaleTimeString('pt-BR')}`, 14, yPosition + 6);
      doc.text(`Total de Contas: ${accounts.length}`, 14, yPosition + 12);

      yPosition += 22;

      // Resumo de Saldos
      const totalCurrentBalance = accounts.reduce((sum, acc) => sum + (acc.current_balance || 0), 0);
      const totalAvailableBalance = accounts.reduce((sum, acc) => sum + (acc.available_balance || 0), 0);
      const activeCount = accounts.filter(acc => acc.is_active).length;
      const inactiveCount = accounts.length - activeCount;

      doc.setFontSize(11);
      doc.setTextColor(25, 118, 210);
      doc.setFont(undefined, 'bold');
      doc.text('RESUMO EXECUTIVO', 14, yPosition);

      yPosition += 8;
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');

      const summaryData = [
        [`Saldo Total (Atual)`, formatCurrency(totalCurrentBalance)],
        [`Saldo Total (Disponível)`, formatCurrency(totalAvailableBalance)],
        [`Contas Ativas`, `${activeCount}`],
        [`Contas Inativas`, `${inactiveCount}`],
      ];

      summaryData.forEach((item, index) => {
        doc.text(`${item[0]}: `, 14, yPosition + (index * 6));
        doc.text(item[1], 100, yPosition + (index * 6));
      });

      yPosition += summaryData.length * 6 + 12;

      // Detalhamento de Contas
      if (accounts.length > 0) {
        doc.setFontSize(11);
        doc.setTextColor(25, 118, 210);
        doc.setFont(undefined, 'bold');
        doc.text('DETALHAMENTO DAS CONTAS', 14, yPosition);
        yPosition += 10;

        // Tabela de detalhe (versão compacta para portrait)
        const headers = ['Código', 'Banco', 'Conta', 'Saldo Atual', 'Status'];
        const colWidths = [15, 30, 50, 30, 25];
        const rowHeight = 5;

        // Cabeçalho
        doc.setFillColor(25, 118, 210);
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');

        let xPos = 14;
        for (let i = 0; i < headers.length; i++) {
          doc.rect(xPos, yPosition, colWidths[i], rowHeight, 'F');
          doc.text(headers[i], xPos + 1, yPosition + 3.5, { maxWidth: colWidths[i] - 2 });
          xPos += colWidths[i];
        }

        yPosition += rowHeight;

        // Dados
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(8);

        accounts.forEach((account, idx) => {
          // Alternating row colors
          if (idx % 2 === 0) {
            doc.setFillColor(245, 245, 245);
            xPos = 14;
            for (let i = 0; i < colWidths.length; i++) {
              doc.rect(xPos, yPosition, colWidths[i], rowHeight, 'F');
              xPos += colWidths[i];
            }
          }

          const rowData = [
            account.bank_code || '—',
            account.bank_name || '—',
            account.account_name || '—',
            formatCurrency(account.current_balance),
            account.is_active ? '✓ Ativa' : '✗ Inativa',
          ];

          xPos = 14;
          for (let i = 0; i < rowData.length; i++) {
            doc.text(String(rowData[i]), xPos + 1, yPosition + 3.5, { maxWidth: colWidths[i] - 2 });
            xPos += colWidths[i];
          }

          yPosition += rowHeight;

          // Verificar se precisa de nova página
          if (yPosition > pageHeight - 15) {
            doc.addPage();
            yPosition = 20;

            // Redraw header
            doc.setFillColor(25, 118, 210);
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(9);
            doc.setFont(undefined, 'bold');

            xPos = 14;
            for (let i = 0; i < headers.length; i++) {
              doc.rect(xPos, yPosition, colWidths[i], rowHeight, 'F');
              doc.text(headers[i], xPos + 1, yPosition + 3.5, { maxWidth: colWidths[i] - 2 });
              xPos += colWidths[i];
            }

            yPosition += rowHeight;
            doc.setTextColor(0, 0, 0);
            doc.setFont(undefined, 'normal');
            doc.setFontSize(8);
          }
        });
      }

      doc.save(`Relatorio_Contas_Financeiras_${new Date().toISOString().split('T')[0]}.pdf`);

      toast({
        title: 'Sucesso',
        description: 'Relatório detalhado gerado com sucesso',
      });
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast({
        title: 'Erro ao gerar relatório',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  };

  // ========================================
  // DOWNLOAD MODELO CSV / TEMPLATE
  // ========================================
  const downloadCSVTemplate = () => {
    try {
      // Criar template usando XLSX para melhor compatibilidade
      const templateData = [
        ['Codigo', 'Banco', 'Conta', 'Tipo', 'Agencia', 'Numero', 'Moeda', 'Ativo', 'Padrao'],
        ['001', 'Banco do Brasil', 'Conta Principal', 'CHECKING', '0001', '123456789', 'BRL', 'Sim', 'Sim'],
        ['033', 'Itau', 'Conta Aplicacao', 'SAVINGS', '0002', '987654321', 'BRL', 'Sim', 'Nao'],
      ];

      const ws = XLSX.utils.aoa_to_sheet(templateData);
      
      // Formatar largura das colunas
      ws['!cols'] = [
        { wch: 10 },  // Codigo
        { wch: 20 },  // Banco
        { wch: 25 },  // Conta
        { wch: 18 },  // Tipo
        { wch: 12 },  // Agencia
        { wch: 15 },  // Numero
        { wch: 10 },  // Moeda
        { wch: 10 },  // Ativo
        { wch: 10 },  // Padrao
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Template');
      
      XLSX.writeFile(wb, 'template_contas_financeiras.xlsx');

      toast({
        title: 'Sucesso',
        description: 'Template baixado',
      });
    } catch (error) {
      console.error('Erro ao gerar template:', error);
      toast({
        title: 'Erro ao gerar template',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex gap-3 items-center flex-wrap">
      {/* EXPORTAR EXCEL */}
      <Button
        onClick={exportToExcel}
        variant="outline"
        size="sm"
        className="gap-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
        disabled={accounts.length === 0}
      >
        <FileSpreadsheet className="w-4 h-4" />
        Exportar Excel
      </Button>

      {/* EXPORTAR PDF */}
      <Button
        onClick={exportToPDF}
        variant="outline"
        size="sm"
        className="gap-2 text-red-700 border-red-200 hover:bg-red-50"
        disabled={accounts.length === 0}
      >
        <FileText className="w-4 h-4" />
        Exportar PDF
      </Button>

      {/* IMPORTAR CSV */}
      <div className="relative">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx"
          onChange={handleImportCSV}
          disabled={importing}
          aria-label="Importar contas financeiras"
          title="Importar contas financeiras"
          className="hidden"
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
          size="sm"
          className="gap-2 text-blue-700 border-blue-200 hover:bg-blue-50"
          disabled={importing}
        >
          <Upload className="w-4 h-4" />
          {importing ? 'Importando...' : 'Importar'}
        </Button>
      </div>

      {/* DOWNLOAD TEMPLATE */}
      <Button
        onClick={downloadCSVTemplate}
        variant="ghost"
        size="sm"
        className="gap-2 text-gray-600"
      >
        <Download className="w-4 h-4" />
        Template
      </Button>

      {/* IMPRIMIR */}
      <Button
        onClick={handlePrint}
        variant="outline"
        size="sm"
        className="gap-2 text-purple-700 border-purple-200 hover:bg-purple-50"
        disabled={accounts.length === 0}
      >
        <Printer className="w-4 h-4" />
        Imprimir
      </Button>

      {/* RELATÓRIO DETALHADO */}
      <Button
        onClick={generateDetailedReport}
        variant="outline"
        size="sm"
        className="gap-2 text-orange-700 border-orange-200 hover:bg-orange-50"
        disabled={accounts.length === 0}
      >
        <BarChart3 className="w-4 h-4" />
        Relatório
      </Button>
    </div>
  );
};

export default FinancialAccountsExportImport;
