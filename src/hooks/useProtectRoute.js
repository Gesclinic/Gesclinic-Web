import { usePermission } from '@/hooks/usePermission';
import { Navigate } from 'react-router-dom';

export function useProtectRoute(submodule) {
  const { can_view, loading } = usePermission(submodule);

  if (loading) {
    return <p>Carregando...</p>;
  }

  if (!can_view) {
    return <Navigate to="/403" />;
  }

  return null;
}
