/**
 * SUGESTOES_INTEGRACAO_COM_MODALS.jsx
 * 
 * 📋 EXEMPLOS DE INTEGRAÇÃO COM MODALS/DRAWERS
 * 
 * Como conectar sugestões com:
 * - Modal de Lista de Espera
 * - Modal de Criar Encaixe
 * - Modal de Contatar Paciente
 */

import React, { useState } from "react";
import SuggestionsDrawer, { useSuggestionsDrawer } from "./components/SuggestionsDrawer";

/**
 * EXEMPLO COMPLETO DE PÁGINA COM TODAS AS INTEGRAÇÕES
 */
export default function AgendaComSugestoesCompleta() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Modals
  const [waitlistModalOpen, setWaitlistModalOpen] = useState(false);
  const [createAppointmentModalOpen, setCreateAppointmentModalOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);

  // Contexto das ações
  const [currentSuggestion, setCurrentSuggestion] = useState(null);

  // Drawer de sugestões
  const suggestionsDrawer = useSuggestionsDrawer();

  /**
   * Handler principal de ações de sugestão
   */
  const handleSuggestionAction = data => {
    const {
      suggestion,
      action
    } = data;
    setCurrentSuggestion(suggestion);
    switch (action) {
      case "VER_LISTA_ESPERA":
        setWaitlistModalOpen(true);
        suggestionsDrawer.close();
        break;
      case "CRIAR_ENCAIXE":
        setCreateAppointmentModalOpen(true);
        suggestionsDrawer.close();
        break;
      case "CONTATAR_PACIENTE":
        setContactModalOpen(true);
        suggestionsDrawer.close();
        break;
      case "OTIMIZAR_AGENDA":
        alert("Abrir view de otimização (não implementado)");
        break;
      default:
        break;
    }
  };

  /**
   * Callback quando encaixe é criado
   */
  const handleEncaixeCriado = async () => {
    console.log("✅ Encaixe criado com sucesso");
    setCreateAppointmentModalOpen(false);
    setCurrentSuggestion(null);

    // Recarregar sugestões
    setRefreshTrigger(prev => prev + 1);
  };

  /**
   * Callback quando paciente é selecionado da lista de espera
   */
  const handlePacienteSelecionado = async patient => {
    console.log("📌 Paciente selecionado:", patient);

    // Abrir modal de criar encaixe com paciente pré-selecionado
    setCurrentSuggestion(prev => ({
      ...prev,
      paciente_id: patient.id,
      paciente_nome: patient.name
    }));
    setWaitlistModalOpen(false);
    setCreateAppointmentModalOpen(true);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "flex h-full bg-gray-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1 overflow-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sticky top-0 bg-white border-b p-4 flex justify-between items-center"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "text-2xl font-bold"
  }, "Agenda"), /*#__PURE__*/React.createElement("button", {
    onClick: suggestionsDrawer.toggle,
    className: "px-4 py-2 bg-amber-100 text-amber-800 rounded-lg font-medium"
  }, "\uD83D\uDCA1 Sugest\xF5es")), /*#__PURE__*/React.createElement("div", {
    className: "p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-lg border p-6 text-center text-gray-500"
  }, "[Seu componente de Agenda aqui]"))), /*#__PURE__*/React.createElement(SuggestionsDrawer, {
    clinicId: "clinic-uuid",
    date: selectedDate,
    isOpen: suggestionsDrawer.isOpen,
    onClose: suggestionsDrawer.close,
    onSuggestionAction: handleSuggestionAction,
    userRole: "recepcion"
  }), waitlistModalOpen && /*#__PURE__*/React.createElement(WaitlistModal, {
    isOpen: waitlistModalOpen,
    onClose: () => setWaitlistModalOpen(false),
    onSelectPatient: handlePacienteSelecionado,
    suggestion: currentSuggestion
  }), createAppointmentModalOpen && /*#__PURE__*/React.createElement(CreateAppointmentModal, {
    isOpen: createAppointmentModalOpen,
    onClose: () => setCreateAppointmentModalOpen(false),
    onSuccess: handleEncaixeCriado,
    suggestion: currentSuggestion,
    prefilledDate: selectedDate,
    prefilledProfessional: currentSuggestion?.profissional_id
  }), contactModalOpen && /*#__PURE__*/React.createElement(ContactPatientModal, {
    isOpen: contactModalOpen,
    onClose: () => setContactModalOpen(false),
    suggestion: currentSuggestion
  }));
}

/**
 * MODAL 1: LISTA DE ESPERA
 * Exibe pacientes aguardando agendamento
 */
function WaitlistModal({
  isOpen,
  onClose,
  onSelectPatient,
  suggestion
}) {
  const [waitlist, setWaitlist] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    if (isOpen) {
      loadWaitlist();
    }
  }, [isOpen]);
  const loadWaitlist = async () => {
    setLoading(true);
    try {
      // Buscar lista de espera da clínica
      // const { data } = await getWaitlist(clinicId);
      // setWaitlist(data);

      // Mock para demonstração
      setWaitlist([{
        id: "1",
        name: "Maria Silva",
        phone: "(11) 98765-4321",
        service: "Consulta Geral",
        waitingSince: "2026-01-10",
        preferredTime: "Manhã"
      }, {
        id: "2",
        name: "João Santos",
        phone: "(11) 99876-5432",
        service: "Limpeza",
        waitingSince: "2026-01-11",
        preferredTime: "Tarde"
      }, {
        id: "3",
        name: "Ana Costa",
        phone: "(11) 99999-8888",
        service: "Consulta Retorno",
        waitingSince: "2026-01-12",
        preferredTime: "Qualquer"
      }]);
    } catch (err) {
      console.error("Erro ao carregar lista de espera:", err);
    } finally {
      setLoading(false);
    }
  };
  if (!isOpen) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-lg p-6 w-full w-full max-h-96 overflow-y-auto scrollbar-custom"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-xl font-bold mb-4"
  }, "\uD83D\uDCCB Lista de Espera"), loading ? /*#__PURE__*/React.createElement("div", {
    className: "text-center py-8"
  }, "Carregando...") : waitlist.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "text-center py-8 text-gray-500"
  }, "Nenhum paciente na lista de espera") : /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, waitlist.map(patient => /*#__PURE__*/React.createElement("div", {
    key: patient.id,
    className: "flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition",
    onClick: () => onSelectPatient(patient)
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1 min-w-0"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-900"
  }, patient.name), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600"
  }, patient.phone), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-4 mt-1 text-xs text-gray-500"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCC5 Aguardando desde ", patient.waitingSince), /*#__PURE__*/React.createElement("span", null, "\u23F0 Prefere: ", patient.preferredTime))), /*#__PURE__*/React.createElement("button", {
    className: "px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
  }, "Agendar")))), /*#__PURE__*/React.createElement("div", {
    className: "mt-4 flex gap-3 justify-end"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "px-4 py-2 border rounded-lg hover:bg-gray-50"
  }, "Fechar"))));
}

/**
 * MODAL 2: CRIAR ENCAIXE
 * Formulário para agendar paciente da lista de espera
 */
function CreateAppointmentModal({
  isOpen,
  onClose,
  onSuccess,
  suggestion,
  prefilledDate,
  prefilledProfessional
}) {
  const [formData, setFormData] = React.useState({
    date: prefilledDate,
    time: suggestion?.horario || "",
    professional_id: prefilledProfessional || "",
    patient_id: suggestion?.paciente_id || "",
    service_id: "",
    notes: `Encaixe sugerido - ${suggestion?.type || ""}`
  });
  const [saving, setSaving] = React.useState(false);
  const handleSubmit = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      // Criar agendamento
      // await createAppointment({
      //   ...formData,
      //   clinic_id: clinicId,
      // });

      console.log("✅ Agendamento criado:", formData);
      onSuccess();
    } catch (err) {
      console.error("Erro ao criar agendamento:", err);
    } finally {
      setSaving(false);
    }
  };
  if (!isOpen) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-lg p-6 w-full w-full"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-xl font-bold mb-4"
  }, "\uD83C\uDFAF Criar Encaixe"), suggestion?.type && /*#__PURE__*/React.createElement("div", {
    className: "mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm"
  }, /*#__PURE__*/React.createElement("strong", null, "Sugest\xE3o:"), " ", suggestion.mensagem), /*#__PURE__*/React.createElement("form", {
    onSubmit: handleSubmit,
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "Data"), /*#__PURE__*/React.createElement("input", {
    type: "date",
    value: formData.date,
    onChange: e => setFormData({
      ...formData,
      date: e.target.value
    }),
    className: "w-full px-3 py-2 border rounded-lg"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "Hor\xE1rio"), /*#__PURE__*/React.createElement("input", {
    type: "time",
    value: formData.time,
    onChange: e => setFormData({
      ...formData,
      time: e.target.value
    }),
    className: "w-full px-3 py-2 border rounded-lg",
    required: true
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "Profissional"), /*#__PURE__*/React.createElement("select", {
    value: formData.professional_id,
    onChange: e => setFormData({
      ...formData,
      professional_id: e.target.value
    }),
    className: "w-full px-3 py-2 border rounded-lg"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Selecionar..."))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "Servi\xE7o"), /*#__PURE__*/React.createElement("select", {
    value: formData.service_id,
    onChange: e => setFormData({
      ...formData,
      service_id: e.target.value
    }),
    className: "w-full px-3 py-2 border rounded-lg"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Selecionar..."))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "Notas"), /*#__PURE__*/React.createElement("textarea", {
    value: formData.notes,
    onChange: e => setFormData({
      ...formData,
      notes: e.target.value
    }),
    className: "w-full px-3 py-2 border rounded-lg",
    rows: "3"
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-3 justify-end pt-4"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClose,
    className: "px-4 py-2 border rounded-lg hover:bg-gray-50"
  }, "Cancelar"), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    disabled: saving,
    className: "px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
  }, saving ? "Salvando..." : "✅ Confirmar Encaixe")))));
}

/**
 * MODAL 3: CONTATAR PACIENTE
 * Interface para contatar paciente da lista de espera
 */
function ContactPatientModal({
  isOpen,
  onClose,
  suggestion
}) {
  if (!isOpen) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-lg p-6 w-full w-full"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-xl font-bold mb-4"
  }, "\uD83D\uDCDE Contatar Paciente"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600"
  }, "Enviar mensagem para paciente aguardando encaixe")), /*#__PURE__*/React.createElement("textarea", {
    defaultValue: "Ol\xE1! Temos um hor\xE1rio dispon\xEDvel para voc\xEA. Gostaria de agendar?",
    className: "w-full px-3 py-2 border rounded-lg",
    rows: "4"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-3"
  }, /*#__PURE__*/React.createElement("button", {
    className: "flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
  }, "\uD83D\uDCF1 WhatsApp"), /*#__PURE__*/React.createElement("button", {
    className: "flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
  }, "\uD83D\uDCDE Ligar")), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "w-full px-4 py-2 border rounded-lg hover:bg-gray-50"
  }, "Fechar"))));
}

/**
 * EXPORTS para usar em outros componentes
 */
export { WaitlistModal, CreateAppointmentModal, ContactPatientModal };