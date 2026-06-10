/**
 * 📄 CashFlowReport Component
 * 
 * Generates exportable reports in PDF, CSV, and email formats
 */

import React, { memo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Mail, FileText, AlertCircle } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/calculations';

export interface ReportData {
  title: string;
  period: {
    start: string;
    end: string;
  };
  summary: {
    totalIncome: number;
    totalExpense: number;
    netBalance: number;
    variation?: number;
  };
  details?: Array<{
    date: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
  }>;
}

interface CashFlowReportProps {
  data: ReportData;
  isLoading?: boolean;
  error?: string;
  className?: string;
  onExport?: (format: 'pdf' | 'csv' | 'email') => Promise<void>;
}

/**
 * Helper: Escape CSV field - only quote if necessary
 */
const escapeCSVField = (value: string | number | undefined): string => {
  if (value === undefined || value === null) return '';
  const stringValue = String(value);
  
  // Check if field needs quoting (contains separator, quotes, or newlines)
  if (stringValue.includes(';') || stringValue.includes('"') || stringValue.includes('\n')) {
    const escaped = stringValue.replace(/"/g, '""');
    return `"${escaped}"`;
  }
  
  return stringValue;
};

/**
 * Generate CSV content from report data
 * Uses semicolon (;) as separator for pt-BR locale compatibility
 * Creates professional report layout matching the PDF/screen format exactly
 */
const generateCSV = (data: ReportData): string => {
  const lines: string[] = [];
  const SEP = ';'; // Semicolon for pt-BR (comma is decimal separator)

  // HEADER - Title
  lines.push(data.title);
  lines.push(''); // blank line

  // PERIOD
  lines.push(`Período:${SEP}${data.period.start} a ${data.period.end}`);
  lines.push(''); // blank line

  // RESUMO EXECUTIVO SECTION
  lines.push('Resumo Executivo');
  lines.push(''); // blank line
  
  // Summary items with proper alignment: Label | (empty) | Value
  lines.push(`Receita Total${SEP}${SEP}${escapeCSVField(formatCurrency(data.summary.totalIncome))}`);
  lines.push(`Despesa Total${SEP}${SEP}${escapeCSVField(formatCurrency(data.summary.totalExpense))}`);
  lines.push(`Saldo Líquido${SEP}${SEP}${escapeCSVField(formatCurrency(data.summary.netBalance))}`);
  
  if (data.summary.variation !== undefined) {
    const variationSign = data.summary.variation >= 0 ? '+' : '';
    lines.push(`Variação${SEP}${SEP}${variationSign}${(data.summary.variation).toFixed(2)}%`);
  }
  
  lines.push(''); // blank line
  lines.push(''); // blank line

  // DETALHES SECTION - Table format
  if (data.details && data.details.length > 0) {
    lines.push('Detalhes');
    lines.push(''); // blank line
    
    // Table headers
    lines.push(`Data${SEP}Descrição${SEP}Tipo${SEP}Valor`);
    
    // Data rows
    data.details.forEach(detail => {
      const typeLabel = detail.type === 'income' ? 'Receita' : 'Despesa';
      const valueFormatted = formatCurrency(detail.amount);
      
      lines.push(
        `${escapeCSVField(detail.date)}${SEP}${escapeCSVField(detail.description)}${SEP}${typeLabel}${SEP}${valueFormatted}`
      );
    });
  }

  // Join with CRLF for Excel compatibility
  const csvContent = lines.join('\r\n');
  
  // Add UTF-8 BOM for proper encoding detection
  const bom = '\uFEFF';
  return bom + csvContent;
};

/**
 * Generate PDF content (simple text-based for demo)
 */
const generatePDFContent = (data: ReportData): string => {
  const lines: string[] = [];

  lines.push(data.title);
  lines.push(`Período: ${data.period.start} a ${data.period.end}`);
  lines.push('');

  lines.push('RESUMO FINANCEIRO');
  lines.push('-'.repeat(40));
  lines.push(`Receita Total:      ${formatCurrency(data.summary.totalIncome)}`);
  lines.push(`Despesa Total:      ${formatCurrency(data.summary.totalExpense)}`);
  lines.push(`Saldo Líquido:      ${formatCurrency(data.summary.netBalance)}`);
  if (data.summary.variation !== undefined) {
    lines.push(`Variação:           ${data.summary.variation.toFixed(2)}%`);
  }

  return lines.join('\n');
};

/**
 * Export to CSV with multiple fallback methods
 */
const exportCSV = (data: ReportData): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      console.log('🔍 Iniciando exportação CSV...');
      const csv = generateCSV(data);
      console.log('✅ CSV gerado:', csv.substring(0, 100));
      
      const filename = `relatorio-fluxo-caixa-${data.period.start}-${data.period.end}.csv`;
      console.log('📝 Nome do arquivo:', filename);
      
      // Método 1: Blob + URL.createObjectURL (mais compatível)
      try {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        console.log('✅ Blob criado:', blob.size, 'bytes');
        
        const url = URL.createObjectURL(blob);
        console.log('✅ URL criada:', url);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.type = 'text/csv';
        link.style.display = 'none'; // Garantir que está hidden
        
        console.log('🔗 Link criado e configurado');
        
        // Adicionar ao DOM
        document.body.appendChild(link);
        console.log('📌 Link adicionado ao DOM');
        
        // Trigger download - tentar múltiplas formas
        try {
          link.click();
          console.log('✅ Click() executado com sucesso');
        } catch (clickErr) {
          console.warn('⚠️ Click() falhou, tentando alternativa:', clickErr);
          // Fallback: usar MouseEvent
          const event = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
          });
          link.dispatchEvent(event);
          console.log('✅ dispatchEvent executado');
        }
        
        // Limpar depois
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          console.log('🗑️ Cleanup completado');
        }, 500);
        
        // Resolver imediatamente após click
        console.log('✅ Exportação CSV iniciada!');
        resolve();
        
      } catch (blobErr) {
        console.error('❌ Erro ao criar Blob:', blobErr);
        // Método 2: Fallback com data URI
        console.log('🔄 Tentando método alternativo (data URI)...');
        try {
          const dataURI = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
          const link = document.createElement('a');
          link.href = dataURI;
          link.download = filename;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          console.log('✅ Exportação via data URI concluída!');
          resolve();
        } catch (fallbackErr) {
          console.error('❌ Fallback também falhou:', fallbackErr);
          reject(fallbackErr);
        }
      }
    } catch (err) {
      console.error('❌ Erro ao exportar CSV:', err);
      reject(err);
    }
  });
};

/**
 * Export to PDF using print window
 */
const exportPDF = (data: ReportData): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      console.log('📄 Iniciando exportação PDF...');
      // Criar conteúdo HTML para PDF
      const htmlContent = `
        <html>
          <head>
            <meta charset="UTF-8">
            <title>${data.title}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
              h1 { font-size: 18px; margin-bottom: 10px; border-bottom: 2px solid #0066cc; padding-bottom: 10px; }
              h2 { font-size: 14px; margin-top: 15px; color: #0066cc; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f0f0f0; font-weight: bold; }
              .summary-box { background-color: #f9f9f9; padding: 10px; margin: 10px 0; border-left: 4px solid #0066cc; }
            </style>
          </head>
          <body>
            <h1>${data.title}</h1>
            <p><strong>Período:</strong> ${data.period.start} a ${data.period.end}</p>
            
            <div class="summary-box">
              <h2>Resumo Executivo</h2>
              <table>
                <tr>
                  <th>Receita Total</th>
                  <td>R$ ${data.summary.totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <th>Despesa Total</th>
                  <td>R$ ${Math.abs(data.summary.totalExpense).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <th>Saldo Líquido</th>
                  <td>R$ ${data.summary.netBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                </tr>
                ${data.summary.variation !== undefined ? `
                <tr>
                  <th>Variação</th>
                  <td>${(data.summary.variation >= 0 ? '+' : '')}${data.summary.variation.toFixed(2)}%</td>
                </tr>
                ` : ''}
              </table>
            </div>
            
            ${data.details && data.details.length > 0 ? `
            <h2>Detalhes</h2>
            <table>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Tipo</th>
                <th>Valor</th>
              </tr>
              ${data.details.map(detail => `
              <tr>
                <td>${detail.date}</td>
                <td>${detail.description}</td>
                <td>${detail.type === 'income' ? 'Receita' : 'Despesa'}</td>
                <td>R$ ${detail.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
              </tr>
              `).join('')}
            </table>
            ` : ''}
          </body>
        </html>
      `;

      console.log('✅ HTML gerado');

      // Usar print para PDF
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        console.log('📄 Janela de impressão aberta');
        
        // Tentar imprimir com delay para garantir carregamento
        setTimeout(() => {
          printWindow.print();
          console.log('🖨️ Print dialog acionado');
          resolve();
        }, 500);
      } else {
        console.error('❌ Pop-up bloqueado - não foi possível abrir janela de impressão');
        reject(new Error('Pop-up foi bloqueado pelo navegador'));
      }
    } catch (err) {
      console.error('❌ Erro ao exportar PDF:', err);
      reject(err);
    }
  });
};

/**
 * Export to Email
 */
const exportEmail = (data: ReportData): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      console.log('📧 Abrindo cliente de email...');
      const subject = encodeURIComponent(`Relatório de Fluxo de Caixa - ${data.period.start} a ${data.period.end}`);
      const period = `${data.period.start} a ${data.period.end}`;
      const body = encodeURIComponent(
        `Segue relatório de fluxo de caixa.\n\nPeríodo: ${period}\n\nResumo:\n` +
        `- Receita Total: R$ ${data.summary.totalIncome.toFixed(2).replace('.', ',')}\n` +
        `- Despesa Total: R$ ${Math.abs(data.summary.totalExpense).toFixed(2).replace('.', ',')}\n` +
        `- Saldo Líquido: R$ ${data.summary.netBalance.toFixed(2).replace('.', ',')}\n\n` +
        `Atenciosamente,\nGesclinic`
      );
      
      const mailtoLink = `mailto:?subject=${subject}&body=${body}`;
      console.log('📧 Link mailto criado');
      
      // Criar link temporário para mailto
      const link = document.createElement('a');
      link.href = mailtoLink;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('✅ Email iniciado');
      resolve();
    } catch (err) {
      console.error('❌ Erro ao iniciar email:', err);
      reject(err);
    }
  });
};

const ExportButton = memo(({
  icon: Icon,
  label,
  onClick,
  isLoading,
  variant = 'default',
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  isLoading?: boolean;
  variant?: 'default' | 'primary' | 'secondary';
}) => {
  const variantClasses = {
    default:
      'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300',
    primary:
      'bg-blue-600 text-white hover:bg-blue-700 border border-blue-700',
    secondary:
      'bg-green-600 text-white hover:bg-green-700 border border-green-700',
  };

  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
        variantClasses[variant]
      } ${isLoading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </button>
  );
});

const CashFlowReport = memo(({
  data,
  isLoading = false,
  error,
  className = '',
  onExport,
}: CashFlowReportProps) => {
  const [exporting, setExporting] = useState<'pdf' | 'csv' | 'email' | null>(null);
  const [exportMessage, setExportMessage] = useState<string>('');

  const handleExport = async (format: 'pdf' | 'csv' | 'email') => {
    setExporting(format);
    setExportMessage('');

    try {
      console.log(`📊 Iniciando exportação em formato: ${format}`);
      console.log('📋 Dados:', data);

      if (onExport) {
        await onExport(format);
        setExportMessage(`✅ ${format.toUpperCase()} exportado com sucesso!`);
      } else {
        // Default exports
        if (format === 'csv') {
          console.log('🔄 Chamando exportCSV...');
          await exportCSV(data);
          setExportMessage('✅ CSV exportado com sucesso! Verifique sua pasta de downloads.');
        } else if (format === 'pdf') {
          console.log('🔄 Chamando exportPDF...');
          await exportPDF(data);
          setExportMessage('✅ PDF aberto para impressão/download!');
        } else if (format === 'email') {
          console.log('🔄 Chamando exportEmail...');
          await exportEmail(data);
          setExportMessage('✅ Cliente de email aberto! Configure o destinatário e envie.');
        }
      }
    } catch (err) {
      console.error(`❌ Erro ao exportar para ${format}:`, err);
      setExportMessage(`❌ Erro ao exportar: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setExporting(null);
      // Clear message after 5 seconds
      setTimeout(() => setExportMessage(''), 5000);
    }
  };

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-red-700">
            <AlertCircle className="h-5 w-5" />
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Relatório de Fluxo de Caixa
        </CardTitle>
        <CardDescription>
          Período: {data.period.start} a {data.period.end}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-6">
          {/* Export Message */}
          {exportMessage && (
            <div className={`p-3 rounded-lg text-sm font-medium ${
              exportMessage.includes('✅')
                ? 'bg-green-100 text-green-800 border border-green-200'
                : 'bg-red-100 text-red-800 border border-red-200'
            }`}>
              {exportMessage}
            </div>
          )}

          {/* Summary Section */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="font-semibold text-gray-700 mb-4">Resumo Executivo</h3>
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs text-gray-600 font-medium">Receita Total</p>
                <p className="text-lg font-bold text-green-600 mt-1">
                  {formatCurrency(data.summary.totalIncome)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 font-medium">Despesa Total</p>
                <p className="text-lg font-bold text-red-600 mt-1">
                  {formatCurrency(Math.abs(data.summary.totalExpense))}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 font-medium">Saldo Líquido</p>
                <p className={`text-lg font-bold mt-1 ${
                  data.summary.netBalance >= 0
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}>
                  {formatCurrency(data.summary.netBalance)}
                </p>
              </div>
              {data.summary.variation !== undefined && (
                <div>
                  <p className="text-xs text-gray-600 font-medium">Variação</p>
                  <p className={`text-lg font-bold mt-1 ${
                    data.summary.variation >= 0
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}>
                    {data.summary.variation >= 0 ? '+' : '-'}
                    {Math.abs(data.summary.variation).toFixed(2)}%
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Export Buttons */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-700">Exportar Relatório</h3>
            <div className="flex flex-wrap gap-3">
              <ExportButton
                icon={Download}
                label={exporting === 'csv' ? 'Exportando...' : 'Exportar CSV'}
                onClick={() => handleExport('csv')}
                isLoading={exporting === 'csv'}
                variant="default"
              />
              <ExportButton
                icon={FileText}
                label={exporting === 'pdf' ? 'Gerando...' : 'Exportar PDF'}
                onClick={() => handleExport('pdf')}
                isLoading={exporting === 'pdf'}
                variant="primary"
              />
              <ExportButton
                icon={Mail}
                label={exporting === 'email' ? 'Enviando...' : 'Enviar por Email'}
                onClick={() => handleExport('email')}
                isLoading={exporting === 'email'}
                variant="secondary"
              />
            </div>
          </div>

          {/* Details Table */}
          {data.details && data.details.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-700">Detalhes</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-300 bg-gray-50">
                      <th className="text-left py-2 px-3 font-medium text-gray-600">Data</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-600">
                        Descrição
                      </th>
                      <th className="text-center py-2 px-3 font-medium text-gray-600">Tipo</th>
                      <th className="text-right py-2 px-3 font-medium text-gray-600">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.details
                      .slice(0, 10)
                      .map((detail, idx) => (
                        <tr
                          key={idx}
                          className="border-b border-gray-200 hover:bg-gray-50"
                        >
                          <td className="py-2 px-3">{detail.date}</td>
                          <td className="py-2 px-3">{detail.description}</td>
                          <td className="py-2 px-3 text-center">
                            <span
                              className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                detail.type === 'income'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {detail.type === 'income' ? 'Receita' : 'Despesa'}
                            </span>
                          </td>
                          <td
                            className={`py-2 px-3 text-right font-medium ${
                              detail.type === 'income'
                                ? 'text-green-600'
                                : 'text-red-600'
                            }`}
                          >
                            {detail.type === 'income'
                              ? '+'
                              : '-'}
                            {formatCurrency(Math.abs(detail.amount))}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {data.details.length > 10 && (
                  <p className="text-xs text-gray-500 mt-2 px-3">
                    +{data.details.length - 10} mais itens...
                  </p>
                )}
              </div>
            </div>
          )}

          {isLoading && (
            <div className="text-center py-4 text-gray-500">
              Gerando relatório...
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

CashFlowReport.displayName = 'CashFlowReport';

export default CashFlowReport;
