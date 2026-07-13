import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import {
  deleteManualDrawerMovementFinance,
  syncManualDrawerMovementToFinance,
} from '@/lib/cashDrawerFinancialIntegration';
import type { CashMovement, CashMovementInput } from '../types/CashMovement';

const DRAWER_MOVEMENT_SELECT = `
  *,
  appointment:appointments(
    id,
    patient_id,
    professional_id,
    service_id,
    payer_id,
    payer_type,
    patient_name,
    service_description,
    payer_name,
    patients:patient_id(name),
    professionals:professional_id(name),
    services:service_id(name, price),
    payers:payer_id(name)
  )
`;

function mapDrawerMovement(row: any): CashMovement {
  const appointment = row.appointment || {};
  return {
    id: row.id,
    clinic_id: row.clinic_id,
    drawer_id: row.drawer_id,
    appointment_id: row.appointment_id || undefined,
    appointment_start_time: appointment.start_time || undefined,
    type: row.payment_type === 'saida' ? 'saida' : 'entrada',
    amount: Number(row.amount || 0),
    patient_id: appointment.patient_id || undefined,
    patient: appointment.patients || (appointment.patient_name ? { name: appointment.patient_name } : undefined),
    professional_id: appointment.professional_id || undefined,
    professional: appointment.professionals || undefined,
    service_id: appointment.service_id || undefined,
    service: appointment.services || (appointment.service_description ? { name: appointment.service_description } : undefined),
    payer_id: appointment.payer_id || undefined,
    payer: appointment.payers || (appointment.payer_name ? { name: appointment.payer_name } : undefined),
    payer_type: appointment.payer_type === 'CONVENIO' ? 'convenio' : 'particular',
    status: 'confirmado',
    payment_method: row.payment_method,
    description: row.description || undefined,
    reference_document: row.reference_document || undefined,
    counterparty_name: row.counterparty_name || undefined,
    expense_supplier_name: row.expense_supplier_name || undefined,
    expense_provider_name: row.expense_provider_name || undefined,
    expense_service_description: row.expense_service_description || undefined,
    financial_category: row.financial_category || undefined,
    origin: row.appointment_id ? 'agenda' : 'manual',
    created_at: row.created_at,
  };
}

function getMissingColumnName(error: any) {
  const text = String(error?.message || error?.details || '');
  return text.match(/Could not find the '([^']+)' column/i)?.[1]
    || text.match(/column "?([a-zA-Z0-9_]+)"? of relation/i)?.[1]
    || text.match(/column "?([a-zA-Z0-9_]+)"? does not exist/i)?.[1]
    || null;
}

function omitKey(row: Record<string, any>, key: string) {
  const { [key]: _removed, ...rest } = row;
  return rest;
}

async function insertDrawerMovementWithColumnFallback(payload: Record<string, any>) {
  const optionalColumns = [
    'counterparty_name',
    'expense_supplier_name',
    'expense_provider_name',
    'expense_service_description',
    'financial_category',
  ];
  let currentPayload = { ...payload };
  const omitted = new Set<string>();

  for (let attempt = 0; attempt <= optionalColumns.length + 1; attempt += 1) {
    const { data, error } = await supabase
      .from('drawer_movements')
      .insert([currentPayload])
      .select(
        `
          *,
          appointment:appointments(
            id,
            patient_id,
            professional_id,
            service_id,
            payer_id,
            payer_type,
            patient_name,
            service_description,
            payer_name,
            patients:patient_id(name),
            professionals:professional_id(name),
            services:service_id(name, price),
            payers:payer_id(name)
          )
        `,
      )
      .single();

    if (!error) {
      return data;
    }

    const missingColumn = getMissingColumnName(error);
    const removableColumn = missingColumn && optionalColumns.includes(missingColumn) && missingColumn in currentPayload
      ? missingColumn
      : optionalColumns.find((column) => column in currentPayload && !omitted.has(column));

    if (!removableColumn) {
      throw error;
    }

    omitted.add(removableColumn);
    currentPayload = omitKey(currentPayload, removableColumn);
  }

  throw new Error('Erro ao registrar movimento no caixa');
}

async function updateDrawerMovementWithColumnFallback({
  movementId,
  clinicId,
  drawerId,
  payload,
}: {
  movementId: string;
  clinicId: string;
  drawerId: string;
  payload: Record<string, any>;
}) {
  const optionalColumns = [
    'counterparty_name',
    'expense_supplier_name',
    'expense_provider_name',
    'expense_service_description',
    'financial_category',
  ];
  let currentPayload = { ...payload };
  const omitted = new Set<string>();

  for (let attempt = 0; attempt <= optionalColumns.length + 1; attempt += 1) {
    const { data, error } = await supabase
      .from('drawer_movements')
      .update(currentPayload)
      .eq('id', movementId)
      .eq('clinic_id', clinicId)
      .eq('drawer_id', drawerId)
      .select(DRAWER_MOVEMENT_SELECT)
      .single();

    if (!error) {
      return data;
    }

    const missingColumn = getMissingColumnName(error);
    const removableColumn = missingColumn && optionalColumns.includes(missingColumn) && missingColumn in currentPayload
      ? missingColumn
      : optionalColumns.find((column) => column in currentPayload && !omitted.has(column));

    if (!removableColumn) {
      throw error;
    }

    omitted.add(removableColumn);
    currentPayload = omitKey(currentPayload, removableColumn);
  }

  throw new Error('Erro ao editar movimento no caixa');
}

async function logMovementEdit({ movementId, clinicId, drawerId, editedBy, reason, before, after }: Record<string, any>) {
  const { error } = await supabase
    .from('drawer_movement_edit_logs')
    .insert({
      movement_id: movementId,
      clinic_id: clinicId,
      drawer_id: drawerId,
      edited_by: editedBy,
      reason,
      before_values: before,
      after_values: after,
    });

  if (error) {
    const text = String(error.message || error.details || '');
    if (
      text.includes('drawer_movement_edit_logs')
      || text.includes('schema cache')
      || text.includes('does not exist')
      || text.includes('row-level security')
    ) {
      console.warn('Histórico de edição de movimento não aplicado no banco. Execute a migration drawer_movement_edit_logs.');
      return;
    }
    console.warn('Não foi possível gravar histórico da edição do movimento:', error);
  }
}

async function ensureMedicalProductionForLinkedAppointment(movement: CashMovement, input?: CashMovementInput) {
  if (movement.origin !== 'agenda' || !movement.appointment_id || !movement.professional_id) {
    return;
  }

  const isPriorRepasseAdjustment = Boolean(input?.prior_repasse_adjustment);
  const productionAmount = isPriorRepasseAdjustment
    ? Number(input?.adjustment_delta || 0)
    : Number(movement.amount || 0);
  const dataAtendimento = isPriorRepasseAdjustment
    ? new Date().toISOString().slice(0, 10)
    : input?.appointment_scheduled_date
      || (movement.appointment_start_time
        ? String(movement.appointment_start_time).slice(0, 10)
        : movement.created_at ? String(movement.created_at).slice(0, 10) : new Date().toISOString().slice(0, 10));
  const payload = {
    clinic_id: movement.clinic_id,
    professional_id: movement.professional_id,
    atendimento_id: movement.appointment_id,
    tipo: 'consulta',
    valor_bruto: productionAmount,
    valor_liquido: productionAmount,
    data_atendimento: dataAtendimento,
  };

  const { data: existing, error: existingError } = await supabase
    .from('medical_production')
    .select('id')
    .eq('clinic_id', movement.clinic_id)
    .eq('atendimento_id', movement.appointment_id)
    .maybeSingle();

  if (existingError && existingError.code !== 'PGRST116') {
    throw existingError;
  }

  if (existing?.id && !isPriorRepasseAdjustment) {
    const { error } = await supabase
      .from('medical_production')
      .update(payload)
      .eq('id', existing.id);

    if (error) {
      throw error;
    }
    return;
  }

  const { error } = await supabase
    .from('medical_production')
    .insert(payload);

  if (error) {
    throw error;
  }
}

export const useCashMovements = (drawerId: string, clinicId: string) => {
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!drawerId || !clinicId) {
      setMovements([]);
      setError(null);
      setLoading(false);
    }
  }, [drawerId, clinicId]);

  const fetchMovements = useCallback(async () => {
    if (!drawerId || !clinicId) {
      setMovements([]);
      return;
    }

    setLoading(true);
    setError(null);
    setMovements([]);

    try {
      const { data, error: fetchError } = await supabase
        .from('drawer_movements')
        .select(DRAWER_MOVEMENT_SELECT)
        .eq('drawer_id', drawerId)
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setMovements((data || []).map(mapDrawerMovement));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar movimentos';
      setError(message);
      console.error('Erro ao buscar movimentos:', err);
    } finally {
      setLoading(false);
    }
  }, [drawerId, clinicId]);

  const fetchMovementsForDrawerIds = useCallback(async (drawerIds: string[]) => {
    if (!clinicId || drawerIds.length === 0) {
      setMovements([]);
      return;
    }

    setLoading(true);
    setError(null);
    setMovements([]);

    try {
      const { data, error: fetchError } = await supabase
        .from('drawer_movements')
        .select(DRAWER_MOVEMENT_SELECT)
        .eq('clinic_id', clinicId)
        .in('drawer_id', drawerIds)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setMovements((data || []).map(mapDrawerMovement));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar movimentos do período';
      setError(message);
      console.error('Erro ao buscar movimentos do período:', err);
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  const addMovement = useCallback(
    async (
      movement: CashMovementInput & { drawer_id: string; clinic_id: string; created_by: string },
    ) => {
      try {
        const data = await insertDrawerMovementWithColumnFallback({
            drawer_id: movement.drawer_id,
            clinic_id: movement.clinic_id,
            appointment_id: (movement as any).appointment_id || null,
            payment_method: movement.payment_method,
            payment_type: movement.type,
            amount: movement.amount,
            description: movement.description || null,
            reference_document: movement.reference_document || null,
            counterparty_name: movement.counterparty_name || null,
            expense_supplier_name: movement.expense_supplier_name || null,
            expense_provider_name: movement.expense_provider_name || null,
            expense_service_description: movement.expense_service_description || null,
            financial_category: movement.financial_category || null,
          });

        const mapped = {
          ...mapDrawerMovement(data),
          counterparty_name: data.counterparty_name || movement.counterparty_name,
          expense_supplier_name: data.expense_supplier_name || movement.expense_supplier_name,
          expense_provider_name: data.expense_provider_name || movement.expense_provider_name,
          expense_service_description: data.expense_service_description || movement.expense_service_description,
          financial_category: data.financial_category || movement.financial_category,
          created_by: movement.created_by,
        };

        if (mapped.origin === 'agenda') {
          try {
            await ensureMedicalProductionForLinkedAppointment(mapped, movement);
          } catch (productionError) {
            await supabase.from('drawer_movements').delete().eq('id', data.id);
            throw new Error(
              productionError instanceof Error
                ? `Movimento não vinculado: falha ao registrar produção médica para repasse. ${productionError.message}`
                : 'Movimento não vinculado: falha ao registrar produção médica para repasse.',
            );
          }
        }

        try {
          await syncManualDrawerMovementToFinance(mapped);
        } catch (financeError) {
          await supabase.from('drawer_movements').delete().eq('id', data.id);
          throw financeError;
        }

        setMovements((prev) => [mapped, ...prev]);
        return mapped;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao adicionar movimento';
        setError(message);
        throw err;
      }
    },
    [],
  );

  const deleteMovement = useCallback(async (movementId: string) => {
    try {
      await deleteManualDrawerMovementFinance(movementId);

      const { error: deleteError } = await supabase
        .from('drawer_movements')
        .delete()
        .eq('id', movementId);

      if (deleteError) throw deleteError;

      setMovements((prev) => prev.filter((m) => m.id !== movementId));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao deletar movimento';
      setError(message);
      throw err;
    }
  }, []);

  const updateMovement = useCallback(async (
    movementId: string,
    movement: CashMovementInput & { drawer_id: string; clinic_id: string; updated_by: string; edit_reason: string },
  ) => {
    try {
      const before = movements.find((item) => item.id === movementId) || null;
      if (before && before.origin !== 'manual') {
        throw new Error('Apenas movimentos manuais podem ser editados pelo caixa.');
      }

      const payload = {
        payment_method: movement.payment_method,
        payment_type: movement.type,
        amount: movement.amount,
        description: movement.description || null,
        reference_document: movement.reference_document || null,
        counterparty_name: movement.counterparty_name || null,
        expense_supplier_name: movement.expense_supplier_name || null,
        expense_provider_name: movement.expense_provider_name || null,
        expense_service_description: movement.expense_service_description || null,
        financial_category: movement.financial_category || null,
        updated_at: new Date().toISOString(),
      };

      const data = await updateDrawerMovementWithColumnFallback({
        movementId,
        clinicId: movement.clinic_id,
        drawerId: movement.drawer_id,
        payload,
      });

      const mapped = {
        ...mapDrawerMovement(data),
        counterparty_name: data.counterparty_name || movement.counterparty_name,
        expense_supplier_name: data.expense_supplier_name || movement.expense_supplier_name,
        expense_provider_name: data.expense_provider_name || movement.expense_provider_name,
        expense_service_description: data.expense_service_description || movement.expense_service_description,
        financial_category: data.financial_category || movement.financial_category,
        created_by: movement.updated_by,
      };

      await deleteManualDrawerMovementFinance(movementId);
      await syncManualDrawerMovementToFinance(mapped);
      await logMovementEdit({
        movementId,
        clinicId: movement.clinic_id,
        drawerId: movement.drawer_id,
        editedBy: movement.updated_by,
        reason: movement.edit_reason,
        before,
        after: mapped,
      });

      setMovements((prev) => prev.map((item) => (item.id === movementId ? mapped : item)));
      return mapped;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao editar movimento';
      setError(message);
      throw new Error(message);
    }
  }, [movements]);

  return {
    movements,
    loading,
    error,
    fetchMovements,
    fetchMovementsForDrawerIds,
    addMovement,
    updateMovement,
    deleteMovement,
  };
};
