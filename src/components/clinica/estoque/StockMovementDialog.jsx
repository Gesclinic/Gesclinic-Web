import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import ProductSelect from './ProductSelect';
import SupplierSelect from './SupplierSelect';
import CategorySelect from './CategorySelect';
import LocationSelect from './LocationSelect';
import { stockItemsApi } from '@/lib/stockApi';
import { Trash2, AlertTriangle, Package, ArrowRight, X } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useClinicContext } from '@/contexts/useClinicContext';

export default function StockMovementDialog({
  open,
  onOpenChange,
  onSubmit,
  type = 'entrada',
  enableFinance = false,
  clinicId = null,
  initialMovement = null,
  initialForm = null,
  presentation = 'dialog',
  onCancel = null,
}) {
  const clinicContext = useClinicContext();
  const currentUser = clinicContext?.user;

  const [form, setForm] = useState({
    date: '',
    locationId: '',
    location_name: '',
    targetLocationId: '',
    target_location_name: '',
    document: '',
    notes: '',
    reason: '',
    patientRef: '',
    professional: '',
    refDoc: '',
    supplier: '',
    supplierId: '',
    dueDate: '',
    documentFile: null,
    documentFileName: '',
    paymentMethod: 'dinheiro',
    installments: '1',
    products: [],
    created_by: '',
    // Campos de rastreamento para saídas
    batchNumber: '',
    itemExpiry: '',
    authNumber: '',
    signedBy: '',
  });

  const [editingIndex, setEditingIndex] = useState(null);
  const [tempProduct, setTempProduct] = useState({
    product: '',
    itemId: '',
    category_id: null,
    qty: '',
    unitCost: '',
    fifoTotalCost: null,
    insufficientStock: false,
    available: null,
    unit_symbol: '',
  });

  // 🟢 FASE 3: Data inteligente - default hoje
  const getTodayString = () => {
    // Usa data local para evitar avanço de dia por fuso horário
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const isFutureDate = (dateString) => {
    if (!dateString) {
      return false;
    }
    const selected = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selected > today;
  };

  const isPastDate = (dateString) => {
    if (!dateString) {
      return false;
    }
    const selected = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selected < today;
  };

  useEffect(() => {
    if (!open) {
      setForm({
        date: '',
        locationId: '',
        location_name: '',
        targetLocationId: '',
        target_location_name: '',
        document: '',
        notes: '',
        reason: '',
        patientRef: '',
        professional: '',
        refDoc: '',
        supplier: '',
        supplierId: '',
        dueDate: '',
        documentFile: null,
        documentFileName: '',
        paymentMethod: 'dinheiro',
        installments: '1',
        products: [],
        created_by: '',
      });
      setEditingIndex(null);
      setTempProduct({
        product: '',
        itemId: '',
        category_id: null,
        qty: '',
        unitCost: '',
        fifoTotalCost: null,
        insufficientStock: false,
        available: null,
        unit_symbol: '',
      });
    } else {
      // 🟢 Auto-preencher data com hoje (default para todas as abas)
      const today = getTodayString();
      // 🟡 Auto-preencher created_by quando dialog abre
      if (currentUser) {
        setForm((prev) => ({
          ...prev,
          date: prev.date || today,
          created_by: currentUser.email || currentUser.user_metadata?.name || 'Usuário',
        }));
      } else {
        setForm((prev) => ({
          ...prev,
          date: prev.date || today,
        }));
      }
      // Prefill full form if provided (e.g., atender via Saída)
      if (initialForm && Array.isArray(initialForm.products)) {
        setForm((prev) => ({
          ...prev,
          date: initialForm.date || prev.date,
          locationId: initialForm.locationId || prev.locationId,
          location_name: initialForm.location_name || prev.location_name,
          notes: initialForm.notes ?? prev.notes,
          reason: initialForm.reason ?? prev.reason,
          products: initialForm.products.map((p) => ({
            product: p.product || '',
            itemId: p.itemId || '',
            category_id: p.category_id ?? null,
            qty: p.qty || '',
            unitCost: p.unitCost || '',
            fifoTotalCost: null,
            insufficientStock: false,
            available: p.available ?? null,
            unit_symbol: p.unit_symbol || '',
          })),
        }));
        setEditingIndex(null);
        setTempProduct({
          product: '',
          itemId: '',
          category_id: null,
          qty: '',
          unitCost: '',
          fifoTotalCost: null,
          insufficientStock: false,
          available: null,
          unit_symbol: '',
        });
      }
    }
  }, [open, currentUser]);

  useEffect(() => {
    if (open && initialMovement) {
      setForm((prev) => ({
        ...prev,
        date: initialMovement.move_date || getTodayString(),
        locationId: initialMovement.location_id || '',
        location_name: initialMovement.location_name || initialMovement.location?.name || '',
        targetLocationId: initialMovement.target_location_id || '',
        target_location_name: initialMovement.target_location_name || '',
        notes: initialMovement.notes || '',
        reason: initialMovement.reason || '',
        patientRef: initialMovement.patientRef || '',
        professional: initialMovement.professional || '',
        refDoc: initialMovement.refDoc || '',
        products: [
          {
            product: initialMovement.item_name || initialMovement.item?.name || '',
            itemId: initialMovement.item_id || '',
            category_id: null,
            qty: initialMovement.qty || '',
            unitCost: initialMovement.unit_cost || '',
            fifoTotalCost: null,
            insufficientStock: false,
            available: initialMovement.available ?? null,
            unit_symbol: initialMovement.unit_symbol || '',
          },
        ],
      }));
      setEditingIndex(null);
      setTempProduct({
        product: '',
        itemId: '',
        category_id: null,
        qty: '',
        unitCost: '',
        fifoTotalCost: null,
        insufficientStock: false,
        available: null,
        unit_symbol: '',
      });
    }
  }, [open, initialMovement]);

  const addProduct = () => {
    if (!tempProduct.product) {
      alert('Selecione um produto');
      return;
    }
    if (!tempProduct.qty || parseFloat(tempProduct.qty) <= 0) {
      alert('Quantidade deve ser maior que zero');
      return;
    }
    if ((type === 'saida' || type === 'transfer') && tempProduct.insufficientStock) {
      alert('Saldo insuficiente para a quantidade informada.');
      return;
    }
    if (type !== 'saida' && type !== 'transfer' && !tempProduct.unitCost) {
      alert('Preencha o custo unitário');
      return;
    }

    if ((type === 'saida' || type === 'transfer') && tempProduct.available !== null) {
      if (parseFloat(tempProduct.qty) > parseFloat(tempProduct.available)) {
        alert('Quantidade solicitada não pode ser maior que o saldo disponível.');
        return;
      }
    }

    if (editingIndex !== null) {
      const updated = [...form.products];
      updated[editingIndex] = tempProduct;
      setForm({ ...form, products: updated });
      setEditingIndex(null);
    } else {
      setForm({ ...form, products: [...form.products, tempProduct] });
    }

    setTempProduct({
      product: '',
      itemId: '',
      category_id: null,
      qty: '',
      unitCost: '',
    });
  };

  const removeProduct = (index) => {
    setForm({ ...form, products: form.products.filter((_, i) => i !== index) });
    if (editingIndex === index) {
      setEditingIndex(null);
    }
  };

  const editProduct = (index) => {
    setEditingIndex(index);
    setTempProduct({ ...form.products[index] });
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setTempProduct({
      product: '',
      itemId: '',
      category_id: null,
      qty: '',
      unitCost: '',
    });
  };

  const calculateLineTotal = (qty, unitCost) => {
    const q = parseFloat(qty) || 0;
    const u = parseFloat(unitCost) || 0;
    return q * u;
  };

  const totalAmount = form.products.reduce((sum, product) => {
    return sum + calculateLineTotal(product.qty, product.unitCost);
  }, 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.products.length === 0) {
      alert('Adicione pelo menos um produto');
      return;
    }
    if (!form.locationId) {
      alert('Selecione um local de estoque');
      return;
    }
    if (type === 'transfer' && !form.targetLocationId) {
      alert('Selecione o local de destino');
      return;
    }
    if (type === 'transfer' && form.targetLocationId === form.locationId) {
      alert('Origem e destino não podem ser o mesmo local.');
      return;
    }

    // Removido: confirmação no submit. A confirmação agora acontece somente ao tentar alterar a data.

    // �🟡 FASE 2: Validações contextuais por tipo de saída
    if (type === 'saida') {
      if (form.reason === 'paciente' && !form.patientRef?.trim()) {
        alert("Campo 'Paciente' é obrigatório para saídas do tipo 'Paciente'.");
        return;
      }
    }

    if (type === 'saida' || type === 'transfer') {
      const invalid = form.products.find(
        (p) => p.available !== null && parseFloat(p.qty) > parseFloat(p.available),
      );
      if (invalid) {
        alert('Quantidade solicitada não pode ser maior que o saldo disponível.');
        return;
      }
      const zeroOrNegative = form.products.find((p) => !p.qty || parseFloat(p.qty) <= 0);
      if (zeroOrNegative) {
        alert('Quantidade deve ser maior que zero.');
        return;
      }
      const insufficient = form.products.find((p) => p.insufficientStock);
      if (insufficient) {
        alert('Saldo insuficiente para um dos itens.');
        return;
      }
    }

    const metaParts = [];
    if (form.reason) {
      metaParts.push(`Motivo: ${form.reason}`);
    }
    if (form.patientRef) {
      metaParts.push(`Paciente: ${form.patientRef}`);
    }
    if (form.professional) {
      metaParts.push(`Responsável: ${form.professional}`);
    }
    if (form.refDoc) {
      metaParts.push(`Ref: ${form.refDoc}`);
    }
    // 🟡 Adicionar created_by aos metadados para auditoria
    if (form.created_by) {
      metaParts.push(`Registrado por: ${form.created_by}`);
    }
    const meta = metaParts.join(' | ');
    const combinedNotes = [meta, form.notes].filter(Boolean).join(' | ');

    onSubmit({ ...form, date: form.date || getTodayString(), notes: combinedNotes, type });
  };

  const label = type === 'transfer' ? 'Transferência' : type === 'saida' ? 'Saída' : 'Entrada';

  useEffect(() => {
    const fetchFifo = async () => {
      if (type !== 'saida') {
        return;
      }
      if (!tempProduct.itemId || !form.locationId) {
        return;
      }
      const qtyNumber = parseFloat(tempProduct.qty);
      if (!qtyNumber || qtyNumber <= 0) {
        return;
      }

      try {
        const { data, error } = await supabase.rpc('next_fifo_cost', {
          p_clinic_id: clinicId,
          p_item_id: tempProduct.itemId,
          p_location_id: form.locationId,
          p_qty: qtyNumber,
        });

        if (error) {
          console.error('Erro FIFO:', error.message || error);
          return;
        }

        const result = Array.isArray(data) ? data[0] : data;
        if (!result) {
          return;
        }

        const insufficient = !!result.insufficient_stock;
        const available =
          result.available_qty !== undefined && result.available_qty !== null
            ? parseFloat(result.available_qty)
            : tempProduct.available;

        setTempProduct((prev) => ({
          ...prev,
          insufficientStock: insufficient,
          available,
          unitCost: null,
        }));
      } catch (err) {
        console.error('Erro inesperado FIFO:', err);
      }
    };

    fetchFifo();
  }, [type, tempProduct.itemId, tempProduct.qty, form.locationId, clinicId]);

  const getHeaderColor = () => {
    if (type === 'transfer') {
      return 'from-purple-600 to-purple-700';
    }
    if (type === 'saida') {
      return 'from-red-600 to-red-700';
    }
    return 'from-green-600 to-green-700'; // entrada
  };

  const getHeaderIcon = () => {
    if (type === 'transfer') {
      return '🔄';
    }
    if (type === 'saida') {
      return '📤';
    }
    return '📥'; // entrada
  };

  const getHeaderDescription = () => {
    if (type === 'transfer') {
      return 'Transfira estoque entre locais de armazenamento';
    }
    if (type === 'saida') {
      return 'Registre saídas de estoque com rastreamento completo';
    }
    return 'Registre novas entradas de estoque';
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
      return;
    }
    onOpenChange?.(false);
  };

  const content = (
    <div className={presentation === 'page' ? 'bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden' : 'app-dialog-shell app-dialog-shell--content app-dialog-shell--wide'}>
        {/* Header */}
        {presentation !== 'page' && <div
          className={`bg-gradient-to-r ${getHeaderColor()} text-white p-6 sticky top-0 z-20 flex items-center justify-between`}
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">{getHeaderIcon()}</span>
            <div>
              <h2 className="text-lg font-bold">
                {type === 'transfer'
                  ? '🔄 Transferência de Estoque'
                  : type === 'saida'
                    ? '📤 Saída de Estoque'
                    : '📥 Nova Entrada de Estoque'}
              </h2>
              <p
                className={`text-sm ${
                  type === 'transfer'
                    ? 'text-purple-100'
                    : type === 'saida'
                      ? 'text-red-100'
                      : 'text-green-100'
                }`}
              >
                {getHeaderDescription()}
              </p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className={`p-1 rounded transition text-white ${
              type === 'transfer'
                ? 'hover:bg-purple-700'
                : type === 'saida'
                  ? 'hover:bg-red-700'
                  : 'hover:bg-green-700'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>}

        {/* Content */}
        <form
          id="movement-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-6 pt-6 pb-2 space-y-5"
        >
          {/* SEÇÃO 1: INFORMAÇÕES BÁSICAS */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5 mb-5">
            <div className="flex items-center gap-3 border-b pb-4">
              <span className="text-2xl">📅</span>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Informações Básicas</h3>
                <p className="text-sm text-gray-500">Data e localização do movimento</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">Data *</label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    const todayStr = getTodayString();
                    if (!newDate) {
                      setForm({ ...form, date: newDate });
                      return;
                    }
                    if (newDate !== todayStr) {
                      const ok = window.confirm(
                        '⚠️ Data diferente de hoje. Verifique se é proposital.',
                      );
                      if (!ok) {
                        return;
                      }
                    }
                    setForm({ ...form, date: newDate });
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                  required
                />
                <p className="text-xs text-gray-500 mt-2">Data do movimento</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  {type === 'transfer' ? 'Estoque Origem' : 'Local de Estoque'}{' '}
                  <span className="text-red-600">*</span>
                </label>
                <LocationSelect
                  clinicId={clinicId}
                  value={form.location_name}
                  locationId={form.locationId}
                  onChange={(data) =>
                    setForm({ ...form, locationId: data.locationId, location_name: data.location })
                  }
                  required={true}
                  hideLabel={true}
                />
                <p className="text-xs text-gray-500 mt-2">Local de origem</p>
              </div>
            </div>

            {type === 'transfer' && (
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Estoque Destino <span className="text-red-600">*</span>
                </label>
                <LocationSelect
                  clinicId={clinicId}
                  value={form.target_location_name}
                  locationId={form.targetLocationId}
                  onChange={(data) =>
                    setForm({
                      ...form,
                      targetLocationId: data.locationId,
                      target_location_name: data.location,
                    })
                  }
                  required={true}
                  hideLabel={true}
                />
                <p className="text-xs text-gray-500 mt-2">Para onde transferir o estoque</p>
              </div>
            )}
          </div>

          {/* SEÇÃO 2: TIPO E MOTIVO (Saídas) */}
          {type === 'saida' && (
            <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5 mb-5">
              <div className="flex items-center gap-3 border-b pb-4">
                <span className="text-2xl">📋</span>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Tipo de Saída</h3>
                  <p className="text-sm text-gray-500">Motivo e responsável</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Tipo de Saída <span className="text-red-600">*</span>
                  </label>
                  <select
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                    value={form.reason}
                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                    required
                  >
                    <option value="">Selecione</option>
                    <option value="uso_interno">Uso interno</option>
                    <option value="paciente">Paciente</option>
                    <option value="perda">Perda</option>
                    <option value="vencimento">Vencimento</option>
                    <option value="transferencia">Transferência</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-2">Motivo da saída</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    {form.reason === 'paciente' ? 'Paciente *' : 'Paciente'}
                  </label>
                  <Input
                    placeholder="Nome ou referência"
                    value={form.patientRef}
                    onChange={(e) => setForm({ ...form, patientRef: e.target.value })}
                    required={form.reason === 'paciente'}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-2">Se aplicável</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Responsável
                  </label>
                  <Input
                    placeholder="Profissional ou usuário"
                    value={form.professional}
                    onChange={(e) => setForm({ ...form, professional: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-2">Quem autorizou</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Documento/Referência
                </label>
                <Input
                  placeholder="Ex: prontuário, guia, ordem interna"
                  value={form.refDoc}
                  onChange={(e) => setForm({ ...form, refDoc: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                />
                <p className="text-xs text-gray-500 mt-2">Referência ou número do documento</p>
              </div>

              {/* Alertas visuais */}
              {(form.reason === 'perda' || form.reason === 'vencimento') && (
                <div
                  className={`p-4 rounded-lg border-l-4 flex gap-3 ${
                    form.reason === 'perda'
                      ? 'bg-orange-50 border-orange-500 text-orange-800'
                      : 'bg-red-50 border-red-500 text-red-800'
                  }`}
                >
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-sm">
                      {form.reason === 'perda' ? '⚠️ Registro de Perda' : '⚠️ Item Vencido'}
                    </strong>
                    <p className="text-xs mt-1">
                      {form.reason === 'perda'
                        ? 'Esta saída será registrada como perda. Certifique-se de que o item realmente não pode ser utilizado.'
                        : 'Esta saída será registrada como vencimento. O item será removido permanentemente.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SEÇÃO 2.5: RASTREAMENTO (Apenas Saídas) */}
          {type === 'saida' && (
            <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5 mb-5">
              <div className="flex items-center gap-3 border-b pb-4">
                <span className="text-2xl">🔍</span>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Rastreamento</h3>
                  <p className="text-sm text-gray-500">Informações adicionais de rastreamento</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Lote/Série
                  </label>
                  <Input
                    value={form.batchNumber}
                    onChange={(e) => setForm({ ...form, batchNumber: e.target.value })}
                    placeholder="Ex: LT-2026-0001 ou SN-12345678"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Identificação do lote ou número de série
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Data de Expiração
                  </label>
                  <Input
                    type="date"
                    value={form.itemExpiry}
                    onChange={(e) => setForm({ ...form, itemExpiry: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-2">Validade do item</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Nº de Autorização
                  </label>
                  <Input
                    value={form.authNumber}
                    onChange={(e) => setForm({ ...form, authNumber: e.target.value })}
                    placeholder="Ex: AUT-2026-1234"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-2">Autorização ou ordem de saída</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Assinado por
                  </label>
                  <Input
                    value={form.signedBy}
                    onChange={(e) => setForm({ ...form, signedBy: e.target.value })}
                    placeholder="Nome do responsável"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-2">Profissional que autorizou a saída</p>
                </div>
              </div>
            </div>
          )}

          {/* SEÇÃO 2.6: AVISOS DE VENCIMENTO (Apenas Saídas com data de expiração) */}
          {type === 'saida' &&
            form.itemExpiry &&
            (() => {
              const expiryDate = new Date(form.itemExpiry);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              expiryDate.setHours(0, 0, 0, 0);

              const daysUntilExpiry = Math.floor((expiryDate - today) / (1000 * 60 * 60 * 24));

              let warningType = null;
              let message = '';
              let bgColor = 'bg-blue-50';
              let borderColor = 'border-blue-500';
              let textColor = 'text-blue-800';
              let icon = 'ℹ️';

              if (expiryDate < today) {
                warningType = 'expired';
                message = 'ITEM JÁ VENCIDO - Descarte imediato recomendado';
                bgColor = 'bg-red-50';
                borderColor = 'border-red-500';
                textColor = 'text-red-800';
                icon = '❌';
              } else if (daysUntilExpiry === 0) {
                warningType = 'expiring-today';
                message = 'VENCE HOJE - Ação imediata recomendada';
                bgColor = 'bg-red-50';
                borderColor = 'border-red-500';
                textColor = 'text-red-800';
                icon = '🚨';
              } else if (daysUntilExpiry <= 7) {
                warningType = 'critical';
                message = `CRÍTICO - Vence em ${daysUntilExpiry} dia${daysUntilExpiry !== 1 ? 's' : ''}`;
                bgColor = 'bg-red-50';
                borderColor = 'border-red-500';
                textColor = 'text-red-800';
                icon = '🔴';
              } else if (daysUntilExpiry <= 30) {
                warningType = 'warning';
                message = `ATENÇÃO - Vence em ${daysUntilExpiry} dias`;
                bgColor = 'bg-orange-50';
                borderColor = 'border-orange-500';
                textColor = 'text-orange-800';
                icon = '🟡';
              } else if (daysUntilExpiry <= 90) {
                warningType = 'caution';
                message = `Aviso - Vence em ${daysUntilExpiry} dias`;
                bgColor = 'bg-yellow-50';
                borderColor = 'border-yellow-500';
                textColor = 'text-yellow-800';
                icon = '⚠️';
              } else {
                warningType = 'info';
                message = `Vence em ${daysUntilExpiry} dias`;
                bgColor = 'bg-blue-50';
                borderColor = 'border-blue-500';
                textColor = 'text-blue-800';
                icon = 'ℹ️';
              }

              if (!warningType) {
                return null;
              }

              return (
                <div className={'bg-white border border-gray-200 rounded-lg p-6 mb-5'}>
                  <div
                    className={`p-4 rounded-lg border-l-4 flex gap-3 ${bgColor} ${borderColor} ${textColor}`}
                  >
                    <span className="text-2xl flex-shrink-0">{icon}</span>
                    <div className="flex-1">
                      <strong className="block text-sm font-bold">{message}</strong>
                      {warningType !== 'info' && (
                        <p className="text-xs mt-1">
                          {warningType === 'expired' &&
                            'Este item expirou e deve ser descartado conforme normas de segurança.'}
                          {warningType === 'expiring-today' &&
                            'O item vence hoje. Procure eliminar este estoque imediatamente.'}
                          {warningType === 'critical' &&
                            'Estoque crítico por vencimento próximo. Priorize consumo ou descarte.'}
                          {warningType === 'warning' &&
                            'Monitore próximo e planeje saída antes do vencimento.'}
                          {warningType === 'caution' &&
                            'Mantenha registro desta saída e acompanhamento de prazos.'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

          {/* SEÇÃO 3: PRODUTOS */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5 mb-5">
            <div className="flex items-center gap-3 border-b pb-4">
              <span className="text-2xl">📦</span>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Produtos</h3>
                <p className="text-sm text-gray-500">Itens do movimento</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-12 gap-2 bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-lg border border-gray-200">
                <div className="col-span-4 flex flex-col justify-end">
                  <label className="block text-xs font-semibold text-gray-900 mb-2">Produto</label>
                  <ProductSelect
                    clinicId={clinicId}
                    value={tempProduct.product}
                    itemId={tempProduct.itemId}
                    hideLabel={true}
                    disabled={!form.locationId}
                    onChange={async (data) => {
                      let catId = data.category_id ?? null;
                      if (!catId && data.itemId) {
                        try {
                          const prod = await stockItemsApi.get(data.itemId);
                          catId = prod?.category_id ?? null;
                        } catch (e) {
                          console.warn('Falha ao obter categoria:', e?.message || e);
                        }
                      }
                      setTempProduct({
                        ...tempProduct,
                        product: data.product,
                        itemId: data.itemId,
                        category_id: catId,
                        available: data.available ?? null,
                        unit_symbol: data.unit_symbol || '',
                        fifoTotalCost: null,
                        insufficientStock: false,
                        unitCost: '',
                      });
                    }}
                  />
                </div>

                <div className="col-span-2 flex flex-col justify-end">
                  <label className="block text-xs font-semibold text-gray-900 mb-2">
                    Quantidade
                  </label>
                  <div className="space-y-1">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      value={tempProduct.qty}
                      onChange={(e) => setTempProduct({ ...tempProduct, qty: e.target.value })}
                      className="h-10 text-sm"
                      disabled={!tempProduct.itemId}
                    />
                    {form.locationId && tempProduct.itemId && tempProduct.available !== null && (
                      <div className="text-xs text-gray-600">
                        Disp: {parseFloat(tempProduct.available).toFixed(2)}{' '}
                        {tempProduct.unit_symbol || 'un'}
                      </div>
                    )}
                  </div>
                </div>

                {type !== 'saida' && type !== 'transfer' && (
                  <div className="col-span-2 flex flex-col justify-end">
                    <label className="block text-xs font-semibold text-gray-900 mb-2">
                      Custo Unit.
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0,00"
                      value={tempProduct.unitCost}
                      onChange={(e) => setTempProduct({ ...tempProduct, unitCost: e.target.value })}
                      className="h-10 text-sm"
                      disabled={!tempProduct.itemId}
                    />
                  </div>
                )}

                <div className="col-span-2 flex flex-col justify-end">
                  <label className="block text-xs font-semibold text-gray-900 mb-2">
                    Categoria
                  </label>
                  <CategorySelect
                    clinicId={clinicId}
                    value={tempProduct.category_id}
                    hideLabel={true}
                    onChange={(catId) => setTempProduct({ ...tempProduct, category_id: catId })}
                  />
                </div>

                <div className="col-span-2 flex items-end gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={addProduct}
                    disabled={
                      !form.locationId ||
                      !tempProduct.itemId ||
                      !(parseFloat(tempProduct.qty) > 0) ||
                      ((type === 'saida' || type === 'transfer') &&
                        tempProduct.available !== null &&
                        parseFloat(tempProduct.qty) > parseFloat(tempProduct.available))
                    }
                    className="bg-green-600 hover:bg-green-700 text-white w-full"
                  >
                    {editingIndex !== null ? 'Atualizar' : 'Adicionar'}
                  </Button>
                  {editingIndex !== null && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={cancelEdit}
                      className="w-full"
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
              </div>

              {form.products.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gradient-to-r from-gray-100 to-gray-200 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-900">Produto</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-900">Qtd</th>
                        {type !== 'saida' && type !== 'transfer' && (
                          <>
                            <th className="px-4 py-3 text-right font-semibold text-gray-900">
                              Custo Unit.
                            </th>
                            <th className="px-4 py-3 text-right font-semibold text-gray-900">
                              Subtotal
                            </th>
                          </>
                        )}
                        <th className="px-4 py-3 text-center font-semibold text-gray-900">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.products.map((product, idx) => (
                        <tr
                          key={idx}
                          className={`border-b transition-colors ${editingIndex === idx ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                        >
                          <td className="px-4 py-3 font-medium text-gray-900">{product.product}</td>
                          <td className="px-4 py-3 text-right text-gray-700">
                            {parseFloat(product.qty).toFixed(2)}
                          </td>
                          {type !== 'saida' && type !== 'transfer' && (
                            <>
                              <td className="px-4 py-3 text-right text-gray-700">
                                R$ {parseFloat(product.unitCost).toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-right font-semibold text-gray-900">
                                R$ {calculateLineTotal(product.qty, product.unitCost).toFixed(2)}
                              </td>
                            </>
                          )}
                          <td className="px-4 py-3 text-center flex justify-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => editProduct(idx)}
                            >
                              ✏️
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => removeProduct(idx)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {form.products.length > 0 && type !== 'saida' && type !== 'transfer' && (
                <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
                  <p className="text-lg font-bold text-green-900">
                    💰 Valor Total:{' '}
                    <span className="text-2xl">R$ {totalAmount.toFixed(2).replace('.', ',')}</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* SEÇÃO 4: DADOS FINANCEIROS */}
          {enableFinance && (
            <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5 mb-5">
              <div className="flex items-center gap-3 border-b pb-4">
                <span className="text-2xl">💰</span>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Dados Financeiros</h3>
                  <p className="text-sm text-gray-500">Informações de pagamento</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Fornecedor <span className="text-red-600">*</span>
                </label>
                <SupplierSelect
                  clinicId={clinicId}
                  value={form.supplier}
                  supplierId={form.supplierId}
                  onChange={(data) =>
                    setForm({ ...form, supplier: data.supplier, supplierId: data.supplierId })
                  }
                  required
                  hideLabel={true}
                />
                <p className="text-xs text-gray-500 mt-2">Origem dos produtos</p>
              </div>

              <div className="grid grid-cols-3 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Vencimento <span className="text-red-600">*</span>
                  </label>
                  <Input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-2">Data de vencimento</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Forma de Pagamento <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={form.paymentMethod}
                    onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="dinheiro">💵 Dinheiro</option>
                    <option value="credito">💳 Cartão de Crédito</option>
                    <option value="debito">🏧 Cartão de Débito</option>
                    <option value="boleto">📋 Boleto</option>
                    <option value="transferencia">🏦 Transferência</option>
                    <option value="pix">📱 PIX</option>
                    <option value="cheque">✍️ Cheque</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-2">Método de pagamento</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Parcelas <span className="text-red-600">*</span>
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="99"
                    value={form.installments}
                    onChange={(e) => setForm({ ...form, installments: e.target.value })}
                    placeholder="1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-2">Número de parcelas</p>
                </div>
              </div>
            </div>
          )}

          {/* SEÇÃO 5: DOCUMENTAÇÃO E OBSERVAÇÕES */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5">
            <div className="flex items-center gap-3 border-b pb-4">
              <span className="text-2xl">📎</span>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Documentação</h3>
                <p className="text-sm text-gray-500">Referências e observações</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Documento/Referência
              </label>
              <Input
                value={form.refDoc}
                onChange={(e) => setForm({ ...form, refDoc: e.target.value })}
                placeholder="Ex: prontuário, guia, ordem interna, NF"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
              />
              <p className="text-xs text-gray-500 mt-2">Número ou identificação do documento</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Anexar Documento
              </label>
              <div className="space-y-2 p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setForm({
                        ...form,
                        documentFile: file,
                        documentFileName: file.name,
                      });
                    }
                  }}
                  className="text-sm"
                />
                <p className="text-xs text-gray-500">PDF, JPG ou PNG (máx 10MB)</p>
              </div>
              {form.documentFileName && (
                <div className="flex items-center gap-2 text-xs text-gray-700 bg-green-50 p-3 rounded mt-2 border border-green-200">
                  <span>📎 {form.documentFileName}</span>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, documentFile: null, documentFileName: '' })}
                    className="text-red-500 hover:text-red-700 ml-auto font-bold"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">Observações</label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Detalhes adicionais da movimentação..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm resize-none"
              />
              <p className="text-xs text-gray-500 mt-2">Informações complementares</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg border border-gray-300">
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Registrado por (Auditoria)
              </label>
              <Input value={form.created_by} disabled className="bg-white text-gray-600 text-sm" />
              <p className="text-xs text-gray-500 mt-2">
                Preenchido automaticamente para rastreabilidade
              </p>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex gap-3 justify-end px-6 py-4 border-t border-gray-200 bg-gray-50">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            className="px-4 py-2"
          >
            ✕ Cancelar
          </Button>
          <Button
            form="movement-form"
            type="submit"
            className={`px-6 py-2 text-white ${
              type === 'transfer'
                ? 'bg-purple-600 hover:bg-purple-700'
                : type === 'saida'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            ✓ Salvar {label}
          </Button>
        </div>
      </div>
  );

  if (presentation === 'page') {
    return content;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 border-0 bg-transparent shadow-none max-w-none w-auto">
        {content}
      </DialogContent>
    </Dialog>
  );
}
