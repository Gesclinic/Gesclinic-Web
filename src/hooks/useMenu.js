import { useMemo } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { usePermissions as usePermissionsContext } from '@/contexts/PermissionsContext';
import { getMenuItems } from '@/constants/menu';

/**
 * Hook para obter menu filtrado por permissões do usuário
 *
 * @returns {Object} { menu, isFiltered, filteredCount }
 *
 * 📋 USO:
 * const { menu } = useMenu();
 *
 * const { menu, filteredCount } = useMenu();
 * console.log(`Menu com ${filteredCount} itens visíveis`);
 */
export function useMenu() {
  const { currentRole } = useAuth();
  const { canView, permissions, loading: loadingPermissions } = usePermissionsContext();

  // Filtra menu baseado no role do usuário
  const menu = useMemo(() => {
    if (!currentRole) {
      return [];
    }

    const enablePermissionFilter =
      !loadingPermissions &&
      Array.isArray(permissions) &&
      permissions.some((item) => {
        if (typeof item === 'string') {
          return item === '*';
        }
        return !!item?.permission_key;
      });

    return getMenuItems(currentRole, { canView, enablePermissionFilter });
  }, [currentRole, canView, permissions, loadingPermissions]);

  // Contagem de itens filtrados
  const filteredCount = useMemo(() => {
    const count = (items) => {
      return items.reduce((acc, item) => {
        return acc + 1 + (item.children ? count(item.children) : 0);
      }, 0);
    };
    return count(menu);
  }, [menu]);

  return {
    menu,
    isFiltered: currentRole !== 'admin',
    filteredCount,
    currentRole,
  };
}

/**
 * Hook para verificar permissão de um item específico
 *
 * @param {string} featurePath - ex: "financeiro.pagar", "agenda.geral"
 * @returns {boolean} - true se o usuário tem permissão
 *
 * 📋 USO:
 * const canViewFinanceiro = useMenuPermission("financeiro.pagar");
 *
 * if (!canViewFinanceiro) {
 *   return <AccessDenied />;
 * }
 */
export function useMenuPermission(featurePath) {
  const { menu } = useMenu();

  return useMemo(() => {
    const findFeature = (items) => {
      for (const item of items) {
        if (item.featurePath === featurePath) {
          return true;
        }
        if (item.children && findFeature(item.children)) {
          return true;
        }
      }
      return false;
    };

    return findFeature(menu);
  }, [menu, featurePath]);
}

/**
 * Hook para obter caminho de breadcrumb para um item do menu
 *
 * @param {string} featurePath - ex: "financeiro.pagar"
 * @returns {Array} - Array com { label, path } de cada nível
 *
 * 📋 USO:
 * const breadcrumb = useMenuBreadcrumb("financeiro.pagar");
 * // Retorna:
 * // [
 * //   { label: "Financeiro", path: "/clinica/financeiro" },
 * //   { label: "Contas a Pagar", path: "/clinica/financeiro/pagar" }
 * // ]
 */
export function useMenuBreadcrumb(featurePath) {
  const { menu } = useMenu();

  return useMemo(() => {
    const breadcrumb = [];

    const search = (items) => {
      for (const item of items) {
        if (item.featurePath === featurePath) {
          if (item.path) {
            breadcrumb.push({ label: item.label, path: item.path });
          }
          return true;
        }

        if (item.children && search(item.children)) {
          if (item.path) {
            breadcrumb.unshift({ label: item.label, path: item.path });
          } else if (item.featurePath) {
            breadcrumb.unshift({ label: item.label, path: null });
          }
          return true;
        }
      }
      return false;
    };

    search(menu);
    return breadcrumb;
  }, [menu, featurePath]);
}

/**
 * Hook para obter todas as permissões do usuário como strings
 *
 * @returns {Array} - Array de feature paths que o usuário pode acessar
 *
 * 📋 USO:
 * const permissions = useUserMenuPermissions();
 * console.log(permissions);
 * // ["dashboard", "agenda.geral", "agenda.profissional", ...]
 */
export function useUserMenuPermissions() {
  const { menu } = useMenu();

  return useMemo(() => {
    const permissions = [];

    const collect = (items) => {
      items.forEach((item) => {
        if (item.featurePath) {
          permissions.push(item.featurePath);
        }
        if (item.children) {
          collect(item.children);
        }
      });
    };

    collect(menu);
    return permissions;
  }, [menu]);
}
