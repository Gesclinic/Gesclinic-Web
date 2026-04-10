// Parse general search: status keywords, exact amount, date
export function parseSearchGeneral(txt) {
  if (!txt) return { clean: '', statusText: null, amountEq: null, dateIso: null };
  let s = String(txt);
  let statusText = null; let amountEq = null; let dateIso = null;
  const statusWords = ['pago','paga','paid','quitado','aberto','em aberto','open','pendente','parcial','partial','cancelado','cancelada','canceled','agendada','agendado','scheduled','programada','vencida','overdue'];
  for (const w of statusWords) {
    const re = new RegExp(`\\b${w}\\b`, 'i');
    if (re.test(s)) { statusText = w; s = s.replace(re, ''); break; }
  }
  if (statusText) {
    const v = String(statusText).toLowerCase();
    if (['pago','paga','paid','quitado'].includes(v)) statusText = 'paid';
    else if (['aberto','em aberto','open','pendente'].includes(v)) statusText = 'open';
    else if (['parcial','partial'].includes(v)) statusText = 'partial';
    else if (['cancelado','cancelada','canceled'].includes(v)) statusText = 'canceled';
    else if (['agendada','agendado','scheduled','programada'].includes(v)) statusText = 'scheduled';
    else if (['vencida','overdue'].includes(v)) statusText = 'overdue';
  }
  const mNum = s.match(/(?:R\$\s*)?(?<![0-9.,])([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{1,2})?)(?![0-9.,])/i);
  if (mNum) {
    const raw = mNum[1].replace(/\./g, '').replace(',', '.');
    const f = parseFloat(raw);
    if (!Number.isNaN(f)) amountEq = f;
  }
  const mDateBR = s.match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/);
  const mDateISO = s.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (mDateBR) {
    const [_, d, m, y] = mDateBR;
    dateIso = `${y}-${m}-${d}`;
  } else if (mDateISO) {
    const [_, y, m, d] = mDateISO;
    dateIso = `${y}-${m}-${d}`;
  }
  return { clean: s.trim(), statusText, amountEq, dateIso };
}

export function parcelLabel(it) {
  const n = (typeof it.installments !== 'undefined' && it.installments !== null) ? Number(it.installments) : null;
  const notes = String(it.notes || '');
  const m = notes.match(/Parcela\s+(\d+)\/(\d+)/i);
  if (m) return `${m[1]}/${m[2]}`;
  if (n && n > 1) return `1/${n}`;
  return n || '—';
}
// Status badge moved to a React component. Keep helpers JSX-free.
