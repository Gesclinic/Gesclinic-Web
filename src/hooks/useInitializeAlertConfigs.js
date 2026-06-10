/**
 * Hook para inicializar configurações de alertas automaticamente
 * Se a tabela estiver vazia, insere os dados padrão via RPC
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

export function useInitializeAlertConfigs(clinicId) {
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!clinicId) return;

    const initializeConfigs = async () => {
      try {
        setIsInitializing(true);
        console.log('📋 Inicializando configurações de alertas para clínica:', clinicId);

        // Chamar RPC que faz insert com SECURITY DEFINER
        const { data, error: rpcError } = await supabase.rpc(
          'initialize_alert_configs',
          { p_clinic_id: clinicId }
        );

        if (rpcError) {
          console.error('❌ Erro ao inicializar configurações:', rpcError);
          setError(rpcError.message);
          setIsInitializing(false);
          return;
        }

        if (data && data.length > 0) {
          console.log('✅ Configurações inicializadas:', data[0]);
        }

        setIsInitializing(false);
      } catch (err) {
        console.error('❌ Erro ao inicializar configurações:', err);
        setError(err.message);
        setIsInitializing(false);
      }
    };

    initializeConfigs();
  }, [clinicId]);

  return { isInitializing, error };
}
