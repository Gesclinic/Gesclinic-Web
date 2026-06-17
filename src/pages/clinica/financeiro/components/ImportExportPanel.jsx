import React, { useState, useRef } from 'react';
import {
  Upload,
  Download,
  FileText,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react';
import { importFromFile, downloadTemplate, validateImportedData } from '@/lib/exportImportUtils';

export const ImportExportPanel = ({
  onImportSuccess,
  templateColumns,
  templateFilename = 'template.xlsx',
  requiredFields = [],
  title = 'Importação e Exportação',
}) => {
  const [showPanel, setShowPanel] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [importMessage, setImportMessage] = useState({ type: '', text: '' });
  const fileInputRef = useRef(null);

  const handleDownloadTemplate = () => {
    downloadTemplate(templateColumns, templateFilename);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setImportMessage({ type: '', text: '' });

    try {
      const importedData = await importFromFile(file);

      if (importedData.length === 0) {
        setImportMessage({
          type: 'error',
          text: 'Arquivo vazio ou sem dados válidos',
        });
        setIsLoading(false);
        return;
      }

      // Validar dados importados
      if (requiredFields.length > 0) {
        const errors = validateImportedData(importedData, requiredFields);
        if (errors.length > 0) {
          setImportMessage({
            type: 'error',
            text: `Erros encontrados:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n... e mais ${errors.length - 5}` : ''}`,
          });
          setIsLoading(false);
          return;
        }
      }

      // Chamar callback com dados importados
      onImportSuccess(importedData);

      setImportMessage({
        type: 'success',
        text: `✅ ${importedData.length} registros importados com sucesso!`,
      });

      // Limpar input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Fechar painel após sucesso
      setTimeout(() => {
        setShowPanel(false);
        setImportMessage({ type: '', text: '' });
      }, 2000);
    } catch (error) {
      setImportMessage({
        type: 'error',
        text: error.message || 'Erro ao importar arquivo',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Botão para abrir painel */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200 transition-colors"
      >
        <Upload size={16} />
        Importar / Exportar
      </button>

      {/* Painel flutuante */}
      {showPanel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-lg">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-800">{title}</h3>
              <button
                onClick={() => setShowPanel(false)}
                className="text-slate-500 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            {/* Seção de Exportação */}
            <div className="mb-8">
              <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Download size={16} />
                Exportar
              </h4>
              <button
                onClick={handleDownloadTemplate}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-100 text-green-700 border-2 border-green-300 rounded-lg font-medium hover:bg-green-50 transition-colors"
              >
                <FileText size={18} />
                Baixar Template
              </button>
              <p className="text-xs text-slate-500 mt-2">
                Baixe o modelo com as colunas esperadas para importação
              </p>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-200 mb-8" />

            {/* Seção de Importação */}
            <div>
              <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Upload size={16} />
                Importar
              </h4>

              <label className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-100 text-blue-700 border-2 border-dashed border-blue-300 rounded-lg font-medium hover:bg-blue-50 cursor-pointer transition-colors">
                <Upload size={18} />
                Selecionar Arquivo
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  disabled={isLoading}
                  className="hidden"
                />
              </label>

              <p className="text-xs text-slate-500 mt-2">
                Suporta Excel (.xlsx, .xls) e CSV
              </p>

              {/* Mensagens */}
              {importMessage.text && (
                <div
                  className={`mt-4 p-3 rounded-lg border-2 flex items-start gap-3 ${
                    importMessage.type === 'success'
                      ? 'bg-green-50 border-green-300'
                      : 'bg-red-50 border-red-300'
                  }`}
                >
                  {importMessage.type === 'success' ? (
                    <CheckCircle2 size={18} className="text-green-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertCircle size={18} className="text-red-600 mt-0.5 flex-shrink-0" />
                  )}
                  <p
                    className={`text-sm whitespace-pre-wrap ${
                      importMessage.type === 'success'
                        ? 'text-green-800'
                        : 'text-red-800'
                    }`}
                  >
                    {importMessage.text}
                  </p>
                </div>
              )}

              {/* Loading */}
              {isLoading && (
                <div className="mt-4 p-3 bg-blue-50 border-2 border-blue-300 rounded-lg flex items-center gap-2">
                  <div className="animate-spin">
                    <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  </div>
                  <p className="text-sm text-blue-800">Processando importação...</p>
                </div>
              )}
            </div>

            {/* Instruções */}
            <div className="mt-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs font-semibold text-slate-700 mb-2">📋 Instruções:</p>
              <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                <li>Baixe o template fornecido</li>
                <li>Preencha com seus dados</li>
                <li>Faça upload do arquivo preenchido</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
