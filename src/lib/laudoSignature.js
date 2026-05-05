function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeLaudoSignature(signature = {}, defaultSignerName = '') {
  return {
    mode: signature.mode || 'hybrid',
    signed_by_name: normalizeString(signature.signed_by_name) || normalizeString(defaultSignerName),
    certificate_id: normalizeString(signature.certificate_id),
    visual_signature_data_url: normalizeString(signature.visual_signature_data_url),
    signature_hash: normalizeString(signature.signature_hash),
    signed_payload_version: signature.signed_payload_version || 'v1',
    signed_at: signature.signed_at || null,
  };
}

export function buildLaudoSignaturePayload({
  title = '',
  content = '',
  laudoType = '',
  patientName = '',
  examDate = null,
  professionalName = '',
  letterhead = {},
}) {
  return {
    title,
    content,
    laudo_type: laudoType,
    patient_name: patientName,
    exam_date: examDate,
    professional_name: professionalName,
    letterhead: {
      clinic_display_name: letterhead?.clinic_display_name || '',
      professional_display_name: letterhead?.professional_display_name || '',
      professional_title_line: letterhead?.professional_title_line || '',
      professional_contact_line: letterhead?.professional_contact_line || '',
    },
  };
}

export async function generateLaudoSignatureHash(payload) {
  const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload);

  if (globalThis.crypto?.subtle) {
    const encoded = new TextEncoder().encode(serialized);
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(hashBuffer))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  let hash = 0;
  for (let index = 0; index < serialized.length; index += 1) {
    hash = (hash << 5) - hash + serialized.charCodeAt(index);
    hash |= 0;
  }
  return String(hash >>> 0);
}

export function hasStoredLaudoSignature(signature = {}) {
  const normalized = normalizeLaudoSignature(signature);
  return Boolean(
    normalized.visual_signature_data_url || normalized.certificate_id || normalized.signature_hash,
  );
}
