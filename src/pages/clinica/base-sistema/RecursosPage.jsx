// src/pages/clinica/base-sistema/RecursosPage.jsx
// ============================================================
// CRUD Completo de Recursos - Base do Sistema
// ============================================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
import * as resourcesApi from '@/lib/resourcesApi';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Edit2, Trash2, Check, X, Package, Archive } from 'lucide-react';
import BaseSystemHeader from '@/components/layout/BaseSystemHeader';
import { Alert } from '@/components/layout/BaseSystemAlert';
import EmptyState from '@/components/layout/EmptyState';
export function RecursosPage() {
  const { user, isAuthenticated } = useAuth();
  const { clinicId } = useClinicContext();

  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    active: true,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (clinicId && isAuthenticated) {
      loadResources();
    }
  }, [clinicId, isAuthenticated]);

  const loadResources = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await resourcesApi.listResources(clinicId);
      setResources(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Erro ao carregar recursos');
      console.error('Erro:', err);
      setResources([]);
    } finally {
      setLoading(false);
    }
  };

  const handleNew = () => {
    setEditingId(null);
    setFormData({ name: '', description: '', category: '', active: true });
    setShowForm(true);
    setError(null);
  };

  const handleEdit = (resource) => {
    setEditingId(resource.id);
    setFormData({
      name: resource.name || '',
      description: resource.description || '',
      category: resource.category || '',
      active: resource.active !== false,
    });
    setShowForm(true);
    setError(null);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', description: '', category: '', active: true });
    setSubmitting(false);
  };

  const handleCloseWithCheck = () => {
    const hasData = Object.entries(formData).some(([key, value]) => {
      if (typeof value === 'string') {
        return value.trim() !== '';
      }
      if (typeof value === 'boolean') {
        return value !== true;
      }
      return false;
    });

    if (hasData) {
      if (window.confirm('Tem certeza que deseja sair? As alterações não salvas serão perdidas.')) {
        closeForm();
      }
    } else {
      closeForm();
    }
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Nome do recurso é obrigatório');
      return false;
    }
    if (formData.name.trim().length < 3) {
      setError('Nome deve ter pelo menos 3 caracteres');
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
        name: formData.name.trim(),
        category: formData.category.trim(),
        description: formData.description.trim(),
        active: formData.active,
      };

      if (editingId) {
        await resourcesApi.updateResource(editingId, clinicId, dataToSave);
        setResources(resources.map((r) => (r.id === editingId ? { ...r, ...dataToSave } : r)));
      } else {
        const newResource = await resourcesApi.createResource(clinicId, dataToSave);
        setResources([...resources, newResource]);
      }

      closeForm();
    } catch (err) {
      setError(err.message || 'Erro ao salvar recurso');
      console.error('Erro:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Tem certeza que deseja deletar "${name}"?`)) {
      return;
    }

    try {
      setError(null);
      await resourcesApi.deleteResource(id, clinicId);
      setResources(resources.filter((r) => r.id !== id));
    } catch (err) {
      setError(err.message || 'Erro ao deletar recurso');
      console.error('Erro:', err);
    }
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
    <div className="space-y-6 w-full mx-auto">
      {/* HEADER PADRONIZADO */}
      <BaseSystemHeader
        category="4.1 Cadastros Estruturais"
        title="Recursos"
        subtitle="Gerencie equipamentos, materiais e outros recursos disponíveis na clínica"
      />

      {/* ALERTA DE ERRO/SUCESSO */}
      {error && <Alert type="error" title="Aviso" message={error} onClose={() => setError(null)} />}

      {/* CARD PRINCIPAL */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle>Recursos Cadastrados ({resources.length})</CardTitle>
          <Button
            onClick={handleNew}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Novo Recurso
          </Button>
        </CardHeader>
        <CardContent>
          {resources.length === 0 ? (
            <EmptyState
              icon={<Package className="w-12 h-12 mx-auto" />}
              title="Nenhum recurso cadastrado"
              description="Comece criando seu primeiro recurso para gerenciar equipamentos e materiais disponíveis."
              action={
                <Button onClick={handleNew} className="bg-blue-600 hover:bg-blue-700">
                  Cadastrar Primeiro Recurso
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Nome</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Categoria</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Descrição</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Status</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {resources.map((resource) => (
                    <tr key={resource.id} className="border-b hover:bg-gray-50 transition">
                      <td className="py-3 px-4 font-medium text-gray-900">{resource.name}</td>
                      <td className="py-3 px-4 text-gray-600">{resource.category || '-'}</td>
                      <td className="py-3 px-4 text-gray-600 max-w-xs truncate">
                        {resource.description || '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {resource.active ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <Check className="w-3 h-3" />
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            <X className="w-3 h-3" />
                            Inativo
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 flex justify-center gap-2">
                        <button
                          onClick={() => handleEdit(resource)}
                          className="p-2 hover:bg-blue-100 rounded-lg text-blue-600 transition"
                          title="Editar"
                          disabled={submitting}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(resource.id, resource.name)}
                          className="p-2 hover:bg-red-100 rounded-lg text-red-600 transition"
                          title="Deletar"
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

      {/* MODAL DE FORMULÁRIO */}
      {showForm && (
        <div className="app-modal-overlay">
          <div className="app-modal-shell app-modal-shell--compact">
            <Card className="app-modal-card app-modal-card--auto shadow-2xl border-0">
              {/* Header */}
              <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between rounded-t-lg shadow-md">
                <div className="flex items-center gap-3">
                  <Archive size={24} className="text-white" />
                  <h2 className="text-xl font-bold text-white">
                    {editingId ? '✏️ Editar Recurso' : '➕ Novo Recurso'}
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
                <form
                  id="recursos-form"
                  onSubmit={handleSubmit}
                  className="space-y-5"
                  style={{ flex: 1, overflow: 'visible' }}
                >
                  <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
                    {/* SEÇÃO 1: IDENTIFICAÇÃO DO RECURSO */}
                    <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
                      <div className="border-b pb-3">
                        <h3 className="text-lg font-bold text-gray-900">
                          📦 Identificação do Recurso
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Informações básicas para identificar e organizar
                        </p>
                      </div>

                      {/* Nome */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">
                          Nome do Recurso <span className="text-red-600 font-bold">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Ex: Estetoscópio, Monitor Cardíaco, Cadeira"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                          disabled={submitting}
                          autoFocus
                        />
                        <p className="text-xs text-gray-500 mt-2">
                          Nome único e descritivo do recurso
                        </p>
                      </div>

                      {/* Categoria */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">
                          Categoria
                        </label>
                        <select
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                          disabled={submitting}
                        >
                          <option value="">Selecione uma categoria...</option>
                          <option value="Equipamento">🔧 Equipamento</option>
                          <option value="Material">📋 Material</option>
                          <option value="Infraestrutura">🏢 Infraestrutura</option>
                          <option value="Mobiliário">🪑 Mobiliário</option>
                          <option value="Informática">💻 Informática</option>
                          <option value="Outro">📝 Outro</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-2">Classifique o tipo de recurso</p>
                      </div>

                      {/* Descrição */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">
                          Descrição
                        </label>
                        <textarea
                          value={formData.description}
                          onChange={(e) =>
                            setFormData({ ...formData, description: e.target.value })
                          }
                          placeholder="Adicione detalhes: marca, modelo, número de série, localização, etc."
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                          rows={4}
                          disabled={submitting}
                        />
                        <p className="text-xs text-gray-500 mt-2">
                          Informações adicionais para melhor identificação
                        </p>
                      </div>
                    </div>

                    {/* SEÇÃO 2: STATUS */}
                    <div className="bg-white border border-gray-200 rounded-lg p-5">
                      <div className="border-b pb-3 mb-4">
                        <h3 className="text-lg font-bold text-gray-900">⚙️ Status</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Controle de disponibilidade do recurso
                        </p>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            id="active"
                            checked={formData.active}
                            onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                            className="w-5 h-5 rounded border border-gray-300 cursor-pointer accent-blue-600"
                            disabled={submitting}
                          />
                          <span className="text-sm font-semibold text-gray-800 flex-1">
                            Recurso Ativo
                          </span>
                          <span className="text-xs text-gray-500">Disponível para uso</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </form>
              </CardContent>

              {/* Footer */}
              <div
                style={{ flexShrink: 0 }}
                className="border-t bg-gradient-to-r from-gray-50 to-white px-6 py-4 flex gap-3 justify-end rounded-b-lg"
              >
                <Button
                  type="button"
                  onClick={handleCloseWithCheck}
                  variant="outline"
                  disabled={submitting}
                  className="border-2 border-gray-300 hover:bg-gray-100 font-bold"
                >
                  ✕ Cancelar
                </Button>
                <Button
                  form="recursos-form"
                  type="submit"
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold shadow-lg"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <span className="inline-block animate-spin mr-2">⌛</span>
                      Salvando...
                    </>
                  ) : editingId ? (
                    '✓ Atualizar'
                  ) : (
                    '✓ Criar'
                  )}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
