import { useEffect, useState } from 'react';
import { listUserPermissions } from '@/lib/permissionsApi';
import { useClinicContext } from '@/contexts/useClinicContext';
import { useAuth } from '@/contexts/SupabaseAuthContext';

export function usePermissions() {
  const { user, clinicId } = useAuth();
  const { clinic } = useClinicContext();
  const resolvedClinicId = clinic?.id || clinicId;
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id || !resolvedClinicId) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      const data = await listUserPermissions(user.id, resolvedClinicId);
      setPermissions(data);
      setLoading(false);
    }

    load();
  }, [user?.id, resolvedClinicId]);

  return { permissions, loading };
}
