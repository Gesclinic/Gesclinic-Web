import React, { useState, useEffect } from 'react';
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
  const { clinicId, currentRole } = useAuth();
  const { clinic } = useClinicContext();
  const navigate = useNavigate();
  
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

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedLogs = filteredLogs.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  
  // Calculate filtered percentage
  const filteredPercentage = logs.length > 0 ? Math.round((filteredLogs.length / logs.length) * 100) : 100;

  const breadcrumbs = [
    { label: clinic?.name || 'Clínica', href: '/clinica/dashboard' },
    { label: 'Auditoria', href: '/clinica/auditoria' },
  ];

  return (
    <PageLayout title="Auditoria de Agendamentos" breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  <Select value={filtroClinica || ''} onValueChange={setFiltroClinica}>
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
                  className="w-full"
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead></TableHead>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Profissional</TableHead>
                    <TableHead>Realizado por</TableHead>
                    <TableHead>Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLogs.map((log) => (
                    <TableRow key={log.id} className={`hover:bg-gray-50 ${log.action_type === 'DELETED' ? 'bg-red-50' : ''}`}>
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
                      <TableCell className="text-sm">
                        {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
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
                      <TableCell className="text-sm">
                        {log.appointment_id ? (
                          <button
                            onClick={() => navigate(`/clinica/agenda?appointmentId=${log.appointment_id}`)}
                            className="text-blue-600 hover:text-blue-800 hover:underline font-medium cursor-pointer"
                            title="Ver agendamento"
                          >
                            {log.patient?.name || '-'}
                          </button>
                        ) : (
                          log.patient?.name || '-'
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.professional?.name || '-'}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {log.performed_by ? log.performed_by.substring(0, 8) : 'Sistema'}
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                          {AUDIT_ROLE_LABELS[log.performed_by_role] || AUDIT_ROLE_LABELS[log.performed_by_role?.toLowerCase()] || log.performed_by_role || 'Sistema'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  ← Anterior
                </Button>
                
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="w-8"
                      >
                        {page}
                      </Button>
                    );
                  })}
                  {totalPages > 5 && <span className="text-xs text-gray-500">... até {totalPages}</span>}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
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
          <div className="flex gap-2 border-b border-gray-200">
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
          </div>

          {/* Tab Content */}
          {activeTab === 'reports' && <ReportsPanel logs={filteredLogs} />}
          {activeTab === 'alerts' && <AlertsCenter logs={filteredLogs} onAlertsChange={setAlerts} />}
          {activeTab === 'comparison' && <ComparisonPanel logs={logs} />}
          {activeTab === 'useraudit' && <UserAuditPanel />}
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
