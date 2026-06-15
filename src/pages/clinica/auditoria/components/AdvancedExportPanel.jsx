import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AdvancedExportManager } from './AdvancedExportManager';

/**
 * Painel UI para exportação avançada com múltiplos formatos
 */
export function AdvancedExportPanel({ logs = [] }) {
  const [exportFormat, setExportFormat] = useState('csv');
  const [selectedFields, setSelectedFields] = useState([
    'patient',
    'professional',
    'action',
    'timestamp',
    'performedBy',
  ]);
  const [isExporting, setIsExporting] = useState(false);

  const availableFields = [
    { key: 'patient', label: 'Paciente' },
    { key: 'professional', label: 'Profissional' },
    { key: 'action', label: 'Ação' },
    { key: 'timestamp', label: 'Data/Hora' },
    { key: 'performedBy', label: 'Realizado por' },
    { key: 'role', label: 'Perfil' },
    { key: 'context', label: 'Contexto' },
  ];

  const handleExport = async () => {
    try {
      setIsExporting(true);

      const timestamp = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
      const filename = `auditoria_${timestamp}`;

      switch (exportFormat) {
        case 'csv':
          AdvancedExportManager.exportToCSV(logs, `${filename}.csv`);
          break;
        case 'excel':
          AdvancedExportManager.exportToExcelCSV(logs, `${filename}.xlsx`);
          break;
        case 'pdf':
          AdvancedExportManager.exportToPDF(
            logs,
            'Auditoria de Agendamentos',
            `${filename}.pdf`
          );
          break;
        case 'json':
          AdvancedExportManager.exportToJSON(logs, `${filename}.json`);
          break;
        case 'custom':
          AdvancedExportManager.exportCustom(logs, selectedFields, 'csv');
          break;
        default:
          break;
      }

      setIsExporting(false);
    } catch (error) {
      console.error('Erro ao exportar:', error);
      setIsExporting(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">📥 Exportação Avançada</h3>

        {/* Format Selection */}
        <div>
          <label className="block font-semibold mb-3">Formato de Exportação</label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { id: 'csv', label: '📄 CSV', icon: '📊' },
              { id: 'excel', label: '📊 Excel', icon: '📈' },
              { id: 'pdf', label: '📕 PDF', icon: '📄' },
              { id: 'json', label: '⚙️ JSON', icon: '{}' },
              { id: 'custom', label: '✏️ Custom', icon: '⚙️' },
            ].map(fmt => (
              <button
                key={fmt.id}
                onClick={() => setExportFormat(fmt.id)}
                className={`p-3 rounded border-2 transition-all cursor-pointer text-center ${
                  exportFormat === fmt.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-1">{fmt.icon}</div>
                <div className="text-xs font-semibold">{fmt.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Fields Selection */}
        {exportFormat === 'custom' && (
          <div className="p-4 bg-blue-50 rounded border border-blue-200">
            <label className="block font-semibold mb-3 text-blue-900">
              Selecione os Campos
            </label>
            <div className="space-y-2">
              {availableFields.map(field => (
                <label key={field.key} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedFields.includes(field.key)}
                    onChange={e => {
                      if (e.target.checked) {
                        setSelectedFields([...selectedFields, field.key]);
                      } else {
                        setSelectedFields(selectedFields.filter(f => f !== field.key));
                      }
                    }}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-blue-900">{field.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Format Details */}
        <div className="p-4 bg-gray-50 rounded">
          <div className="text-sm space-y-2">
            <p>
              <strong>Total de registros:</strong> {logs.length}
            </p>
            <p>
              <strong>Período:</strong> Últimos 7 dias
            </p>
            <p className="text-xs text-gray-600 mt-3">
              {exportFormat === 'csv' &&
                '✓ Compatível com Excel, Google Sheets e outras ferramentas'}
              {exportFormat === 'excel' &&
                '✓ Arquivo .xlsx pronto para abrir no Microsoft Excel'}
              {exportFormat === 'pdf' &&
                '✓ Arquivo formatado com tabelas, múltiplas páginas e cabeçalhos'}
              {exportFormat === 'json' &&
                '✓ Estrutura JSON para integração com outros sistemas'}
              {exportFormat === 'custom' &&
                '✓ Selecione apenas os campos que precisa exportar'}
            </p>
          </div>
        </div>

        {/* Export Button */}
        <Button
          onClick={handleExport}
          disabled={isExporting || logs.length === 0}
          className={`w-full py-3 font-semibold rounded transition-all ${
            isExporting || logs.length === 0
              ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isExporting ? (
            <>⏳ Exportando...</>
          ) : (
            <>
              📥 Exportar para {exportFormat.toUpperCase()}
              {logs.length > 0 && ` (${logs.length} registros)`}
            </>
          )}
        </Button>

        {/* Info Box */}
        <div className="p-3 bg-green-50 border-l-4 border-green-400 rounded text-xs text-green-800">
          <p>
            <strong>💡 Dica:</strong> Use CSV para máxima compatibilidade. Use PDF para
            compartilhar relatórios formais. Use JSON para integração com sistemas externos.
          </p>
        </div>
      </div>
    </Card>
  );
}
