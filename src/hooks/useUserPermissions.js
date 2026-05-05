import { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

export function useUserPermissions(userId, clinicId) {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !clinicId) {
      return;
    }

    async function load() {
      const { data, error } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', userId)
        .eq('clinic_id', clinicId);

      if (error) {
        console.error('❌ useUserPermissions error:', error);
      }

      setPermissions(data || []);
      setLoading(false);
    }

    load();
  }, [userId, clinicId]);

  return { permissions, loading };
}
