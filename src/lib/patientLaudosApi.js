import { supabase } from '@/lib/customSupabaseClient';

const LOCAL_STORAGE_KEY = 'gesclinic-local-patient-laudos';
let patientLaudosTableUnavailable = false;

function shouldUseLocalFallback(error) {
  return (
    ['42501', '42P01', 'PGRST205'].includes(error?.code) ||
    /row-level security|unauthorized|patient_laudos/i.test(error?.message || '')
  );
}

function markTableUnavailableIfNeeded(error) {
  if (['42P01', 'PGRST205'].includes(error?.code)) {
    patientLaudosTableUnavailable = true;
  }
}

function markTableAvailable() {
  patientLaudosTableUnavailable = false;
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
  return [...rows].sort((left, right) => {
    const leftRef = left.portal_published_at || left.exam_date || left.created_at || 0;
    const rightRef = right.portal_published_at || right.exam_date || right.created_at || 0;
    return new Date(rightRef).getTime() - new Date(leftRef).getTime();
  });
}

function listLocalRows(patientId, clinicId = null) {
  return sortRows(
    loadLocalRows()
      .filter((row) => row.patient_id === patientId)
      .filter((row) => !clinicId || row.clinic_id === clinicId),
  );
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

function sanitizePayload(payload) {
  return {
    ...payload,
    metadata: payload?.metadata && typeof payload.metadata === 'object' ? payload.metadata : {},
  };
}

function createLocalRow(payload) {
  const now = new Date().toISOString();
  const row = {
    id: globalThis.crypto?.randomUUID?.() || `local-laudo-${Date.now()}`,
    ...sanitizePayload(payload),
    created_at: payload.created_at || now,
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
  const nextRows = loadLocalRows().filter((row) => row.id !== id);
  saveLocalRows(nextRows);
}

export async function listPatientLaudos(patientId, clinicId = null) {
  if (!patientId) {
    return [];
  }

  const localRows = listLocalRows(patientId, clinicId);

  if (patientLaudosTableUnavailable) {
    return localRows;
  }

  let query = supabase
    .from('patient_laudos')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });

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

export async function createPatientLaudo(payload) {
  if (patientLaudosTableUnavailable) {
    return createLocalRow(payload);
  }

  const normalizedPayload = {
    ...sanitizePayload(payload),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('patient_laudos')
    .insert([normalizedPayload])
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

export async function updatePatientLaudo(id, updates) {
  if (patientLaudosTableUnavailable) {
    const localRow = updateLocalRow(id, updates);
    if (localRow) {
      return localRow;
    }
  }

  const { data, error } = await supabase
    .from('patient_laudos')
    .update({
      ...sanitizePayload(updates),
      updated_at: new Date().toISOString(),
    })
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

export async function deletePatientLaudo(id) {
  if (patientLaudosTableUnavailable) {
    deleteLocalRow(id);
    return true;
  }

  const { error } = await supabase.from('patient_laudos').delete().eq('id', id);

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

export async function syncLocalPatientLaudos(patientId, clinicId = null) {
  const localRows = listLocalRows(patientId, clinicId);

  if (!localRows.length) {
    return {
      syncedRows: [],
      failedRows: [],
      blockedByPolicy: false,
    };
  }

  const syncedRows = [];
  const failedRows = [];

  for (const row of localRows) {
    const payload = { ...row };
    delete payload._storage_mode;

    const { data, error } = await supabase
      .from('patient_laudos')
      .upsert(
        [
          {
            ...sanitizePayload(payload),
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: 'id' },
      )
      .select();


    if (error) {
      failedRows.push({ row, error });

      if (shouldUseLocalFallback(error)) {
        markTableUnavailableIfNeeded(error);
        return {
          syncedRows,
          failedRows,
          blockedByPolicy: true,
        };
      }

      continue;
    }

    markTableAvailable();
    syncedRows.push(markRemoteRow(data));
  }

  if (syncedRows.length) {
    const syncedIds = new Set(syncedRows.map((row) => row.id));
    const remainingRows = loadLocalRows().filter((row) => !syncedIds.has(row.id));
    saveLocalRows(remainingRows);
  }

  return {
    syncedRows,
    failedRows,
    blockedByPolicy: false,
  };
}

export async function listPortalPatientLaudos(patientId) {
  if (!patientId || patientLaudosTableUnavailable) {
    return [];
  }

  const { data, error } = await supabase
    .from('patient_laudos')
    .select('*')
    .eq('patient_id', patientId)
    .eq('portal_visible', true)
    .eq('status', 'publicado')
    .order('portal_published_at', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    if (shouldUseLocalFallback(error)) {
      markTableUnavailableIfNeeded(error);
      return [];
    }
    throw error;
  }

  markTableAvailable();

  return (data || []).map(markRemoteRow);
}
