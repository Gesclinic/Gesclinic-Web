// src/pages/clinica/base-sistema/setupWizardSteps.js
// ============================================================
// SETUP WIZARD STEPS - Definição dos passos do wizard
// Modelo Conceitual: Cadastros → Regras → Financeiro
// ============================================================

/**
 * Define os passos do setup wizard com validações e metadata
 * Organizado em 3 categorias principais
 */
export const SETUP_WIZARD_STEPS = [
  // ============================================================
  // CATEGORIA 1: CADASTROS ESTRUTURAIS
  // ============================================================
  {
    id: "services",
    order: 1,
    title: "Serviços",
    icon: "Stethoscope",
    color: "blue",
    required: true,
    category: "cadastros-estruturais",
    menuRoute: "/clinica/base-sistema/servicos",
    validationKey: "services",
    minRequired: 1,
    message: "Nenhum serviço cadastrado",
    helpText: "Comece definindo os tipos de atendimento que sua clínica oferece",
    dependencies: [],
  },

  {
    id: "professionals",
    order: 2,
    title: "Profissionais",
    icon: "Users",
    color: "green",
    required: true,
    category: "cadastros-estruturais",
    menuRoute: "/clinica/base-sistema/profissionais",
    validationKey: "professionals",
    minRequired: 1,
    message: "Nenhum profissional cadastrado",
    helpText: "Cadastre os profissionais que irão prestar os serviços",
    dependencies: [],
  },

  {
    id: "health_insurances",
    order: 3,
    title: "Convênios",
    icon: "Shield",
    color: "indigo",
    required: false,
    category: "cadastros-estruturais",
    menuRoute: "/clinica/base-sistema/convenios",
    validationKey: "health_insurances",
    minRequired: 0,
    message: "Nenhum convênio cadastrado",
    helpText: "Adicione os convênios que sua clínica atende",
    dependencies: [],
  },

  {
    id: "rooms",
    order: 4,
    title: "Salas",
    icon: "DoorOpen",
    color: "orange",
    required: false,
    category: "cadastros-estruturais",
    menuRoute: "/clinica/base-sistema/salas",
    validationKey: "rooms",
    minRequired: 0,
    message: "Nenhuma sala cadastrada",
    helpText: "Configure as salas onde os atendimentos ocorrerão",
    dependencies: [],
  },

  {
    id: "resources",
    order: 5,
    title: "Recursos",
    icon: "Boxes",
    color: "purple",
    required: false,
    category: "cadastros-estruturais",
    menuRoute: "/clinica/base-sistema/recursos",
    validationKey: "resources",
    minRequired: 0,
    message: "Nenhum recurso cadastrado",
    helpText: "Equipamentos e materiais disponíveis nas salas",
    dependencies: [],
  },

  // ============================================================
  // CATEGORIA 2: REGRAS OPERACIONAIS
  // ============================================================
  {
    id: "professional_services",
    order: 6,
    title: "Profissionais × Serviços",
    description: "Vincular profissionais aos serviços que realizam",
    icon: "Link2",
    color: "cyan",
    required: true,
    category: "regras-operacionais",
    menuRoute: "/clinica/base-sistema/professional-services",
    validationKey: "professional_services",
    minRequired: 1,
    message: "Nenhum profissional vinculado a serviços",
    helpText: "Defina quais profissionais podem realizar cada serviço",
    dependencies: ["services", "professionals"],
  },

  {
    id: "professional_payer",
    order: 7,
    title: "Profissionais × Convênios",
    description: "Vincular profissionais aos convênios que atendem",
    icon: "Users-link",
    color: "teal",
    required: false,
    category: "regras-operacionais",
    menuRoute: "/clinica/base-sistema/professional-payer",
    validationKey: "professional_payer",
    minRequired: 0,
    message: "Nenhum profissional vinculado aos convênios",
    helpText: "Indique quais profissionais atendem cada convênio",
    dependencies: ["professionals", "health_insurances"],
  },

  {
    id: "agenda_rules",
    order: 8,
    title: "Regras da Agenda",
    description: "Duração, intervalo e limites de agendamento",
    icon: "Calendar",
    color: "red",
    required: true,
    category: "regras-operacionais",
    menuRoute: "/clinica/base-sistema/agenda-rules",
    validationKey: "agenda_rules",
    minRequired: 1,
    message: "Nenhuma regra de agenda configurada",
    helpText: "Configure como cada serviço será agendado (duração, intervalo, etc)",
    dependencies: ["services"],
  },

  {
    id: "room_services",
    order: 9,
    title: "Salas × Serviços",
    description: "Vincular serviços às salas onde são realizados",
    icon: "Zap",
    color: "amber",
    required: false,
    category: "regras-operacionais",
    menuRoute: "/clinica/base-sistema/room-resources",
    validationKey: "room_services",
    minRequired: 0,
    message: "Nenhum serviço vinculado às salas",
    helpText: "Configure quais serviços são realizados em cada sala",
    dependencies: ["rooms", "services"],
  },

  // ============================================================
  // CATEGORIA 3: PARÂMETROS FINANCEIROS
  // ============================================================
  {
    id: "service_prices",
    order: 10,
    title: "Tabela de Preços",
    description: "Valores dos serviços por convênio/particular",
    icon: "DollarSign",
    color: "green",
    required: false,
    category: "parametros-financeiros",
    menuRoute: "/clinica/base-sistema/service-prices",
    validationKey: "service_prices",
    minRequired: 0,
    message: "Nenhuma tabela de preço configurada",
    helpText: "Configure os preços dos serviços para cada convênio",
    dependencies: ["services", "health_insurances"],
  },

  {
    id: "professional_schedule",
    order: 11,
    title: "Valores por Convênio",
    description: "Configurações específicas por operadora",
    icon: "TrendingUp",
    color: "emerald",
    required: false,
    category: "parametros-financeiros",
    menuRoute: "/clinica/base-sistema/professional-schedule",
    validationKey: "professional_schedule",
    minRequired: 0,
    message: "Nenhum valor configurado",
    helpText: "Configure valores específicos por convênio se necessário",
    dependencies: ["health_insurances"],
  },

  {
    id: "revenue_rules",
    order: 12,
    title: "Regras de Repasse",
    description: "Cálculo de remuneração dos profissionais",
    icon: "Share2",
    color: "blue",
    required: false,
    category: "parametros-financeiros",
    menuRoute: "/clinica/base-sistema/revenue-rules",
    validationKey: "revenue_rules",
    minRequired: 0,
    message: "Nenhuma regra de repasse configurada",
    helpText: "Configure como calcular e distribuir renda entre profissionais",
    dependencies: ["services", "professionals"],
  },
];

/**
 * Agrupa os passos por categoria
 */
export const SETUP_WIZARD_CATEGORIES = {
  "cadastros-estruturais": {
    title: "📋 Cadastros Estruturais",
    description: "Base de dados da sua clínica",
    icon: "📋",
    color: "blue",
    steps: SETUP_WIZARD_STEPS.filter((s) => s.category === "cadastros-estruturais"),
  },
  "regras-operacionais": {
    title: "⚙️ Regras Operacionais",
    description: "Como funciona sua clínica",
    icon: "⚙️",
    color: "amber",
    steps: SETUP_WIZARD_STEPS.filter((s) => s.category === "regras-operacionais"),
  },
  "parametros-financeiros": {
    title: "💰 Parâmetros Financeiros",
    description: "Configurações de preços e pagamentos",
    icon: "💰",
    color: "green",
    steps: SETUP_WIZARD_STEPS.filter((s) => s.category === "parametros-financeiros"),
  },
};

/**
 * Calcula o progresso do wizard baseado no status dos passos
 * @param {Object} stepStatus - Objeto com status de cada passo
 * @returns {number} Percentual de conclusão (0-100)
 */
export function calculateWizardProgress(stepStatus) {
  const requiredSteps = SETUP_WIZARD_STEPS.filter((s) => s.required);
  if (requiredSteps.length === 0) return 0;

  const completedRequired = requiredSteps.filter(
    (s) => stepStatus[s.id]?.completed
  ).length;

  return Math.round((completedRequired / requiredSteps.length) * 100);
}

/**
 * Verifica se o wizard está completo (apenas steps required)
 * @param {Object} stepStatus
 * @returns {boolean}
 */
export function isWizardComplete(stepStatus) {
  const requiredSteps = SETUP_WIZARD_STEPS.filter((s) => s.required);
  return requiredSteps.every((s) => stepStatus[s.id]?.completed);
}

/**
 * Retorna os problemas (issues) para um passo específico
 * @param {string} stepId
 * @param {Object} stepData
 * @returns {Array}
 */
export function getStepIssues(stepId, stepData = {}) {
  const step = SETUP_WIZARD_STEPS.find((s) => s.id === stepId);
  if (!step) return [];

  const issues = [];
  const count = stepData.count || 0;

  if (count < step.minRequired) {
    issues.push({
      severity: step.required ? "error" : "warning",
      message: `${step.minRequired} ${step.title.toLowerCase()} necessário(s)`,
      action: `Acesse ${step.menuRoute}`,
    });
  }

  return issues;
}

/**
 * Formata um step para exibição na UI
 * @param {Object} step
 * @param {Object} status
 * @returns {Object}
 */
export function formatStepForUI(step, status = {}) {
  return {
    ...step,
    completed: status.completed || false,
    count: status.count || 0,
    issues: getStepIssues(step.id, status),
  };
}

