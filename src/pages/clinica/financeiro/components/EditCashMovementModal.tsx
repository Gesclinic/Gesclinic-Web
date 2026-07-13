import React, { useEffect, useState } from 'react';
import { X, Save } from 'lucide-react';
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from '@/lib/paymentMethodsConfig';
import { stockSuppliersApi } from '@/lib/stockApi';
import type { CashMovement, CashMovementInput } from '../types/CashMovement';
import { RegisteredCounterpartyField, type SupplierRecord } from './RegisteredCounterpartyField';

interface EditCashMovementModalProps {
  isOpen: boolean;
  movement: CashMovement | null;
  onClose: () => void;
  onSubmit: (movementId: string, data: CashMovementInput & { edit_reason: string }) => Promise<void>;
}

const FINANCIAL_CATEGORIES = [
  { value: 'other', label: 'Geral' },
  { value: 'medical_service', label: 'Serviço / Receita clínica' },
  { value: 'materials', label: 'Materiais e insumos' },
  { value: 'maintenance', label: 'Manutenção' },
  { value: 'utilities', label: 'Contas de consumo' },
  { value: 'tax', label: 'Impostos e taxas' },
  { value: 'software', label: 'Sistemas e tecnologia' },
];

export function EditCashMovementModal({ isOpen, movement, onClose, onSubmit }: EditCashMovementModalProps) {
  const [form, setForm] = useState({
    type: 'saida' as 'entrada' | 'saida',
    amount: '',
    payment_method: 'DINHEIRO',
    description: '',
    reference_document: '',
    counterparty_name: '',
    expense_supplier_name: '',
    expense_supplier_document: '',
    expense_provider_name: '',
    expense_provider_document: '',
    expense_service_description: '',
    financial_category: 'other',
    status: 'confirmado' as 'confirmado' | 'pendente' | 'estornado',
    edit_reason: '',
  });
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !movement?.clinic_id) {
      return;
    }

    let active = true;
    setSuppliersLoading(true);
    stockSuppliersApi
      .list(movement.clinic_id)
      .then((data: SupplierRecord[]) => {
        if (active) {
          setSuppliers(data || []);
        }
      })
      .catch((loadError: unknown) => {
        console.error('Erro ao carregar fornecedores/prestadores:', loadError);
      })
      .finally(() => {
        if (active) {
          setSuppliersLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [isOpen, movement?.clinic_id]);

  useEffect(() => {
    if (!movement || !isOpen) {
      return;
    }

    setForm({
      type: movement.type,
      amount: String(movement.amount || ''),
      payment_method: movement.payment_method || 'DINHEIRO',
      description: movement.description || '',
      reference_document: movement.reference_document || '',
      counterparty_name: movement.counterparty_name || '',
      expense_supplier_name: movement.expense_supplier_name || '',
      expense_supplier_document: '',
      expense_provider_name: movement.expense_provider_name || '',
      expense_provider_document: '',
      expense_service_description: movement.expense_service_description || '',
      financial_category: movement.financial_category || 'other',
      status: movement.status || 'confirmado',
      edit_reason: '',
    });
    setError('');
  }, [movement, isOpen]);

  if (!isOpen || !movement) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    const amount = Number(form.amount);
    if (!amount || amount <= 0) {
      setError('Informe um valor maior que zero.');
      return;
    }
    if (!form.description.trim()) {
      setError('Informe a descrição do lançamento.');
      return;
    }
    if (!form.edit_reason.trim()) {
      setError('Informe o motivo da edição para rastreabilidade.');
      return;
    }

    const counterpartyName = form.counterparty_name.trim()
      || form.expense_supplier_name.trim()
      || form.expense_provider_name.trim()
      || form.description.trim();

    setLoading(true);
    try {
      if (form.type === 'saida') {
        await ensureCounterpartyCadastro('supplier');
        await ensureCounterpartyCadastro('provider');
      }

      await onSubmit(movement.id, {
        type: form.type,
        amount,
        payment_method: form.payment_method,
        description: form.description.trim(),
        reference_document: form.reference_document.trim() || undefined,
        counterparty_name: counterpartyName,
        expense_supplier_name: form.expense_supplier_name.trim() || undefined,
        expense_provider_name: form.expense_provider_name.trim() || undefined,
        expense_service_description: form.expense_service_description.trim() || undefined,
        financial_category: form.financial_category,
        status: form.status,
        origin: 'manual',
        edit_reason: form.edit_reason.trim(),
      });
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Erro ao editar lançamento.');
    } finally {
      setLoading(false);
    }
  };

  const refreshSuppliers = async () => {
    if (!movement.clinic_id) {
      return;
    }
    const data = await stockSuppliersApi.list(movement.clinic_id);
    setSuppliers(data || []);
  };

  const ensureCounterpartyCadastro = async (kind: 'supplier' | 'provider') => {
    const name = kind === 'supplier' ? form.expense_supplier_name.trim() : form.expense_provider_name.trim();
    const document = kind === 'supplier' ? form.expense_supplier_document.trim() : form.expense_provider_document.trim();

    if (!name || !document) {
      return null;
    }

    const saved = await stockSuppliersApi.ensureFromDocument(movement.clinic_id, {
      name,
      cnpj: document,
      contact_person: kind === 'provider' ? 'Prestador de servico' : null,
    });

    if (saved) {
      setForm((prev) => ({
        ...prev,
        ...(kind === 'supplier'
          ? { expense_supplier_name: saved.name || name, expense_supplier_document: saved.tax_id || saved.cnpj || document }
          : { expense_provider_name: saved.name || name, expense_provider_document: saved.tax_id || saved.cnpj || document }),
      }));
      await refreshSuppliers();
    }

    return saved;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Editar lançamento</h2>
            <p className="text-xs text-slate-500">Informe o motivo da alteração para manter a rastreabilidade.</p>
          </div>
          <button type="button" onClick={onClose} disabled={loading} className="text-slate-400 hover:text-slate-600">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">
              Natureza
              <select
                value={form.type}
                onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as 'entrada' | 'saida' }))}
                disabled={loading}
                className="mt-2 w-full rounded-lg border-2 border-slate-200 px-3 py-2.5 focus:border-blue-500 focus:outline-none"
              >
                <option value="entrada">Receita / Entrada</option>
                <option value="saida">Despesa / Saída</option>
              </select>
            </label>

            <label className="text-sm font-semibold text-slate-700">
              {form.type === 'entrada' ? 'Pagador' : 'Favorecido'}
              <input
                value={form.counterparty_name}
                onChange={(event) => setForm((prev) => ({ ...prev, counterparty_name: event.target.value }))}
                disabled={loading}
                className="mt-2 w-full rounded-lg border-2 border-slate-200 px-3 py-2.5 focus:border-blue-500 focus:outline-none"
              />
            </label>
          </div>

          {form.type === 'saida' && (
            <div className="grid grid-cols-1 gap-4 rounded-lg border border-rose-100 bg-rose-50/40 p-4 md:grid-cols-3">
              <RegisteredCounterpartyField
                label="Fornecedor"
                value={form.expense_supplier_name}
                documentValue={form.expense_supplier_document}
                suppliers={suppliers}
                loading={suppliersLoading}
                disabled={loading}
                onNameChange={(value) => setForm((prev) => ({ ...prev, expense_supplier_name: value }))}
                onDocumentChange={(value) => setForm((prev) => ({ ...prev, expense_supplier_document: value }))}
                onCreate={() => ensureCounterpartyCadastro('supplier').catch((createError: unknown) => {
                  setError(createError instanceof Error ? createError.message : 'Erro ao cadastrar fornecedor.');
                })}
              />
              <RegisteredCounterpartyField
                label="Prestador"
                value={form.expense_provider_name}
                documentValue={form.expense_provider_document}
                suppliers={suppliers}
                loading={suppliersLoading}
                disabled={loading}
                onNameChange={(value) => setForm((prev) => ({ ...prev, expense_provider_name: value }))}
                onDocumentChange={(value) => setForm((prev) => ({ ...prev, expense_provider_document: value }))}
                onCreate={() => ensureCounterpartyCadastro('provider').catch((createError: unknown) => {
                  setError(createError instanceof Error ? createError.message : 'Erro ao cadastrar prestador.');
                })}
              />
              <label className="text-sm font-semibold text-slate-700">
                Serviço / Despesa
                <input
                  value={form.expense_service_description}
                  onChange={(event) => setForm((prev) => ({ ...prev, expense_service_description: event.target.value }))}
                  disabled={loading}
                  className="mt-2 w-full rounded-lg border-2 border-slate-200 bg-white px-3 py-2.5 focus:border-blue-500 focus:outline-none"
                />
              </label>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">
              Valor (R$)
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
                disabled={loading}
                className="mt-2 w-full rounded-lg border-2 border-slate-200 px-3 py-2.5 font-semibold focus:border-blue-500 focus:outline-none"
              />
            </label>

            <label className="text-sm font-semibold text-slate-700">
              Forma de pagamento
              <select
                value={form.payment_method}
                onChange={(event) => setForm((prev) => ({ ...prev, payment_method: event.target.value }))}
                disabled={loading}
                className="mt-2 w-full rounded-lg border-2 border-slate-200 px-3 py-2.5 focus:border-blue-500 focus:outline-none"
              >
                {Object.entries(PAYMENT_METHODS).map(([key]) => (
                  <option key={key} value={key}>
                    {PAYMENT_METHOD_LABELS[key as keyof typeof PAYMENT_METHOD_LABELS] || key}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">
              Categoria financeira
              <select
                value={form.financial_category}
                onChange={(event) => setForm((prev) => ({ ...prev, financial_category: event.target.value }))}
                disabled={loading}
                className="mt-2 w-full rounded-lg border-2 border-slate-200 px-3 py-2.5 focus:border-blue-500 focus:outline-none"
              >
                {FINANCIAL_CATEGORIES.map((category) => (
                  <option key={category.value} value={category.value}>{category.label}</option>
                ))}
              </select>
            </label>

            <label className="text-sm font-semibold text-slate-700">
              Documento / Referência
              <input
                value={form.reference_document}
                onChange={(event) => setForm((prev) => ({ ...prev, reference_document: event.target.value }))}
                disabled={loading}
                className="mt-2 w-full rounded-lg border-2 border-slate-200 px-3 py-2.5 focus:border-blue-500 focus:outline-none"
              />
            </label>
          </div>

          <label className="block text-sm font-semibold text-slate-700">
            Descrição
            <textarea
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              disabled={loading}
              rows={2}
              className="mt-2 w-full rounded-lg border-2 border-slate-200 px-3 py-2.5 focus:border-blue-500 focus:outline-none"
            />
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            Motivo da edição
            <textarea
              value={form.edit_reason}
              onChange={(event) => setForm((prev) => ({ ...prev, edit_reason: event.target.value }))}
              disabled={loading}
              rows={3}
              className="mt-2 w-full rounded-lg border-2 border-amber-200 bg-amber-50/40 px-3 py-2.5 focus:border-amber-500 focus:outline-none"
              placeholder="Ex: Correção de valor lançado incorretamente. Valor correto R$ 30,00."
            />
          </label>
        </div>

        <div className="flex gap-3 border-t border-slate-100 p-5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-lg border-2 border-slate-200 px-4 py-3 font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Save size={18} />
            {loading ? 'Salvando...' : 'Salvar edição'}
          </button>
        </div>
      </form>
    </div>
  );
}
