// src/components/FeatureProtectedRoute.jsx
// ============================================================
// Componente que protege rotas baseado em requisitos de funcionalidade
// ============================================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useFeatureBlocker } from '@/hooks/useFeatureBlocker';
import { FeatureBlockedDialog } from './FeatureBlockedDialog';

/**
 * Protege uma rota verificando se a funcionalidade está liberada
 *
 * @param {React.Component} Component - Componente a renderizar
 * @param {string} feature - Nome da funcionalidade ('agenda', 'checkin', 'finance')
 * @returns {React.Component}
 */
export function FeatureProtectedRoute({ Component, feature = 'agenda' }) {
  return function ProtectedRouteComponent(props) {
    const { clinicId } = useAuth();
    const { validateFeatureAccess } = useFeatureBlocker(clinicId);
    const [blockInfo, setBlockInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isBlocked, setIsBlocked] = useState(false);

    useEffect(() => {
      checkFeatureAccess();
    }, [clinicId, feature]);

    const checkFeatureAccess = async () => {
      try {
        setLoading(true);
        const result = await validateFeatureAccess(feature);

        if (result.blocked) {
          setIsBlocked(true);
          setBlockInfo(result);
        } else {
          setIsBlocked(false);
        }
      } catch (error) {
        console.error('Erro ao validar acesso à funcionalidade:', error);
        setIsBlocked(false);
      } finally {
        setLoading(false);
      }
    };

    if (loading) {
      return (
        <div className="flex items-center justify-center h-screen bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando...</p>
          </div>
        </div>
      );
    }

    if (isBlocked) {
      return (
        <FeatureBlockedDialog
          feature={`${feature.charAt(0).toUpperCase() + feature.slice(1)}`}
          blockReason={blockInfo.reason}
          actionPath={blockInfo.action}
          isOpen={true}
          onDismiss={() => {
            // Usuário pode fechar e voltar
            window.history.back();
          }}
        />
      );
    }

    return <Component {...props} />;
  };
}

/**
 * HOC para envolver um componente com proteção de funcionalidade
 *
 * @param {React.Component} Component
 * @param {string} feature
 * @returns {React.Component}
 */
export function withFeatureProtection(Component, feature = 'agenda') {
  return (props) => <FeatureProtectedRoute Component={Component} feature={feature} {...props} />;
}
