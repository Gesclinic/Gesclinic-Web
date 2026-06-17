import { useState, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import type { CashMovement, CashMovementInput } from '../types/CashMovement';

function mapDrawerMovement(row: any): CashMovement {
  const appointment = row.appointment || {};
  return {
    id: row.id,
    clinic_id: row.clinic_id,
    drawer_id: row.drawer_id,
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
    origin: row.appointment_id ? 'agenda' : 'manual',
    created_at: row.created_at,
  };
}

export const useCashMovements = (drawerId: string, clinicId: string) => {
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMovements = useCallback(async () => {
    if (!drawerId || !clinicId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('drawer_movements')
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

  const addMovement = useCallback(
    async (
      movement: CashMovementInput & { drawer_id: string; clinic_id: string; created_by: string },
    ) => {
      try {
        const { data, error: insertError } = await supabase
          .from('drawer_movements')
          .insert([{
            drawer_id: movement.drawer_id,
            clinic_id: movement.clinic_id,
            appointment_id: (movement as any).appointment_id || null,
            payment_method: movement.payment_method,
            payment_type: movement.type,
            amount: movement.amount,
            description: movement.description || null,
          }])
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

        if (insertError) throw insertError;

        const mapped = mapDrawerMovement(data);
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

  return {
    movements,
    loading,
    error,
    fetchMovements,
    addMovement,
    deleteMovement,
  };
};
