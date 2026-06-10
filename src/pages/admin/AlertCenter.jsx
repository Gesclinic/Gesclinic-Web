// src/pages/admin/AlertCenter.jsx
// Central de Alertas - Gerenciar, visualizar e configurar alertas financeiros

import React, { useState, useEffect } from 'react';
import {
  Bell,
  Settings,
  X,
  AlertCircle,
  AlertTriangle,
  AlertOctagon,
  Check,
  Trash2,
  Download,
  Filter,
  Clock,
  Zap,
  Edit,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
import alertsApi from '@/lib/financeiro/alertsApi';
import notificationsApi from '@/lib/financeiro/notificationsApi';
import { useInitializeAlertConfigs } from '@/hooks/useInitializeAlertConfigs';
import './AlertCenter.css';

// Componente para ícone de informação com tooltip
function AlertInfoIcon({ explanation }) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      style={{
        position: 'relative',
        display: 'inline-block',
        cursor: 'help',
        marginLeft: '4px',
      }}
    >
      <HelpCircle
        className="w-4 h-4"
        style={{
          color: '#0066cc',
          opacity: 0.7,
        }}
      />
      {showTooltip && (
        <div
          style={{
            position: 'absolute',
            backgroundColor: '#333',
            color: '#fff',
            padding: '10px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            whiteSpace: 'normal',
            width: '200px',
            bottom: '125%',
            left: '-80px',
            zIndex: 1000,
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            lineHeight: '1.4',
            textAlign: 'center',
          }}
        >
          {explanation}
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              marginLeft: '-5px',
              borderWidth: '5px',
              borderStyle: 'solid',
              borderColor: '#333 transparent transparent transparent',
            }}
          />
        </div>
      )}
    </div>
  );
}

export default function AlertCenter() {
  const { user } = useAuth();
  const { clinicId, loadingClinic } = useClinicContext();

  // Mapa de tradução dos tipos de alerta
  const alertTypeTranslations = {
    DELINQUENCY: 'Inadimplência',
    REPAYMENT_LATE: 'Repasse Atrasado',
    LOW_CASHFLOW: 'Fluxo de Caixa Baixo',
    COLLECTION_LOW: 'Coleta Baixa',
  };

  // Explicações de cada tipo de alerta (para tooltip)
  const alertExplanations = {
    DELINQUENCY: 'Monitora contas a receber com atraso. Dispara quando há clientes/convênios inadimplentes por mais dias que a meta.',
    REPAYMENT_LATE: 'Rastreia repasses de médicos/profissionais atrasados. Alerta quando o repasse não foi processado no prazo contratado.',
    LOW_CASHFLOW: 'Avalia o fluxo de caixa disponível nos próximos dias. Alerta quando previsão indica insuficiência de recursos.',
    COLLECTION_LOW: 'Monitora taxa de recebimento (quanto foi recebido vs. faturado). Alerta quando taxa cai abaixo da meta (25%).',
  };

  const getSeverityLabel = (severity) => {
    const severityMap = {
      CRITICAL: 'Crítico',
      HIGH: 'Alto',
      MEDIUM: 'Médio',
      LOW: 'Baixo',
    };
    return severityMap[severity] || severity;
  };

  const getAlertTypeLabel = (alertType) => {
    return alertTypeTranslations[alertType] || alertType;
  };

  const getFrequencyLabel = (frequency) => {
    const frequencyMap = {
      DAILY: 'Diariamente',
      WEEKLY: 'Semanalmente',
      MONTHLY: 'Mensalmente',
      HOURLY: 'A cada hora',
      REAL_TIME: 'Tempo real',
    };
    return frequencyMap[frequency] || frequency;
  };

  // Retorna label e unidade corretos para threshold_value baseado no tipo de alerta
  const getThresholdLabel = (alertType) => {
    const thresholdMap = {
      COLLECTION_LOW: {
        label: 'Meta de Recebimento',
        unit: '%',
        description: 'Taxa mínima de recebimento (Ex: 25%)',
      },
      DELINQUENCY: {
        label: 'Prazo de Inadimplência',
        unit: 'dias',
        description: 'Número máximo de dias em atraso (Ex: 5 dias)',
      },
      REPAYMENT_LATE: {
        label: 'Prazo Contratado',
        unit: 'horas',
        description: 'Número de horas para repasse estar atrasado (Ex: 48 horas)',
      },
      LOW_CASHFLOW: {
        label: 'Limite Mínimo',
        unit: '%',
        description: 'Percentual mínimo de fluxo de caixa (Ex: 10%)',
      },
    };
    return thresholdMap[alertType] || {
      label: 'Meta',
      unit: '',
      description: 'Valor de limite para disparar o alerta',
    };
  };

  // Inicializar configurações de alertas automaticamente
  // useInitializeAlertConfigs(clinicId);

  // Estados
  const [activeTab, setActiveTab] = useState('active'); // active, history, settings
  const [alerts, setAlerts] = useState([]);
  const [alertHistory, setAlertHistory] = useState([]);
  const [alertConfigs, setAlertConfigs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [filters, setFilters] = useState({
    type: '',
    severity: '',
    startDate: '',
    endDate: '',
  });
  const [summary, setSummary] = useState({
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    TOTAL: 0,
  });

  // Estados para modal de edição
  const [editingConfig, setEditingConfig] = useState(null);
  const [editFormData, setEditFormData] = useState({
    threshold_value: '',
    severity_level: '',
    check_frequency: '',
    notify_channels: { email: false, sms: false, push: false, dashboard: false },
    email_recipients: '',
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Carregar dados
  useEffect(() => {
    if (clinicId && !loadingClinic) {
      loadAllData();

      // Recarregar a cada 60 segundos
      const interval = setInterval(loadAllData, 60000);
      return () => clearInterval(interval);
    }
  }, [clinicId, loadingClinic]);

  // Carregar configurações quando aba de settings é aberta
  useEffect(() => {
    console.log('🔔 [useEffect] activeTab mudou para:', activeTab);
    console.log('🔔 [useEffect] clinicId:', clinicId);
    console.log('🔔 [useEffect] loadingClinic:', loadingClinic);
    console.log('🔔 [useEffect] user?.id:', user?.id);

    if (activeTab === 'settings' && clinicId && !loadingClinic) {
      console.log('⏳ [AlertCenter useEffect] Carregando configurações...');
      loadConfigs();
    } else {
      console.log('⏸️ [AlertCenter useEffect] Condição não atendida:');
      console.log('   - activeTab === settings:', activeTab === 'settings');
      console.log('   - clinicId existe:', !!clinicId);
      console.log('   - !loadingClinic:', !loadingClinic);
    }
  }, [activeTab, clinicId, loadingClinic]);

  const loadConfigs = async () => {
    try {
      console.log('📋 [loadConfigs] Carregando configurações para clinicId:', clinicId);
      const configs = await alertsApi.listAlertConfigs(clinicId);
      console.log('📦 [loadConfigs] Configs recebidas:', configs);
      console.log('📊 [loadConfigs] Quantidade de configs:', configs?.length || 0);
      setAlertConfigs(configs);
      console.log('✅ [loadConfigs] Estado atualizado com configs');
    } catch (error) {
      console.error('❌ [loadConfigs] Erro ao carregar configurações:', error);
    }
  };

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      // Carregar alertas ativos
      const activeAlerts = await alertsApi.listActiveAlerts(clinicId);
      setAlerts(activeAlerts);

      // Carregar resumo
      const summary = await alertsApi.getAlertsSummary(clinicId);
      setSummary(summary);

      // Carregar histórico
      const history = await alertsApi.getAlertHistory(clinicId, { limit: 100 });
      setAlertHistory(history);

      // Carregar configurações
      const configs = await alertsApi.listAlertConfigs(clinicId);
      setAlertConfigs(configs);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolveAlert = async (alertId) => {
    try {
      await alertsApi.resolveAlert(alertId, user?.id);
      loadAllData();
    } catch (error) {
      console.error('Erro ao resolver alerta:', error);
    }
  };

  const handleDismissAlert = async (alertId) => {
    try {
      await alertsApi.dismissAlert(alertId, user?.id);
      loadAllData();
    } catch (error) {
      console.error('Erro ao descartar alerta:', error);
    }
  };

  const handleToggleConfig = async (configId, isEnabled) => {
    try {
      await alertsApi.toggleAlertConfig(configId, !isEnabled);
      loadAllData();
    } catch (error) {
      console.error('Erro ao atualizar config:', error);
    }
  };

  const openEditModal = (config) => {
    setEditingConfig(config);
    setEditFormData({
      threshold_value: config.threshold_value || '',
      severity_level: config.severity_level || 'MEDIUM',
      check_frequency: config.check_frequency || 'DAILY',
      notify_channels: config.notify_channels || { email: false, sms: false, push: false, dashboard: false },
      email_recipients: (config.email_recipients || []).join(', '),
    });
  };

  const closeEditModal = () => {
    setEditingConfig(null);
    setEditFormData({
      threshold_value: '',
      severity_level: '',
      check_frequency: '',
      notify_channels: { email: false, sms: false, push: false, dashboard: false },
      email_recipients: '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editingConfig) return;

    try {
      setIsSavingEdit(true);
      const emailArray = editFormData.email_recipients
        .split(',')
        .map(e => e.trim())
        .filter(e => e);

      await alertsApi.updateAlertConfig(editingConfig.id, {
        threshold_value: editFormData.threshold_value ? parseFloat(editFormData.threshold_value) : null,
        severity_level: editFormData.severity_level,
        check_frequency: editFormData.check_frequency,
        notify_channels: editFormData.notify_channels,
        email_recipients: emailArray,
      });

      console.log('✅ Configuração atualizada com sucesso!');

      // Disparar verificação de alertas com a nova configuração
      console.log('🔔 Disparando verificação de alertas com nova configuração...');
      await alertsApi.triggerAlertCheckWithConfigs(clinicId);

      closeEditModal();
      loadAllData();
    } catch (error) {
      console.error('❌ Erro ao salvar configuração:', error);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleExportAlerts = () => {
    const dataToExport = activeTab === 'active' ? alerts : alertHistory;
    const csv = convertToCSV(dataToExport);
    downloadCSV(csv, `alertas-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const convertToCSV = (data) => {
    const headers = ['Data', 'Tipo', 'Severidade', 'Título', 'Mensagem', 'Status'];
    const rows = data.map(alert => [
      new Date(alert.created_at).toLocaleString('pt-BR'),
      alert.alert_type,
      alert.severity,
      alert.title,
      alert.message,
      alert.status,
    ]);
    return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  };

  const downloadCSV = (csv, filename) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    link.click();
  };

  // Renderizar ícone de severidade
  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return <AlertOctagon className="w-5 h-5" />;
      case 'HIGH':
        return <AlertTriangle className="w-5 h-5" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  // Renderizar cor de severidade
  const getSeverityClass = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return 'severity-critical';
      case 'HIGH':
        return 'severity-high';
      case 'MEDIUM':
        return 'severity-medium';
      default:
        return 'severity-low';
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filters.type && alert.alert_type !== filters.type) return false;
    if (filters.severity && alert.severity !== filters.severity) return false;
    return true;
  });

  return (
    <div className="alert-center">
      {/* Header */}
      <div className="alert-center-header">
        <div className="header-content">
          <div className="header-title">
            <Bell className="w-8 h-8 text-blue-600" />
            <div>
              <h1>Central de Alertas</h1>
              <p>Monitore e gerencie alertas financeiros em tempo real</p>
            </div>
          </div>
          <button
            onClick={handleExportAlerts}
            className="btn btn-secondary"
            disabled={isLoading}
          >
            <Download className="w-4 h-4" />
            Exportar
          </button>
        </div>

        {/* Resumo de alertas */}
        <div className="alerts-summary">
          <div className="summary-card critical">
            <div className="summary-value">{summary.CRITICAL}</div>
            <div className="summary-label">Críticos</div>
          </div>
          <div className="summary-card high">
            <div className="summary-value">{summary.HIGH}</div>
            <div className="summary-label">Altos</div>
          </div>
          <div className="summary-card medium">
            <div className="summary-value">{summary.MEDIUM}</div>
            <div className="summary-label">Médios</div>
          </div>
          <div className="summary-card low">
            <div className="summary-value">{summary.LOW}</div>
            <div className="summary-label">Baixos</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="alert-center-tabs">
        <button
          className={`tab ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          <Zap className="w-4 h-4" />
          Alertas Ativos ({filteredAlerts.length})
        </button>
        <button
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <Clock className="w-4 h-4" />
          Histórico ({alertHistory.length})
        </button>
        <button
          className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <Settings className="w-4 h-4" />
          Configurações
        </button>
      </div>

      {/* Conteúdo */}
      <div className="alert-center-content">
        {activeTab === 'active' && (
          <div className="active-alerts-section">
            {/* Filtros */}
            <div className="filters-bar">
              <div className="filter-group">
                <label>Tipo de Alerta</label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                  className="filter-input"
                >
                  <option value="">Todos</option>
                  <option value="DELINQUENCY">Inadimplência</option>
                  <option value="REPAYMENT_LATE">Repasse Atrasado</option>
                  <option value="LOW_CASHFLOW">Fluxo de Caixa Baixo</option>
                  <option value="COLLECTION_LOW">Coleta Baixa</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Severidade</label>
                <select
                  value={filters.severity}
                  onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
                  className="filter-input"
                >
                  <option value="">Todos</option>
                  <option value="CRITICAL">Crítico</option>
                  <option value="HIGH">Alto</option>
                  <option value="MEDIUM">Médio</option>
                  <option value="LOW">Baixo</option>
                </select>
              </div>

              <button className="btn-filter" onClick={loadAllData}>
                <Filter className="w-4 h-4" />
                Limpar Filtros
              </button>
            </div>

            {/* Lista de alertas */}
            {isLoading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Carregando alertas...</p>
              </div>
            ) : filteredAlerts.length > 0 ? (
              <div className="alerts-list">
                {filteredAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`alert-card ${getSeverityClass(alert.severity)}`}
                    onClick={() => setSelectedAlert(selectedAlert?.id === alert.id ? null : alert)}
                  >
                    <div className="alert-card-header">
                      <div className="alert-icon">
                        {getSeverityIcon(alert.severity)}
                      </div>
                      <div className="alert-info">
                        <h3>{alert.title}</h3>
                        <p className="alert-type">{alert.alert_type}</p>
                      </div>
                      <div className="alert-time">
                        {notificationsApi.formatTimeAgo(alert.created_at)}
                      </div>
                    </div>

                    <p className="alert-message">{alert.message}</p>

                    {/* Ações */}
                    <div className="alert-actions">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResolveAlert(alert.id);
                        }}
                        className="btn-action resolve"
                        title="Resolver"
                      >
                        <Check className="w-4 h-4" />
                        Resolver
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDismissAlert(alert.id);
                        }}
                        className="btn-action dismiss"
                        title="Descartar"
                      >
                        <X className="w-4 h-4" />
                        Descartar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <Bell className="w-12 h-12 opacity-20" />
                <p>Nenhum alerta ativo</p>
                <span>Todos os alertas foram resolvidos ou descartados</span>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="history-section">
            {alertHistory.length > 0 ? (
              <div className="history-list">
                {alertHistory.slice(0, 50).map((alert) => (
                  <div key={alert.id} className={`history-item ${getSeverityClass(alert.severity)}`}>
                    <div className="history-item-main">
                      <div className="history-icon">
                        {getSeverityIcon(alert.severity)}
                      </div>
                      <div className="history-info">
                        <h4>{alert.title}</h4>
                        <p>{alert.message}</p>
                        <div className="history-meta">
                          <span className="badge">{alert.status}</span>
                          <span className="date">
                            {new Date(alert.created_at).toLocaleString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <Clock className="w-12 h-12 opacity-20" />
                <p>Sem histórico de alertas</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="settings-section">
            <h2>Configurações de Alertas</h2>

            {alertConfigs && alertConfigs.length > 0 ? (
              <>
                {alertConfigs.map((config) => (
                  <div key={config.id} className="config-card">
                    <div className="config-header">
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <h3 style={{ margin: 0 }}>{getAlertTypeLabel(config.alert_type)}</h3>
                          <AlertInfoIcon explanation={alertExplanations[config.alert_type]} />
                        </div>
                        <p>Severidade: {getSeverityLabel(config.severity_level)}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <button
                          className="edit-btn"
                          onClick={() => openEditModal(config)}
                          title="Editar configuração"
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '5px',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <Edit className="w-5 h-5" style={{ color: '#666' }} />
                        </button>
                        <label className="toggle">
                          <input
                            type="checkbox"
                            checked={config.is_enabled}
                            onChange={() => handleToggleConfig(config.id, config.is_enabled)}
                          />
                          <span></span>
                        </label>
                      </div>
                    </div>

                    {config.is_enabled && (
                      <div className="config-details">
                        <div className="detail-item">
                          <label>Verificação:</label>
                          <span>{getFrequencyLabel(config.check_frequency)}</span>
                        </div>
                        <div className="detail-item">
                          <label>Canais:</label>
                          <span>
                            {Object.entries(config.notify_channels || {})
                              .filter(([, enabled]) => enabled)
                              .map(([channel]) => channel)
                              .join(', ')}
                          </span>
                        </div>
                        <div className="detail-item">
                          <label>Destinatários Email:</label>
                          <span>{(config.email_recipients || []).join(', ') || 'Nenhum'}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Botão para testar alertas */}
                <div className="settings-actions">
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      alertsApi.triggerAlertCheckWithConfigs(clinicId);
                    }}
                  >
                    <Zap className="w-4 h-4" />
                    Verificar Alertas Agora
                  </button>
                </div>
              </>
            ) : (
              <div className="empty-state">
                <AlertCircle className="w-12 h-12" />
                <p>Nenhuma configuração de alertas</p>
                <span>Execute a migration SQL em Supabase para inicializar as configurações padrão</span>
                <button
                  className="btn btn-primary"
                  style={{ marginTop: '16px' }}
                  onClick={() => {
                    alertsApi.triggerAlertCheckWithConfigs(clinicId);
                  }}
                >
                  <Zap className="w-4 h-4" />
                  Disparar Verificação Manual
                </button>
              </div>
            )}
          </div>
        )}

        {/* Modal de Edição */}
        {editingConfig && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
            onClick={closeEditModal}
          >
            <div
              style={{
                background: 'white',
                borderRadius: '8px',
                padding: '24px',
                maxWidth: '500px',
                width: '90%',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, fontSize: '20px' }}>
                  Editar {getAlertTypeLabel(editingConfig.alert_type)}
                </h2>
                <button
                  onClick={closeEditModal}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '20px',
                    cursor: 'pointer',
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
                {/* Threshold Value */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    {getThresholdLabel(editingConfig.alert_type).label} - {getThresholdLabel(editingConfig.alert_type).unit}
                  </label>
                  <input
                    type="number"
                    value={editFormData.threshold_value}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, threshold_value: e.target.value })
                    }
                    placeholder="Ex: 25"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                  <small style={{ display: 'block', marginTop: '4px', color: '#666' }}>
                    {getThresholdLabel(editingConfig.alert_type).description}
                  </small>
                </div>

                {/* Severity Level */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    Severidade
                  </label>
                  <select
                    value={editFormData.severity_level}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, severity_level: e.target.value })
                    }
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="LOW">Baixo</option>
                    <option value="MEDIUM">Médio</option>
                    <option value="HIGH">Alto</option>
                    <option value="CRITICAL">Crítico</option>
                  </select>
                </div>

                {/* Verification Frequency */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    Verificação
                  </label>
                  <select
                    value={editFormData.check_frequency}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, check_frequency: e.target.value })
                    }
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="HOURLY">A cada hora</option>
                    <option value="DAILY">Diariamente</option>
                    <option value="WEEKLY">Semanalmente</option>
                    <option value="MONTHLY">Mensalmente</option>
                    <option value="REAL_TIME">Tempo real</option>
                  </select>
                </div>

                {/* Notification Channels */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    Canais de Notificação
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {['email', 'sms', 'push', 'dashboard'].map((channel) => (
                      <label key={channel} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={editFormData.notify_channels[channel] || false}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              notify_channels: {
                                ...editFormData.notify_channels,
                                [channel]: e.target.checked,
                              },
                            })
                          }
                          style={{ cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '14px', textTransform: 'capitalize' }}>
                          {channel === 'sms' ? 'SMS' : channel === 'push' ? 'Push' : channel === 'email' ? 'Email' : 'Dashboard'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Email Recipients */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    Destinatários Email
                  </label>
                  <textarea
                    value={editFormData.email_recipients}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, email_recipients: e.target.value })
                    }
                    placeholder="email1@example.com, email2@example.com"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      minHeight: '80px',
                      fontFamily: 'monospace',
                    }}
                  />
                  <small style={{ display: 'block', marginTop: '4px', color: '#666' }}>
                    Separe múltiplos emails com vírgula
                  </small>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  onClick={closeEditModal}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #ddd',
                    background: '#fff',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                  disabled={isSavingEdit}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEdit}
                  style={{
                    padding: '8px 16px',
                    background: '#0055ff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    opacity: isSavingEdit ? 0.6 : 1,
                  }}
                  disabled={isSavingEdit}
                >
                  {isSavingEdit ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
