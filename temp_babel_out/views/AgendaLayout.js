import React, { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/lib/customSupabaseClient";
import { listAppointments } from "@/lib/appointmentsApi";
import { listProfessionals } from "@/lib/professionalsApi";
import { listServices } from "@/lib/servicesApi";
import { listPayers } from "@/lib/payersApi";
import { useClinicContext } from "@/contexts/ClinicContext";
import { useAuth } from "@/contexts/SupabaseAuthContext";

// COMPONENTES INTERNOS
import AgendaToolbar from "../components/AgendaToolbar";
import AgendaCalendar from "../components/AgendaCalendar";
import AgendaTable from "../components/AgendaTable";
import AgendaSidePanel from "../components/AgendaSidePanel";
import ModalCriarAgendamento from "../components/ModalCriarAgendamento";
const VIEW_MODE = {
  CALENDAR: "calendar",
  LISTA: "lista",
  KANBAN: "kanban"
};
export default function AgendaLayout({
  mode,
  professionalId,
  roomId
}) {
  const {
    clinic,
    professionals: ctxProfessionals,
    loadingClinic
  } = useClinicContext();
  const {
    user,
    currentRole
  } = useAuth();

  // 🔴 DEBUG: Se clinic?.id está undefined
  useEffect(() => {
    if (loadingClinic) {
      console.log('⏳ [AgendaLayout] ClinicContext ainda carregando...');
    } else {
      console.log('🔴 [AgendaLayout] clinic?.id está:', clinic?.id || 'UNDEFINED!');
      if (!clinic?.id) {
        console.error('🔴🔴🔴 CRÍTICO: clinic?.id é undefined! Services/Payers não vão carregar!');
      }
    }
  }, [clinic?.id, loadingClinic]);
  const [viewMode, setViewMode] = useState(VIEW_MODE.CALENDAR);
  const [calendarView, setCalendarView] = useState("day");
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalNovoOpen, setModalNovoOpen] = useState(false);
  const [novoAgendamentoInfo, setNovoAgendamentoInfo] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelData, setPanelData] = useState(null);
  const [logs, setLogs] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [services, setServices] = useState([]);
  const [payers, setPayers] = useState([]);

  // 🔥 Carregar profissionais
  const loadProfessionals = useCallback(async () => {
    if (ctxProfessionals?.length) {
      setProfessionals(ctxProfessionals.map(p => ({
        id: p.id,
        name: p.name,
        color: p.color || "#145B8A"
      })));
      return;
    }
    if (!clinic?.id) return;
    const {
      data
    } = await supabase.from("professionals").select("id, name, active").eq("clinic_id", clinic.id).eq("active", true);
    if (data) {
      setProfessionals(data.map(p => ({
        id: p.id,
        name: p.name,
        color: p.color || "#145B8A"
      })));
    }
  }, [ctxProfessionals, clinic?.id]);

  // 🔥 Carregar serviços
  const loadServices = useCallback(async () => {
    console.log('📋 [LoadServices] Iniciando. clinic?.id:', clinic?.id);
    if (!clinic?.id) {
      console.log('⚠️ [LoadServices] Sem clinic?.id, retornando vazio');
      setServices([]);
      return;
    }
    try {
      const data = await listServices(clinic.id);
      console.log('✅ [LoadServices] Sucesso. Serviços:', data);
      setServices(data || []);
    } catch (err) {
      console.error('❌ [LoadServices] Erro:', err);
      setServices([]);
    }
  }, [clinic?.id]);

  // 🔥 Carregar convênios
  const loadPayers = useCallback(async () => {
    console.log('💰 [LoadPayers] Iniciando. clinic?.id:', clinic?.id);
    if (!clinic?.id) {
      console.log('⚠️ [LoadPayers] Sem clinic?.id, retornando vazio');
      setPayers([]);
      return;
    }
    try {
      const data = await listPayers(clinic.id);
      console.log('✅ [LoadPayers] Sucesso. Convênios:', data);
      setPayers(data || []);
    } catch (err) {
      console.error('❌ [LoadPayers] Erro:', err);
      setPayers([]);
    }
  }, [clinic?.id]);
  useEffect(() => {
    loadProfessionals();
  }, [loadProfessionals]);

  // 🔥 CRITICAMENTE IMPORTANTE: Disparar carregamento APENAS quando clinic?.id muda
  useEffect(() => {
    if (!clinic?.id) {
      console.log('⏳ [AgendaLayout CLINIC CHANGE] clinic?.id ainda undefined, zerando arrays');
      setServices([]);
      setPayers([]);
      return;
    }
    console.log('✨ [AgendaLayout CLINIC CHANGE] clinic?.id agora disponível:', clinic.id);

    // Chamar inline ao invés de usar callbacks para evitar problemas de dependência
    (async () => {
      try {
        console.log('📋 [Inline] Carregando services...');
        const svcData = await listServices(clinic.id);
        console.log('✅ [Inline] Services carregados:', svcData?.length || 0);
        setServices(svcData || []);
      } catch (err) {
        console.error('❌ [Inline] Erro ao carregar services:', err);
        setServices([]);
      }
    })();
    (async () => {
      try {
        console.log('💰 [Inline] Carregando payers...');
        const payData = await listPayers(clinic.id);
        console.log('✅ [Inline] Payers carregados:', payData?.length || 0);
        setPayers(payData || []);
      } catch (err) {
        console.error('❌ [Inline] Erro ao carregar payers:', err);
        setPayers([]);
      }
    })();
  }, [clinic?.id]);

  // 🔥 Filtros padrão
  const [filters, setFilters] = useState({
    clinicId: clinic?.id || null,
    dateStart: null,
    // Mostra todos os agendamentos anteriores
    dateEnd: null,
    // Mostra todos os agendamentos futuros
    professionalId,
    roomId,
    query: "",
    status: null,
    payerId: null,
    serviceId: null
  });
  useEffect(() => {
    if (clinic?.id) {
      setFilters(prev => ({
        ...prev,
        clinicId: clinic.id
      }));
    }
  }, [clinic]);

  // 🔥 Buscar agendamentos
  const loadAppointmentsMemo = useCallback(async () => {
    if (!filters.clinicId) return;
    setLoading(true);

    // Log dos filtros usados
    console.log('[Agenda] Filtros usados:', filters);
    console.log('[Agenda] dateStart:', filters.dateStart, 'dateEnd:', filters.dateEnd);

    // 🔒 RBAC: Se for profissional, buscar seu professional_id
    let userProfessionalId = null;
    if (currentRole?.toLowerCase?.() === 'profissional' && user?.email) {
      const {
        data: profData
      } = await supabase.from('professionals').select('id').eq('email', user.email).eq('clinic_id', filters.clinicId).maybeSingle();
      if (profData?.id) {
        userProfessionalId = profData.id;
        console.log('🔒 [RBAC] Profissional detectado. Professional ID:', userProfessionalId);
      }
    }
    const data = await listAppointments({
      clinicId: filters.clinicId,
      start: filters.dateStart,
      end: filters.dateEnd,
      professionalId: filters.professionalId,
      roomId: filters.roomId,
      payerId: filters.payerId,
      serviceId: filters.serviceId,
      status: filters.status,
      query: filters.query,
      userRole: currentRole,
      userProfessionalId: userProfessionalId
    });

    // Log do resultado da busca
    console.log('[Agenda] Resultado da busca:', data);
    setAppointments(data || []);
    setLoading(false);
  }, [filters, currentRole, user?.id]);
  useEffect(() => {
    loadAppointmentsMemo();
  }, [filters, loadAppointmentsMemo]);

  // 🔥 Abrir painel lateral
  const openPanel = async appointment => {
    setPanelOpen(true);
    setPanelData(appointment);
    const {
      data
    } = await supabase.from("appointment_notification_logs").select("*").eq("appointment_id", appointment.id);
    setLogs(data || []);
  };
  const closePanel = () => {
    setPanelOpen(false);
    setPanelData(null);
    setLogs([]);
  };

  // 🔥 Atualizar status
  const updateStatus = async (item, status) => {
    await supabase.from("appointments").update({
      status
    }).eq("id", item.id);
    loadAppointmentsMemo();
  };

  // 🔥 Renderizar visualização correta
  const renderView = useMemo(() => {
    switch (viewMode) {
      case VIEW_MODE.LISTA:
        return /*#__PURE__*/React.createElement(AgendaTable, {
          appointments: appointments,
          loading: loading,
          professionals: professionals,
          onSelectEvent: openPanel
        });
      case VIEW_MODE.KANBAN:
        return /*#__PURE__*/React.createElement("div", {
          className: "p-8 text-center text-gray-400"
        }, "Visualiza\xE7\xE3o Kanban n\xE3o dispon\xEDvel.");
      default:
        return /*#__PURE__*/React.createElement(AgendaCalendar, {
          mode: mode,
          calendarView: calendarView,
          appointments: appointments,
          professionals: professionals,
          filters: filters,
          loading: loading,
          onSelectEvent: openPanel,
          onCreateAtSlot: info => {
            setNovoAgendamentoInfo(info);
            setModalNovoOpen(true);
          }
        });
    }
  }, [viewMode, calendarView, appointments, professionals, loading, filters]);
  return /*#__PURE__*/React.createElement("div", {
    className: "w-full h-full flex flex-col"
  }, /*#__PURE__*/React.createElement(AgendaToolbar, {
    viewMode: viewMode,
    setViewMode: setViewMode,
    calendarView: calendarView,
    setCalendarView: setCalendarView,
    filters: filters,
    setFilters: setFilters,
    professionals: professionals
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 overflow-hidden bg-white/80 backdrop-blur border shadow-inner rounded-xl"
  }, renderView), /*#__PURE__*/React.createElement(AgendaSidePanel, {
    open: panelOpen,
    onClose: closePanel,
    data: panelData,
    logs: logs,
    onConfirm: a => updateStatus(a, "confirmed"),
    onCancel: a => updateStatus(a, "canceled")
  }), /*#__PURE__*/React.createElement(ModalCriarAgendamento, {
    open: modalNovoOpen && !!filters.clinicId,
    onOpenChange: open => {
      if (!open) setModalNovoOpen(false);
    },
    clinicId: filters.clinicId,
    data: novoAgendamentoInfo,
    professionals: professionals,
    services: services,
    payers: payers,
    onCreated: loadAppointmentsMemo
  }));
}