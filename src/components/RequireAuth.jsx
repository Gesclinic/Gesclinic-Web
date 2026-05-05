import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext.jsx';
import { useClinicContext } from '@/contexts/useClinicContext.jsx';

export default function RequireAuth({ children, requireClinic = true }) {
  const { user, loading } = useAuth();
  const { clinic } = useClinicContext();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!loading) {
      return;
    }
    const t = setTimeout(() => setTimedOut(true), 5000);
    return () => clearTimeout(t);
  }, [loading]);

  if (loading) {
    if (timedOut) {
      return <Navigate to="/login" replace />;
    }
    return <div style={{ padding: 20, textAlign: 'center' }}>Carregando sessão segura...</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (requireClinic && !clinic) {
    return <Navigate to="/select-clinic" replace />;
  }
  return children;
}
