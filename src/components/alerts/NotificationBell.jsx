import React, { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { getAlerts, getAlertCount } from '@/lib/alertsApi';
import { subscribeToAlertNotifications, unsubscribeFromAlertNotifications } from '@/lib/alertNotificationsApi';

/**
 * NotificationBell.jsx
 * Sino de notificações com dropdown de últimos alertas
 */
const NotificationBell = ({ onAlertCenterClick }) => {
  const { clinicId } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [alertCount, setAlertCount] = useState(0);
  const [subscription, setSubscription] = useState(null);

  // Carrega contador de alertas
  const loadAlertCount = async () => {
    if (!clinicId) return;
    try {
      const count = await getAlertCount(clinicId);
      setAlertCount(count.total);
    } catch (error) {
      console.error('Erro ao carregar contador:', error);
    }
  };

  // Carrega últimos 5 alertas
  const loadAlerts = async () => {
    if (!clinicId) return;
    try {
      const data = await getAlerts(clinicId, { limit: 5 });
      setAlerts(data);
    } catch (error) {
      console.error('Erro ao carregar alertas:', error);
    }
  };

  // Subscreve a notificações em tempo real
  useEffect(() => {
    loadAlertCount();
    loadAlerts();

    const sub = subscribeToAlertNotifications(clinicId, (event) => {
      if (event.type === 'alert_created') {
        setAlertCount(prev => prev + 1);
        loadAlerts();
      }
    });

    setSubscription(sub);

    // Recarrega a cada 30 segundos
    const interval = setInterval(() => {
      loadAlertCount();
      loadAlerts();
    }, 30000);

    return () => {
      clearInterval(interval);
      if (sub) {
        unsubscribeFromAlertNotifications(sub);
      }
    };
  }, [clinicId]);

  // Cores por severidade
  const severityColors = {
    CRITICAL: '#ef4444',
    HIGH: '#f97316',
    MEDIUM: '#eab308',
    LOW: '#22c55e'
  };

  // Ícone baseado em severidade máxima
  const getIndicatorColor = () => {
    if (alertCount === 0) return 'text-gray-400';
    const hasCritical = alerts.some(a => a.severity === 'CRITICAL');
    const hasHigh = alerts.some(a => a.severity === 'HIGH');
    return hasCritical ? 'text-red-500' : hasHigh ? 'text-orange-500' : 'text-yellow-500';
  };

  return (
    <div className="relative">
      {/* Botão do sino */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
        title="Alertas"
      >
        <Bell className={`w-6 h-6 ${getIndicatorColor()}`} />
        {alertCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {alertCount > 9 ? '9+' : alertCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg z-50 border border-gray-200">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Alertas Recentes</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Lista de alertas */}
          <div className="max-h-96 overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                Nenhum alerta no momento 🎉
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {alerts.map(alert => (
                  <div
                    key={alert.id}
                    className="p-3 hover:bg-gray-50 cursor-pointer transition border-l-4"
                    style={{ borderLeftColor: severityColors[alert.severity] || '#999' }}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-gray-900 truncate">
                          {alert.title}
                        </h4>
                        <p className="text-xs text-gray-600 line-clamp-2 mt-1">
                          {alert.message}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span
                            className="inline-block px-2 py-1 text-xs font-medium rounded text-white"
                            style={{ backgroundColor: severityColors[alert.severity] }}
                          >
                            {alert.severity}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(alert.created_at).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-gray-200">
            <button
              onClick={() => {
                setIsOpen(false);
                onAlertCenterClick?.();
              }}
              className="w-full px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded transition"
            >
              Ver Central de Alertas →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
