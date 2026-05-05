export function generateHoursRange(start, end) {
  const list = [];
  for (let h = start; h <= end; h++) {
    list.push(String(h).padStart(2, '0'));
  }
  return list;
}
