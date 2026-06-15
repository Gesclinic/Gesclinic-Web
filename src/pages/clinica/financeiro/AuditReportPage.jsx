import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getFeeChangesByClinic } from '@/lib/processorFeeValidations';
import { supabase } from '@/lib/customSupabaseClient';

export default function AuditReportPage() {
  const { isAuthenticated } = useAuth();
  const { clinicId } = useClinicContext();

  const [auditRecords, setAuditRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filtros
  const [dateStart, setDateStart] = useState(
    format(startOfMonth(new Date()), 'yyyy-MM-dd')
  );
  const [dateEnd, setDateEnd] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [actionFilter, setActionFilter] = useState('all'); // 'all' = todos
  const [expandedId, setExpandedId] = useState(null);

  /**
   * Carregar registros de auditoria
   */
  useEffect(() => {
    if (isAuthenticated && clinicId) {
      loadAuditRecords();
    }
  }, [isAuthenticated, clinicId]);

  async function loadAuditRecords() {
    try {
      setLoading(true);
      setError('');

      // Calcular dias entre as datas
      const start = parseISO(dateStart);
      const end = parseISO(dateEnd);
      const daysApart = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      const days = daysApart > 0 ? daysApart : 30;

      // Buscar registros via RPC ou query direta
      const { data, error: queryError } = await supabase
        .from('fee_audit_log')
        .select('*')
        .eq('clinic_id', clinicId)
        .gte('changed_at', dateStart + 'T00:00:00')
        .lte('changed_at', dateEnd + 'T23:59:59')
        .order('changed_at', { ascending: false });

      if (queryError) {
        throw new Error('Erro ao carregar registros: ' + queryError.message);
      }

      let records = data || [];

      // Aplicar filtro de ação
      if (actionFilter && actionFilter !== 'all') {
        records = records.filter((r) => r.action === actionFilter);
      }

      setAuditRecords(records);
    } catch (err) {
      console.error('❌ [loadAuditRecords] Erro:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Exportar para CSV
   */
  function exportToCSV() {
    const headers = [
      'Data/Hora',
      'Ação',
      'Taxa ID',
      'Usuário',
      'Motivo',
      'Valores Anteriores',
      'Valores Novos',
    ];

    const rows = auditRecords.map((record) => [
      format(parseISO(record.changed_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR }),
      record.action.toUpperCase(),
      record.fee_id || '-',
      record.changed_by || 'Sistema',
      record.change_reason || '-',
      record.old_values ? JSON.stringify(JSON.parse(record.old_values)) : '',
      JSON.stringify(JSON.parse(record.new_values)),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row
          .map((cell) => {
            // Escapar aspas e quebras de linha
            const escaped = String(cell).replace(/"/g, '""');
            return `"${escaped}"`;
          })
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `auditoria-taxas-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`
    );
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Calcular estatísticas
   */
  const stats = {
    total: auditRecords.length,
    creates: auditRecords.filter((r) => r.action === 'create').length,
    updates: auditRecords.filter((r) => r.action === 'update').length,
    deletes: auditRecords.filter((r) => r.action === 'delete').length,
  };

  /**
   * Obter badge de ação
   */
  const getActionBadge = (action) => {
    const badges = {
      create: { label: '✨ Criado', color: 'bg-green-100 text-green-800' },
      update: { label: '✏️ Alterado', color: 'bg-blue-100 text-blue-800' },
      delete: { label: '🗑️ Deletado', color: 'bg-red-100 text-red-800' },
    };
    return badges[action] || { label: action, color: 'bg-gray-100 text-gray-800' };
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📊 Auditoria de Taxas</h1>
          <p className="text-gray-600 mt-2">Visualize e exporte o histórico de alterações</p>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Filtros</h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Data Inicial */}
            <div>
              <Label htmlFor="dateStart" className="text-sm font-medium">
                Data Inicial
              </Label>
              <Input
                id="dateStart"
                type="date"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Data Final */}
            <div>
              <Label htmlFor="dateEnd" className="text-sm font-medium">
                Data Final
              </Label>
              <Input
                id="dateEnd"
                type="date"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Filtro de Ação */}
            <div>
              <Label htmlFor="actionFilter" className="text-sm font-medium">
                Tipo de Ação
              </Label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger id="actionFilter" className="mt-1">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as ações</SelectItem>
                  <SelectItem value="create">✨ Criações</SelectItem>
                  <SelectItem value="update">✏️ Alterações</SelectItem>
                  <SelectItem value="delete">🗑️ Deleções</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Botões */}
            <div className="flex items-end gap-2">
              <Button
                onClick={loadAuditRecords}
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {loading ? 'Carregando...' : 'Filtrar'}
              </Button>
              <Button
                onClick={exportToCSV}
                disabled={auditRecords.length === 0}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                CSV
              </Button>
            </div>
          </div>
        </div>

        {/* Estatísticas */}
        {auditRecords.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="bg-green-50 rounded-lg shadow p-4 border border-green-200">
              <p className="text-sm text-green-700">Criações</p>
              <p className="text-2xl font-bold text-green-900">{stats.creates}</p>
            </div>
            <div className="bg-blue-50 rounded-lg shadow p-4 border border-blue-200">
              <p className="text-sm text-blue-700">Alterações</p>
              <p className="text-2xl font-bold text-blue-900">{stats.updates}</p>
            </div>
            <div className="bg-red-50 rounded-lg shadow p-4 border border-red-200">
              <p className="text-sm text-red-700">Deleções</p>
              <p className="text-2xl font-bold text-red-900">{stats.deletes}</p>
            </div>
            <div className="bg-purple-50 rounded-lg shadow p-4 border border-purple-200">
              <p className="text-sm text-purple-700">Período</p>
              <p className="text-xs font-semibold text-purple-900 truncate">
                {dateStart} a {dateEnd}
              </p>
            </div>
          </div>
        )}

        {/* Mensagem de Erro */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Tabela de Registros */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-200 border-t-blue-600"></div>
              <span className="ml-3 text-gray-600">Carregando registros...</span>
            </div>
          ) : auditRecords.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">Nenhum registro encontrado para este período</p>
            </div>
          ) : (
            <div className="divide-y">
              {auditRecords.map((record) => {
                const isExpanded = expandedId === record.id;
                const badge = getActionBadge(record.action);

                return (
                  <div key={record.id} className="hover:bg-gray-50 transition">
                    {/* Header - colapsável */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : record.id)}
                      className="w-full px-6 py-4 flex items-center gap-4 text-left"
                    >
                      <div className="flex-shrink-0">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-600" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-600" />
                        )}
                      </div>

                      <span className={`px-2 py-1 rounded text-xs font-semibold ${badge.color}`}>
                        {badge.label}
                      </span>

                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {format(parseISO(record.changed_at), "dd 'de' MMMM 'às' HH:mm", {
                            locale: ptBR,
                          })}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {record.change_reason || 'Sem motivo registrado'}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm text-gray-900 font-medium">
                          Taxa {record.fee_id?.substring(0, 8)}...
                        </p>
                        <p className="text-xs text-gray-500">
                          Usuário: {record.changed_by?.substring(0, 8) || 'Sistema'}
                        </p>
                      </div>
                    </button>

                    {/* Detalhes expandidos */}
                    {isExpanded && (
                      <div className="border-t px-6 py-4 bg-gray-50 space-y-4">
                        {/* Metadados */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-xs text-gray-600">ID da Taxa</p>
                            <p className="text-xs font-mono text-gray-900">{record.fee_id}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">ID do Usuário</p>
                            <p className="text-xs font-mono text-gray-900">
                              {record.changed_by || 'Sistema'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Tipo de Ação</p>
                            <p className="text-xs font-medium text-gray-900">{record.action}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Timestamp</p>
                            <p className="text-xs font-mono text-gray-900">{record.changed_at}</p>
                          </div>
                        </div>

                        {/* Valores */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-semibold text-gray-700 mb-2">
                              Valores Anteriores
                            </p>
                            <pre className="bg-white p-3 rounded border border-gray-300 text-xs overflow-x-auto">
                              {record.old_values
                                ? JSON.stringify(JSON.parse(record.old_values), null, 2)
                                : '(novo)'}
                            </pre>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-700 mb-2">
                              Valores Novos
                            </p>
                            <pre className="bg-white p-3 rounded border border-gray-300 text-xs overflow-x-auto">
                              {JSON.stringify(JSON.parse(record.new_values), null, 2)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
