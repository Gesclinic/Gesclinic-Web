import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from './SupabaseAuthContext';
import { useClinicContext } from './ClinicContext';

const PermissionsContext = createContext(null);

const ACCESS_RANK = {
  blocked: 0,
  view: 1,
  edit: 2,
};

function normalizeAccessLevel(accessLevel) {
  return ACCESS_RANK[accessLevel] !== undefined ? accessLevel : 'blocked';
}

function permissionMatches(permissionKey, requestedKey) {
  if (!permissionKey || !requestedKey) {
    return false;
  }

  if (permissionKey === '*') {
    return true;
  }

  if (permissionKey === requestedKey) {
    return true;
  }

  const requestedModule = requestedKey.split('.')[0];
  if (permissionKey === `${requestedModule}.*`) {
    return true;
  }

  return requestedKey.startsWith(`${permissionKey}.`);
}

export function PermissionsProvider({ children }) {
  const { user } = useAuth();
  const { clinicId, activeCompany } = useClinicContext();
  const currentRole = activeCompany?.role || null;
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !clinicId) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);

      if (currentRole === 'admin') {
        // Admin tem todas as permissões
        setPermissions(['*']);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_permissions')
        .select('permission_key, access_level, data_scope')
        .eq('user_id', user.id)
        .eq('clinic_id', clinicId);

      if (error) {
        console.error('❌ [PermissionsContext] erro ao carregar permissões:', error);
        setPermissions([]);
      } else {
        setPermissions(data || []);
      }

      setLoading(false);
    }

    load();
  }, [user, clinicId, currentRole]);

  function hasPermission(key, requiredLevel = 'view') {
    if (permissions.includes('*')) {
      return true;
    }

    const requiredRank = ACCESS_RANK[requiredLevel] ?? ACCESS_RANK.view;

    return permissions.some((permission) => {
      if (typeof permission === 'string') {
        return permissionMatches(permission, key);
      }

      const permissionKey = permission?.permission_key;
      const accessLevel = normalizeAccessLevel(permission?.access_level);
      const hasRequiredLevel = (ACCESS_RANK[accessLevel] ?? 0) >= requiredRank;

      return hasRequiredLevel && permissionMatches(permissionKey, key);
    });
  }

  function canView(key) {
    return hasPermission(key, 'view');
  }

  function canEdit(key) {
    return hasPermission(key, 'edit');
  }

  return (
    <PermissionsContext.Provider value={{ permissions, loading, hasPermission, canView, canEdit }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionsContext);
}
