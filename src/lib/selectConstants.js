// src/lib/selectConstants.js
// ============================================================
// Constantes para Select Elements (Enums Hardcoded)
// Use para manter valores fixos centralizados
// ============================================================

/**
 * Dias da Semana (ISO 8601: 0=Domingo, 1=Segunda, etc)
 * Nota: ISO 8601 usa Monday=1, mas aqui usamos 0=Sunday para HTML dayofweek
 */
export const DAYS_OF_WEEK = [
  { value: "0", label: "Domingo" },
  { value: "1", label: "Segunda-feira" },
  { value: "2", label: "Terça-feira" },
  { value: "3", label: "Quarta-feira" },
  { value: "4", label: "Quinta-feira" },
  { value: "5", label: "Sexta-feira" },
  { value: "6", label: "Sábado" },
];

/**
 * Métodos de Pagamento
 */
export const PAYMENT_METHODS = [
  { value: "direct", label: "Direto ao Profissional", description: "Pagamento em dinheiro direto" },
  { value: "bank_transfer", label: "Transferência Bancária", description: "Via PIX ou TED" },
  { value: "check", label: "Cheque", description: "Cheque nominal" },
  { value: "cash", label: "Dinheiro", description: "Pagamento em espécie" },
];

/**
 * Status da Sala
 */
export const ROOM_STATUS = [
  { value: "available", label: "Disponível", color: "green" },
  { value: "maintenance", label: "Em Manutenção", color: "yellow" },
  { value: "unavailable", label: "Indisponível", color: "red" },
];

/**
 * Status de Ativo/Inativo
 */
export const ACTIVE_STATUS = [
  { value: true, label: "Ativo", color: "green" },
  { value: false, label: "Inativo", color: "gray" },
];

/**
 * Tipo de Serviço (Faturamento)
 */
export const SERVICE_BILLING_TYPES = [
  { value: "per_consultation", label: "Por Consulta" },
  { value: "per_hour", label: "Por Hora" },
  { value: "per_session", label: "Por Sessão" },
  { value: "per_package", label: "Por Pacote" },
];

/**
 * Tipo de Convênio
 */
export const INSURANCE_TYPES = [
  { value: "health_insurance", label: "Seguro Saúde" },
  { value: "health_plan", label: "Plano de Saúde" },
  { value: "corporate", label: "Corporativo" },
  { value: "government", label: "Governo" },
];

/**
 * Helper: Encontrar label por valor
 */
export function getLabelByValue(array, value) {
  const item = array.find((el) => el.value === value);
  return item?.label || value;
}

/**
 * Helper: Obter array com descrições (para SelectComBusca)
 */
export function formatForSelectComBusca(array) {
  return array.map((item) => ({
    id: item.value,
    name: item.label,
    description: item.description || null,
  }));
}

/**
 * Exemplos de Uso:
 * 
 * // Usar array de constantes
 * {DAYS_OF_WEEK.map(day => (
 *   <option key={day.value} value={day.value}>{day.label}</option>
 * ))}
 * 
 * // Obter label por valor
 * const dayLabel = getLabelByValue(DAYS_OF_WEEK, "1"); // "Segunda-feira"
 * 
 * // Com SelectComBusca (para listas grandes)
 * <SelectComBusca
 *   options={formatForSelectComBusca(PAYMENT_METHODS)}
 *   value={selectedMethod}
 *   onChange={setSelectedMethod}
 *   searchThreshold={20}
 * />
 */
