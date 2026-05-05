// src/components/base-sistema/ProfessionalScheduleTab.jsx
// ============================================================
// ABA: Disponibilidade de Horários (para modal de edição)
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import * as professionalScheduleApi from '@/lib/professionalScheduleApi';
import * as roomsApi from '@/lib/roomsApi';
import * as healthInsurancesApi from '@/lib/healthInsurancesApi';
import { DatePickerCalendar } from '@/components/ui/DatePickerCalendar';
import { Button } from '@/components/ui/Button';
import { Trash2, Edit2, X } from 'lucide-react';
import { DAYS_OF_WEEK } from '@/lib/selectConstants';

export function ProfessionalScheduleTab({
  profesionalId,
  clinicId,
  submitting,
  onFormStateChange,
  onSaveSchedule,
}) {
  const [schedules, setSchedules] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [healthInsurances, setHealthInsurances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingScheduleId, setEditingScheduleId] = useState(null);
  const [isHealthInsurancesOpen, setIsHealthInsurancesOpen] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    id: null,
    unit_name: '',
    room_id: '',
    day_of_week: '1',
    start_time: '08:00',
    end_time: '17:00',
    break_start: '',
    break_end: '',
    start_date: '',
    end_date: '',
    duration_minutes: 30,
    observations: '',
    allowed_health_insurances: [],
    active: true,
  });

  // Ref para fechar o dropdown ao clicar fora
  const healthInsurancesRef = useRef(null);

  // Carrega horários do profissional e salas disponíveis
  useEffect(() => {
    loadSchedules();
    loadRooms();
    loadHealthInsurances();
  }, [profesionalId, clinicId]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (healthInsurancesRef.current && !healthInsurancesRef.current.contains(event.target)) {
        setIsHealthInsurancesOpen(false);
      }
    }

    if (isHealthInsurancesOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isHealthInsurancesOpen]);

  // Notificar pai sobre estado do formulário
  useEffect(() => {
    if (onFormStateChange) {
      onFormStateChange({
        isEditing: !!editingScheduleId,
        hasUnsavedData:
          !!editingScheduleId ||
          newSchedule.unit_name ||
          newSchedule.room_id ||
          newSchedule.day_of_week !== '1',
      });
    }
  }, [editingScheduleId, newSchedule, onFormStateChange]);

  // Exportar função para salvar (será chamada pelo pai)
  const getScheduleData = () => ({
    id: newSchedule.id,
    unit_name: newSchedule.unit_name,
    room_id: newSchedule.room_id,
    professional_id: profesionalId,
    day_of_week: newSchedule.day_of_week,
    start_time: newSchedule.start_time,
    end_time: newSchedule.end_time,
    break_start: newSchedule.break_start || null,
    break_end: newSchedule.break_end || null,
    active: newSchedule.active,
    duration_minutes: newSchedule.duration_minutes,
    observations: newSchedule.observations || null,
    allowed_health_insurances:
      newSchedule.allowed_health_insurances.length > 0
        ? newSchedule.allowed_health_insurances
        : null,
  });

  const loadSchedules = async () => {
    if (!profesionalId) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await professionalScheduleApi.getProfessionalSchedules(profesionalId);
      setSchedules(data || []);
    } catch (err) {
      console.error('Erro ao carregar horários:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadRooms = async () => {
    if (!clinicId) {
      return;
    }

    try {
      const data = await roomsApi.listRooms(clinicId);
      setRooms(data || []);
    } catch (err) {
      console.error('Erro ao carregar salas:', err);
    }
  };

  const loadHealthInsurances = async () => {
    if (!clinicId) {
      return;
    }

    try {
      const data = await healthInsurancesApi.listHealthInsurances(clinicId);
      setHealthInsurances(data || []);
    } catch (err) {
      console.error('Erro ao carregar convênios:', err);
    }
  };

  const handleAddSchedule = async () => {
    if (
      !newSchedule.unit_name ||
      !newSchedule.room_id ||
      !newSchedule.day_of_week ||
      !newSchedule.start_time ||
      !newSchedule.end_time
    ) {
      setError('Preencha todos os campos obrigatórios (Unidade, Sala, Dia, Horários)');
      return;
    }

    if (newSchedule.start_time >= newSchedule.end_time) {
      setError('Horário de início deve ser menor que o de fim');
      return;
    }

    if (newSchedule.break_start && newSchedule.break_end) {
      if (newSchedule.break_start >= newSchedule.break_end) {
        setError('Intervalo: horário de início deve ser menor que o de fim');
        return;
      }
      if (
        newSchedule.break_start < newSchedule.start_time ||
        newSchedule.break_end > newSchedule.end_time
      ) {
        setError('Intervalo deve estar dentro do horário de funcionamento');
        return;
      }
    }

    // Validar duplicata - se é novo (não edit)
    // Uma pessoa NÃO pode estar em dois lugares ao mesmo tempo!
    if (!newSchedule.id) {
      const isDuplicate = schedules.some((s) => {
        // Normaliza horários removendo segundos (banco retorna HH:MM:SS)
        const normalizarHora = (hora) => {
          if (!hora) {
            return '';
          }
          return hora.split(':').slice(0, 2).join(':'); // Remove segundos
        };

        const sameDay = String(s.day_of_week) === newSchedule.day_of_week;
        const sameStart = normalizarHora(s.start_time) === normalizarHora(newSchedule.start_time);
        const sameEnd = normalizarHora(s.end_time) === normalizarHora(newSchedule.end_time);

        return sameDay && sameStart && sameEnd;
      });

      if (isDuplicate) {
        const dayName =
          DAYS_OF_WEEK.find((d) => d.value === newSchedule.day_of_week)?.label || 'este dia';
        const msg =
          '🚫 CONFLITO DE HORÁRIO!\n\n' +
          `Já existe horário em ${dayName} das ${newSchedule.start_time} às ${newSchedule.end_time}\n\n` +
          'Uma pessoa não pode estar em dois lugares ao mesmo tempo.\n' +
          'Escolha outro dia ou outro horário.';
        setError(msg);
        return;
      }
    }

    try {
      setError(null);
      const scheduleData = {
        ...(newSchedule.id && { id: newSchedule.id }),
        unit_name: newSchedule.unit_name,
        room_id: newSchedule.room_id,
        professional_id: profesionalId,
        day_of_week: newSchedule.day_of_week,
        start_time: newSchedule.start_time,
        end_time: newSchedule.end_time,
        break_start: newSchedule.break_start || null,
        break_end: newSchedule.break_end || null,
        active: newSchedule.active,
        duration_minutes: newSchedule.duration_minutes,
        observations: newSchedule.observations || null,
        allowed_health_insurances:
          newSchedule.allowed_health_insurances.length > 0
            ? newSchedule.allowed_health_insurances
            : null,
      };

      await professionalScheduleApi.upsertSchedule(clinicId, profesionalId, scheduleData);

      // Recarregar dados
      await loadSchedules();

      // Resetar formulário
      resetForm();
    } catch (err) {
      console.error('❌ Erro ao salvar:', err);
      setError(err.message || 'Erro ao salvar horário');
    }
  };

  const handleEditSchedule = (schedule) => {
    setNewSchedule({
      id: schedule.id,
      unit_name: schedule.unit_name || '',
      room_id: schedule.room_id || '',
      day_of_week: String(schedule.day_of_week),
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      break_start: schedule.break_start || '',
      break_end: schedule.break_end || '',
      start_date: schedule.start_date || '',
      end_date: schedule.end_date || '',
      active: schedule.active ?? true,
      duration_minutes: schedule.duration_minutes || 30,
      observations: schedule.observations || '',
      allowed_health_insurances: schedule.allowed_health_insurances || [],
    });
    setEditingScheduleId(schedule.id);
    setError(null);
  };

  const resetForm = () => {
    setNewSchedule({
      id: null,
      unit_name: '',
      room_id: '',
      day_of_week: '1',
      start_time: '08:00',
      end_time: '17:00',
      break_start: '',
      break_end: '',
      start_date: '',
      end_date: '',
      active: true,
      duration_minutes: 30,
      observations: '',
      allowed_health_insurances: [],
    });
    setEditingScheduleId(null);
  };

  const handleDeleteSchedule = async (scheduleId) => {
    const schedule = schedules.find((s) => s.id === scheduleId);
    const dayLabel =
      DAYS_OF_WEEK.find((d) => d.value === String(schedule.day_of_week))?.label || 'Dia';

    if (
      !window.confirm(
        `Remover horário de ${dayLabel} (${schedule.start_time} - ${schedule.end_time})?`,
      )
    ) {
      return;
    }

    try {
      setError(null);
      await professionalScheduleApi.deleteProfessionalSchedule(scheduleId);
      setSchedules(schedules.filter((s) => s.id !== scheduleId));
    } catch (err) {
      setError(err.message || 'Erro ao remover horário');
    }
  };

  // Armazenar referências das funções para acesso externo (após definição)
  useEffect(() => {
    if (!window.__ProfessionalScheduleTab) {
      window.__ProfessionalScheduleTab = {};
    }
    window.__ProfessionalScheduleTab.handleAddSchedule = handleAddSchedule;
    window.__ProfessionalScheduleTab.resetForm = resetForm;
  }, [handleAddSchedule, resetForm]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-gray-500">Carregando horários...</p>
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {error && (
          <div className="p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Adicionar novo horário */}
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="border-b pb-3 mb-4 flex items-center justify-between">
            <h4 className="text-lg font-bold text-gray-900">
              {editingScheduleId ? '✏️ Editar Horário' : '➕ Novo Horário de Atendimento'}
            </h4>
            {editingScheduleId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                disabled={submitting}
              >
                <X size={16} /> Cancelar
              </button>
            )}
          </div>

          {/* Linha 1: Unidade, Sala, Dia da Semana */}
          <div className="flex gap-2 items-end mb-3">
            {/* Unidade/Filial */}
            <div className="flex-1 min-w-[120px]">
              <label className="block text-xs font-medium text-gray-700 mb-1">Unidade/Filial</label>
              <input
                type="text"
                value={newSchedule.unit_name}
                onChange={(e) => setNewSchedule({ ...newSchedule, unit_name: e.target.value })}
                placeholder="Ex: Matriz, SP1, RJ"
                className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={submitting}
              />
            </div>

            {/* Sala */}
            <div className="flex-1 min-w-[130px]">
              <label className="block text-xs font-medium text-gray-700 mb-1">Sala</label>
              <select
                value={newSchedule.room_id}
                onChange={(e) => setNewSchedule({ ...newSchedule, room_id: e.target.value })}
                className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={submitting}
              >
                <option value="">Selecione...</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Dia da Semana */}
            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs font-medium text-gray-700 mb-1">Dia da Semana</label>
              <select
                value={newSchedule.day_of_week}
                onChange={(e) => setNewSchedule({ ...newSchedule, day_of_week: e.target.value })}
                className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={submitting}
              >
                {DAYS_OF_WEEK.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Linha 2: Horários (Início, Fim, Intervalo Início, Intervalo Fim) */}
          <div className="flex gap-2 items-end mb-3">
            {/* Horário Início */}
            <div className="flex-1 min-w-[100px]">
              <label className="block text-xs font-medium text-gray-700 mb-1">Início</label>
              <input
                type="time"
                value={newSchedule.start_time}
                onChange={(e) => setNewSchedule({ ...newSchedule, start_time: e.target.value })}
                className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={submitting}
              />
            </div>

            {/* Horário Fim */}
            <div className="flex-1 min-w-[100px]">
              <label className="block text-xs font-medium text-gray-700 mb-1">Fim</label>
              <input
                type="time"
                value={newSchedule.end_time}
                onChange={(e) => setNewSchedule({ ...newSchedule, end_time: e.target.value })}
                className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={submitting}
              />
            </div>

            {/* Intervalo - Início */}
            <div className="flex-1 min-w-[130px]">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Intervalo Início
              </label>
              <input
                type="time"
                value={newSchedule.break_start}
                onChange={(e) => setNewSchedule({ ...newSchedule, break_start: e.target.value })}
                className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={submitting}
              />
            </div>

            {/* Intervalo - Fim */}
            <div className="flex-1 min-w-[130px]">
              <label className="block text-xs font-medium text-gray-700 mb-1">Intervalo Fim</label>
              <input
                type="time"
                value={newSchedule.break_end}
                onChange={(e) => setNewSchedule({ ...newSchedule, break_end: e.target.value })}
                className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={submitting}
              />
            </div>
          </div>

          {/* Linha 3: Duração, Convênios */}
          <div className="flex gap-2 items-end mt-3">
            {/* Duração */}
            <div className="flex-1 min-w-[110px]">
              <label className="block text-xs font-medium text-gray-700 mb-1">Duração (min)</label>
              <input
                type="number"
                min="1"
                max="480"
                value={newSchedule.duration_minutes}
                onChange={(e) =>
                  setNewSchedule({
                    ...newSchedule,
                    duration_minutes: parseInt(e.target.value) || 30,
                  })
                }
                className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={submitting}
              />
            </div>

            {/* Convênios Permitidos - Dropdown Expansível */}
            <div ref={healthInsurancesRef} className="flex-1 min-w-[200px] relative">
              <label className="block text-xs font-medium text-gray-700 mb-1">Convênios</label>

              {/* Header do Select */}
              <button
                type="button"
                onClick={() => setIsHealthInsurancesOpen(!isHealthInsurancesOpen)}
                className="w-full px-3 py-2 border rounded-lg bg-white hover:bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between transition"
                disabled={submitting}
              >
                <span className="text-left text-gray-700 font-medium">
                  {newSchedule.allowed_health_insurances.length === 0
                    ? 'Selecione convênios...'
                    : newSchedule.allowed_health_insurances.length === 1
                      ? `${newSchedule.allowed_health_insurances.length} convênio`
                      : `${newSchedule.allowed_health_insurances.length} convênios`}
                </span>
                <svg
                  className={`w-4 h-4 text-gray-500 transition-transform ${isHealthInsurancesOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
              </button>

              {/* Dropdown Lista */}
              {isHealthInsurancesOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 border rounded-lg bg-white shadow-lg z-50">
                  {/* Header com Botões de Seleção */}
                  {healthInsurances.length > 0 && (
                    <div className="border-b px-3 py-2 flex gap-2 bg-gray-50">
                      <button
                        type="button"
                        onClick={() =>
                          setNewSchedule({
                            ...newSchedule,
                            allowed_health_insurances: healthInsurances.map((h) => h.id),
                          })
                        }
                        className="text-xs text-blue-600 hover:text-blue-700 font-semibold disabled:opacity-50"
                        disabled={submitting}
                      >
                        ✓ Selecionar Todos
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        type="button"
                        onClick={() =>
                          setNewSchedule({ ...newSchedule, allowed_health_insurances: [] })
                        }
                        className="text-xs text-red-600 hover:text-red-700 font-semibold disabled:opacity-50"
                        disabled={submitting}
                      >
                        ✕ Desmarcar Todos
                      </button>
                    </div>
                  )}

                  {/* Lista de Checkboxes */}
                  <div className="max-h-48 overflow-y-auto p-2">
                    {healthInsurances.length === 0 ? (
                      <p className="text-xs text-gray-500 p-2">Nenhum convênio configurado</p>
                    ) : (
                      <div className="space-y-1.5">
                        {healthInsurances.map((insurance) => (
                          <label
                            key={insurance.id}
                            className="flex items-center gap-2.5 px-2 py-1.5 cursor-pointer hover:bg-blue-50 rounded transition"
                          >
                            <input
                              type="checkbox"
                              checked={newSchedule.allowed_health_insurances.includes(insurance.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewSchedule({
                                    ...newSchedule,
                                    allowed_health_insurances: [
                                      ...newSchedule.allowed_health_insurances,
                                      insurance.id,
                                    ],
                                  });
                                } else {
                                  setNewSchedule({
                                    ...newSchedule,
                                    allowed_health_insurances:
                                      newSchedule.allowed_health_insurances.filter(
                                        (id) => id !== insurance.id,
                                      ),
                                  });
                                }
                              }}
                              className="w-4 h-4 rounded border-gray-300 cursor-pointer accent-blue-600"
                              disabled={submitting}
                            />
                            <span className="text-sm text-gray-700">{insurance.name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Linha 4: Observações */}
          <div className="flex gap-3 items-stretch mt-3">
            {/* Observações - full width */}
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Observações</label>
              <textarea
                value={newSchedule.observations}
                onChange={(e) => setNewSchedule({ ...newSchedule, observations: e.target.value })}
                placeholder="Ex: Sem risco biológico..."
                className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows="2"
                disabled={submitting}
              />
            </div>
          </div>

          {/* Linha 5: Data Inicial, Data Final, Ativo e Botões */}
          <div className="flex gap-2 items-end mt-3">
            {/* Data Inicial */}
            <div className="flex-1 min-w-[140px]">
              <DatePickerCalendar
                value={newSchedule.start_date}
                onChange={(date) => setNewSchedule({ ...newSchedule, start_date: date })}
                placeholder="Selecione"
                label="Data Inicial"
                disabled={submitting}
              />
            </div>

            {/* Data Final */}
            <div className="flex-1 min-w-[140px]">
              <DatePickerCalendar
                value={newSchedule.end_date}
                onChange={(date) => setNewSchedule({ ...newSchedule, end_date: date })}
                placeholder="Selecione"
                label="Data Final"
                disabled={submitting}
              />
            </div>

            {/* Status */}
            <div className="flex items-center gap-1 pb-0.5">
              <input
                type="checkbox"
                id="active-schedule"
                checked={newSchedule.active}
                onChange={(e) => setNewSchedule({ ...newSchedule, active: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300"
                disabled={submitting}
              />
              <label
                htmlFor="active-schedule"
                className="text-xs font-medium text-gray-700 cursor-pointer whitespace-nowrap"
              >
                Ativo
              </label>
            </div>
          </div>
        </div>

        {/* Tabela de horários */}
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="border-b pb-3 mb-4">
            <h3 className="text-lg font-bold text-gray-900">📅 Horários Cadastrados</h3>
            <p className="text-sm text-gray-600 mt-1">Gerenciar horários de atendimento</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b">
                  <th className="text-left p-2 font-semibold text-gray-900">Unidade</th>
                  <th className="text-left p-2 font-semibold text-gray-900">Sala</th>
                  <th className="text-left p-2 font-semibold text-gray-900">Dia da Semana</th>
                  <th className="text-left p-2 font-semibold text-gray-900">Horário Início</th>
                  <th className="text-left p-2 font-semibold text-gray-900">Horário Fim</th>
                  <th className="text-left p-2 font-semibold text-gray-900">Intervalo</th>
                  <th className="text-left p-2 font-semibold text-gray-900">Status</th>
                  <th className="text-center p-2 font-semibold text-gray-900">Ações</th>
                </tr>
              </thead>
              <tbody>
                {schedules && schedules.length > 0 ? (
                  schedules.map((schedule) => {
                    const dayLabel =
                      DAYS_OF_WEEK.find((d) => d.value === String(schedule.day_of_week))?.label ||
                      schedule.day_of_week;
                    const roomName =
                      rooms.find((r) => r.id === schedule.room_id)?.name || 'Não definida';
                    return (
                      <tr key={schedule.id} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium text-purple-700">
                          {schedule.unit_name || '-'}
                        </td>
                        <td className="p-2 font-medium text-blue-700">{roomName}</td>
                        <td className="p-2">{dayLabel}</td>
                        <td className="p-2">{schedule.start_time}</td>
                        <td className="p-2">{schedule.end_time}</td>
                        <td className="p-2 text-xs text-gray-600">
                          {schedule.break_start && schedule.break_end
                            ? `${schedule.break_start} - ${schedule.break_end}`
                            : '-'}
                        </td>
                        <td className="p-2">
                          {schedule.active ? (
                            <span className="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">
                              Ativo
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded">
                              Inativo
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-center flex gap-1 justify-center">
                          <button
                            type="button"
                            onClick={() => handleEditSchedule(schedule)}
                            className="text-blue-600 hover:text-blue-700 p-1 transition"
                            disabled={submitting}
                            title="Editar"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSchedule(schedule.id)}
                            className="text-red-600 hover:text-red-700 p-1 transition"
                            disabled={submitting}
                            title="Remover"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="8" className="p-4 text-center text-gray-500">
                      Nenhum horário cadastrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
