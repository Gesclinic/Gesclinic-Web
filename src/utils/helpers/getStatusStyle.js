// src/utils/helpers/getStatusStyle.js
// Retorna estilos de cor para cada status de agendamento
// Mapeamento baseado em appointmentStatusConstants.js

/**
 * Mapeamento de status para cores Tailwind
 * Segue a mesma configuração de STATUS_CONFIG de appointmentStatusConstants
 */
const TAILWIND_COLOR_MAP = {
  'bg-blue-100': '#DBEAFE',
  'bg-cyan-100': '#CFFAFE',
  'bg-green-100': '#DCFCE7',
  'bg-green-200': '#BBF7D0',
  'bg-yellow-100': '#FEF3C7',
  'bg-orange-100': '#FFEDD5',
  'bg-red-100': '#FEE2E2',
  'bg-purple-100': '#F3E8FF',
  'bg-indigo-100': '#E0E7FF',
  'bg-slate-100': '#F3F4F6',
  'bg-slate-400': '#CBD5E1',
  'bg-gray-50': '#F9FAFB',
};

const TAILWIND_TEXT_MAP = {
  'text-blue-800': '#174ea6',
  'text-cyan-800': '#164E63',
  'text-green-800': '#166534',
  'text-green-900': '#15803D',
  'text-yellow-800': '#854D0E',
  'text-orange-800': '#92400E',
  'text-red-800': '#B91C1C',
  'text-purple-800': '#6B21A8',
  'text-indigo-800': '#312E81',
  'text-slate-800': '#1E293B',
  'text-slate-900': '#0F172A',
  'text-white': '#FFFFFF',
};

/**
 * Cores padrão para status agendados
 * Baseado em appointmentStatusConstants.js STATUS_CONFIG
 */
const STATUS_COLORS_EXTENDED = {
  // Booking statuses
  scheduled: { background: '#DBEAFE', color: '#174ea6' }, // 🗓️ Agendado
  agendado: { background: '#DBEAFE', color: '#174ea6' },
  confirmed_phone: { background: '#CFFAFE', color: '#164E63' }, // ☎️ Confirmado via Telefone
  confirmed_whatsapp: { background: '#CFFAFE', color: '#164E63' }, // 💬 Confirmado via WhatsApp
  confirmado: { background: '#CFFAFE', color: '#164E63' },
  confirmed: { background: '#CFFAFE', color: '#164E63' }, // ✅ Confirmado
  at_reception: { background: '#FEF3C7', color: '#854D0E' }, // 📍 Na Recepção
  na_recepcao: { background: '#FEF3C7', color: '#854D0E' },
  at_checkout: { background: '#FFEDD5', color: '#92400E' }, // 🪟 No Guichê
  squeezein: { background: '#FEF3C7', color: '#854D0E' }, // 👉 Encaixe
  awaiting_insurance: { background: '#FFEDD5', color: '#92400E' }, // 🧡 Aguardando Convênio
  blocked: { background: '#F3F4F6', color: '#4B5563' }, // 🔒 Bloqueado

  // Service statuses
  awaiting_professional: { background: '#CFFAFE', color: '#164E63' }, // 👨‍⚕️ Aguardando Profissional
  aguardando_profissional: { background: '#CFFAFE', color: '#164E63' },
  in_service: { background: '#F3E8FF', color: '#6B21A8' }, // ⏳ Em Atendimento
  em_atendimento: { background: '#F3E8FF', color: '#6B21A8' },
  attended: { background: '#CCFBF1', color: '#134E4A' }, // ✔️ Atendido
  atendido: { background: '#CCFBF1', color: '#134E4A' },
  done: { background: '#CCFBF1', color: '#134E4A' },
  no_show: { background: '#FEF3C7', color: '#854D0E' }, // ❌ Faltou
  falta: { background: '#FEF3C7', color: '#854D0E' },
  faltou: { background: '#FEF3C7', color: '#854D0E' },
  canceled: { background: '#FEE2E2', color: '#B91C1C' }, // 🚫 Cancelado
  cancelado: { background: '#FEE2E2', color: '#B91C1C' },

  // Management statuses
  rescheduled: { background: '#FFEDD5', color: '#92400E' }, // 📅 Remarcado
  remarcado: { background: '#FFEDD5', color: '#92400E' },

  // Financial statuses
  awaiting_billing: { background: '#E0E7FF', color: '#312E81' }, // 📋 Aguardando Faturamento
  billed: { background: '#DCFCE7', color: '#166534' }, // 📄 Faturado
  faturado: { background: '#DCFCE7', color: '#166534' },
  denied: { background: '#FEE2E2', color: '#B91C1C' }, // ❌ Glosado
  glosado: { background: '#FEE2E2', color: '#B91C1C' },
  paid: { background: '#BBF7D0', color: '#15803D' }, // 💰 Pago
  pago: { background: '#BBF7D0', color: '#15803D' },
  resubmitted: { background: '#CFFAFE', color: '#164E63' }, // 🔄 Reapresentado
  reapresentado: { background: '#CFFAFE', color: '#164E63' },
  not_billable: { background: '#F3F4F6', color: '#4B5563' }, // ⚠️ Perda/Não Faturável

  // Compatibilidade
  disponivel: { background: '#F3F4F6', color: '#222' },
  disponible: { background: '#F3F4F6', color: '#222' },
};

/**
 * Obtém estilo de cor para um status
 * @param {string} status - Status do agendamento
 * @returns {Object} { background, color } - Cores em hex
 */
export function getStatusStyle(status) {
  if (!status) {
    return STATUS_COLORS_EXTENDED['disponivel'];
  }

  // Normalizar status: minúsculas, remover acentos, converter underscore
  const normalized = (status || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, '_');

  return STATUS_COLORS_EXTENDED[normalized] || STATUS_COLORS_EXTENDED['disponivel'];
}

export { STATUS_COLORS_EXTENDED as STATUS_COLORS };
