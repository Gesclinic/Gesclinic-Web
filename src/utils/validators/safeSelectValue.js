export function safeSelectValue(value) {
  if (value === null || value === undefined || value === '') {
    return 'invalid';
  }
  return String(value);
}
