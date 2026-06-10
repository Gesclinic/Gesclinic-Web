/**
 * Real-Time Alerts Manager Component
 * Displays and manages real-time alerts from Supabase
 */

import React, { useState, useEffect } from 'react';
import { useClinicContext } from '@/contexts/ClinicContext';
import { subscribeToAllAlerts } from '@/lib/realtimeAlertsApi';

export default function RealtimeAlertsManager() {
  const { clinicId, loadingClinic } = useClinicContext();
  const [alerts, setAlerts] = useState([]);
  const [unsubscribe, setUnsubscribe] = useState(null);

  useEffect(() => {
    if (clinicId && !loadingClinic) {
      // Subscribe to all alerts
      const unsubscribeFn = subscribeToAllAlerts(clinicId, (alert) => {
        console.log('[Real-Time Alert]', alert);

        // Add alert with unique ID
        const alertWithId = {
          ...alert,
          id: `${Date.now()}_${Math.random()}`
        };

        // Add to alerts list
        setAlerts(prev => [alertWithId, ...prev].slice(0, 50)); // Keep last 50 alerts

        // Auto-remove after 10 seconds (except errors/warnings)
        if (alert.severity === 'info' || alert.severity === 'success') {
          setTimeout(() => {
            setAlerts(prev => prev.filter(a => a.id !== alertWithId.id));
          }, 10000);
        }

        // Also trigger browser notification if available
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(alert.title, {
            body: alert.message,
            tag: alert.type,
            requireInteraction: alert.severity === 'error' || alert.severity === 'warning'
          });
        }
      });

      setUnsubscribe(() => unsubscribeFn);

      return () => {
        if (unsubscribeFn) {
          unsubscribeFn();
        }
      };
    }
  }, [clinicId, loadingClinic]);

  const removeAlert = (id) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  const getAlertStyles = (severity) => {
    switch (severity) {
      case 'error':
        return 'bg-red-50 border-red-200 text-red-900';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-900';
      case 'success':
        return 'bg-green-50 border-green-200 text-green-900';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200 text-blue-900';
    }
  };

  const getAlertIcon = (severity) => {
    switch (severity) {
      case 'error':
        return '🚨';
      case 'warning':
        return '⚠️';
      case 'success':
        return '✅';
      case 'info':
      default:
        return 'ℹ️';
    }
  };

  if (alerts.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md space-y-2 max-h-96 overflow-y-auto">
      {alerts.map(alert => (
        <div
          key={alert.id}
          className={`border-2 rounded-lg p-4 animate-slide-in ${getAlertStyles(alert.severity)}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">{getAlertIcon(alert.severity)}</span>
              <div className="flex-1">
                <p className="font-semibold text-sm">{alert.title}</p>
                <p className="text-xs mt-1 opacity-90">{alert.message}</p>
                {alert.data && (
                  <p className="text-xs mt-2 opacity-75">
                    {JSON.stringify(alert.data, null, 2).substring(0, 100)}...
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => removeAlert(alert.id)}
              className="flex-shrink-0 text-xl hover:opacity-70 transition-opacity"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
