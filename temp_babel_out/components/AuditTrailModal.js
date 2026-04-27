// filepath: src/pages/clinica/agenda/components/AuditTrailModal.jsx
// Modal para visualizar histórico de auditoria de agendamentos

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
export default function AuditTrailModal({
  appointmentId,
  onClose
}) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!appointmentId) return;
    fetchAuditLogs();
  }, [appointmentId]);
  async function fetchAuditLogs() {
    try {
      const {
        data,
        error: err
      } = await supabase.from('appointment_audit_logs').select('*').eq('appointment_id', appointmentId).order('created_at', {
        ascending: false
      });
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
      delete: '🗑️ Deletado'
    };
    return labels[action] || action;
  }
  function getActionColor(action) {
    const colors = {
      create: '#10b981',
      // green
      update: '#3b82f6',
      // blue
      delete: '#ef4444' // red
    };
    return colors[action] || '#6b7280';
  }
  function renderChanges(oldData, newData, action) {
    if (!oldData || !newData) return null;
    const changes = [];
    const oldObj = typeof oldData === 'string' ? JSON.parse(oldData) : oldData;
    const newObj = typeof newData === 'string' ? JSON.parse(newData) : newData;

    // Campos importantes a monitorar
    const importantFields = [{
      key: 'status',
      label: 'Status'
    }, {
      key: 'patient_id',
      label: 'Paciente'
    }, {
      key: 'professional_id',
      label: 'Profissional'
    }, {
      key: 'start_time',
      label: 'Horário'
    }, {
      key: 'room_id',
      label: 'Sala'
    }, {
      key: 'notes',
      label: 'Observações'
    }];
    importantFields.forEach(({
      key,
      label
    }) => {
      const oldVal = oldObj?.[key];
      const newVal = newObj?.[key];
      if (oldVal !== newVal) {
        changes.push({
          field: label,
          from: oldVal,
          to: newVal
        });
      }
    });
    if (changes.length === 0) return null;
    return /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 8,
        paddingTop: 8,
        borderTop: '1px solid #e5e7eb'
      }
    }, changes.map((change, idx) => /*#__PURE__*/React.createElement("div", {
      key: idx,
      style: {
        fontSize: 13,
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement("strong", null, change.field, ":"), /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#ef4444'
      }
    }, "\u2190 ", String(change.from).substring(0, 50)), /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#10b981'
      }
    }, "\u2192 ", String(change.to).substring(0, 50)))));
  }
  if (loading) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0,0,0,0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        background: '#fff',
        borderRadius: 10,
        minWidth: 600,
        maxWidth: 800,
        padding: 32,
        boxShadow: '0 2px 16px #0002',
        maxHeight: '90vh',
        overflowY: 'auto'
      }
    }, /*#__PURE__*/React.createElement("h2", {
      style: {
        fontWeight: 700,
        fontSize: 22,
        marginBottom: 18
      }
    }, "\uD83D\uDCCB Hist\xF3rico de Auditoria"), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'center',
        color: '#888',
        padding: 32
      }
    }, "Carregando hist\xF3rico...")));
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.25)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#fff',
      borderRadius: 10,
      minWidth: 600,
      maxWidth: 800,
      padding: 32,
      boxShadow: '0 2px 16px #0002',
      maxHeight: '90vh',
      overflowY: 'auto'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontWeight: 700,
      fontSize: 22,
      marginBottom: 24
    }
  }, "\uD83D\uDCCB Hist\xF3rico de Auditoria"), error && /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#fee2e2',
      border: '1px solid #fca5a5',
      color: '#991b1b',
      padding: 12,
      borderRadius: 6,
      marginBottom: 16,
      fontSize: 14
    }
  }, "\u26A0\uFE0F ", error), logs.length === 0 ? /*#__PURE__*/React.createElement("p", {
    style: {
      color: '#888',
      textAlign: 'center',
      padding: 32
    }
  }, "Nenhuma altera\xE7\xE3o registrada") : /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, logs.map(log => /*#__PURE__*/React.createElement("div", {
    key: log.id,
    style: {
      border: '1px solid #e5e7eb',
      borderRadius: 6,
      padding: 12,
      background: '#f9fafb'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-block',
      background: getActionColor(log.action),
      color: '#fff',
      padding: '4px 8px',
      borderRadius: 4,
      fontSize: 12,
      fontWeight: 600
    }
  }, getActionLabel(log.action))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: '#666'
    }
  }, format(new Date(log.created_at), 'HH:mm:ss - dd/MM/yyyy', {
    locale: ptBR
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: '#555',
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("strong", null, "Usu\xE1rio:"), " ", log.user_email || 'Sistema', " ", log.user_role ? `(${log.user_role})` : ''), log.status_changed_from && log.status_changed_to && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: '#555',
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("strong", null, "Status:"), /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#ef4444'
    }
  }, "\u2190 ", log.status_changed_from), /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#10b981'
    }
  }, "\u2192 ", log.status_changed_to)), log.action === 'update' && renderChanges(log.old_data, log.new_data, log.action), log.ip_address && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#999',
      marginTop: 8,
      paddingTop: 8,
      borderTop: '1px solid #e5e7eb'
    }
  }, "IP: ", log.ip_address)))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 24,
      display: 'flex',
      gap: 8,
      justifyContent: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      padding: '8px 16px',
      background: '#e5e7eb',
      border: 'none',
      borderRadius: 6,
      cursor: 'pointer',
      fontWeight: 600
    }
  }, "Fechar"), /*#__PURE__*/React.createElement("button", {
    onClick: fetchAuditLogs,
    style: {
      padding: '8px 16px',
      background: '#3b82f6',
      color: '#fff',
      border: 'none',
      borderRadius: 6,
      cursor: 'pointer',
      fontWeight: 600
    }
  }, "\uD83D\uDD04 Recarregar"))));
}