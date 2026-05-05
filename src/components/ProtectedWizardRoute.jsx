// src/components/ProtectedWizardRoute.jsx
// ============================================================
// PROTECTED WIZARD ROUTE - Wrapper para rotas protegidas
// ============================================================
// Componente que envolve rotas que requerem setup wizard

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import * as baseSystemApi from '@/lib/baseSystemApi';
import { BlockingModal } from './BlockingModal';

/**
 * Wrapper para rotas que requerem wizard completo
 * @param {React.ReactNode} children - Componente a renderizar se liberado
 * @param {string} feature - ID da feature (agenda, financeiro, checkin)
 * @param {Object} options - Opções adicionais
 * @returns {React.ReactNode}
 */
export function ProtectedWizardRoute({ children, feature, options = {} }) {
  const { clinicId } = useAuth();
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState(null);
  const [blockingIssues, setBlockingIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clinicId) {
      return;
    }
    checkAccess();
  }, [clinicId, feature]);

  async function checkAccess() {
    try {
      setLoading(true);
      const validation = await baseSystemApi.validateBaseSystemSetup(clinicId);

      // Regras de bloqueio por feature
      const blockerRules = {
        agenda: {
          message: 'Para usar a Agenda, você precisa:',
          checkIssues: true,
          criticalIssues: ['no_professionals', 'no_services', 'no_professional_services'],
        },
        scheduling: {
          message: 'Para agendar, você precisa:',
          checkIssues: true,
          criticalIssues: [
            'no_professionals',
            'no_services',
            'no_professional_services',
            'incomplete_agenda_rules',
          ],
        },
        financeiro: {
          message: 'Para acessar o Financeiro, você precisa:',
          checkIssues: true,
          criticalIssues: ['no_professionals', 'no_services', 'no_professional_services'],
        },
        checkin: {
          message: 'Para usar Check-in, você precisa:',
          checkIssues: true,
          criticalIssues: ['no_professionals', 'no_services', 'no_professional_services'],
        },
        invoices: {
          message: 'Para gerar faturas, você precisa:',
          checkIssues: true,
          criticalIssues: ['no_services'],
        },
      };

      const rule = blockerRules[feature];
      if (!rule) {
        // Feature não tem regra de bloqueio
        setIsBlocked(false);
        setLoading(false);
        return;
      }

      // Verifica se há issues críticos
      const criticalIssues = validation.issues.filter((i) => rule.criticalIssues.includes(i.id));

      if (criticalIssues.length > 0) {
        setIsBlocked(true);
        setBlockReason(rule.message);
        setBlockingIssues(
          criticalIssues.map((i) => ({
            id: i.id,
            message: i.message,
            action: i.action,
          })),
        );
      } else {
        setIsBlocked(false);
      }
    } catch (error) {
      console.error('Erro ao verificar acesso:', error);
      // Em caso de erro, não bloqueia (fail open)
      setIsBlocked(false);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Verificando configuração...</p>
        </div>
      </div>
    );
  }

  if (isBlocked) {
    return (
      <BlockingModal isOpen={true} feature={feature} reason={blockReason} issues={blockingIssues} />
    );
  }

  return children;
}

/**
 * HOC para envolver um componente de página com proteção
 * @param {React.Component} Component - Componente da página
 * @param {string} feature - ID da feature
 * @param {Object} options - Opções adicionais
 * @returns {React.Component}
 */
export function withWizardProtection(Component, feature, options = {}) {
  return function ProtectedComponent(props) {
    return (
      <ProtectedWizardRoute feature={feature} options={options}>
        <Component {...props} />
      </ProtectedWizardRoute>
    );
  };
}
