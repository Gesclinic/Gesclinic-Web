// src/pages/clinica/base-sistema/ProfessionalSchedulePage.jsx
// ============================================================
// CRUD de Horários de Profissionais - Base do Sistema
// Configuração de disponibilidade com horários específicos
// ============================================================

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { useClinicContext } from "@/contexts/ClinicContext";
import BaseSystemHeader from "@/components/layout/BaseSystemHeader";
import { Alert } from "@/components/layout/BaseSystemAlert";
import EmptyState from "@/components/layout/EmptyState";
import * as professionalsApi from "@/lib/professionalsApi";
import * as professionalScheduleApi from "@/lib/professionalScheduleApi";
import * as agendaRulesApi from "@/lib/agendaRulesApi";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit2, Trash2, X } from "lucide-react";

const DAYS_OF_WEEK = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sábado" },
];

export function ProfessionalSchedulePage() {
      // Função para editar um horário existente
      function handleEdit(schedule) {
        setEditingId(schedule.id);
        setFormData({
          professional_id: schedule.professional_id,
          intervals: [
            {
              id: schedule.id,
              day_of_week: schedule.day_of_week,
              start_time: schedule.start_time,
              end_time: schedule.end_time,
              break_start: schedule.break_start,
              break_end: schedule.break_end,
              active: schedule.active,
              note: schedule.note || "",
              blocked: schedule.blocked || false,
              duration_minutes: schedule.duration_minutes || 30,
            },
          ],
        });
        setShowForm(true);
        setError(null);
      }
    // Função para abrir o formulário de novo horário
    function handleNew() {
      setEditingId(null);
      setFormData({
        professional_id: "",
        intervals: [
          {
            day_of_week: 1,
            start_time: "08:00",
            end_time: "18:00",
            break_start: null,
            break_end: null,
            active: true,
            note: "",
            blocked: false,
            duration_minutes: 30,
          },
        ],
      });
      setShowForm(true);
      setError(null);
    }
  // Contexto da clínica
  const { clinicId, loadingClinic } = useClinicContext();

  // Carrega profissionais ao montar
  useEffect(() => {
    async function fetchProfessionals() {
      console.log("[ProfessionalSchedulePage] clinicId:", clinicId);
      if (!clinicId || loadingClinic) return;
      setLoading(true);
      setError(null);
      try {
        const profs = await professionalsApi.listProfessionals(clinicId);
        console.log("[ProfessionalSchedulePage] profissionais carregados:", profs);
        setProfessionals(profs);
      } catch (err) {
        setError(err.message || "Erro ao carregar profissionais");
        console.error("[ProfessionalSchedulePage] erro ao carregar profissionais:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProfessionals();
  }, [clinicId, loadingClinic]);

  // Carrega horários ao montar/mudar clínica
  useEffect(() => {
    async function fetchSchedules() {
      if (!clinicId || loadingClinic) return;
      setLoading(true);
      setError(null);
      try {
        const scheds = await professionalScheduleApi.getProfessionalSchedules(clinicId);
        setSchedules(scheds);
      } catch (err) {
        setError(err.message || "Erro ao carregar horários");
        console.error("[ProfessionalSchedulePage] erro ao carregar horários:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSchedules();
  }, [clinicId, loadingClinic]);

  // Função para validar o formulário
  function validateForm() {
    if (!formData.professional_id) return false;
    for (const interval of formData.intervals) {
      if (!interval.day_of_week && interval.day_of_week !== 0) return false;
      if (!interval.start_time || !interval.end_time) return false;
      if (interval.duration_minutes && (isNaN(interval.duration_minutes) || interval.duration_minutes <= 0)) return false;
    }
    return true;
  }

  // Função para recarregar os dados de horários
  async function loadData() {
    if (!clinicId) return;
    setLoading(true);
    setError(null);
    try {
      const scheds = await professionalScheduleApi.getProfessionalSchedules(clinicId);
      setSchedules(scheds);
    } catch (err) {
      setError(err.message || "Erro ao carregar horários");
    } finally {
      setLoading(false);
    }
  }
  // Fecha o formulário/modal de horários
  function closeForm() {
    setShowForm(false);
  }

  const handleCloseWithCheck = () => {
    const hasData = formData.professional_id !== "" || 
      formData.intervals.some(interval => 
        interval.day_of_week !== 1 || 
        interval.start_time !== "08:00" || 
        interval.end_time !== "18:00" ||
        interval.note !== ""
      );

    if (hasData) {
      if (window.confirm("Tem certeza que deseja sair? As alterações não salvas serão perdidas.")) {
        closeForm();
      }
    } else {
      closeForm();
    }
  };


  const [schedules, setSchedules] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  // 🆕 Estados para abas (Horários e Regras)
  const [activeTab, setActiveTab] = useState("schedules"); // "schedules" ou "rules"
  const [rules, setRules] = useState([]);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState(null);
  const [ruleFormData, setRuleFormData] = useState({
    rule_name: "",
    rule_type: "default",
    description: "",
    value: "",
    active: true,
  });

  const ruleTypes = [
    { value: "default", label: "Padrão" },
    { value: "min_interval", label: "Intervalo Mínimo" },
    { value: "max_per_day", label: "Máximo por Dia" },
    { value: "buffer_time", label: "Tempo de Intervalo" },
    { value: "blackout", label: "Período Bloqueado" },
  ];
  // Novo formato: lista de intervalos por dia
  const [formData, setFormData] = useState({
    professional_id: "",
    intervals: [
      {
        day_of_week: 1,
        start_time: "08:00",
        end_time: "18:00",
        break_start: null,
        break_end: null,
        active: true,
        note: "",
        blocked: false,
        duration_minutes: 30,
      },
    ],
  });

// ...existing code...

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      for (const interval of formData.intervals) {
        const dataToSave = {
          professional_id: formData.professional_id,
          day_of_week: parseInt(interval.day_of_week),
          start_time: interval.start_time,
          end_time: interval.end_time,
          break_start: interval.break_start || null,
          break_end: interval.break_end || null,
          active: interval.active,
          note: interval.note || "",
          blocked: interval.blocked || false,
          duration_minutes: interval.duration_minutes || 30,
        };
        if (interval.id) {
          await professionalScheduleApi.updateProfessionalSchedule(interval.id, dataToSave);
        } else {
          await professionalScheduleApi.createProfessionalSchedule(clinicId, dataToSave);
        }
      }
      await loadData();
      closeForm();
    } catch (err) {
      setError(err.message || "Erro ao salvar horário");
      console.error("Erro:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Deseja deletar esse horário?")) {
      return;
    }

    try {
      setError(null);
      await professionalScheduleApi.deleteProfessionalSchedule(id);
      setSchedules(schedules.filter((s) => s.id !== id));
    } catch (err) {
      setError(err.message || "Erro ao deletar horário");
      console.error("Erro:", err);
    }
  };

  const getProfessionalName = (id) => {
    return professionals.find((p) => p.id === id)?.name || "Desconhecido";
  };

  const getDayLabel = (day) => {
    return DAYS_OF_WEEK.find((d) => d.value === day)?.label || "Desconhecido";
  };

  // 🆕 FUNÇÕES PARA REGRAS DE AGENDAMENTO
  const loadRulesForProfessional = async (profId) => {
    if (!profId || !clinicId) return;
    try {
      const data = await agendaRulesApi.getAgendaRules(clinicId);
      // Filtrar regras por profissional se implementado no backend
      setRules(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Erro ao carregar regras:", err);
      setRules([]);
    }
  };

  const handleNewRule = () => {
    setEditingRuleId(null);
    setRuleFormData({
      rule_name: "",
      rule_type: "default",
      description: "",
      value: "",
      active: true,
    });
    setShowRuleForm(true);
  };

  const handleEditRule = (rule) => {
    setEditingRuleId(rule.id);
    setRuleFormData({
      rule_name: rule.rule_name || "",
      rule_type: rule.rule_type || "default",
      description: rule.description || "",
      value: rule.value || "",
      active: rule.active !== false,
    });
    setShowRuleForm(true);
  };

  const handleDeleteRule = async (id) => {
    if (!window.confirm("Deseja deletar essa regra?")) {
      return;
    }
    try {
      await agendaRulesApi.deleteAgendaRule(id);
      setRules(rules.filter((r) => r.id !== id));
    } catch (err) {
      setError(err.message || "Erro ao deletar regra");
    }
  };

  const handleSubmitRule = async (e) => {
    e.preventDefault();
    if (!ruleFormData.rule_name.trim()) {
      setError("Nome da regra é obrigatório");
      return;
    }

    try {
      setSubmitting(true);
      const dataToSave = {
        clinic_id: clinicId,
        professional_id: selectedProfessionalId || null,
        rule_name: ruleFormData.rule_name.trim(),
        rule_type: ruleFormData.rule_type,
        description: ruleFormData.description.trim(),
        value: ruleFormData.value || null,
        active: ruleFormData.active,
      };

      if (editingRuleId) {
        await agendaRulesApi.updateAgendaRule(editingRuleId, dataToSave);
      } else {
        await agendaRulesApi.createAgendaRule(dataToSave);
      }

      await loadRulesForProfessional(selectedProfessionalId);
      setShowRuleForm(false);
      setError(null);
    } catch (err) {
      setError(err.message || "Erro ao salvar regra");
    } finally {
      setSubmitting(false);
    }
  };

  // ...restante dos hooks e funções...

  // O return do JSX principal deve estar aqui no final da função
  if (loading) {
    return (
      <div className="space-y-4 w-full">
        <div className="h-10 bg-gray-200 rounded animate-pulse" />
        <div className="h-64 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      {/* HEADER PADRONIZADO */}
      <BaseSystemHeader
        category="4.2 Parâmetros Estruturais"
        title="Disponibilidade de Profissionais"
        subtitle="Configure a disponibilidade por dia da semana"
      />

      {/* ALERTA */}
      {error && (
        <Alert
          type="error"
          title="Aviso"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {professionals.length === 0 ? (
        <EmptyState
          icon={<Plus className="w-12 h-12 mx-auto text-gray-400" />}
          title="Nenhum profissional"
          description="Você precisa cadastrar profissionais antes"
        />
      ) : (
        <Card>
          <CardHeader className="flex flex-col gap-4 pb-0">
            <div className="flex flex-row items-center justify-between">
              <CardTitle>Configurações de Profissional</CardTitle>
              {activeTab === "schedules" && (
                <Button
                  onClick={handleNew}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                  disabled={professionals.length === 0}
                >
                  <Plus className="w-4 h-4" />
                  Novo Horário
                </Button>
              )}
              {activeTab === "rules" && (
                <Button
                  onClick={handleNewRule}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                >
                  <Plus className="w-4 h-4" />
                  Nova Regra
                </Button>
              )}
            </div>
            {/* 🆕 ABAS */}
            <div className="flex gap-2 border-b">
              <button
                onClick={() => {
                  setActiveTab("schedules");
                  setError(null);
                }}
                className={`px-4 py-2 font-medium text-sm transition-colors ${
                  activeTab === "schedules"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                📅 Horários ({schedules.length})
              </button>
              <button
                onClick={() => {
                  setActiveTab("rules");
                  loadRulesForProfessional(selectedProfessionalId);
                  setError(null);
                }}
                className={`px-4 py-2 font-medium text-sm transition-colors ${
                  activeTab === "rules"
                    ? "text-green-600 border-b-2 border-green-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                ⚙️ Regras ({rules.length})
              </button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {/* ABA HORÁRIOS */}
            {activeTab === "schedules" && (
              <>
              {schedules.length === 0 ? (
                <EmptyState
                  icon={<Plus className="w-12 h-12 mx-auto text-gray-400" />}
                  title="Nenhum horário cadastrado"
                  description="Comece definindo o horário de um profissional"
                />
              ) : (
                <div className="grid gap-6">
                  {Object.entries(
                    schedules
                      .reduce((acc, s) => {
                        if (!acc[s.professional_id]) acc[s.professional_id] = [];
                        acc[s.professional_id].push(s);
                        return acc;
                      }, {})
                ).sort((a, b) => {
                  // Ordena profissionais pelo nome
                  const nameA = getProfessionalName(a[0]).toLowerCase();
                  const nameB = getProfessionalName(b[0]).toLowerCase();
                  return nameA.localeCompare(nameB);
                }).map(([profId, profSchedules]) => (
                  <div key={profId} className="bg-white rounded-xl shadow p-4 border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-lg text-blue-700">
                        {getProfessionalName(profId)}
                      </span>
                      <span className="text-xs text-gray-500">({profSchedules.length} horário{profSchedules.length > 1 ? 's' : ''})</span>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="text-left py-2 px-2 font-semibold text-gray-700">Dia</th>
                          <th className="text-center py-2 px-2 font-semibold text-gray-700">Início - Fim</th>
                          <th className="text-center py-2 px-2 font-semibold text-gray-700">Intervalo</th>
                          <th className="text-center py-2 px-2 font-semibold text-gray-700">Duração</th>
                          <th className="text-center py-2 px-2 font-semibold text-gray-700">Observação</th>
                          <th className="text-center py-2 px-2 font-semibold text-gray-700">Bloqueio</th>
                          <th className="text-center py-2 px-2 font-semibold text-gray-700">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profSchedules
                          .sort((a, b) => a.day_of_week - b.day_of_week)
                          .map((schedule) => (
                            <tr key={schedule.id} className="border-b hover:bg-gray-50 transition">
                              <td className="py-2 px-2 text-gray-600 font-medium">
                                {getDayLabel(schedule.day_of_week)}
                              </td>
                              <td className="py-2 px-2 text-center text-gray-900 font-medium">
                                {schedule.start_time} - {schedule.end_time}
                              </td>
                              <td className="py-2 px-2 text-center text-gray-600">
                                {schedule.break_start && schedule.break_end
                                  ? `${schedule.break_start} - ${schedule.break_end}`
                                  : "-"}
                              </td>
                              <td className="py-2 px-2 text-center text-gray-600">
                                {schedule.duration_minutes ? `${schedule.duration_minutes} min` : "-"}
                              </td>
                              <td className="py-2 px-2 text-center">
                                {schedule.note ? (
                                  <span className="inline-block px-2 py-1 rounded bg-yellow-50 text-yellow-800 text-xs">
                                    {schedule.note}
                                  </span>
                                ) : "-"}
                              </td>
                              <td className="py-2 px-2 text-center">
                                {schedule.blocked ? (
                                  <span className="inline-block px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-bold">
                                    BLOQUEADO
                                  </span>
                                ) : "-"}
                              </td>
                              <td className="py-2 px-2 flex justify-center gap-2">
                                <button
                                  onClick={() => handleEdit(schedule)}
                                  className="p-2 hover:bg-blue-100 rounded-lg text-blue-600 transition"
                                  disabled={submitting}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(schedule.id)}
                                  className="p-2 hover:bg-red-100 rounded-lg text-red-600 transition"
                                  disabled={submitting}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}
              </>
            )}

            {/* ABA REGRAS */}
            {activeTab === "rules" && (
              <div className="space-y-4">
                {rules.length === 0 ? (
                  <EmptyState
                    icon={<Plus className="w-12 h-12 mx-auto text-gray-400" />}
                    title="Nenhuma regra cadastrada"
                    description="Crie regras para controlar a disponibilidade da agenda"
                  />
                ) : (
                  <div className="grid gap-3">
                    {rules.map((rule) => (
                      <div key={rule.id} className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">{rule.rule_name}</h3>
                            <p className="text-xs text-gray-600 mt-1">
                              {ruleTypes.find(t => t.value === rule.rule_type)?.label || rule.rule_type}
                            </p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            rule.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                          }`}>
                            {rule.active ? "Ativo" : "Inativo"}
                          </span>
                        </div>
                        {rule.description && (
                          <p className="text-sm text-gray-700 mb-2">{rule.description}</p>
                        )}
                        {rule.value && (
                          <p className="text-xs text-gray-600 mb-2">Valor: {rule.value}</p>
                        )}
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEditRule(rule)}
                            className="p-2 hover:bg-blue-100 rounded-lg text-blue-600 transition"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteRule(rule.id)}
                            className="p-2 hover:bg-red-100 rounded-lg text-red-600 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {showForm && (
        <div className="app-modal-overlay">
          <div className="app-modal-shell app-modal-shell--form app-modal-shell--wide">
            <Card className="app-modal-card shadow-2xl border-0">
              <button
                type="button"
                onClick={() => handleCloseWithCheck()}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-full transition-colors z-10"
                title="Fechar"
              >
                <X size={20} />
              </button>
              <CardHeader className="border-b shrink-0" style={{flexShrink: 0}}>
                <CardTitle>
                  {editingId ? "Editar Horários" : "Novo Horários"}
                </CardTitle>
              </CardHeader>
              <CardContent className="app-modal-body p-6 modal-content-scroll">
                <form id="schedule-form" onSubmit={handleSubmit} className="space-y-4" style={{flex: 1, overflow: "visible"}}>
                  <div style={{flex: 1, overflowY: "auto", paddingRight: "8px"}}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Profissional <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.professional_id}
                    onChange={(e) =>
                      setFormData({ ...formData, professional_id: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    disabled={submitting}
                    autoFocus
                  >
                    <option value="">Selecione um profissional</option>
                    {professionals.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-8 max-h-[60vh] overflow-y-auto scrollbar-custom">
                  {[...formData.intervals].sort((a, b) => a.day_of_week - b.day_of_week).map((interval, idx) => (
                    <div key={interval.id || idx} className={`border rounded-lg p-6 bg-gray-50 shadow-sm ${interval.blocked ? 'border-red-500 bg-red-50' : 'border-blue-200'}`}>
                      <div className="flex flex-col md:flex-row md:gap-6">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Dia da Semana <span className="text-red-500">*</span></label>
                            <select
                              value={interval.day_of_week}
                              onChange={(e) => {
                                const newIntervals = [...formData.intervals];
                                newIntervals[idx].day_of_week = parseInt(e.target.value);
                                setFormData({ ...formData, intervals: newIntervals });
                              }}
                              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
                              disabled={submitting}
                            >
                              {DAYS_OF_WEEK.map((d) => (
                                <option key={d.value} value={d.value}>{d.label}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex gap-4">
                            <div className="flex-1">
                              <label className="block text-sm font-medium text-gray-700 mb-1">Início <span className="text-red-500">*</span></label>
                              <input
                                type="time"
                                value={interval.start_time || ""}
                                onChange={(e) => {
                                  const newIntervals = [...formData.intervals];
                                  newIntervals[idx].start_time = e.target.value;
                                  setFormData({ ...formData, intervals: newIntervals });
                                }}
                                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                                required
                                disabled={submitting}
                              />
                            </div>
                            <div className="flex-1">
                              <label className="block text-sm font-medium text-gray-700 mb-1">Fim <span className="text-red-500">*</span></label>
                              <input
                                type="time"
                                value={interval.end_time || ""}
                                onChange={(e) => {
                                  const newIntervals = [...formData.intervals];
                                  newIntervals[idx].end_time = e.target.value;
                                  setFormData({ ...formData, intervals: newIntervals });
                                }}
                                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                                required
                                disabled={submitting}
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor={`duration-${idx}`}>Duração</label>
                            <input
                              type="number"
                              id={`duration-${idx}`}
                              min={5}
                              max={240}
                              step={5}
                              value={interval.duration_minutes !== undefined && interval.duration_minutes !== null ? interval.duration_minutes : ""}
                              onChange={(e) => {
                                const newIntervals = [...formData.intervals];
                                newIntervals[idx].duration_minutes = parseInt(e.target.value) || 30;
                                setFormData({ ...formData, intervals: newIntervals });
                              }}
                              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                              disabled={submitting}
                              placeholder="min"
                            />
                          </div>
                          <div className="flex items-center gap-4 mt-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={`active-${idx}`}
                                checked={interval.active}
                                onChange={(e) => {
                                  const newIntervals = [...formData.intervals];
                                  newIntervals[idx].active = e.target.checked;
                                  setFormData({ ...formData, intervals: newIntervals });
                                }}
                                className="rounded border-gray-300"
                                disabled={submitting}
                              />
                              <label htmlFor={`active-${idx}`} className="text-sm font-medium text-gray-700">Ativo</label>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={`blocked-${idx}`}
                                checked={interval.blocked}
                                onChange={(e) => {
                                  const newIntervals = [...formData.intervals];
                                  newIntervals[idx].blocked = e.target.checked;
                                  setFormData({ ...formData, intervals: newIntervals });
                                }}
                                className="rounded border-red-400"
                                disabled={submitting}
                              />
                              <label htmlFor={`blocked-${idx}`} className="text-sm font-medium text-red-600">Bloquear agenda</label>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col justify-between items-end min-w-[100px] mt-4 md:mt-0">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newIntervals = formData.intervals.filter((_, i) => i !== idx);
                              setFormData({ ...formData, intervals: newIntervals });
                            }}
                            // Sempre habilitado para permitir remover o último horário
                          >
                            Remover
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end mt-4">
                        <div className="flex gap-4">
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Início intervalo</label>
                            <input
                              type="time"
                              value={interval.break_start !== undefined && interval.break_start !== null ? interval.break_start : ""}
                              onChange={(e) => {
                                const newIntervals = [...formData.intervals];
                                newIntervals[idx].break_start = e.target.value || null;
                                setFormData({ ...formData, intervals: newIntervals });
                              }}
                              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                              disabled={submitting}
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Fim intervalo</label>
                            <input
                              type="time"
                              value={interval.break_end !== undefined && interval.break_end !== null ? interval.break_end : ""}
                              onChange={(e) => {
                                const newIntervals = [...formData.intervals];
                                newIntervals[idx].break_end = e.target.value || null;
                                setFormData({ ...formData, intervals: newIntervals });
                              }}
                              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                              disabled={submitting}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Observação (aparece na agenda)</label>
                          <textarea
                            value={interval.note}
                            onChange={(e) => {
                              const newIntervals = [...formData.intervals];
                              newIntervals[idx].note = e.target.value;
                              setFormData({ ...formData, intervals: newIntervals });
                            }}
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            rows={2}
                            maxLength={120}
                            disabled={submitting}
                            placeholder="Ex: Ausente, reunião, férias, etc."
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      intervals: [
                        ...formData.intervals,
                        {
                          day_of_week: 1,
                          start_time: "08:00",
                          end_time: "18:00",
                          break_start: null,
                          break_end: null,
                          active: true,
                          note: "",
                          blocked: false,
                          duration_minutes: 30,
                        },
                      ],
                    });
                  }}
                  disabled={submitting}
                >
                  + Adicionar outro horário
                </Button>
                  </div>
                </form>
              </CardContent>
              <div style={{flexShrink: 0}} className="border-t bg-white px-6 py-4 flex gap-3 justify-end">
                <Button
                  type="button"
                  onClick={handleCloseWithCheck}
                  variant="outline"
                  disabled={submitting}
                >
                  Cancelar
                </Button>
                <Button
                  form="schedule-form"
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={submitting}
                >
                  {submitting ? "Salvando..." : editingId ? "Atualizar" : "Criar"}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* 🆕 MODAL DE REGRAS */}
      {showRuleForm && (
        <div className="app-modal-overlay">
          <Card className="app-modal-shell app-modal-shell--compact shadow-2xl">
            <button
              type="button"
              onClick={() => setShowRuleForm(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 p-2 rounded-full transition-colors"
              title="Fechar"
            >
              <X size={20} />
            </button>
            <CardHeader className="border-b">
              <CardTitle>
                {editingRuleId ? "✏️ Editar Regra" : "➕ Nova Regra de Agendamento"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmitRule} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome da Regra <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={ruleFormData.rule_name}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, rule_name: e.target.value })}
                    placeholder="Ex: Intervalo entre consultas"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Regra <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={ruleFormData.rule_type}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, rule_type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    disabled={submitting}
                  >
                    {ruleTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                  <textarea
                    value={ruleFormData.description}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, description: e.target.value })}
                    placeholder="Detalhes sobre a regra..."
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                    rows={3}
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor</label>
                  <input
                    type="text"
                    value={ruleFormData.value}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, value: e.target.value })}
                    placeholder="Ex: 30 minutos, 10 agendamentos"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    disabled={submitting}
                  />
                </div>

                <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                  <input
                    type="checkbox"
                    id="rule-active"
                    checked={ruleFormData.active}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, active: e.target.checked })}
                    disabled={submitting}
                  />
                  <label htmlFor="rule-active" className="text-sm font-medium text-gray-700">
                    Regra Ativa
                  </label>
                </div>

                {error && (
                  <Alert type="error" title="Erro" message={error} onClose={() => setError(null)} />
                )}

                <div className="flex gap-2 justify-end pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowRuleForm(false)}
                    disabled={submitting}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="bg-green-600 hover:bg-green-700"
                    disabled={submitting}
                  >
                    {submitting ? "Salvando..." : "Salvar Regra"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

