// src/components/financeiro/conciliacao/ConciliacaoImportacao.jsx
// Bloco de importação de extrato

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useBankStatementParser } from '@/hooks/useConciliation';
import { IMPORT_FORMATS, TRANSACTION_TYPE } from '@/lib/conciliationStatus';
import { formatCurrency } from '@/lib/formatters';

export function ConciliacaoImportacao({ bankAccounts, onImportSuccess }) {
  const [file, setFile] = useState(null);
  const [format, setFormat] = useState(IMPORT_FORMATS.CSV);
  const [accountId, setAccountId] = useState(null);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const { parseCSV, parseOFX } = useBankStatementParser();

  const resolveAccountLabel = (account) => {
    if (!account) {
      return 'Conta sem nome';
    }

    const name = account.account_name || account.name || account.label || 'Conta sem nome';
    const bank = account.bank_name || account.bank || account.bankLabel || '';
    const number = account.account_number || account.number || account.accountNumber || '';

    const details = [bank, number].filter(Boolean).join(' - ');
    return details ? `${name} (${details})` : name;
  };

  const formatPreviewDate = (value) => {
    if (!value) {
      return '--';
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-');
      return `${day}/${month}/${year}`;
    }

    if (/^\d{8}$/.test(value)) {
      const year = value.slice(0, 4);
      const month = value.slice(4, 6);
      const day = value.slice(6, 8);
      return `${day}/${month}/${year}`;
    }

    return value;
  };

  const decodeFileContent = async (selectedFile, selectedFormat) => {
    const buffer = await selectedFile.arrayBuffer();
    const candidates = [];

    const tryDecode = (encoding) => {
      try {
        const decoded = new TextDecoder(encoding).decode(buffer);
        candidates.push(decoded);
      } catch (err) {
        console.warn(`Falha ao decodificar com ${encoding}:`, err);
      }
    };

    tryDecode('utf-8');
    tryDecode('windows-1252');
    tryDecode('iso-8859-1');

    const hasOfxMarkers = (text) => /<OFX>|<STMTTRN>/i.test(text);
    const replacementCount = (text) => (text.match(/\uFFFD/g) || []).length;

    if (selectedFormat === IMPORT_FORMATS.OFX) {
      const withMarkers = candidates.filter(hasOfxMarkers);
      const ranked = (withMarkers.length > 0 ? withMarkers : candidates).sort(
        (a, b) => replacementCount(a) - replacementCount(b),
      );
      return ranked[0] || '';
    }

    const ranked = candidates.sort((a, b) => replacementCount(a) - replacementCount(b));
    return ranked[0] || '';
  };

  const isSpreadsheetFile = (selectedFile) => /\.(xlsx?|xlsm)$/i.test(selectedFile?.name || '');

  const parseSpreadsheet = async (selectedFile) => {
    const buffer = await selectedFile.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      throw new Error('Planilha sem abas para importar');
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const csv = XLSX.utils.sheet_to_csv(worksheet, { FS: ';', blankrows: false });
    return parseCSV(csv);
  };

  const processSelectedFile = async (selectedFile) => {
    if (!selectedFile) {
      return;
    }

    setFile(selectedFile);

    try {
      let statements = [];

      if (isSpreadsheetFile(selectedFile)) {
        statements = await parseSpreadsheet(selectedFile);
      } else {
        const content = await decodeFileContent(selectedFile, format);

        if (format === IMPORT_FORMATS.CSV) {
        statements = parseCSV(content);
        } else if (format === IMPORT_FORMATS.OFX) {
          statements = parseOFX(content);
        }
      }

      setPreview(statements.slice(0, 5)); // Mostrar 5 primeiros
    } catch (err) {
      console.error('Error parsing file:', err);
      alert('Erro ao processar arquivo: ' + err.message);
    }
  };

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files?.[0];
    await processSelectedFile(selectedFile);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer?.files?.[0];
    await processSelectedFile(droppedFile);
  };

  const handleImport = async () => {
    if (!file || !accountId) {
      alert('Selecione uma conta bancária e um arquivo');
      return;
    }

    try {
      setImporting(true);
      let statements = [];

      if (isSpreadsheetFile(file)) {
        statements = await parseSpreadsheet(file);
      } else {
        const content = await decodeFileContent(file, format);

        if (format === IMPORT_FORMATS.CSV) {
        statements = parseCSV(content);
        } else if (format === IMPORT_FORMATS.OFX) {
          statements = parseOFX(content);
        }
      }

      const result = await onImportSuccess(statements, accountId);

      // Limpar
      setFile(null);
      setPreview(null);
      setAccountId(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Mensagem customizada baseada no resultado
      if (result && result.imported !== undefined) {
        if (result.imported > 0) {
          let message = `✓ ${result.imported} lançamento(ns) importado(s) com sucesso!`;
          if (result.duplicates > 0) {
            message += `\n⚠️ ${result.duplicates} duplicata(s) ignorada(s)`;
          }
          if (result.updated > 0) {
            message += `\n↻ ${result.updated} lançamento(ns) atualizado(s) com saldo do extrato`;
          }
          alert(message);
        } else if (result.duplicates > 0) {
          const updatedMessage = result.updated > 0
            ? `\n↻ ${result.updated} lançamento(ns) atualizado(s) com saldo do extrato`
            : '';
          alert(`⚠️ Todos os ${result.duplicates} lançamento(ns) já existem no sistema (duplicatas ignoradas)${updatedMessage}`);
        }
      } else {
        alert(`${statements.length} lançamentos processados com sucesso!`);
      }
    } catch (err) {
      console.error('Error importing:', err);
      alert('Erro ao importar: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card className="p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        📥 Importação de Extrato
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Conta Bancária */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Conta Bancária</label>
          <select
            value={accountId || ''}
            onChange={(e) => setAccountId(e.target.value || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecionar conta...</option>
            {bankAccounts.length === 0 ? (
              <option value="" disabled>
                Nenhuma conta encontrada
              </option>
            ) : (
              bankAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {resolveAccountLabel(account)}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Formato */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Formato</label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={IMPORT_FORMATS.CSV}>CSV</option>
            <option value={IMPORT_FORMATS.OFX}>OFX</option>
          </select>
        </div>

        {/* Arquivo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Arquivo</label>
          <div
            className={`w-full px-3 py-3 border-2 rounded-lg transition-all duration-200 ${
              isDragging
                ? 'border-blue-600 border-dashed bg-blue-100 shadow-sm scale-[1.01]'
                : 'border-gray-300 bg-white hover:border-blue-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
                <input
              ref={fileInputRef}
              type="file"
                  accept=".csv,.ofx,.txt,.xls,.xlsx,.xlsm"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="flex flex-col items-start gap-2 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                    isDragging ? 'bg-blue-200 text-blue-700' : 'bg-gray-100 text-gray-600'
                  }`}
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2">
                    <path d="M12 16V4" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M8 8l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M20 16.5a3.5 3.5 0 0 1-3.5 3.5h-9A3.5 3.5 0 0 1 4 16.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <p className={`text-sm ${isDragging ? 'text-blue-800 font-medium' : 'text-gray-700'}`}>
                {file
                  ? `Arquivo selecionado: ${file.name}`
                  : isDragging
                    ? 'Solte o arquivo para carregar'
                    : 'Arraste o arquivo aqui ou selecione no botão'}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full md:w-auto"
              >
                Selecionar arquivo
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Preview */}
      {preview && preview.length > 0 && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-700 mb-2">
            Prévia ({preview.length} de {file?.name})
          </p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {preview.map((stmt, idx) => (
              <div
                key={idx}
                className="flex justify-between text-xs p-2 bg-white rounded border border-gray-200"
              >
                <span className="font-medium">{formatPreviewDate(stmt.date)}</span>
                <span className="text-gray-600">{(stmt.description || 'Sem descrição').substring(0, 60)}</span>
                <span
                  className={
                    stmt.type === TRANSACTION_TYPE.CREDIT
                      ? 'text-green-600 font-medium'
                      : 'text-red-600 font-medium'
                  }
                >
                  {formatCurrency(stmt.amount)} {stmt.type === TRANSACTION_TYPE.CREDIT ? '+' : '-'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botões */}
      <div className="flex gap-2">
        <Button
          onClick={handleImport}
          disabled={!file || !accountId || importing}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {importing ? 'Importando...' : '✓ Importar Extrato'}
        </Button>
        <Button
          onClick={() => {
            setFile(null);
            setPreview(null);
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          }}
          variant="outline"
        >
          Limpar
        </Button>
      </div>
    </Card>
  );
}
