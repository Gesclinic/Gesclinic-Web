// src/components/NotificationBell.jsx
// Componente de sino de notificação na navbar com dropdown

import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, AlertCircle, AlertTriangle, AlertOctagon } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
import alertsApi from '@/lib/financeiro/alertsApi';
import notificationsApi from '@/lib/financeiro/notificationsApi';
import './NotificationBell.css';

export default function NotificationBell() {
  const { isAuthenticated } = useAuth();
  const { clinicId } = useClinicContext();
  const [isOpen, setIsOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState({
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    TOTAL: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Carregar alertas quando componente monta ou clinicId muda
  useEffect(() => {
    if (isAuthenticated && clinicId) {
      loadAlerts();

      // Recarregar a cada 30 segundos
      const interval = setInterval(loadAlerts, 30000);

      // Listener para notificações em tempo real
      const handleNotification = (event) => {
        console.log('Notificação recebida:', event.detail);
        loadAlerts();
      };
      window.addEventListener('dashboardNotification', handleNotification);

      return () => {
        clearInterval(interval);
        window.removeEventListener('dashboardNotification', handleNotification);
      };
    }
  }, [isAuthenticated, clinicId]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Carregar alertas da API
  const loadAlerts = async () => {
    if (!clinicId) return;

    try {
      setIsLoading(true);

      // Carregar alertas ativos (máximo 5 para dropdown)
      const activeAlerts = await alertsApi.listActiveAlerts(clinicId, { limit: 5 });
      setAlerts(activeAlerts);

      // Carregar resumo
      const alertsSummary = await alertsApi.getAlertsSummary(clinicId);
      setSummary(alertsSummary);
    } catch (error) {
      console.error('Erro ao carregar alertas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Resolver alerta
  const handleResolveAlert = async (alertId, e) => {
    e.stopPropagation();
    try {
      await alertsApi.resolveAlert(alertId);
      loadAlerts();
    } catch (error) {
      console.error('Erro ao resolver alerta:', error);
    }
  };

  // Descartar alerta
  const handleDismissAlert = async (alertId, e) => {
    e.stopPropagation();
    try {
      await alertsApi.dismissAlert(alertId);
      loadAlerts();
    } catch (error) {
      console.error('Erro ao descartar alerta:', error);
    }
  };

  // Marcar como lido
  const handleMarkAsRead = async (alertId, e) => {
    e.stopPropagation();
    try {
      await alertsApi.markAsRead(alertId);
      loadAlerts();
    } catch (error) {
      console.error('Erro ao marcar como lido:', error);
    }
  };

  // Obter ícone de severidade
  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return <AlertOctagon className="w-4 h-4" />;
      case 'HIGH':
        return <AlertTriangle className="w-4 h-4" />;
      case 'MEDIUM':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  // Obter cor por severidade
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'HIGH':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'MEDIUM':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  // Obter status da clínica (resumido)
  const getHealthStatus = () => {
    if (summary.CRITICAL > 0) return 'CRITICAL';
    if (summary.HIGH > 0) return 'HIGH';
    if (summary.MEDIUM > 0) return 'MEDIUM';
    return 'HEALTHY';
  };

  const healthStatus = getHealthStatus();

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      {/* Botão sino */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`notification-bell-button ${healthStatus.toLowerCase()}`}
        title={`${summary.TOTAL} alerta${summary.TOTAL !== 1 ? 's' : ''} ativo${summary.TOTAL !== 1 ? 's' : ''}`}
        aria-label="Notificações"
      >
        <Bell className="w-5 h-5" />
        <span>Notificações</span>

        {/* Badge com contador */}
        {summary.TOTAL > 0 && (
          <span className={`notification-badge severity-${healthStatus.toLowerCase()}`}>
            {summary.TOTAL > 99 ? '99+' : summary.TOTAL}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="notification-dropdown">
          {/* Header */}
          <div className="notification-dropdown-header">
            <div>
              <h3>Notificações</h3>
              <p className="text-xs text-gray-500">
                {summary.TOTAL} alerta{summary.TOTAL !== 1 ? 's' : ''} ativo{summary.TOTAL !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Resumo por severidade */}
          {summary.TOTAL > 0 && (
            <div className="notification-summary">
              {summary.CRITICAL > 0 && (
                <div className="summary-item critical">
                  <span className="dot"></span>
                  <span>{summary.CRITICAL} Crítico{summary.CRITICAL > 1 ? 's' : ''}</span>
                </div>
              )}
              {summary.HIGH > 0 && (
                <div className="summary-item high">
                  <span className="dot"></span>
                  <span>{summary.HIGH} Alto{summary.HIGH > 1 ? 's' : ''}</span>
                </div>
              )}
              {summary.MEDIUM > 0 && (
                <div className="summary-item medium">
                  <span className="dot"></span>
                  <span>{summary.MEDIUM} Médio{summary.MEDIUM > 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          )}

          {/* Lista de alertas */}
          <div className="notification-list">
            {isLoading ? (
              <div className="notification-item loading">
                <p>Carregando alertas...</p>
              </div>
            ) : alerts.length > 0 ? (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`notification-item ${getSeverityColor(alert.severity)}`}
                  onClick={() => handleMarkAsRead(alert.id, { stopPropagation: () => {} })}
                >
                  <div className="notification-content">
                    <div className="notification-header-item">
                      <div className="severity-icon">
                        {getSeverityIcon(alert.severity)}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{alert.title}</p>
                        <p className="text-xs opacity-75 line-clamp-2">{alert.message}</p>
                      </div>
                    </div>
                    <div className="notification-time">
                      {notificationsApi.formatTimeAgo(alert.created_at)}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="notification-actions">
                    <button
                      onClick={(e) => handleResolveAlert(alert.id, e)}
                      className="action-btn resolve"
                      title="Resolver"
                    >
                      ✓
                    </button>
                    <button
                      onClick={(e) => handleDismissAlert(alert.id, e)}
                      className="action-btn dismiss"
                      title="Descartar"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="notification-empty">
                <Bell className="w-8 h-8 opacity-30" />
                <p>Nenhum alerta ativo</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="notification-footer">
            <a
              href="/clinica/financeiro/alerts"
              className="view-all-link"
              onClick={() => setIsOpen(false)}
            >
              Ver todas as notificações →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
