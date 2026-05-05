// src/pages/clinica/financeiro/NovaConta.jsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import PageLayout from '@/components/ui/PageLayout';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import SupplierSelect from '@/components/clinica/estoque/SupplierSelect';
import StockSupplierDialog from '@/components/clinica/estoque/StockSupplierDialog';
import { stockItemsApi } from '@/lib/stockApi';
import { supabase } from '@/lib/customSupabaseClient';
import {
  createAP,
  listAccountPlans,
  listVendorNames,
  listPaymentMethods,
  listAPQuery,
  createRecurringAP,
  listInvoicesBasic,
} from '@/lib/financeApi';
import { Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function NovaConta() {
  const { clinicId } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    vendor_name: '',
    supplier_id: '',
    description: '',
    due_date: '',
    amount: '',
    notes: '',
    payment_method: '',
    installments: '',
    document_number: '',
    status: 'open',
    category_id: '',
  });
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [newSupplierOpen, setNewSupplierOpen] = useState(false);
  const [supplierReloadKey, setSupplierReloadKey] = useState(0);
  const [showItems, setShowItems] = useState(false);

  const [paymentTermsOptions, setPaymentTermsOptions] = useState([
    'À vista (0)',
    '15 dias',
    '30 dias',
    '45 dias',
    '60 dias',
    '90 dias',
    '30/60',
    '30/60/90',
  ]);
  const [selectedTerm, setSelectedTerm] = useState('');
  const [termDaysPattern, setTermDaysPattern] = useState(null);
  const [isInstallment, setIsInstallment] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurring, setRecurring] = useState({
    frequency: 'monthly',
    start_date: '',
    end_date: '',
    no_end_date: true,
    auto_generate: true,
  });

  const [costCenters, setCostCenters] = useState([]);
  const [vendorOptions, setVendorOptions] = useState([]);
  const [paymentMethodOptions, setPaymentMethodOptions] = useState([]);
  const [productOptions, setProductOptions] = useState([]);
  const [invoiceOptions, setInvoiceOptions] = useState([]);
  const [errors, setErrors] = useState({});
  const mergedPaymentMethods = useMemo(() => {
    const suggestions = ['Boleto', 'Pix', 'Dinheiro', 'Cartão', 'Transferência'];
    const seen = new Set();
    const out = [];
    for (const m of suggestions) {
      const t = m.trim();
      if (t && !seen.has(t)) {
        seen.add(t);
        out.push(t);
      }
    }
    for (const m of paymentMethodOptions) {
      const t = (m || '').trim();
      if (t && !seen.has(t)) {
        seen.add(t);
        out.push(t);
      }
    }
    const cur = (form.payment_method || '').trim();
    if (cur && !seen.has(cur)) {
      out.unshift(cur);
    }
    return out;
  }, [paymentMethodOptions, form.payment_method]);

  const [formItems, setFormItems] = useState([]); // { name, productId, qty, unit }
  const [nfTaxes, setNfTaxes] = useState({
    irPct: 0,
    csllPct: 0,
    pisCofinsPct: 0,
    issPct: 0,
    icmsPct: 0,
    retained: true,
  });

  const itemsSubtotal = useMemo(() => {
    return (formItems || []).reduce(
      (sum, it) => sum + Number(it.qty || 0) * Number(it.unit || 0),
      0,
    );
  }, [formItems]);
  const nfTaxAmounts = useMemo(() => {
    const base = itemsSubtotal;
    const ir = base * (Number(nfTaxes.irPct || 0) / 100);
    const csll = base * (Number(nfTaxes.csllPct || 0) / 100);
    const pisCofins = base * (Number(nfTaxes.pisCofinsPct || 0) / 100);
    const iss = base * (Number(nfTaxes.issPct || 0) / 100);
    const icms = base * (Number(nfTaxes.icmsPct || 0) / 100);
    return { ir, csll, pisCofins, iss, icms };
  }, [itemsSubtotal, nfTaxes]);
  const itemsTaxTotal = useMemo(() => {
    const { ir, csll, pisCofins, iss, icms } = nfTaxAmounts;
    return ir + csll + pisCofins + iss + icms;
  }, [nfTaxAmounts]);
  const itemsGrandTotal = useMemo(() => {
    const base = itemsSubtotal;
    const tax = itemsTaxTotal;
    const t = nfTaxes.retained ? base - tax : base + tax;
    return Number(t.toFixed(2));
  }, [itemsSubtotal, itemsTaxTotal, nfTaxes]);
  useEffect(() => {
    if ((formItems || []).length > 0) {
      setForm((f) => ({ ...f, amount: String(itemsGrandTotal) }));
    }
  }, [formItems, itemsGrandTotal]);

  useEffect(() => {
    if (!clinicId) {
      return;
    }
    (async () => {
      try {
        const d = await listAccountPlans(clinicId);
        setCostCenters(Array.isArray(d) ? d : []);
      } catch (e) {
        console.warn(e);
      }
    })();
  }, [clinicId]);
  useEffect(() => {
    if (!clinicId) {
      return;
    }
    (async () => {
      try {
        const names = await listVendorNames(clinicId);
        setVendorOptions(Array.isArray(names) ? names : []);
      } catch (e) {
        console.warn(e);
      }
    })();
  }, [clinicId]);
  useEffect(() => {
    if (!clinicId) {
      return;
    }
    (async () => {
      try {
        const m = await listPaymentMethods(clinicId);
        setPaymentMethodOptions(Array.isArray(m) ? m : []);
      } catch (e) {
        console.warn(e);
      }
    })();
  }, [clinicId]);
  useEffect(() => {
    if (!clinicId) {
      return;
    }
    (async () => {
      try {
        const items = await stockItemsApi.list(clinicId);
        const names = (items || [])
          .map((i) => ({ id: i.id, name: i.name, unit_symbol: i.unit_symbol }))
          .filter((i) => i.name && i.name.trim());
        setProductOptions(names);
      } catch (e) {
        console.warn(e);
      }
    })();
  }, [clinicId]);
  // Carregar faturas para vincular receita ao repasse
  useEffect(() => {
    if (!clinicId) {
      return;
    }
    (async () => {
      try {
        const rows = await listInvoicesBasic(clinicId, { limit: 200 });
        setInvoiceOptions(rows);
      } catch (e) {
        console.warn(e);
      }
    })();
  }, [clinicId]);
  const isRepasseCategory = useMemo(() => {
    const cc = (costCenters || []).find((c) => String(c.id) === String(form.category_id));
    return cc && String(cc.name || '').toLowerCase() === 'repasse médico';
  }, [costCenters, form.category_id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'amount') {
      const num = Math.max(0, Number(value || 0));
      setForm((prev) => ({ ...prev, amount: String(Number.isFinite(num) ? num : 0) }));
      setErrors((prev) => ({ ...prev, amount: num <= 0 ? 'Valor obrigatório' : null }));
    } else if (name === 'due_date') {
      setForm((prev) => ({ ...prev, due_date: value }));
      setErrors((prev) => ({ ...prev, due_date: !value ? 'Vencimento obrigatório' : null }));
    } else if (name === 'installments') {
      const n = parseInt(value || '0', 10);
      setForm((prev) => ({ ...prev, installments: String(n) }));
      setErrors((prev) => ({
        ...prev,
        installments: n < 2 && isInstallment ? 'Parcelas devem ser ≥ 2' : null,
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Sugestões de vencimento baseadas na forma de pagamento
  useEffect(() => {
    const pm = form.payment_method || '';
    if (!pm) {
      return;
    }
    if (!form.due_date) {
      const d = new Date();
      if (/boleto/i.test(pm)) {
        d.setDate(d.getDate() + 30);
      }
      if (/pix|dinheiro/i.test(pm)) {
        /* hoje */
      }
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      setForm((f) => ({ ...f, due_date: iso }));
    }
  }, [form.payment_method]);

  // Sugerir impostos ao trocar plano de contas para Serviços (se todos zero)
  useEffect(() => {
    if (!form.category_id) {
      return;
    }
    const cc = (costCenters || []).find((c) => String(c.id) === String(form.category_id));
    const isService =
      cc &&
      String(cc.name || '')
        .toLowerCase()
        .includes('servi');
    const allZero = [
      nfTaxes.irPct,
      nfTaxes.csllPct,
      nfTaxes.pisCofinsPct,
      nfTaxes.issPct,
      nfTaxes.icmsPct,
    ].every((v) => Number(v || 0) === 0);
    if (isService && allZero) {
      setNfTaxes((t) => ({ ...t, issPct: Math.max(Number(t.issPct || 0), 5) }));
    }
  }, [form.category_id]);

  const applyVendorDefaults = useCallback(
    async (supplierId, supplierName) => {
      try {
        const rows = await listAPQuery({
          clinicId,
          vendor: supplierName,
          limit: 1,
          orderBy: 'due_date',
          orderDir: 'desc',
        });
        const last = Array.isArray(rows) && rows.length ? rows[0] : null;
        const patch = {};
        if (last) {
          if (last.category_id) {
            patch.category_id = last.category_id;
          }
          if (last.payment_method) {
            patch.payment_method = last.payment_method;
          }
          if (last.amount) {
            patch.amount = String(last.amount);
          }
        }
        if (Object.keys(patch).length) {
          setForm((f) => ({ ...f, ...patch }));
        }
        if (last) {
          setNfTaxes((t) => ({
            ...t,
            irPct: typeof last.ir_pct === 'number' ? last.ir_pct : t.irPct,
            csllPct: typeof last.csll_pct === 'number' ? last.csll_pct : t.csllPct,
            pisCofinsPct:
              typeof last.pis_cofins_pct === 'number' ? last.pis_cofins_pct : t.pisCofinsPct,
            issPct: typeof last.iss_pct === 'number' ? last.iss_pct : t.issPct,
            icmsPct: typeof last.icms_pct === 'number' ? last.icms_pct : t.icmsPct,
          }));
        }
        // Heurística: se plano de contas indicar "Serviço" e impostos zerados, sugerir ISS 5%
        const cc = (costCenters || []).find(
          (c) => String(c.id) === String(patch.category_id || form.category_id),
        );
        const isService =
          cc &&
          String(cc.name || '')
            .toLowerCase()
            .includes('servi');
        const allZero = [
          nfTaxes.irPct,
          nfTaxes.csllPct,
          nfTaxes.pisCofinsPct,
          nfTaxes.issPct,
          nfTaxes.icmsPct,
        ].every((v) => Number(v || 0) === 0);
        if (isService && allZero && !last) {
          setNfTaxes((t) => ({ ...t, issPct: 5 }));
        }
      } catch (e) {
        console.warn('applyVendorDefaults error', e?.message || e);
      }
    },
    [clinicId, costCenters, nfTaxes, form.category_id],
  );

  const uploadAttachmentFile = async (file) => {
    if (!file || !clinicId) {
      return null;
    }
    try {
      const now = new Date();
      const safeId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const path = `${clinicId}/ap_docs/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${safeId}_${file.name}`;
      const { error } = await supabase.storage
        .from('finance_docs')
        .upload(path, file, { upsert: true });
      if (error) {
        return null;
      }
      const { data } = supabase.storage.from('finance_docs').getPublicUrl(path);
      return data?.publicUrl || null;
    } catch {
      return null;
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!clinicId) {
      errs.generic = 'Sem clínica ativa';
    }
    if (!form.vendor_name) {
      errs.vendor_name = 'Fornecedor obrigatório';
    }
    const total =
      Number(formItems && formItems.length > 0 ? itemsGrandTotal : form.amount || 0) || 0;
    if (!form.due_date) {
      errs.due_date = 'Vencimento obrigatório';
    }
    if (total <= 0) {
      errs.amount = 'Valor obrigatório';
    }
    if (isInstallment) {
      const parcels = Math.max(0, parseInt(form.installments || '0', 10));
      if (parcels < 2) {
        errs.installments = 'Parcelas devem ser ≥ 2';
      }
      const per = parcels > 0 ? total / parcels : 0;
      if (per <= 0.01) {
        errs.installments = 'Valor por parcela muito baixo';
      }
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      return;
    }
    if (!form.category_id) {
      toast({
        variant: 'destructive',
        title: 'Categoria obrigatória',
        description: 'Selecione o Plano de Contas.',
      });
      return;
    }
    try {
      const docUrl = attachmentFile ? await uploadAttachmentFile(attachmentFile) : null;
      const itemsNote =
        formItems && formItems.length > 0
          ? (() => {
              const lines = formItems.map((it, idx) => {
                const q = Number(it.qty || 0);
                const u = Number(it.unit || 0);
                const tot = q * u;
                return `${idx + 1}) ${it?.name || 'Produto'} — qte ${q}, unit ${u.toFixed(2)}, total ${tot.toFixed(2)}`;
              });
              lines.push(`Subtotal: ${itemsSubtotal.toFixed(2)}`);
              const amounts = {
                ir: nfTaxAmounts.ir,
                csll: nfTaxAmounts.csll,
                pisCofins: nfTaxAmounts.pisCofins,
                iss: nfTaxAmounts.iss,
                icms: nfTaxAmounts.icms,
              };
              lines.push(
                `Impostos (NF): IR ${nfTaxes.irPct}%=${amounts.ir.toFixed(2)} | CSLL ${nfTaxes.csllPct}%=${amounts.csll.toFixed(2)} | PIS/COFINS ${nfTaxes.pisCofinsPct}%=${amounts.pisCofins.toFixed(2)} | ISS ${nfTaxes.issPct}%=${amounts.iss.toFixed(2)} | ICMS ${nfTaxes.icmsPct}%=${amounts.icms.toFixed(2)} | Total=${itemsTaxTotal.toFixed(2)}`,
              );
              lines.push(
                `Total (após impostos ${nfTaxes.retained ? 'retidos' : 'adicionados'}): ${itemsGrandTotal.toFixed(2)}`,
              );
              return `Itens: ${lines.join(' | ')}`;
            })()
          : null;
      const sharedNotes = [form.notes, itemsNote, docUrl ? `Anexo: ${docUrl}` : null]
        .filter(Boolean)
        .join(' | ');
      const total =
        Number(formItems && formItems.length > 0 ? itemsGrandTotal : form.amount || 0) || 0;
      const descriptionAuto = (() => {
        if (formItems && formItems.length > 0) {
          const first = formItems[0]?.name || 'NF';
          const extras = formItems.length > 1 ? ` (+${formItems.length - 1} produtos)` : '';
          return `${first}${extras}`;
        }
        return form.description || 'Despesa';
      })();

      const itemsPayload = (formItems || []).map((it) => ({
        stock_item_id: it?.productId || null,
        name: it?.name || 'Produto',
        qty: Number(it?.qty || 0),
        unit_value: Number(it?.unit || 0),
        total_value: Number(it?.qty || 0) * Number(it?.unit || 0),
      }));

      const shouldCreateImmediateAP = !isRecurring || !!recurring.auto_generate;

      let firstCreated = null;
      if (Array.isArray(termDaysPattern) && termDaysPattern.length > 0) {
        const parcels = termDaysPattern.length;
        const amountPer = Number((total / parcels).toFixed(2));
        const baseDate = new Date();
        baseDate.setHours(0, 0, 0, 0);
        if (shouldCreateImmediateAP) {
          for (let i = 0; i < parcels; i++) {
            const d = new Date(baseDate);
            d.setDate(d.getDate() + termDaysPattern[i]);
            const dueIso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const created = await createAP(clinicId, {
              vendor_name: form.vendor_name,
              description: descriptionAuto,
              due_date: dueIso,
              amount: amountPer,
              payment_method: form.payment_method,
              installments: parcels,
              document_number: form.document_number,
              notes: [sharedNotes, `Parcela ${i + 1}/${parcels}`].filter(Boolean).join(' | '),
              status: form.status,
              category_id: form.category_id || null,
              document_url: docUrl || null,
              ir_pct: Number(nfTaxes.irPct || 0),
              csll_pct: Number(nfTaxes.csllPct || 0),
              pis_cofins_pct: Number(nfTaxes.pisCofinsPct || 0),
              iss_pct: Number(nfTaxes.issPct || 0),
              icms_pct: Number(nfTaxes.icmsPct || 0),
              taxes_retained: !!nfTaxes.retained,
              items: itemsPayload,
            });
            if (!firstCreated) {
              firstCreated = created;
            }
          }
        }
      } else {
        const parcels = isInstallment ? Math.max(2, parseInt(form.installments || '2', 10)) : 1;
        const amountPer = parcels > 1 ? Number((total / parcels).toFixed(2)) : total;
        const basePayload = {
          vendor_name: form.vendor_name,
          description: descriptionAuto,
          due_date: form.due_date,
          amount: amountPer,
          payment_method: form.payment_method,
          installments: parcels,
          document_number: form.document_number,
          notes: sharedNotes,
          status: form.status,
          category_id: form.category_id || null,
          document_url: docUrl || null,
          ir_pct: Number(nfTaxes.irPct || 0),
          csll_pct: Number(nfTaxes.csllPct || 0),
          pis_cofins_pct: Number(nfTaxes.pisCofinsPct || 0),
          iss_pct: Number(nfTaxes.issPct || 0),
          icms_pct: Number(nfTaxes.icmsPct || 0),
          taxes_retained: !!nfTaxes.retained,
          items: itemsPayload,
          // Repasse linkage if category is Repasse Médico
          repasse_doctor_name: isRepasseCategory ? form.repasse_doctor_name || '' : null,
          linked_invoice_id: isRepasseCategory ? form.linked_invoice_id || null : null,
          linked_service: isRepasseCategory ? form.linked_service || '' : null,
          linked_revenue: isRepasseCategory ? Number(form.linked_revenue || 0) : null,
        };
        if (shouldCreateImmediateAP) {
          if (parcels === 1) {
            firstCreated = await createAP(clinicId, basePayload);
          } else {
            const start = new Date(form.due_date);
            for (let i = 0; i < parcels; i++) {
              const d = new Date(start);
              d.setMonth(d.getMonth() + i);
              const dueIso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              const created = await createAP(clinicId, {
                ...basePayload,
                due_date: dueIso,
                notes: [basePayload.notes, `Parcela ${i + 1}/${parcels}`]
                  .filter(Boolean)
                  .join(' | '),
              });
              if (!firstCreated) {
                firstCreated = created;
              }
            }
          }
        }
      }

      // Persistir definição recorrente, se marcado
      if (isRecurring) {
        const freq = recurring.frequency || 'monthly';
        await createRecurringAP(clinicId, {
          supplier_id: form.supplier_id || null,
          description: descriptionAuto,
          value: total,
          frequency: freq,
          start_date: recurring.start_date || form.due_date || null,
          end_date: recurring.no_end_date ? null : recurring.end_date || null,
          chart_account_id: form.category_id || null,
          cost_center: null,
          payment_method: form.payment_method || null,
          active: true,
        });
      }
      if (
        firstCreated &&
        attachmentFile &&
        docUrl &&
        (!firstCreated.document_url || String(firstCreated.document_url) !== String(docUrl))
      ) {
        toast({
          title: 'Anexo salvo parcialmente',
          description: 'A URL do documento não pôde ser persistida (coluna ausente).',
          variant: 'destructive',
        });
      }
      toast({ title: 'Conta criada com sucesso!' });
      navigate('/clinica/financeiro/pagar');
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao criar conta', description: err.message });
    }
  };

  return (
    <PageLayout title="Nova Conta">
      <div className="w-full mx-auto px-3 md:px-4 space-y-4">
        {/* Resumo em destaque (full-width) */}
        <div className="border rounded-md p-3 bg-gray-50 space-y-2 text-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <div className="text-xs text-gray-600">Total a pagar</div>
              <div className="text-base font-semibold text-gray-900">
                {itemsGrandTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-600">Forma de pagamento</div>
              <div className="font-medium">{form.payment_method || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-600">Vencimento</div>
              <div className="font-medium">
                {form.due_date ? new Date(form.due_date).toLocaleDateString('pt-BR') : '—'}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <div className="text-xs text-gray-600">Fornecedor</div>
              <div className="font-medium">{form.vendor_name || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-600">Centro de custo / Plano de contas</div>
              <div className="font-medium">{form.category_id || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-600">NF/Documento</div>
              <div className="font-medium break-words">{form.document_number || '—'}</div>
            </div>
          </div>
        </div>

        {/* Seção 3.1 — Lançamento recorrente */}
        <div className="border rounded-md p-3 space-y-3">
          <div className="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-2 mb-3">
            Lançamento recorrente
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={isRecurring} onCheckedChange={(v) => setIsRecurring(Boolean(v))} />
            <Label>Ativar lançamento recorrente</Label>
          </div>
          {isRecurring && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-gray-600 font-medium">Frequência</Label>
                <select
                  className="w-full border rounded h-9 px-3 py-1.5 text-sm"
                  value={recurring.frequency}
                  onChange={(e) => setRecurring((r) => ({ ...r, frequency: e.target.value }))}
                >
                  <option value="monthly">Mensal</option>
                  <option value="bimonthly">Bimestral</option>
                  <option value="quarterly">Trimestral</option>
                  <option value="yearly">Anual</option>
                </select>
              </div>
              <div>
                <Label className="text-xs text-gray-600 font-medium">Data inicial</Label>
                <Input
                  className="h-9 px-3 py-1.5 text-sm"
                  type="date"
                  value={recurring.start_date}
                  onChange={(e) => setRecurring((r) => ({ ...r, start_date: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs text-gray-600 font-medium">Data final</Label>
                <Input
                  className="h-9 px-3 py-1.5 text-sm"
                  type="date"
                  value={recurring.end_date}
                  onChange={(e) => setRecurring((r) => ({ ...r, end_date: e.target.value }))}
                  disabled={recurring.no_end_date}
                />
                <div className="flex items-center gap-2 mt-1">
                  <Checkbox
                    checked={recurring.no_end_date}
                    onCheckedChange={(v) =>
                      setRecurring((r) => ({ ...r, no_end_date: Boolean(v) }))
                    }
                  />
                  <div className="text-xs text-gray-600">Sem data final</div>
                </div>
              </div>
              <div className="md:col-span-3">
                <Label className="text-xs text-gray-600 font-medium">Geração</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="recgen"
                      checked={!!recurring.auto_generate}
                      onChange={() => setRecurring((r) => ({ ...r, auto_generate: true }))}
                    />
                    Gerar lançamentos automaticamente
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="recgen"
                      checked={!recurring.auto_generate}
                      onChange={() => setRecurring((r) => ({ ...r, auto_generate: false }))}
                    />
                    Gerar apenas no vencimento
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Seções compactas estilo ERP */}
        {/* Seção 1 — Dados principais */}
        <div className="border rounded-md p-3 space-y-3">
          <div className="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-2 mb-3">
            Dados principais
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Fornecedor com botão novo */}
            <div className="md:col-span-1">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <SupplierSelect
                    clinicId={clinicId}
                    value={form.vendor_name}
                    supplierId={form.supplier_id}
                    onChange={({ supplier, supplierId }) => {
                      setForm((f) => ({ ...f, vendor_name: supplier, supplier_id: supplierId }));
                      setErrors((prev) => ({
                        ...prev,
                        vendor_name: !supplier ? 'Fornecedor obrigatório' : null,
                      }));
                      applyVendorDefaults(supplierId, supplier);
                    }}
                    reloadKey={supplierReloadKey}
                  />
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        title="Novo fornecedor"
                        onClick={() => setNewSupplierOpen(true)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Novo fornecedor</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            {/* Plano de contas (centro de custo) */}
            <div>
              <Label className="text-xs text-gray-600 font-medium">
                Centro de custo / Plano de contas
              </Label>
              {costCenters.length > 0 ? (
                <select
                  className="w-full border rounded h-9 px-3 py-1.5 text-sm mt-1"
                  name="category_id"
                  value={form.category_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">Selecione...</option>
                  {costCenters
                    .filter((c) => !!c.parent_id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              ) : (
                <Input
                  className="mt-1 h-9 px-3 py-1.5 text-sm"
                  name="category_id"
                  value={form.category_id}
                  onChange={handleChange}
                  placeholder="Selecione o centro de custo"
                />
              )}
            </div>
            {/* Forma de pagamento */}
            <div>
              <Label className="text-xs text-gray-600 font-medium">Forma de pagamento</Label>
              <div className="flex items-center gap-2 mt-1">
                <select
                  className="flex-1 border rounded h-9 px-3 py-1.5 text-sm"
                  name="payment_method"
                  value={form.payment_method}
                  onChange={handleChange}
                  required
                >
                  <option value="">Selecione...</option>
                  {mergedPaymentMethods.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  title="Adicionar método"
                  onClick={() => {
                    const name = (window.prompt('Novo método de pagamento') || '').trim();
                    if (!name) {
                      return;
                    }
                    if (!paymentMethodOptions.includes(name)) {
                      setPaymentMethodOptions((prev) => [...prev, name]);
                    }
                    setForm((f) => ({ ...f, payment_method: name }));
                  }}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Seção 2 — Datas e valores */}
        <div className="border rounded-md p-3 space-y-3">
          <div className="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-2 mb-3">
            Datas e valores
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs text-gray-600 font-medium">Emissão</Label>
              <Input
                className="h-9 px-3 py-1.5 text-sm"
                type="date"
                name="issue_date"
                value={form.issue_date || ''}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label className="text-xs text-gray-600 font-medium">Vencimento</Label>
              <Input
                className="h-9 px-3 py-1.5 text-sm"
                type="date"
                name="due_date"
                value={form.due_date}
                onChange={handleChange}
                required
              />
              {errors.due_date && (
                <div className="text-xs text-red-600 mt-1">{errors.due_date}</div>
              )}
            </div>
            <div>
              <Label className="text-xs text-gray-600 font-medium">Prazo de vencimento</Label>
              <div className="flex items-center gap-2">
                <select
                  className="flex-1 border rounded h-9 px-3 py-1.5 text-sm"
                  value={selectedTerm}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedTerm(val);
                    const mSeq = val.match(/^(\d+(?:\/\d+)+)$/);
                    const mDays = val.match(/(\d+)\s*dias|\((\d+)\)/i);
                    if (mSeq) {
                      const parts = mSeq[1]
                        .split('/')
                        .map((n) => parseInt(n, 10))
                        .filter((n) => !isNaN(n));
                      if (parts.length) {
                        setTermDaysPattern(parts);
                        setIsInstallment(true);
                        setForm((f) => ({ ...f, installments: String(parts.length) }));
                        const base = new Date();
                        base.setDate(base.getDate() + parts[0]);
                        const iso = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`;
                        setForm((f) => ({ ...f, due_date: iso }));
                      }
                    } else if (mDays) {
                      const d = parseInt(mDays[1] || mDays[2], 10);
                      if (!isNaN(d)) {
                        setTermDaysPattern(null);
                        const base = new Date();
                        base.setDate(base.getDate() + d);
                        const iso = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`;
                        setForm((f) => ({ ...f, due_date: iso }));
                      }
                    } else {
                      setTermDaysPattern(null);
                    }
                  }}
                >
                  <option value="">Selecione...</option>
                  {paymentTermsOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  title="Adicionar prazo"
                  onClick={() => {
                    const v = (window.prompt('Novo prazo (ex.: 30 dias ou 30/60/90)') || '').trim();
                    if (!v) {
                      return;
                    }
                    if (!paymentTermsOptions.includes(v)) {
                      setPaymentTermsOptions((prev) => [...prev, v]);
                    }
                    setSelectedTerm(v);
                  }}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-xs text-gray-600 font-medium">Valor</Label>
              <Input
                className="h-9 px-3 py-1.5 text-sm"
                type="number"
                step="0.01"
                name="amount"
                value={form.amount}
                onChange={handleChange}
                onBlur={() =>
                  setForm((f) => ({ ...f, amount: String(Number(f.amount || 0).toFixed(2)) }))
                }
                placeholder="0,00"
                required
                disabled={formItems.length > 0}
              />
              {formItems.length > 0 && (
                <div className="text-xs text-gray-500 mt-1">Automático pelo total dos itens.</div>
              )}
              {errors.amount && <div className="text-xs text-red-600 mt-1">{errors.amount}</div>}
            </div>
          </div>
        </div>

        {/* Seção 3 — Documento e parcelamento */}
        {/* Seção Repasse Médico (aparece quando categoria = Repasse Médico) */}
        {isRepasseCategory && (
          <div className="border rounded-md p-3 space-y-3">
            <div className="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-2 mb-3">
              Repasse Médico
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-gray-600 font-medium">Médico</Label>
                <Input
                  className="h-9 px-3 py-1.5 text-sm"
                  name="repasse_doctor_name"
                  value={form.repasse_doctor_name || ''}
                  onChange={handleChange}
                  placeholder="Nome do médico"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-600 font-medium">Receita vinculada</Label>
                <select
                  className="w-full border rounded h-9 px-3 py-1.5 text-sm mt-1"
                  name="linked_invoice_id"
                  value={form.linked_invoice_id || ''}
                  onChange={handleChange}
                >
                  <option value="">Selecione...</option>
                  {invoiceOptions.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs text-gray-600 font-medium">Serviço</Label>
                <Input
                  className="h-9 px-3 py-1.5 text-sm"
                  name="linked_service"
                  value={form.linked_service || ''}
                  onChange={handleChange}
                  placeholder="Ex.: Consulta"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-600 font-medium">Valor da receita</Label>
                <Input
                  className="h-9 px-3 py-1.5 text-sm"
                  type="number"
                  step="0.01"
                  name="linked_revenue"
                  value={form.linked_revenue || ''}
                  onChange={handleChange}
                  placeholder="0,00"
                />
              </div>
            </div>
          </div>
        )}
        <div className="border rounded-md p-3 space-y-3">
          <div className="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-2 mb-3">
            Documento e parcelas
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-gray-600 font-medium">NF / Documento</Label>
              <Input
                className="h-9 px-3 py-1.5 text-sm"
                name="document_number"
                value={form.document_number}
                onChange={handleChange}
                placeholder="Ex.: NF 12345"
              />
            </div>
            <div className="flex items-center gap-2 md:justify-end">
              <Checkbox
                checked={isInstallment}
                onCheckedChange={(v) => setIsInstallment(Boolean(v))}
              />
              <Label>Conta parcelada</Label>
            </div>
          </div>
          {isInstallment && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-gray-600 font-medium">Nº de parcelas</Label>
                <Input
                  className="h-9 px-3 py-1.5 text-sm"
                  type="number"
                  min="2"
                  name="installments"
                  value={form.installments}
                  onChange={handleChange}
                  placeholder="2"
                />
                {errors.installments && (
                  <div className="text-xs text-red-600 mt-1">{errors.installments}</div>
                )}
              </div>
              <div className="md:col-span-2 flex items-end">
                <div className="text-xs text-gray-600">
                  Valor automático por parcela e vencimento mensal serão gerados.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Seção Produtos (NF) – opcional, recolhível para reduzir scroll */}
        <div className="border rounded-md p-3 space-y-3">
          <div className="flex items-center justify-between border-b border-gray-200 pb-2 mb-3">
            <div className="text-sm font-semibold text-gray-700">Produtos (NF)</div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setFormItems((prev) => [...prev, { name: '', productId: null, qty: 1, unit: 0 }])
                }
              >
                <Plus className="w-4 h-4 mr-1" /> Adicionar produto
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowItems((s) => !s)}>
                {showItems ? 'Ocultar' : 'Exibir'}
              </Button>
            </div>
          </div>
          {showItems && (
            <>
              {formItems.length > 0 && (
                <div className="overflow-x-auto border rounded-md">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-2 py-2 w-[40%]">Produto</th>
                        <th className="text-right px-2 py-2 w-[12%]">Qtde</th>
                        <th className="text-right px-2 py-2 w-[22%]">Valor unit.</th>
                        <th className="text-right px-2 py-2 w-[20%]">Total item</th>
                        <th className="px-2 py-2 w-[6%]"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {formItems.map((it, idx) => {
                        const q = Number(it.qty || 0);
                        const u = Number(it.unit || 0);
                        const tot = q * u;
                        return (
                          <tr key={idx} className="border-t">
                            <td className="px-2 py-1">
                              <div className="flex items-center gap-2">
                                <select
                                  className="flex-1 border rounded h-8 px-2 text-sm"
                                  value={it.productId || ''}
                                  onChange={(e) => {
                                    const id = e.target.value || null;
                                    const found = productOptions.find(
                                      (p) => String(p.id) === String(id),
                                    );
                                    setFormItems((prev) =>
                                      prev.map((r, i) =>
                                        i === idx
                                          ? { ...r, productId: id, name: found?.name || r.name }
                                          : r,
                                      ),
                                    );
                                  }}
                                >
                                  <option value="">Selecione um produto</option>
                                  {productOptions.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.name}
                                    </option>
                                  ))}
                                </select>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  title="Novo produto"
                                  onClick={async () => {
                                    const name = (
                                      window.prompt('Nome do novo produto') || ''
                                    ).trim();
                                    if (!name) {
                                      return;
                                    }
                                    try {
                                      const created = await stockItemsApi.create(clinicId, {
                                        name,
                                      });
                                      setProductOptions((prev) => [
                                        { id: created.id, name: created.name },
                                        ...prev,
                                      ]);
                                      setFormItems((prev) =>
                                        prev.map((r, i) =>
                                          i === idx
                                            ? { ...r, productId: created.id, name: created.name }
                                            : r,
                                        ),
                                      );
                                    } catch (err) {
                                      toast({
                                        variant: 'destructive',
                                        title: 'Erro ao criar produto',
                                        description: err.message,
                                      });
                                    }
                                  }}
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                            <td className="px-2 py-1 text-right">
                              <Input
                                className="h-9 px-3 py-1.5 text-sm text-right"
                                type="number"
                                min="0"
                                step="1"
                                value={it.qty}
                                onChange={(e) =>
                                  setFormItems((prev) =>
                                    prev.map((r, i) =>
                                      i === idx ? { ...r, qty: e.target.value } : r,
                                    ),
                                  )
                                }
                              />
                            </td>
                            <td className="px-2 py-1 text-right">
                              <Input
                                className="h-9 px-3 py-1.5 text-sm text-right"
                                type="number"
                                min="0"
                                step="0.01"
                                value={it.unit}
                                onChange={(e) =>
                                  setFormItems((prev) =>
                                    prev.map((r, i) =>
                                      i === idx ? { ...r, unit: e.target.value } : r,
                                    ),
                                  )
                                }
                              />
                            </td>
                            <td className="px-2 py-1 text-right whitespace-nowrap">
                              {tot.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </td>
                            <td className="px-2 py-1 text-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() =>
                                  setFormItems((prev) => prev.filter((_, i) => i !== idx))
                                }
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {formItems.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm mt-2">
                  <div className="p-2 rounded bg-gray-50">
                    Subtotal:{' '}
                    <strong>
                      {itemsSubtotal.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </strong>
                  </div>
                  <div className="p-2 rounded bg-gray-50">
                    Produtos adicionados: <strong>{formItems.length}</strong>
                  </div>
                  <div className="p-2 rounded bg-gray-100">
                    Total (após impostos):{' '}
                    <strong>
                      {itemsGrandTotal.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </strong>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Seção 4 — Impostos (compacto) */}
        <div className="border rounded-md p-3 space-y-3">
          <div className="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-2 mb-3">
            Impostos (se aplicável)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-gray-600 font-medium">ISS</Label>
              <Input
                className="h-9 px-3 py-1.5 text-sm"
                type="number"
                step="0.01"
                value={nfTaxes.issPct}
                onChange={(e) => setNfTaxes((t) => ({ ...t, issPct: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs text-gray-600 font-medium">IR</Label>
              <Input
                className="h-9 px-3 py-1.5 text-sm"
                type="number"
                step="0.01"
                value={nfTaxes.irPct}
                onChange={(e) => setNfTaxes((t) => ({ ...t, irPct: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs text-gray-600 font-medium">PIS/COFINS</Label>
              <Input
                className="h-9 px-3 py-1.5 text-sm"
                type="number"
                step="0.01"
                value={nfTaxes.pisCofinsPct}
                onChange={(e) => setNfTaxes((t) => ({ ...t, pisCofinsPct: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs text-gray-600 font-medium">CSLL</Label>
              <Input
                className="h-9 px-3 py-1.5 text-sm"
                type="number"
                step="0.01"
                value={nfTaxes.csllPct}
                onChange={(e) => setNfTaxes((t) => ({ ...t, csllPct: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs text-gray-600 font-medium">ICMS</Label>
              <Input
                className="h-9 px-3 py-1.5 text-sm"
                type="number"
                step="0.01"
                value={nfTaxes.icmsPct}
                onChange={(e) => setNfTaxes((t) => ({ ...t, icmsPct: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2 mt-6">
              <Checkbox
                checked={nfTaxes.retained}
                onCheckedChange={(v) => setNfTaxes((t) => ({ ...t, retained: Boolean(v) }))}
              />
              <div className="text-sm">Impostos retidos</div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
            <div>
              IR:{' '}
              <strong>
                {nfTaxAmounts.ir.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </strong>
            </div>
            <div>
              CSLL:{' '}
              <strong>
                {nfTaxAmounts.csll.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </strong>
            </div>
            <div>
              PIS/COFINS:{' '}
              <strong>
                {nfTaxAmounts.pisCofins.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </strong>
            </div>
            <div>
              ISS:{' '}
              <strong>
                {nfTaxAmounts.iss.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </strong>
            </div>
            <div>
              ICMS:{' '}
              <strong>
                {nfTaxAmounts.icms.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </strong>
            </div>
            <div className="font-semibold">
              Total:{' '}
              <strong>
                {itemsTaxTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </strong>
            </div>
          </div>
        </div>

        {/* Seção 5 — Anexos e observações */}
        <div className="border rounded-md p-3 space-y-3">
          <div className="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-2 mb-3">
            Anexos e observações
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-gray-600 font-medium">Upload de documento</Label>
              <Input
                className="h-9 px-3 py-1.5 text-sm"
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
              />
              <div className="text-xs text-gray-500 mt-1">Nota, boleto ou contrato.</div>
            </div>
            <div>
              <Label className="text-xs text-gray-600 font-medium">Observações</Label>
              <Input
                className="h-9 px-3 py-1.5 text-sm"
                name="notes"
                value={form.notes}
                onChange={handleChange}
                placeholder="Opcional"
              />
            </div>
          </div>
        </div>

        {/* Ações fixas (rodapé sticky) */}
        <div className="sticky bottom-0 bg-white/80 backdrop-blur border-t py-2">
          <div className="w-full mx-auto flex items-center justify-end gap-2 px-3">
            <Button variant="outline" onClick={() => navigate('/clinica/financeiro/pagar')}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Salvar</Button>
          </div>
        </div>
      </div>
      {/* Dialog: Novo fornecedor */}
      <StockSupplierDialog
        open={newSupplierOpen}
        onOpenChange={setNewSupplierOpen}
        onSubmit={async (payload) => {
          try {
            const { stockSuppliersApi } = await import('@/lib/stockApi');
            const created = await stockSuppliersApi.create(clinicId, payload);
            toast({ title: 'Fornecedor criado com sucesso!' });
            setNewSupplierOpen(false);
            setForm((f) => ({
              ...f,
              vendor_name: created?.name || f.vendor_name,
              supplier_id: created?.id || f.supplier_id,
            }));
            setSupplierReloadKey(Date.now());
          } catch (err) {
            toast({
              variant: 'destructive',
              title: 'Erro ao salvar fornecedor',
              description: err.message,
            });
          }
        }}
      />
    </PageLayout>
  );
}
