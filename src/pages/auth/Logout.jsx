import { useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

export default function Logout() {
  useEffect(() => {
    async function run() {
      try {
        // Fazer logout no Supabase Auth
        await supabase.auth.signOut();
      } catch (err) {
        console.error('[LOGOUT] Erro ao fazer signOut no Supabase:', err);
      }

      // Limpar dados da sessão customizada
      localStorage.removeItem('clinic');
      localStorage.removeItem('gesclinic_session');
      localStorage.removeItem('gesclinic_clinic_data');
      localStorage.removeItem('gesclinic_active_company_id');


      window.location.href = '/login';
    }
    run();
  }, []);

  return null;
}
