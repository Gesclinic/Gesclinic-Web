import { getMenuItems } from '@/constants/menu';
import { HEALTHCARE_ROLES } from '@/lib/rbacCatalog';

const ROLE_IDS = Array.from(new Set(['admin', ...HEALTHCARE_ROLES.map((role) => role.id)]));
const BROAD_MODULE_ROOT_PATHS = new Set([
  '/clinica/agenda',
  '/clinica/pacientes',
  '/clinica/base-sistema',
  '/clinica/financeiro',
  '/clinica/estoque',
  '/clinica/faturamento',
  '/clinica/configuracoes',
  '/clinica/administracao',
]);

const TECHNICAL_PERMISSION_MODULES = {
  agenda: {
    label: 'Agenda',
    permissions: [
      {
        id: 'agenda.atendimento',
        label: 'Atendimento da Agenda',
        description: 'Acessar fluxo técnico de atendimento derivado da agenda',
      },
    ],
  },
  cadastros_basicos: {
    label: 'Cadastros Básicos',
    permissions: [
      {
        id: 'cadastros_basicos.agenda_rules',
        label: 'Regras de Agenda',
        description: 'Acessar regras técnicas de agenda por profissional/sala',
      },
      {
        id: 'cadastros_basicos.professional_schedule',
        label: 'Agenda Profissional',
        description: 'Acessar configuração técnica de agenda por profissional',
      },
    ],
  },
  financeiro: {
    label: 'Financeiro',
    permissions: [
      {
        id: 'financeiro.contas_receber_editar',
        label: 'Editar Contas a Receber',
        description: 'Acessar edição técnica de recebimentos por ID',
      },
      {
        id: 'financeiro.contas_pagar_editar',
        label: 'Editar Contas a Pagar',
        description: 'Acessar edição técnica de contas a pagar por ID',
      },
      {
        id: 'financeiro.contas_financeiras_editar',
        label: 'Editar Contas Financeiras',
        description: 'Acessar edição técnica de contas financeiras por ID',
      },
      {
        id: 'financeiro.estorno',
        label: 'Aprovar Estorno Financeiro',
        description: 'Acessar e decidir solicitações de estorno financeiro de atendimentos',
      },
    ],
  },
  administracao: {
    label: 'Administração',
    permissions: [
      {
        id: 'administracao.legacy',
        label: 'Rotas Legadas de Administração',
        description: 'Acessar aliases técnicos legados do módulo de administração',
      },
    ],
  },
};

const EXPLICIT_ROUTE_RULES = [
  // Legacy admin aliases
  {
    match: /^\/admin(\/|$)/,
    permission: 'administracao.legacy',
    level: (pathname) => inferLevelFromPath(pathname),
  },

  // Agenda technical/legacy routes
  { match: /^\/clinica\/agenda-novo(\/|$)/, permission: 'agenda', level: 'view' },
  { match: /^\/clinica\/agenda\/recepcao(\/|$)/, permission: 'agenda', level: 'view' },
  { match: /^\/clinica\/agenda\/profissional(\/|$)/, permission: 'agenda', level: 'view' },
  { match: /^\/clinica\/agenda\/sala(\/|$)/, permission: 'agenda', level: 'view' },
  { match: /^\/clinica\/agenda\/geral(\/|$)/, permission: 'agenda', level: 'view' },
  { match: /^\/clinica\/agenda\/confirmacoes(\/|$)/, permission: 'agenda', level: 'view' },
  { match: /^\/clinica\/agenda\/espera(\/|$)/, permission: 'agenda', level: 'view' },
  { match: /^\/clinica\/agenda\/indicadores(\/|$)/, permission: 'agenda', level: 'view' },
  { match: /^\/clinica\/agenda\/atendimento\/.+/, permission: 'agenda.atendimento', level: 'edit' },
  { match: /^\/clinica\/agendamento\/confirmar\/.+/, permission: 'agenda', level: 'view' },

  // Dashboard technical routes
  { match: /^\/clinica\/dashboard\/atendimentos(\/|$)/, permission: 'dashboard', level: 'view' },
  { match: /^\/clinica\/dashboard\/financeiro(\/|$)/, permission: 'financeiro.visao_geral', level: 'view' },
  { match: /^\/clinica\/dashboard\/faturamento(\/|$)/, permission: 'faturamento.dashboard', level: 'view' },

  // Configurações root and technical aliases
  { match: /^\/clinica\/configuracoes$/, permission: 'configuracoes', level: 'edit' },
  { match: /^\/clinica\/configuracoes\/permissoes(\/|$)/, permission: 'administracao.permissoes', level: 'edit' },
  { match: /^\/clinica\/configuracoes\/agenda(\/|$)/, permission: 'configuracoes.agenda', level: 'edit' },
  { match: /^\/clinica\/configuracoes\/faturamento(\/|$)/, permission: 'configuracoes.faturamento', level: 'edit' },
  { match: /^\/clinica\/configuracoes\/estoque(\/|$)/, permission: 'configuracoes.estoque', level: 'edit' },

  // Financeiro technical aliases
  { match: /^\/clinica\/financeiro\/dashboard(\/|$)/, permission: 'financeiro.visao_geral', level: 'view' },
  { match: /^\/clinica\/financeiro\/solicitacoes-estorno(\/|$)/, permission: 'financeiro.estorno', level: 'view' },
  { match: /^\/clinica\/financeiro\/dre(\/|$)/, permission: 'financeiro.resultado', level: 'view' },
  { match: /^\/clinica\/financeiro\/contas-receber(\/|$)/, permission: 'financeiro.receber', level: 'view' },
  {
    match: /^\/clinica\/financeiro\/receber\/[^/]+\/editar(\/|$)/,
    permission: 'financeiro.contas_receber_editar',
    level: 'edit',
  },
  {
    match: /^\/clinica\/financeiro\/movimento\/contas-a-receber(\/|$)/,
    permission: 'financeiro.receber',
    level: 'view',
  },
  {
    match: /^\/clinica\/financeiro\/movimento\/contas-a-pagar(\/|$)/,
    permission: 'financeiro.pagar',
    level: 'view',
  },
  { match: /^\/clinica\/financeiro\/fluxo$/, permission: 'financeiro.fluxo', level: 'view' },
  { match: /^\/clinica\/financeiro\/conciliacao(\/|$)/, permission: 'financeiro.conciliacao', level: 'view' },
  {
    match: /^\/clinica\/financeiro\/contas-pagar\/[^/]+\/editar(\/|$)/,
    permission: 'financeiro.contas_pagar_editar',
    level: 'edit',
  },
  {
    match: /^\/clinica\/financeiro\/contas-financeiras\/[^/]+\/editar(\/|$)/,
    permission: 'financeiro.contas_financeiras_editar',
    level: 'edit',
  },
  {
    match: /^\/clinica\/financeiro\/etapa1-integracao-agenda(\/|$)/,
    permission: 'financeiro.automacoes',
    level: 'edit',
  },
  {
    match: /^\/clinica\/financeiro\/autorizacoes-descontos(\/|$)/,
    permission: 'financeiro.autorizacoes_descontos',
    level: 'edit',
  },
  { match: /^\/clinica\/financeiro\/repasse$/, permission: 'financeiro.repasse', level: 'view' },
  {
    match: /^\/clinica\/financeiro\/repasse\/(visao-geral|analytics)(\/|$)/,
    permission: 'financeiro.repasse',
    level: 'view',
  },
  {
    match: /^\/clinica\/financeiro\/repasse\/(regras-avancadas|automacao)(\/|$)/,
    permission: 'financeiro.repasse',
    level: 'edit',
  },
  {
    match: /^\/clinica\/financeiro\/repasse\/regras(\/|$)/,
    permission: 'financeiro.repasse',
    level: 'edit',
  },
  {
    match: /^\/clinica\/financeiro\/repasse\/(dashboard-executivo|producao-medica|calculo-repasse|contas-pagar-medicas|glosas-impacto|analytics|rentabilidade|simulacoes|contas-bancarias|auditoria)(\/|$)/,
    permission: 'financeiro.repasse',
    level: 'view',
  },
  {
    match: /^\/clinica\/financeiro\/repasse\/(aprovacoes|automacoes)(\/|$)/,
    permission: 'financeiro.repasse',
    level: 'edit',
  },
  { match: /^\/clinica\/repasse(\/|$)/, permission: 'financeiro.repasse', level: 'view' },
  { match: /^\/clinica\/financeiro\/repasse-medico(\/|$)/, permission: 'financeiro.repasse', level: 'view' },
  { match: /^\/clinica\/financeiro\/repasse\/medico(\/|$)/, permission: 'financeiro.repasse', level: 'view' },

  // Faturamento technical alias
  { match: /^\/clinica\/faturamento\/lotes(\/|$)/, permission: 'faturamento.lotes_faturamento', level: 'view' },
  { match: /^\/clinica\/faturamento\/tiss(\/|$)/, permission: 'faturamento.guias', level: 'view' },
  { match: /^\/clinica\/faturamento\/configuracoes(\/|$)/, permission: 'configuracoes.faturamento', level: 'edit' },

  // Estoque technical alias
  { match: /^\/clinica\/estoque\/dashboard(\/|$)/, permission: 'estoque.visao_geral', level: 'view' },

  // Pacientes dynamic detail route
  { match: /^\/clinica\/pacientes\/[^/]+(\/|$)/, permission: 'pacientes.lista', level: 'view' },

  // Atendimento outside menu
  { match: /^\/clinica\/atendimento\/.+/, permission: 'agenda.atendimento', level: 'edit' },

  // Base-sistema technical routes outside menu
  { match: /^\/clinica\/base-sistema$/, permission: 'cadastros_basicos.servicos', level: 'view' },
  {
    match: /^\/clinica\/base-sistema\/agenda-rules(\/|$)/,
    permission: 'cadastros_basicos.agenda_rules',
    level: 'edit',
  },
  {
    match: /^\/clinica\/base-sistema\/professional-schedule(\/|$)/,
    permission: 'cadastros_basicos.professional_schedule',
    level: 'edit',
  },

  // Clinica index and diagnostics
  { match: /^\/clinica$/, permission: 'dashboard', level: 'view' },
  { match: /^\/diagnostics(\/|$)/, permission: 'administracao.auditoria', level: 'view' },
];

function normalizePath(pathname) {
  if (!pathname || pathname === '/') {
    return pathname || '';
  }
  const normalized = pathname.replace(/\/+$/, '');
  return normalized || '/';
}

function inferLevelFromPath(pathname) {
  if (!pathname) {
    return 'view';
  }

  if (pathname.startsWith('/clinica/configuracoes')) {
    return 'edit';
  }

  const editPattern = /\/(novo|nova|editar|edit|criar|create|sincronizar)(\/|$)/i;
  return editPattern.test(pathname) ? 'edit' : 'view';
}

const PERMISSION_ORDER_RULES = [
  { rank: 10, patterns: [/\blista\b/i, /\bvis[aã]o geral\b/i, /\bdashboard\b/i, /\bgeral\b/i] },
  { rank: 20, patterns: [/\bnovo\b/i, /\bnova\b/i, /\bcriar\b/i, /\bcadastro\b/i] },
  { rank: 30, patterns: [/\beditar\b/i, /\bedi[cç][aã]o\b/i, /\bconfigura[cç][aã]o\b/i, /\bajuste\b/i] },
  { rank: 40, patterns: [/\bmovimenta[cç][aã]o\b/i, /\bfluxo\b/i, /\bopera[cç][aã]o\b/i, /\bexecu[cç][aã]o\b/i] },
  { rank: 50, patterns: [/\ban[aá]lise\b/i, /\banalytics\b/i, /\bindicador/i, /\bcockpit\b/i] },
  { rank: 60, patterns: [/\brelat[oó]rio/i, /\bauditoria\b/i, /\bcompliance\b/i] },
  { rank: 70, patterns: [/\bautoma[cç][aã]o\b/i, /\balerta\b/i, /\bintegra[cç][aã]o\b/i] },
  { rank: 80, patterns: [/\badministra[cç][aã]o\b/i, /\busu[aá]rio/i, /\bpermiss[aã]o/i] },
];

function getPermissionSortRank(permission) {
  const text = `${permission?.label || ''} ${permission?.id || ''}`;

  for (const rule of PERMISSION_ORDER_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(text))) {
      return rule.rank;
    }
  }

  return 999;
}

function sortPermissions(permissions = []) {
  return [...permissions].sort((a, b) => {
    const rankA = getPermissionSortRank(a);
    const rankB = getPermissionSortRank(b);

    if (rankA !== rankB) {
      return rankA - rankB;
    }

    const labelA = (a?.label || '').toLowerCase();
    const labelB = (b?.label || '').toLowerCase();
    const byLabel = labelA.localeCompare(labelB, 'pt-BR');
    if (byLabel !== 0) {
      return byLabel;
    }

    return (a?.id || '').localeCompare(b?.id || '', 'pt-BR');
  });
}

function buildCatalog() {
  const modulesMap = new Map();
  const pathMap = new Map();

  const registerPermission = (rootItem, item) => {
    if (!item?.featurePath) {
      return;
    }

    const moduleKey = (rootItem?.featurePath || item.featurePath || item.id || 'outros').split('.')[0];
    const moduleLabel = rootItem?.label || moduleKey;

    if (!modulesMap.has(moduleKey)) {
      modulesMap.set(moduleKey, {
        label: moduleLabel,
        permissions: [],
        seen: new Set(),
      });
    }

    const module = modulesMap.get(moduleKey);
    if (!module.seen.has(item.featurePath)) {
      const isModuleRootPermission = item.featurePath === moduleKey;
      module.permissions.push({
        id: item.featurePath,
        label: isModuleRootPermission ? 'Acesso ao módulo' : item.label || item.featurePath,
        description: item.path ? `Acessar ${item.label} (${item.path})` : `Acessar ${item.label}`,
      });
      module.seen.add(item.featurePath);
    }

    if (item.path) {
      const normalizedPath = normalizePath(item.path);
      if (!pathMap.has(normalizedPath)) {
        pathMap.set(normalizedPath, item.featurePath);
      }
    }
  };

  const walk = (items, rootItem) => {
    (items || []).forEach((item) => {
      const nextRoot = rootItem || item;
      registerPermission(nextRoot, item);
      if (item.children?.length) {
        walk(item.children, nextRoot);
      }
    });
  };

  ROLE_IDS.forEach((roleId) => {
    const menu = getMenuItems(roleId, { enablePermissionFilter: false });
    walk(menu, null);
  });

  const modules = {};
  modulesMap.forEach((module, key) => {
    const hasMoreThanOnePermission = (module.permissions || []).length > 1;
    const filteredPermissions = hasMoreThanOnePermission
      ? module.permissions.filter((permission) => permission.id !== key)
      : module.permissions;

    modules[key] = {
      label: module.label,
      permissions: sortPermissions(filteredPermissions),
    };
  });

  Object.entries(TECHNICAL_PERMISSION_MODULES).forEach(([moduleKey, moduleValue]) => {
    if (!modules[moduleKey]) {
      modules[moduleKey] = {
        label: moduleValue.label,
        permissions: [],
      };
    }

    const seen = new Set(modules[moduleKey].permissions.map((permission) => permission.id));
    moduleValue.permissions.forEach((permission) => {
      if (!seen.has(permission.id)) {
        modules[moduleKey].permissions.push(permission);
      }
    });

    modules[moduleKey].permissions = sortPermissions(modules[moduleKey].permissions);
  });

  const pathEntries = Array.from(pathMap.entries())
    .map(([path, permission]) => ({ path, permission }))
    .sort((a, b) => b.path.length - a.path.length);

  return {
    modules,
    pathEntries,
  };
}

const MENU_PERMISSION_CATALOG = buildCatalog();

export function getMenuPermissionModules() {
  return MENU_PERMISSION_CATALOG.modules;
}

export function getDefaultMenuPermissionsForRole(role) {
  const selected = new Set();
  const menu = getMenuItems(role, { enablePermissionFilter: false });

  const walk = (items) => {
    (items || []).forEach((item) => {
      if (item?.featurePath) {
        selected.add(item.featurePath);
      }
      if (item?.children?.length) {
        walk(item.children);
      }
    });
  };

  walk(menu);

  // Permissões técnicas fora da árvore do menu, com defaults explícitos por perfil.
  if (role === 'admin') {
    Object.values(TECHNICAL_PERMISSION_MODULES).forEach((module) => {
      module.permissions.forEach((permission) => selected.add(permission.id));
    });
  }

  if (role === 'gestor') {
    [
      'cadastros_basicos.agenda_rules',
      'cadastros_basicos.professional_schedule',
      'financeiro.contas_receber_editar',
      'financeiro.contas_pagar_editar',
      'financeiro.contas_financeiras_editar',
      'agenda.atendimento',
    ].forEach((permissionKey) => selected.add(permissionKey));
  }

  if (['medico', 'profissional', 'recepcao', 'enfermeiro', 'tecnico_enfermagem', 'multiprofissional'].includes(role)) {
    selected.add('agenda.atendimento');
  }

  if (['financeiro', 'contabilidade'].includes(role)) {
    [
      'financeiro.contas_receber_editar',
      'financeiro.contas_pagar_editar',
      'financeiro.contas_financeiras_editar',
    ].forEach((permissionKey) => selected.add(permissionKey));
  }

  return Array.from(selected);
}

export function resolvePermissionForPath(pathname) {
  if (!pathname) {
    return null;
  }

  const normalizedPath = normalizePath(pathname);

  const matched = MENU_PERMISSION_CATALOG.pathEntries.find(
    (entry) =>
      normalizedPath === entry.path ||
      (!BROAD_MODULE_ROOT_PATHS.has(entry.path) && normalizedPath.startsWith(`${entry.path}/`)),
  );

  if (matched) {
    return {
      permission: matched.permission,
      level: inferLevelFromPath(normalizedPath),
    };
  }

  const explicitMatch = EXPLICIT_ROUTE_RULES.find((rule) => rule.match.test(normalizedPath));
  if (explicitMatch) {
    const level = typeof explicitMatch.level === 'function' ? explicitMatch.level(normalizedPath) : explicitMatch.level;
    return {
      permission: explicitMatch.permission,
      level,
    };
  }

  return null;
}
