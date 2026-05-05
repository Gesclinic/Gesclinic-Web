/**
 * AgendaProfessionalView.jsx
 *
 * ðŸ‘¨â€âš•ï¸ Tela do Profissional (Atendimento)
 *
 * Responsabilidades:
 * - Visualizar APENAS agendamentos liberados para atendimento
 * - Iniciar atendimento (registrar hora_inicio)
 * - Finalizar atendimento (registrar hora_fim)
 * - Interface limpa e sem distraÃ§Ãµes
 *
 * Fluxo:
 * LIBERADO_PARA_ATENDIMENTO â†’ EM_ATENDIMENTO â†’ FINALIZADO
 *
 * âš ï¸ CRÃTICO: Profissional NÃƒO pode editar agendamento, ver financeiro, ou pular etapas
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
import { SERVICE_STATUSES, getStatusLabelOnly } from '@/lib/appointmentStatusConstants';
import { updateAppointment } from '@/lib/appointmentsApi';
import {
  Play,
  StopCircle,
  Clock,
  User,
  Phone,
  AlertCircle,
  Check,
  CheckCircle,
} from 'lucide-react';

export default function AgendaProfessionalView({
  appointments = [],
  onRefresh,
  professionalId = null,
}) {
  const { user, currentRole } = useAuth();
  const { clinicId } = useClinicContext();
  const [loadingId, setLoadingId] = useState(null);
  const [activeAppointmentId, setActiveAppointmentId] = useState(null);

  // ============================================
  // FILTRO: Apenas agendamentos liberados para este profissional hoje
  // ============================================

  const readyAppointments = useMemo(() => {
    if (!appointments || appointments.length === 0) {
      return [];
    }

    const today = new Date().toISOString().split('T')[0];

    return appointments
      .filter((apt) => {
        // Apenas hoje
        const aptDate = apt.scheduled_date?.split('T')[0];
        if (aptDate !== today) {
          return false;
        }

        // Apenas liberados ou em atendimento
        if (
          ![SERVICE_STATUSES.AWAITING_PROFESSIONAL, SERVICE_STATUSES.IN_SERVICE].includes(
            apt.status,
          )
        ) {
          return false;
        }

        // Se hÃ¡ profissional especÃ­fico, filtra
        if (professionalId && apt.professional_id !== professionalId) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Em atendimento primeiro
        if (a.status === SERVICE_STATUSES.IN_SERVICE) {
          return -1;
        }
        if (b.status === SERVICE_STATUSES.IN_SERVICE) {
          return 1;
        }
        // Depois por hora
        return (a.start_time || '').localeCompare(b.start_time || '');
      });
  }, [appointments, professionalId]);

  /**
   * Atualiza status e registra horÃ¡rios
   */
  const updateStatus = useCallback(
    async (appointmentId, newStatus, additionalData = {}) => {
      try {
        setLoadingId(appointmentId);

        const updates = {
          status: newStatus,
          updated_at: new Date().toISOString(),
          ...additionalData,
        };

        await updateAppointment(appointmentId, updates);
        onRefresh?.();
      } catch (error) {
        console.error('Erro ao atualizar atendimento:', error);
        alert('Erro ao atualizar atendimento. Tente novamente.');
      } finally {
        setLoadingId(null);
      }
    },
    [onRefresh],
  );

  /**
   * Inicia atendimento
   */
  const handleStartCare = (apt) => {
    const now = new Date().toISOString();
    updateStatus(apt.id, SERVICE_STATUSES.IN_SERVICE, {
      care_start_time: now,
    });
    setActiveAppointmentId(apt.id);
  };

  /**
   * Finaliza atendimento
   */
  const handleFinishCare = (apt) => {
    if (
      confirm(`Finalizar atendimento de ${apt.patient_name}? Esta aÃ§Ã£o nÃ£o pode ser desfeita.`)
    ) {
      const now = new Date().toISOString();
      updateStatus(apt.id, SERVICE_STATUSES.ATTENDED, {
        care_end_time: now,
      });
      setActiveAppointmentId(null);
    }
  };

  // ============================================
  // RENDERIZAÃ‡ÃƒO
  // ============================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="w-full mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">ðŸ‘¨â€âš•ï¸ Atendimento</h1>
              <p className="text-gray-600 mt-1">
                Seus agendamentos do dia ({readyAppointments.length})
              </p>
            </div>
            <button
              onClick={onRefresh}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
            >
              ðŸ”„ Atualizar
            </button>
          </div>
        </div>
      </div>

      {/* ConteÃºdo Principal */}
      <div className="w-full mx-auto px-4 py-8">
        {readyAppointments.length === 0 ? (
          // Sem Agendamentos
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Clock size={48} className="text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Sem Pacientes Aguardando</h2>
            <p className="text-gray-600 text-lg">
              {appointments?.length === 0
                ? 'Nenhum agendamento carregado para hoje. Verifique se hÃ¡ agendamentos.'
                : `${appointments.length} agendamento(s) carregado(s), mas nenhum estÃ¡ pronto para atendimento.`}
            </p>
            <p className="text-gray-500 text-sm mt-4">
              ðŸ’¡ Status esperados: Aguardando Profissional ou Em Atendimento
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Paciente em Atendimento (se houver) */}
            {readyAppointments.length > 0 &&
              readyAppointments[0].status === SERVICE_STATUSES.IN_SERVICE && (
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-lg p-8 text-white">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                  <h3 className="text-xl font-bold">ATENDIMENTO EM ANDAMENTO</h3>
                </div>

                {readyAppointments.map((apt) =>
                  apt.status === SERVICE_STATUSES.IN_SERVICE ? (
                    <div key={apt.id} className="bg-white/20 rounded-lg p-6 space-y-4">
                      <div>
                        <p className="text-sm opacity-90">PACIENTE</p>
                        <h2 className="text-4xl font-bold">{apt.patient_name}</h2>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm opacity-90">SERVIÇO</p>
                          <p className="text-xl font-semibold">
                            {apt.service_name || apt.service_id || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm opacity-90">HORÁRIO INÍCIO</p>
                          <p className="text-xl font-semibold">
                            {apt.care_start_time
                              ? new Date(apt.care_start_time).toLocaleTimeString()
                              : '--:--'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleFinishCare(apt)}
                        disabled={loadingId === apt.id}
                        className="w-full mt-6 py-4 bg-white text-emerald-600 rounded-xl font-bold text-lg shadow-sm hover:bg-emerald-50 transition-colors flex items-center justify-center gap-3"
                      >
                        {loadingId === apt.id ? (
                          <>
                            <span className="animate-spin">⏳</span> Finalizando...
                          </>
                        ) : (
                          <>
                            <Check size={24} /> FINALIZAR ATENDIMENTO
                          </>
                        )}
                      </button>
                    </div>
                  ) : null,
                )}
              </div>
            )}

            {/* PrÃ³ximos Pacientes - Grid Layout */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">ðŸ“‹ PrÃ³ximos Pacientes</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {readyAppointments
                  .filter((apt) => apt.status === SERVICE_STATUSES.AWAITING_PROFESSIONAL)
                  .map((apt) => (
                    <div
                      key={apt.id}
                      className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-shadow p-5 border-l-4 border-blue-500 flex flex-col"
                    >
                      <div className="space-y-3 flex-1">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
                            HorÃ¡rio
                          </p>
                          <p className="text-2xl font-bold text-gray-900">
                            ðŸ• {apt.scheduled_time?.substring(0, 5) || 'â€”'}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
                            Paciente
                          </p>
                          <p className="text-base font-bold text-gray-900">{apt.patient_name}</p>
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
                            ServiÃ§o
                          </p>
                          <p className="text-sm text-gray-700">{apt.service_name || 'â€”'}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleStartCare(apt)}
                        disabled={loadingId === apt.id}
                        className="w-full mt-6 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold disabled:opacity-50 transition flex items-center justify-center gap-2"
                      >
                        {loadingId === apt.id ? (
                          <>
                            <span className="animate-spin">â³</span> Iniciando...
                          </>
                        ) : (
                          <>
                            <Play size={18} /> INICIAR
                          </>
                        )}
                      </button>
                    </div>
                  ))}
              </div>

              {readyAppointments.filter(
                (apt) => apt.status === SERVICE_STATUSES.AWAITING_PROFESSIONAL,
              ).length === 0 && (
                <div className="bg-gray-50 rounded-xl p-8 text-center">
                  <CheckCircle className="text-green-500 mx-auto mb-3" size={40} />
                  <p className="text-gray-600 font-medium">
                    Todos os agendamentos jÃ¡ foram iniciados!
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
