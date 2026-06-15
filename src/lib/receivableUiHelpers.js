export const paymentMethodOptions = [
  { value: 'Pix', label: 'Pix' },
  { value: 'Dinheiro', label: 'Dinheiro' },
  { value: 'Cartao de credito', label: 'Cartao de credito' },
  { value: 'Cartao de debito', label: 'Cartao de debito' },
  { value: 'Boleto', label: 'Boleto' },
  { value: 'Transferencia', label: 'Transferencia' },
  { value: 'TED', label: 'TED' },
  { value: 'DOC', label: 'DOC' },
  { value: 'Cheque', label: 'Cheque' },
  { value: 'Convenio', label: 'Convenio' },
  { value: 'Empresa', label: 'Empresa' },
  { value: 'Outro', label: 'Outro' },
];

export function isCardPaymentMethod(value) {
  const normalized = String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return normalized.includes('cartao');
}

export function isoToDisplayDate(value) {
  if (!value) {
    return '';
  }
  const [year, month, day] = String(value).split('T')[0].split('-');
  if (!year || !month || !day) {
    return '';
  }
  return `${day}/${month}/${year}`;
}

export function displayDateToIso(value) {
  const clean = String(value || '').replace(/\D/g, '');
  if (clean.length !== 8) {
    return '';
  }
  const day = clean.slice(0, 2);
  const month = clean.slice(2, 4);
  const year = clean.slice(4, 8);
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  ) {
    return '';
  }
  return `${year}-${month}-${day}`;
}

export function maskDisplayDate(value) {
  const clean = String(value || '').replace(/\D/g, '').slice(0, 8);
  if (clean.length <= 2) {
    return clean;
  }
  if (clean.length <= 4) {
    return `${clean.slice(0, 2)}/${clean.slice(2)}`;
  }
  return `${clean.slice(0, 2)}/${clean.slice(2, 4)}/${clean.slice(4)}`;
}

function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
}

export function findProfessionalIdByDocumentName(professionals = [], documentName = '') {
  const normalizedDocumentName = normalizeSearchText(documentName);
  if (!normalizedDocumentName) {
    return '';
  }

  const candidates = [
    normalizedDocumentName,
    ...normalizedDocumentName.split(' - ').map((part) => part.trim()).filter(Boolean),
  ];

  const match = professionals.find((professional) => {
    const professionalName = normalizeSearchText(professional?.name || professional?.full_name);
    if (!professionalName) {
      return false;
    }

    return candidates.some((candidate) => (
      candidate.length >= 3
      && (professionalName.includes(candidate) || candidate.includes(professionalName))
    ));
  });

  return match?.id || '';
}

export function mergeDocumentNotes(currentNotes = '', fields = {}) {
  const lines = [];
  if (fields.doctor_name) {
    lines.push(`Medico XML: ${fields.doctor_name}${fields.doctor_crm ? ` | CRM: ${fields.doctor_crm}` : ''}`);
  }
  if (fields.observation) {
    lines.push(`Observacao XML: ${fields.observation}`);
  }

  if (!lines.length) {
    return currentNotes || '';
  }

  const existing = String(currentNotes || '').trim();
  const additions = lines.filter((line) => !existing.includes(line));
  return [existing, ...additions].filter(Boolean).join('\n');
}