import { parseISO, startOfDay, addDays, isBefore, isWithinInterval } from 'date-fns';

export function todayStart() {
  return startOfDay(new Date());
}

export function toDate(iso) {
  if (!iso) {
    return null;
  }
  try {
    return startOfDay(parseISO(iso));
  } catch {
    return null;
  }
}

export function addDaysFrom(date, n) {
  return addDays(date, n);
}

export function isOverdue(it) {
  const d = toDate(it?.due_date);
  if (!d) {
    return false;
  }
  const status = String(it?.status || 'open').toLowerCase();
  if (status === 'paid' || status === 'canceled') {
    return false;
  }
  return isBefore(d, todayStart());
}

export function inNextNDays(it, n) {
  const d = toDate(it?.due_date);
  if (!d) {
    return false;
  }
  const start = todayStart();
  const end = addDaysFrom(start, n);
  return isWithinInterval(d, { start, end });
}

export function inPeriod(it, startIso, endIso) {
  const d = toDate(it?.due_date);
  if (!d) {
    return false;
  }
  const s = startIso ? toDate(startIso) : null;
  const e = endIso ? toDate(endIso) : null;
  if (s && e) {
    return isWithinInterval(d, { start: s, end: e });
  }
  return true;
}
