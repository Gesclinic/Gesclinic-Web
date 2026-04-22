// Gera array de horários do dia, ex: ['08:00', '08:30', ...]
import { addMinutes, format, isBefore, parse } from 'date-fns';

/**
 * @param {Object} params
 * @param {string} params.startHour - Ex: '08:00'
 * @param {string} params.endHour - Ex: '18:00'
 * @param {number} params.slotMinutes - Ex: 30
 * @returns {string[]} Array de horários no formato 'HH:mm'
 */
export function generateTimeSlots({ startHour, endHour, slotMinutes }) {
  const slots = [];
  let current = parse(startHour, 'HH:mm', new Date());
  const end = parse(endHour, 'HH:mm', new Date());
  while (isBefore(current, end) || format(current, 'HH:mm') === format(end, 'HH:mm')) {
    slots.push(format(current, 'HH:mm'));
    current = addMinutes(current, slotMinutes);
    if (format(current, 'HH:mm') === format(end, 'HH:mm')) {
      slots.push(format(current, 'HH:mm'));
      break;
    }
  }
  return slots;
}
