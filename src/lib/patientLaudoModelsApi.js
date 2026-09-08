import { supabase } from '@/lib/customSupabaseClient';

const LOCAL_STORAGE_KEY = 'gesclinic-local-patient-laudo-templates';
let patientLaudoTemplatesTableUnavailable = false;

function shouldUseLocalFallback(error) {
  return (
    ['42501', '42P01', 'PGRST205'].includes(error?.code) ||
    /row-level security|unauthorized|patient_laudo_templates/i.test(error?.message || '')
  );
}

function markTableUnavailableIfNeeded(error) {
  if (['42P01', 'PGRST205'].includes(error?.code)) {
    patientLaudoTemplatesTableUnavailable = true;
  }
}

function markTableAvailable() {
  patientLaudoTemplatesTableUnavailable = false;
}

function loadLocalRows() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalRows(rows) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(rows));
}

function markRemoteRow(row) {
  return row ? { ...row, _storage_mode: 'supabase' } : row;
}

function sortRows(rows) {
  return [...rows].sort(
    (left, right) =>
      new Date(right.updated_at || right.created_at || 0) -
      new Date(left.updated_at || left.created_at || 0),
  );
}

function listLocalRows(clinicId = null) {
  return sortRows(loadLocalRows().filter((row) => !clinicId || row.clinic_id === clinicId));
}

function sanitizePayload(payload) {
  return {
    ...payload,
    metadata: payload?.metadata && typeof payload.metadata === 'object' ? payload.metadata : {},
    letterhead:
      payload?.letterhead && typeof payload.letterhead === 'object' ? payload.letterhead : {},
  };
}

function mergeRows(remoteRows, localRows) {
  const merged = new Map();
  for (const row of remoteRows || []) {
    merged.set(row.id, row);
  }
  for (const row of localRows || []) {
    if (!merged.has(row.id)) {
      merged.set(row.id, row);
    }
  }
  return sortRows(Array.from(merged.values()));
}

function createLocalRow(payload) {
  const now = new Date().toISOString();
  const row = {
    id: globalThis.crypto?.randomUUID?.() || `local-laudo-template-${Date.now()}`,
    ...sanitizePayload(payload),
    created_at: now,
    updated_at: now,
    _storage_mode: 'local',
  };

  const rows = loadLocalRows();
  rows.unshift(row);
  saveLocalRows(rows);
  return row;
}

function updateLocalRow(id, updates) {
  let updatedRow = null;
  const nextRows = loadLocalRows().map((row) => {
    if (row.id !== id) {
      return row;
    }
    updatedRow = {
      ...row,
      ...sanitizePayload(updates),
      updated_at: new Date().toISOString(),
      _storage_mode: 'local',
    };
    return updatedRow;
  });
  saveLocalRows(nextRows);
  return updatedRow;
}

function deleteLocalRow(id) {
  saveLocalRows(loadLocalRows().filter((row) => row.id !== id));
}

export async function listPatientLaudoTemplates(clinicId = null) {
  const localRows = listLocalRows(clinicId);

  if (patientLaudoTemplatesTableUnavailable) {
    return localRows;
  }

  let query = supabase
    .from('patient_laudo_templates')
    .select('*')
    .order('updated_at', { ascending: false });
  if (clinicId) {
    query = query.eq('clinic_id', clinicId);
  }

  const { data, error } = await query;

  if (error) {
    if (shouldUseLocalFallback(error)) {
      markTableUnavailableIfNeeded(error);
      return localRows;
    }
    throw error;
  }

  markTableAvailable();
  return mergeRows((data || []).map(markRemoteRow), localRows);
}

export async function createPatientLaudoTemplate(payload) {
  if (patientLaudoTemplatesTableUnavailable) {
    return createLocalRow(payload);
  }

  const { data, error } = await supabase
    .from('patient_laudo_templates')
    .insert([{ ...sanitizePayload(payload), updated_at: new Date().toISOString() }])
    .select()
    .single();

  if (error) {
    if (shouldUseLocalFallback(error)) {
      markTableUnavailableIfNeeded(error);
      return createLocalRow(payload);
    }
    throw error;
  }

  markTableAvailable();
  return markRemoteRow(data);
}

export async function updatePatientLaudoTemplate(id, updates) {
  if (patientLaudoTemplatesTableUnavailable) {
    const localRow = updateLocalRow(id, updates);
    if (localRow) {
      return localRow;
    }
  }

  const { data, error } = await supabase
    .from('patient_laudo_templates')
    .update({ ...sanitizePayload(updates), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select();


  if (error) {
    if (shouldUseLocalFallback(error)) {
      markTableUnavailableIfNeeded(error);
      const localRow = updateLocalRow(id, updates);
      if (localRow) {
        return localRow;
      }
    }
    throw error;
  }

  markTableAvailable();
  return markRemoteRow(data);
}

export async function deletePatientLaudoTemplate(id) {
  if (patientLaudoTemplatesTableUnavailable) {
    deleteLocalRow(id);
    return true;
  }

  const { error } = await supabase.from('patient_laudo_templates').delete().eq('id', id);
  if (error) {
    if (shouldUseLocalFallback(error)) {
      markTableUnavailableIfNeeded(error);
      deleteLocalRow(id);
      return true;
    }
    throw error;
  }

  return true;
}
