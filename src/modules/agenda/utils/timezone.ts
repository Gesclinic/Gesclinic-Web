/**
 * PHASE 2: TIMEZONE UTILITIES
 * ═════════════════════════════════════════════════════════════════════════════
 * Purpose: Handle timezone conversions and time formatting for Neuroclinica
 * Timezone: America/Sao_Paulo (UTC-3 with DST awareness via date-fns-tz)
 * 
 * Functions:
 * - formatTime(timeString): Convert "09:00:00" → "09:00"
 * - calculateEndTime(timeString, durationMinutes): Calculate end time
 * - isBusinessHours(timeString): Validate 8-20 range
 * - convertUTCToLocal(date): Convert UTC to America/Sao_Paulo
 * - convertLocalToUTC(date): Convert America/Sao_Paulo to UTC
 * - isValidDateFormat(date): Validate YYYY-MM-DD format
 * ═════════════════════════════════════════════════════════════════════════════
 */

import {
  format,
  parse,
  addMinutes,
  startOfDay,
  endOfDay,
  parseISO,
  isValid,
} from 'date-fns';
import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';

// Neuroclinica timezone
const TIMEZONE = 'America/Sao_Paulo';
const TIME_FORMAT = 'HH:mm';
const TIME_SECONDS_FORMAT = 'HH:mm:ss';
const DATE_FORMAT = 'yyyy-MM-dd';
const BUSINESS_HOURS_START = 8; // 08:00
const BUSINESS_HOURS_END = 20; // 20:00

/**
 * FORMAT TIME: Convert "09:00:00" → "09:00"
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function formatTime(timeString: string | null | undefined): string | null {
  if (!timeString) return null;

  try {
    // Handle both "HH:mm:ss" and "HH:mm" formats
    const parsed = parse(
      timeString,
      timeString.includes(':') && timeString.split(':').length === 3
        ? TIME_SECONDS_FORMAT
        : TIME_FORMAT,
      new Date()
    );

    if (!isValid(parsed)) return null;

    return format(parsed, TIME_FORMAT);
  } catch {
    return null;
  }
}

/**
 * CALCULATE END TIME: "09:00" + 30 min → "09:30"
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function calculateEndTime(
  timeString: string | null | undefined,
  durationMinutes: number
): string | null {
  if (!timeString || durationMinutes <= 0) return null;

  try {
    const parsed = parse(timeString, TIME_FORMAT, new Date());
    if (!isValid(parsed)) return null;

    const endTime = addMinutes(parsed, durationMinutes);
    return format(endTime, TIME_FORMAT);
  } catch {
    return null;
  }
}

/**
 * VALIDATE BUSINESS HOURS: 08:00-20:00
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function isBusinessHours(timeString: string | null | undefined): boolean {
  if (!timeString) return false;

  try {
    const parsed = parse(timeString, TIME_FORMAT, new Date());
    if (!isValid(parsed)) return false;

    const hours = parsed.getHours();
    return hours >= BUSINESS_HOURS_START && hours < BUSINESS_HOURS_END;
  } catch {
    return false;
  }
}

/**
 * CONVERT UTC → AMERICA/SAO_PAULO
 * ─────────────────────────────────────────────────────────────────────────────
 * Input: UTC Date/ISO string (from database)
 * Output: Local time string in America/Sao_Paulo
 */
export function convertUTCToLocal(
  date: Date | string | null | undefined,
  formatStyle: 'time' | 'date' | 'datetime' = 'datetime'
): string | null {
  if (!date) return null;

  try {
    const utcDate = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(utcDate)) return null;

    const zonedDate = toZonedTime(utcDate, TIMEZONE);

    switch (formatStyle) {
      case 'time':
        return formatInTimeZone(zonedDate, TIMEZONE, TIME_FORMAT);
      case 'date':
        return formatInTimeZone(zonedDate, TIMEZONE, DATE_FORMAT);
      case 'datetime':
        return formatInTimeZone(
          zonedDate,
          TIMEZONE,
          `${DATE_FORMAT} ${TIME_FORMAT}`
        );
      default:
        return null;
    }
  } catch {
    return null;
  }
}

/**
 * CONVERT AMERICA/SAO_PAULO → UTC
 * ─────────────────────────────────────────────────────────────────────────────
 * Input: Local time in America/Sao_Paulo
 * Output: UTC Date (for database storage)
 */
export function convertLocalToUTC(
  date: Date | string | null | undefined
): Date | null {
  if (!date) return null;

  try {
    const localDate = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(localDate)) return null;

    // Create a Date in the local timezone and convert to UTC
    const utcDate = fromZonedTime(localDate, TIMEZONE);
    return utcDate;
  } catch {
    return null;
  }
}

/**
 * VALIDATE DATE FORMAT: YYYY-MM-DD
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function isValidDateFormat(
  date: string | null | undefined
): boolean {
  if (!date) return false;

  try {
    const parsed = parse(date, DATE_FORMAT, new Date());
    return isValid(parsed);
  } catch {
    return false;
  }
}

/**
 * HELPER: Get business hours range for a date
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function getBusinessHoursRange(date: Date): {
  start: Date;
  end: Date;
} {
  const start = startOfDay(date);
  start.setHours(BUSINESS_HOURS_START, 0, 0, 0);

  const end = endOfDay(date);
  end.setHours(BUSINESS_HOURS_END, 0, 0, 0);

  return { start, end };
}

/**
 * HELPER: Get current time in local timezone (for debugging/testing)
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function getCurrentLocalTime(): string {
  const now = new Date();
  return convertUTCToLocal(now, 'datetime') || '';
}

export default {
  formatTime,
  calculateEndTime,
  isBusinessHours,
  convertUTCToLocal,
  convertLocalToUTC,
  isValidDateFormat,
  getBusinessHoursRange,
  getCurrentLocalTime,
};
