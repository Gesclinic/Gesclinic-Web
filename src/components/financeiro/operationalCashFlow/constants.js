export const GROUPS = {
  revenue: { order: 1, code: '1', label: 'Receitas Operacionais', tone: 'positive' },
  deductions: { order: 2, code: '2', label: 'Deducoes da Receita e Taxas', tone: 'warning' },
  operational: { order: 3, code: '3', label: 'Custos e Despesas Operacionais', tone: 'negative' },
  people: { order: 4, code: '4', label: 'Pessoal, Honorarios e Repasses', tone: 'negative' },
  financial: { order: 5, code: '5', label: 'Despesas Financeiras e Bancarias', tone: 'negative' },
  investments: { order: 6, code: '6', label: 'Investimentos e patrimônio', tone: 'capital' },
  distribution: { order: 7, code: '7', label: 'Distribuição de resultados', tone: 'capital' },
  unclassified: { order: 8, code: '8', label: 'Sem classificação contábil', tone: 'attention' },
};

export const PERIODICITY_OPTIONS = [
  { value: 'daily', label: 'Diário' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'yearly', label: 'Anual' },
];

export const SCENARIO_OPTIONS = [
  { value: 'realized', label: 'Realizado' },
  { value: 'forecast', label: 'Previsto' },
  { value: 'projected', label: 'Projetado' },
  { value: 'consolidated', label: 'Consolidado' },
];

export const DISPLAY_OPTIONS = [
  { value: 'income_expense', label: 'Receitas/Despesas' },
  { value: 'result', label: 'Resultado' },
  { value: 'balances', label: 'Saldos' },
];

export const PERIODICITY_VALUES = PERIODICITY_OPTIONS.map((option) => option.value);
export const SCENARIO_VALUES = SCENARIO_OPTIONS.map((option) => option.value);
export const DISPLAY_VALUES = DISPLAY_OPTIONS.map((option) => option.value);

export const OPERATIONAL_LAYOUT_STORAGE_KEY = 'gesclinic:financeiro:fluxo-caixa:operational-layout';
export const DEFAULT_OPERATIONAL_LAYOUT = {
  showTotal: true,
  density: 'comfortable',
};

export const MANAGEMENT_TREE_SECTIONS = [
  { key: 'opening', order: 0, code: '', label: 'SALDO INICIAL', tone: 'balance', icon: '🏦' },
  { key: 'revenue', order: 1, code: '01', label: 'RECEITAS', tone: 'positive', icon: '💰' },
  { key: 'deductions', order: 2, code: '02', label: 'DEDUÇÕES', tone: 'warning', icon: '⚠' },
  { key: 'operational-expenses', order: 3, code: '03', label: 'DESPESAS OPERACIONAIS', tone: 'negative', icon: '📉' },
  { key: 'administrative-expenses', order: 4, code: '04', label: 'DESPESAS ADMINISTRATIVAS', tone: 'negative', icon: '📉' },
  { key: 'financial-expenses', order: 5, code: '05', label: 'DESPESAS FINANCEIRAS', tone: 'negative', icon: '📉' },
  { key: 'taxes', order: 6, code: '06', label: 'IMPOSTOS', tone: 'tax', icon: '🏛' },
  { key: 'medical-transfers', order: 7, code: '07', label: 'REPASSES MÉDICOS', tone: 'transfer', icon: '👨‍⚕️' },
  { key: 'investments', order: 8, code: '08', label: 'INVESTIMENTOS', tone: 'capital', icon: '📊' },
  { key: 'distribution', order: 9, code: '09', label: 'DISTRIBUIÇÃO DE RESULTADOS', tone: 'capital', icon: '📊' },
  { key: 'closing', order: 10, code: '', label: 'SALDO FINAL', tone: 'balance', icon: '🏦' },
];

export const MANAGEMENT_TREE_BY_KEY = new Map(MANAGEMENT_TREE_SECTIONS.map((section) => [section.key, section]));

export const OUTFLOW_MANAGEMENT_SECTION_KEYS = new Set([
  'section:deductions',
  'section:operational-expenses',
  'section:administrative-expenses',
  'section:financial-expenses',
  'section:taxes',
  'section:medical-transfers',
  'section:investments',
  'section:distribution',
]);

export const VIRTUAL_ROW_LIMIT = 2500;