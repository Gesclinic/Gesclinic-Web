// src/pages/clinica/base-sistema/RoomServicesPage.jsx
// ============================================================
// CRUD de Serviços por Sala - Base do Sistema
// Mapeamento M:M de salas com serviços
// ============================================================

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { useClinicContext } from "@/contexts/ClinicContext";
import BaseSystemHeader from "@/components/layout/BaseSystemHeader";
import { Alert } from "@/components/layout/BaseSystemAlert";
import EmptyState from "@/components/layout/EmptyState";
import * as roomsApi from "@/lib/roomsApi";
import * as servicesApi from "@/lib/servicesApi";
import * as roomServicesApi from "@/lib/roomServicesApi";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit2, Trash2, X, Briefcase } from "lucide-react";

export function RoomResourcesPage() {
  const { user, isAuthenticated } = useAuth();
  const { clinicId } = useClinicContext();

  const [assignments, setAssignments] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    room_id: "",
    service_id: "",
    active: true,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (clinicId && isAuthenticated) {
      loadData();
    }
  }, [clinicId, isAuthenticated]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [roomsData, servicesData, assignmentsData] = await Promise.all([
        roomsApi.listRooms(clinicId),
        servicesApi.listServices(clinicId),
        roomServicesApi.listRoomServices(clinicId),
      ]);

      setRooms(Array.isArray(roomsData) ? roomsData : []);
      setServices(Array.isArray(servicesData) ? servicesData : []);
      setAssignments(Array.isArray(assignmentsData) ? assignmentsData : []);
    } catch (err) {
      setError(err.message || "Erro ao carregar dados");
      console.error("Erro:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleNew = () => {
    setEditingId(null);
    setFormData({ room_id: "", service_id: "", active: true });
    setShowForm(true);
    setError(null);
  };

  const handleEdit = (assignment) => {
    setEditingId(assignment.id);
    setFormData({
      room_id: assignment.room_id || "",
      service_id: assignment.service_id || "",
      active: assignment.active !== false,
    });
    setShowForm(true);
    setError(null);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ room_id: "", service_id: "", active: true });
    setSubmitting(false);
  };

  const handleCloseWithCheck = () => {
    const hasData = Object.entries(formData).some(([key, value]) => {
      if (typeof value === "string") return value.trim() !== "";
      if (typeof value === "boolean") return value !== true;
      return false;
    });

    if (hasData) {
      if (window.confirm("Tem certeza que deseja sair? As alterações não salvas serão perdidas.")) {
        closeForm();
      }
    } else {
      closeForm();
    }
  };

  const validateForm = () => {
    if (!formData.room_id.trim()) {
      setError("Sala é obrigatória");
      return false;
    }
    if (!formData.service_id.trim()) {
      setError("Serviço é obrigatório");
      return false;
    }

    const isDuplicate = assignments.some(
      (a) =>
        a.id !== editingId &&
        a.room_id === formData.room_id &&
        a.service_id === formData.service_id
    );
    if (isDuplicate) {
      setError("Esse serviço já está atribuído a essa sala");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const dataToSave = {
        room_id: formData.room_id,
        service_id: formData.service_id,
        active: formData.active,
      };

      if (editingId) {
        // Atualizar atribuição no banco
        await roomServicesApi.updateRoomService(editingId, clinicId, dataToSave);
        setAssignments(
          assignments.map((a) =>
            a.id === editingId ? { ...a, ...dataToSave } : a
          )
        );
      } else {
        // Criar nova atribuição no banco
        const newAssignment = await roomServicesApi.createRoomService(clinicId, dataToSave);
        setAssignments([...assignments, newAssignment]);
      }

      closeForm();
    } catch (err) {
      setError(err.message || "Erro ao salvar");
      console.error("Erro:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, serviceName) => {
    if (!window.confirm(`Deseja remover "${serviceName}"?`)) {
      return;
    }

    try {
      setError(null);
      await roomServicesApi.deleteRoomService(id, clinicId);
      setAssignments(assignments.filter((a) => a.id !== id));
    } catch (err) {
      setError(err.message || "Erro ao deletar");
      console.error("Erro:", err);
    }
  };

  const getServiceName = (id) => {
    return services.find((s) => s.id === id)?.name || "Desconhecido";
  };

  const getRoomName = (id) => {
    return rooms.find((r) => r.id === id)?.name || "Desconhecido";
  };

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
        category="4.2 Regras Operacionais"
        title="Salas × Serviços"
        subtitle="Gerencie quais serviços estão disponíveis em cada sala"
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

      {rooms.length === 0 || services.length === 0 ? (
        <EmptyState
          title="Sem dados"
          description="Você precisa cadastrar salas e serviços antes de criar atribuições"
        />
      ) : (
        <>
          <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle>Atribuições ({assignments.length})</CardTitle>
              <Button
                onClick={handleNew}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Adicionar
              </Button>
            </CardHeader>
            <CardContent>
              {assignments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Nenhuma atribuição criada</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium text-gray-700">
                          Sala
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">
                          Serviço
                        </th>
                        <th className="text-center py-3 px-4 font-medium text-gray-700">
                          Status
                        </th>
                        <th className="text-center py-3 px-4 font-medium text-gray-700">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignments.map((assignment) => (
                        <tr key={assignment.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 text-gray-600">
                            {getRoomName(assignment.room_id)}
                          </td>
                          <td className="py-3 px-4 text-gray-600">
                            {getServiceName(assignment.service_id)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                assignment.active
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {assignment.active ? "Ativo" : "Inativo"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center flex justify-center gap-2">
                            <button
                              onClick={() => handleEdit(assignment)}
                              className="p-2 hover:bg-blue-100 rounded-lg text-blue-600 transition"
                              disabled={submitting}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                handleDelete(
                                  assignment.id,
                                  getServiceName(assignment.service_id)
                                )
                              }
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
              )}
            </CardContent>
          </Card>
        </>
      )}

      {showForm && (
        <>
          <div className="app-modal-overlay">
            <div className="app-modal-shell app-modal-shell--compact">
            <Card className="app-modal-card app-modal-card--auto shadow-2xl border-0">
              {/* Header */}
              <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between rounded-t-lg shadow-md">
                <div className="flex items-center gap-3">
                  <Briefcase size={24} className="text-white" />
                  <h2 className="text-xl font-bold text-white">
                    {editingId ? "✏️ Editar Serviço" : "➕ Novo Serviço"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => handleCloseWithCheck()}
                  className="text-white hover:bg-blue-600 p-2 rounded-full transition-colors"
                  title="Fechar"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <CardContent className="app-modal-body p-6 modal-content-scroll">
                <form id="room-services-form" onSubmit={handleSubmit} className="space-y-5" style={{flex: 1, overflow: "visible"}}>
                  <div style={{flex: 1, overflowY: "auto", paddingRight: "8px"}}>

                    {/* SEÇÃO: Configuração do Serviço */}
                    <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
                      <div className="border-b pb-3">
                        <h3 className="text-lg font-bold text-gray-900">📋 Configuração do Serviço</h3>
                        <p className="text-sm text-gray-600 mt-1">Selecione a sala e o serviço a oferecer</p>
                      </div>

                      {/* Sala */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">
                          Sala <span className="text-red-600 font-bold">*</span>
                        </label>
                        <select
                          value={formData.room_id}
                          onChange={(e) =>
                            setFormData({ ...formData, room_id: e.target.value })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                          required
                          disabled={submitting}
                          autoFocus
                        >
                          <option value="">Selecione uma sala</option>
                          {rooms.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-2">Escolha a sala onde o serviço será oferecido</p>
                      </div>

                      {/* Serviço */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">
                          Serviço <span className="text-red-600 font-bold">*</span>
                        </label>
                        <select
                          value={formData.service_id}
                          onChange={(e) =>
                            setFormData({ ...formData, service_id: e.target.value })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                          required
                          disabled={submitting}
                        >
                          <option value="">Selecione um serviço</option>
                          {services.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-2">Qual serviço será oferecido nesta sala</p>
                      </div>
                    </div>

                    {/* SEÇÃO: Status */}
                    <div className="bg-white border border-gray-200 rounded-lg p-5">
                      <div className="border-b pb-3 mb-4">
                        <h3 className="text-lg font-bold text-gray-900">⚙️ Status</h3>
                        <p className="text-sm text-gray-600 mt-1">Controle de disponibilidade</p>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.active}
                            onChange={(e) =>
                              setFormData({ ...formData, active: e.target.checked })
                            }
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                            disabled={submitting}
                          />
                          <span className="text-sm font-semibold text-gray-800">Serviço disponível nesta sala</span>
                        </label>
                        <p className="text-xs text-gray-500 mt-2 ml-7">Desmarque para desativar temporariamente</p>
                      </div>
                    </div>

                  </div>
                </form>
              </CardContent>

              {/* Footer */}
              <div className="border-t bg-gray-50 px-6 py-4 flex gap-3 justify-end rounded-b-lg">
                <Button
                  type="button"
                  onClick={handleCloseWithCheck}
                  variant="outline"
                  disabled={submitting}
                  className="px-6"
                >
                  Cancelar
                </Button>
                <Button
                  form="room-services-form"
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 px-6"
                  disabled={submitting}
                >
                  {submitting ? "Salvando..." : editingId ? "Atualizar" : "Criar/Adicionar"}
                </Button>
              </div>
            </Card>
          </div>
        </div>
        </>
      )}
    </div>
  );
}
