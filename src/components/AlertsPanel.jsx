import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, AlertCircle, Info, Bell, Download } from 'lucide-react';
import AlertManager from '@/lib/AlertManager';

/**
 * AlertsPanel Component
 * Displays real-time alerts and statistics
 * Features:
 * - Live alert feed
 * - Severity indicators
 * - Deduplication
 * - Export to CSV
 * - Alert history
 */
export function AlertsPanel() {
  const [alerts, setAlerts] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [expandedAlert, setExpandedAlert] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Start alert monitoring
    AlertManager.startMonitoring();

    // Initial load
    setAlerts(AlertManager.getAlerts());
    setStatistics(AlertManager.getStatistics());

    // Subscribe to new alerts
    const unsubscribe = AlertManager.onAlert(newAlert => {
      setAlerts(prev => [...prev, newAlert].slice(-20)); // Keep last 20
      setStatistics(AlertManager.getStatistics());
    });

    // Update statistics every 10 seconds
    const statsInterval = setInterval(() => {
      setStatistics(AlertManager.getStatistics());
    }, 10000);

    return () => {
      unsubscribe();
      clearInterval(statsInterval);
    };
  }, []);

  const handleResolveAlert = (alertId, e) => {
    e.stopPropagation();
    AlertManager.resolveAlert(alertId);
    setAlerts(prev => prev.map(a => 
      a.id === alertId ? { ...a, resolved: true } : a
    ));
  };

  const handleClearAll = () => {
    AlertManager.clearAlerts();
    setAlerts([]);
  };

  const handleExport = () => {
    AlertManager.exportToCSV();
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const activeAlerts = alerts.filter(a => !a.resolved);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Alert Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative inline-flex items-center justify-center w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition"
      >
        <Bell className="w-6 h-6" />
        {activeAlerts.length > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {activeAlerts.length}
          </span>
        )}
      </button>

      {/* Alert Panel */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-96 max-h-96 bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-gray-50 border-b border-gray-200 p-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Alerts</h3>
              <p className="text-xs text-gray-600 mt-1">
                {activeAlerts.length} active • {statistics?.total} total
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Statistics */}
          {statistics && (
            <div className="bg-gradient-to-r from-red-50 to-yellow-50 p-3 border-b border-gray-200">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs text-gray-600">Critical</p>
                  <p className="text-lg font-bold text-red-600">{statistics.critical}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Warnings</p>
                  <p className="text-lg font-bold text-yellow-600">{statistics.warnings}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Info</p>
                  <p className="text-lg font-bold text-blue-600">{statistics.info}</p>
                </div>
              </div>
            </div>
          )}

          {/* Alert List */}
          <div className="flex-1 overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <p>No alerts yet</p>
                <p className="text-xs text-gray-400 mt-1">Monitoring active...</p>
              </div>
            ) : (
              <div className="space-y-2 p-3">
                {alerts.map(alert => (
                  <div
                    key={alert.id}
                    className={`border rounded-lg p-3 cursor-pointer transition ${getSeverityColor(
                      alert.severity
                    )} ${alert.resolved ? 'opacity-50' : ''}`}
                    onClick={() =>
                      setExpandedAlert(
                        expandedAlert?.id === alert.id ? null : alert
                      )
                    }
                  >
                    <div className="flex items-start gap-3">
                      {getSeverityIcon(alert.severity)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {alert.type}
                        </p>
                        <p className="text-xs text-gray-700 mt-1">
                          {alert.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                      {!alert.resolved && (
                        <button
                          onClick={e => handleResolveAlert(alert.id, e)}
                          className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Details */}
                    {expandedAlert?.id === alert.id && alert.details && (
                      <div className="mt-3 pt-3 border-t border-current border-opacity-20">
                        <pre className="text-xs text-gray-700 overflow-x-auto bg-black bg-opacity-5 p-2 rounded">
                          {JSON.stringify(alert.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 border-t border-gray-200 p-3 flex gap-2">
            <button
              onClick={handleExport}
              className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={handleClearAll}
              className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition text-sm font-medium"
            >
              Clear All
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AlertsPanel;
