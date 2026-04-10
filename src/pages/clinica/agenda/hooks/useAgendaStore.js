// src/pages/clinica/agenda/hooks/useAgendaStore.js
import { useState, useCallback, useMemo } from 'react';

/**
 * Hook centralizado para gerenciar o estado da Agenda Única
 * Responsável por: data, viewMode, filtros, agendamentos, slot selecionado
 */

// Função auxiliar para obter data local em formato YYYY-MM-DD
function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function useAgendaStore() {
  // 📅 Data selecionada (formato ISO string - usando data LOCAL, não UTC)
  const [date, setDate] = useState(getLocalDateString());

  // 👁️ Modo de visualização: 'geral' | 'profissional' | 'sala'
  const [viewMode, setViewMode] = useState('geral');

  // 🔍 Filtros combinativos
  const [filters, setFilters] = useState({
    professional: null,      // ID do profissional
    room: null,              // ID da sala
    status: null,            // Confirmado, A confirmar, Faltou, Encaixe, Disponível
    payer: null,             // ID do convênio/pagador
    service: null,           // ID do serviço
    searchText: '',          // Busca por paciente ou serviço
  });

  // 📊 Agendamentos carregados
  const [appointments, setAppointments] = useState([]);

  // ⏳ Estados de carregamento
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 🎯 Slot/Agendamento selecionado para o modal
  const [selectedSlot, setSelectedSlot] = useState(null);

  // 🧮 Dados auxiliares (profissionais, salas, serviços)
  const [metadata, setMetadata] = useState({
    professionals: [],
    rooms: [],
    services: [],
    payers: [],
  });

  // 🔧 Atualizar um filtro específico
  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  // 🔧 Limpar todos os filtros
  const clearFilters = useCallback(() => {
    setFilters({
      professional: null,
      room: null,
      status: null,
      payer: null,
      service: null,
      searchText: '',
    });
  }, []);

  // 🔧 Atualizar filtros múltiplos de uma vez
  const setMultipleFilters = useCallback((newFilters) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
  }, []);

  // 📅 Navegar para data anterior
  const previousDay = useCallback(() => {
    const [year, month, day] = date.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    d.setDate(d.getDate() - 1);
    setDate(getLocalDateString(d));
  }, [date]);

  // 📅 Navegar para próxima data
  const nextDay = useCallback(() => {
    const [year, month, day] = date.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    d.setDate(d.getDate() + 1);
    setDate(getLocalDateString(d));
  }, [date]);

  // 📅 Ir para hoje
  const goToday = useCallback(() => {
    setDate(getLocalDateString());
  }, []);

  // 📅 Ir para semana específica (começa segunda)
  const goToWeek = useCallback(() => {
    const [year, month, day] = date.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    const dayOfWeek = d.getDay();
    const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Ajusta para segunda
    d.setDate(diff);
    setDate(getLocalDateString(d));
  }, [date]);

  // 📅 Ir para mês específico (primeiro dia)
  const goToMonth = useCallback(() => {
    const [year, month, day] = date.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    d.setDate(1);
    setDate(getLocalDateString(d));
  }, [date]);

  // 🎯 Selecionar slot para criar/editar agendamento
  const selectSlot = useCallback((slot) => {
    setSelectedSlot(slot);
  }, []);

  // 🎯 Fechar modal de agendamento
  const deselectSlot = useCallback(() => {
    setSelectedSlot(null);
  }, []);

  // 🎯 Atualizar agendamento na lista local
  const updateAppointmentLocal = useCallback((id, updates) => {
    setAppointments(prev => 
      prev.map(apt => apt.id === id ? { ...apt, ...updates } : apt)
    );
  }, []);

  // 🎯 Remover agendamento da lista local
  const removeAppointmentLocal = useCallback((id) => {
    setAppointments(prev => prev.filter(apt => apt.id !== id));
  }, []);

  // 🎯 Adicionar agendamento na lista local
  const addAppointmentLocal = useCallback((appointment) => {
    setAppointments(prev => [...prev, appointment]);
  }, []);

  /**
   * 📊 Agendamentos filtrados
   * Aplica filtros ao array de agendamentos
   */
  const filteredAppointments = useMemo(() => {
    let result = appointments;

    // Filtrar por profissional (se definido)
    if (filters.professional) {
      result = result.filter(apt => apt.professional_id === filters.professional);
    }

    // Filtrar por sala (se definido)
    if (filters.room) {
      result = result.filter(apt => apt.room_id === filters.room);
    }

    // Filtrar por status (se definido)
    if (filters.status) {
      result = result.filter(apt => apt.status === filters.status);
    }

    // Filtrar por convênio (se definido)
    if (filters.payer) {
      result = result.filter(apt => apt.payer_id === filters.payer);
    }

    // Filtrar por serviço (se definido)
    if (filters.service) {
      result = result.filter(apt => apt.service_id === filters.service);
    }

    // Filtrar por busca de texto (paciente ou serviço)
    if (filters.searchText) {
      const search = filters.searchText.toLowerCase();
      result = result.filter(apt => 
        apt.patient_name?.toLowerCase().includes(search) ||
        apt.service_name?.toLowerCase().includes(search)
      );
    }

    return result;
  }, [appointments, filters]);

  /**
   * 📊 Indicadores compactos
   * Calcula KPIs dos agendamentos filtrados
   */
  const indicators = useMemo(() => {
    const total = filteredAppointments.length;
    const confirmed = filteredAppointments.filter(apt => apt.status === 'confirmado').length;
    const noShow = filteredAppointments.filter(apt => apt.status === 'faltou').length;
    const fitting = filteredAppointments.filter(apt => apt.status === 'encaixe').length;

    // Taxa de ocupação: confirmados / total
    const occupationRate = total > 0 ? ((confirmed / total) * 100).toFixed(1) : 0;

    return {
      total,
      confirmed,
      noShow,
      fitting,
      occupationRate
    };
  }, [filteredAppointments]);

  return {
    // 📅 Estado de data
    date,
    setDate,
    previousDay,
    nextDay,
    goToday,
    goToWeek,
    goToMonth,

    // 👁️ Modo de visualização
    viewMode,
    setViewMode,

    // 🔍 Filtros
    filters,
    updateFilter,
    clearFilters,
    setMultipleFilters,

    // 📊 Agendamentos
    appointments,
    setAppointments,
    filteredAppointments,
    updateAppointmentLocal,
    removeAppointmentLocal,
    addAppointmentLocal,

    // ⏳ Estados de carregamento
    loading,
    setLoading,
    error,
    setError,

    // 🎯 Slot selecionado
    selectedSlot,
    selectSlot,
    deselectSlot,

    // 📊 Indicadores
    indicators,

    // 🧮 Dados auxiliares
    metadata,
    setMetadata,
  };
}
