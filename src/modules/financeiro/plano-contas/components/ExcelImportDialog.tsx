/**
 * Excel Import Dialog Component
 * Handles bulk import of Chart of Accounts and Bills from Excel files
 */

import React, { useState, useRef } from 'react';
import { Upload, AlertCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { parseChartOfAccountsExcel, parseBillsExcel } from '../services/excelImportService';
import { ChartOfAccountCreateInput } from '../types';

interface ExcelImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  importType: 'chart-of-accounts' | 'bills';
  onImport: (data: any[]) => Promise<void>;
}

interface ImportResult {
  success: number;
  errors: number;
  details: {
    row: number;
    data?: any;
    error?: string;
  }[];
}

export const ExcelImportDialog: React.FC<ExcelImportDialogProps> = ({
  open,
  onOpenChange,
  importType,
  onImport,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  };

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      const templates = {
        'chart-of-accounts': await generateChartOfAccountsTemplate(),
        'bills': await generateBillsTemplate(),
      };

      const data = templates[importType];
      const blob = new Blob([data], { type: 'application/octet-stream' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `template-${importType}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error('Error downloading template:', err);
      setError('Erro ao gerar template');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError('Selecione um arquivo para importar');
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const fileData = await file.arrayBuffer();
      
      let parsedData: any[];
      if (importType === 'chart-of-accounts') {
        parsedData = await parseChartOfAccountsExcel(fileData);
      } else {
        parsedData = await parseBillsExcel(fileData);
      }

      if (parsedData.length === 0) {
        setError('Nenhum dado válido encontrado no arquivo');
        return;
      }

      await onImport(parsedData);

      setResult({
        success: parsedData.length,
        errors: 0,
        details: parsedData.map((data, idx) => ({
          row: idx + 2,
          data,
        })),
      });

      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      setError(err?.message || 'Erro ao importar arquivo');
      setResult({
        success: 0,
        errors: 1,
        details: [{
          row: 1,
          error: err?.message || 'Erro desconhecido',
        }],
      });
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              {importType === 'chart-of-accounts' ? 'Importar Plano de Contas' : 'Importar Contas a Pagar'}
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              {importType === 'chart-of-accounts' 
                ? 'Carregue um arquivo Excel com a estrutura de contas'
                : 'Carregue um arquivo Excel com as contas a pagar'}
            </p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Success Result */}
          {result && result.errors === 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-green-900">Importação realizada com sucesso!</p>
                <p className="text-green-700 text-sm mt-1">
                  {result.success} registros foram importados com sucesso.
                </p>
              </div>
            </div>
          )}

          {/* Error Result */}
          {result && result.errors > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-red-900">Erros encontrados durante importação</p>
                <div className="text-red-700 text-sm mt-2 space-y-1">
                  {result.details.filter(d => d.error).map((detail, idx) => (
                    <div key={idx}>
                      <strong>Linha {detail.row}:</strong> {detail.error}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-red-900">Erro na importação</p>
                <p className="text-red-700 text-sm mt-1">{error}</p>
              </div>
            </div>
          )}

          {!result && (
            <>
              {/* Template Download */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900 mb-3">
                  Não tem um arquivo? Baixe o template de exemplo:
                </p>
                <button
                  onClick={handleDownloadTemplate}
                  disabled={downloadingTemplate}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {downloadingTemplate ? <Loader2 className="w-4 h-4 animate-spin" /> : '⬇️'}
                  {downloadingTemplate ? 'Gerando...' : 'Baixar Template'}
                </button>
              </div>

              {/* File Upload */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <input
                  ref={fileInputRef}
                  type="file"
                  aria-label="Selecionar arquivo Excel para importação"
                  title="Selecionar arquivo Excel para importação"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <p className="font-medium text-gray-700">Clique para selecionar arquivo</p>
                <p className="text-sm text-gray-600 mt-1">ou arraste um arquivo .xlsx aqui</p>
                {file && (
                  <p className="text-sm text-blue-600 mt-2 font-medium">
                    ✓ {file.name}
                  </p>
                )}
              </div>

              {/* File Info */}
              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 space-y-2">
                <p><strong>Requisitos:</strong></p>
                <ul className="list-disc list-inside space-y-1">
                  {importType === 'chart-of-accounts' ? (
                    <>
                      <li>Formato: .xlsx (Excel)</li>
                      <li>Colunas: Código, Nome, Tipo, Natureza, Descrição</li>
                      <li>Mínimo 1 linha de dados (além do cabeçalho)</li>
                    </>
                  ) : (
                    <>
                      <li>Formato: .xlsx (Excel)</li>
                      <li>Colunas: Data, Fornecedor, Valor, Categoria, Descrição</li>
                      <li>Mínimo 1 linha de dados (além do cabeçalho)</li>
                    </>
                  )}
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!result && (
          <div className="sticky bottom-0 bg-white border-t p-6 flex justify-end gap-3">
            <button
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleImport}
              disabled={!file || loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Importando...' : 'Importar'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Generate Chart of Accounts template as Excel file
 */
async function generateChartOfAccountsTemplate(): Promise<ArrayBuffer> {
  const XLSX = await import('xlsx');
  
  const data = [
    { Código: '1', Nome: 'ATIVO', Tipo: 'ATIVO', Natureza: 'DEVEDORA', Descrição: 'Ativo geral' },
    { Código: '1.1', Nome: 'Ativo Circulante', Tipo: 'ATIVO', Natureza: 'DEVEDORA', Descrição: 'Ativo de curto prazo' },
    { Código: '1.1.1', Nome: 'Caixa', Tipo: 'ATIVO', Natureza: 'DEVEDORA', Descrição: 'Dinheiro em caixa' },
    { Código: '1.1.2', Nome: 'Bancos', Tipo: 'ATIVO', Natureza: 'DEVEDORA', Descrição: 'Contas bancárias' },
    { Código: '2', Nome: 'PASSIVO', Tipo: 'PASSIVO', Natureza: 'CREDORA', Descrição: 'Passivo geral' },
    { Código: '2.1', Nome: 'Passivo Circulante', Tipo: 'PASSIVO', Natureza: 'CREDORA', Descrição: 'Passivo de curto prazo' },
    { Código: '3', Nome: 'RECEITA', Tipo: 'RECEITA', Natureza: 'CREDORA', Descrição: 'Receita de serviços' },
    { Código: '3.1', Nome: 'Consultas', Tipo: 'RECEITA', Natureza: 'CREDORA', Descrição: 'Receita de consultas' },
    { Código: '4', Nome: 'DESPESA', Tipo: 'DESPESA', Natureza: 'DEVEDORA', Descrição: 'Despesa operacional' },
    { Código: '4.1', Nome: 'Salários', Tipo: 'DESPESA', Natureza: 'DEVEDORA', Descrição: 'Despesa com salários' },
  ];

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Plano de Contas');
  
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
}

/**
 * Generate Bills template as Excel file
 */
async function generateBillsTemplate(): Promise<ArrayBuffer> {
  const XLSX = await import('xlsx');
  
  const data = [
    { Data: '2026-05-12', Fornecedor: 'Fornecedor A', Valor: 1500.00, Categoria: 'Serviços', Descrição: 'Consultoria contábil' },
    { Data: '2026-05-13', Fornecedor: 'Fornecedor B', Valor: 2000.00, Categoria: 'Suprimentos', Descrição: 'Material de escritório' },
    { Data: '2026-05-14', Fornecedor: 'Fornecedor C', Valor: 750.50, Categoria: 'Manutenção', Descrição: 'Limpeza das instalações' },
    { Data: '2026-05-15', Fornecedor: 'Fornecedor D', Valor: 3500.00, Categoria: 'Utilities', Descrição: 'Energia elétrica' },
  ];

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Contas a Pagar');
  
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
}
