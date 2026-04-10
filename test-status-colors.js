// Test getStatusStyle function
const STATUS_COLORS_EXTENDED = {
  'scheduled': { background: '#DBEAFE', color: '#174ea6' },
  'agendado': { background: '#DBEAFE', color: '#174ea6' },
  'confirmado': { background: '#CFFAFE', color: '#164E63' },
  'at_reception': { background: '#FEF3C7', color: '#854D0E' },
  'na_recepcao': { background: '#FEF3C7', color: '#854D0E' },
  'disponivel': { background: '#F3F4F6', color: '#222' },
};

function getStatusStyle(status) {
  if (!status) return STATUS_COLORS_EXTENDED['disponivel'];

  const normalized = (status || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, '_');

  return STATUS_COLORS_EXTENDED[normalized] || STATUS_COLORS_EXTENDED['disponivel'];
}

// Test cases
console.log('Test 1 - confirmado:', getStatusStyle('confirmado'));
console.log('Test 2 - scheduled:', getStatusStyle('scheduled'));
console.log('Test 3 - na_recepcao:', getStatusStyle('na_recepcao'));
console.log('Test 4 - unknown status (should default):', getStatusStyle('unknown_status'));
console.log('Test 5 - null (should default):', getStatusStyle(null));
console.log('Test 6 - at_reception:', getStatusStyle('at_reception'));
