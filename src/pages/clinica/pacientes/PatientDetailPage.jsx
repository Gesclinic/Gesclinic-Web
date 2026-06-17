/**
 * ================================================
 * PatientDetailPage - Tela Única com Abas Internas
 * ================================================
 *
 * RESPONSABILIDADES:
 * ✅ Uma única rota: /clinica/pacientes/:patientId
 * ✅ Carrega paciente uma ÚNICA vez
 * ✅ Gerencia abas internas (sem alterar URL)
 * ✅ Centraliza toda navegação de paciente
 * ✅ Valida patientId obrigatoriamente
 *
 * ABAS DISPONÍVEIS:
 * 1. Dados Cadastrais
 * 2. Convênios
 * 3. Dados Familiares
 * 4. Documentos
 * 5. Histórico Clínico
 * 6. Receita
 * 7. Laudos
 *
 * ARQUITETURA:
 * - Sem rotas aninhadas
 * - Abas gerenciadas por estado (PatientContext.activeTab)
 * - Carregamento centralizado em useEffect
 * - Performance otimizada (fetch uma vez)
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { getPatientById } from '@/lib/patientsApi';
import { supabase } from '@/lib/customSupabaseClient';
import { updateAppointment } from '@/lib/appointmentsApi';
import { syncAppointmentBilling } from '@/lib/appointmentBillingApi';
import { migrateStatus, SERVICE_STATUSES } from '@/lib/appointmentStatusConstants';
import { uploadPatientPhoto, updatePatientPhoto } from '@/lib/patientsApi';
import { useToast } from '@/components/ui/use-toast';
import PageLayout from '@/components/ui/PageLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import PhotoCapture from '@/components/PhotoCapture';
import {
  AlertCircle,
  FileText,
  Heart,
  Users2,
  FolderOpen,
  BookOpen,
  AlertTriangle,
  CheckCircle,
  Clock,
  Edit2,
  ArrowLeft,
  Calendar,
  Stethoscope,
  LogOut,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

// Import dos componentes de aba
import DadosCadastraisTab from '@/components/pacientes/tabs/DadosCadastraisTab';
import ConveniosTab from '@/components/pacientes/tabs/ConveniosTab';
import FamiliaresTab from '@/components/pacientes/tabs/FamiliaresTab';
import DocumentosTab from '@/components/pacientes/tabs/DocumentosTab';
import HistoricoClinicoTab from '@/components/pacientes/tabs/HistoricoClinicoTab';
import ReceitasDigitaisTab from '@/components/pacientes/tabs/ReceitasDigitaisTab';
import LaudosTab from '@/components/pacientes/tabs/LaudosTab';

const TABS = [
  {
    id: 'dados',
    label: 'Dados Cadastrais',
    icon: FileText,
    color: 'blue',
    badge: 'essential',
    description: 'CPF, telefone, endereço',
  },
  {
    id: 'convenios',
    label: 'Convênios',
    icon: Heart,
    color: 'red',
    badge: 'count',
    description: 'Planos de saúde',
  },
  {
    id: 'familiares',
    label: 'Dados Familiares',
    icon: Users2,
    color: 'green',
    badge: 'count',
    description: 'Responsáveis e contatos',
  },
  {
    id: 'documentos',
    label: 'Documentos',
    icon: FolderOpen,
    color: 'amber',
    badge: 'count',
    description: 'Exames e atestados',
  },
  {
    id: 'historico',
    label: 'Histórico Clínico',
    icon: BookOpen,
    color: 'purple',
    badge: 'critical',
    description: 'Consultas e diagnósticos',
  },
  {
    id: 'receitas',
    label: 'Receita',
    icon: FileText,
    color: 'emerald',
    badge: 'count',
    description: 'Receitas',
  },
  {
    id: 'laudos',
    label: 'Laudos',
    icon: FileText,
    color: 'sky',
    badge: 'count',
    description: 'Laudos clínicos formais e preparo para portal do paciente',
  },
];

const ALERT_CONFIGS = {
  documentsIncomplete: {
    icon: FileText,
    title: 'Documentos Incompletos',
    description: 'Faltam documentos importantes',
    color: 'orange',
  },
  expiredInsurance: {
    icon: AlertTriangle,
    title: 'Convênio Vencido',
    description: 'O convênio principal está vencido',
    color: 'red',
  },
  incompleteRegistration: {
    icon: AlertCircle,
    title: 'Cadastro Incompleto',
    description: 'Dados do paciente incompletos',
    color: 'yellow',
  },
  overdue: {
    icon: Clock,
    title: 'Inadimplência',
    description: 'Paciente com contas pendentes',
    color: 'red',
  },
};

export default function PatientDetailPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { clinicId } = useAuth();
  const { toast } = useToast();

  // Estado local do paciente (sem depender de contexto)
  const [patientData, setPatientData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('dados');
  const [alerts, setAlerts] = useState({
    documentsIncomplete: false,
    expiredInsurance: false,
    incompleteRegistration: false,
    overdue: false,
  });

  // ✅ Modal para finalizar atendimento ao fechar prontuário
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const navigationBlockedRef = useRef(false);

  // Função para carregar paciente
  const loadPatient = useCallback(async (id) => {
    if (!id || id.trim() === '') {
      setPatientData(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getPatientById(id);
      if (data) {
        setPatientData(data);
        // Calcular alertas
        const newAlerts = {
          documentsIncomplete: !data.photo_url,
          expiredInsurance: false,
          incompleteRegistration: !data.street || !data.number || !data.city || !data.state,
          overdue: false,
        };
        setAlerts(newAlerts);
      } else {
        setError('Paciente não encontrado');
        setPatientData(null);
      }
    } catch (err) {
      console.error('Erro ao carregar paciente:', err);
      setError(err.message);
      setPatientData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Atualizar dados do paciente em cache
  const updatePatientData = useCallback((updatedData) => {
    setPatientData((prev) => ({
      ...prev,
      ...updatedData,
    }));
  }, []);

  // Estado para gerenciar retorno ao checkin
  const [checkinData, setCheckinData] = useState(null);
  const [showReturnButton, setShowReturnButton] = useState(false);
  const [showPhotoEditor, setShowPhotoEditor] = useState(false);
  const [defaultProfessional, setDefaultProfessional] = useState('');
  const [comingFromAppointment, setComingFromAppointment] = useState(false);
  const [appointmentFlow, setAppointmentFlow] = useState({
    appointmentId: null,
    status: null,
    scheduledDate: null,
  });
  const [startingAppointment, setStartingAppointment] = useState(false);

  // ✅ Carregar paciente quando patientId muda
  useEffect(() => {
    if (!patientId || patientId.trim() === '') {
      console.warn('❌ PatientDetailPage: patientId inválido');
      navigate('/clinica/pacientes');
      return;
    }

    console.log(`📥 PatientDetailPage: Carregando paciente ${patientId}`);
    loadPatient(patientId);
  }, [patientId, loadPatient, navigate]);

  // ⚠️ GUARD: Configurar UI quando dados chegam
  useEffect(() => {
    if (!patientId || patientId.trim() === '') {
      return;
    }

    const requestedTab = location.state?.openTab;
    if (requestedTab) {
      setActiveTab(requestedTab);
    }

    // ✅ Verificar se veio de um atendimento (via localStorage)
    const appointmentModeData = localStorage.getItem('fromAppointmentMode');
    let storedAppointmentMode = null;
    let fromAppointment = false;
    if (appointmentModeData) {
      try {
        const data = JSON.parse(appointmentModeData);
        const isRecent = Date.now() - data.timestamp < 8 * 60 * 60 * 1000;
        const isSamePatient = !data.patientId || data.patientId === patientId;
        if (isRecent && isSamePatient) {
          console.log('👨‍⚕️ Vindo de um atendimento em andamento:', data);
          storedAppointmentMode = data;
          fromAppointment = true;
          setComingFromAppointment(true);
          if (data.professionalName) {
            setDefaultProfessional(String(data.professionalName).trim());
          }
        }
      } catch (err) {
        console.warn('⚠️ Erro ao parsear fromAppointmentMode:', err);
      }
    }

    // ✅ Carregar profissional do atendimento se veio da agenda
    const appointmentId = location.state?.appointmentId || storedAppointmentMode?.appointmentId;

    if (location.state?.fromAgendaClinicalFlow) {
      fromAppointment = true;
      setComingFromAppointment(true);
    }

    console.log('📍 PatientDetailPage carregada');
    console.log('👨‍⚕️ fromAppointment:', fromAppointment);

    if (appointmentId) {
      console.log('📋 Carregando dados do atendimento:', appointmentId);
      supabase
        .from('appointments')
        .select(
          'id, professional_id, status, scheduled_date, professionals:professional_id(id, name)',
        )
        .eq('id', appointmentId)
        .single()
        .then(({ data, error }) => {
          if (error) {
            console.warn('⚠️ Erro ao carregar dados do atendimento:', error);
            return;
          }

          if (data) {
            console.log('📋 Dados do atendimento recebidos:', data);
            const professionalName =
              data.professionals?.name || location.state?.professionalName || storedAppointmentMode?.professionalName || '';
            const normalizedStatus = migrateStatus(data.status);
            console.log('👤 Nome do profissional extraído:', professionalName);

            setAppointmentFlow({
              appointmentId: data.id,
              status: normalizedStatus,
              scheduledDate: data.scheduled_date || null,
            });

            if (professionalName && professionalName.trim()) {
              setDefaultProfessional(professionalName.trim());
              console.log('✅ Profissional definido como:', professionalName.trim());
            } else {
              console.warn('⚠️ Nome do profissional vazio ou profissional não encontrado');
            }
          }
        })
        .catch((err) => {
          console.error('❌ Erro na query de atendimento:', err);
        });
    } else {
      console.log('ℹ️ Nenhum appointmentId no location.state');
    }

    // ✅ Verificar se veio de um checkin
    const storedCheckinData = localStorage.getItem('checkinReturnData');
    if (storedCheckinData) {
      try {
        const data = JSON.parse(storedCheckinData);
        setCheckinData(data);
        setShowReturnButton(true);
        console.log('✅ Retorno ao checkin ativado:', data);
      } catch (err) {
        console.warn('⚠️ Erro ao parsear checkinReturnData:', err);
      }
    }
  }, [
    patientId,
    loadPatient,
    navigate,
    location.state?.appointmentId,
    location.state?.fromAgendaClinicalFlow,
    location.state?.openTab,
    setActiveTab,
  ]);

  // ✅ Limpar aba ativa quando sair da tela
  useEffect(() => {
    return () => {
      // Limpar dados de checkin se ainda estiverem lá e user saiu sem usar
      // (será preservado se user clicou no botão de voltar)
    };
  }, []);

  // ✅ Calcular se atendimento está em progresso (antes de useEffect)
  const canStartAppointment = appointmentFlow.status === SERVICE_STATUSES.AWAITING_PROFESSIONAL;
  const isAppointmentInProgress = appointmentFlow.status === SERVICE_STATUSES.IN_SERVICE;

  // ✅ Interceptar navegação se há atendimento em progresso
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isAppointmentInProgress && navigationBlockedRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isAppointmentInProgress]);

  // Calcular idade
  function calculateAge(birthDate) {
    if (!birthDate) {
      return null;
    }
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  const age = patientData ? calculateAge(patientData.birthdate || patientData.birth_date) : null;

  const handleStartAppointmentFromPatient = async () => {
    if (!appointmentFlow.appointmentId) {
      return;
    }

    try {
      setStartingAppointment(true);

      await updateAppointment(appointmentFlow.appointmentId, {
        status: SERVICE_STATUSES.IN_SERVICE,
        started_at: new Date().toISOString(),
      });

      localStorage.setItem(
        'fromAppointmentMode',
        JSON.stringify({
          appointmentId: appointmentFlow.appointmentId,
          patientId,
          appointmentDate: appointmentFlow.scheduledDate,
          professionalName: defaultProfessional,
          timestamp: Date.now(),
        }),
      );

      setAppointmentFlow((prev) => ({
        ...prev,
        status: SERVICE_STATUSES.IN_SERVICE,
      }));
      setComingFromAppointment(true);
      setActiveTab('historico');

      toast({
        title: 'Atendimento iniciado',
        description: 'Prontuário pronto para registrar a evolução clínica.',
      });
    } catch (startError) {
      console.error('❌ Erro ao iniciar atendimento pelo prontuário:', startError);
      toast({
        title: 'Erro',
        description: startError?.message || 'Não foi possível iniciar o atendimento.',
        variant: 'destructive',
      });
    } finally {
      setStartingAppointment(false);
    }
  };

  // ✅ Função para gerenciar navegação com confirmação
  const navigateWithConfirmation = (destination) => {
    if (isAppointmentInProgress) {
      // Bloquear navegação e mostrar modal
      navigationBlockedRef.current = true;
      setPendingNavigation(destination);
      setShowFinishModal(true);
    } else {
      // Navegar direto se não há atendimento
      navigate(destination, { replace: true });
    }
  };

  // ✅ Finalizar atendimento e depois navegar
  const handleFinishAndNavigate = async () => {
    try {
      setStartingAppointment(true);

      console.log('🏁 Finalizando atendimento...');
      await updateAppointment(appointmentFlow.appointmentId, {
        status: SERVICE_STATUSES.ATTENDED,
        finished_at: new Date().toISOString(),
      });

      setAppointmentFlow((prev) => ({
        ...prev,
        status: SERVICE_STATUSES.ATTENDED,
      }));

      toast({
        title: 'Atendimento encerrado',
        description: 'O status foi alterado para Atendido.',
      });

      // ✅ Sincronizar faturamento
      console.log('💳 Sincronizando faturamento do appointment:', appointmentFlow.appointmentId);
      const billingResult = await syncAppointmentBilling(appointmentFlow.appointmentId);

      if (billingResult.success) {
        console.log('✅ Faturamento sincronizado com sucesso');
      }

      // Fechar modal e navegar
      setShowFinishModal(false);
      navigationBlockedRef.current = false;

      setTimeout(() => {
        if (pendingNavigation) {
          navigate(pendingNavigation, { replace: true });
          setPendingNavigation(null);
        }
      }, 500);
    } catch (error) {
      console.error('Erro ao finalizar atendimento:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível finalizar o atendimento.',
        variant: 'destructive',
      });
    } finally {
      setStartingAppointment(false);
    }
  };

  // ✅ Apenas navegar sem finalizar
  const handleJustNavigate = () => {
    setShowFinishModal(false);
    navigationBlockedRef.current = false;

    if (pendingNavigation) {
      navigate(pendingNavigation, { replace: true });
      setPendingNavigation(null);
    }
  };

  // ✅ Finalizar atendimento (muda status para ATTENDED)
  const handleFinishAppointmentFromPatient = async () => {
    if (!appointmentFlow.appointmentId) {
      return;
    }

    try {
      setStartingAppointment(true); // Reusar loading state

      await updateAppointment(appointmentFlow.appointmentId, {
        status: SERVICE_STATUSES.ATTENDED,
        finished_at: new Date().toISOString(),
      });

      setAppointmentFlow((prev) => ({
        ...prev,
        status: SERVICE_STATUSES.ATTENDED,
      }));

      toast({
        title: 'Atendimento finalizado',
        description: 'Sincronizando dados de faturamento...',
      });

      // ✅ NOVO: Sincronizar faturamento para Contas a Receber
      console.log('💳 Sincronizando faturamento do appointment:', appointmentFlow.appointmentId);
      const billingResult = await syncAppointmentBilling(appointmentFlow.appointmentId);

      if (billingResult.success) {
        console.log('✅ Faturamento sincronizado com sucesso');
        toast({
          title: 'Sucesso',
          description: billingResult.message,
        });
      } else {
        console.error('⚠️ Erro ao sincronizar faturamento:', billingResult.error);
        toast({
          title: 'Aviso',
          description: billingResult.message,
          variant: 'destructive',
        });
      }

      // Voltar para Agenda após 1.5s
      setTimeout(() => {
        const appointmentDate = appointmentFlow.scheduledDate;
        if (appointmentDate) {
          const startDate = new Date(appointmentDate);
          const formattedDate = startDate.toISOString().split('T')[0];
          navigate(`/clinica/agenda?date=${formattedDate}`, { replace: true });
        } else {
          navigate('/clinica/agenda', { replace: true });
        }
      }, 1500);
    } catch (finishError) {
      console.error('❌ Erro ao finalizar atendimento:', finishError);
      toast({
        title: 'Erro',
        description: finishError?.message || 'Não foi possível finalizar o atendimento.',
        variant: 'destructive',
      });
    } finally {
      setStartingAppointment(false);
    }
  };

  // Filtrar alertas ativos
  const activeAlerts = Object.entries(alerts)
    .filter(([_, value]) => value)
    .map(([key, _]) => ALERT_CONFIGS[key])
    .filter(Boolean);

  // Estado de carregamento
  if (loading) {
    return (
      <PageLayout title="Carregando...">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </PageLayout>
    );
  }

  // Paciente não encontrado
  if (!patientData) {
    return (
      <PageLayout title="Paciente não encontrado">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-gray-600 mb-6">O paciente solicitado não foi encontrado.</p>
              <Button onClick={() => navigate('/clinica/pacientes')}>
                <ArrowLeft size={16} className="mr-2" />
                Voltar para Lista
              </Button>
            </div>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  // Renderizar aba ativa
  function renderTabContent() {
    switch (activeTab) {
      case 'dados':
        return (
          <DadosCadastraisTab
            patientId={patientId}
            patientData={patientData}
            updatePatientData={updatePatientData}
          />
        );
      case 'convenios':
        return (
          <ConveniosTab
            patientId={patientId}
            patientData={patientData}
            updatePatientData={updatePatientData}
          />
        );
      case 'familiares':
        return (
          <FamiliaresTab
            patientId={patientId}
            patientData={patientData}
            updatePatientData={updatePatientData}
          />
        );
      case 'documentos':
        return (
          <DocumentosTab
            patientId={patientId}
            patientData={patientData}
            updatePatientData={updatePatientData}
          />
        );
      case 'historico':
        return (
          <HistoricoClinicoTab
            patientId={patientId}
            patientData={patientData}
            updatePatientData={updatePatientData}
            defaultProfessional={defaultProfessional}
          />
        );
      case 'receitas':
        return (
          <ReceitasDigitaisTab
            patientId={patientId}
            patientData={patientData}
            updatePatientData={updatePatientData}
          />
        );
      case 'laudos':
        return (
          <LaudosTab
            patientId={patientId}
            patientData={patientData}
            updatePatientData={updatePatientData}
          />
        );
      default:
        return (
          <DadosCadastraisTab
            patientId={patientId}
            patientData={patientData}
            updatePatientData={updatePatientData}
          />
        );
    }
  }

  return (
    <>
      <Helmet>
        <title>{patientData.name} - Gesclinic</title>
      </Helmet>

      <PageLayout
        title={patientData.name}
        breadcrumbs={[
          { label: 'Pacientes', href: '/clinica/pacientes' },
          { label: patientData.name },
        ]}
      >
        {/* Card do Paciente */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start mb-6 gap-4">
                {/* Foto pequena 3x4 + Botões */}
                <div className="flex-shrink-0 flex flex-col gap-2">
                  <div className="w-20 relative group">
                    {patientData?.photo_url ? (
                      <img
                        src={patientData.photo_url}
                        alt={patientData?.name}
                        className="w-full rounded-lg border-2 border-gray-300 shadow"
                        style={{ aspectRatio: '3/4', objectFit: 'cover' }}
                      />
                    ) : (
                      <div
                        className="w-full bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center"
                        style={{ aspectRatio: '3/4' }}
                      >
                        <p className="text-2xl">📸</p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 w-20">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowPhotoEditor(!showPhotoEditor)}
                      className="text-xs h-8 text-blue-600"
                    >
                      {showPhotoEditor ? '✕' : '📷 Editar'}
                    </Button>
                    {patientData?.photo_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            await updatePatientPhoto(patientId, null);
                            updatePatientData({ ...patientData, photo_url: null });
                            toast({
                              title: 'Sucesso',
                              description: 'Foto removida com sucesso!',
                            });
                          } catch (error) {
                            console.error('Erro ao remover foto:', error);
                            toast({
                              title: 'Erro',
                              description: 'Não foi possível remover a foto',
                              variant: 'destructive',
                            });
                          }
                        }}
                        className="text-xs h-8 text-red-600"
                      >
                        🗑️ Remover
                      </Button>
                    )}
                  </div>
                </div>

                {/* Dados do Paciente */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 flex-1">
                  {/* Prontuário */}
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Prontuário</p>
                    <p className="font-bold text-blue-600 text-lg">
                      {patientData.prontuario_numero || '—'}
                    </p>
                  </div>

                  {/* CPF */}
                  <div>
                    <p className="text-sm text-gray-600 mb-1">CPF</p>
                    <p className="font-semibold text-gray-900">
                      {patientData.document_id || patientData.cpf || 'N/A'}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 mb-1">Data de Nascimento</p>
                    <p className="font-semibold text-gray-900">
                      {patientData.birthdate || patientData.birth_date
                        ? new Date(
                            patientData.birthdate || patientData.birth_date,
                          ).toLocaleDateString('pt-BR')
                        : 'N/A'}
                      {age && ` (${age} anos)`}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 mb-1">Telefone</p>
                    <p className="font-semibold text-gray-900">
                      {patientData.phone || patientData.cell_phone || 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Botão Agendar Atendimento */}
                <div className="flex gap-3 items-center">
                  {canStartAppointment && (
                    <Button
                      onClick={handleStartAppointmentFromPatient}
                      disabled={startingAppointment}
                      className="bg-violet-600 hover:bg-violet-700 text-white whitespace-nowrap"
                    >
                      <Stethoscope size={18} className="mr-2" />
                      {startingAppointment ? 'Iniciando...' : 'Iniciar Atendimento'}
                    </Button>
                  )}
                  {isAppointmentInProgress && appointmentFlow.appointmentId && (
                    <Button
                      onClick={handleFinishAppointmentFromPatient}
                      disabled={startingAppointment}
                      className="bg-green-600 hover:bg-green-700 text-white whitespace-nowrap"
                    >
                      <CheckCircle size={18} className="mr-2" />
                      {startingAppointment ? 'Finalizando...' : 'Finalizar Atendimento'}
                    </Button>
                  )}
                  {comingFromAppointment && (
                    <Button
                      onClick={() => {
                        const appointmentModeData = localStorage.getItem('fromAppointmentMode');
                        let appointmentDate =
                          appointmentFlow.scheduledDate || location.state?.appointmentDate || null;

                        if (appointmentModeData) {
                          try {
                            const data = JSON.parse(appointmentModeData);
                            appointmentDate = data.appointmentDate;
                          } catch (err) {
                            console.error('Erro ao parsear data do appointment:', err);
                          }
                        }

                        localStorage.removeItem('fromAppointmentMode');

                        if (appointmentDate) {
                          // Navegar para a agenda no dia ou período do agendamento
                          const startDate = new Date(appointmentDate);
                          const formattedDate = startDate.toISOString().split('T')[0];
                          navigateWithConfirmation(`/clinica/agenda?date=${formattedDate}`);
                        } else {
                          navigateWithConfirmation('/clinica/agenda');
                        }
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap"
                    >
                      <ArrowLeft size={18} className="mr-2" />
                      Voltar para Agenda
                    </Button>
                  )}
                  {showReturnButton && (
                    <Button
                      onClick={() => {
                        // Limpar dados de checkin e voltar à agenda
                        localStorage.removeItem('checkinReturnData');
                        navigateWithConfirmation(
                          `/clinica/agenda?checkinComplete=dados_cadastrais&appointmentId=${checkinData?.appointmentId}`,
                        );
                      }}
                      className="bg-orange-600 hover:bg-orange-700 text-white whitespace-nowrap"
                    >
                      <ArrowLeft size={18} className="mr-2" />
                      Voltar ao Check-in
                    </Button>
                  )}
                  {/* ✅ Botão "Agendar Atendimento" - Aparecer APENAS quando não há atendimento em progresso */}
                  {!canStartAppointment && !isAppointmentInProgress && (
                    <Button
                      onClick={() => navigateWithConfirmation(`/clinica/agenda?patientId=${patientId}`)}
                      className="bg-green-600 hover:bg-green-700 text-white whitespace-nowrap"
                    >
                      <Calendar size={18} className="mr-2" />
                      Agendar Atendimento
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* SEÇÃO DE CAPTURA DE FOTO - Expandível */}
        {showPhotoEditor && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6"
          >
            <Card className="border-blue-300 bg-blue-50">
              <CardContent className="pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    📷 Capturar/Atualizar Foto
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPhotoEditor(false)}
                    className="text-gray-500"
                  >
                    ✕
                  </Button>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <PhotoCapture
                    onPhotoCapture={async (photoDataUrl) => {
                      try {
                        const photoUrl = await uploadPatientPhoto(
                          clinicId,
                          patientId,
                          photoDataUrl,
                        );
                        await updatePatientPhoto(patientId, photoUrl);
                        updatePatientData({ ...patientData, photo_url: photoUrl });
                        setShowPhotoEditor(false);
                        toast({
                          title: 'Sucesso',
                          description: 'Foto atualizada com sucesso!',
                        });
                      } catch (error) {
                        console.error('Erro ao atualizar foto:', error);
                        toast({
                          title: 'Erro',
                          description: 'Não foi possível atualizar a foto',
                          variant: 'destructive',
                        });
                      }
                    }}
                    currentPhoto={patientData?.photo_url}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Alertas */}
        {activeAlerts.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 space-y-2">
            {activeAlerts.map((alert, idx) => {
              const IconComponent = alert.icon;
              return (
                <Card
                  key={idx}
                  className={`border-l-4 border-${alert.color}-500 bg-${alert.color}-50`}
                >
                  <CardContent className="pt-4 pb-4 flex items-start gap-4">
                    <IconComponent className={`text-${alert.color}-600 mt-1`} />
                    <div className="flex-1">
                      <p className={`font-semibold text-${alert.color}-900`}>{alert.title}</p>
                      <p className={`text-sm text-${alert.color}-800`}>{alert.description}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </motion.div>
        )}

        {/* Navegação de Abas - Melhorada */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-1 flex gap-1 overflow-x-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              // Cores para cada aba
              const colorMap = {
                blue: isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50',
                red: isActive
                  ? 'bg-red-600 text-white'
                  : 'text-gray-600 hover:text-red-600 hover:bg-red-50',
                green: isActive
                  ? 'bg-green-600 text-white'
                  : 'text-gray-600 hover:text-green-600 hover:bg-green-50',
                amber: isActive
                  ? 'bg-amber-600 text-white'
                  : 'text-gray-600 hover:text-amber-600 hover:bg-amber-50',
                purple: isActive
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50',
                emerald: isActive
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50',
                sky: isActive
                  ? 'bg-sky-600 text-white'
                  : 'text-gray-600 hover:text-sky-600 hover:bg-sky-50',
              };

              return (
                <motion.button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  title={tab.description}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-md font-medium
                    transition-all duration-200 whitespace-nowrap flex-1 justify-center
                    ${colorMap[tab.color]}
                  `}
                >
                  <Icon size={18} />
                  <span className="hidden sm:inline text-sm">{tab.label}</span>
                  <span className="sm:hidden text-sm font-bold">•</span>
                </motion.button>
              );
            })}
          </div>
          {/* Descrição ativa */}
          <div className="mt-3 px-2">
            <p className="text-xs text-gray-500 font-medium">
              {TABS.find((t) => t.id === activeTab)?.description}
            </p>
          </div>
        </motion.div>

        {/* Conteúdo da Aba Ativa */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2 }}
        >
          {renderTabContent()}
        </motion.div>

        {/* ✅ Modal para confirmar finalização de atendimento */}
        <Dialog open={showFinishModal} onOpenChange={setShowFinishModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <LogOut className="w-5 h-5 text-orange-600" />
                Encerrar Atendimento?
              </DialogTitle>
              <DialogDescription>
                Você está prestes a sair do prontuário. Deseja encerrar o atendimento e mudar o status para "Atendido"?
              </DialogDescription>
            </DialogHeader>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 my-4">
              <p className="text-sm text-amber-900">
                <strong>⚠️ Atenção:</strong> Ao confirmar, o status do atendimento será alterado para "Atendido" e o faturamento será sincronizado.
              </p>
            </div>

            <DialogFooter className="gap-3">
              <Button
                variant="outline"
                onClick={handleJustNavigate}
                disabled={startingAppointment}
              >
                Sair sem encerrar
              </Button>
              <Button
                onClick={handleFinishAndNavigate}
                disabled={startingAppointment}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {startingAppointment ? 'Encerrando...' : 'Encerrar atendimento'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageLayout>
    </>
  );
}
