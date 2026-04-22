import { useState, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import type { CashMovement, CashMovementInput } from '../types/CashMovement';

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
        .from('cash_movements')
        .select(`
          *,
          patient:patients(name),
          professional:professionals(name),
          service:services(name, price),
          payer:payers(name)
        `)
        .eq('drawer_id', drawerId)
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setMovements((data as CashMovement[]) || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar movimentos';
      setError(message);
      console.error('Erro ao buscar movimentos:', err);
    } finally {
      setLoading(false);
    }
  }, [drawerId, clinicId]);

  const addMovement = useCallback(async (movement: CashMovementInput & { drawer_id: string; clinic_id: string; created_by: string }) => {
    try {
      const { data, error: insertError } = await supabase
        .from('cash_movements')
        .insert([movement])
        .select(`
          *,
          patient:patients(name),
          professional:professionals(name),
          service:services(name, price),
          payer:payers(name)
        `)
        .single();

      if (insertError) throw insertError;
      
      setMovements(prev => [data as CashMovement, ...prev]);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao adicionar movimento';
      setError(message);
      throw err;
    }
  }, []);

  const deleteMovement = useCallback(async (movementId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('cash_movements')
        .delete()
        .eq('id', movementId);

      if (deleteError) throw deleteError;
      
      setMovements(prev => prev.filter(m => m.id !== movementId));
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
    deleteMovement
  };
};
