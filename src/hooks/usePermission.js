import { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinic } from '@/contexts/useClinicContext';

export function usePermission(submoduleId) {
  const { session } = useAuth();
  const { clinic } = useClinic();
  const userId = session?.user?.id;

  const [perm, setPerm] = useState({
    can_view: false,
    can_edit: false,
    can_delete: false,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !clinic?.id || !submoduleId) {
      return;
    }

    async function load() {
      setLoading(true);

      const { data, error } = await supabase
        .from('user_permissions')
        .select('can_view, can_edit, can_delete')
        .eq('user_id', userId)
        .eq('clinic_id', clinic.id)
        .eq('submodule_id', submoduleId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ usePermission load error:', error);
      }

      setPerm({
        can_view: data?.can_view || false,
        can_edit: data?.can_edit || false,
        can_delete: data?.can_delete || false,
      });

      setLoading(false);
    }

    load();
  }, [userId, clinic, submoduleId]);

  return { ...perm, loading };
}
