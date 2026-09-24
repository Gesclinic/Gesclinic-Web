// src/pages/clinica/base-sistema/AgendaRulesPage.jsx
// ============================================================
// CRUD de Regras de Agendamento - Base do Sistema
// Configurações de disponibilidade e restrições
// ============================================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
import BaseSystemHeader from '@/components/layout/BaseSystemHeader';
import { Alert } from '@/components/layout/BaseSystemAlert';
import EmptyState from '@/components/layout/EmptyState';
import * as agendaRulesApi from '@/lib/agendaRulesApi';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Edit2, Trash2, Check, X } from 'lucide-react';

export function AgendaRulesPage() {
  const { user, isAuthenticated } = useAuth();
  const { clinicId } = useClinicContext();

  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    rule_name: '',
    rule_type: 'default',
    description: '',
    value: '',
    active: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const ruleTypes = [
    { value: 'default', label: 'Padrão' },
    { value: 'min_interval', label: 'Intervalo Mínimo' },
    { value: 'max_per_day', label: 'Máximo por Dia' },
    { value: 'buffer_time', label: 'Tempo de Intervalo' },
    { value: 'blackout', label: 'Período Bloqueado' },
  ];

  useEffect(() => {
    if (clinicId && isAuthenticated) {
      loadRules();
    }
  }, [clinicId, isAuthenticated]);

  const loadRules = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await agendaRulesApi.getAgendaRules(clinicId);
      setRules(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Erro ao carregar regras');
      console.error('Erro:', err);
      setRules([]);
    } finally {
      setLoading(false);
    }
  };

  const handleNew = () => {
    setEditingId(null);
    setFormData({
      rule_name: '',
      rule_type: 'default',
      description: '',
      value: '',
      active: true,
    });
    setShowForm(true);
    setError(null);
  };

  const handleEdit = (rule) => {
    setEditingId(rule.id);
    setFormData({
      rule_name: rule.rule_name || '',
      rule_type: rule.rule_type || 'default',
      description: rule.description || '',
      value: rule.value || '',
      active: rule.active !== false,
    });
    setShowForm(true);
    setError(null);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      rule_name: '',
      rule_type: 'default',
      description: '',
      value: '',
      active: true,
    });
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
    if (!formData.rule_name.trim()) {
      setError('Nome da regra é obrigatório');
      return false;
    }
    if (formData.rule_name.trim().length < 3) {
      setError('Nome deve ter pelo menos 3 caracteres');
      return false;
    }
    if (!formData.rule_type) {
      setError('Tipo de regra é obrigatório');
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
        rule_name: formData.rule_name.trim(),
        rule_type: formData.rule_type,
        description: formData.description.trim(),
        value: formData.value.trim(),
        active: formData.active,
      };

      if (editingId) {
        await agendaRulesApi.updateAgendaRule(editingId, dataToSave);
        setRules(rules.map((r) => (r.id === editingId ? { ...r, ...dataToSave } : r)));
      } else {
        const newRule = await agendaRulesApi.createAgendaRule(clinicId, dataToSave);
        setRules([...rules, newRule]);
      }

      closeForm();
    } catch (err) {
      setError(err.message || 'Erro ao salvar regra');
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
      await agendaRulesApi.deleteAgendaRule(id, clinicId);
      setRules(rules.filter((r) => r.id !== id));
    } catch (err) {
      setError(err.message || 'Erro ao deletar regra');
      console.error('Erro:', err);
    }
  };

  const getRuleTypeLabel = (type) => {
    return ruleTypes.find((rt) => rt.value === type)?.label || type;
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
        title="Regras da Agenda"
        subtitle="Configure as regras de disponibilidade e restrições"
      />

      {/* ALERTA */}
      {error && <Alert type="error" title="Aviso" message={error} onClose={() => setError(null)} />}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle>Regras Cadastradas ({rules.length})</CardTitle>
          <Button
            onClick={handleNew}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Nova Regra
          </Button>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <EmptyState
              icon={<Plus className="w-12 h-12 mx-auto text-gray-400" />}
              title="Nenhuma regra cadastrada"
              description="Comece criando sua primeira regra de agendamento"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Nome</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Tipo</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Valor</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Status</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((rule) => (
                    <tr key={rule.id} className="border-b hover:bg-gray-50 transition">
                      <td className="py-3 px-4 font-medium text-gray-900">{rule.rule_name}</td>
                      <td className="py-3 px-4 text-gray-600">
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                          {getRuleTypeLabel(rule.rule_type)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{rule.value || '-'}</td>
                      <td className="py-3 px-4 text-center">
                        {rule.active ? (
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
                          onClick={() => handleEdit(rule)}
                          className="p-2 hover:bg-blue-100 rounded-lg text-blue-600 transition"
                          disabled={submitting}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(rule.id, rule.rule_name)}
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
              <CardHeader className="border-b shrink-0" style={{ flexShrink: 0 }}>
                <CardTitle>{editingId ? 'Editar Regra' : 'Nova Regra de Agendamento'}</CardTitle>
              </CardHeader>
              <CardContent className="app-modal-body p-6 modal-content-scroll">
                <form
                  id="rule-form"
                  onSubmit={handleSubmit}
                  className="space-y-4"
                  style={{ flex: 1, overflow: 'visible' }}
                >
                  <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nome da Regra <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.rule_name}
                        onChange={(e) => setFormData({ ...formData, rule_name: e.target.value })}
                        placeholder="Ex: Intervalo entre consultas"
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                        disabled={submitting}
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tipo de Regra <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.rule_type}
                        onChange={(e) => setFormData({ ...formData, rule_type: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={submitting}
                      >
                        {ruleTypes.map((rt) => (
                          <option key={rt.value} value={rt.value}>
                            {rt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Valor</label>
                      <input
                        type="text"
                        value={formData.value}
                        onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                        placeholder="Ex: 30 minutos, 10 agendamentos"
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={submitting}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Descrição
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Detalhes sobre a regra..."
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                        disabled={submitting}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="active"
                        checked={formData.active}
                        onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
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
              <div
                style={{ flexShrink: 0 }}
                className="border-t bg-white px-6 py-4 flex gap-3 justify-end"
              >
                <Button
                  type="button"
                  onClick={handleCloseWithCheck}
                  variant="outline"
                  disabled={submitting}
                >
                  Cancelar
                </Button>
                <Button
                  form="rule-form"
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={submitting}
                >
                  {submitting ? 'Salvando...' : editingId ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
