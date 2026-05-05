/**
 * AtendimentoProfissionalView.jsx
 *
 * 👨‍⚕️ TELA DE ATENDIMENTO DO PROFISSIONAL
 *
 * Responsabilidade: Interface clara e simples para profissional realizar atendimento
 *
 * Fluxo:
 * Clicou em "Aguardando Profissional" → Vem para essa tela → Inicia atendimento → Finaliza
 *
 * Navegação:
 * /clinica/agenda/atendimento/:appointmentId
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
import { SERVICE_STATUSES, getStatusLabel } from '@/lib/appointmentStatusConstants';
import { updateAppointment } from '@/lib/appointmentsApi';
import { getAppointmentById } from '@/lib/agendaApi';
import { ArrowLeft, Play, Check, Clock, User, AlertCircle, Loader } from 'lucide-react';

export default function AtendimentoProfissionalView() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { clinicId } = useClinicContext();

  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  // ✅ Detectar de onde veio (Paciente ou Agenda)
  const previousPage =
    location.state?.previousPage || localStorage.getItem('appointmentPreviousPage') || 'agenda';

  // Auto-navegar quando atendimento é finalizado
  useEffect(() => {
    if (appointment?.status === SERVICE_STATUSES.FINISHED) {
      const timer = setTimeout(() => {
        console.log('🔄 Redirecionando para agenda após finalizar...');
        navigate('/clinica/agenda', { replace: true });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [appointment?.status, navigate]);

  // Carregar dados do atendimento
  useEffect(() => {
    const loadAppointment = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!appointmentId) {
          setError('ID de atendimento não fornecido');
          return;
        }

        console.log('📅 Buscando appointment:', appointmentId);

        // ✅ Buscar diretamente por ID (sem filtros de data ou profissional)
        const foundAppointment = await getAppointmentById(appointmentId);

        if (!foundAppointment) {
          console.error('❌ Appointment não encontrado. ID:', appointmentId);
          setError('Atendimento não encontrado');
          return;
        }

        // Verificar se o appointment pertence à clínica correta
        if (clinicId && foundAppointment.clinic_id !== clinicId) {
          console.error(
            '❌ Appointment pertence a outra clínica. Clinic ID:',
            foundAppointment.clinic_id,
          );
          setError('Atendimento não encontrado');
          return;
        }

        setAppointment(foundAppointment);
        console.log('✅ Atendimento carregado:', foundAppointment);
      } catch (err) {
        console.error('❌ Erro ao carregar atendimento:', err);
        setError('Erro ao carregar atendimento: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    loadAppointment();
  }, [appointmentId, clinicId]);

  /**
   * Inicia o atendimento (muda status para EM_ATENDIMENTO)
   * Depois navega para a página de prontuário do paciente
   */
  const handleStartAppointment = useCallback(async () => {
    if (!appointment) {
      console.error('❌ Tentou iniciar atendimento mas appointment é null');
      return;
    }

    try {
      setActionLoading(true);
      console.log('🔵 Iniciando atendimento para:', appointment.id);

      const updates = {
        status: SERVICE_STATUSES.IN_SERVICE,
        started_at: new Date().toISOString(),
      };

      console.log('📝 Enviando updates:', updates);
      const result = await updateAppointment(appointment.id, updates);
      console.log('✅ Resposta da API:', result);

      console.log('✅ Atendimento iniciado, navegando para prontuário...');

      // Navegar para o prontuário do paciente
      if (appointment.patient_id) {
        // Salvar que veio de um atendimento
        localStorage.setItem(
          'appointmentPreviousPage',
          JSON.stringify({
            type: 'appointment',
            appointmentId: appointment.id,
            patientId: appointment.patient_id,
            destination: 'patient-detail',
          }),
        );

        navigate(`/clinica/pacientes/${appointment.patient_id}`, {
          state: {
            previousPage: 'appointment',
            appointmentId: appointment.id,
            returnToAppointment: true,
          },
        });
      } else {
        console.error('❌ Patient ID não encontrado no appointment');
        setError('Erro: ID do paciente não encontrado');
      }
    } catch (err) {
      console.error('❌ Erro ao iniciar atendimento:', err);
      console.error('Stack:', err.stack);
      setError('Erro ao iniciar atendimento: ' + (err.message || err));
    } finally {
      setActionLoading(false);
    }
  }, [appointment, navigate]);

  /**
   * Finaliza o atendimento (muda status para FINALIZADO)
   */
  const handleFinishAppointment = useCallback(async () => {
    if (!appointment) {
      return;
    }

    try {
      setActionLoading(true);

      const updates = {
        status: SERVICE_STATUSES.FINISHED,
        finished_at: new Date().toISOString(),
      };

      const result = await updateAppointment(appointment.id, updates);

      console.log('✅ Atendimento finalizado, atualizando estado...');
      setAppointment((prev) => ({
        ...prev,
        ...updates,
      }));
      // O useEffect de auto-navegação vai cuidar de redirecionar
    } catch (err) {
      console.error('❌ Erro ao finalizar atendimento:', err);
      setError('Erro ao finalizar atendimento');
    } finally {
      setActionLoading(false);
    }
  }, [appointment]);

  const handleBack = useCallback(() => {
    // ✅ LÓGICA INTELIGENTE DE VOLTAR
    // Se veio de Paciente, volta pro Paciente
    // Se veio de Agenda, volta pra Agenda

    console.log('🔙 Handle Back - previousPage:', previousPage);
    console.log('   location.state:', location.state);

    // Verificar localStorage como fallback
    let storedData = null;
    try {
      const stored = localStorage.getItem('appointmentPreviousPage');
      if (stored) {
        storedData = JSON.parse(stored);
      }
    } catch (err) {
      console.error('Erro ao parsear appointmentPreviousPage:', err);
    }

    // Determinar de onde veio
    const cameFromPatient =
      previousPage === 'patient-detail' ||
      storedData?.type === 'patient-detail' ||
      location.state?.previousPage === 'patient-detail';

    if (appointment?.patient_id && cameFromPatient) {
      console.log('🔙 Voltando para Paciente:', appointment.patient_id);
      navigate(`/clinica/pacientes/${appointment.patient_id}`, {
        replace: true,
        state: { returningFromAppointment: true },
      });
      return;
    }

    // Fallback: voltar para Agenda
    console.log('🔙 Voltando para Agenda');
    navigate('/clinica/agenda', { replace: true });
  }, [navigate, appointment, previousPage, location.state]);

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-gray-600">Carregando atendimento...</p>
        </div>
      </div>
    );
  }

  // Error
  if (error || !appointment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Erro</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={handleBack}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Voltar para Agenda
          </button>
        </div>
      </div>
    );
  }

  const isAwaitingProfessional = appointment.status === SERVICE_STATUSES.AWAITING_PROFESSIONAL;
  const isInService = appointment.status === SERVICE_STATUSES.IN_SERVICE;
  const isFinished = appointment.status === SERVICE_STATUSES.FINISHED;

  const getStatusColor = () => {
    switch (appointment.status) {
    case SERVICE_STATUSES.AWAITING_PROFESSIONAL:
      return 'bg-amber-100 text-amber-800';
    case SERVICE_STATUSES.IN_SERVICE:
      return 'bg-blue-100 text-blue-800';
    case SERVICE_STATUSES.FINISHED:
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-xl font-semibold text-gray-900">Atendimento de Paciente</h1>
          <div className={`ml-auto px-3 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}>
            {getStatusLabel(appointment.status)}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Card Principal */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
          {/* Informações do Paciente */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-blue-100 text-sm mb-1">Paciente</p>
                <h2 className="text-3xl font-bold">{appointment.patient_name || 'Sem nome'}</h2>
              </div>
              <User className="w-12 h-12 text-blue-100 opacity-50" />
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-blue-100 mb-1">Data e Hora</p>
                <p className="font-semibold">
                  {appointment.scheduled_date && appointment.scheduled_time
                    ? `${new Date(appointment.scheduled_date).toLocaleDateString('pt-BR')} às ${appointment.scheduled_time}`
                    : 'Não definido'}
                </p>
              </div>
              <div>
                <p className="text-blue-100 mb-1">Profissional</p>
                <p className="font-semibold">
                  {appointment.professionals?.name || 'Não atribuído'}
                </p>
              </div>
            </div>
          </div>

          {/* Detalhes */}
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Detalhes do Atendimento</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-sm text-gray-600">Serviço</label>
                <p className="text-base font-medium text-gray-900 mt-1">
                  {appointment.services?.name || 'Não definido'}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Convênio</label>
                <p className="text-base font-medium text-gray-900 mt-1">
                  {appointment.payers?.name || 'Particular'}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Sala</label>
                <p className="text-base font-medium text-gray-900 mt-1">
                  {appointment.rooms?.name || 'Não definida'}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Anotações</label>
                <p className="text-base font-medium text-gray-900 mt-1">
                  {appointment.notes || 'Sem anotações'}
                </p>
              </div>
            </div>
          </div>

          {/* Ações */}
          <div className="p-6 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Ações</h3>
            <div className="flex gap-3 flex-wrap">
              {isAwaitingProfessional && (
                <button
                  onClick={handleStartAppointment}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  <Play className="w-5 h-5" />
                  {actionLoading ? 'Iniciando...' : 'Iniciar Atendimento'}
                </button>
              )}

              {isInService && (
                <button
                  onClick={handleFinishAppointment}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  <Check className="w-5 h-5" />
                  {actionLoading ? 'Finalizando...' : 'Finalizar Atendimento'}
                </button>
              )}

              {isFinished && (
                <div className="flex items-center gap-2 px-6 py-3 bg-green-100 text-green-800 rounded-lg font-medium">
                  <Check className="w-5 h-5" />
                  Atendimento Finalizado
                </div>
              )}

              <button
                onClick={handleBack}
                disabled={actionLoading}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
