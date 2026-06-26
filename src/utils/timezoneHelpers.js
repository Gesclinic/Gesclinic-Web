/**
 * 🕐 Timezone Helpers - Agenda Enterprise
 * 
 * Padronização completa de tratamento de timezone
 * Timezone: America/Sao_Paulo (UTC-3 / UTC-2 DST)
 * 
 * Padrão de uso:
 * - Banco: scheduled_date (DATE) + scheduled_time (TIME)
 * - Frontend: toLocalTime(date, time) / fromLocalTime(localTime)
 * - Render: formatLocalDate() / formatLocalTime()
 */

import {
  parseISO,
  format,
  parse,
  isValid,
  startOfDay,
  endOfDay,
  differenceInMilliseconds,
  addMinutes,
  getHours,
  getMinutes,
  getDate,
  getMonth,
  getYear,
  set as setDate,
} from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc, format as formatTz } from 'date-fns-tz';

/**
 * ============================================
 * CONFIGURAÇÃO
 * ============================================
 */

const TIMEZONE = 'America/Sao_Paulo';

/**
 * ============================================
 * PADRÃO 1: Converter ISO UTC → Local Time
 * ============================================
 */

/**
 * Converte ISO UTC para objeto com date/time local
 * @param {string} isoUtc - '2026-05-10T17:30:00Z' ou '2026-05-10T17:30:00'
 * @returns {object} { date: '2026-05-10', time: '14:30:00', hour: 14, minute: 30 }
 */
export function toLocalTime(isoUtc) {
  if (!isoUtc || typeof isoUtc !== 'string') {
    return null;
  }

  try {
    let dateObj;
    
    // Parsear ISO string
    if (isoUtc.includes('T')) {
      dateObj = parseISO(isoUtc);
    } else {
      // Se for apenas data
      dateObj = parseISO(`${isoUtc}T00:00:00Z`);
    }

    if (!isValid(dateObj)) {
      return null;
    }

    // Converter para timezone local
    const zonedDate = utcToZonedTime(dateObj, TIMEZONE);

    // Extrair componentes
    const year = getYear(zonedDate);
    const month = String(getMonth(zonedDate) + 1).padStart(2, '0');
    const day = String(getDate(zonedDate)).padStart(2, '0');
    const hour = String(getHours(zonedDate)).padStart(2, '0');
    const minute = String(getMinutes(zonedDate)).padStart(2, '0');
    const second = String(zonedDate.getSeconds()).padStart(2, '0');

    const date = `${year}-${month}-${day}`;
    const time = `${hour}:${minute}:${second}`;

    return {
      date, // 'YYYY-MM-DD'
      time, // 'HH:mm:ss'
      hour: parseInt(hour),
      minute: parseInt(minute),
      second: parseInt(second),
      dayOfWeek: zonedDate.getDay(), // 0=Sun, 6=Sat
    };
  } catch (err) {
    console.error('❌ [toLocalTime] Erro:', err.message);
    return null;
  }
}

/**
 * ============================================
 * PADRÃO 2: Converter Local Time → ISO UTC
 * ============================================
 */

/**
 * Converte local time para ISO UTC
 * @param {string|object} dateOrLocal - '2026-05-10' ou { date: '2026-05-10', time: '14:30:00' }
 * @param {string} time - '14:30:00' (opcional se dateOrLocal for objeto)
 * @returns {string} '2026-05-10T17:30:00Z' (ISO UTC)
 */
export function fromLocalTime(dateOrLocal, time) {
  try {
    let localDate, localTime;

    if (typeof dateOrLocal === 'object') {
      // Padrão: { date, time } object
      localDate = dateOrLocal.date;
      localTime = dateOrLocal.time;
    } else {
      // Padrão: date string, time string
      localDate = dateOrLocal;
      localTime = time;
    }

    if (!localDate || !localTime) {
      return null;
    }

    // Normalizar hora
    const timeParts = localTime.split(':');
    const hour = String(timeParts[0]).padStart(2, '0');
    const minute = String(timeParts[1] || '0').padStart(2, '0');
    const second = String(timeParts[2] || '0').padStart(2, '0');

    // Criar string ISO sem Z (interpretada como local)
    const isoLocal = `${localDate}T${hour}:${minute}:${second}`;

    // Converter para UTC
    const dateObj = parse(isoLocal, 'yyyy-MM-dd\'T\'HH:mm:ss', new Date());
    const utcDate = zonedTimeToUtc(dateObj, TIMEZONE);

    return utcDate.toISOString();
  } catch (err) {
    console.error('❌ [fromLocalTime] Erro:', err.message);
    return null;
  }
}

/**
 * Versão simplificada que retorna apenas data + hora (sem UTC)
 * Útil para salvar no banco como scheduled_date e scheduled_time
 */
export function fromLocalTimeToDateAndTime(date, time) {
  if (!date || !time) return null;

  try {
    const timeParts = time.split(':');
    const hour = String(timeParts[0]).padStart(2, '0');
    const minute = String(timeParts[1] || '0').padStart(2, '0');
    const second = String(timeParts[2] || '0').padStart(2, '0');

    return {
      scheduled_date: date, // 'YYYY-MM-DD'
      scheduled_time: `${hour}:${minute}:${second}`, // 'HH:mm:ss'
    };
  } catch (err) {
    console.error('❌ [fromLocalTimeToDateAndTime] Erro:', err.message);
    return null;
  }
}

/**
 * ============================================
 * PADRÃO 3: Formatação para Render
 * ============================================
 */

/**
 * Formata data para render (pt-BR)
 * @param {string} dateStr - 'YYYY-MM-DD'
 * @returns {string} 'dd/MM/yyyy' (10/05/2026)
 */
export function formatLocalDate(dateStr) {
  if (!dateStr) return '';
  const text = String(dateStr).trim();
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${day}/${month}/${year}`;
  }

  try {
    const dateObj = parseISO(text);
    if (!isValid(dateObj)) {
      return text;
    }
    return format(dateObj, 'dd/MM/yyyy');
  } catch {
    return text;
  }
}

/**
 * Formata hora para render
 * @param {string} timeStr - 'HH:mm:ss'
 * @returns {string} 'HH:mm' (14:30)
 */
export function formatLocalTime(timeStr) {
  if (!timeStr) return '';
  try {
    const parts = timeStr.split(':');
    return `${parts[0]}:${parts[1]}`;
  } catch {
    return timeStr;
  }
}

/**
 * Formata data + hora completo
 * @param {string} date - 'YYYY-MM-DD'
 * @param {string} time - 'HH:mm:ss'
 * @returns {string} 'dd/MM/yyyy HH:mm' (10/05/2026 14:30)
 */
export function formatLocal(date, time) {
  const dateFmt = formatLocalDate(date);
  const timeFmt = formatLocalTime(time);
  return `${dateFmt} ${timeFmt}`;
}

/**
 * Formata dia da semana
 * @param {string} dateStr - 'YYYY-MM-DD'
 * @returns {string} 'Segunda-feira' (pt-BR)
 */
export function formatLocalDayOfWeek(dateStr) {
  if (!dateStr) return '';
  try {
    const dateObj = parseISO(`${dateStr}T00:00:00`);
    return format(dateObj, 'EEEE', { locale: require('date-fns/locale/pt-BR') });
  } catch {
    return '';
  }
}

/**
 * ============================================
 * PADRÃO 4: Validação
 * ============================================
 */

/**
 * Valida se data está em formato correto
 * @param {string} dateStr - 'YYYY-MM-DD'
 * @returns {boolean}
 */
export function isValidLocalDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  
  try {
    const dateObj = parseISO(`${dateStr}T00:00:00`);
    return isValid(dateObj);
  } catch {
    return false;
  }
}

/**
 * Valida se hora está em formato correto
 * @param {string} timeStr - 'HH:mm' ou 'HH:mm:ss'
 * @returns {boolean}
 */
export function isValidLocalTime(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return false;
  
  const regex = /^([0-1][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
  return regex.test(timeStr);
}

/**
 * Valida se data + hora é combinação válida
 * @param {string} date - 'YYYY-MM-DD'
 * @param {string} time - 'HH:mm:ss'
 * @returns {boolean}
 */
export function isValidLocalDateTime(date, time) {
  return isValidLocalDate(date) && isValidLocalTime(time);
}

/**
 * Valida se hora está dentro de range
 * @param {string} time - 'HH:mm:ss'
 * @param {string} startTime - 'HH:mm:ss'
 * @param {string} endTime - 'HH:mm:ss'
 * @returns {boolean}
 */
export function isTimeInRange(time, startTime, endTime) {
  if (!isValidLocalTime(time) || !isValidLocalTime(startTime) || !isValidLocalTime(endTime)) {
    return false;
  }

  const [h1, m1] = time.split(':').map(Number);
  const [h2, m2] = startTime.split(':').map(Number);
  const [h3, m3] = endTime.split(':').map(Number);

  const minutes1 = h1 * 60 + m1;
  const minutes2 = h2 * 60 + m2;
  const minutes3 = h3 * 60 + m3;

  return minutes1 >= minutes2 && minutes1 <= minutes3;
}

/**
 * ============================================
 * PADRÃO 5: Comparação
 * ============================================
 */

/**
 * Verifica se são o mesmo dia local
 * @param {string} date1 - 'YYYY-MM-DD'
 * @param {string} date2 - 'YYYY-MM-DD'
 * @returns {boolean}
 */
export function isSameLocalDay(date1, date2) {
  if (!isValidLocalDate(date1) || !isValidLocalDate(date2)) return false;
  return date1 === date2;
}

/**
 * Verifica se são o mesmo horário (com tolerância)
 * @param {object} time1 - { date, time } ou ISO string
 * @param {object} time2 - { date, time } ou ISO string
 * @param {number} toleranceMs - tolerância em ms (default: 1000)
 * @returns {boolean}
 */
export function isSameLocalTime(time1, time2, toleranceMs = 1000) {
  try {
    let iso1, iso2;

    if (typeof time1 === 'object') {
      iso1 = fromLocalTime(time1.date, time1.time);
    } else {
      iso1 = time1;
    }

    if (typeof time2 === 'object') {
      iso2 = fromLocalTime(time2.date, time2.time);
    } else {
      iso2 = time2;
    }

    const date1 = parseISO(iso1);
    const date2 = parseISO(iso2);
    const diff = Math.abs(differenceInMilliseconds(date1, date2));

    return diff <= toleranceMs;
  } catch {
    return false;
  }
}

/**
 * ============================================
 * PADRÃO 6: Utilitários
 * ============================================
 */

/**
 * Obtém offset do timezone para uma data (considera DST)
 * @param {string} dateStr - 'YYYY-MM-DD'
 * @returns {number} -3 (std) ou -2 (DST)
 */
export function getTimezoneOffset(dateStr) {
  try {
    const isoLocal = `${dateStr}T12:00:00`;
    const dateObj = parse(isoLocal, 'yyyy-MM-dd\'T\'HH:mm:ss', new Date());
    const zoned = utcToZonedTime(dateObj, TIMEZONE);
    const utc = zonedTimeToUtc(zoned, TIMEZONE);
    return -(utc.getHours() - zoned.getHours());
  } catch {
    return -3; // default
  }
}

/**
 * Obtém horário de meio-dia em UTC para uma data local
 * @param {string} dateStr - 'YYYY-MM-DD'
 * @returns {string} ISO UTC do meio-dia
 */
export function getNoonInUTC(dateStr) {
  if (!isValidLocalDate(dateStr)) return null;
  return fromLocalTime(dateStr, '12:00:00');
}

/**
 * Obtém próximo horário válido (arredonda para multiplo de 30min)
 * @param {string} timeStr - 'HH:mm:ss'
 * @param {number} roundMinutes - 30 (default)
 * @returns {string} 'HH:mm:ss' arredondado
 */
export function roundToNextSlot(timeStr, roundMinutes = 30) {
  if (!isValidLocalTime(timeStr)) return timeStr;

  const [h, m] = timeStr.split(':').map(Number);
  const totalMinutes = h * 60 + m;
  const rounded = Math.ceil(totalMinutes / roundMinutes) * roundMinutes;
  const newH = Math.floor(rounded / 60) % 24;
  const newM = rounded % 60;

  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}:00`;
}

/**
 * Calcula duração entre dois horários
 * @param {string} startTime - 'HH:mm:ss'
 * @param {string} endTime - 'HH:mm:ss'
 * @returns {number} duração em minutos
 */
export function calculateDurationMinutes(startTime, endTime) {
  if (!isValidLocalTime(startTime) || !isValidLocalTime(endTime)) return 0;

  const [h1, m1] = startTime.split(':').map(Number);
  const [h2, m2] = endTime.split(':').map(Number);

  const start = h1 * 60 + m1;
  const end = h2 * 60 + m2;

  return end > start ? end - start : (24 * 60) - start + end;
}

/**
 * Adiciona minutos a um horário
 * @param {string} timeStr - 'HH:mm:ss'
 * @param {number} minutes - minutos a adicionar
 * @returns {string} 'HH:mm:ss'
 */
export function addMinutesToTime(timeStr, minutes) {
  if (!isValidLocalTime(timeStr)) return timeStr;

  const [h, m, s = '0'] = timeStr.split(':');
  const totalMinutes = parseInt(h) * 60 + parseInt(m) + minutes;
  const newH = Math.floor(totalMinutes / 60) % 24;
  const newM = totalMinutes % 60;

  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}:${s}`;
}

/**
 * ============================================
 * PADRÃO 7: Interop com Legacy
 * ============================================
 */

/**
 * Converte legacy toLocaleString() result para local time
 * @param {string} localeString - resultado de toLocaleString('pt-BR')
 * @returns {object} { date, time }
 */
export function parseLocalString(localeString) {
  if (!localeString) return null;

  try {
    // Formato esperado: "10/05/2026, 14:30:00"
    const [datePart, timePart] = localeString.split(', ');
    const [d, m, y] = datePart.split('/');
    const date = `${y}-${m}-${d}`;
    const time = timePart;

    if (isValidLocalDate(date) && isValidLocalTime(time)) {
      return { date, time };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * ============================================
 * PADRÃO 8: Debug
 * ============================================
 */

/**
 * Função de debug - mostra conversões
 * @param {string} dateStr - 'YYYY-MM-DD'
 * @param {string} timeStr - 'HH:mm:ss'
 */
export function debugTimezone(dateStr, timeStr) {
  console.group('🕐 [Debug Timezone]');
  console.log('Local:', { date: dateStr, time: timeStr });
  
  const iso = fromLocalTime(dateStr, timeStr);
  console.log('ISO UTC:', iso);
  
  const back = toLocalTime(iso);
  console.log('Back to Local:', back);
  
  const offset = getTimezoneOffset(dateStr);
  console.log('Timezone Offset:', offset);
  
  const duration = calculateDurationMinutes(timeStr, addMinutesToTime(timeStr, 30));
  console.log('Duration Test (30min):', duration);
  
  console.groupEnd();
}

/**
 * ============================================
 * EXPORTS
 * ============================================
 */

export const TimezoneHelpers = {
  // Conversão
  toLocalTime,
  fromLocalTime,
  fromLocalTimeToDateAndTime,

  // Formatação
  formatLocalDate,
  formatLocalTime,
  formatLocal,
  formatLocalDayOfWeek,

  // Validação
  isValidLocalDate,
  isValidLocalTime,
  isValidLocalDateTime,
  isTimeInRange,

  // Comparação
  isSameLocalDay,
  isSameLocalTime,

  // Utilitários
  getTimezoneOffset,
  getNoonInUTC,
  roundToNextSlot,
  calculateDurationMinutes,
  addMinutesToTime,
  parseLocalString,

  // Debug
  debugTimezone,

  // Constantes
  TIMEZONE,
};

export default TimezoneHelpers;
