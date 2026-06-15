import React, { useState, useEffect, Suspense, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
import { listAuditLogs, getAuditSummary, AUDIT_ACTION_TYPES, AUDIT_ACTION_LABELS, AUDIT_ROLE_LABELS } from '@/lib/auditApi';
import { exportAuditLogsToCSV, exportAuditLogsToPDF, exportLogDetails } from '@/lib/exportApi';
import { AuditLogDetailsModal } from './AuditLogDetailsModal';
import { AuditTrendChart } from './AuditTrendChart';
import { ReportsPanel } from './components/ReportsPanel';
import { AlertsCenter, AlertBadge } from './components/AlertsCenter';
import { ComparisonPanel } from './components/ComparisonPanel';
import { UserAuditPanel, logUserEvent } from './components/UserAuditPanel';
import { runAllAlertChecks, saveAlertsToStorage } from './components/AlertEngine';
import { AlertSettingsPanel } from './components/AlertSettingsPanel';
import { AdvancedExportPanel } from './components/AdvancedExportPanel';
import { useAuditRealtimeSync } from './hooks/useAuditRealtimeSync';
import { AuditMigrationManager } from './components/AuditMigrationManager';

// Lazy load heavy components for performance
const LazyReportsPanel = React.lazy(() => import('./components/ReportsPanel').then(m => ({ default: m.ReportsPanel })));
const LazyAlertsCenter = React.lazy(() => import('./components/AlertsCenter').then(m => ({ default: m.AlertsCenter })));
const LazyComparisonPanel = React.lazy(() => import('./components/ComparisonPanel').then(m => ({ default: m.ComparisonPanel })));
const LazyUserAuditPanel = React.lazy(() => import('./components/UserAuditPanel').then(m => ({ default: m.UserAuditPanel })));
const LazyAdvancedExportPanel = React.lazy(() => import('./components/AdvancedExportPanel').then(m => ({ default: m.AdvancedExportPanel })));
const LazyAlertSettingsPanel = React.lazy(() => import('./components/AlertSettingsPanel').then(m => ({ default: m.AlertSettingsPanel })));

// Loading fallback component
const TabLoadingFallback = () => (
  <div className="flex items-center justify-center py-12">
    <div className="text-gray-500">Carregando...</div>
  </div>
);
import PageLayout from '@/components/ui/PageLayout';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';

export default function AuditoriaPage() {
  const { clinicId, currentRole, user } = useAuth();
  const { clinic } = useClinicContext();
  const navigate = useNavigate();
  const { subscribeToAllAuditData } = useAuditRealtimeSync(clinicId);

  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [dateRange, setDateRange] = useState('7d');
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroClinica, setFiltroClinica] = useState(clinicId);

  // Pagination with localStorage persistence
  const [currentPage, setCurrentPage] = useState(() => {
    const saved = localStorage.getItem('audit_currentPage');
    return saved ? parseInt(saved, 10) : 1;
  });
  const ITEMS_PER_PAGE = 20;

  // Toast & Notifications
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState('info');
  const showToast = (msg, type = 'info') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Modal
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  // Wave 3 Features
  const [alerts, setAlerts] = useState([]);
  const [activeTab, setActiveTab] = useState('logs'); // logs | reports | alerts | comparison | useraudit

  // Load audit data
  useEffect(() => {
    if (!clinicId) return;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Calculate date range
        const now = new Date();
        let startDate;

        switch (dateRange) {
          case '24h':
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
          case '7d':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case '30d':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case '90d':
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
          default:
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        }

        // Fetch logs (without actionType filter - we'll filter locally)
        const logsData = await listAuditLogs({
          clinicId,
          startDate: startDate.toISOString(),
          limit: 500,
        });

        setLogs(logsData);

        // Fetch summary
        const summaryData = await getAuditSummary(clinicId, dateRange);
        setSummary(summaryData);
      } catch (err) {
        console.error('Error loading audit data:', err);
        setError('Erro ao carregar dados de auditoria');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [clinicId, dateRange]);

  // Filter logs by search term, action type, and clinic
  const filteredLogs = logs.filter(log => {
    // Filter by action type
    if (actionFilter && log.action_type !== actionFilter) return false;

    // Filter by clinic
    if (filtroClinica !== 'todas' && log.clinic_id !== filtroClinica) return false;

    // Filter by search term
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      log.patient?.name?.toLowerCase().includes(term) ||
      log.professional?.name?.toLowerCase().includes(term) ||
      log.appointment_id?.toLowerCase().includes(term)
    );
  });

  // Persist currentPage to localStorage
  useEffect(() => {
    localStorage.setItem('audit_currentPage', currentPage.toString());
  }, [currentPage]);

  // Analytics: Track deletion patterns
  useEffect(() => {
    const deletedLogs = logs.filter(log => log.action_type === 'DELETED');
    if (deletedLogs.length > 0) {
      // Store analytics in localStorage
      const analytics = JSON.parse(localStorage.getItem('audit_analytics') || '{}');
      analytics.deletionCount = (analytics.deletionCount || 0) + 1;
      analytics.lastDeletion = new Date().toISOString();
      analytics.deletionsByRole = analytics.deletionsByRole || {};
      const latestDeleted = deletedLogs[0];
      const role = latestDeleted.performed_by_role || 'system';
      analytics.deletionsByRole[role] = (analytics.deletionsByRole[role] || 0) + 1;
      localStorage.setItem('audit_analytics', JSON.stringify(analytics));

      // Show toast notification
      showToast(`⚠️ Deletado: ${latestDeleted.patient?.name || 'Agendamento'}`, 'danger');
    }
  }, [logs.length]);

  // Realtime sync for critical deletions
  useEffect(() => {
    if (!clinicId) return;

    // Subscribe to realtime changes using new Supabase API
    const channel = supabase.channel('audit_deletions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointment_audit_logs',
          filter: `clinic_id=eq.${clinicId}`
        },
        (payload) => {
          if (payload.new?.action_type === 'DELETED') {
            showToast(`🔴 SINCRONIZAÇÃO: Deletado em tempo real - ${payload.new?.patient?.name || 'Agendamento'}`, 'danger');
            console.error('🔴 CRITICAL DELETION DETECTED:', payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [clinicId]);

  // Wave 3: Alert Engine
  useEffect(() => {
    if (logs.length === 0) return;

    const generatedAlerts = runAllAlertChecks(logs);
    setAlerts(generatedAlerts);
    saveAlertsToStorage(generatedAlerts);
  }, [logs.length]);

  // Option 5: Setup realtime sync for audit data
  useEffect(() => {
    if (!clinicId || !user?.id) return;

    const unsubscribe = subscribeToAllAuditData({
      onNewAlert: (alert) => {
        console.log('📢 New alert received via Realtime:', alert);
        // Alerts will be loaded from Supabase on next refresh
      },
      onAlertDeleted: (alertId) => {
        console.log('🗑️ Alert deleted via Realtime:', alertId);
      },
      onNewEvent: (event) => {
        console.log('👤 New user event via Realtime:', event);
      },
      onNewReport: (report) => {
        console.log('📊 New report via Realtime:', report);
      },
      onReportUpdated: (report) => {
        console.log('🔄 Report updated via Realtime:', report);
      },
    });

    return unsubscribe;
  }, [clinicId, user?.id, subscribeToAllAuditData]);

  // Option 5: Silent migration of localStorage data to Supabase (automatic, no UI)
  useEffect(() => {
    // Check if already migrated in this session
    const migrationCompleted = localStorage.getItem('audit_migration_completed');
    if (migrationCompleted === 'true') {
      console.log('✅ [useEffect] Migration already completed in this session');
      return;
    }

    console.log('🔍 [useEffect] Check trigger - clinicId:', clinicId);

    if (!clinicId) {
      console.log('⏭️ [useEffect] clinicId not available yet, will retry');
      return; // Will retry when clinicId updates
    }

    // Run migration silently in background
    const runSilentMigration = async () => {
      try {
        // Tentar usar user.id, ou fallback para localStorage session data
        let userId = user?.id;
        if (!userId) {
          const savedSession = localStorage.getItem('gesclinic_session');
          if (savedSession) {
            try {
              const sessionData = JSON.parse(savedSession);
              userId = sessionData.user_id;
              console.log('ℹ️ [Background] Using user_id from localStorage:', userId);
            } catch (e) {
              console.warn('⚠️ [Background] Could not parse localStorage session');
            }
          }
        }

        if (!userId) {
          console.warn('❌ [Background] Cannot run migration - no user_id available');
          return;
        }

        console.log('🔄 [Background] Starting silent audit data migration... clinicId:', clinicId, 'userId:', userId);
        const result = await AuditMigrationManager.runAllMigrations(clinicId, userId);

        if (result.success) {
          console.log(`✅ [Background] Migration successful! Migrated ${result.totalMigrated} items`);
          localStorage.setItem('audit_migration_completed', 'true');
        } else {
          console.warn('⚠️ [Background] Migration failed or tables not ready yet. Will retry on next page load.');
        }
      } catch (err) {
        console.error('❌ [Background] Migration error:', err);
        // Don't set flag - allow retry on next load
      }
    };

    // Delay migration by 2 seconds to let page load first
    const timer = setTimeout(runSilentMigration, 2000);
    return () => clearTimeout(timer);
  }, [clinicId]);

  // Pagination with memoization for performance
  const totalPages = useMemo(() => Math.ceil(filteredLogs.length / ITEMS_PER_PAGE), [filteredLogs.length]);

  const paginatedLogs = useMemo(() => {
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredLogs.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  }, [filteredLogs, currentPage]);

  // Calculate filtered percentage (memoized)
  const filteredPercentage = useMemo(() =>
    logs.length > 0 ? Math.round((filteredLogs.length / logs.length) * 100) : 100,
    [logs.length, filteredLogs.length]
  );

  // Calculate page numbers to display (memoized)
  const displayPageNumbers = useMemo(() => {
    const maxPages = 5;
    if (totalPages <= maxPages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const half = Math.floor(maxPages / 2);
    const start = Math.max(1, currentPage - half);
    const end = Math.min(totalPages, start + maxPages - 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [totalPages, currentPage]);

  // Memoized callback for page change
  const goToPage = useCallback((page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const breadcrumbs = [
    { label: clinic?.name || 'Clínica', href: '/clinica/dashboard' },
    { label: 'Auditoria', href: '/clinica/auditoria' },
  ];

  return (
    <PageLayout title="Auditoria de Agendamentos" breadcrumbs={breadcrumbs}>
      <div className="space-y-6 px-2 md:px-0">
        {/* Summary Cards - Responsive */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <Card className="p-4">
              <div className="text-sm text-gray-600">Total de Ações</div>
              <div className="text-2xl font-bold">{summary.totalActions}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-gray-600">Criados</div>
              <div className="text-2xl font-bold text-green-600">{summary.byActionType.CREATED}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-gray-600">Atualizados</div>
              <div className="text-2xl font-bold text-blue-600">{summary.byActionType.UPDATED}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-gray-600">Deletados</div>
              <div className="text-2xl font-bold text-red-600">{summary.byActionType.DELETED}</div>
            </Card>
          </div>
        )}

        {/* Trend Charts */}
        {!loading && !error && filteredLogs.length > 0 && (
          <AuditTrendChart logs={filteredLogs} />
        )}

        {/* Exportação com Indicador Filtrado */}
        <div className="flex gap-2 justify-between items-center">
          <div className="text-xs text-gray-600">
            {filteredLogs.length !== logs.length && (
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-semibold">
                📊 {filteredLogs.length} de {logs.length} registros filtrados ({filteredPercentage}%)
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                exportAuditLogsToCSV(filteredLogs);
                showToast(`📥 CSV com ${filteredLogs.length} registros exportado`, 'success');
              }}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              📥 Exportar CSV
            </Button>
            <Button
              onClick={() => {
                exportAuditLogsToPDF(filteredLogs);
                showToast(`📄 PDF com ${filteredLogs.length} registros exportado`, 'success');
              }}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              📄 Exportar PDF
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Filtros</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <div>
                <label className="text-xs font-medium text-gray-700 mb-2 block">
                  Período
                </label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24h">Últimas 24h</SelectItem>
                    <SelectItem value="7d">Últimos 7 dias</SelectItem>
                    <SelectItem value="30d">Últimos 30 dias</SelectItem>
                    <SelectItem value="90d">Últimos 90 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 mb-2 block">
                  Tipo de Ação
                </label>
                <Select value={actionFilter || 'all'} onValueChange={(val) => setActionFilter(val === 'all' ? '' : val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as ações" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as ações</SelectItem>
                    <SelectItem value="CREATED">Criados</SelectItem>
                    <SelectItem value="UPDATED">Atualizados</SelectItem>
                    <SelectItem value="DELETED">Deletados</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(currentRole === 'admin' || currentRole === 'gestor') && (
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-2 block">
                    Clínica
                  </label>
                  <Select value={String(filtroClinica || clinicId)} onValueChange={setFiltroClinica}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione clínica" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={clinicId}>Clínica Atual</SelectItem>
                      <SelectItem value="todas">Todas as Clínicas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-gray-700 mb-2 block">
                  Buscar (Paciente/Profissional)
                </label>
                <Input
                  placeholder="Digite para buscar..."
                  value={searchTerm}
                  onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}}
                  className="w-full text-sm"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Logs Table */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-4">Histórico de Alterações</h3>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">Carregando...</div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              {error}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">Nenhum registro encontrado</div>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 md:mx-0">
              <div className="inline-block min-w-full px-4 md:px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead className="hidden md:table-cell whitespace-nowrap">Data/Hora</TableHead>
                      <TableHead className="whitespace-nowrap">Ação</TableHead>
                      <TableHead className="hidden sm:table-cell whitespace-nowrap">Paciente</TableHead>
                      <TableHead className="hidden lg:table-cell whitespace-nowrap">Profissional</TableHead>
                      <TableHead className="hidden lg:table-cell text-xs">Por</TableHead>
                      <TableHead className="hidden md:table-cell text-xs">Role</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedLogs.map((log) => (
                      <TableRow key={log.id} className={`hover:bg-gray-50 text-xs md:text-sm ${log.action_type === 'DELETED' ? 'bg-red-50' : ''}`}>
                        <TableCell className="text-center">
                          <button
                            onClick={() => {
                              setSelectedLog(log);
                              setDetailsModalOpen(true);
                            }}
                            className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                            title="Ver detalhes"
                          >
                            ➜
                          </button>
                        </TableCell>
                        <TableCell className="hidden md:table-cell whitespace-nowrap text-xs">
                          {format(new Date(log.created_at), 'dd/MM HH:mm', { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold inline-block ${
                              log.action_type === 'CREATED'
                                ? 'bg-green-100 text-green-800'
                                : log.action_type === 'UPDATED'
                                ? 'bg-blue-100 text-blue-800'
                                : log.action_type === 'DELETED'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {AUDIT_ACTION_LABELS[log.action_type] || log.action_type}
                          </span>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-xs">
                          {log.appointment_id ? (
                            <button
                              onClick={() => navigate(`/clinica/agenda?appointmentId=${log.appointment_id}`)}
                              className="text-blue-600 hover:text-blue-800 hover:underline font-medium cursor-pointer truncate max-w-[100px] md:max-w-none"
                              title="Ver agendamento"
                            >
                              {log.patient?.name || '-'}
                            </button>
                          ) : (
                            <span className="truncate max-w-[100px] md:max-w-none">{log.patient?.name || '-'}</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-xs">
                          {log.professional?.name || '-'}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-xs text-gray-500">
                          {log.performed_by ? log.performed_by.substring(0, 6) : 'Sist'}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs">
                          <span className="bg-gray-100 px-2 py-1 rounded text-xs inline-block">
                            {AUDIT_ROLE_LABELS[log.performed_by_role]?.substring(0, 4) || AUDIT_ROLE_LABELS[log.performed_by_role?.toLowerCase()]?.substring(0, 4) || log.performed_by_role?.substring(0, 4) || 'Sist'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <div className="mt-4 space-y-4">
            <div className="text-xs text-gray-500">
              Mostrando {paginatedLogs.length} de {filteredLogs.length} registros (página {currentPage} de {totalPages || 1})
              {filteredLogs.length !== logs.length && (
                <span className="ml-2 text-blue-600 font-semibold">
                  [Filtrados: {filteredPercentage}%]
                </span>
              )}
            </div>

            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="w-full sm:w-auto text-xs md:text-sm"
                >
                  ← Anterior
                </Button>

                <div className="flex gap-1 flex-wrap justify-center">
                  {currentPage > 3 && totalPages > 5 && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(1)}
                        className="w-8 h-8 p-0 text-xs"
                      >
                        1
                      </Button>
                      <span className="text-xs text-gray-500 flex items-center">...</span>
                    </>
                  )}
                  {displayPageNumbers.map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => goToPage(page)}
                      className="w-8 h-8 p-0 text-xs"
                    >
                      {page}
                    </Button>
                  ))}
                  {currentPage < totalPages - 2 && totalPages > 5 && (
                    <>
                      <span className="text-xs text-gray-500 flex items-center">...</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(totalPages)}
                        className="w-8 h-8 p-0 text-xs"
                      >
                        {totalPages}
                      </Button>
                    </>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="w-full sm:w-auto text-xs md:text-sm"
                >
                  Próximo →
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Details Modal */}
        <AuditLogDetailsModal
          log={selectedLog}
          isOpen={detailsModalOpen}
          onOpenChange={setDetailsModalOpen}
        />

        {/* Wave 3 Features Tabs */}
        <div className="mt-8 space-y-4">
          <div className="flex gap-2 border-b border-gray-200 flex-wrap">
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-4 py-2 font-semibold border-b-2 ${
                activeTab === 'logs'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              📋 Logs
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-4 py-2 font-semibold border-b-2 ${
                activeTab === 'reports'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              📊 Relatórios
            </button>
            <button
              onClick={() => setActiveTab('alerts')}
              className={`px-4 py-2 font-semibold border-b-2 relative ${
                activeTab === 'alerts'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              🔔 Alertas
              {alerts.length > 0 && (
                <span className="absolute top-0 right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {alerts.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('comparison')}
              className={`px-4 py-2 font-semibold border-b-2 ${
                activeTab === 'comparison'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              🔄 Comparação
            </button>
            <button
              onClick={() => setActiveTab('useraudit')}
              className={`px-4 py-2 font-semibold border-b-2 ${
                activeTab === 'useraudit'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              👥 Usuários
            </button>
            <button
              onClick={() => setActiveTab('export')}
              className={`px-4 py-2 font-semibold border-b-2 ${
                activeTab === 'export'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              📥 Exportação
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 font-semibold border-b-2 ${
                activeTab === 'settings'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              ⚙️ Configurações
            </button>
          </div>

          {/* Tab Content - Lazy Loaded */}
          {activeTab === 'reports' && (
            <Suspense fallback={<TabLoadingFallback />}>
              <LazyReportsPanel logs={filteredLogs} />
            </Suspense>
          )}
          {activeTab === 'alerts' && (
            <Suspense fallback={<TabLoadingFallback />}>
              <LazyAlertsCenter logs={filteredLogs} onAlertsChange={setAlerts} />
            </Suspense>
          )}
          {activeTab === 'comparison' && (
            <Suspense fallback={<TabLoadingFallback />}>
              <LazyComparisonPanel logs={logs} />
            </Suspense>
          )}
          {activeTab === 'useraudit' && (
            <Suspense fallback={<TabLoadingFallback />}>
              <LazyUserAuditPanel />
            </Suspense>
          )}
          {activeTab === 'export' && (
            <Suspense fallback={<TabLoadingFallback />}>
              <LazyAdvancedExportPanel logs={filteredLogs} />
            </Suspense>
          )}
          {activeTab === 'settings' && (
            <Suspense fallback={<TabLoadingFallback />}>
              <LazyAlertSettingsPanel />
            </Suspense>
          )}
        </div>

        {/* Toast Notifications */}
        {toastMessage && (
          <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg font-semibold text-white animate-pulse ${
            toastType === 'success' ? 'bg-green-500' :
            toastType === 'danger' ? 'bg-red-500' :
            toastType === 'warning' ? 'bg-yellow-500' :
            'bg-blue-500'
          }`}>
            {toastMessage}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
