// src/pages/clinica/base-sistema/ServicePricesPage.jsx
// ============================================================
// CRUD de Preços de Serviços - Base do Sistema
// Gestão de valores e tarifas por serviço
// ============================================================

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
import BaseSystemHeader from '@/components/layout/BaseSystemHeader';
import { Alert } from '@/components/layout/BaseSystemAlert';
import EmptyState from '@/components/layout/EmptyState';
import * as servicesApi from '@/lib/servicesApi';
import * as servicePricesApi from '@/lib/servicePricesApi';
import * as healthInsurancesApi from '@/lib/healthInsurancesApi';
import * as payersApi from '@/lib/payersApi';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Edit2, Trash2, X, DollarSign, Filter, ArrowRight } from 'lucide-react';
import { customSupabaseClient } from '@/lib/customSupabaseClient';

const normalizeName = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const normalizeDocument = (value) => String(value || '').replace(/\D/g, '');

const getInsuranceDisplayName = (insurance) =>
  insurance?.name || insurance?.fantasy_name || insurance?.legal_name || 'Convênio sem nome';

const isBusinessService = (service) => {
  const serviceText = normalizeName(
    [service?.name, service?.code, service?.tuss_code, service?.description].filter(Boolean).join(' '),
  );

  return service?.active !== false && !/\b(validacao|validation|teste|test)\b/.test(serviceText);
};

export function ServicePricesPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { clinicId } = useClinicContext();

  const [prices, setPrices] = useState([]);
  const [services, setServices] = useState([]);
  const [payers, setPayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    service_id: '',
    payer_id: '',
    price: '',
    cost: '',
    currency: 'BRL',
    plan: '',
    active: true,
  });
  const [submitting, setSubmitting] = useState(false);

  // Filtros
  const [filterService, setFilterService] = useState('');
  const [filterPayer, setFilterPayer] = useState('');
  const [filterPlan, setFilterPlan] = useState('');

  useEffect(() => {
    if (clinicId && isAuthenticated) {
      loadData();

      // Verifica se voltou de criar serviço
      const params = new URLSearchParams(window.location.search);
      if (params.get('openForm') === 'true') {
        setShowForm(true);
        // Remove o param da URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [clinicId, isAuthenticated]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Carregar serviços
      const servicesData = await servicesApi.listServices(clinicId);
      const businessServices = Array.isArray(servicesData) ? servicesData.filter(isBusinessService) : [];
      setServices(businessServices);

      // Carregar convênios cadastrados e mapear para seus pagadores financeiros.
      const healthInsurances = await healthInsurancesApi.listHealthInsurances(clinicId);
      const { data: allPayersData, error: payersError } = await customSupabaseClient
        .from('payers')
        .select('id, name, cnpj, active')
        .eq('clinic_id', clinicId)
        .eq('active', true)
        .order('name', { ascending: true });

      if (payersError) {
        throw payersError;
      }

      const payerByName = new Map(
        (allPayersData || []).map((payer) => [normalizeName(payer.name), payer]),
      );
      const payerByDocument = new Map(
        (allPayersData || [])
          .map((payer) => [normalizeDocument(payer.cnpj), payer])
          .filter(([document]) => document),
      );
      const convenioPayers = (healthInsurances || []).map((insurance) => {
        const displayName = getInsuranceDisplayName(insurance);
        const payer =
          payerByDocument.get(normalizeDocument(insurance.cnpj)) ||
          payerByName.get(normalizeName(displayName)) ||
          payerByName.get(normalizeName(insurance.fantasy_name)) ||
          payerByName.get(normalizeName(insurance.legal_name));

        return {
          id: payer?.id || `insurance:${insurance.id}`,
          payerId: payer?.id || null,
          insuranceId: insurance.id,
          name: displayName,
          cnpj: insurance.cnpj || payer?.cnpj || null,
          insurance,
        };
      });
      setPayers(convenioPayers);

      // Carregar preços com relacionamentos
      const pricesData = await servicePricesApi.getServicePrices(clinicId);
      const businessServiceIds = new Set(businessServices.map((service) => service.id));
      const convenioPayerIds = new Set(
        convenioPayers.map((payer) => payer.payerId).filter(Boolean),
      );
      setPrices(
        Array.isArray(pricesData)
          ? pricesData.filter(
              (price) =>
                businessServiceIds.has(price.service_id) &&
                (!price.payer_id || convenioPayerIds.has(price.payer_id)),
            )
          : [],
      );
    } catch (err) {
      setError(err.message || 'Erro ao carregar dados');
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filtros aplicados
  const filteredPrices = useMemo(() => {
    return (prices || []).filter((price) => {
      // Filtro por serviço
      if (filterService && price.service_id !== filterService) {
        return false;
      }
      // Filtro por convênio
      if (filterPayer && price.payer_id !== filterPayer) {
        return false;
      }
      // Filtro por plano (se existir campo)
      if (filterPlan && price.plan !== filterPlan) {
        return false;
      }
      return true;
    });
  }, [prices, filterService, filterPayer, filterPlan]);

  const handleNew = () => {
    setEditingId(null);
    setFormData({
      service_id: '',
      payer_id: '',
      price: '',
      cost: '',
      currency: 'BRL',
      plan: '',
      active: true,
    });
    setShowForm(true);
    setError(null);
  };

  const handleEdit = (priceEntry) => {
    setEditingId(priceEntry.id);
    setFormData({
      service_id: priceEntry.service_id || '',
      payer_id: priceEntry.payer_id || '',
      price: priceEntry.price?.toString() || '',
      cost: priceEntry.cost?.toString() || '',
      currency: priceEntry.currency || 'BRL',
      plan: priceEntry.plan || '',
      active: priceEntry.active !== false,
    });
    setShowForm(true);
    setError(null);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      service_id: '',
      payer_id: '',
      price: '',
      cost: '',
      currency: 'BRL',
      plan: '',
      active: true,
    });
    setSubmitting(false);
  };

  const handleCloseWithCheck = () => {
    const hasData = Object.entries(formData).some(([key, value]) => {
      if (typeof value === 'string') {
        return value.trim() !== '';
      }
      if (typeof value === 'number') {
        return value !== 0;
      }
      if (typeof value === 'boolean') {
        return value !== true;
      }
      if (Array.isArray(value)) {
        return value.length > 0;
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
    if (!formData.service_id.trim()) {
      setError('Serviço é obrigatório');
      return false;
    }

    const price = parseFloat(formData.price);
    if (isNaN(price) || price <= 0) {
      setError('Preço deve ser um valor maior que zero');
      return false;
    }

    if (formData.cost) {
      const cost = parseFloat(formData.cost);
      if (isNaN(cost) || cost < 0) {
        setError('Custo deve ser um valor válido');
        return false;
      }
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

      let payerId = formData.payer_id || null;
      const selectedPayer = payers.find((payer) => payer.id === payerId);

      if (selectedPayer && !selectedPayer.payerId) {
        const payer = await payersApi.createPayer(clinicId, {
          name: selectedPayer.name,
          cnpj: selectedPayer.cnpj,
          contact_person: selectedPayer.insurance?.contact_person,
          contact_email: selectedPayer.insurance?.contact_email,
          contact_phone: selectedPayer.insurance?.contact_phone,
        });
        payerId = payer.id;
      } else if (selectedPayer?.payerId) {
        payerId = selectedPayer.payerId;
      }

      const dataToSave = {
        service_id: formData.service_id,
        payer_id: payerId,
        price: parseFloat(formData.price),
        cost: formData.cost ? parseFloat(formData.cost) : null,
        currency: formData.currency,
        plan: formData.plan || null,
        active: formData.active,
      };

      if (editingId) {
        await servicePricesApi.updateServicePrice(editingId, dataToSave);
        setPrices(prices.map((p) => (p.id === editingId ? { ...p, ...dataToSave } : p)));
      } else {
        const newPrice = await servicePricesApi.createServicePrice(clinicId, dataToSave);
        setPrices([...prices, newPrice]);
      }

      await loadData();
      closeForm();
    } catch (err) {
      setError(err.message || 'Erro ao salvar preço');
      console.error('Erro:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deseja deletar essa tabela de preços?')) {
      return;
    }

    try {
      setError(null);
      await servicePricesApi.deleteServicePrice(id);
      setPrices(prices.filter((p) => p.id !== id));
    } catch (err) {
      setError(err.message || 'Erro ao deletar preço');
      console.error('Erro:', err);
    }
  };

  const getServiceName = (id) => {
    return services.find((s) => s.id === id)?.name || 'Desconhecido';
  };

  const getServiceCode = (id) => {
    const service = services.find((s) => s.id === id);
    console.log('🔎 Procurando código para service_id:', id);
    console.log('🔎 Serviço encontrado:', service);
    return service?.code || '-';
  };

  const getServiceCategory = (priceEntry) => {
    const categoryMap = {
      consultation: '📋 Consulta',
      exam: '🔬 Exame/SADT',
      procedure: '🏥 Procedimento',
      surgery: '🏨 Cirurgia',
      other: '📝 Outro',
    };

    // Tenta primeiro do relacionamento carregado
    if (priceEntry.services?.service_category) {
      return (
        categoryMap[priceEntry.services.service_category] || priceEntry.services.service_category
      );
    }

    // Depois tenta do array de serviços
    const service = services.find((s) => s.id === priceEntry.service_id);
    return service?.service_category
      ? categoryMap[service.service_category] || service.service_category
      : '-';
  };

  const getPayerName = (priceEntry) => {
    const id = typeof priceEntry === 'object' ? priceEntry.payer_id : priceEntry;
    return (
      payers.find((p) => p.payerId === id || p.id === id)?.name ||
      (typeof priceEntry === 'object' ? priceEntry.payers?.name : null) ||
      'Desconhecido'
    );
  };

  // Função auxiliar para extrair código do objeto de preço (se tiver relacionamento carregado)
  const getServiceCodeFromPrice = (priceEntry) => {
    console.log('🔍 Buscando código para serviço:', {
      service_id: priceEntry.service_id,
      hasServicesRelation: !!priceEntry.services,
      servicesObj: priceEntry.services,
    });

    // Tenta primeiro do relacionamento carregado
    if (priceEntry.services?.code) {
      console.log('✅ Código encontrado no relacionamento:', priceEntry.services.code);
      return priceEntry.services.code;
    }

    // Depois tenta do array de serviços
    const codeFromArray = getServiceCode(priceEntry.service_id);
    console.log('✅ Código buscado do array:', codeFromArray);
    return codeFromArray;
  };

  const formatCurrency = (value, currency) => {
    if (!value) {
      return '-';
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency || 'BRL',
    }).format(value);
  };

  const calculateMargin = (price, cost) => {
    if (!price || !cost || cost === 0) {
      return null;
    }
    const margin = ((price - cost) / price) * 100;
    return margin.toFixed(1);
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
        category="4.3 Parâmetros Financeiros"
        title="Tabela de Preços"
        subtitle="Configure os valores e custos de cada serviço"
      />

      {/* ALERTA */}
      {error && <Alert type="error" title="Aviso" message={error} onClose={() => setError(null)} />}

      {services.length === 0 ? (
        <EmptyState
          icon={<Plus className="w-12 h-12 mx-auto text-gray-400" />}
          title="Nenhum serviço"
          description="Você precisa cadastrar serviços antes"
        />
      ) : (
        <div className="space-y-6">
          {/* FILTROS */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-blue-600" />
                <CardTitle className="text-blue-900">Filtros</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Filtro Serviço */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Serviço</label>
                  <select
                    value={filterService}
                    onChange={(e) => setFilterService(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="">Todos os serviços</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filtro Convênio */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Convênio</label>
                  <select
                    value={filterPayer}
                    onChange={(e) => setFilterPayer(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="">Todos os convênios</option>
                    {payers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filtro Plano */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Plano</label>
                  <input
                    type="text"
                    value={filterPlan}
                    onChange={(e) => setFilterPlan(e.target.value)}
                    placeholder="Digite para filtrar plano..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* TABELA DE PREÇOS */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle>Preços Cadastrados ({filteredPrices.length})</CardTitle>
              <Button
                onClick={handleNew}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Novo Preço
              </Button>
            </CardHeader>
            <CardContent>
              {filteredPrices.length === 0 ? (
                <EmptyState
                  icon={<Plus className="w-12 h-12 mx-auto text-gray-400" />}
                  title="Nenhum preço encontrado"
                  description={
                    prices.length === 0
                      ? 'Comece adicionando o preço de um serviço'
                      : 'Nenhum resultado com os filtros selecionados'
                  }
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700 whitespace-nowrap">
                          Código CBHPM
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Serviço</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">
                          Categoria
                        </th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700 whitespace-nowrap">
                          Valor
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">
                          Convênio
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Plano</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPrices.map((priceEntry) => (
                        <tr key={priceEntry.id} className="border-b hover:bg-gray-50 transition">
                          <td className="py-3 px-4 font-mono text-gray-700 whitespace-nowrap font-semibold">
                            {getServiceCodeFromPrice(priceEntry)}
                          </td>
                          <td className="py-3 px-4 font-medium text-gray-900">
                            {getServiceName(priceEntry.service_id)}
                          </td>
                          <td className="py-3 px-4 text-gray-700">
                            {getServiceCategory(priceEntry)}
                          </td>
                          <td className="py-3 px-4 text-right text-gray-900 font-medium">
                            {formatCurrency(priceEntry.price, priceEntry.currency)}
                          </td>
                          <td className="py-3 px-4 text-gray-700">
                            {getPayerName(priceEntry)}
                          </td>
                          <td className="py-3 px-4 text-gray-600">{priceEntry.plan || '-'}</td>
                          <td className="py-3 px-4 flex justify-center gap-2">
                            <button
                              onClick={() => handleEdit(priceEntry)}
                              className="p-2 hover:bg-blue-100 rounded-lg text-blue-600 transition"
                              disabled={submitting}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(priceEntry.id)}
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
        </div>
      )}

      {showForm && (
        <div className="app-modal-overlay">
          <div className="app-modal-shell app-modal-shell--compact">
            <Card className="app-modal-card app-modal-card--auto shadow-2xl border-0">
              {/* Header */}
              <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between rounded-t-lg shadow-md">
                <div className="flex items-center gap-3">
                  <DollarSign size={24} className="text-white" />
                  <h2 className="text-xl font-bold text-white">
                    {editingId ? '✏️ Editar Preço' : '➕ Novo Preço'}
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
                  id="service-prices-form"
                  onSubmit={handleSubmit}
                  className="space-y-5"
                  style={{ flex: 1, overflow: 'visible' }}
                >
                  <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
                    {/* SEÇÃO 1: DADOS DO PREÇO */}
                    <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
                      <div className="border-b pb-3">
                        <h3 className="text-lg font-bold text-gray-900">💰 Dados do Preço</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Configure o preço do serviço e sua moeda
                        </p>
                      </div>

                      {/* Serviço */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">
                          Serviço <span className="text-red-600 font-bold">*</span>
                        </label>
                        <div className="flex gap-2">
                          <select
                            value={formData.service_id}
                            onChange={(e) =>
                              setFormData({ ...formData, service_id: e.target.value })
                            }
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                            required
                            disabled={submitting}
                            autoFocus
                          >
                            <option value="">Selecione um serviço...</option>
                            {services.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() =>
                              navigate('/clinica/base-sistema/servicos?returnTo=service-prices')
                            }
                            className="px-4 py-2 bg-slate-500 hover:bg-slate-600 text-white rounded-lg transition flex items-center gap-2 whitespace-nowrap"
                            title="Criar novo serviço"
                          >
                            <Plus className="w-4 h-4" />
                            Novo
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Escolha o serviço para definir o preço
                        </p>
                      </div>

                      {/* Layout: Convênio e Plano em 2 colunas */}
                      <div className="grid grid-cols-2 gap-4">
                        {/* Convênio */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-800 mb-2">
                            Convênio
                          </label>
                          <select
                            value={formData.payer_id}
                            onChange={(e) => setFormData({ ...formData, payer_id: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                            disabled={submitting}
                          >
                            <option value="">Selecione um convênio...</option>
                            {payers.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                          <p className="text-xs text-gray-500 mt-2">
                            Opcional. Deixe em branco para preço genérico
                          </p>
                        </div>

                        {/* Plano */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-800 mb-2">
                            Plano
                          </label>
                          <input
                            type="text"
                            value={formData.plan}
                            onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                            placeholder="Ex: Plano Gold, Plano Básico..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={submitting}
                          />
                          <p className="text-xs text-gray-500 mt-2">Nome do plano associado</p>
                        </div>
                      </div>

                      {/* Layout: Moeda e Preço em 2 colunas */}
                      <div className="grid grid-cols-2 gap-4">
                        {/* Moeda */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-800 mb-2">
                            Moeda
                          </label>
                          <select
                            value={formData.currency}
                            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                            disabled={submitting}
                          >
                            <option value="BRL">🇧🇷 BRL (R$)</option>
                            <option value="USD">🇺🇸 USD ($)</option>
                            <option value="EUR">🇪🇺 EUR (€)</option>
                          </select>
                          <p className="text-xs text-gray-500 mt-2">Moeda do preço</p>
                        </div>

                        {/* Preço */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-800 mb-2">
                            Preço <span className="text-red-600 font-bold">*</span>
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                            placeholder="0.00"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                            disabled={submitting}
                          />
                          <p className="text-xs text-gray-500 mt-2">Valor cobrado pelo serviço</p>
                        </div>
                      </div>
                    </div>

                    {/* SEÇÃO 2: STATUS */}
                    <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
                      <div className="border-b pb-3">
                        <h3 className="text-lg font-bold text-gray-900">✓ Status</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Controle a disponibilidade deste preço
                        </p>
                      </div>

                      {/* Status */}
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
                            Preço Ativo
                          </span>
                          <span className="text-xs text-gray-500">Disponível para cobrança</span>
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
                  form="service-prices-form"
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
