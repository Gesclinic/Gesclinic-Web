import { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/useClinicContext';

const ACCESS_RANK = {
  blocked: 0,
  view: 1,
  edit: 2,
};

function toRank(level) {
  return ACCESS_RANK[level] ?? 0;
}

function evaluatePermissionRows(rows, submoduleId) {
  let bestRank = 0;

  const candidates = [submoduleId, `${submoduleId}.view`];
  const moduleName = submoduleId.split('.')[0];

  for (const row of rows) {
    const key = row?.permission_key;
    if (!key) {
      continue;
    }

    const matches =
      key === '*' ||
      candidates.includes(key) ||
      key === `${moduleName}.*` ||
      key.startsWith(`${submoduleId}.`);

    if (matches) {
      bestRank = Math.max(bestRank, toRank(row?.access_level));
    }
  }

  return {
    can_view: bestRank >= ACCESS_RANK.view,
    can_edit: bestRank >= ACCESS_RANK.edit,
    can_delete: bestRank >= ACCESS_RANK.edit,
  };
}

export function usePermission(submoduleId) {
  const { user, clinicId, currentRole } = useAuth();
  const { clinic } = useClinicContext();
  const resolvedClinicId = clinic?.id || clinicId;
  const userId = user?.id;

  const [perm, setPerm] = useState({
    can_view: false,
    can_edit: false,
    can_delete: false,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !resolvedClinicId || !submoduleId) {
      setPerm({ can_view: false, can_edit: false, can_delete: false });
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);

      if (currentRole === 'admin') {
        setPerm({ can_view: true, can_edit: true, can_delete: true });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_permissions')
        .select('permission_key, access_level, submodule_id, can_view, can_edit, can_delete')
        .eq('user_id', userId)
        .eq('clinic_id', resolvedClinicId);

      if (error && error.code !== 'PGRST116') {
        console.error('❌ usePermission load error:', error);
        setPerm({ can_view: false, can_edit: false, can_delete: false });
        setLoading(false);
        return;
      }

      // Modelo novo: permission_key + access_level
      const hasNewSchema = (data || []).some((row) => row?.permission_key);

      if (hasNewSchema) {
        setPerm(evaluatePermissionRows(data || [], submoduleId));
      } else {
        // Fallback legado: submodule_id + can_view/can_edit/can_delete
        const legacy = (data || []).find((row) => row?.submodule_id === submoduleId);
        setPerm({
          can_view: legacy?.can_view || false,
          can_edit: legacy?.can_edit || false,
          can_delete: legacy?.can_delete || false,
        });
      }

      setLoading(false);
    }

    load();
  }, [userId, resolvedClinicId, submoduleId, currentRole]);

  return { ...perm, loading };
}
