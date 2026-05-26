import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';

/**
 * Snapshot comparison component
 * Shows before/after JSON with highlighting
 */
export function AuditSnapshot({ log }) {
  if (!log) return null;
  
  const { old_values, new_values, context } = log;
  const before = old_values || {};
  const after = new_values || {};
  
  // Find changed fields
  const changedFields = {};
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  
  allKeys.forEach(key => {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changedFields[key] = {
        before: before[key],
        after: after[key],
        changed: true
      };
    }
  });
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Before */}
        <div className="bg-red-50 rounded-lg border border-red-200 p-4">
          <h4 className="font-semibold text-red-700 mb-3">📋 Antes</h4>
          <div className="space-y-2 text-sm">
            {Object.entries(before).map(([key, value]) => (
              <div key={key} className={changedFields[key] ? 'bg-red-100 p-1 rounded' : ''}>
                <span className="font-medium text-gray-700">{key}:</span>
                <span className="text-gray-600 ml-2">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
        
        {/* After */}
        <div className="bg-green-50 rounded-lg border border-green-200 p-4">
          <h4 className="font-semibold text-green-700 mb-3">✓ Depois</h4>
          <div className="space-y-2 text-sm">
            {Object.entries(after).map(([key, value]) => (
              <div key={key} className={changedFields[key] ? 'bg-green-100 p-1 rounded' : ''}>
                <span className="font-medium text-gray-700">{key}:</span>
                <span className="text-gray-600 ml-2">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Changed Fields Summary */}
      {Object.keys(changedFields).length > 0 && (
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <h4 className="font-semibold text-blue-700 mb-3">🔄 Campos Alterados ({Object.keys(changedFields).length})</h4>
          <div className="space-y-2 text-sm">
            {Object.entries(changedFields).map(([key, { before, after }]) => (
              <div key={key} className="flex justify-between items-center">
                <span className="font-medium text-gray-700">{key}</span>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-red-600">"{before}"</span>
                  <span>→</span>
                  <span className="text-green-600">"{after}"</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Context Info */}
      {context && (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
          <h4 className="font-semibold text-gray-700 mb-3">📍 Contexto</h4>
          <pre className="text-xs bg-white p-2 rounded border overflow-x-auto">
            {JSON.stringify(context, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

/**
 * Timeline view of audit history
 */
export function AuditTimeline({ logs }) {
  const [selectedLogIdx, setSelectedLogIdx] = useState(null);
  
  if (!logs || logs.length === 0) {
    return <p className="text-gray-500">Nenhum log para visualizar</p>;
  }
  
  return (
    <div className="space-y-4">
      <div className="relative">
        {/* Timeline */}
        <div className="space-y-4">
          {logs.map((log, idx) => (
            <div key={log.id} className="flex gap-4">
              {/* Timeline dot */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-3 h-3 rounded-full mt-1 cursor-pointer ${
                    log.action_type === 'DELETED'
                      ? 'bg-red-500'
                      : log.action_type === 'UPDATED'
                      ? 'bg-blue-500'
                      : 'bg-green-500'
                  }`}
                  onClick={() => setSelectedLogIdx(selectedLogIdx === idx ? null : idx)}
                />
                {idx < logs.length - 1 && <div className="w-0.5 h-16 bg-gray-300 mt-2" />}
              </div>
              
              {/* Timeline content */}
              <div
                className="flex-1 bg-white rounded-lg border border-gray-200 p-3 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedLogIdx(selectedLogIdx === idx ? null : idx)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">
                      <span
                        className={
                          log.action_type === 'DELETED'
                            ? 'text-red-600'
                            : log.action_type === 'UPDATED'
                            ? 'text-blue-600'
                            : 'text-green-600'
                        }
                      >
                        {log.action_type === 'DELETED'
                          ? '✕ Deletado'
                          : log.action_type === 'UPDATED'
                          ? '◆ Atualizado'
                          : '✓ Criado'}
                      </span>
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      👤 {log.patient?.name || 'Agendamento'} • 💼 {log.professional?.name || 'N/A'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {format(parseISO(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: pt })}
                    </p>
                  </div>
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {log.performed_by_role}
                  </span>
                </div>
                
                {/* Expandable details */}
                {selectedLogIdx === idx && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <AuditSnapshot log={log} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Diff highlighter component
 */
export function AuditDiffView({ log }) {
  const { old_values, new_values } = log;
  
  if (!old_values && !new_values) {
    return <p className="text-gray-500">Sem dados de comparação</p>;
  }
  
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <h4 className="font-semibold text-red-700 mb-2">Removido</h4>
          <pre className="bg-red-50 p-2 rounded text-xs overflow-x-auto border border-red-200">
            {JSON.stringify(old_values, null, 2)}
          </pre>
        </div>
        <div>
          <h4 className="font-semibold text-green-700 mb-2">Adicionado</h4>
          <pre className="bg-green-50 p-2 rounded text-xs overflow-x-auto border border-green-200">
            {JSON.stringify(new_values, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}

/**
 * Comparison panel component
 */
export function ComparisonPanel({ logs }) {
  const [viewMode, setViewMode] = useState('timeline'); // timeline | snapshot | diff
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);
  
  // Group logs by appointment
  const appointmentGroups = {};
  logs.forEach(log => {
    const appointmentId = log.appointment_id;
    if (!appointmentGroups[appointmentId]) {
      appointmentGroups[appointmentId] = [];
    }
    appointmentGroups[appointmentId].push(log);
  });
  
  // Sort by date
  Object.keys(appointmentGroups).forEach(key => {
    appointmentGroups[key].sort((a, b) => 
      new Date(b.created_at) - new Date(a.created_at)
    );
  });
  
  const selectedLogs = selectedAppointmentId ? appointmentGroups[selectedAppointmentId] : [];
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">🔄 Comparação Avançada (Antes/Depois)</h2>
      
      {/* View mode selector */}
      <div className="flex gap-2 mb-4">
        <div className="relative group">
          <button
            onClick={() => setViewMode('timeline')}
            className={`px-3 py-1 rounded text-sm ${
              viewMode === 'timeline'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            📍 Linha do Tempo
          </button>
          <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
            Sequência de mudanças com bolinhas coloridas (🟢=criado, 🔵=atualizado, 🔴=deletado)
          </div>
        </div>
        
        <div className="relative group">
          <button
            onClick={() => setViewMode('snapshot')}
            className={`px-3 py-1 rounded text-sm ${
              viewMode === 'snapshot'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            📋 Captura
          </button>
          <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
            JSON lado a lado com campos destacados em vermelho/verde
          </div>
        </div>
        
        <div className="relative group">
          <button
            onClick={() => setViewMode('diff')}
            className={`px-3 py-1 rounded text-sm ${
              viewMode === 'diff'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            🔍 Diferenças
          </button>
          <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
            Diferenças em vermelho (removido) e verde (adicionado)
          </div>
        </div>
      </div>
      
      {/* Appointment selector */}
      {Object.keys(appointmentGroups).length > 0 && (
        <div className="mb-4">
          <select
            value={selectedAppointmentId || ''}
            onChange={(e) => setSelectedAppointmentId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">Selecione um agendamento para comparar</option>
            {Object.entries(appointmentGroups).map(([appointmentId, logs]) => (
              <option key={appointmentId} value={appointmentId}>
                {logs[0]?.patient?.name || 'Desconhecido'} ({logs.length} mudança(s))
              </option>
            ))}
          </select>
        </div>
      )}
      
      {/* View content */}
      <div>
        {selectedLogs.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            Selecione um agendamento para ver o histórico completo
          </p>
        ) : viewMode === 'timeline' ? (
          <AuditTimeline logs={selectedLogs} />
        ) : viewMode === 'snapshot' && selectedLogs[0] ? (
          <AuditSnapshot log={selectedLogs[0]} />
        ) : viewMode === 'diff' && selectedLogs[0] ? (
          <AuditDiffView log={selectedLogs[0]} />
        ) : (
          <p className="text-gray-500">Sem dados para exibir</p>
        )}
      </div>
    </div>
  );
}
