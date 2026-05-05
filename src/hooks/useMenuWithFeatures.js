// src/hooks/useMenuWithFeatures.js
import { useMemo } from 'react';
import { useClinicContext } from '@/contexts/useClinicContext';
import { hasFeatureAccess } from '@/constants/plansFeatureMap';

/**
 * Hook que retorna o menu filtrado baseado no plano da clínica
 * Bloqueia itens de menu que não estão disponíveis no plano
 */
export function useMenuWithFeatures(baseMenu) {
  const { clinic, loadingClinic } = useClinicContext();

  const filteredMenu = useMemo(() => {
    if (loadingClinic || !clinic?.plan?.slug) {
      return baseMenu;
    }

    const planSlug = clinic.plan.slug;

    // Função recursiva para filtrar items
    const filterMenuItems = (items) => {
      return items.map((item) => {
        // Verificar se o item tem uma feature path associada
        if (item.featurePath) {
          const hasAccess = hasFeatureAccess(planSlug, item.featurePath);

          if (!hasAccess) {
            return {
              ...item,
              disabled: true,
              badge: 'BLOQUEADO',
              onClick: () => {
                // Mostrar modal de upgrade
                console.log(`Feature ${item.featurePath} requer upgrade`);
              },
            };
          }
        }

        // Filtrar children recursivamente
        if (item.children && Array.isArray(item.children)) {
          return {
            ...item,
            children: filterMenuItems(item.children),
          };
        }

        return item;
      });
    };

    return filterMenuItems(baseMenu);
  }, [baseMenu, clinic, loadingClinic]);

  return filteredMenu;
}

/**
 * Hook para verificar se um item de menu está acessível
 */
export function useMenuItemAccess(featurePath) {
  const { clinic, loadingClinic } = useClinicContext();

  if (loadingClinic || !clinic?.plan?.slug) {
    return true; // Default true enquanto carrega
  }

  return hasFeatureAccess(clinic.plan.slug, featurePath);
}
