/**
 * AppointmentAuditTimeline.jsx
 * 
 * 🕒 TIMELINE DE AUDITORIA DE ATENDIMENTOS
 * 
 * Exibe histórico completo de ações realizadas em um atendimento:
 * - Criação
 * - Mudanças de status
 * - Check-in
 * - Checklist
 * - Validação financeira
 * - Merge de paciente
 * - Início/Fim de atendimento
 * - Marcação de falta
 * - Cancelamento/Remarcação
 * 
 * Permissões:
 * - Admin/Gestor: Acesso total com todos os detalhes
 * - Profissional: Apenas ações de seu próprio atendimento
 * - Recepção: Sem acesso (bloqueado)
 * 
 * Props:
 * - appointmentId: string (UUID)
 * - currentRole: string ('admin' | 'gestor' | 'profissional' | 'recepcao')
 * - currentUserId: string (UUID) - para comparar profissionais
 * - compact: boolean (default: false) - modo resumido (últimas 5 ações)
 */

import React, { useState, useEffect } from 'react';
import { Clock, Eye, EyeOff, AlertCircle, CheckCircle2, Calendar, RefreshCw, XCircle, LogIn, CheckSquare, CreditCard, GitMerge, User, Play, Lock, Plus } from 'lucide-react';
import { getAppointmentAuditLogs, AUDIT_ACTION_DESCRIPTIONS } from '@/lib/auditApi';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
const AppointmentAuditTimeline = ({
  appointmentId,
  currentRole = 'profissional',
  currentUserId = null,
  compact = false
}) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedLog, setExpandedLog] = useState(null);

  // Verificar permissões de acesso
  const canViewAudit = ['admin', 'gestor'].includes(currentRole?.toLowerCase?.());
  if (!canViewAudit) {
    return /*#__PURE__*/React.createElement("div", {
      className: "p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 text-yellow-700"
    }, /*#__PURE__*/React.createElement(Lock, {
      className: "w-4 h-4"
    }), /*#__PURE__*/React.createElement("span", {
      className: "text-sm"
    }, "Voc\xEA n\xE3o tem permiss\xE3o para visualizar o hist\xF3rico de auditoria.")));
  }
  useEffect(() => {
    fetchLogs();
  }, [appointmentId]);
  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await getAppointmentAuditLogs(appointmentId);
      setLogs(data || []);
      setError(null);
    } catch (err) {
      console.error("Erro ao carregar logs de auditoria:", err);
      setError("Erro ao carregar histórico de auditoria");
    } finally {
      setLoading(false);
    }
  };

  // Filtrar logs baseado em permissões
  const displayLogs = compact ? logs.slice(-5) : logs;

  // Mapear tipo de ação para ícone
  const getActionIcon = actionType => {
    switch (actionType) {
      case 'APPOINTMENT_CREATED':
        return /*#__PURE__*/React.createElement(Plus, {
          className: "w-4 h-4"
        });
      case 'STATUS_CHANGED':
        return /*#__PURE__*/React.createElement(RefreshCw, {
          className: "w-4 h-4"
        });
      case 'CHECKIN_STARTED':
        return /*#__PURE__*/React.createElement(LogIn, {
          className: "w-4 h-4"
        });
      case 'CHECKLIST_UPDATED':
        return /*#__PURE__*/React.createElement(CheckSquare, {
          className: "w-4 h-4"
        });
      case 'FINANCIAL_VALIDATED':
        return /*#__PURE__*/React.createElement(CreditCard, {
          className: "w-4 h-4"
        });
      case 'MERGE_PRE_PATIENT':
        return /*#__PURE__*/React.createElement(GitMerge, {
          className: "w-4 h-4"
        });
      case 'PATIENT_LINKED':
        return /*#__PURE__*/React.createElement(User, {
          className: "w-4 h-4"
        });
      case 'ATTENDANCE_STARTED':
        return /*#__PURE__*/React.createElement(Play, {
          className: "w-4 h-4"
        });
      case 'ATTENDANCE_FINISHED':
        return /*#__PURE__*/React.createElement(CheckCircle2, {
          className: "w-4 h-4"
        });
      case 'MARKED_NO_SHOW':
        return /*#__PURE__*/React.createElement(XCircle, {
          className: "w-4 h-4"
        });
      case 'RESCHEDULED':
        return /*#__PURE__*/React.createElement(Calendar, {
          className: "w-4 h-4"
        });
      case 'CANCELLED':
        return /*#__PURE__*/React.createElement(XCircle, {
          className: "w-4 h-4"
        });
      default:
        return /*#__PURE__*/React.createElement(Clock, {
          className: "w-4 h-4"
        });
    }
  };

  // Formatar descrição amigável da ação
  const getActionLabel = log => {
    const description = AUDIT_ACTION_DESCRIPTIONS[log.action_type];
    if (!description) return log.action_type;

    // Adicionar informações adicionais quando houver mudança de status
    if (log.action_type === 'STATUS_CHANGED') {
      return `${description.label}: ${log.old_status} → ${log.new_status}`;
    }
    return description.label;
  };

  // Retornar cor de badge baseada no tipo
  const getBadgeColor = actionType => {
    const description = AUDIT_ACTION_DESCRIPTIONS[actionType];
    return description?.color || 'bg-gray-100 text-gray-800';
  };
  if (loading) {
    return /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-center py-6"
    }, /*#__PURE__*/React.createElement("div", {
      className: "animate-spin"
    }, /*#__PURE__*/React.createElement(Clock, {
      className: "w-5 h-5 text-blue-600"
    })), /*#__PURE__*/React.createElement("span", {
      className: "ml-2 text-gray-600"
    }, "Carregando hist\xF3rico..."));
  }
  if (error) {
    return /*#__PURE__*/React.createElement("div", {
      className: "p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2"
    }, /*#__PURE__*/React.createElement(AlertCircle, {
      className: "w-4 h-4 text-red-600"
    }), /*#__PURE__*/React.createElement("span", {
      className: "text-sm text-red-600"
    }, error));
  }
  if (displayLogs.length === 0) {
    return /*#__PURE__*/React.createElement("div", {
      className: "p-4 bg-gray-50 border border-gray-200 rounded-lg text-center"
    }, /*#__PURE__*/React.createElement(Clock, {
      className: "w-8 h-8 mx-auto text-gray-400 mb-2"
    }), /*#__PURE__*/React.createElement("p", {
      className: "text-gray-600 text-sm"
    }, "Nenhum registro de auditoria dispon\xEDvel"));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, displayLogs.map((log, index) => /*#__PURE__*/React.createElement("div", {
    key: log.id,
    className: "flex gap-4 pb-4 relative"
  }, index < displayLogs.length - 1 && /*#__PURE__*/React.createElement("div", {
    className: "absolute left-5 top-8 w-0.5 h-12 bg-gray-200"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex-shrink-0 relative z-10"
  }, /*#__PURE__*/React.createElement("div", {
    className: `w-10 h-10 rounded-full flex items-center justify-center ${getBadgeColor(log.action_type)}`
  }, getActionIcon(log.action_type))), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 pt-1 pb-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-50 rounded-lg p-3 cursor-pointer hover:bg-gray-100 transition",
    onClick: () => setExpandedLog(expandedLog === log.id ? null : log.id)
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-medium text-gray-900 text-sm"
  }, getActionLabel(log)), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500 mt-0.5"
  }, format(new Date(log.performed_at), "d 'de' MMMM 'às' HH:mm:ss", {
    locale: ptBR
  }), ' ', /*#__PURE__*/React.createElement("span", {
    className: "text-gray-400"
  }, "(", formatDistanceToNow(new Date(log.performed_at), {
    locale: ptBR,
    addSuffix: true
  }), ")")))), log.performed_by && /*#__PURE__*/React.createElement("div", {
    className: "mt-2 pt-2 border-t border-gray-200"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-medium"
  }, "Realizado por:"), " ", log.performed_by_role || 'Usuário', " (ID: ", log.performed_by.substring(0, 8), "...)")), expandedLog === log.id && log.context && /*#__PURE__*/React.createElement("div", {
    className: "mt-2 pt-2 border-t border-gray-200"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-medium text-gray-700 mb-1"
  }, "Detalhes:"), /*#__PURE__*/React.createElement("pre", {
    className: "text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32 text-gray-600"
  }, typeof log.context === 'string' ? JSON.stringify(JSON.parse(log.context), null, 2) : JSON.stringify(log.context, null, 2))), currentRole === 'admin' && (log.ip_address || log.user_agent) && /*#__PURE__*/React.createElement("div", {
    className: "mt-2 pt-2 border-t border-gray-200"
  }, log.ip_address && /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-medium"
  }, "IP:"), " ", log.ip_address), log.user_agent && /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500 truncate"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-medium"
  }, "User-Agent:"), " ", log.user_agent)), log.context && !expandedLog && /*#__PURE__*/React.createElement("div", {
    className: "mt-1"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-blue-600 cursor-pointer hover:underline"
  }, "Clique para ver detalhes \u2192"))))))), compact && logs.length > 5 && /*#__PURE__*/React.createElement("div", {
    className: "text-center pt-2"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500"
  }, "Mostrando ", displayLogs.length, " de ", logs.length, " registros")));
};
export default AppointmentAuditTimeline;