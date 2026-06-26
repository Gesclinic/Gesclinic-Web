export const ACCESS_LEVELS = {
  BLOCKED: 'blocked',
  VIEW: 'view',
  EDIT: 'edit',
};

export const DATA_SCOPE = {
  OWN: 'own',
  TEAM: 'team',
  CLINIC: 'clinic',
};

export const HEALTHCARE_ROLES = [
  { id: 'admin', label: 'Administrador' },
  { id: 'gestor', label: 'Gestor' },
  { id: 'recepcao', label: 'Recepção' },
  { id: 'medico', label: 'Médico' },
  { id: 'profissional', label: 'Profissional' },
  { id: 'enfermeiro', label: 'Enfermeiro' },
  { id: 'tecnico_enfermagem', label: 'Técnico de Enfermagem' },
  { id: 'multiprofissional', label: 'Multiprofissional' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'faturamento', label: 'Faturamento' },
  { id: 'contabilidade', label: 'Contabilidade' },
  { id: 'estoque', label: 'Estoque' },
];

export const RBAC_MODULES = [
  {
    id: 'agenda',
    label: 'Agenda',
    children: ['agenda', 'confirmacao', 'lista_espera', 'sala', 'profissional'],
  },
  {
    id: 'atendimento',
    label: 'Atendimento',
    children: ['evolucao', 'prescricao', 'prontuario', 'anexos'],
  },
  {
    id: 'pacientes',
    label: 'Pacientes',
    children: ['cadastro', 'historico', 'documentos'],
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    children: [
      'contas_pagar',
      'contas_receber',
      'autorizacoes_descontos',
      'fluxo_caixa',
      'lancamentos',
      'dre',
      'repasse',
    ],
  },
  {
    id: 'faturamento',
    label: 'Faturamento',
    children: ['guias', 'lotes', 'retornos', 'relatorios'],
  },
  {
    id: 'contabilidade',
    label: 'Contabilidade',
    children: ['exportacoes', 'integracoes', 'centro_custos'],
  },
  {
    id: 'estoque',
    label: 'Estoque',
    children: ['produtos', 'movimentacoes', 'inventario', 'fornecedores'],
  },
  {
    id: 'administracao',
    label: 'Administração',
    children: ['usuarios', 'perfis', 'permissoes', 'auditoria'],
  },
];

export const defaultPermissionForRole = (roleId) => {
  const base = {
    accessLevel: ACCESS_LEVELS.BLOCKED,
    dataScope: DATA_SCOPE.OWN,
  };

  if (roleId === 'admin') {
    return {
      '*': { accessLevel: ACCESS_LEVELS.EDIT, dataScope: DATA_SCOPE.CLINIC },
    };
  }

  if (roleId === 'gestor') {
    return {
      'agenda.*': { accessLevel: ACCESS_LEVELS.EDIT, dataScope: DATA_SCOPE.CLINIC },
      'pacientes.*': { accessLevel: ACCESS_LEVELS.EDIT, dataScope: DATA_SCOPE.CLINIC },
      'financeiro.*': { accessLevel: ACCESS_LEVELS.EDIT, dataScope: DATA_SCOPE.CLINIC },
      'faturamento.*': { accessLevel: ACCESS_LEVELS.VIEW, dataScope: DATA_SCOPE.CLINIC },
    };
  }

  if (roleId === 'financeiro') {
    return {
      'financeiro.contas_pagar': { accessLevel: ACCESS_LEVELS.EDIT, dataScope: DATA_SCOPE.CLINIC },
      'financeiro.contas_receber': { accessLevel: ACCESS_LEVELS.EDIT, dataScope: DATA_SCOPE.CLINIC },
      'financeiro.fluxo_caixa': { accessLevel: ACCESS_LEVELS.VIEW, dataScope: DATA_SCOPE.CLINIC },
      'financeiro.lancamentos': { accessLevel: ACCESS_LEVELS.EDIT, dataScope: DATA_SCOPE.CLINIC },
      'financeiro.dre': { accessLevel: ACCESS_LEVELS.VIEW, dataScope: DATA_SCOPE.CLINIC },
      'faturamento.relatorios': { accessLevel: ACCESS_LEVELS.VIEW, dataScope: DATA_SCOPE.CLINIC },
    };
  }

  if (roleId === 'medico' || roleId === 'profissional') {
    return {
      'agenda.*': { accessLevel: ACCESS_LEVELS.EDIT, dataScope: DATA_SCOPE.OWN },
      'atendimento.*': { accessLevel: ACCESS_LEVELS.EDIT, dataScope: DATA_SCOPE.OWN },
      'pacientes.historico': { accessLevel: ACCESS_LEVELS.VIEW, dataScope: DATA_SCOPE.OWN },
      'pacientes.documentos': { accessLevel: ACCESS_LEVELS.VIEW, dataScope: DATA_SCOPE.OWN },
    };
  }

  if (roleId === 'recepcao') {
    return {
      'agenda.*': { accessLevel: ACCESS_LEVELS.EDIT, dataScope: DATA_SCOPE.CLINIC },
      'pacientes.cadastro': { accessLevel: ACCESS_LEVELS.EDIT, dataScope: DATA_SCOPE.CLINIC },
      'atendimento.evolucao': { accessLevel: ACCESS_LEVELS.VIEW, dataScope: DATA_SCOPE.CLINIC },
    };
  }

  return { '*': base };
};
