/**
 * CheckinDrawer.jsx
 * 
 * 🎯 CHECK-IN INLINE NA AGENDA
 * 
 * Padrão ERP Profissional:
 * - Abre como Drawer lateral (desktop) ou Modal full-screen (mobile)
 * - Sem mudar de rota
 * - Contexto visual mantido (usuário vê a agenda ao fundo)
 * 
 * Fluxo:
 * 1. Recepção clica em "Check-in" na linha do agendamento
 * 2. Drawer abre com 3 abas: Checklist, Financeiro, Ações
 * 3. Confirma dados, resolve pendências
 * 4. Clica em "Liberar para Atendimento"
 * 5. Drawer fecha, paciente aparece para profissional
 * 
 * Props:
 * - isOpen: bool
 * - appointment: object (agendamento completo)
 * - onClose: () => void
 * - onStatusChange: (appointmentId, newStatus) => void
 */

import React, { useState, useMemo } from "react";
import { X, CheckCircle2, AlertCircle, Zap, Play, Clock, TrendingUp } from "lucide-react";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { updateAppointment } from "@/lib/appointmentsApi";
import { logCheckinStarted } from "@/lib/auditApi";
import {
  validateCheckinData,
  getCheckinSummary,
  confirmCheckin,
} from "@/lib/checkinIntegrationApi";
import { finalizeAppointmentWithFinancials } from "@/lib/appointmentFinancialIntegrationApi";
import MergePatientModal from "@/components/MergePatientModal";
import CheckinChecklist from "../views/components/CheckinChecklist";
import CheckinFinanceiro from "../views/components/CheckinFinanceiro";
import CheckinAcoes from "../views/components/CheckinAcoes";
import CheckinItemModal from "../views/components/CheckinItemModal";
import AppointmentAuditTimeline from "./AppointmentAuditTimeline";
import AppointmentFinancialAuditTimeline from "./AppointmentFinancialAuditTimeline";

export default function CheckinDrawer({
  isOpen,
  appointment,
  onClose,
  onStatusChange,
}) {
  const { currentRole } = useAuth();
  const [activeTab, setActiveTab] = useState("checklist");
  const [loading, setLoading] = useState(false);
  const [checklistComplete, setChecklistComplete] = useState(false);
  const [financialOk, setFinancialOk] = useState(false);
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [currentAppointment, setCurrentAppointment] = useState(appointment);
  const [errors, setErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [editingItemId, setEditingItemId] = useState(null);
  const [itemModalOpen, setItemModalOpen] = useState(false);

  // Validações de permissão
  const canAccessCheckin = ["admin", "gestor", "recepcao"].includes(
    currentRole?.toLowerCase?.()
  );

  // Log de auditoria quando drawer abre (check-in iniciado)
  React.useEffect(() => {
    if (isOpen && appointment?.id) {
      logCheckinStarted(appointment.id).catch(err =>
        console.warn("Erro ao logar check-in iniciado:", err)
      );
      // Atualizar currentAppointment sempre que appointment muda
      setCurrentAppointment(appointment);
    }
  }, [isOpen, appointment?.id, appointment]);

  if (!isOpen || !appointment || !canAccessCheckin) {
    return null;
  }

  // Validar se agendamento pode receber check-in
  const eligibleStatuses = [
    "confirmado",
    "a_confirmar",
    "aguardando",
    "pendente",
    "presente",
    "financeiro_pendente",
  ];
  const isEligible = eligibleStatuses.includes(appointment.status?.toLowerCase?.());

  if (!isEligible) {
    return (
      <div className="app-modal-overlay">
        <div className="app-modal-shell app-modal-shell--compact rounded-lg bg-white p-6 shadow-xl">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            ⚠️ Check-in não disponível
          </h3>
          <p className="text-gray-600 mb-4">
            Este agendamento já foi liberado ou cancelado.
          </p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  // Handle registrar presença
  const handleRegistrarPresenca = async () => {
    try {
      setLoading(true);
      console.log('📍 Registrando presença do paciente...');
      console.log('🔍 currentAppointment:', currentAppointment);
      console.log('🔍 ID:', currentAppointment?.id);
      
      const result = await updateAppointment(currentAppointment.id, {
        status: "presente",
        chegada_em: new Date().toISOString(),
      });

      console.log('✅ Presença registrada. Resultado:', result);
      console.log('✅ Novo status:', result?.status);
      onStatusChange(currentAppointment.id, "presente");
      
      // Atualizar estado local
      setCurrentAppointment({ ...currentAppointment, status: "presente" });
    } catch (error) {
      console.error("❌ Erro ao registrar presença:", error);
      setErrors([`Erro ao registrar presença: ${error.message}`]);
    } finally {
      setLoading(false);
    }
  };

  // Handle liberar para atendimento
  const handleLiberar = async () => {
    // Limpar erros e avisos anteriores
    setErrors([]);
    setWarnings([]);

    // ⚠️ Validar se é pré-paciente
    if (currentAppointment.patient_type === 'PRE_PATIENT') {
      setErrors(["Cadastro Incompleto - Este paciente foi agendado por telefone e precisa de cadastro completo. Finalize o cadastro clicando no botão abaixo."]);
      return;
    }

    const validationErrors = [];
    if (!checklistComplete) {
      validationErrors.push("Checklist não foi concluído");
    }
    if (!financialOk) {
      validationErrors.push("Situação financeira não foi resolvida");
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setLoading(true);

      // ETAPA 5.3: Validar dados de check-in usando integração
      const validation = await validateCheckinData({
        appointmentId: currentAppointment.id,
        clinicId: currentAppointment.clinic_id,
        patientData: {
          id: currentAppointment.patient_id,
          name: currentAppointment.patient?.name,
        },
      });

      // Se houver erros críticos, não liberar
      if (!validation.valid && validation.errors.length > 0) {
        setErrors(validation.errors);
        return;
      }

      // Se houver avisos, armazenar mas permitir continuar
      if (validation.warnings.length > 0) {
        setWarnings(validation.warnings);
        console.warn('⚠️ Avisos de check-in:', validation.warnings);
      }

      // ETAPA 5.3: Confirmar check-in usando integração
      const checkinResult = await confirmCheckin(
        currentAppointment.id,
        currentAppointment.clinic_id,
        {
          patient: { id: currentAppointment.patient_id },
          insuranceAuthorized: true,
        }
      );

      if (!checkinResult.confirmed) {
        setErrors(checkinResult.errors || ["Erro desconhecido ao confirmar check-in"]);
        return;
      }

      // Mostrar próximos passos se houver
      if (checkinResult.nextSteps && checkinResult.nextSteps.length > 0) {
        console.log('📋 Próximos passos:', checkinResult.nextSteps);
      }

      // Atualizar status para liberado
      await updateAppointment(currentAppointment.id, {
        status: "pronto_atendimento",
        liberado_em: new Date().toISOString(),
      });

      console.log('💰 [Liberação] Processando registros financeiros...');
      
      // 🆕 Chamar integração financeira para criar:
      // - Produção Médica
      // - Repasse Médico
      // - Transações Financeiras
      // - Contas a Receber (PARTICULAR) ou Guia de Faturamento (CONVÊNIO)
      const financialResult = await finalizeAppointmentWithFinancials(
        currentAppointment.id,
        {
          payer_type: currentAppointment.payer_type || 'CONVENIO' || 'PARTICULAR',
          patient_name: currentAppointment.patient?.name || currentAppointment.lead_name,
          patient_email: currentAppointment.patient?.email,
          patient_cpf: currentAppointment.patient?.cpf,
          patient_phone: currentAppointment.patient?.phone,
          payment_method: currentAppointment.payment_method,
          health_plan: currentAppointment.health_plan,
          authorization_number: currentAppointment.authorization_number,
          card_number: currentAppointment.card_number,
          guide_number: currentAppointment.guide_number,
          card_verified: currentAppointment.card_verified || false,
          authorization_verified: currentAppointment.authorization_verified || false,
          value: currentAppointment.value || 0,
          copayment: currentAppointment.copayment || 0,
          discount: currentAppointment.discount || 0,
        }
      );

      if (financialResult.success) {
        console.log('✅ Registros financeiros criados com sucesso:', financialResult);
        // Adicionar aviso de sucesso se houver
        setWarnings([...warnings, '✅ Registros financeiros criados automaticamente']);
      } else {
        console.warn('⚠️ Aviso ao processar financeiro:', financialResult.message);
        // Não bloquear, apenas avisar
        setWarnings([...warnings, `⚠️ ${financialResult.message}`]);
      }

      onStatusChange(currentAppointment.id, "liberado_para_atendimento");
      onClose();
    } catch (error) {
      console.error("Erro ao liberar:", error);
      setErrors([`Erro ao liberar paciente: ${error.message}`]);
    } finally {
      setLoading(false);
    }
  };

  // Handle merge success
  const handleMergeSuccess = (updatedAppointment) => {
    setCurrentAppointment(updatedAppointment);
    setMergeModalOpen(false);
    // Recarregar dados
    onStatusChange(updatedAppointment.id, updatedAppointment.status);
  };

  // Calcular se botão de liberar está habilitado
  const canRelease = checklistComplete && financialOk && currentAppointment?.patient_type !== 'PRE_PATIENT';

  // Se não houver agendamento, não renderizar
  if (!currentAppointment) {
    return null;
  }

  return (
    <>
      {/* Merge Modal */}
      <MergePatientModal
        isOpen={mergeModalOpen}
        appointment={currentAppointment}
        onClose={() => setMergeModalOpen(false)}
        onSuccess={handleMergeSuccess}
      />

      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full sm:w-[600px] bg-white shadow-2xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Alert para pré-paciente */}
      {currentAppointment?.patient_type === 'PRE_PATIENT' && (
          <div className="bg-red-50 border-b border-red-200 px-6 py-3">
            <div className="flex gap-3">
              <span className="text-xl">🚨</span>
              <div>
                <p className="font-semibold text-red-900 text-sm">Cadastro Incompleto - Ação Obrigatória</p>
                <p className="text-xs text-red-800 mt-1">
                  Paciente agendado por telefone. Finalize o cadastro clicando no botão abaixo.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 text-white flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">
              📋 Check-in do Paciente
            </h2>
            <p className="text-blue-100 text-sm mt-1">
              {currentAppointment.patient_name || currentAppointment.lead_name} • {currentAppointment.start_time?.slice(11, 16)} •{" "}
              {currentAppointment.service_name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-blue-500 rounded-lg transition-colors"
            title="Fechar"
          >
            <X size={24} />
          </button>
        </div>

        {/* Progresso Sequencial */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-blue-200">
          <div className="space-y-3">
            {/* Passo 1: Checklist */}
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm ${checklistComplete ? 'bg-green-500' : 'bg-blue-500'}`}>
                {checklistComplete ? '✓' : '1'}
              </div>
              <div className="flex-1 mt-0.5">
                <p className={`font-semibold text-sm ${checklistComplete ? 'text-green-700' : 'text-blue-900'}`}>
                  Checklist de Documentação
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {checklistComplete ? '✅ Completo' : '⏳ Pendente - Clique em Checklist abaixo'}
                </p>
              </div>
              {!checklistComplete && (
                <button
                  onClick={() => setActiveTab('checklist')}
                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition whitespace-nowrap"
                >
                  Completar
                </button>
              )}
            </div>

            {/* Passo 2: Financeiro */}
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm ${financialOk ? 'bg-green-500' : 'bg-gray-400'}`}>
                {financialOk ? '✓' : '2'}
              </div>
              <div className="flex-1 mt-0.5">
                <p className={`font-semibold text-sm ${financialOk ? 'text-green-700' : 'text-gray-700'}`}>
                  Validação Financeira
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {financialOk ? '✅ OK - Sem restrições' : '⏳ Pendente - Verifique situação financeira'}
                </p>
              </div>
              {!financialOk && checklistComplete && (
                <button
                  onClick={() => setActiveTab('financeiro')}
                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition whitespace-nowrap"
                >
                  Verificar
                </button>
              )}
              {financialOk && !checklistComplete && (
                <button
                  onClick={() => setActiveTab('checklist')}
                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition whitespace-nowrap"
                >
                  Voltar Checklist
                </button>
              )}
            </div>

            {/* Passo 3: Liberar */}
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm ${checklistComplete && financialOk ? 'bg-green-500' : 'bg-gray-400'}`}>
                3
              </div>
              <div className="flex-1 mt-0.5">
                <p className={`font-semibold text-sm ${checklistComplete && financialOk ? 'text-green-700' : 'text-gray-700'}`}>
                  Liberar para Atendimento
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {checklistComplete && financialOk ? '✅ Pronto para liberar' : '⏳ Aguarde conclusão dos passos anteriores'}
                </p>
              </div>
              {checklistComplete && financialOk && (
                <button
                  onClick={() => setActiveTab('acoes')}
                  className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition whitespace-nowrap"
                >
                  Liberar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b bg-gray-50 px-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab("checklist")}
            className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "checklist"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            <CheckCircle2 size={18} />
            Checklist
            {checklistComplete ? (
              <span className="ml-2 bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                ✓ OK
              </span>
            ) : (
              <span className="ml-2 bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                Pendente
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("financeiro")}
            className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "financeiro"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            <Zap size={18} />
            Financeiro
            {financialOk ? (
              <span className="ml-2 bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                ✓ OK
              </span>
            ) : (
              <span className="ml-2 bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                Aguarde
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("acoes")}
            className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "acoes"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            <Play size={18} />
            Ações
          </button>
          <button
            onClick={() => setActiveTab("historico")}
            className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "historico"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            <Clock size={18} />
            Histórico
          </button>
          {["admin", "gestor", "financeiro"].includes(currentRole?.toLowerCase?.()) && (
            <button
              onClick={() => setActiveTab("auditoria_financeira")}
              className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "auditoria_financeira"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              <TrendingUp size={18} />
              Auditoria Financeira
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-custom">
          {activeTab === "checklist" && (
            <CheckinChecklist
              appointment={currentAppointment}
              onStatusChange={(complete) => setChecklistComplete(complete)}
              onEditItem={(itemId) => {
                setEditingItemId(itemId);
                setItemModalOpen(true);
              }}
            />
          )}

          {activeTab === "financeiro" && (
            <CheckinFinanceiro
              appointment={currentAppointment}
              onStatusChange={(ok) => setFinancialOk(ok)}
            />
          )}

          {activeTab === "acoes" && (
            <CheckinAcoes
              appointment={currentAppointment}
              onStatusChange={onStatusChange}
              onClose={onClose}
            />
          )}

          {activeTab === "historico" && (
            <AppointmentAuditTimeline
              appointmentId={currentAppointment.id}
              currentRole={currentRole}
            />
          )}

          {activeTab === "auditoria_financeira" && (
            <AppointmentFinancialAuditTimeline
              appointmentId={currentAppointment.id}
              compact={false}
              userRole={currentRole}
            />
          )}
        </div>

        {/* Footer - Botão de Liberar */}
        <div className="border-t bg-gray-50 px-6 py-4">
          {/* Exibir Erros */}
          {errors.length > 0 && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                <span className="text-xl">⚠️</span> Informações Faltando:
              </h4>
              <ul className="space-y-1">
                {errors.map((error, idx) => (
                  <li key={idx} className="text-red-800 text-sm flex items-start gap-2">
                    <span className="text-red-600 mt-0.5">•</span>
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Exibir Avisos */}
          {warnings.length > 0 && (
            <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                <span className="text-xl">⚠️</span> Avisos:
              </h4>
              <ul className="space-y-1">
                {warnings.map((warning, idx) => (
                  <li key={idx} className="text-yellow-800 text-sm flex items-start gap-2">
                    <span className="text-yellow-600 mt-0.5">•</span>
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Status */}
          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  checklistComplete ? "bg-green-500" : "bg-red-500"
                }`}
              />
              <span className="text-gray-700">
                Checklist: {checklistComplete ? "✅" : "❌"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  financialOk ? "bg-green-500" : "bg-red-500"
                }`}
              />
              <span className="text-gray-700">
                Financeiro: {financialOk ? "✅" : "❌"}
              </span>
            </div>
          </div>

          {/* Botão de Finalizar Cadastro (pré-paciente) */}
          {currentAppointment?.patient_type === 'PRE_PATIENT' && (
            <div className="mb-4 p-4 bg-red-50 border border-red-300 rounded-lg">
              <button
                onClick={() => setMergeModalOpen(true)}
                className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
              >
                🧾 Finalizar Cadastro do Paciente
              </button>
              <p className="text-xs text-red-700 mt-2">
                Clique para completar o cadastro e liberar o paciente para atendimento.
              </p>
            </div>
          )}

          {/* Botões */}
          <div className="flex flex-col gap-3">
            {/* Fluxo de Status - Redesenhado */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
              <p className="text-xs font-bold text-blue-900 mb-3 uppercase tracking-wide">Fluxo de Check-in</p>
              
              {/* Step 1: Marcar como Presente */}
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs ${
                    currentAppointment?.status === 'presente' || currentAppointment?.status === 'pronto_atendimento' 
                      ? 'bg-green-500' 
                      : 'bg-blue-500'
                  }`}>
                    1
                  </div>
                  <span className="text-sm font-semibold text-gray-900">Confirmar Presença</span>
                </div>
                {currentAppointment?.status !== 'presente' && currentAppointment?.status !== 'pronto_atendimento' && (
                  <button
                    onClick={handleRegistrarPresenca}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors text-sm"
                  >
                    📍 Registrar Presença
                  </button>
                )}
                {(currentAppointment?.status === 'presente' || currentAppointment?.status === 'pronto_atendimento') && (
                  <p className="text-xs text-green-700 font-semibold">✅ Presença registrada</p>
                )}
              </div>

              {/* Step 2: Verificar Checklist */}
              <div className="mb-3 pb-3 border-b border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs ${
                    checklistComplete ? 'bg-green-500' : 'bg-gray-400'
                  }`}>
                    2
                  </div>
                  <span className="text-sm font-semibold text-gray-900">Completar Checklist</span>
                  {checklistComplete ? (
                    <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-semibold">✓ OK</span>
                  ) : (
                    <span className="ml-auto text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-semibold">Pendente</span>
                  )}
                </div>
                {!checklistComplete && (
                  <p className="text-xs text-gray-600 ml-8">Clique na aba "Checklist" para completar os itens pendentes</p>
                )}
              </div>

              {/* Step 3: Liberar para Atendimento */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs ${
                    currentAppointment?.status === 'pronto_atendimento' ? 'bg-green-500' : 'bg-gray-400'
                  }`}>
                    3
                  </div>
                  <span className="text-sm font-semibold text-gray-900">Liberar para Atendimento</span>
                </div>
                {currentAppointment?.status !== 'pronto_atendimento' && (
                  <button
                    onClick={handleLiberar}
                    disabled={!canRelease || loading || (currentAppointment?.status === 'presente' && (!checklistComplete || !financialOk))}
                    className={`w-full px-4 py-2 rounded-lg font-medium text-white transition-colors flex items-center justify-center gap-2 text-sm ${
                      canRelease && !(currentAppointment?.status === 'presente' && (!checklistComplete || !financialOk))
                        ? "bg-green-600 hover:bg-green-700"
                        : "bg-gray-400 cursor-not-allowed"
                  }`}
                >
                  🟢 Liberar para Atendimento
                </button>
              )}

              {currentAppointment?.status === 'pronto_atendimento' && (
                <div className="w-full px-4 py-2 bg-green-100 border border-green-300 rounded-lg text-green-800 text-center font-medium">
                  ✅ Paciente pronto para atendimento
                </div>
              )}
            </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                disabled={loading}
              >
                Sair
              </button>
            </div>

            {!canRelease && (
              <p className="text-xs text-red-600 mt-3 text-center">
                ⚠️ Resolva checklist e financeiro para liberar
              </p>
            )}
          </div>
        </div>

        {/* Item Edit Modal */}
        <CheckinItemModal
          isOpen={itemModalOpen}
          itemId={editingItemId}
          appointment={currentAppointment}
          onClose={() => {
            setItemModalOpen(false);
            setEditingItemId(null);
          }}
          onSave={async (itemId, formData) => {
            try {
              setLoading(true);
              
              // Mapear itemId para campo de appointment
              const updateData = {};
              
              switch (itemId) {
                case "dados_cadastrais":
                  Object.assign(updateData, {
                    patient_name: formData.patient_name,
                    patient_cpf: formData.patient_cpf,
                    patient_phone: formData.patient_phone,
                    patient_verified: true,
                  });
                  break;
                case "convenio":
                  Object.assign(updateData, {
                    payer_name: formData.payer_name,
                    payer_type: formData.payer_type,
                    authorization_number: formData.authorization_number,
                  });
                  break;
                case "carteirinha":
                  Object.assign(updateData, {
                    card_number: formData.card_number,
                    insurance_card_verified: formData.insurance_card_verified,
                  });
                  break;
                case "autorizacao":
                  Object.assign(updateData, {
                    authorization_date: formData.authorization_date,
                    authorization_verified: formData.authorization_verified,
                  });
                  break;
                case "guia":
                  Object.assign(updateData, {
                    guide_number: formData.guide_number,
                    guide_generated: formData.guide_generated,
                  });
                  break;
                case "pagamento":
                  Object.assign(updateData, {
                    payment_method: formData.payment_method,
                    payment_status: formData.payment_status,
                  });
                  break;
              }

              // Salvar no banco de dados
              const updated = await updateAppointment(currentAppointment.id, updateData);
              
              // Atualizar estado local
              setCurrentAppointment({ ...currentAppointment, ...updateData });
              
              // Fechar modal e recarregar checklist
              setItemModalOpen(false);
              setEditingItemId(null);
              
              // Força re-render do checklist
              setChecklistComplete(false);
              setChecklistComplete(true);
            } catch (error) {
              console.error("Erro ao salvar item:", error);
              throw error;
            } finally {
              setLoading(false);
            }
          }}
        />
      </div>
    </>
  );
}

