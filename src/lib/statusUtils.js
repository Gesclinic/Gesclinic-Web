// src/lib/statusUtils.js

export function normalizeStatus(status) {
  if (!status) {
    return 'agendado';
  }

  return String(status).trim().toLowerCase().replace(' ', '_').replace('-', '_');
}
