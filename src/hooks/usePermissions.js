import { useEffect, useState } from 'react';
import { getCurrentUserPermissions } from '@/api/permissionsApi';
import { useClinic } from '@/contexts/useClinicContext';

export function usePermissions() {
  const { clinic } = useClinic();
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clinic) {
      return;
    }

    async function load() {
      setLoading(true);
      const data = await getCurrentUserPermissions(clinic.id);
      setPermissions(data);
      setLoading(false);
    }

    load();
  }, [clinic]);

  return { permissions, loading };
}
