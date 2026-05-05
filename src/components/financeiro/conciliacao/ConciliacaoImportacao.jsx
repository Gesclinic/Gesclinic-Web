// src/components/financeiro/conciliacao/ConciliacaoImportacao.jsx
// Bloco de importação de extrato

import React, { useState, useRef } from 'react';
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
  const fileInputRef = useRef(null);
  const { parseCSV, parseOFX } = useBankStatementParser();

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) {
      return;
    }

    setFile(selectedFile);

    try {
      const content = await selectedFile.text();
      let statements = [];

      if (format === IMPORT_FORMATS.CSV) {
        statements = parseCSV(content);
      } else if (format === IMPORT_FORMATS.OFX) {
        statements = parseOFX(content);
      }

      setPreview(statements.slice(0, 5)); // Mostrar 5 primeiros
    } catch (err) {
      console.error('Error parsing file:', err);
      alert('Erro ao processar arquivo: ' + err.message);
    }
  };

  const handleImport = async () => {
    if (!file || !accountId) {
      alert('Selecione uma conta bancária e um arquivo');
      return;
    }

    try {
      setImporting(true);
      const content = await file.text();
      let statements = [];

      if (format === IMPORT_FORMATS.CSV) {
        statements = parseCSV(content);
      } else if (format === IMPORT_FORMATS.OFX) {
        statements = parseOFX(content);
      }

      await onImportSuccess(statements, accountId);

      // Limpar
      setFile(null);
      setPreview(null);
      setAccountId(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      alert(`${statements.length} lançamentos importados com sucesso!`);
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
            {bankAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.account_name} ({account.account_number})
              </option>
            ))}
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
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.ofx,.txt"
            onChange={handleFileSelect}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
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
                <span className="font-medium">{stmt.date}</span>
                <span className="text-gray-600">{stmt.description.substring(0, 30)}</span>
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
