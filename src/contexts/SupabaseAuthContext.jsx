import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clinicId, setClinicId] = useState(null);
  const [currentRole, setCurrentRole] = useState(null);

  useEffect(() => {
    const syncActiveCompanyFromStorage = () => {
      try {
        const sessionData = JSON.parse(localStorage.getItem('gesclinic_session') || '{}');
        if (sessionData.clinic_id || sessionData.clinicId) {
          setClinicId(sessionData.clinic_id || sessionData.clinicId);
        }
        if (sessionData.role) {
          setCurrentRole(sessionData.role);
        }
      } catch (error) {
        console.warn('⚠️ [AuthProvider] Erro ao sincronizar empresa ativa:', error);
      }
    };

    const handleTenantContextChanged = (event) => {
      const nextClinicId = event.detail?.clinicId;
      if (nextClinicId) {
        setClinicId(nextClinicId);
      }
      syncActiveCompanyFromStorage();
    };

    syncActiveCompanyFromStorage();
    window.addEventListener('gesclinic:tenant-context-changed', handleTenantContextChanged);
    window.addEventListener('storage', syncActiveCompanyFromStorage);

    return () => {
      window.removeEventListener('gesclinic:tenant-context-changed', handleTenantContextChanged);
      window.removeEventListener('storage', syncActiveCompanyFromStorage);
    };
  }, []);

  const loadUserData = useCallback(async (currentUser) => {
    console.log('🚀 [loadUserData] INICIANDO...', currentUser?.id, currentUser?.email);

    if (!currentUser) {
      console.log('❌ [loadUserData] Usuário é null, retornando');
      setClinicId(null);
      setCurrentRole(null);
      return;
    }

    try {
      // Buscar dados do usuário por ID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('clinic_id, role')
        .eq('id', currentUser.id)
        .maybeSingle();

      console.log('🔍 Query resultado:', { userData, userError, currentUserId: currentUser.id });

      // Se não encontrou por ID, tentar buscar por email
      if (!userData && !userError) {
        console.log('Usuário não encontrado por ID, procurando por email...');

        const { data: userByEmail, error: emailError } = await supabase
          .from('users')
          .select('id, clinic_id, role')
          .eq('email', currentUser.email)
          .maybeSingle();

        if (userByEmail) {
          // Encontrou por email, fazer upsert para atualizar o ID se necessário
          const { data: updated, error: updateError } = await supabase
            .from('users')
            .upsert(
              {
                id: currentUser.id,
                email: currentUser.email,
                name: currentUser.user_metadata?.name || currentUser.email,
                role: userByEmail.role || 'recepcao',
                clinic_id: userByEmail.clinic_id,
              },
              { onConflict: 'email' },
            )
            .select('clinic_id, role')
            .maybeSingle();

          if (updateError) {
            console.error('Erro ao atualizar usuário:', updateError);
            setClinicId(userByEmail.clinic_id);
            setCurrentRole(userByEmail.role || 'recepcao');
          } else {
            setClinicId(updated?.clinic_id);
            setCurrentRole(updated?.role || 'recepcao');
          }
        } else {
          // Não encontrou por email, criar novo
          console.log('Usuário não encontrado, criando novo...');
          const { data: insertedUser, error: insertError } = await supabase
            .from('users')
            .insert([
              {
                id: currentUser.id,
                email: currentUser.email,
                name: currentUser.user_metadata?.name || currentUser.email,
                role: 'recepcao',
              },
            ])
            .select('clinic_id, role')
            .maybeSingle();

          if (insertError) {
            console.error('Erro ao criar usuário:', insertError);
            setClinicId(null);
            setCurrentRole('recepcao');
          } else {
            setClinicId(insertedUser?.clinic_id);
            setCurrentRole(insertedUser?.role || 'recepcao');
          }
        }
      } else if (userError) {
        console.warn('Erro ao buscar usuário:', userError);
        setClinicId(null);
        setCurrentRole(null);
      } else {
        // Garantir que clinic_id seja setado se existir
        console.log('✅ Usuário encontrado no banco:', {
          id: currentUser.id,
          clinic_id: userData?.clinic_id,
          role: userData?.role,
        });

        // Importante: O clinic_id pode estar vazio/null no banco
        if (userData?.clinic_id) {
          console.log('✅ Clinic ID encontrado:', userData.clinic_id);
          setClinicId(userData.clinic_id);
        } else {
          console.warn('⚠️ Clinic ID está vazio no banco para este usuário');
          setClinicId(null);
        }

        setCurrentRole(userData?.role || 'recepcao');
      }
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
      setClinicId(null);
      setCurrentRole(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let authSubscription = null;

    async function initAuth() {
      try {
        console.log('🔄 [initAuth] Iniciando...');
        // Verificar sessão atual
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        console.log('📋 [initAuth] Sessão obtida:', {
          session_exists: !!session,
          user_id: session?.user?.id,
          user_email: session?.user?.email,
          sessionError,
        });

        // Se não houver sessão do Supabase, tentar restaurar do localStorage (login customizado)
        if (!session) {
          console.log('🔍 [initAuth] Tentando restaurar sessão do localStorage...');
          const savedSession = localStorage.getItem('gesclinic_session');
          if (savedSession) {
            try {
              const sessionData = JSON.parse(savedSession);
              console.log('✅ [initAuth] Sessão do localStorage restaurada:', sessionData);

              // Agora buscar os dados do usuário no banco
              if (sessionData.user_id) {
                const { data: userData, error: userError } = await supabase
                  .from('users')
                  .select('clinic_id, role')
                  .eq('id', sessionData.user_id)
                  .maybeSingle();

                if (!userError && userData?.clinic_id) {
                  console.log('✅ [initAuth] Clinic ID carregado do banco:', userData.clinic_id);
                  setClinicId(userData.clinic_id);
                  setCurrentRole(userData.role || 'recepcao');
                  setUser({ id: sessionData.user_id, email: sessionData.email });
                  setLoading(false);
                  return;
                }
              }
            } catch (e) {
              console.warn('⚠️ [initAuth] Erro ao restaurar do localStorage:', e);
            }
          }
        }

        if (sessionError) {
          console.error('Erro ao obter sessão:', sessionError);
          if (
            sessionError.message?.includes('Refresh Token Not Found') ||
            sessionError.message?.includes('Invalid Refresh Token') ||
            sessionError.message?.includes('missing sub claim')
          ) {
            console.warn('Sessão inválida. Deslogando usuário...');
            await supabase.auth.signOut();
            setUser(null);
            setClinicId(null);
            setCurrentRole(null);
            setLoading(false);
            // Redirecionar para login
            if (mounted && window.location.pathname !== '/login') {
              window.location.href = '/login';
            }
            return;
          }
        }

        if (mounted) {
          const currentUser = session?.user ?? null;
          console.log('✅ [initAuth] Setando user e chamando loadUserData:', {
            mounted,
            currentUser_id: currentUser?.id,
            currentUser_email: currentUser?.email,
          });
          setUser(currentUser);

          if (currentUser) {
            console.log('🚀 [initAuth] Chamando loadUserData para:', currentUser.id);
            await loadUserData(currentUser);
          } else {
            console.warn('⚠️ [initAuth] currentUser é null, não chamando loadUserData');
          }

          setLoading(false);
        }

        // Configurar listener de mudanças de autenticação
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(async (_event, session) => {
          console.log('🔔 [onAuthStateChange] Evento:', _event, 'Session existe:', !!session);
          if (mounted) {
            const currentUser = session?.user ?? null;
            setUser(currentUser);

            if (currentUser) {
              console.log('🚀 [onAuthStateChange] Chamando loadUserData para:', currentUser.id);
              await loadUserData(currentUser);
            } else {
              console.warn('⚠️ [onAuthStateChange] currentUser é null');
              setClinicId(null);
              setCurrentRole(null);
            }
          }
        });

        authSubscription = subscription;
      } catch (err) {
        console.error('Erro na inicialização da autenticação:', err);
        if (err.message?.includes('missing sub claim')) {
          console.warn('JWT inválido. Deslogando usuário...');
          await supabase.auth.signOut();
          if (mounted) {
            setUser(null);
            setLoading(false);
            if (window.location.pathname !== '/login') {
              window.location.href = '/login';
            }
          }
        } else if (mounted) {
          setUser(null);
          setLoading(false);
        }
      }
    }

    initAuth();

    // Timeout de segurança (3 segundos)
    const timeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('⚠️ Timeout na autenticação - forçando conclusão');
        setLoading(false);
      }
    }, 3000);

    return () => {
      mounted = false;
      clearTimeout(timeout);
      authSubscription?.unsubscribe();
    };
  }, [loading, loadUserData]);

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        // Aguardar um pouco para garantir que a sessão seja salva
        await new Promise((resolve) => setTimeout(resolve, 500));
        await loadUserData(data.user);
      }

      return { data, error: null };
    } catch (error) {
      console.error('Erro no login:', error);
      return { data: null, error };
    }
  };

  const signUp = async (email, password, userData = {}) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
        },
      });

      if (error) {
        throw error;
      }

      return { data, error: null };
    } catch (error) {
      console.error('Erro no cadastro:', error);
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }

      setUser(null);
      setClinicId(null);
      setCurrentRole(null);

      return { error: null };
    } catch (error) {
      console.error('Erro no logout:', error);
      return { error };
    }
  };

  const value = {
    user,
    loading,
    clinicId,
    currentRole,
    userType: currentRole, // Alias para compatibilidade
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!user,
    // PASSO 4: Debug - log do usuário logado
    userId: user?.id,
  };

  // PASSO 5: Log de debug (temporário) - mostra quem está logado
  if (user && !loading) {
    console.log('👤 [AUTH] Usuário logado:', {
      id: user.id,
      email: user.email,
      clinicId,
      currentRole,
    });
  }

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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
