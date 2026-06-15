/**
 * ETAPA 1: Appointment to Financial Integration Configuration UI
 * Permite que o usuário configure as regras de automação de faturamento com suporte a v2.0 taxes
 */

import React, { useState, useEffect } from 'react';
import { Plus, Settings, CheckCircle2, AlertCircle, Loader2, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { useClinicContext } from '@/contexts/ClinicContext';
import {
  listAppointmentFinancialRules,
  createAppointmentFinancialRule,
  updateAppointmentFinancialRule,
  deactivateAppointmentFinancialRule,
  getAppointmentFinancialStats,
  getTaxConfiguration,
  listPayerRules,
  createPayerRule,
  updatePayerRule,
  deletePayerRule,
  AppointmentFinancialRule,
} from '@/lib/appointmentFinancialIntegrationApi';
import { listHealthInsurances } from '@/lib/healthInsurancesApi';

interface Stats {
  total_appointments: number;
  total_receivables_created: number;
  total_value_gross: number;
  total_value_net: number;
  total_discounts: number;
  total_taxes: number;
  total_commissions: number;
  success_rate: number;
}

interface TaxConfig {
  id?: number;
  clinic_id: string;
  tax_regime: 'simples_nacional' | 'lucro_real' | 'lucro_presumido';
  default_pis_percent: number;
  default_cofins_percent: number;
  default_csll_percent: number;
  default_ir_percent: number;
  issqn_percent: number;
}

interface PayerRule {
  id?: number;
  clinic_id: string;
  payer_type: 'CONVENIO' | 'PARTICULAR';
  health_plan_id?: string;
  client_id?: string;
  name: string;
  description?: string;
  discount_percent?: number;
}

interface HealthInsurance {
  id: string;
  name: string;
  code: string;
}

export const AppointmentFinancialIntegrationConfig: React.FC = () => {
  const { clinicId } = useClinicContext();
  const [rules, setRules] = useState<AppointmentFinancialRule[]>([]);
  const [payerRules, setPayerRules] = useState<PayerRule[]>([]);
  const [healthInsurances, setHealthInsurances] = useState<HealthInsurance[]>([]);
  const [taxConfig, setTaxConfig] = useState<TaxConfig | null>(null);
  const [stats, setStats] = useState<Stats>({
    total_appointments: 0,
    total_receivables_created: 0,
    total_value_gross: 0,
    total_value_net: 0,
    total_discounts: 0,
    total_taxes: 0,
    total_commissions: 0,
    success_rate: 0,
  });
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showPayerRuleForm, setShowPayerRuleForm] = useState(false);
  const [editingRule, setEditingRule] = useState<AppointmentFinancialRule | null>(null);
  const [editingPayerRule, setEditingPayerRule] = useState<PayerRule | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'payer-rules' | 'tax-config'>('overview');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    automatic_discount_percent: 0,
    apply_tax: true,
    tax_percent: 0,
    apply_doctor_commission: true,
    payment_method_default: 'cash' as const,
    auto_generate_cash_flow: true,
  });
  const [payerRuleFormData, setPayerRuleFormData] = useState({
    payer_type: 'PARTICULAR' as const,
    health_plan_id: '',
    name: '',
    description: '',
    discount_percent: 0,
  });

  // Carregar dados
  useEffect(() => {
    if (!clinicId) return;
    loadData();
  }, [clinicId]);

  const loadData = async () => {
    if (!clinicId) return;
    setLoading(true);
    try {
      const [rulesData, statsData, taxConfigData, payerRulesData, healthInsurancesData] = await Promise.all([
        listAppointmentFinancialRules(clinicId),
        getAppointmentFinancialStats(clinicId),
        getTaxConfiguration(clinicId),
        listPayerRules(clinicId),
        listHealthInsurances(clinicId, { includeInactive: false }),
      ]);
      setRules(rulesData || []);
      setStats(statsData || {
        total_appointments: 0,
        total_receivables_created: 0,
        total_value_gross: 0,
        total_value_net: 0,
        total_discounts: 0,
        total_taxes: 0,
        total_commissions: 0,
        success_rate: 0,
      });
      setTaxConfig(taxConfigData || null);
      setPayerRules(payerRulesData || []);
      setHealthInsurances(healthInsurancesData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRule = async () => {
    if (!clinicId || !formData.name.trim()) return;

    setLoading(true);
    try {
      if (editingRule) {
        await updateAppointmentFinancialRule(editingRule.id, formData);
      } else {
        await createAppointmentFinancialRule(clinicId, formData);
      }
      setShowForm(false);
      setEditingRule(null);
      setFormData({
        name: '',
        description: '',
        automatic_discount_percent: 0,
        apply_tax: true,
        tax_percent: 0,
        apply_doctor_commission: true,
        payment_method_default: 'cash',
        auto_generate_cash_flow: true,
      });
      await loadData();
    } catch (error) {
      console.error('Error saving rule:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePayerRule = async () => {
    if (!clinicId || !payerRuleFormData.name.trim()) return;

    setLoading(true);
    try {
      const ruleData = {
        clinic_id: clinicId,
        payer_type: payerRuleFormData.payer_type,
        health_plan_id: payerRuleFormData.payer_type === 'CONVENIO' ? payerRuleFormData.health_plan_id : null,
        name: payerRuleFormData.name,
        description: payerRuleFormData.description,
        discount_percent: payerRuleFormData.discount_percent,
      };

      if (editingPayerRule) {
        await updatePayerRule(editingPayerRule.id!, ruleData);
      } else {
        await createPayerRule(ruleData as any);
      }
      setShowPayerRuleForm(false);
      setEditingPayerRule(null);
      setPayerRuleFormData({
        payer_type: 'PARTICULAR',
        health_plan_id: '',
        name: '',
        description: '',
        discount_percent: 0,
      });
      await loadData();
    } catch (error) {
      console.error('Error saving payer rule:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePayerRule = async (ruleId: number) => {
    if (!confirm('Desativar esta regra de pagador?')) return;
    setLoading(true);
    try {
      await deletePayerRule(ruleId);
      await loadData();
    } catch (error) {
      console.error('Error deleting payer rule:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (ruleId: number) => {
    if (!confirm('Desativar esta regra?')) return;
    setLoading(true);
    try {
      await deactivateAppointmentFinancialRule(ruleId);
      await loadData();
    } catch (error) {
      console.error('Error deactivating rule:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditRule = (rule: AppointmentFinancialRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      description: rule.description || '',
      automatic_discount_percent: rule.automatic_discount_percent || 0,
      apply_tax: rule.apply_tax,
      tax_percent: rule.tax_percent || 0,
      apply_doctor_commission: rule.apply_doctor_commission,
      payment_method_default: (rule.payment_method_default as any) || 'cash',
      auto_generate_cash_flow: rule.auto_generate_cash_flow,
    });
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Integração Agenda → Financeiro</h1>
          <p className="text-gray-600 mt-1">ETAPA 1: Automação de Faturamento v2.0 com Suporte a Impostos</p>
        </div>
      </div>

      {/* Tax Configuration Card - If Available */}
      {taxConfig && (
        <Card className="border-purple-200 bg-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-xl">⚙️</span> Configuração de Impostos
            </CardTitle>
            <CardDescription>Regime fiscal: {taxConfig.tax_regime}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div className="bg-white rounded p-3">
                <p className="text-gray-600">PIS</p>
                <p className="font-bold text-lg">{taxConfig.default_pis_percent}%</p>
              </div>
              <div className="bg-white rounded p-3">
                <p className="text-gray-600">COFINS</p>
                <p className="font-bold text-lg">{taxConfig.default_cofins_percent}%</p>
              </div>
              <div className="bg-white rounded p-3">
                <p className="text-gray-600">CSLL</p>
                <p className="font-bold text-lg">{taxConfig.default_csll_percent}%</p>
              </div>
              <div className="bg-white rounded p-3">
                <p className="text-gray-600">IR</p>
                <p className="font-bold text-lg">{taxConfig.default_ir_percent}%</p>
              </div>
              <div className="bg-white rounded p-3">
                <p className="text-gray-600">ISSQN</p>
                <p className="font-bold text-lg">{taxConfig.issqn_percent}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Atendimentos</p>
            <p className="text-2xl font-bold">{stats.total_appointments}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Receivables Criados</p>
            <p className="text-2xl font-bold text-green-600">{stats.total_receivables_created}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Valor Líquido (após impostos)</p>
            <p className="text-2xl font-bold">
              {stats.total_value_net.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Total de Impostos</p>
            <p className="text-2xl font-bold text-red-600">
              {stats.total_taxes.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'overview'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          📋 Automação
        </button>
        <button
          onClick={() => setActiveTab('payer-rules')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'payer-rules'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          💳 Regras de Pagador
        </button>
        <button
          onClick={() => setActiveTab('tax-config')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'tax-config'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          ⚙️ Configurações
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Regras de Automação</h2>
            <Button onClick={() => setShowForm(!showForm)} disabled={loading}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Regra
            </Button>
          </div>

          {/* Form */}
          {showForm && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle>{editingRule ? 'Editar Regra' : 'Nova Regra de Faturamento'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Nome da Regra *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Faturamento Padrão"
                  />
                </div>

                <div>
                  <Label>Descrição</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descrição opcional"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Desconto Automático (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.automatic_discount_percent}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          automatic_discount_percent: parseFloat(e.target.value),
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label>Imposto Adicional (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.tax_percent}
                      onChange={(e) =>
                        setFormData({ ...formData, tax_percent: parseFloat(e.target.value) })
                      }
                      disabled={!formData.apply_tax}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Aplicar Imposto</Label>
                    <Switch
                      checked={formData.apply_tax}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, apply_tax: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Calcular Comissão Médica</Label>
                    <Switch
                      checked={formData.apply_doctor_commission}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, apply_doctor_commission: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Gerar Entrada em Cash Flow</Label>
                    <Switch
                      checked={formData.auto_generate_cash_flow}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, auto_generate_cash_flow: checked })
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label>Método de Pagamento Padrão</Label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={formData.payment_method_default}
                    onChange={(e) =>
                      setFormData({ ...formData, payment_method_default: e.target.value as any })
                    }
                  >
                    <option value="cash">Dinheiro</option>
                    <option value="pix">PIX</option>
                    <option value="card">Cartão</option>
                    <option value="health_insurance">Convênio</option>
                  </select>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveRule}
                    disabled={loading || !formData.name.trim()}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Salvar Regra
                  </Button>
                  <Button
                    onClick={() => {
                      setShowForm(false);
                      setEditingRule(null);
                    }}
                    variant="outline"
                  >
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Rules List */}
          <div className="space-y-4">
            {loading && !rules.length ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : rules.length > 0 ? (
              <div className="grid gap-4">
                {rules.map((rule) => (
                  <Card key={rule.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{rule.name}</CardTitle>
                          <CardDescription>{rule.description}</CardDescription>
                        </div>
                        {rule.is_active && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Desconto Automático</p>
                          <p className="font-semibold">{rule.automatic_discount_percent}%</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Imposto</p>
                          <p className="font-semibold">{rule.tax_percent}%</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Comissão Médica</p>
                          <p className="font-semibold">{rule.apply_doctor_commission ? 'Sim' : 'Não'}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Cash Flow</p>
                          <p className="font-semibold">{rule.auto_generate_cash_flow ? 'Sim' : 'Não'}</p>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button
                          onClick={() => handleEditRule(rule)}
                          variant="outline"
                          size="sm"
                          disabled={loading}
                        >
                          <Settings className="w-4 h-4 mr-1" />
                          Editar
                        </Button>
                        {rules.length > 1 && (
                          <Button
                            onClick={() => handleDeactivate(rule.id)}
                            variant="ghost"
                            size="sm"
                            disabled={loading}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            Desativar
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Nenhuma regra configurada. Crie a primeira regra para ativar a automação de faturamento.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      )}

      {/* Payer Rules Tab */}
      {activeTab === 'payer-rules' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Regras de Cobrança por Pagador</h2>
            <Button onClick={() => setShowPayerRuleForm(!showPayerRuleForm)} disabled={loading}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Regra
            </Button>
          </div>

          {/* Payer Rule Form */}
          {showPayerRuleForm && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle>
                  {editingPayerRule ? 'Editar Regra de Pagador' : 'Nova Regra de Pagador'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Tipo de Pagador *</Label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={payerRuleFormData.payer_type}
                    onChange={(e) =>
                      setPayerRuleFormData({
                        ...payerRuleFormData,
                        payer_type: e.target.value as 'CONVENIO' | 'PARTICULAR',
                        health_plan_id: '', // Reset health plan when type changes
                      })
                    }
                  >
                    <option value="PARTICULAR">Paciente Particular</option>
                    <option value="CONVENIO">Convênio (Health Plan)</option>
                  </select>
                </div>

                {payerRuleFormData.payer_type === 'CONVENIO' && (
                  <div>
                    <Label>Health Plan *</Label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      value={payerRuleFormData.health_plan_id}
                      onChange={(e) =>
                        setPayerRuleFormData({ ...payerRuleFormData, health_plan_id: e.target.value })
                      }
                    >
                      <option value="">Selecione um convênio...</option>
                      {healthInsurances.map((hi) => (
                        <option key={hi.id} value={hi.id}>
                          {hi.name} ({hi.code})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <Label>Nome da Regra *</Label>
                  <Input
                    value={payerRuleFormData.name}
                    onChange={(e) =>
                      setPayerRuleFormData({ ...payerRuleFormData, name: e.target.value })
                    }
                    placeholder="Ex: Particular sem desconto"
                  />
                </div>

                <div>
                  <Label>Descrição</Label>
                  <Input
                    value={payerRuleFormData.description}
                    onChange={(e) =>
                      setPayerRuleFormData({ ...payerRuleFormData, description: e.target.value })
                    }
                    placeholder="Descrição opcional"
                  />
                </div>

                <div>
                  <Label>Desconto Padrão (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={payerRuleFormData.discount_percent}
                    onChange={(e) =>
                      setPayerRuleFormData({
                        ...payerRuleFormData,
                        discount_percent: parseFloat(e.target.value),
                      })
                    }
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleSavePayerRule}
                    disabled={loading || !payerRuleFormData.name.trim()}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Salvar Regra
                  </Button>
                  <Button
                    onClick={() => {
                      setShowPayerRuleForm(false);
                      setEditingPayerRule(null);
                      setPayerRuleFormData({
                        payer_type: 'PARTICULAR',
                        health_plan_id: '',
                        name: '',
                        description: '',
                        discount_percent: 0,
                      });
                    }}
                    variant="outline"
                  >
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payer Rules List */}
          <div className="space-y-4">
            {loading && !payerRules.length ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : payerRules.length > 0 ? (
              <div className="grid gap-4">
                {payerRules.map((rule) => (
                  <Card key={rule.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{rule.name}</CardTitle>
                          <CardDescription>
                            {rule.payer_type === 'CONVENIO'
                              ? `Convênio: ${
                                  healthInsurances.find((h) => h.id === rule.health_plan_id)?.name ||
                                  rule.health_plan_id
                                }`
                              : 'Paciente Particular'}
                          </CardDescription>
                        </div>
                        <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded">
                          {rule.payer_type}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Desconto Padrão</p>
                          <p className="font-semibold">{rule.discount_percent || 0}%</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Descrição</p>
                          <p className="font-semibold">{rule.description || '-'}</p>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button
                          onClick={() => {
                            setEditingPayerRule(rule);
                            setPayerRuleFormData({
                              payer_type: rule.payer_type,
                              health_plan_id: rule.health_plan_id || '',
                              name: rule.name,
                              description: rule.description || '',
                              discount_percent: rule.discount_percent || 0,
                            });
                            setShowPayerRuleForm(true);
                          }}
                          variant="outline"
                          size="sm"
                          disabled={loading}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Editar
                        </Button>
                        <Button
                          onClick={() => handleDeletePayerRule(rule.id!)}
                          variant="ghost"
                          size="sm"
                          disabled={loading}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Nenhuma regra de pagador configurada. Use o padrão até criar suas regras personalizadas.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      )}

      {/* Tax Config Tab */}
      {activeTab === 'tax-config' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Configuração de Impostos</h2>
          {taxConfig ? (
            <Card>
              <CardHeader>
                <CardTitle>{taxConfig.tax_regime}</CardTitle>
                <CardDescription>Configuração de impostos para Neuroclinica</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="border rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-600">PIS</p>
                    <p className="text-2xl font-bold text-blue-600">{taxConfig.default_pis_percent}%</p>
                    <p className="text-xs text-gray-500 mt-1">Programa de Integração Social</p>
                  </div>
                  <div className="border rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-600">COFINS</p>
                    <p className="text-2xl font-bold text-blue-600">{taxConfig.default_cofins_percent}%</p>
                    <p className="text-xs text-gray-500 mt-1">Contribuição para o Financiamento</p>
                  </div>
                  <div className="border rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-600">CSLL</p>
                    <p className="text-2xl font-bold text-blue-600">{taxConfig.default_csll_percent}%</p>
                    <p className="text-xs text-gray-500 mt-1">Contribuição Social s/ Lucro</p>
                  </div>
                  <div className="border rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-600">IR</p>
                    <p className="text-2xl font-bold text-blue-600">{taxConfig.default_ir_percent}%</p>
                    <p className="text-xs text-gray-500 mt-1">Imposto de Renda</p>
                  </div>
                  <div className="border rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-600">ISSQN</p>
                    <p className="text-2xl font-bold text-blue-600">{taxConfig.issqn_percent}%</p>
                    <p className="text-xs text-gray-500 mt-1">Serviços de Qualquer Natureza</p>
                  </div>
                </div>

                <Alert className="border-yellow-200 bg-yellow-50">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">
                    💡 Estes são os percentuais padrão. Regras específicas por pagador podem aplicar
                    percentuais diferentes.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Carregando configuração de impostos...</AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Instructions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg">ℹ️ Como Funciona - ETAPA 1 v2.0</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-700">
          <p>
            ✅ Quando um <strong>atendimento é finalizado</strong> na Agenda (status = "completed"):
          </p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>
              Sistema identifica o tipo de pagador (CONVENIO/PARTICULAR) e busca a regra
              correspondente
            </li>
            <li>
              Calcula impostos automaticamente: <strong>PIS, COFINS, CSLL, IR, ISSQN</strong>
            </li>
            <li>Aplica descontos configurados na regra de pagador</li>
            <li>Calcula comissão médica (se ativado)</li>
            <li>
              Cria Conta a Receber (AR Invoice) com breakdown detalhado de todos os impostos
            </li>
            <li>Registra mapeamento para auditoria completa</li>
            <li>Gera entrada de previsão de caixa com valor líquido (após impostos)</li>
          </ol>
          <p className="mt-3 pt-3 border-t">
            💡 <strong>Próximas Ações:</strong>
          </p>
          <ul className="list-disc list-inside ml-2 mt-2 space-y-1">
            <li>Configure as regras de pagador (CONVENIO + PARTICULAR)</li>
            <li>Verifique a configuração de impostos para sua clínica</li>
            <li>Crie atendimentos na Agenda e finalize-os para testar a integração</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default AppointmentFinancialIntegrationConfig;
