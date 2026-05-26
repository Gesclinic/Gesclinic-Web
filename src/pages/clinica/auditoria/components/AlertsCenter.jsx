import React, { useState, useEffect } from 'react';
import { getUnreadAlerts, markAlertAsRead } from './AlertEngine';

export function AlertsCenter({ logs, onAlertsChange }) {
  const [alerts, setAlerts] = useState([]);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  
  useEffect(() => {
    const unreadAlerts = getUnreadAlerts();
    setAlerts(unreadAlerts);
    if (onAlertsChange) {
      onAlertsChange(unreadAlerts);
    }
  }, [logs, onAlertsChange]);
  
  const handleMarkAsRead = (alertId) => {
    markAlertAsRead(alertId);
    setAlerts(alerts.filter(a => a.id !== alertId));
  };
  
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };
  
  const getSeverityTextColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'text-red-700';
      case 'warning':
        return 'text-yellow-700';
      default:
        return 'text-blue-700';
    }
  };
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900">
          🔔 Central de Alertas {alerts.length > 0 && <span className="text-red-600">({alerts.length})</span>}
        </h2>
        <div className="text-xs text-gray-600">
          {alerts.length === 0 ? '✅ Nenhum alerta' : `⚠️ ${alerts.length} alerta(s) não lido(s)`}
        </div>
      </div>
      
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>Nenhum alerta no momento</p>
            <p className="text-xs mt-1">Alertas críticos aparecerão aqui</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`border rounded-lg p-3 ${getSeverityColor(alert.severity)}`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <p className={`font-semibold ${getSeverityTextColor(alert.severity)}`}>
                    {alert.title}
                  </p>
                  <p className="text-sm text-gray-700 mt-1">{alert.message}</p>
                </div>
                <button
                  onClick={() => handleMarkAsRead(alert.id)}
                  className="ml-2 px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
                >
                  ✕
                </button>
              </div>
              
              <div className="flex justify-between items-center text-xs text-gray-600">
                <span>{new Date(alert.timestamp).toLocaleString('pt-BR')}</span>
                {alert.details && alert.details.length > 0 && (
                  <button
                    onClick={() => {
                      setSelectedAlert(alert);
                      setShowDetails(true);
                    }}
                    className="text-blue-600 hover:underline"
                  >
                    Ver detalhes ({alert.details.length})
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Detail Modal */}
      {showDetails && selectedAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{selectedAlert.title}</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-2 mb-4">
              <p><strong>Tipo:</strong> {selectedAlert.type}</p>
              <p><strong>Severidade:</strong> {selectedAlert.severity}</p>
              <p><strong>Mensagem:</strong> {selectedAlert.message}</p>
              <p><strong>Timestamp:</strong> {new Date(selectedAlert.timestamp).toLocaleString('pt-BR')}</p>
            </div>
            
            {selectedAlert.details && selectedAlert.details.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Detalhes:</h4>
                <div className="bg-gray-50 rounded p-3 space-y-2">
                  {selectedAlert.details.map((log, idx) => (
                    <div key={idx} className="text-xs border-b pb-2 last:border-b-0">
                      <p>
                        <span className="font-medium">{log.action_type}</span> - {log.patient?.name || 'N/A'} 
                        ({new Date(log.created_at).toLocaleString('pt-BR')})
                      </p>
                      <p className="text-gray-600">Por: {log.performed_by_role}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <button
              onClick={() => setShowDetails(false)}
              className="mt-4 w-full px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function AlertBadge({ alerts }) {
  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;
  
  if (criticalCount === 0 && warningCount === 0) {
    return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-semibold">✅ Sem alertas</span>;
  }
  
  return (
    <div className="flex gap-2">
      {criticalCount > 0 && (
        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full font-semibold animate-pulse">
          🔴 {criticalCount} crítico(s)
        </span>
      )}
      {warningCount > 0 && (
        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full font-semibold">
          ⚠️ {warningCount} aviso(s)
        </span>
      )}
    </div>
  );
}
