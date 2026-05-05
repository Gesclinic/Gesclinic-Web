import { fromZonedTime } from 'date-fns-tz';

export function toIsoUtcOrNull(str) {
  if (!str) {
    return null;
  }
  // str: 'YYYY-MM-DDTHH:mm'
  const utcDate = fromZonedTime(str, 'America/Sao_Paulo');
  return utcDate.toISOString();
}
