// src/pages/clinica/base-sistema/ProfessionalPayerPage.jsx
// ============================================================
// CRUD de Profissional-Convênio - Base do Sistema
// Relacionamento M:M de profissionais com convênios/pagadores
// ============================================================

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { useClinicContext } from "@/contexts/ClinicContext";
import BaseSystemHeader from "@/components/layout/BaseSystemHeader";
import { Alert } from "@/components/layout/BaseSystemAlert";
import EmptyState from "@/components/layout/EmptyState";
import * as professionalsApi from "@/lib/professionalsApi";
import * as healthInsurancesApi from "@/lib/healthInsurancesApi";
import * as professionalPayerApi from "@/lib/professionalPayerApi";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit2, Trash2, X } from "lucide-react";

export function ProfessionalPayerPage() {
  const { user, isAuthenticated } = useAuth();
  const { clinicId } = useClinicContext();

  const [assignments, setAssignments] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [payers, setPayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    professional_id: "",
    payer_id: "",
    commission_percentage: "",
    registration_number: "",
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

      const [assignmentsData, professionalsData, payersData] = await Promise.all([
        professionalPayerApi.getProfessionalPayers(clinicId),
        professionalsApi.listProfessionals(clinicId),
        healthInsurancesApi.listHealthInsurances(clinicId),
      ]);

      setAssignments(Array.isArray(assignmentsData) ? assignmentsData : []);
      setProfessionals(Array.isArray(professionalsData) ? professionalsData : []);
      setPayers(Array.isArray(payersData) ? payersData : []);
    } catch (err) {
      setError(err.message || "Erro ao carregar dados");
      console.error("Erro:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleNew = () => {
    setEditingId(null);
    setFormData({
      professional_id: "",
      payer_id: "",
      commission_percentage: "",
      registration_number: "",
      active: true,
    });
    setShowForm(true);
    setError(null);
  };

  const handleEdit = (assignment) => {
    setEditingId(assignment.id);
    setFormData({
      professional_id: assignment.professional_id || "",
      payer_id: assignment.payer_id || "",
      commission_percentage: assignment.commission_percentage?.toString() || "",
      registration_number: assignment.registration_number || "",
      active: assignment.active !== false,
    });
    setShowForm(true);
    setError(null);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      professional_id: "",
      payer_id: "",
      commission_percentage: "",
      registration_number: "",
      active: true,
    });
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
    if (!formData.professional_id.trim()) {
      setError("Profissional é obrigatório");
      return false;
    }
    if (!formData.payer_id.trim()) {
      setError("Convênio/Pagador é obrigatório");
      return false;
    }

    if (formData.commission_percentage) {
      const commission = parseFloat(formData.commission_percentage);
      if (isNaN(commission) || commission < 0 || commission > 100) {
        setError("Comissão deve estar entre 0 e 100%");
        return false;
      }
    }

    const isDuplicate = assignments.some(
      (a) =>
        a.id !== editingId &&
        a.professional_id === formData.professional_id &&
        a.payer_id === formData.payer_id
    );

    if (isDuplicate) {
      setError("Esse profissional já está cadastrado com esse convênio");
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
        professional_id: formData.professional_id,
        payer_id: formData.payer_id,
        commission_percentage: formData.commission_percentage
          ? parseFloat(formData.commission_percentage)
          : null,
        registration_number: formData.registration_number.trim(),
        active: formData.active,
      };

      if (editingId) {
        await professionalPayerApi.updateProfessionalPayer(editingId, dataToSave);
        setAssignments(
          assignments.map((a) =>
            a.id === editingId ? { ...a, ...dataToSave } : a
          )
        );
      } else {
        const newAssignment = await professionalPayerApi.createProfessionalPayer(
          clinicId,
          dataToSave
        );
        setAssignments([...assignments, newAssignment]);
      }

      closeForm();
    } catch (err) {
      setError(err.message || "Erro ao salvar atribuição");
      console.error("Erro:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    const assignment = assignments.find((a) => a.id === id);
    if (!assignment) return;

    const prof = professionals.find((p) => p.id === assignment.professional_id);
    const payer = payers.find((py) => py.id === assignment.payer_id);

    if (
      !window.confirm(
        `Deseja remover "${prof?.name}" de "${payer?.name}"?`
      )
    ) {
      return;
    }

    try {
      setError(null);
      await professionalPayerApi.deleteProfessionalPayer(id);
      setAssignments(assignments.filter((a) => a.id !== id));
    } catch (err) {
      setError(err.message || "Erro ao deletar atribuição");
      console.error("Erro:", err);
    }
  };

  const getProfessionalName = (id) => {
    return professionals.find((p) => p.id === id)?.name || "Desconhecido";
  };

  const getPayerName = (id) => {
    return payers.find((py) => py.id === id)?.name || "Desconhecido";
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
        title="Profissionais × Convênios"
        subtitle="Gerencie a relação entre profissionais e convênios/pagadores"
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

      {professionals.length === 0 || payers.length === 0 ? (
        <EmptyState
          icon={<Plus className="w-12 h-12 mx-auto text-gray-400" />}
          title="Dados insuficientes"
          description="Você precisa cadastrar profissionais e convênios antes"
        />
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle>Atribuições ({assignments.length})</CardTitle>
            <Button
              onClick={handleNew}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              disabled={professionals.length === 0 || payers.length === 0}
            >
              <Plus className="w-4 h-4" />
              Adicionar
            </Button>
          </CardHeader>
          <CardContent>
            {assignments.length === 0 ? (
              <EmptyState
                icon={<Plus className="w-12 h-12 mx-auto text-gray-400" />}
                title="Nenhuma atribuição"
                description="Comece adicionando um profissional para um convênio"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Profissional
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Convênio
                      </th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">
                        Comissão
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Registro
                      </th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((assignment) => (
                      <tr
                        key={assignment.id}
                        className="border-b hover:bg-gray-50 transition"
                      >
                        <td className="py-3 px-4 font-medium text-gray-900">
                          {getProfessionalName(assignment.professional_id)}
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {getPayerName(assignment.payer_id)}
                        </td>
                        <td className="py-3 px-4 text-center text-gray-900">
                          {assignment.commission_percentage
                            ? `${assignment.commission_percentage}%`
                            : "-"}
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {assignment.registration_number || "-"}
                        </td>
                        <td className="py-3 px-4 flex justify-center gap-2">
                          <button
                            onClick={() => handleEdit(assignment)}
                            className="p-2 hover:bg-blue-100 rounded-lg text-blue-600 transition"
                            disabled={submitting}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(assignment.id)}
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
                  {editingId ? "Editar Atribuição" : "Nova Atribuição"}
                </CardTitle>
              </CardHeader>
              <CardContent className="app-modal-body p-6 modal-content-scroll">
                <form id="payer-form" onSubmit={handleSubmit} className="space-y-4" style={{flex: 1, overflow: "visible"}}>
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Convênio/Pagador <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.payer_id}
                    onChange={(e) =>
                      setFormData({ ...formData, payer_id: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    disabled={submitting}
                  >
                    <option value="">Selecione um convênio</option>
                    {payers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Comissão (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.commission_percentage}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        commission_percentage: e.target.value,
                      })
                    }
                    placeholder="0.00"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Registro
                  </label>
                  <input
                    type="text"
                    value={formData.registration_number}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        registration_number: e.target.value,
                      })
                    }
                    placeholder="Ex: 12345/ABC"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={submitting}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="active"
                    checked={formData.active}
                    onChange={(e) =>
                      setFormData({ ...formData, active: e.target.checked })
                    }
                    className="rounded border-gray-300"
                    disabled={submitting}
                  />
                  <label htmlFor="active" className="text-sm font-medium text-gray-700">
                    Ativo
                  </label>
                </div>

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
                  form="payer-form"
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={submitting}
                >
                  {submitting ? "Salvando..." : editingId ? "Atualizar" : "Adicionar"}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

