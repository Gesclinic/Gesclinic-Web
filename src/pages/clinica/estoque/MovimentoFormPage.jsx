import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageLayout from '@/components/ui/PageLayout';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { useClinicContext } from '@/contexts/useClinicContext';
import { useToast } from '@/components/ui/use-toast';
import StockMovementDialog from '@/components/clinica/estoque/StockMovementDialog';
import { createAP, getAPById, updateAP } from '@/lib/financeApi';
import { stockMovementsApi } from '@/lib/stockApi';
import { supabase } from '@/lib/customSupabaseClient';

const routeConfig = {
  entrada: {
    label: 'Entrada',
    plural: 'Entradas',
    backPath: '/clinica/estoque/entradas',
    dialogType: 'entrada',
    titleNew: 'Nova Entrada de Estoque',
    titleEdit: 'Editar Entrada de Estoque',
    subtitle: 'Registre compras, reposições e integração financeira da entrada.',
  },
  saida: {
    label: 'Saída',
    plural: 'Saídas',
    backPath: '/clinica/estoque/saidas',
    dialogType: 'saida',
    titleNew: 'Nova Saída de Estoque',
    titleEdit: 'Editar Saída de Estoque',
    subtitle: 'Registre consumo interno, descarte ou saída para atendimento.',
  },
  transferencia: {
    label: 'Transferência',
    plural: 'Transferências',
    backPath: '/clinica/estoque/transferencias',
    dialogType: 'transfer',
    titleNew: 'Nova Transferência de Estoque',
    titleEdit: 'Editar Transferência de Estoque',
    subtitle: 'Movimente produtos entre locais de estoque com rastreabilidade.',
  },
};

const parseUnitCostFromNotes = (notes) => {
  const match = String(notes || '').match(/Custo\s+unitario\s+R\$\s*([0-9.,]+)/i);
  if (!match?.[1]) return '';
  const raw = match[1].includes(',') ? match[1].replace(/\./g, '').replace(',', '.') : match[1];
  const value = Number(raw);
  return Number.isFinite(value) ? value : '';
};

const parseSupplierFromNotes = (notes) => {
  const match = String(notes || '').match(/Fornecedor\s+([^|]+?)(?:\s*\||$)/i);
  return match?.[1]?.trim() || '';
};

export default function MovimentoFormPage({ kind = 'entrada' }) {
  const config = routeConfig[kind] || routeConfig.entrada;
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { clinicId } = useClinicContext();
  const { toast } = useToast();
  const [initialMovement, setInitialMovement] = useState(null);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (!isEdit || !id) return;
    setLoading(true);
    supabase
      .from('stock_movements')
      .select('id, created_at, movement_type, quantity, unit_cost, notes, stock_item_id, location_id, reference_type, reference_id, item:stock_items(name), location:stock_locations(name)')
      .eq('id', id)
      .single()
      .then(async ({ data, error }) => {
        if (error) throw error;
        let apData = null;
        if (data?.reference_type === 'accounts_payable' && data?.reference_id) {
          try {
            apData = await getAPById(data.reference_id);
          } catch (apError) {
            console.warn('Erro ao carregar AP vinculada:', apError?.message || apError);
          }
        }
        setInitialMovement({
          ...data,
          move_date: data?.created_at ? String(data.created_at).slice(0, 10) : '',
          item_id: data?.stock_item_id,
          qty: data?.quantity,
          type: data?.movement_type,
          item_name: data?.item?.name || '',
          location_name: data?.location?.name || '',
          dueDate: apData?.due_date ? String(apData.due_date).slice(0, 10) : '',
          paymentMethod: apData?.payment_method || 'dinheiro',
          installments: apData?.installments ? String(apData.installments) : '1',
          unit_cost: data?.unit_cost ?? parseUnitCostFromNotes(data?.notes),
          supplier: apData?.vendor_name || parseSupplierFromNotes(data?.notes),
        });
      })
      .catch((error) => toast({ variant: 'destructive', title: `Erro ao carregar ${config.label.toLowerCase()}`, description: error.message }))
      .finally(() => setLoading(false));
  }, [config.label, id, isEdit, toast]);

  const breadcrumbs = useBreadcrumbs([
    { label: 'Estoque', path: '/clinica/estoque' },
    { label: config.plural, path: config.backPath },
    { label: isEdit ? 'Editar' : 'Nova' },
  ]);

  const createEntry = async (payload) => {
    const products = payload.products || [];
    const totalAmount = products.reduce((sum, product) => sum + (parseFloat(product.qty) || 0) * (parseFloat(product.unitCost) || 0), 0);
    const ap = await createAP(clinicId, {
      vendor_name: payload.supplier,
      description: products.map((product) => product.product).join(', ') || 'Entrada de estoque',
      amount: totalAmount,
      due_date: payload.dueDate,
      issue_date: payload.date,
      notes: payload.notes,
      status: 'open',
      installments: payload.installments || '1',
      payment_method: payload.paymentMethod,
    });

    const rows = products
      .filter((product) => product.itemId && payload.locationId)
      .map((product) => ({
        clinic_id: clinicId,
        stock_item_id: product.itemId,
        movement_type: 'entry',
        location_id: payload.locationId,
        quantity: parseFloat(product.qty) || 0,
        created_at: payload.date ? `${payload.date}T12:00:00` : new Date().toISOString(),
        notes: [payload.notes, ap?.id ? `AP#${ap.id}` : null].filter(Boolean).join(' | '),
        reference_type: ap?.id ? 'accounts_payable' : null,
        reference_id: ap?.id || null,
      }));
    if (rows.length) {
      const { error } = await supabase.from('stock_movements').insert(rows);
      if (error) throw error;
    }
  };

  const createExit = async (payload) => {
    const rows = (payload.products || [])
      .filter((product) => product.itemId && payload.locationId)
      .map((product) => ({
        clinic_id: clinicId,
        stock_item_id: product.itemId,
        movement_type: 'exit',
        location_id: payload.locationId,
        quantity: parseFloat(product.qty) || 0,
        created_at: payload.date ? `${payload.date}T12:00:00` : new Date().toISOString(),
        notes: payload.notes || null,
      }));
    if (!rows.length) throw new Error('Informe ao menos um produto e local de estoque.');
    const { error } = await supabase.from('stock_movements').insert(rows);
    if (error) throw error;
  };

  const createTransfer = async (payload) => {
    const token = globalThis.crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2, 10);
    const baseNote = `Transferência ${token} - ${payload.location_name} -> ${payload.target_location_name} | DEST_ID=${payload.targetLocationId}`;
    const rows = (payload.products || [])
      .filter((product) => product.itemId && payload.locationId)
      .map((product) => ({
        clinic_id: clinicId,
        stock_item_id: product.itemId,
        movement_type: 'exit',
        location_id: payload.locationId,
        quantity: parseFloat(product.qty) || 0,
        created_at: payload.date ? `${payload.date}T12:00:00` : new Date().toISOString(),
        notes: payload.notes ? `${baseNote} | ${payload.notes}` : baseNote,
      }));
    if (!rows.length) throw new Error('Informe ao menos um produto e local de origem.');
    const { error } = await supabase.from('stock_movements').insert(rows);
    if (error) throw error;
  };

  const handleSubmit = async (payload) => {
    try {
      if (isEdit) {
        const product = payload.products?.[0];
        const unitCost = parseFloat(product?.unitCost) || 0;
        const qty = parseFloat(product?.qty) || 0;
        const amount = qty * unitCost;

        await stockMovementsApi.update(id, {
          move_date: payload.date,
          qty,
          unit_cost: unitCost,
          notes: payload.notes,
          location_id: payload.locationId,
          item_id: product?.itemId || initialMovement?.item_id,
          type: config.dialogType === 'entrada' ? 'entry' : 'exit',
        });

        if (kind === 'entrada' && initialMovement?.reference_type === 'accounts_payable' && initialMovement?.reference_id) {
          await updateAP(initialMovement.reference_id, {
            vendor_name: payload.supplier,
            due_date: payload.dueDate || null,
            payment_method: payload.paymentMethod,
            installments: payload.installments || '1',
            amount,
            issue_date: payload.date,
            notes: payload.notes,
            status: 'open',
          });
        }
        toast({ title: `${config.label} atualizada` });
      } else if (kind === 'entrada') {
        await createEntry(payload);
        toast({ title: 'Entrada registrada', description: 'Conta a pagar e movimentações registradas.' });
      } else if (kind === 'saida') {
        await createExit(payload);
        toast({ title: 'Saída registrada' });
      } else {
        await createTransfer(payload);
        toast({ title: 'Transferência criada e pendente de aceite no destino' });
      }
      navigate(config.backPath);
    } catch (error) {
      toast({ variant: 'destructive', title: `Erro ao salvar ${config.label.toLowerCase()}`, description: error.message });
    }
  };

  return (
    <PageLayout breadcrumbs={breadcrumbs} title={isEdit ? config.titleEdit : config.titleNew} subtitle={config.subtitle}>
      {loading ? (
        <div className="py-10 text-center text-gray-500">Carregando...</div>
      ) : (
        <StockMovementDialog presentation="page" open onSubmit={handleSubmit} type={config.dialogType} enableFinance={kind === 'entrada'} clinicId={clinicId} initialMovement={initialMovement} onCancel={() => navigate(config.backPath)} />
      )}
    </PageLayout>
  );
}