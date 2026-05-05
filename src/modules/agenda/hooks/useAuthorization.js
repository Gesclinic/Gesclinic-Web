/**
 * useAuthorization.js
 *
 * Hook customizado para verificar permissões no React
 * Integra com useAuth() e fornece helpers de RBAC
 *
 * @example
 * const { can, isAdmin, canCreate } = useAuthorization();
 *
 * if (can('agendamento:criar')) {
 *   return <CriarAgendamentoBtn />;
 * }
 */

import { useAuth } from '@/contexts/AuthContext';
import {
  can,
  isAdmin,
  isGestor,
  isHealthProfessional,
  isReceptionist,
  canAll,
  canAny,
  getPermissionReport,
} from '@/lib/authorizationHelper';

export function useAuthorization() {
  const { user } = useAuth();

  return {
    // ========================
    // Função principal
    // ========================

    /**
     * Verifica permissão geral
     * @param {string} action - Ex: 'agendamento:criar'
     * @returns {boolean}
     */
    can: (action) => can(user, action),

    /**
     * Verifica múltiplas permissões (AND)
     * @param {Array<string>} actions
     * @returns {boolean}
     */
    canAll: (actions) => canAll(user, actions),

    /**
     * Verifica múltiplas permissões (OR)
     * @param {Array<string>} actions
     * @returns {boolean}
     */
    canAny: (actions) => canAny(user, actions),

    // ========================
    // Permissões de agendamento
    // ========================

    canCreateAppointment: can(user, 'agendamento:criar'),
    canEditAppointment: can(user, 'agendamento:editar'),
    canEditAppointmentValue: can(user, 'agendamento:editar-valor'),
    canDeleteAppointment: can(user, 'agendamento:deletar'),
    canConfirmPresence: can(user, 'agendamento:confirmar-presenca'),
    canViewAppointment: can(user, 'agendamento:visualizar'),

    // ========================
    // Permissões de configuração
    // ========================

    canEditConfig: can(user, 'config:editar'),
    canViewConfig: can(user, 'config:visualizar'),

    // ========================
    // Permissões de relatório
    // ========================

    canGenerateReport: can(user, 'relatorio:gerar'),
    canExportReport: can(user, 'relatorio:exportar'),

    // ========================
    // Permissões de usuário
    // ========================

    canCreateUser: can(user, 'usuario:criar'),
    canEditUser: can(user, 'usuario:editar'),
    canDeleteUser: can(user, 'usuario:deletar'),
    canViewUser: can(user, 'usuario:visualizar'),

    // ========================
    // Permissões de auditoria
    // ========================

    canViewAudit: can(user, 'auditoria:visualizar'),
    canExportAudit: can(user, 'auditoria:exportar'),

    // ========================
    // Permissões financeiras
    // ========================

    canEditFinance: can(user, 'financeiro:editar'),
    canViewFinance: can(user, 'financeiro:visualizar'),

    // ========================
    // Role checks
    // ========================

    isAdmin: isAdmin(user),
    isGestor: isGestor(user),
    isHealthProfessional: isHealthProfessional(user),
    isReceptionist: isReceptionist(user),

    // ========================
    // Debug
    // ========================

    permissionReport: getPermissionReport(user),
    currentRole: user?.role,
    currentUser: user,
  };
}

export default useAuthorization;
