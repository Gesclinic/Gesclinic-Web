import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import AgendaToolbar from "../../agenda/components/AgendaToolbar";
import AgendaCalendar from "../../agenda/components/AgendaCalendar";
import AgendaTable from "../../agenda/components/AgendaTable";
import AgendaSidePanel from "../../agenda/components/AgendaSidePanel";
import ModalCriarAgendamento from "../../agenda/components/ModalCriarAgendamento";
import { listAppointments } from "@/lib/appointmentsApi";
import { listServices } from "@/lib/servicesApi";
import { listPayers } from "@/lib/payersApi";
import { supabase } from "@/lib/customSupabaseClient";
import { useClinicContext } from "@/contexts/ClinicContext";
import { useAuth } from "@/contexts/SupabaseAuthContext";

// Tipos de visualização
const VIEW_MODE = {
  CALENDAR: "calendar",
  LIST: "list",
  KANBAN: "kanban"
};
export default function AgendaLayout({
  children
}) {
  const {
    clinic,
    professionals: ctxProfessionals
  } = useClinicContext();
  const {
    user,
    currentRole
  } = useAuth();
  const [searchParams] = useSearchParams();

  // =========================================================================
  // ESTADOS PRINCIPAIS
  // =========================================================================
  const [viewMode, setViewMode] = useState(VIEW_MODE.CALENDAR);
  const [calendarView, setCalendarView] = useState("day");
  const [appointments, setAppointments] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [services, setServices] = useState([]);
  const [payers, setPayers] = useState([]);
  const [loading, setLoading] = useState(false);

  // painel lateral
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelData, setPanelData] = useState(null);
  const [logs, setLogs] = useState([]);

  // modal novo
  const [modalNovoOpen, setModalNovoOpen] = useState(false);
  const [novoAgendamentoInfo, setNovoAgendamentoInfo] = useState(null);

  // filtros globais
  const [filters, setFilters] = useState({
    clinicId: clinic?.id || null,
    dateStart: new Date(),
    dateEnd: new Date(),
    professionalId: null,
    roomId: null,
    query: "",
    payerId: null,
    serviceId: null,
    status: null
  });

  // =========================================================================
  // ATUALIZA CLÍNICA
  // =========================================================================
  useEffect(() => {
    if (clinic?.id) {
      setFilters(prev => ({
        ...prev,
        clinicId: clinic.id
      }));
    }
  }, [clinic]);

  // =========================================================================
  // CARREGA PROFISSIONAIS
  // =========================================================================
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
    } = await supabase.from("professionals").select("id, name, color, active").eq("clinic_id", clinic.id).eq("active", true);
    if (data) {
      setProfessionals(data.map(p => ({
        id: p.id,
        name: p.name,
        color: p.color || "#145B8A"
      })));
    }
  }, [clinic?.id, ctxProfessionals]);

  // =========================================================================
  // CARREGA SERVIÇOS
  // =========================================================================
  const loadServices = useCallback(async () => {
    if (!clinic?.id) return;
    try {
      const data = await listServices({
        clinicId: clinic.id
      });
      setServices(data || []);
      console.log('✅ Serviços carregados:', data?.length || 0);
    } catch (err) {
      console.error('❌ Erro ao carregar serviços:', err);
      setServices([]);
    }
  }, [clinic?.id]);

  // =========================================================================
  // CARREGA CONVÊNIOS
  // =========================================================================
  const loadPayers = useCallback(async () => {
    if (!clinic?.id) return;
    try {
      const data = await listPayers({
        clinicId: clinic.id
      });
      setPayers(data || []);
      console.log('✅ Convênios carregados:', data?.length || 0);
    } catch (err) {
      console.error('❌ Erro ao carregar convênios:', err);
      setPayers([]);
    }
  }, [clinic?.id]);
  useEffect(() => {
    loadProfessionals();
  }, [loadProfessionals]);
  useEffect(() => {
    loadServices();
  }, [loadServices]);
  useEffect(() => {
    loadPayers();
  }, [loadPayers]);

  // =========================================================================
  // EVENT LISTENER PARA BOTÃO "NOVO AGENDAMENTO"
  // =========================================================================
  useEffect(() => {
    const handleOpenNewAppointment = () => {
      setNovoAgendamentoInfo(null);
      setModalNovoOpen(true);
    };
    window.addEventListener('openNewAppointment', handleOpenNewAppointment);
    return () => {
      window.removeEventListener('openNewAppointment', handleOpenNewAppointment);
    };
  }, []);

  // =========================================================================
  // CARREGA AGENDAMENTOS
  // =========================================================================
  const loadAppointments = useCallback(async () => {
    if (!filters.clinicId) return;
    setLoading(true);

    // 🔒 RBAC: Se for profissional, buscar seu professional_id
    let userProfessionalId = null;
    if (currentRole?.toLowerCase?.() === 'profissional' && user?.email) {
      const {
        data: allProfs
      } = await supabase.from('professionals').select('id, name').eq('email', user.email).eq('clinic_id', filters.clinicId);
      if (allProfs?.length > 1) {
        console.warn(`⚠️ [DUPLICATA] ${allProfs.length} profissionais com email ${user.email}`);
        allProfs.forEach((p, i) => console.log(`  [${i}] ${p.id} - ${p.name}`));
      }
      if (allProfs?.length === 1) {
        userProfessionalId = allProfs[0].id;
        console.log('✅ [RBAC] Profissional detectado. Professional ID:', userProfessionalId);
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
      userRole: currentRole,
      userProfessionalId: userProfessionalId,
      query: filters.query
    });
    setAppointments(data || []);
    setLoading(false);
  }, [filters, currentRole, user?.id]);
  useEffect(() => {
    loadAppointments();
  }, [filters, loadAppointments]);

  // =========================================================================
  // PAINEL LATERAL
  // =========================================================================
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

  // =========================================================================
  // ATUALIZA STATUS
  // =========================================================================
  const updateStatus = async (item, status) => {
    await supabase.from("appointments").update({
      status
    }).eq("id", item.id);
    loadAppointments();
  };

  // =========================================================================
  // RENDERIZA CALENDÁRIO OU TABELA
  // =========================================================================
  const viewRender = useMemo(() => {
    if (viewMode === VIEW_MODE.LIST) {
      return /*#__PURE__*/React.createElement(AgendaTable, {
        appointments: appointments,
        loading: loading,
        onClickSlot: openPanel,
        isProfessional: false,
        selectedDate: filters.dateStart
      });
    }
    return /*#__PURE__*/React.createElement(AgendaCalendar, {
      appointments: appointments,
      professionals: professionals,
      calendarView: calendarView,
      filters: filters,
      loading: loading,
      onSelectEvent: openPanel,
      onCreateAtSlot: info => {
        setNovoAgendamentoInfo(info);
        setModalNovoOpen(true);
      }
    });
  }, [viewMode, appointments, professionals, loading, calendarView, filters]);

  // =========================================================================
  // RENDER FINAL DO LAYOUT PREMIUM
  // =========================================================================
  return /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col w-full h-full overflow-hidden"
  }, /*#__PURE__*/React.createElement(AgendaToolbar, {
    viewMode: viewMode,
    setViewMode: setViewMode,
    calendarView: calendarView,
    setCalendarView: setCalendarView,
    filters: filters,
    setFilters: setFilters,
    professionals: professionals
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 p-3 overflow-hidden bg-gray-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-full h-full rounded-lg border bg-white shadow-inner overflow-hidden"
  }, viewRender)), children && /*#__PURE__*/React.createElement("div", {
    className: "w-full bg-white border-t shadow-inner p-6"
  }, children), /*#__PURE__*/React.createElement(AgendaSidePanel, {
    open: panelOpen,
    onClose: closePanel,
    data: panelData,
    logs: logs,
    onConfirm: a => updateStatus(a, "confirmed"),
    onCancel: a => updateStatus(a, "canceled")
  }), /*#__PURE__*/React.createElement(ModalCriarAgendamento, {
    open: modalNovoOpen,
    onOpenChange: setModalNovoOpen,
    clinicId: filters.clinicId,
    data: novoAgendamentoInfo,
    professionals: professionals,
    services: services,
    payers: payers,
    onCreated: loadAppointments
  }));
}