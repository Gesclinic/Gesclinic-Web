import { useClinicContext } from '@/contexts/useClinicContext';

/**
 * Hook para verificar se a clínica tem acesso a uma feature
 * Exemplo: const canAccessFinancial = useFeatureAccess('has_financial');
 */
export function useFeatureAccess(feature) {
  const { clinic, loadingClinic } = useClinicContext();

  if (loadingClinic) {
    return false;
  }

  if (!clinic?.plan) {
    return false;
  }

  const featureMap = {
    financial: clinic.plan.has_financial,
    stock: clinic.plan.has_stock,
    reports: clinic.plan.has_reports,
    multi_unit: clinic.plan.has_multi_unit,
    financeiro: clinic.plan.has_financial, // alias
    estoque: clinic.plan.has_stock,
    relatorios: clinic.plan.has_reports,
    multiunidades: clinic.plan.has_multi_unit,
  };

  return featureMap[feature] || false;
}

/**
 * Hook para obter o limite de usuários/médicos
 */
export function usePlanLimits() {
  const { clinic, loadingClinic } = useClinicContext();

  if (loadingClinic) {
    return null;
  }

  return {
    maxUsers: clinic?.plan?.max_users || 1,
    maxDoctors: clinic?.plan?.max_doctors || 1,
    currentUsers: clinic?.user_count || 0,
    currentDoctors: clinic?.doctor_count || 0,
  };
}

/**
 * Hook para obter informações do plano
 */
export function usePlanInfo() {
  const { clinic, loadingClinic } = useClinicContext();

  if (loadingClinic) {
    return null;
  }

  return {
    planId: clinic?.plan_id,
    planName: clinic?.plan?.name,
    planSlug: clinic?.plan?.slug,
    features: {
      financial: clinic?.plan?.has_financial,
      stock: clinic?.plan?.has_stock,
      reports: clinic?.plan?.has_reports,
      multiUnit: clinic?.plan?.has_multi_unit,
    },
  };
}

/**
 * Componente para mostrar aviso de upgrade quando feature não está disponível
 */
export function UpgradePlanBanner({ feature, title, message }) {
  const hasAccess = useFeatureAccess(feature);

  if (hasAccess) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
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
            {title || 'Feature indisponível no seu plano'}
          </p>
          <p className="text-sm text-yellow-700 mt-1">
            {message || 'Faça upgrade para acessar esta funcionalidade.'}
          </p>
          <div className="mt-3">
            <a
              href="/clinica/configuracoes/plano"
              className="text-sm font-medium text-yellow-800 hover:text-yellow-700"
            >
              Fazer upgrade agora &rarr;
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * HOC para proteger componentes que precisam de uma feature específica
 */
export function ProtectFeature({ feature, children, fallback = null }) {
  const hasAccess = useFeatureAccess(feature);

  if (!hasAccess) {
    return (
      fallback || (
        <UpgradePlanBanner
          feature={feature}
          title="Recurso indisponível"
          message={'Este recurso não está disponível no seu plano.'}
        />
      )
    );
  }

  return children;
}
