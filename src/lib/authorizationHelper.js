/**
 * authorizationHelper.js
 * 
 * Sistema de Controle de Acesso (RBAC) para Gesclinic
 * Define permissões por role e fornece função de verificação
 * 
 * Roles disponíveis:
 * - admin: Acesso completo
 * - gestor: Gerente de clínica (quase tudo exceto deletar usuários)
 * - medico: Apenas visualização e confirmação de presença
 * - recepcao: Criação e edição básica de agendamentos
 * - profissional: Igual a médico (pode visualizar suas agendas)
 */

// ============================================================
// 1. MATRIZ DE PERMISSÕES POR ROLE
// ============================================================

const PERMISSIONS = {
  admin: {
    // Agendamentos
    'agendamento:criar': true,
    'agendamento:editar': true,
    'agendamento:editar-valor': true,
    'agendamento:deletar': true,
    'agendamento:confirmar-presenca': true,
    'agendamento:visualizar': true,
    
    // Configurações
    'config:editar': true,
    'config:visualizar': true,
    
    // Relatórios
    'relatorio:gerar': true,
    'relatorio:exportar': true,
    
    // Usuários
    'usuario:criar': true,
    'usuario:editar': true,
    'usuario:deletar': true,
    'usuario:visualizar': true,
    
    // Auditoria
    'auditoria:visualizar': true,
    'auditoria:exportar': true,
    
    // Financeiro
    'financeiro:editar': true,
    'financeiro:visualizar': true,
  },

  gestor: {
    // Agendamentos
    'agendamento:criar': true,
    'agendamento:editar': true,
    'agendamento:editar-valor': false, // Gestor NÃO pode editar valores
    'agendamento:deletar': true,
    'agendamento:confirmar-presenca': true,
    'agendamento:visualizar': true,
    
    // Configurações
    'config:editar': true,
    'config:visualizar': true,
    
    // Relatórios
    'relatorio:gerar': true,
    'relatorio:exportar': true,
    
    // Usuários
    'usuario:criar': true,
    'usuario:editar': true,
    'usuario:deletar': false, // Não pode deletar usuários
    'usuario:visualizar': true,
    
    // Auditoria
    'auditoria:visualizar': true,
    'auditoria:exportar': false, // Não pode exportar
    
    // Financeiro
    'financeiro:editar': true,
    'financeiro:visualizar': true,
  },

  medico: {
    // Agendamentos
    'agendamento:criar': false,
    'agendamento:editar': false,
    'agendamento:editar-valor': false,
    'agendamento:deletar': false,
    'agendamento:confirmar-presenca': true, // Pode confirmar presença
    'agendamento:visualizar': true, // Pode visualizar seus agendamentos
    
    // Configurações
    'config:editar': false,
    'config:visualizar': false,
    
    // Relatórios
    'relatorio:gerar': false,
    'relatorio:exportar': false,
    
    // Usuários
    'usuario:criar': false,
    'usuario:editar': false,
    'usuario:deletar': false,
    'usuario:visualizar': false,
    
    // Auditoria
    'auditoria:visualizar': false,
    'auditoria:exportar': false,
    
    // Financeiro
    'financeiro:editar': false,
    'financeiro:visualizar': false,
  },

  profissional: {
    // Profissional = Médico (com direitos iguais)
    'agendamento:criar': false,
    'agendamento:editar': false,
    'agendamento:editar-valor': false,
    'agendamento:deletar': false,
    'agendamento:confirmar-presenca': true,
    'agendamento:visualizar': true,
    
    'config:editar': false,
    'config:visualizar': false,
    
    'relatorio:gerar': false,
    'relatorio:exportar': false,
    
    'usuario:criar': false,
    'usuario:editar': false,
    'usuario:deletar': false,
    'usuario:visualizar': false,
    
    'auditoria:visualizar': false,
    'auditoria:exportar': false,
    
    'financeiro:editar': false,
    'financeiro:visualizar': false,
  },

  recepcao: {
    // Agendamentos
    'agendamento:criar': true, // Pode criar
    'agendamento:editar': true, // Pode editar (horário, paciente, etc)
    'agendamento:editar-valor': false, // NÃO pode editar valores/valores
    'agendamento:deletar': false, // NÃO pode deletar
    'agendamento:confirmar-presenca': false, // NÃO pode confirmar
    'agendamento:visualizar': true, // Pode visualizar
    
    // Configurações
    'config:editar': false,
    'config:visualizar': false,
    
    // Relatórios
    'relatorio:gerar': false,
    'relatorio:exportar': false,
    
    // Usuários
    'usuario:criar': false,
    'usuario:editar': false,
    'usuario:deletar': false,
    'usuario:visualizar': false,
    
    // Auditoria
    'auditoria:visualizar': false,
    'auditoria:exportar': false,
    
    // Financeiro
    'financeiro:editar': false,
    'financeiro:visualizar': false,
  },
};

// ============================================================
// 2. FUNÇÃO PRINCIPAL: CAN(USER, ACTION)
// ============================================================

/**
 * Verifica se um usuário tem permissão para uma ação
 * 
 * @param {Object} user - Objeto do usuário com propriedades { id, role, clinic_id, etc }
 * @param {string} action - Identificador da ação (ex: 'agendamento:criar')
 * @returns {boolean} true se tem permissão, false caso contrário
 * 
 * @example
 * const user = { id: '123', role: 'recepcao' };
 * if (can(user, 'agendamento:criar')) {
 *   // Mostrar botão de criar agendamento
 * }
 */
export function can(user, action) {
  // Validações básicas
  if (!user) return false;
  if (!user.role) return false;
  if (!action || typeof action !== 'string') return false;

  // Buscar permissões do role
  const rolePermissions = PERMISSIONS[user.role];
  
  // Se role não existe, negar tudo
  if (!rolePermissions) {
    console.warn(`[RBAC] Role desconhecido: ${user.role}`);
    return false;
  }

  // Buscar permissão específica
  const hasPermission = rolePermissions[action];

  // Se permissão não está definida, negar por segurança (fail-safe)
  if (hasPermission === undefined) {
    console.warn(`[RBAC] Permissão não definida: ${action} para role ${user.role}`);
    return false;
  }

  return hasPermission === true;
}

// ============================================================
// 3. FUNÇÕES AUXILIARES PARA CASOS COMUNS
// ============================================================

/**
 * Verifica se o usuário é admin
 * @param {Object} user - Objeto do usuário
 * @returns {boolean}
 */
export function isAdmin(user) {
  return user?.role === 'admin';
}

/**
 * Verifica se o usuário é gestor
 * @param {Object} user - Objeto do usuário
 * @returns {boolean}
 */
export function isGestor(user) {
  return user?.role === 'gestor' || user?.role === 'gerente';
}

/**
 * Verifica se o usuário é profissional de saúde (médico ou profissional)
 * @param {Object} user - Objeto do usuário
 * @returns {boolean}
 */
export function isHealthProfessional(user) {
  return user?.role === 'medico' || user?.role === 'profissional';
}

/**
 * Verifica se o usuário é recepcionista
 * @param {Object} user - Objeto do usuário
 * @returns {boolean}
 */
export function isReceptionist(user) {
  return user?.role === 'recepcao';
}

/**
 * Verifica múltiplas permissões (AND - todas precisam ser true)
 * @param {Object} user - Objeto do usuário
 * @param {Array<string>} actions - Array de ações
 * @returns {boolean}
 * 
 * @example
 * if (canAll(user, ['agendamento:criar', 'agendamento:editar'])) {
 *   // User tem AMBAS as permissões
 * }
 */
export function canAll(user, actions) {
  if (!Array.isArray(actions)) return false;
  return actions.every(action => can(user, action));
}

/**
 * Verifica múltiplas permissões (OR - alguma precisa ser true)
 * @param {Object} user - Objeto do usuário
 * @param {Array<string>} actions - Array de ações
 * @returns {boolean}
 * 
 * @example
 * if (canAny(user, ['agendamento:editar', 'agendamento:deletar'])) {
 *   // User tem pelo menos UMA das permissões
 * }
 */
export function canAny(user, actions) {
  if (!Array.isArray(actions)) return false;
  return actions.some(action => can(user, action));
}

// ============================================================
// 4. LISTA DE TODAS AS PERMISSÕES (Para documentação/debug)
// ============================================================

export const ALL_PERMISSIONS = [
  // Agendamentos
  'agendamento:criar',
  'agendamento:editar',
  'agendamento:editar-valor',
  'agendamento:deletar',
  'agendamento:confirmar-presenca',
  'agendamento:visualizar',
  
  // Configurações
  'config:editar',
  'config:visualizar',
  
  // Relatórios
  'relatorio:gerar',
  'relatorio:exportar',
  
  // Usuários
  'usuario:criar',
  'usuario:editar',
  'usuario:deletar',
  'usuario:visualizar',
  
  // Auditoria
  'auditoria:visualizar',
  'auditoria:exportar',
  
  // Financeiro
  'financeiro:editar',
  'financeiro:visualizar',
];

// ============================================================
// 5. MATRIX DE PERMISSÕES POR ROLE (Para visualização)
// ============================================================

export function getPermissionMatrix() {
  const matrix = {};
  
  Object.keys(PERMISSIONS).forEach(role => {
    matrix[role] = PERMISSIONS[role];
  });
  
  return matrix;
}

/**
 * Obtém todas as permissões de um role específico
 * @param {string} role - Nome do role
 * @returns {Object} Objeto com todas as permissões do role
 */
export function getPermissionsByRole(role) {
  return PERMISSIONS[role] || {};
}

/**
 * Obtém um relatório legível das permissões de um usuário
 * @param {Object} user - Objeto do usuário
 * @returns {Object} Relatório formatado
 */
export function getPermissionReport(user) {
  if (!user || !user.role) return null;
  
  const permissions = PERMISSIONS[user.role];
  const allowed = [];
  const denied = [];
  
  Object.entries(permissions).forEach(([action, allowed_flag]) => {
    if (allowed_flag) {
      allowed.push(action);
    } else {
      denied.push(action);
    }
  });
  
  return {
    role: user.role,
    totalPermissions: allowed.length,
    allowed,
    denied,
    summary: `${user.role} pode fazer ${allowed.length} ações de ${ALL_PERMISSIONS.length} possíveis`,
  };
}

// ============================================================
// 6. DEBUG: Verificar permissões (apenas em dev)
// ============================================================

if (process.env.NODE_ENV === 'development') {
  window.__RBAC_DEBUG__ = {
    can,
    isAdmin,
    isGestor,
    isHealthProfessional,
    isReceptionist,
    canAll,
    canAny,
    getPermissionMatrix,
    getPermissionsByRole,
    getPermissionReport,
    PERMISSIONS,
    ALL_PERMISSIONS,
  };
}

export default {
  can,
  isAdmin,
  isGestor,
  isHealthProfessional,
  isReceptionist,
  canAll,
  canAny,
  getPermissionMatrix,
  getPermissionsByRole,
  getPermissionReport,
  PERMISSIONS,
  ALL_PERMISSIONS,
};