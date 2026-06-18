import { usePermissions } from '@/contexts/PermissionsContext';
import { Navigate } from 'react-router-dom';

export function useProtectRoute(submodule) {
  const { canView, loading } = usePermissions();

  if (loading) {
    return <p>Carregando...</p>;
  }

  if (!canView(submodule)) {
    return <Navigate to="/403" />;
  }

  return null;
}
