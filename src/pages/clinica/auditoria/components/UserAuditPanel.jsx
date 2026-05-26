import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

/**
 * User Audit Component (Simplified - Local Storage)
 * Tracks user login/logout events
 */

export function logUserEvent(event) {
  const userEvents = JSON.parse(localStorage.getItem('user_audit_log') || '[]');
  
  const newEvent = {
    id: Math.random().toString(36),
    timestamp: new Date().toISOString(),
    eventType: event.type, // LOGIN, LOGOUT, SESSION_TIMEOUT
    email: event.email,
    userId: event.userId,
    sessionDuration: event.sessionDuration,
    details: event.details || {}
  };
  
  userEvents.push(newEvent);
  
  // Keep only last 30 days
  const thirtyDaysAgo = new Date().getTime() - 30 * 24 * 60 * 60 * 1000;
  const filtered = userEvents.filter(e => new Date(e.timestamp).getTime() > thirtyDaysAgo);
  
  localStorage.setItem('user_audit_log', JSON.stringify(filtered));
  
  return newEvent;
}

export function UserAuditPanel() {
  const [events, setEvents] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [dateRange, setDateRange] = useState('7d');
  
  useEffect(() => {
    loadEvents();
  }, []);
  
  const loadEvents = () => {
    const allEvents = JSON.parse(localStorage.getItem('user_audit_log') || '[]');
    let filtered = allEvents;
    
    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(e => e.eventType === filterType);
    }
    
    // Filter by date range
    const now = new Date().getTime();
    let rangeMs = 7 * 24 * 60 * 60 * 1000; // 7d default
    
    if (dateRange === '24h') {
      rangeMs = 24 * 60 * 60 * 1000;
    } else if (dateRange === '30d') {
      rangeMs = 30 * 24 * 60 * 60 * 1000;
    }
    
    filtered = filtered.filter(e => 
      now - new Date(e.timestamp).getTime() < rangeMs
    );
    
    setEvents(filtered.reverse());
  };
  
  const handleLoadEvents = () => {
    loadEvents();
  };
  
  const getEventIcon = (eventType) => {
    switch (eventType) {
      case 'LOGIN':
        return '🟢';
      case 'LOGOUT':
        return '🔴';
      case 'SESSION_TIMEOUT':
        return '⏱️';
      default:
        return '•';
    }
  };
  
  const getEventColor = (eventType) => {
    switch (eventType) {
      case 'LOGIN':
        return 'border-green-200 bg-green-50';
      case 'LOGOUT':
        return 'border-blue-200 bg-blue-50';
      case 'SESSION_TIMEOUT':
        return 'border-yellow-200 bg-yellow-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };
  
  const stats = {
    totalLogins: events.filter(e => e.eventType === 'LOGIN').length,
    totalLogouts: events.filter(e => e.eventType === 'LOGOUT').length,
    activeSessions: events.filter(e => e.eventType === 'LOGIN').length - 
                   events.filter(e => e.eventType === 'LOGOUT').length,
    uniqueUsers: new Set(events.map(e => e.email)).size
  };
  
  const avgSessionDuration = events
    .filter(e => e.eventType === 'LOGOUT' && e.sessionDuration)
    .reduce((sum, e) => sum + (e.sessionDuration || 0), 0) / 
    Math.max(events.filter(e => e.eventType === 'LOGOUT').length, 1);
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">👥 Auditoria de Usuários</h2>
      
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        <div className="bg-green-50 p-3 rounded border border-green-200">
          <p className="text-xs text-gray-600">Logins</p>
          <p className="text-2xl font-bold text-green-600">{stats.totalLogins}</p>
        </div>
        <div className="bg-blue-50 p-3 rounded border border-blue-200">
          <p className="text-xs text-gray-600">Logouts</p>
          <p className="text-2xl font-bold text-blue-600">{stats.totalLogouts}</p>
        </div>
        <div className="bg-purple-50 p-3 rounded border border-purple-200">
          <p className="text-xs text-gray-600">Usuários</p>
          <p className="text-2xl font-bold text-purple-600">{stats.uniqueUsers}</p>
        </div>
        <div className="bg-orange-50 p-3 rounded border border-orange-200">
          <p className="text-xs text-gray-600">Duração Média</p>
          <p className="text-2xl font-bold text-orange-600">
            {(avgSessionDuration / 60).toFixed(0)}min
          </p>
        </div>
      </div>
      
      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="all">Todos os Eventos</option>
          <option value="LOGIN">Apenas Logins</option>
          <option value="LOGOUT">Apenas Logouts</option>
          <option value="SESSION_TIMEOUT">Apenas Timeouts</option>
        </select>
        
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="24h">Últimas 24h</option>
          <option value="7d">Últimos 7 dias</option>
          <option value="30d">Últimos 30 dias</option>
        </select>
        
        <button
          onClick={handleLoadEvents}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
        >
          Recarregar
        </button>
      </div>
      
      {/* Events List */}
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {events.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Nenhum evento registrado</p>
        ) : (
          events.map((event) => (
            <div key={event.id} className={`border rounded-lg p-3 ${getEventColor(event.eventType)}`}>
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-2 flex-1">
                  <span className="text-lg mt-0.5">{getEventIcon(event.eventType)}</span>
                  <div>
                    <p className="font-semibold">
                      {event.eventType === 'LOGIN'
                        ? '🟢 Login'
                        : event.eventType === 'LOGOUT'
                        ? '🔴 Logout'
                        : '⏱️ Session Timeout'}
                    </p>
                    <p className="text-sm text-gray-700">{event.email}</p>
                    <p className="text-xs text-gray-600">
                      {format(new Date(event.timestamp), 'dd/MM/yyyy HH:mm:ss', { locale: pt })}
                    </p>
                    {event.sessionDuration && (
                      <p className="text-xs text-gray-600">
                        Duração: {(event.sessionDuration / 60).toFixed(0)} minutos
                      </p>
                    )}
                  </div>
                </div>
                {event.details && Object.keys(event.details).length > 0 && (
                  <div className="text-xs text-gray-600 bg-white bg-opacity-50 p-1 rounded">
                    {Object.entries(event.details).map(([key, val]) => (
                      <div key={key}>{key}: {val}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      
      <p className="text-xs text-gray-500 mt-4">
        💡 Dica: Eventos são armazenados localmente e mantidos por 30 dias
      </p>
    </div>
  );
}
