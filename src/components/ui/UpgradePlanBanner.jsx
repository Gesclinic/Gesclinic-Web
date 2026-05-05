// src/components/ui/UpgradePlanBanner.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useClinicContext } from '@/contexts/useClinicContext';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';

/**
 * Banner de upgrade exibido quando feature não está disponível
 * Aparece em modo warning/yellow
 */
export function UpgradePlanBanner({ feature, title, message, showButton = true }) {
  const hasAccess = useFeatureAccess(feature);
  const { clinic } = useClinicContext();

  if (hasAccess) {
    return null;
  }

  const planUpgrade = {
    basic: {
      current: 'Plano Básico',
      upgrade: 'Plano Profissional',
      price: 'R$ 249/mês',
    },
    professional: {
      current: 'Plano Profissional',
      upgrade: 'Plano Enterprise',
      price: 'R$ 489/mês',
    },
  };

  const upgrade = planUpgrade[clinic?.plan?.slug] || planUpgrade.basic;

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded">
      <div className="flex items-start justify-between">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-yellow-800">
              {title || `Recurso não disponível no ${upgrade.current}`}
            </p>
            <p className="mt-2 text-sm text-yellow-700">
              {message || `Para acessar este recurso, faça upgrade para o ${upgrade.upgrade}.`}
            </p>
            {showButton && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-yellow-800 mb-2">
                  {upgrade.upgrade} - {upgrade.price}
                </p>
                <Link
                  to="/clinica/configuracoes/plano"
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 transition"
                >
                  Fazer Upgrade Agora
                  <svg className="ml-2 -mr-1 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </Link>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={() => {}} // Close button logic se precisar
          className="ml-3 text-yellow-400 hover:text-yellow-500"
        >
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

/**
 * Modal maior para bloqueio de funcionalidade
 * Usado quando usuário tenta acessar feature bloqueada via URL
 */
export function BlockedFeatureModal({ feature, onClose }) {
  const { clinic } = useClinicContext();

  const featureNames = {
    estoque: 'Controle de Estoque',
    financeiro: 'Financeiro Completo',
    relatorios: 'Relatórios Avançados',
    multiunidades: 'Múltiplas Unidades',
    repasse_medico: 'Repasse Médico',
  };

  const planUpgrade = {
    basic: 'Profissional',
    professional: 'Enterprise',
  };

  const currentPlan = clinic?.plan?.slug;
  const upgradeOption = planUpgrade[currentPlan] || 'Professional';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4v2m0 4v2M6.92 5.08A9.002 9.002 0 1018 12"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Acesso Restrito</h3>
          <p className="text-sm text-gray-500 mb-6">
            O recurso "<strong>{featureNames[feature] || feature}</strong>" não está disponível no
            seu plano atual.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>Seu plano atual:</strong> {clinic?.plan?.name}
            </p>
            <p className="text-xs text-blue-700 mt-2">
              Faça upgrade para o <strong>Plano {upgradeOption}</strong> para desbloquear este
              recurso.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition"
            >
              Cancelar
            </button>
            <Link
              to="/clinica/configuracoes/plano"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition"
            >
              Ver Planos
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UpgradePlanBanner;
