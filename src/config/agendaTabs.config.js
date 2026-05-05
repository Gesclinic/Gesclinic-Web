/**
 * 📋 CONFIGURAÇÃO DE ABAS DA AGENDA POR PERFIL
 * Controla quais abas (dia/semana/mês) cada perfil pode acessar
 */

export const AGENDA_TABS_CONFIG = {
  // ========== ADMIN ==========
  admin: {
    id: 'admin',
    label: 'Administrador',
    tabs: {
      dia: true, // 📅 Dia
      semana: true, // 🗓 Semana
      mes: true, // 📆 Mês
    },
    description: 'Acesso completo a todas as visualizações da agenda',
  },

  // ========== GESTOR ==========
  gestor: {
    id: 'gestor',
    label: 'Gestor',
    tabs: {
      dia: true,
      semana: true,
      mes: true,
    },
    description: 'Acesso completo a todas as visualizações da agenda',
  },

  // ========== RECEPÇÃO ==========
  recepcao: {
    id: 'recepcao',
    label: 'Recepção',
    tabs: {
      dia: true,
      semana: true,
      mes: true,
    },
    description: 'Acesso a dia, semana e mês da agenda',
  },

  // ========== PROFISSIONAL ==========
  profissional: {
    id: 'profissional',
    label: 'Profissional',
    tabs: {
      dia: true, // 📅 Visualizar apenas seu dia
      semana: true, // 🗓 Visualizar sua semana
      mes: true, // 📆 Visualizar seu mês
    },
    description: 'Acesso a visualizações da sua agenda pessoal',
  },

  // ========== FINANCEIRO ==========
  financeiro: {
    id: 'financeiro',
    label: 'Financeiro',
    tabs: {
      dia: true,
      semana: true,
      mes: true,
    },
    description: 'Acesso a visualizações da agenda para análise financeira',
  },

  // ========== ESTOQUE ==========
  estoque: {
    id: 'estoque',
    label: 'Estoque',
    tabs: {
      dia: false, // Sem acesso
      semana: false, // Sem acesso
      mes: false, // Sem acesso
    },
    description: 'Este perfil não tem acesso à agenda',
  },

  // ========== FATURAMENTO ==========
  faturamento: {
    id: 'faturamento',
    label: 'Faturamento',
    tabs: {
      dia: true,
      semana: true,
      mes: true,
    },
    description: 'Acesso a visualizações da agenda para faturamento',
  },
};

/**
 * Obter configuração de abas para um perfil específico
 * @param {string} role - Role/perfil do usuário (ex: 'admin', 'profissional')
 * @returns {object} Configuração de abas do perfil
 */
export function getAgendaTabsForRole(role) {
  if (!role) {
    return AGENDA_TABS_CONFIG.recepcao;
  } // Default

  const config = AGENDA_TABS_CONFIG[role.toLowerCase()];
  return config || AGENDA_TABS_CONFIG.recepcao;
}

/**
 * Verificar se um perfil tem acesso a uma aba específica
 * @param {string} role - Role/perfil do usuário
 * @param {string} tabName - Nome da aba ('dia', 'semana', 'mes')
 * @returns {boolean} true se tem acesso, false caso contrário
 */
export function canAccessAgendaTab(role, tabName) {
  const config = getAgendaTabsForRole(role);
  return config.tabs[tabName] === true;
}

/**
 * Obter lista de abas acessíveis para um perfil
 * @param {string} role - Role/perfil do usuário
 * @returns {array} Array com nomes das abas acessíveis
 */
export function getAccessibleAgendaTabs(role) {
  const config = getAgendaTabsForRole(role);
  return Object.keys(config.tabs).filter((tabName) => config.tabs[tabName] === true);
}

/**
 * Labels e ícones das abas de agenda
 */
export const AGENDA_TAB_LABELS = {
  dia: { label: '📅 Dia', icon: '📅', fullLabel: 'Visualização por Dia' },
  semana: { label: '🗓 Semana', icon: '🗓', fullLabel: 'Visualização por Semana' },
  mes: { label: '📆 Mês', icon: '📆', fullLabel: 'Visualização por Mês' },
};

/**
 * Comportamento padrão das abas por perfil
 * Todos os perfis abrem na aba "Dia" por padrão
 */
export const DEFAULT_AGENDA_TAB_BY_ROLE = {
  admin: 'dia', // Admins vêem dia
  gestor: 'dia', // Gestores vêem dia
  recepcao: 'dia', // Recepção vê dia
  profissional: 'dia', // Profissional vê seu dia
  financeiro: 'dia', // Financeiro vê dia
  estoque: 'dia', // Padrão caso tenham acesso
  faturamento: 'dia', // Faturamento vê dia
};
