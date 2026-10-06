import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

const clearLocalContext = () => {
  ['gesclinic_session', 'gesclinic_clinic_data', 'gesclinic_active_company_id', 'clinic'].forEach(
    (key) => localStorage.removeItem(key),
  );
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clinicId, setClinicId] = useState(null);
  const [currentRole, setCurrentRole] = useState(null);

  const clearIdentity = useCallback(() => {
    setUser(null);
    setClinicId(null);
    setCurrentRole(null);
    clearLocalContext();
  }, []);

  const verifyIdentity = useCallback(async () => {
    // getUser checks the token with Supabase Auth. A browser cache is never proof of access.
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      clearIdentity();
      return false;
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, clinic_id, role, status')
      .eq('id', authUser.id)
      .maybeSingle();

    if (profileError || !profile || (profile.status && !['ativo', 'active'].includes(profile.status))) {
      clearIdentity();
      const onboarding = !profile && ['/register', '/complete-registration'].includes(window.location.pathname);
      if (window.location.pathname !== '/reset-password' && !onboarding) {
        await supabase.auth.signOut({ scope: 'local' });
      }
      return false;
    }

    setUser(authUser);
    setClinicId(profile.clinic_id || null);
    setCurrentRole(profile.role || null);
    return true;
  }, [clearIdentity]);

  useEffect(() => {
    let active = true;
    verifyIdentity().finally(() => { if (active) setLoading(false); });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        clearIdentity();
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        // Supabase calls inside the auth callback can deadlock; defer verification.
        setTimeout(() => { if (active) verifyIdentity(); }, 0);
      }
    });
    const onFocus = () => { if (active) verifyIdentity(); };
    window.addEventListener('focus', onFocus);
    return () => {
      active = false;
      subscription.unsubscribe();
      window.removeEventListener('focus', onFocus);
    };
  }, [clearIdentity, verifyIdentity]);

  const signIn = async (email, password) => {
    const result = await supabase.auth.signInWithPassword({ email, password });
    if (result.error) return result;
    if (!(await verifyIdentity())) {
      return { data: null, error: new Error('Acesso não autorizado.') };
    }
    return result;
  };

  const signUp = (email, password, userData = {}) => supabase.auth.signUp({
    email, password, options: { data: userData },
  });

  const signOut = async () => {
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    clearIdentity();
    return { error };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-700 font-medium">Carregando Gesclinic Web...</p>
          <p className="text-gray-500 text-sm mt-2">Verificando autenticação</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{
      user, loading, clinicId, currentRole, userType: currentRole,
      signIn, signUp, signOut, isAuthenticated: !!user, userId: user?.id,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
