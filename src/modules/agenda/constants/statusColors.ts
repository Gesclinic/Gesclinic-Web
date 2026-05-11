/**
 * STATUS COLORS - Cores para cada status
 */
export const STATUS_COLOR_MAP = {
  // Booking
  scheduled: 'bg-blue-100 text-blue-700 border border-blue-200',
  confirmed_phone: 'bg-green-100 text-green-700 border border-green-200',
  confirmed_whatsapp: 'bg-green-100 text-green-700 border border-green-200',
  confirmed: 'bg-green-100 text-green-700 border border-green-200',
  at_reception: 'bg-orange-100 text-orange-700 border border-orange-200',
  at_checkout: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  squeezein: 'bg-purple-100 text-purple-700 border border-purple-200',
  awaiting_insurance: 'bg-amber-100 text-amber-700 border border-amber-200',
  blocked: 'bg-red-100 text-red-700 border border-red-200',

  // Service
  awaiting_professional: 'bg-cyan-100 text-cyan-700 border border-cyan-200',
  in_service: 'bg-indigo-100 text-indigo-700 border border-indigo-200',
  attended: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  no_show: 'bg-gray-100 text-gray-700 border border-gray-200',
  canceled: 'bg-red-100 text-red-700 border border-red-200',

  // Management
  rescheduled: 'bg-blue-100 text-blue-700 border border-blue-200',

  // Financial
  awaiting_billing: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  billed: 'bg-green-100 text-green-700 border border-green-200',
  denied: 'bg-red-100 text-red-700 border border-red-200',
  paid: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  resubmitted: 'bg-orange-100 text-orange-700 border border-orange-200',
  not_billable: 'bg-gray-100 text-gray-700 border border-gray-200',
};

export const STATUS_BACKGROUND_COLOR_MAP = {
  scheduled: '#dbeafe',
  confirmed_phone: '#dcfce7',
  confirmed_whatsapp: '#dcfce7',
  confirmed: '#dcfce7',
  at_reception: '#fed7aa',
  at_checkout: '#fef08a',
  squeezein: '#e9d5ff',
  awaiting_insurance: '#fcd34d',
  blocked: '#fee2e2',
  awaiting_professional: '#cffafe',
  in_service: '#e0e7ff',
  attended: '#d1fae5',
  no_show: '#f3f4f6',
  canceled: '#fee2e2',
  rescheduled: '#dbeafe',
  awaiting_billing: '#fef08a',
  billed: '#dcfce7',
  denied: '#fee2e2',
  paid: '#d1fae5',
  resubmitted: '#fed7aa',
  not_billable: '#f3f4f6',
};

export const STATUS_TEXT_COLOR_MAP = {
  scheduled: '#1e40af',
  confirmed_phone: '#15803d',
  confirmed_whatsapp: '#15803d',
  confirmed: '#15803d',
  at_reception: '#b45309',
  at_checkout: '#854d0e',
  squeezein: '#581c87',
  awaiting_insurance: '#b45309',
  blocked: '#dc2626',
  awaiting_professional: '#0369a1',
  in_service: '#3730a3',
  attended: '#047857',
  no_show: '#374151',
  canceled: '#dc2626',
  rescheduled: '#1e40af',
  awaiting_billing: '#854d0e',
  billed: '#15803d',
  denied: '#dc2626',
  paid: '#047857',
  resubmitted: '#b45309',
  not_billable: '#374151',
};

export const STATUS_ICON_MAP = {
  scheduled: '📅',
  confirmed_phone: '☎️',
  confirmed_whatsapp: '💬',
  confirmed: '✅',
  at_reception: '📍',
  at_checkout: '🪟',
  squeezein: '👉',
  awaiting_insurance: '🧡',
  blocked: '🔒',
  awaiting_professional: '👨‍⚕️',
  in_service: '⏳',
  attended: '✔️',
  no_show: '❌',
  canceled: '🚫',
  rescheduled: '📅',
  awaiting_billing: '📋',
  billed: '✅',
  denied: '❌',
  paid: '💰',
  resubmitted: '🔄',
  not_billable: '⛔',
};
