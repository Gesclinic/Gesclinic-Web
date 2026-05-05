/**
 * AgendaRecepcaoView.jsx
 *
 * 🏥 Tela da Recepção (Check-in)
 *
 * Responsabilidades:
 * - Conferência de pacientes no dia
 * - Checklist obrigatório (dados, convênio, documentos)
 * - Processamento financeiro
 * - Liberação para atendimento
 *
 * Fluxo:
 * CONFIRMADO → AGUARDANDO → (PENDENTE / FINANCEIRO_PENDENTE) → LIBERADO_PARA_ATENDIMENTO
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
import {
  BOOKING_STATUSES,
  SERVICE_STATUSES,
  getStatusConfig,
  getStatusLabelOnly,
} from '@/lib/appointmentStatusConstants';
import { updateAppointment } from '@/lib/appointmentsApi';
import { ChevronDown, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

export default function AgendaRecepcaoView({ appointments = [], onRefresh }) {
  const { user, currentRole } = useAuth();
  const { clinicId } = useClinicContext();
  const [expandedId, setExpandedId] = useState(null);
  const [loadingId, setLoadingId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  // Filtra agendamentos do dia que estão na fase de recepção
  const receptionAppointments = useMemo(() => {
    if (!appointments) {
      return [];
    }

    return appointments.filter((apt) => {
      // Apenas agendamentos de hoje em dia
      const today = new Date().toISOString().split('T')[0];
      const aptDate = apt.scheduled_date?.split('T')[0];

      if (aptDate !== today) {
        return false;
      }

      // Filtra por status visível na recepção (novo sistema)
      const isReception =
        [
          BOOKING_STATUSES.SCHEDULED,
          BOOKING_STATUSES.CONFIRMED,
          BOOKING_STATUSES.AT_RECEPTION,
          SERVICE_STATUSES.AWAITING_PROFESSIONAL,
          SERVICE_STATUSES.IN_SERVICE,
          SERVICE_STATUSES.ATTENDED,
        ].indexOf(apt.status) >= 0;

      if (!isReception) {
        return false;
      }

      // Aplica filtro selecionado
      if (filterStatus === 'all') {
        return true;
      }
      return apt.status === filterStatus;
    });
  }, [appointments, filterStatus]);

  /**
   * Atualiza status do agendamento
   */
  const updateStatus = useCallback(
    async (appointmentId, newStatus) => {
      try {
        setLoadingId(appointmentId);
        await updateAppointment(appointmentId, {
          status: newStatus,
          updated_at: new Date().toISOString(),
        });
        onRefresh?.();
      } catch (error) {
        console.error('Erro ao atualizar status:', error);
        alert('Erro ao atualizar agendamento');
      } finally {
        setLoadingId(null);
      }
    },
    [onRefresh],
  );

  /**
   * Marca paciente como chegado
   */
  const handleMarkArrival = (apt) => {
    if (apt.status === BOOKING_STATUSES.CONFIRMED) {
      updateStatus(apt.id, BOOKING_STATUSES.AT_RECEPTION);
    }
  };

  /**
   * Libera para atendimento (ação crítica)
   */
  const handleReleaseForCare = (apt) => {
    if (confirm(`Liberar ${apt.patient_name} para atendimento com ${apt.professional_name}?`)) {
      updateStatus(apt.id, SERVICE_STATUSES.AWAITING_PROFESSIONAL);
    }
  };

  /**
   * Marca falta
   */
  const handleMarkNoShow = (apt) => {
    if (confirm(`Marcar ${apt.patient_name} como falta?`)) {
      updateStatus(apt.id, SERVICE_STATUSES.NO_SHOW);
    }
  };

  // Agrupa por status para melhor visualização
  const groupedByStatus = useMemo(() => {
    const groups = {};
    receptionAppointments.forEach((apt) => {
      if (!groups[apt.status]) {
        groups[apt.status] = [];
      }
      groups[apt.status].push(apt);
    });
    return groups;
  }, [receptionAppointments]);

  if (!canMarkArrival && !canMarkPending && !canRelease) {
    return (
      <div className="p-8 text-center text-red-600">
        ⚠️ Você não tem permissão para acessar a recepção.
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-4">
        <h1 className="text-2xl font-bold text-gray-800">📋 Recepção - Check-in</h1>
        <p className="text-gray-600 text-sm mt-1">
          Gerencie o check-in dos pacientes e libere-os para atendimento
        </p>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            filterStatus === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Todos ({receptionAppointments.length})
        </button>
        <button
          onClick={() => setFilterStatus(BOOKING_STATUSES.CONFIRMED)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            filterStatus === BOOKING_STATUSES.CONFIRMED
              ? 'bg-cyan-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Confirmado ({groupedByStatus[BOOKING_STATUSES.CONFIRMED]?.length || 0})
        </button>
        <button
          onClick={() => setFilterStatus(BOOKING_STATUSES.AT_RECEPTION)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            filterStatus === BOOKING_STATUSES.AT_RECEPTION
              ? 'bg-yellow-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Na Recepção ({groupedByStatus[BOOKING_STATUSES.AT_RECEPTION]?.length || 0})
        </button>
        <button
          onClick={() => setFilterStatus(SERVICE_STATUSES.AWAITING_PROFESSIONAL)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            filterStatus === SERVICE_STATUSES.AWAITING_PROFESSIONAL
              ? 'bg-green-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Liberado ({groupedByStatus[SERVICE_STATUSES.AWAITING_PROFESSIONAL]?.length || 0})
        </button>
      </div>

      {/* Lista de Agendamentos */}
      {receptionAppointments.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
          Nenhum agendamento para hoje na recepção
        </div>
      ) : (
        <div className="space-y-2">
          {receptionAppointments.map((apt) => (
            <div
              key={apt.id}
              className="bg-white rounded-lg shadow border-l-4"
              style={{
                borderLeftColor:
                  apt.status === SERVICE_STATUSES.AWAITING_PROFESSIONAL
                    ? '#10b981'
                    : apt.status === SERVICE_STATUSES.IN_SERVICE
                      ? '#6366f1'
                      : apt.status === SERVICE_STATUSES.ATTENDED
                        ? '#4f46e5'
                        : '#fbbf24',
              }}
            >
              {/* Card Principal */}
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-gray-900">{apt.patient_name || 'Paciente'}</h3>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getStatusConfig(apt.status).textColor} ${getStatusConfig(apt.status).color}`}
                      >
                        {getStatusLabelOnly(apt.status)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      🕐 {apt.start_time?.substring(0, 5)} | 👨‍⚕️ {apt.professional_name || 'S/ prof'}{' '}
                      | 🛏️ {apt.room || 'S/ sala'}
                    </p>
                  </div>

                  {/* Botão de Expansão */}
                  <button
                    onClick={() => setExpandedId(expandedId === apt.id ? null : apt.id)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <ChevronDown
                      size={20}
                      className={`transition ${expandedId === apt.id ? 'rotate-180' : ''}`}
                    />
                  </button>
                </div>

                {/* Conteúdo Expandido */}
                {expandedId === apt.id && (
                  <div className="mt-4 pt-4 border-t space-y-3">
                    {/* Checklist */}
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <h4 className="font-semibold text-sm text-gray-700 mb-2">
                        ✅ Checklist Obrigatório
                      </h4>
                      <div className="space-y-2 text-sm">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" defaultChecked={true} className="w-4 h-4" />
                          <span>Dados cadastrais conferidos</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" defaultChecked={true} className="w-4 h-4" />
                          <span>Convênio / Plano verificado</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" defaultChecked={true} className="w-4 h-4" />
                          <span>Serviço correto confirmado</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" defaultChecked={true} className="w-4 h-4" />
                          <span>Documentos / Autorização OK</span>
                        </label>
                      </div>
                    </div>

                    {/* Status Atual */}
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Status Atual</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {getStatusLabel(apt.status)}
                      </p>
                    </div>

                    {/* Próximas Ações */}
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <h4 className="font-semibold text-sm text-gray-700 mb-2">
                        🎯 Próximas Ações
                      </h4>
                      <div className="space-y-2">
                        {/* Marcar Chegada */}
                        {apt.status === BOOKING_STATUSES.CONFIRMED && (
                          <button
                            onClick={() => handleMarkArrival(apt)}
                            disabled={loadingId === apt.id}
                            className="w-full px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded text-sm font-medium disabled:opacity-50 transition"
                          >
                            {loadingId === apt.id ? '...' : '📍 Marcar Chegada'}
                          </button>
                        )}

                        {/* Liberar para Atendimento */}
                        {apt.status === BOOKING_STATUSES.AT_RECEPTION && (
                          <button
                            onClick={() => handleReleaseForCare(apt)}
                            disabled={loadingId === apt.id}
                            className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-bold disabled:opacity-50 transition"
                          >
                            {loadingId === apt.id ? '...' : '✅ LIBERAR PARA ATENDIMENTO'}
                          </button>
                        )}

                        {/* Marcar Falta */}
                        {apt.status !== SERVICE_STATUSES.NO_SHOW &&
                          apt.status !== SERVICE_STATUSES.ATTENDED &&
                          apt.status !== SERVICE_STATUSES.CANCELED && (
                          <button
                            onClick={() => handleMarkNoShow(apt)}
                            disabled={loadingId === apt.id}
                            className="w-full px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded text-sm font-medium disabled:opacity-50 transition"
                          >
                            {loadingId === apt.id ? '...' : '❌ Marcar Falta'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Informações Adicionais */}
                    {apt.status === SERVICE_STATUSES.AWAITING_PROFESSIONAL && (
                      <div className="bg-green-50 border border-green-200 p-3 rounded-lg flex items-start gap-2">
                        <CheckCircle2 className="text-green-600 flex-shrink-0 mt-0.5" size={18} />
                        <p className="text-sm text-green-800">
                          <strong>Pronto para atendimento!</strong> Paciente está liberado e o
                          profissional pode iniciar.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
