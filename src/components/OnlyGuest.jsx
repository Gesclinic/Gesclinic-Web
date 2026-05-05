import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import SplashScreen from '@/components/common/SplashScreen';

/**
 * OnlyGuest.jsx
 *
 * Controla o acesso às rotas públicas (login, cadastro, esqueci senha etc.).
 * - Exibe SplashScreen enquanto autenticação é carregada.
 * - Redireciona automaticamente usuários autenticados para a rota principal (/clinica por padrão).
 */
export default function OnlyGuest({ children, redirectTo = '/clinica' }) {
  const { session, loading } = useAuth();

  // Delay curto para suavizar transição (corrige flicker no Horizon)
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 150);
    return () => clearTimeout(timer);
  }, []);

  // 🌀 Mostra splash enquanto carrega autenticação
  if (loading || !ready) {
    return <SplashScreen />;
  }

  // 🔐 Usuário logado → redireciona automaticamente
  if (session) {
    return <Navigate to={redirectTo} replace />;
  }

  // ✅ Usuário não logado → renderiza normalmente a rota pública
  return children;
}
