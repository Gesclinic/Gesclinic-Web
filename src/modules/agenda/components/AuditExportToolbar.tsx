import React, { useState } from 'react';
import { Download, FileText, Table2, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  exportAuditLogsToCSV,
  exportAuditLogsToJSON,
  exportAuditLogsToHTML,
  archiveOldAuditLogs,
} from '../services/auditExportService';
import { AuditLogEntry } from '../types';

interface AuditExportToolbarProps {
  auditEntries: AuditLogEntry[];
  clinicId: string;
  clinicName?: string;
  isExporting?: boolean;
  onArchiveComplete?: (count: number) => void;
  className?: string;
}

export const AuditExportToolbar: React.FC<AuditExportToolbarProps> = ({
  auditEntries,
  clinicId,
  clinicName = 'Clínica',
  isExporting = false,
  onArchiveComplete,
  className = '',
}) => {
  const [isArchivinig, setIsArchiving] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportSuccess, setExportSuccess] = useState('');

  const handleExportCSV = () => {
    try {
      exportAuditLogsToCSV(auditEntries, `audit_${new Date().toISOString().split('T')[0]}.csv`);
      setExportSuccess('CSV exportado com sucesso!');
      setTimeout(() => setExportSuccess(''), 3000);
      setShowExportMenu(false);
    } catch (error) {
      console.error('Error exporting CSV:', error);
    }
  };

  const handleExportJSON = () => {
    try {
      exportAuditLogsToJSON(auditEntries, `audit_${new Date().toISOString().split('T')[0]}.json`);
      setExportSuccess('JSON exportado com sucesso!');
      setTimeout(() => setExportSuccess(''), 3000);
      setShowExportMenu(false);
    } catch (error) {
      console.error('Error exporting JSON:', error);
    }
  };

  const handleExportHTML = () => {
    try {
      exportAuditLogsToHTML(
        auditEntries,
        clinicName,
        `audit_report_${new Date().toISOString().split('T')[0]}.html`
      );
      setExportSuccess('Relatório HTML gerado com sucesso!');
      setTimeout(() => setExportSuccess(''), 3000);
      setShowExportMenu(false);
    } catch (error) {
      console.error('Error exporting HTML:', error);
    }
  };

  const handleArchiveOld = async () => {
    const confirmed = window.confirm(
      'Arquivar registros com mais de 6 meses?\n\nEles serão movidos para armazenamento separado (funcionalidade futura).'
    );

    if (!confirmed) return;

    setIsArchiving(true);
    try {
      const result = await archiveOldAuditLogs(clinicId, 180);
      if (result.error) {
        console.error('Archive error:', result.error);
        setExportSuccess(`Erro: ${result.error}`);
      } else {
        setExportSuccess(`${result.archived} registros arquivados com sucesso!`);
        onArchiveComplete?.(result.archived);
      }
      setTimeout(() => setExportSuccess(''), 3000);
    } catch (error) {
      console.error('Unexpected archive error:', error);
    } finally {
      setIsArchiving(false);
    }
  };

  const hasEntries = auditEntries.length > 0;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Export Menu */}
      <div className="relative">
        <Button
          onClick={() => setShowExportMenu(!showExportMenu)}
          disabled={!hasEntries || isExporting}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <Download size={16} />
          Exportar
        </Button>

        {showExportMenu && (
          <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
            <div className="p-1">
              <button
                onClick={handleExportCSV}
                disabled={isExporting}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
              >
                <Table2 size={16} className="text-blue-600" />
                <span>Exportar CSV</span>
              </button>
              <button
                onClick={handleExportJSON}
                disabled={isExporting}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
              >
                <FileText size={16} className="text-green-600" />
                <span>Exportar JSON</span>
              </button>
              <button
                onClick={handleExportHTML}
                disabled={isExporting}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
              >
                <FileText size={16} className="text-purple-600" />
                <span>Gerar Relatório</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Archive Button */}
      <Button
        onClick={handleArchiveOld}
        disabled={!hasEntries || isArchivinig || isExporting}
        variant="outline"
        size="sm"
        className="gap-2"
        title="Arquivar registros com mais de 6 meses"
      >
        <Archive size={16} />
        Arquivar
      </Button>

      {/* Success Message */}
      {exportSuccess && (
        <div className="fixed bottom-4 right-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2 animate-fade-in-out">
          <span className="text-sm">✓ {exportSuccess}</span>
        </div>
      )}

      {/* Entry count */}
      {hasEntries && (
        <span className="text-xs text-gray-500 ml-2">
          {auditEntries.length} registr{auditEntries.length !== 1 ? 'os' : 'o'}
        </span>
      )}
    </div>
  );
};

export default AuditExportToolbar;
