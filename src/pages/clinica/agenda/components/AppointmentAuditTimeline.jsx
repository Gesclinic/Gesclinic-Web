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
import {
  Clock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Calendar,
  RefreshCw,
  XCircle,
  LogIn,
  CheckSquare,
  CreditCard,
  GitMerge,
  User,
  Play,
  Lock,
  Plus,
} from 'lucide-react';
import { getAppointmentAuditLogs, AUDIT_ACTION_DESCRIPTIONS } from '@/lib/auditApi';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const AppointmentAuditTimeline = ({
  appointmentId,
  currentRole = 'profissional',
  currentUserId = null,
  compact = false,
}) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedLog, setExpandedLog] = useState(null);

  // Verificar permissões de acesso
  const canViewAudit = ['admin', 'gestor'].includes(currentRole?.toLowerCase?.());

  if (!canViewAudit) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-center gap-2 text-yellow-700">
          <Lock className="w-4 h-4" />
          <span className="text-sm">
            Você não tem permissão para visualizar o histórico de auditoria.
          </span>
        </div>
      </div>
    );
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
      console.error('Erro ao carregar logs de auditoria:', err);
      setError('Erro ao carregar histórico de auditoria');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar logs baseado em permissões
  const displayLogs = compact ? logs.slice(-5) : logs;

  // Mapear tipo de ação para ícone
  const getActionIcon = (actionType) => {
    switch (actionType) {
      case 'APPOINTMENT_CREATED':
        return <Plus className="w-4 h-4" />;
      case 'STATUS_CHANGED':
        return <RefreshCw className="w-4 h-4" />;
      case 'CHECKIN_STARTED':
        return <LogIn className="w-4 h-4" />;
      case 'CHECKLIST_UPDATED':
        return <CheckSquare className="w-4 h-4" />;
      case 'FINANCIAL_VALIDATED':
        return <CreditCard className="w-4 h-4" />;
      case 'MERGE_PRE_PATIENT':
        return <GitMerge className="w-4 h-4" />;
      case 'PATIENT_LINKED':
        return <User className="w-4 h-4" />;
      case 'ATTENDANCE_STARTED':
        return <Play className="w-4 h-4" />;
      case 'ATTENDANCE_FINISHED':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'MARKED_NO_SHOW':
        return <XCircle className="w-4 h-4" />;
      case 'RESCHEDULED':
        return <Calendar className="w-4 h-4" />;
      case 'CANCELLED':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  // Formatar descrição amigável da ação
  const getActionLabel = (log) => {
    const description = AUDIT_ACTION_DESCRIPTIONS[log.action_type];
    if (!description) {
      return log.action_type;
    }

    // Adicionar informações adicionais quando houver mudança de status
    if (log.action_type === 'STATUS_CHANGED') {
      return `${description.label}: ${log.old_status} → ${log.new_status}`;
    }

    return description.label;
  };

  // Retornar cor de badge baseada no tipo
  const getBadgeColor = (actionType) => {
    const description = AUDIT_ACTION_DESCRIPTIONS[actionType];
    return description?.color || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="animate-spin">
          <Clock className="w-5 h-5 text-blue-600" />
        </div>
        <span className="ml-2 text-gray-600">Carregando histórico...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-red-600" />
        <span className="text-sm text-red-600">{error}</span>
      </div>
    );
  }

  if (displayLogs.length === 0) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
        <Clock className="w-8 h-8 mx-auto text-gray-400 mb-2" />
        <p className="text-gray-600 text-sm">Nenhum registro de auditoria disponível</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Timeline */}
      <div className="relative">
        {displayLogs.map((log, index) => (
          <div key={log.id} className="flex gap-4 pb-4 relative">
            {/* Linha vertical */}
            {index < displayLogs.length - 1 && (
              <div className="absolute left-5 top-8 w-0.5 h-12 bg-gray-200" />
            )}

            {/* Ponto na timeline */}
            <div className="flex-shrink-0 relative z-10">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${getBadgeColor(log.action_type)}`}
              >
                {getActionIcon(log.action_type)}
              </div>
            </div>

            {/* Conteúdo */}
            <div className="flex-1 pt-1 pb-2">
              <div
                className="bg-gray-50 rounded-lg p-3 cursor-pointer hover:bg-gray-100 transition"
                onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
              >
                {/* Cabeçalho */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 text-sm">{getActionLabel(log)}</h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {format(new Date(log.performed_at), "d 'de' MMMM 'às' HH:mm:ss", {
                        locale: ptBR,
                      })}{' '}
                      <span className="text-gray-400">
                        (
                        {formatDistanceToNow(new Date(log.performed_at), {
                          locale: ptBR,
                          addSuffix: true,
                        })}
                        )
                      </span>
                    </p>
                  </div>
                </div>

                {/* Usuário que realizou */}
                {log.performed_by && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <p className="text-xs text-gray-600">
                      <span className="font-medium">Realizado por:</span>{' '}
                      {log.performed_by_role || 'Usuário'} (ID: {log.performed_by.substring(0, 8)}
                      ...)
                    </p>
                  </div>
                )}

                {/* Contexto expandido */}
                {expandedLog === log.id && log.context && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <p className="text-xs font-medium text-gray-700 mb-1">Detalhes:</p>
                    <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32 text-gray-600">
                      {typeof log.context === 'string'
                        ? JSON.stringify(JSON.parse(log.context), null, 2)
                        : JSON.stringify(log.context, null, 2)}
                    </pre>
                  </div>
                )}

                {/* IP e User-Agent (apenas para admin) */}
                {currentRole === 'admin' && (log.ip_address || log.user_agent) && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    {log.ip_address && (
                      <p className="text-xs text-gray-500">
                        <span className="font-medium">IP:</span> {log.ip_address}
                      </p>
                    )}
                    {log.user_agent && (
                      <p className="text-xs text-gray-500 truncate">
                        <span className="font-medium">User-Agent:</span> {log.user_agent}
                      </p>
                    )}
                  </div>
                )}

                {/* Indicador de contexto */}
                {log.context && !expandedLog && (
                  <div className="mt-1">
                    <p className="text-xs text-blue-600 cursor-pointer hover:underline">
                      Clique para ver detalhes →
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Nota se compacto */}
      {compact && logs.length > 5 && (
        <div className="text-center pt-2">
          <p className="text-xs text-gray-500">
            Mostrando {displayLogs.length} de {logs.length} registros
          </p>
        </div>
      )}
    </div>
  );
};

export default AppointmentAuditTimeline;
