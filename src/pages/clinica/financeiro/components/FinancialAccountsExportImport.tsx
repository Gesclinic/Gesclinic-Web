import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Upload, FileText, FileSpreadsheet } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useToast } from '@/components/ui/use-toast';

interface FinancialAccount {
  id: string;
  bank_name: string;
  account_name: string;
  account_type: string;
  account_number: string;
  agency: string;
  current_balance: number;
  available_balance: number;
  currency: string;
  is_active: boolean;
  is_default: boolean;
  reconciliation_status?: string;
}

interface ExportImportProps {
  accounts: FinancialAccount[];
  onImportSuccess?: (accounts: FinancialAccount[]) => void;
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

  // ========================================
  // EXPORTAR EXCEL
  // ========================================
  const exportToExcel = () => {
    try {
      const data = [
        ['RELATÓRIO DE CONTAS FINANCEIRAS', '', '', '', '', '', ''],
        ['Data de Geração', new Date().toLocaleDateString('pt-BR'), '', '', '', '', ''],
        ['Total de Contas', accounts.length, '', '', '', '', ''],
        ['', '', '', '', '', '', ''],
        [
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

      doc.setFontSize(16);
      doc.text('RELATÓRIO DE CONTAS FINANCEIRAS', 14, 15);

      doc.setFontSize(10);
      doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 25);
      doc.text(`Total de Contas: ${accounts.length}`, 14, 30);

      // Tabela de dados
      const tableData = accounts.map((acc) => [
        acc.bank_name || '—',
        acc.account_name || '—',
        acc.account_type || '—',
        acc.agency || '—',
        acc.account_number || '—',
        formatCurrency(acc.current_balance),
        formatCurrency(acc.available_balance),
        acc.currency || 'BRL',
        acc.is_active ? '✓ Ativa' : '✗ Inativa',
        acc.is_default ? '★' : '—',
        acc.reconciliation_status || 'Pendente',
      ]);

      (doc as any).autoTable({
        head: [
          [
            'Banco',
            'Conta',
            'Tipo',
            'Agência',
            'Nº Conta',
            'Saldo Atual',
            'Saldo Disponível',
            'Moeda',
            'Status',
            'Padrão',
            'Conciliação',
          ],
        ],
        body: tableData,
        startY: 38,
        margin: { top: 10, right: 10, left: 10, bottom: 10 },
        didDrawPage: (data: any) => {
          const page = data.pageCount;
          const pageHeight = doc.internal.pageSize.getHeight();
          doc.setFontSize(9);
          doc.text(`Página ${page}`, doc.internal.pageSize.getWidth() / 2, pageHeight - 10, {
            align: 'center',
          });
        },
        styles: {
          fontSize: 9,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [242, 242, 242],
        },
      });

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
  // IMPORTAR CSV
  // ========================================
  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const lines = text
        .split('\n')
        .filter((line) => line.trim())
        .slice(1); // Pular header

      const importedAccounts: FinancialAccount[] = [];

      for (const line of lines) {
        const [
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
          id: `temp-${Date.now()}-${Math.random()}`,
          bank_name,
          account_name,
          account_type: account_type || 'Conta Corrente',
          agency: agency || '',
          account_number: account_number || '',
          current_balance: 0,
          available_balance: 0,
          currency: currency || 'BRL',
          is_active: is_active?.toLowerCase() === 'sim' || is_active?.toLowerCase() === 'true',
          is_default: is_default?.toLowerCase() === 'sim' || is_default?.toLowerCase() === 'true',
          reconciliation_status: 'Pendente',
        });
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
      console.error('Erro ao importar CSV:', error);
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
  // DOWNLOAD MODELO CSV
  // ========================================
  const downloadCSVTemplate = () => {
    const header =
      'Banco,Conta,Tipo,Agência,Número da Conta,Moeda,Ativo,Padrão\n';
    const example =
      'Banco do Brasil,Conta Principal,Conta Corrente,0001,123456789,BRL,Sim,Sim\n';
    const example2 =
      'Itaú,Conta Aplicação,Poupança,0002,987654321,BRL,Sim,Não\n';

    const content = header + example + example2;
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', 'template_contas_financeiras.csv');
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Sucesso',
      description: 'Modelo CSV baixado',
    });
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
          accept=".csv"
          onChange={handleImportCSV}
          disabled={importing}
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
          {importing ? 'Importando...' : 'Importar CSV'}
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
        Modelo CSV
      </Button>
    </div>
  );
};

export default FinancialAccountsExportImport;
