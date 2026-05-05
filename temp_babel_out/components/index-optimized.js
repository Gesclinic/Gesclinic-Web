import React, { useState, useCallback, useMemo } from 'react';
import AgendaHeaderNew from './AgendaHeaderNew';
import AgendaToolbarOptimized from './AgendaToolbarOptimized';
import AgendaFiltersOptimized from './AgendaFiltersOptimized';
import AgendaGridOptimized from './AgendaGridOptimized';

/**
 * AgendaPage - Exemplo de integração completa com componentes otimizados
 * 
 * Layout compacto:
 * - Header: 44px (navegação + modo visualização + novo)
 * - Toolbar: 40px (segmented control + dropdown perfil)
 * - Filters: 40px (busca + toggle), expande até 280px quando aberto
 * - Grid: Dinâmica (apenas colunas necessárias)
 * 
 * Total vertical: ~620px para 8h de agenda com filtros fechados
 * (vs 1480px antes - 58% de redução!)
 */
export default function AgendaPage() {
  // Simulação de dados - em produção vem da API
  const mockAppointments = [{
    id: 1,
    horário: '08:00',
    status: 'disponivel'
  }, {
    id: 2,
    horário: '08:30',
    paciente: 'João Silva',
    profissional: 'Dr. Carlos',
    serviço: 'Consulta',
    sala: '1',
    status: 'confirmado'
  }, {
    id: 3,
    horário: '09:00',
    status: 'disponivel'
  }, {
    id: 4,
    horário: '09:30',
    paciente: 'Maria Santos',
    profissional: 'Dra. Ana',
    serviço: 'Limpeza',
    sala: '2',
    status: 'confirmado'
  }, {
    id: 5,
    horário: '10:00',
    status: 'bloqueado'
  }, {
    id: 6,
    horário: '10:30',
    paciente: 'Pedro Costa',
    profissional: 'Dr. Carlos',
    serviço: 'Extração',
    sala: '1',
    status: 'aguardando'
  }, {
    id: 7,
    horário: '11:00',
    status: 'disponivel'
  }, {
    id: 8,
    horário: '11:30',
    paciente: 'Ana Oliveira',
    profissional: 'Dra. Ana',
    serviço: 'Raiz',
    sala: '3',
    status: 'falta'
  }];
  const mockProfessionals = [{
    id: 1,
    name: 'Dr. Carlos'
  }, {
    id: 2,
    name: 'Dra. Ana'
  }, {
    id: 3,
    name: 'Dr. Bruno'
  }];
  const mockRooms = [{
    id: 1,
    name: 'Sala 1'
  }, {
    id: 2,
    name: 'Sala 2'
  }, {
    id: 3,
    name: 'Sala 3'
  }];
  const mockAgreements = [{
    id: 1,
    name: 'Convênio A'
  }, {
    id: 2,
    name: 'Convênio B'
  }];
  const mockServices = [{
    id: 1,
    name: 'Consulta'
  }, {
    id: 2,
    name: 'Limpeza'
  }, {
    id: 3,
    name: 'Extração'
  }, {
    id: 4,
    name: 'Raiz'
  }];

  // ============================================================================
  // Estado
  // ============================================================================

  // Navegação de data
  const [currentDate, setCurrentDate] = useState(new Date('2026-02-03'));

  // Modo de visualização (Semana/Mês)
  const [viewMode, setViewMode] = useState('week');

  // Modo da agenda (Recepção/Profissional/Gestor)
  const [agendaMode, setAgendaMode] = useState('recepção');

  // Perfil do usuário
  const [userProfile, setUserProfile] = useState('recepção');

  // Busca e filtros
  const [searchText, setSearchText] = useState('');
  const [selectedFilters, setSelectedFilters] = useState({});

  // ============================================================================
  // Handlers
  // ============================================================================

  const handlePreviousDay = useCallback(() => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
  }, [currentDate]);
  const handleNextDay = useCallback(() => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
  }, [currentDate]);
  const handleNewAppointment = useCallback(() => {
    console.log('🆕 Agendar novo');
    // Abrir modal/drawer de novo agendamento
  }, []);
  const handleViewModeChange = useCallback(mode => {
    setViewMode(mode);
  }, []);
  const handleAgendaModeChange = useCallback(mode => {
    setAgendaMode(mode);
    console.log('📋 Modo agenda mudou para:', mode);
  }, []);
  const handleProfileChange = useCallback(profile => {
    setUserProfile(profile);
    console.log('👤 Perfil mudou para:', profile);
  }, []);
  const handleSearchChange = useCallback(text => {
    setSearchText(text);
  }, []);
  const handleFiltersChange = useCallback(filters => {
    setSelectedFilters(filters);
  }, []);
  const handleBookSlot = useCallback(slot => {
    console.log('📅 Agendar em:', slot.horário);
    // Abrir modal de novo agendamento pré-preenchido com horário
  }, []);
  const handleEditAppointment = useCallback(id => {
    console.log('✏️ Editar agendamento:', id);
  }, []);
  const handleViewDetails = useCallback(id => {
    console.log('👁️ Ver detalhes:', id);
  }, []);

  // ============================================================================
  // Filtragem de dados
  // ============================================================================

  const filteredAppointments = useMemo(() => {
    let filtered = mockAppointments;

    // Filtro por busca (paciente)
    if (searchText) {
      filtered = filtered.filter(appt => (appt.paciente || '').toLowerCase().includes(searchText.toLowerCase()));
    }

    // Filtro por profissional
    if (selectedFilters.profissionalId) {
      filtered = filtered.filter(appt => {
        const profId = mockProfessionals.find(p => p.name === appt.profissional)?.id;
        return profId === selectedFilters.profissionalId;
      });
    }

    // Filtro por sala
    if (selectedFilters.salaId) {
      filtered = filtered.filter(appt => {
        const roomId = mockRooms.find(r => r.name === appt.sala)?.id;
        return roomId === selectedFilters.salaId;
      });
    }

    // Filtro por status
    if (selectedFilters.statusList?.length > 0) {
      filtered = filtered.filter(appt => selectedFilters.statusList.includes(appt.status));
    }
    return filtered;
  }, [mockAppointments, searchText, selectedFilters]);

  // ============================================================================
  // Render
  // ============================================================================

  return /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-2 h-full bg-gray-50 p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "text-xl font-bold text-gray-900"
  }, "\uD83D\uDCC5 Agenda"), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-gray-500"
  }, viewMode === 'week' ? 'Semana' : 'Mês', " \u2022 ", agendaMode.charAt(0).toUpperCase() + agendaMode.slice(1))), /*#__PURE__*/React.createElement(AgendaHeaderNew, {
    currentDate: currentDate,
    viewMode: viewMode,
    onPreviousDay: handlePreviousDay,
    onNextDay: handleNextDay,
    onViewModeChange: handleViewModeChange,
    onNewAppointment: handleNewAppointment
  }), /*#__PURE__*/React.createElement(AgendaToolbarOptimized, {
    agendaMode: agendaMode,
    onAgendaModeChange: handleAgendaModeChange,
    userProfile: userProfile,
    onProfileChange: handleProfileChange,
    canAccessProfessionalMode: true,
    canAccessRoomMode: true
  }), /*#__PURE__*/React.createElement(AgendaFiltersOptimized, {
    searchText: searchText,
    onSearchChange: handleSearchChange,
    selectedFilters: selectedFilters,
    onFiltersChange: handleFiltersChange,
    professionals: mockProfessionals,
    rooms: mockRooms,
    agreements: mockAgreements,
    services: mockServices
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 min-h-0 overflow-y-auto"
  }, /*#__PURE__*/React.createElement(AgendaGridOptimized, {
    appointments: filteredAppointments,
    onBookSlot: handleBookSlot,
    onEditAppointment: handleEditAppointment,
    onViewDetails: handleViewDetails,
    isLoading: false
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between text-xs text-gray-500 border-t border-gray-200 pt-2"
  }, /*#__PURE__*/React.createElement("span", null, filteredAppointments.length, " hor\xE1rios", searchText || Object.keys(selectedFilters).length > 0 ? ' (filtrados)' : ''), /*#__PURE__*/React.createElement("span", null, filteredAppointments.filter(a => !a.paciente).length, " dispon\xEDveis")));
}