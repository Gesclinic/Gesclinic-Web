// filepath: src/pages/clinica/agenda/components/AuditTrailModal.jsx
// Modal para visualizar histórico de auditoria de agendamentos

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AuditTrailModal({ appointmentId, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!appointmentId) return;
    fetchAuditLogs();
  }, [appointmentId]);

  async function fetchAuditLogs() {
    try {
      const { data, error: err } = await supabase
        .from('appointment_audit_logs')
        .select('*')
        .eq('appointment_id', appointmentId)
        .order('created_at', { ascending: false });

      if (err) throw err;
      setLogs(data || []);
    } catch (err) {
      console.error('Erro ao buscar auditoria:', err);
      setError('Falha ao carregar histórico de auditoria');
    } finally {
      setLoading(false);
    }
  }

  function getActionLabel(action) {
    const labels = {
      create: '✨ Criado',
      update: '✏️ Atualizado',
      delete: '🗑️ Deletado',
    };
    return labels[action] || action;
  }

  function getActionColor(action) {
    const colors = {
      create: '#10b981', // green
      update: '#3b82f6', // blue
      delete: '#ef4444', // red
    };
    return colors[action] || '#6b7280';
  }

  function renderChanges(oldData, newData, action) {
    if (!oldData || !newData) return null;

    const changes = [];
    const oldObj = typeof oldData === 'string' ? JSON.parse(oldData) : oldData;
    const newObj = typeof newData === 'string' ? JSON.parse(newData) : newData;

    // Campos importantes a monitorar
    const importantFields = [
      { key: 'status', label: 'Status' },
      { key: 'patient_id', label: 'Paciente' },
      { key: 'professional_id', label: 'Profissional' },
      { key: 'start_time', label: 'Horário' },
      { key: 'room_id', label: 'Sala' },
      { key: 'notes', label: 'Observações' },
    ];

    importantFields.forEach(({ key, label }) => {
      const oldVal = oldObj?.[key];
      const newVal = newObj?.[key];

      if (oldVal !== newVal) {
        changes.push({
          field: label,
          from: oldVal,
          to: newVal,
        });
      }
    });

    if (changes.length === 0) return null;

    return (
      <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #e5e7eb' }}>
        {changes.map((change, idx) => (
          <div key={idx} style={{ fontSize: 13, marginBottom: 6 }}>
            <strong>{change.field}:</strong>
            <br />
            <span style={{ color: '#ef4444' }}>← {String(change.from).substring(0, 50)}</span>
            <br />
            <span style={{ color: '#10b981' }}>→ {String(change.to).substring(0, 50)}</span>
          </div>
        ))}
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0,0,0,0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}>
        <div style={{
          background: '#fff',
          borderRadius: 10,
          minWidth: 600,
          maxWidth: 800,
          padding: 32,
          boxShadow: '0 2px 16px #0002',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}>
          <h2 style={{ fontWeight: 700, fontSize: 22, marginBottom: 18 }}>📋 Histórico de Auditoria</h2>
          <div style={{ textAlign: 'center', color: '#888', padding: 32 }}>
            Carregando histórico...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.25)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 10,
        minWidth: 600,
        maxWidth: 800,
        padding: 32,
        boxShadow: '0 2px 16px #0002',
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>
        <h2 style={{ fontWeight: 700, fontSize: 22, marginBottom: 24 }}>📋 Histórico de Auditoria</h2>

        {error && (
          <div style={{
            background: '#fee2e2',
            border: '1px solid #fca5a5',
            color: '#991b1b',
            padding: 12,
            borderRadius: 6,
            marginBottom: 16,
            fontSize: 14,
          }}>
            ⚠️ {error}
          </div>
        )}

        {logs.length === 0 ? (
          <p style={{ color: '#888', textAlign: 'center', padding: 32 }}>
            Nenhuma alteração registrada
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {logs.map((log) => (
              <div
                key={log.id}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 6,
                  padding: 12,
                  background: '#f9fafb',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <span
                      style={{
                        display: 'inline-block',
                        background: getActionColor(log.action),
                        color: '#fff',
                        padding: '4px 8px',
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {getActionLabel(log.action)}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#666' }}>
                    {format(new Date(log.created_at), 'HH:mm:ss - dd/MM/yyyy', { locale: ptBR })}
                  </div>
                </div>

                <div style={{ fontSize: 13, color: '#555', marginBottom: 8 }}>
                  <strong>Usuário:</strong> {log.user_email || 'Sistema'} {log.user_role ? `(${log.user_role})` : ''}
                </div>

                {log.status_changed_from && log.status_changed_to && (
                  <div style={{ fontSize: 13, color: '#555', marginBottom: 8 }}>
                    <strong>Status:</strong>
                    <br />
                    <span style={{ color: '#ef4444' }}>← {log.status_changed_from}</span>
                    <br />
                    <span style={{ color: '#10b981' }}>→ {log.status_changed_to}</span>
                  </div>
                )}

                {log.action === 'update' && renderChanges(log.old_data, log.new_data, log.action)}

                {log.ip_address && (
                  <div style={{ fontSize: 11, color: '#999', marginTop: 8, paddingTop: 8, borderTop: '1px solid #e5e7eb' }}>
                    IP: {log.ip_address}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 24, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              background: '#e5e7eb',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Fechar
          </button>
          <button
            onClick={fetchAuditLogs}
            style={{
              padding: '8px 16px',
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            🔄 Recarregar
          </button>
        </div>
      </div>
    </div>
  );
}
