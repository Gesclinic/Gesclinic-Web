/**
 * CheckinRecepacao.jsx
 *
 * 🧠 TELA DE CHECK-IN DA RECEPÇÃO
 *
 * Responsabilidade: Validar dados, resolver pendências e liberar pacientes
 *
 * Fluxo:
 * Paciente chega → Conferir dados → Financeiro OK? → Liberar para profissional
 *
 * Regras críticas:
 * ✅ Sem checklist completo → não libera
 * ✅ Financeiro pendente → não libera
 * ✅ Profissional não acessa essa tela
 * ✅ Status governa tudo
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
import {
  APPOINTMENT_STATUS,
  getStatusLabel,
  getStatusColor,
  canPerformAction,
} from '@/lib/appointmentStatusEnums';
import { updateAppointment, listAppointments } from '@/lib/appointmentsApi';
import { AlertCircle, CheckCircle2, Clock, User, Phone, AlertTriangle } from 'lucide-react';
import CheckinChecklist from './components/CheckinChecklist';
import CheckinFinanceiro from './components/CheckinFinanceiro';
import CheckinAcoes from './components/CheckinAcoes';

export default function CheckinRecepacao() {
  const { user, currentRole, loading: authLoading } = useAuth();
  const { clinicId, loadingClinic } = useClinicContext();

  // Estado
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAptId, setSelectedAptId] = useState(null);
  const [activeTab, setActiveTab] = useState('checklist'); // checklist, financeiro, acoes
  const [loadingAction, setLoadingAction] = useState(null);

  // Validação de permissão
  const canAccessCheckin = canPerformAction(currentRole, 'canMarkArrival');

  // ============================================
  // CARREGAMENTO DE DADOS
  // ============================================

  const loadAppointments = useCallback(async () => {
    try {
      setLoading(true);

      if (!clinicId) {
        setAppointments([]);
        return;
      }

      // Carrega agendamentos de hoje que precisam de check-in
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(new Date().getTime() + 86400000).toISOString().split('T')[0];

      // 🔒 RBAC: Se for profissional, buscar seu professional_id
      let userProfessionalId = null;
      if (currentRole?.toLowerCase?.() === 'profissional' && user?.email) {
        const { supabase } = await import('@/lib/customSupabaseClient');
        const { data: profData } = await supabase
          .from('professionals')
          .select('id')
          .eq('email', user.email)
          .eq('clinic_id', clinicId)
          .maybeSingle();
        if (profData?.id) {
          userProfessionalId = profData.id;
          console.log('✅ [RBAC] Profissional identificado para checkin:', userProfessionalId);
        }
      }

      const data = await listAppointments({
        clinicId,
        start: today,
        end: tomorrow,
        userRole: currentRole,
        userProfessionalId: userProfessionalId,
      });

      // Filtra apenas status que estão na recepção
      const checkInAppointments = data.filter((apt) =>
        [
          APPOINTMENT_STATUS.CONFIRMADO,
          APPOINTMENT_STATUS.AGENDADO,
          APPOINTMENT_STATUS.AGUARDANDO,
          APPOINTMENT_STATUS.PENDENTE,
          APPOINTMENT_STATUS.FINANCEIRO_PENDENTE,
          APPOINTMENT_STATUS.LIBERADO_PARA_ATENDIMENTO,
        ].includes(apt.status),
      );

      setAppointments(checkInAppointments);

      // Se nenhum selecionado, seleciona o primeiro
      if (!selectedAptId && checkInAppointments.length > 0) {
        setSelectedAptId(checkInAppointments[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error);
    } finally {
      setLoading(false);
    }
  }, [clinicId, selectedAptId]);

  // Carrega no mount
  React.useEffect(() => {
    if (!authLoading && !loadingClinic) {
      loadAppointments();
    }
  }, [authLoading, loadingClinic, loadAppointments]);

  // Poll a cada 30s
  React.useEffect(() => {
    const interval = setInterval(loadAppointments, 30000);
    return () => clearInterval(interval);
  }, [loadAppointments]);

  // ============================================
  // SELEÇÃO DE PACIENTE
  // ============================================

  const selectedAppointment = useMemo(
    () => appointments.find((apt) => apt.id === selectedAptId),
    [appointments, selectedAptId],
  );

  // ============================================
  // AGRUPAMENTO POR STATUS
  // ============================================

  const groupedByStatus = useMemo(() => {
    const groups = {};
    appointments.forEach((apt) => {
      if (!groups[apt.status]) {
        groups[apt.status] = [];
      }
      groups[apt.status].push(apt);
    });
    return groups;
  }, [appointments]);

  // ============================================
  // ATUALIZAR AGENDAMENTO
  // ============================================

  const updateStatus = useCallback(
    async (appointmentId, newStatus, additionalData = {}) => {
      try {
        setLoadingAction(appointmentId);
        await updateAppointment(appointmentId, {
          status: newStatus,
          updated_at: new Date().toISOString(),
          ...additionalData,
        });
        loadAppointments();
      } catch (error) {
        console.error('Erro ao atualizar:', error);
        alert('Erro ao atualizar agendamento');
      } finally {
        setLoadingAction(null);
      }
    },
    [loadAppointments],
  );

  // ============================================
  // VERIFICAÇÃO DE PERMISSÕES
  // ============================================

  if (!canAccessCheckin) {
    return (
      <div className="p-8 text-center text-red-600">
        ⚠️ Você não tem permissão para acessar o check-in da recepção.
      </div>
    );
  }

  if (authLoading || loadingClinic || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando agendamentos...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDERIZAÇÃO
  // ============================================

  return (
    <div className="flex h-screen bg-gray-50">
      {/* SIDEBAR — Lista de Pacientes */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4">
          <h1 className="text-xl font-bold">📋 Check-in da Recepção</h1>
          <p className="text-sm text-blue-100 mt-1">Hoje ({appointments.length})</p>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {appointments.length === 0 ? (
            <div className="p-4 text-center text-gray-500">Nenhum agendamento para hoje</div>
          ) : (
            <div className="space-y-1 p-2">
              {appointments.map((apt) => (
                <button
                  key={apt.id}
                  onClick={() => {
                    setSelectedAptId(apt.id);
                    setActiveTab('checklist');
                  }}
                  className={`
                    w-full text-left p-3 rounded-lg border-l-4 transition
                    ${
                selectedAptId === apt.id
                  ? 'bg-blue-50 border-blue-500'
                  : 'bg-white border-gray-200 hover:bg-gray-50'
                }
                  `}
                  style={{
                    borderLeftColor:
                      apt.status === APPOINTMENT_STATUS.LIBERADO_PARA_ATENDIMENTO
                        ? '#10b981'
                        : apt.status === APPOINTMENT_STATUS.PENDENTE
                          ? '#f97316'
                          : apt.status === APPOINTMENT_STATUS.FINANCEIRO_PENDENTE
                            ? '#e11d48'
                            : '#eab308',
                  }}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="font-semibold text-gray-900">{apt.patient_name}</div>
                    <span
                      className={`text-xs px-2 py-1 rounded font-medium ${getStatusColor(
                        apt.status,
                      )}`}
                    >
                      {getStatusLabel(apt.status).substring(0, 10)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 space-y-0.5">
                    <p>🕐 {apt.start_time?.substring(0, 5)}</p>
                    <p>
                      💼 {apt.service_name || 'Serviço'} | 👨‍⚕️ {apt.professional_name || 'Prof'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MAIN — Painel do Paciente */}
      <div className="flex-1 flex flex-col">
        {selectedAppointment ? (
          <>
            {/* Header do Paciente */}
            <div className="bg-white border-b border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedAppointment.patient_name}
                  </h2>
                  <div className="mt-3 space-y-2 text-sm text-gray-600">
                    <p>
                      🕐 Horário:{' '}
                      <span className="font-semibold">
                        {selectedAppointment.start_time?.substring(0, 5)}
                      </span>
                    </p>
                    <p>
                      💼 Serviço:{' '}
                      <span className="font-semibold">{selectedAppointment.service_name}</span>
                    </p>
                    <p>
                      👨‍⚕️ Profissional:{' '}
                      <span className="font-semibold">{selectedAppointment.professional_name}</span>
                    </p>
                    <p>
                      💳 Convênio:{' '}
                      <span className="font-semibold">
                        {selectedAppointment.payer_name || 'Particular'}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`inline-block px-4 py-2 rounded-lg font-bold text-lg ${getStatusColor(
                      selectedAppointment.status,
                    )}`}
                  >
                    {getStatusLabel(selectedAppointment.status)}
                  </span>
                </div>
              </div>

              {/* Alertas Contextuais */}
              {selectedAppointment.status === APPOINTMENT_STATUS.PENDENTE && (
                <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle className="text-orange-600 flex-shrink-0 mt-0.5" size={20} />
                  <div>
                    <p className="font-semibold text-orange-900">Pendência!</p>
                    <p className="text-sm text-orange-800">
                      Conferir dados cadastrais e documentação
                    </p>
                  </div>
                </div>
              )}

              {selectedAppointment.status === APPOINTMENT_STATUS.FINANCEIRO_PENDENTE && (
                <div className="mt-4 bg-rose-50 border border-rose-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle className="text-rose-600 flex-shrink-0 mt-0.5" size={20} />
                  <div>
                    <p className="font-semibold text-rose-900">Financeiro Pendente!</p>
                    <p className="text-sm text-rose-800">Gerar guia ou registrar pagamento</p>
                  </div>
                </div>
              )}

              {selectedAppointment.status === APPOINTMENT_STATUS.LIBERADO_PARA_ATENDIMENTO && (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
                  <CheckCircle2 className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
                  <div>
                    <p className="font-semibold text-green-900">Pronto para Atendimento! ✅</p>
                    <p className="text-sm text-green-800">Paciente está validado e liberado</p>
                  </div>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="bg-white border-b border-gray-200 px-6">
              <div className="flex gap-8">
                <button
                  onClick={() => setActiveTab('checklist')}
                  className={`py-4 font-semibold border-b-2 transition ${
                    activeTab === 'checklist'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  ✅ Checklist
                </button>
                <button
                  onClick={() => setActiveTab('financeiro')}
                  className={`py-4 font-semibold border-b-2 transition ${
                    activeTab === 'financeiro'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  💰 Financeiro
                </button>
                <button
                  onClick={() => setActiveTab('acoes')}
                  className={`py-4 font-semibold border-b-2 transition ${
                    activeTab === 'acoes'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  ⚙️ Ações
                </button>
              </div>
            </div>

            {/* Conteúdo das Abas */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'checklist' && <CheckinChecklist appointment={selectedAppointment} />}

              {activeTab === 'financeiro' && (
                <CheckinFinanceiro appointment={selectedAppointment} />
              )}

              {activeTab === 'acoes' && (
                <CheckinAcoes
                  appointment={selectedAppointment}
                  onUpdateStatus={updateStatus}
                  loading={loadingAction === selectedAppointment.id}
                  onRefresh={loadAppointments}
                />
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Selecione um paciente para começar
          </div>
        )}
      </div>
    </div>
  );
}
