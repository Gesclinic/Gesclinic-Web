/**
 * Configuração das abas do modal de Convênios
 */

export const CONVENIENCE_TABS = [
  {
    id: 'general',
    label: 'Dados Gerais',
    icon: '📋',
    description: 'Informações básicas e de contato do convênio',
    color: 'blue',
  },
  {
    id: 'address',
    label: 'Endereço',
    icon: '📍',
    description: 'Localização e dados de endereço',
    color: 'blue',
  },
  {
    id: 'fiscal',
    label: 'Fiscal',
    icon: '🏛️',
    description: 'Inscrições fiscais e identificação',
    color: 'blue',
  },
  {
    id: 'billing',
    label: 'Faturamento',
    icon: '💰',
    description: 'Configurações de faturamento e descontos',
    color: 'orange',
  },
  {
    id: 'taxes',
    label: 'Tributos',
    icon: '📊',
    description: 'Alíquotas e configurações tributárias',
    color: 'blue',
  },
  {
    id: 'financial',
    label: 'Financeiro',
    icon: '💳',
    description: 'Margens e retenções financeiras',
    color: 'green',
  },
  {
    id: 'plans',
    label: 'Planos',
    icon: '📚',
    description: 'Gerenciar planos de saúde',
    color: 'purple',
  },
  {
    id: 'pricing',
    label: 'Tabela de Preços',
    icon: '💵',
    description: 'Configurar preços de serviços',
    color: 'red',
  },
  {
    id: 'tiss',
    label: 'TISS',
    icon: '⚙️',
    description: 'Configuração TISS/CBHPM',
    color: 'purple',
  },
];

/**
 * Mapa de cores para as abas
 */
export const TAB_COLORS = {
  blue: {
    border: 'border-blue-500',
    text: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  orange: {
    border: 'border-orange-500',
    text: 'text-orange-600',
    bg: 'bg-orange-50',
  },
  green: {
    border: 'border-green-500',
    text: 'text-green-600',
    bg: 'bg-green-50',
  },
  purple: {
    border: 'border-purple-500',
    text: 'text-purple-600',
    bg: 'bg-purple-50',
  },
  red: {
    border: 'border-red-500',
    text: 'text-red-600',
    bg: 'bg-red-50',
  },
};

/**
 * Opções padrão para os selects
 */
export const FORM_OPTIONS = {
  types: [
    { value: 'health_plan', label: '🏥 Plano de Saúde' },
    { value: 'private_insurance', label: '🛡️ Seguro Privado' },
    { value: 'government', label: '🏛️ Governamental (SUS/INSS)' },
    { value: 'direct_pay', label: '💸 Pagamento Direto' },
    { value: 'other', label: '📋 Outro' },
  ],
  states: [
    { value: 'AC', label: 'Acre' },
    { value: 'AL', label: 'Alagoas' },
    { value: 'AP', label: 'Amapá' },
    { value: 'AM', label: 'Amazonas' },
    { value: 'BA', label: 'Bahia' },
    { value: 'CE', label: 'Ceará' },
    { value: 'DF', label: 'Distrito Federal' },
    { value: 'ES', label: 'Espírito Santo' },
    { value: 'GO', label: 'Goiás' },
    { value: 'MA', label: 'Maranhão' },
    { value: 'MT', label: 'Mato Grosso' },
    { value: 'MS', label: 'Mato Grosso do Sul' },
    { value: 'MG', label: 'Minas Gerais' },
    { value: 'PA', label: 'Pará' },
    { value: 'PB', label: 'Paraíba' },
    { value: 'PR', label: 'Paraná' },
    { value: 'PE', label: 'Pernambuco' },
    { value: 'PI', label: 'Piauí' },
    { value: 'RJ', label: 'Rio de Janeiro' },
    { value: 'RN', label: 'Rio Grande do Norte' },
    { value: 'RS', label: 'Rio Grande do Sul' },
    { value: 'RO', label: 'Rondônia' },
    { value: 'RR', label: 'Roraima' },
    { value: 'SC', label: 'Santa Catarina' },
    { value: 'SP', label: 'São Paulo' },
    { value: 'SE', label: 'Sergipe' },
    { value: 'TO', label: 'Tocantins' },
  ],
  countries: [
    { value: 'Brasil', label: '🇧🇷 Brasil' },
  ],
  taxRegimes: [
    { value: 'Simples', label: 'Simples Nacional' },
    { value: 'Lucro Presumido', label: 'Lucro Presumido' },
    { value: 'Lucro Real', label: 'Lucro Real' },
  ],
  retentionTypes: [
    { value: 'particular', label: '🔵 Particular (sem retenção)' },
    { value: 'ti', label: '🟠 TI (Tributação Integrada)' },
    { value: 'tirf', label: '🔴 TIRF (TI + Retenção na Fonte)' },
  ],
  guideFormats: [
    { value: 'TISS', label: 'TISS (padrão)' },
    { value: 'Custom', label: 'Personalizado' },
  ],
  tissPatternsVersions: [
    { value: '3.05.00', label: 'TISS 3.05.00 (Recomendado)' },
    { value: '3.04.00', label: 'TISS 3.04.00' },
    { value: '3.03.00', label: 'TISS 3.03.00' },
  ],
};

export default {
  CONVENIENCE_TABS,
  TAB_COLORS,
  FORM_OPTIONS,
};
