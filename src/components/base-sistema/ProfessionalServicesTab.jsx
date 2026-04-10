// src/components/base-sistema/ProfessionalServicesTab.jsx
// ============================================================
// ABA: Serviços do Profissional (para modal de edição)
// ============================================================

import React, { useState, useEffect } from "react";
import * as professionalServicesApi from "@/lib/professionalServicesApi";
import * as servicesApi from "@/lib/servicesApi";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Trash2, Edit2, X, Clock, Award } from "lucide-react";
import { normalizeCodeCBHPM } from "@/utils/formatters";

export function ProfessionalServicesTab({ 
  profesionalId, 
  clinicId, 
  submitting 
}) {
  const [assignments, setAssignments] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [editForm, setEditForm] = useState({ active: true });

  // Carrega serviços disponíveis e atribuições do profissional
  useEffect(() => {
    loadData();
  }, [profesionalId, clinicId]);

  const loadData = async () => {
    if (!profesionalId || !clinicId) return;
    
    try {
      setLoading(true);
      setError(null);

      // Carregar todos os serviços da clínica
      const allServices = await servicesApi.listServices(clinicId);
      setServices(allServices || []);

      // Carregar serviços do profissional
      const profServices = await professionalServicesApi.getProfessionalServices(profesionalId);
      setAssignments(profServices || []);
    } catch (err) {
      console.error("Erro ao carregar serviços:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddService = async () => {
    if (!selectedServiceId) {
      setError("Selecione um serviço");
      return;
    }

    // Verificar se já existe
    if (assignments.some(a => a.service_id === selectedServiceId)) {
      setError("Este serviço já está atribuído ao profissional");
      return;
    }

    try {
      setError(null);
      await professionalServicesApi.createProfessionalService(clinicId, {
        professional_id: profesionalId,
        service_id: selectedServiceId,
        active: true,
      });

      // Recarregar dados
      await loadData();
      setSelectedServiceId("");
    } catch (err) {
      setError(err.message || "Erro ao adicionar serviço");
    }
  };

  const handleDeleteService = async (assignmentId) => {
    const assignment = assignments.find(a => a.id === assignmentId);
    const service = services.find(s => s.id === assignment.service_id);

    if (!window.confirm(`Remover "${service?.name}" deste profissional?`)) {
      return;
    }

    try {
      setError(null);
      await professionalServicesApi.deleteProfessionalService(assignmentId);
      setAssignments(assignments.filter(a => a.id !== assignmentId));
    } catch (err) {
      setError(err.message || "Erro ao remover serviço");
    }
  };

  const handleEditService = (assignment) => {
    setEditingAssignment(assignment);
    setEditForm({ 
      active: assignment.active,
      duration_minutes_override: assignment.duration_minutes_override || "",
      competence_level: assignment.competence_level || "standard"
    });
  };

  const handleCancelEdit = () => {
    setEditingAssignment(null);
    setEditForm({ active: true });
  };

  const handleSaveEdit = async () => {
    if (!editingAssignment) return;

    try {
      setError(null);
      
      // Chamar API para atualizar usando o ID do assignment
      await professionalServicesApi.updateProfessionalServiceById(
        editingAssignment.id,
        {
          professional_id: editingAssignment.professional_id,
          service_id: editingAssignment.service_id,
          active: editForm.active,
          duration_minutes_override: editForm.duration_minutes_override ? parseInt(editForm.duration_minutes_override) : null,
          competence_level: editForm.competence_level
        }
      );

      // Atualizar lista local
      setAssignments(assignments.map(a => 
        a.id === editingAssignment.id 
          ? { 
              ...a, 
              active: editForm.active,
              duration_minutes_override: editForm.duration_minutes_override ? parseInt(editForm.duration_minutes_override) : null,
              competence_level: editForm.competence_level
            }
          : a
      ));

      handleCancelEdit();
    } catch (err) {
      setError(err.message || "Erro ao atualizar serviço");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-gray-500">Carregando serviços...</p>
      </div>
    );
  }

  return (
    <div style={{flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column"}}>
      <div className="space-y-5" style={{flex: 1, overflowY: "auto"}}>
        {error && (
          <div className="p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Adicionar novo serviço */}
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="border-b pb-3 mb-4">
            <h3 className="text-lg font-bold text-gray-900">➕ Adicionar Serviço</h3>
            <p className="text-sm text-gray-600 mt-1">Escolha um serviço para atribuir ao profissional</p>
          </div>
        <div className="flex gap-2">
          <select
            value={selectedServiceId}
            onChange={(e) => setSelectedServiceId(e.target.value)}
            className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={submitting}
          >
            <option value="">Selecione um serviço...</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
          <Button
            type="button"
            onClick={handleAddService}
            className="bg-blue-600 hover:bg-blue-700"
            disabled={submitting || !selectedServiceId}
          >
            ➕ Adicionar
          </Button>
        </div>
      </div>

        {/* Tabela de serviços atribuídos */}
        <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="border-b pb-3 mb-4">
          <h3 className="text-lg font-bold text-gray-900">🔧 Serviços Atribuídos</h3>
          <p className="text-sm text-gray-600 mt-1">Gerenciar serviços do profissional</p>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="text-left p-2 font-semibold text-gray-900">Código CBHPM</th>
              <th className="text-left p-2 font-semibold text-gray-900">Serviço</th>
              <th className="text-center p-2 font-semibold text-gray-900">Categoria</th>
              <th className="text-center p-2 font-semibold text-gray-900">Faturável</th>
              <th className="text-left p-2 font-semibold text-gray-900">Duração</th>
              <th className="text-center p-2 font-semibold text-gray-900">Status</th>
              <th className="text-center p-2 font-semibold text-gray-900">Ações</th>
            </tr>
          </thead>
          <tbody>
            {assignments && assignments.length > 0 ? (
              assignments.map((assignment) => {
                const service = services.find(s => s.id === assignment.service_id);
                return (
                  <tr key={assignment.id} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-mono font-bold text-sm text-gray-900 tracking-widest bg-blue-50 rounded-l">
                      {normalizeCodeCBHPM(service?.tuss_code)}
                    </td>
                    <td className="p-2">{service?.name || "Serviço não encontrado"}</td>
                    <td className="p-2 text-center">
                      {service?.service_category ? (
                        <span className="inline-block px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-semibold">
                          {service.service_category === 'consultation' ? 'Consulta' :
                           service.service_category === 'exam' ? 'Exame/SADT' :
                           service.service_category === 'procedure' ? 'Procedimento' :
                           'Outro'}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="p-2 text-center">
                      {service?.is_billable ? (
                        <span className="text-green-700 font-semibold">✓</span>
                      ) : (
                        <span className="text-gray-400">✗</span>
                      )}
                    </td>
                    <td className="p-2 text-gray-600">
                      {service?.default_duration_minutes || "30"} min
                    </td>
                    <td className="p-2">
                      {assignment.active ? (
                        <span className="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded">
                          Inativo
                        </span>
                      )}
                    </td>
                    <td className="p-2 text-center">
                      <div className="flex gap-2 justify-center">
                        <button
                          type="button"
                          onClick={() => handleEditService(assignment)}
                          className="text-blue-600 hover:text-blue-700 p-1 transition"
                          disabled={submitting}
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteService(assignment.id)}
                          className="text-red-600 hover:text-red-700 p-1 transition"
                          disabled={submitting}
                          title="Remover"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="5" className="p-4 text-center text-gray-500">
                  Nenhum serviço atribuído
                </td>
              </tr>
            )}
          </tbody>
            </table>
          </div>
        </div>

        {/* Modal de edição */}
      {editingAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 via-blue-650 to-blue-700 px-6 py-5 flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3">
                <span className="text-2xl leading-none">✏️</span>
                <h3 className="text-xl font-bold text-white uppercase tracking-wider">Editar Serviço do Profissional</h3>
              </div>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition duration-200 flex items-center justify-center"
              >
                <X size={22} />
              </button>
            </div>

            {(() => {
              const service = services.find(s => s.id === editingAssignment.service_id);
              console.log('🔍 Service data in modal:', service);
              return (
              <div className="p-6 space-y-6">
                {/* ===== SEÇÃO 1: IDENTIFICAÇÃO DO SERVIÇO ===== */}
                <div className="bg-gradient-to-br from-blue-50 via-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-1.5 h-7 bg-gradient-to-b from-blue-600 to-blue-700 rounded-full"></div>
                    <h4 className="text-sm font-bold text-blue-950 uppercase tracking-widest">📋 Informações do Serviço</h4>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Nome do Serviço - Destaque Principal */}
                    <div className="bg-white rounded-lg border-2 border-blue-200 p-4 shadow-sm hover:shadow-md transition">
                      <p className="text-2xl font-bold text-blue-950 mb-2">
                        {service?.name || "Serviço não encontrado"}
                      </p>
                      {service?.description && (
                        <p className="text-sm text-blue-700 italic bg-blue-50 px-3 py-2 rounded border border-blue-200">
                          {service.description}
                        </p>
                      )}
                    </div>

                    {/* Grid de Informações */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white rounded-lg border-2 border-blue-200 p-4 shadow-sm">
                        <label className="text-xs font-bold text-blue-700 uppercase block mb-2 flex items-center gap-1.5">
                          <span>🔢</span> Código
                        </label>
                        <p className="text-sm font-mono font-bold text-gray-900">{normalizeCodeCBHPM(service?.tuss_code) || "—"}</p>
                      </div>
                      <div className="bg-white rounded-lg border-2 border-blue-200 p-4 shadow-sm">
                        <label className="text-xs font-bold text-blue-700 uppercase block mb-2 flex items-center gap-1.5">
                          <span>🏷️</span> Categoria
                        </label>
                        <p className="text-sm font-semibold">
                          <span className="inline-block px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">
                            {service?.service_category ? (
                              service.service_category === 'consultation' ? '📋 Consulta' :
                              service.service_category === 'exam' ? '🔬 Exame' :
                              service.service_category === 'procedure' ? '🏥 Procedimento' :
                              '📝 Outro'
                            ) : '—'}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ===== SEÇÃO 2: CARACTERÍSTICAS E CONFIGURAÇÕES ===== */}
                <div className="bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-1.5 h-7 bg-gradient-to-b from-emerald-600 to-emerald-700 rounded-full"></div>
                    <h4 className="text-sm font-bold text-emerald-950 uppercase tracking-widest">⚙️ Configurações</h4>
                  </div>

                  <div className="space-y-3">
                    {/* Grid Principal */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-white rounded-lg border-2 border-emerald-200 p-4 shadow-sm">
                        <label className="text-xs font-bold text-emerald-700 uppercase block mb-2 flex items-center gap-1.5">
                          <span>⏱️</span> Duração
                        </label>
                        <p className="text-2xl font-bold text-gray-900">{service?.default_duration_minutes || "30"}<span className="text-xs ml-1 text-gray-600">min</span></p>
                      </div>
                      <div className="bg-white rounded-lg border-2 border-emerald-200 p-4 shadow-sm flex flex-col justify-center">
                        <label className="text-xs font-bold text-emerald-700 uppercase block mb-2 flex items-center gap-1.5">
                          <span>💵</span> Cobrança
                        </label>
                        <span className="inline-flex items-center px-2.5 py-1.5 bg-orange-100 text-orange-700 rounded-full text-xs font-bold whitespace-nowrap">
                          {service?.type_billing ? (
                            service.type_billing === 'per_consultation' ? '💵 Consulta' :
                            service.type_billing === 'per_hour' ? '⏱️ Hora' :
                            service.type_billing === 'per_session' ? '📊 Sessão' :
                            '📦 Pacote'
                          ) : '—'}
                        </span>
                      </div>
                      <div className="bg-white rounded-lg border-2 border-emerald-200 p-4 shadow-sm flex flex-col justify-center">
                        <label className="text-xs font-bold text-emerald-700 uppercase block mb-2 flex items-center gap-1.5">
                          <span>✓</span> Faturável
                        </label>
                        <span className={`inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${
                          service?.is_billable === true || service?.is_billable === 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {service?.is_billable === true || service?.is_billable === 1 ? '✓ Sim' : '✗ Não'}
                        </span>
                      </div>
                    </div>

                    {/* Permissões */}
                    <div>
                      <label className="text-xs font-bold text-emerald-700 uppercase block mb-2 flex items-center gap-1.5">
                        <span>🔐</span> Permissões
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <div className={`flex items-center gap-2.5 rounded-lg border-2 p-3 transition shadow-sm ${
                          service?.allow_scheduling_fit 
                            ? 'bg-green-50 border-green-300' 
                            : 'bg-gray-50 border-gray-300'
                        }`}>
                          <span className={`w-4 h-4 rounded-full font-bold text-sm flex items-center justify-center ${
                            service?.allow_scheduling_fit 
                              ? 'bg-green-500 text-white' 
                              : 'bg-gray-400 text-white'
                          }`}>✓</span>
                          <span className="text-xs font-bold text-gray-800">Encaixe</span>
                        </div>
                        <div className={`flex items-center gap-2.5 rounded-lg border-2 p-3 transition shadow-sm ${
                          service?.requires_authorization 
                            ? 'bg-amber-50 border-amber-300' 
                            : 'bg-green-50 border-green-300'
                        }`}>
                          <span className={`w-4 h-4 rounded-full font-bold text-sm flex items-center justify-center ${
                            service?.requires_authorization 
                              ? 'bg-amber-500 text-white' 
                              : 'bg-green-500 text-white'
                          }`}>{service?.requires_authorization ? '⚠' : '✓'}</span>
                          <span className="text-xs font-bold text-gray-800">Autorização</span>
                        </div>
                        <div className={`flex items-center gap-2.5 rounded-lg border-2 p-3 transition ${
                          service?.active 
                            ? 'bg-green-50 border-green-300' 
                            : 'bg-red-50 border-red-300'
                        }`}>
                          <span className={`w-4 h-4 rounded-full font-bold text-sm flex items-center justify-center ${
                            service?.active 
                              ? 'bg-green-500 text-white' 
                              : 'bg-red-500 text-white'
                          }`}>✓</span>
                          <span className="text-xs font-bold text-gray-800">Ativo</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ===== SEÇÃO 3: DADOS TISS ===== */}
                <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-1.5 h-7 bg-gradient-to-b from-amber-600 to-amber-700 rounded-full"></div>
                    <h4 className="text-sm font-bold text-amber-950 uppercase tracking-widest">📋 Dados TISS</h4>
                  </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-white rounded-lg border-2 border-amber-200 p-4 shadow-sm">
                        <label className="text-xs font-bold text-amber-700 uppercase block mb-2 flex items-center gap-1.5">
                          <span>🔢</span> Código TUSS
                        </label>
                        <p className="text-sm font-mono font-bold text-gray-900">{service?.tuss_code || '—'}</p>
                      </div>
                      <div className="bg-white rounded-lg border-2 border-amber-200 p-4 shadow-sm">
                        <label className="text-xs font-bold text-amber-700 uppercase block mb-2 flex items-center gap-1.5">
                          <span>⚖️</span> Unidade
                        </label>
                        <p className="text-sm font-semibold text-gray-900">{service?.unit_measure || '—'}</p>
                      </div>
                      <div className="bg-white rounded-lg border-2 border-amber-200 p-4 shadow-sm">
                        <label className="text-xs font-bold text-amber-700 uppercase block mb-2 flex items-center gap-1.5">
                          <span>💰</span> Custo
                        </label>
                        <p className="text-sm font-bold text-gray-900">
                          {service?.cost_value ? service.cost_value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}
                        </p>
                      </div>
                    </div>
                  </div>

                {/* ===== SEÇÃO 4: CUSTOMIZAÇÃO DO PROFISSIONAL ===== */}
                <div className="bg-gradient-to-br from-violet-50 to-purple-50 border-2 border-violet-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-1.5 h-7 bg-gradient-to-b from-violet-600 to-violet-700 rounded-full"></div>
                    <h4 className="text-sm font-bold text-violet-950 uppercase tracking-widest">⚙️ Customização do Profissional</h4>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-semibold text-violet-900 flex items-center gap-2 mb-2">
                        <Clock size={16} className="text-violet-600" />
                        Duração do Atendimento (minutos)
                      </label>
                      <input
                        type="number"
                        value={editForm.duration_minutes_override || ""}
                        onChange={(e) => setEditForm({ ...editForm, duration_minutes_override: e.target.value })}
                        placeholder="Deixe em branco para usar a duração padrão"
                        className="w-full px-4 py-2.5 border-2 border-violet-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 font-semibold bg-white"
                      />
                      <p className="text-xs text-violet-600 mt-1.5 italic">Deixe vazio para usar a duração padrão ({service?.default_duration_minutes || 30} min)</p>
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-violet-900 flex items-center gap-2 mb-2">
                        <Award size={16} className="text-violet-600" />
                        Nível de Competência
                      </label>
                      <select
                        value={editForm.competence_level}
                        onChange={(e) => setEditForm({ ...editForm, competence_level: e.target.value })}
                        className="w-full px-4 py-2.5 border-2 border-violet-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 font-semibold bg-white"
                      >
                        <option value="junior">🌱 Junior</option>
                        <option value="standard">📊 Padrão</option>
                        <option value="expert">⭐ Especialista</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-3 bg-white rounded-lg border-2 border-violet-200 p-4 cursor-pointer hover:bg-violet-50 transition">
                      <input
                        type="checkbox"
                        id="active-assignment"
                        checked={editForm.active}
                        onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })}
                        className="w-5 h-5 rounded border-2 border-violet-300 cursor-pointer accent-violet-600"
                      />
                      <label htmlFor="active-assignment" className="text-sm font-semibold text-violet-900 cursor-pointer flex-1">
                        ✓ Este serviço está ativo para este profissional
                      </label>
                    </div>
                  </div>
                </div>

                {/* ===== SEPARADOR ===== */}
                <div className="h-1 bg-gradient-to-r from-blue-200 via-purple-200 to-pink-200 rounded-full my-2"></div>

                {/* ===== BOTÕES DE AÇÃO ===== */}
                <div className="flex gap-3 pt-2 border-t-2 border-gray-200">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 transition-all text-sm uppercase tracking-wide"
                  >
                    ✕ Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={submitting}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg text-sm uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ✓ Salvar Alterações
                  </button>
                </div>
              </div>
              );
            })()}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
