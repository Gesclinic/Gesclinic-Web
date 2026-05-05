import { useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

export default function Logout() {
  useEffect(() => {
    async function run() {
      await supabase.auth.signOut();
      localStorage.removeItem('clinic');
      window.location.href = '/login';
    }
    run();
  }, []);

  return null;
}
