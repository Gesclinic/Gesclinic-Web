import React, { useState, useMemo } from 'react';
import { useAuditLogs } from '../hooks/useAudit';
import { AuditHistoryViewer } from './AuditHistoryViewer';
import { AuditFilters, AuditFilterOptions } from './AuditFilters';
import { AuditExportToolbar } from './AuditExportToolbar';
import { AlertCircle, Loader } from 'lucide-react';

interface AdvancedAuditViewerProps {
  appointmentId?: string;
  clinicId: string;
  clinicName?: string;
  className?: string;
}

export const AdvancedAuditViewer: React.FC<AdvancedAuditViewerProps> = ({
  appointmentId,
  clinicId,
  clinicName = 'Clínica',
  className = '',
}) => {
  const [filters, setFilters] = useState<AuditFilterOptions>({});
  const [limit] = useState(500);

  // Fetch all audit logs for the clinic (with optional appointment filter)
  const { data: auditLogs, isLoading, error } = useAuditLogs(
    clinicId,
    {
      appointment_id: appointmentId,
      ...filters,
    },
    { enabled: !!clinicId }
  );

  // Apply client-side filtering
  const filteredLogs = useMemo(() => {
    if (!auditLogs) return [];

    return auditLogs.filter(log => {
      // Operation type filter
      if (filters.operationType && log.operation !== filters.operationType) {
        return false;
      }

      // Search text filter
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        const matches =
          log.changed_by.toLowerCase().includes(searchLower) ||
          log.appointment_id.toLowerCase().includes(searchLower) ||
          (log.changed_fields?.some(field => field.toLowerCase().includes(searchLower)) || false);
        if (!matches) return false;
      }

      // Date range filter
      const logDate = new Date(log.changed_at);
      if (filters.dateFrom && logDate < filters.dateFrom) {
        return false;
      }
      if (filters.dateTo) {
        const endOfDay = new Date(filters.dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        if (logDate > endOfDay) {
          return false;
        }
      }

      // User filter
      if (filters.changedBy && !log.changed_by.includes(filters.changedBy)) {
        return false;
      }

      return true;
    });
  }, [auditLogs, filters]);

  const handleFilterChange = (newFilters: AuditFilterOptions) => {
    setFilters(newFilters);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Filters */}
      <AuditFilters onFilterChange={handleFilterChange} isLoading={isLoading} />

      {/* Export Toolbar */}
      <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
        <div className="text-sm text-gray-600">
          {filteredLogs.length} de {auditLogs?.length || 0} registros
        </div>
        <AuditExportToolbar
          auditEntries={filteredLogs}
          clinicId={clinicId}
          clinicName={clinicName}
          isExporting={isLoading}
        />
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
            <p className="text-gray-600">Carregando registros de auditoria...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-red-900">Erro ao carregar auditoria</h3>
            <p className="text-sm text-red-700 mt-1">{error.message}</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredLogs.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-600 mb-2">Nenhum registro de auditoria encontrado</p>
          <p className="text-sm text-gray-500">
            {filters.operationType || filters.dateFrom || filters.searchText
              ? 'Tente ajustar os filtros'
              : 'Os registros aparecem aqui quando há mudanças de agendamentos'}
          </p>
        </div>
      )}

      {/* Audit History Viewer */}
      {!isLoading && !error && filteredLogs.length > 0 && (
        <AuditHistoryViewer 
          appointmentId={appointmentId || ''} 
          limit={limit}
          className="mt-6"
        />
      )}

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
        <p className="font-semibold mb-2">💡 Dicas de Uso:</p>
        <ul className="space-y-1 text-blue-800">
          <li>• Use filtros para encontrar mudanças específicas</li>
          <li>• Exporte relatórios em CSV, JSON ou HTML para análise detalhada</li>
          <li>• Arquive registros antigos para melhorar a performance</li>
          <li>• Todos os dados são criptografados e seguros no Supabase</li>
        </ul>
      </div>
    </div>
  );
};

export default AdvancedAuditViewer;
