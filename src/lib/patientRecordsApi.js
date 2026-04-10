import { supabase } from "@/lib/customSupabaseClient";

const LOCAL_STORAGE_KEY = "gesclinic-local-patient-records";
let patientRecordsTableUnavailable = false;

function shouldUseLocalFallback(error) {
  return ["42501", "42P01", "PGRST205"].includes(error?.code) || /row-level security|unauthorized|patient_records/i.test(error?.message || "");
}

function markTableUnavailableIfNeeded(error) {
  if (["42P01", "PGRST205"].includes(error?.code)) {
    patientRecordsTableUnavailable = true;
  }
}

function markTableAvailable() {
  patientRecordsTableUnavailable = false;
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
  return row ? { ...row, _storage_mode: "supabase" } : row;
}

function sortRows(rows) {
  return [...rows].sort((left, right) => {
    const leftDate = `${left.record_date || ""}T${left.record_time || "00:00"}`;
    const rightDate = `${right.record_date || ""}T${right.record_time || "00:00"}`;
    return new Date(rightDate).getTime() - new Date(leftDate).getTime();
  });
}

function listLocalRows(patientId) {
  return sortRows(loadLocalRows().filter((row) => row.patient_id === patientId));
}

function mergeRows(remoteRows, localRows) {
  const merged = new Map();

  for (const row of remoteRows) merged.set(row.id, row);
  for (const row of localRows) {
    if (!merged.has(row.id)) merged.set(row.id, row);
  }

  return sortRows(Array.from(merged.values()));
}

function createLocalRow(payload) {
  const now = new Date().toISOString();
  const row = {
    id: globalThis.crypto?.randomUUID?.() || `local-record-${Date.now()}`,
    ...payload,
    created_at: payload.created_at || now,
    updated_at: now,
    _storage_mode: "local",
  };

  const rows = loadLocalRows();
  rows.unshift(row);
  saveLocalRows(rows);
  return row;
}

function updateLocalRow(id, updates) {
  let updatedRow = null;
  const nextRows = loadLocalRows().map((row) => {
    if (row.id !== id) return row;
    updatedRow = {
      ...row,
      ...updates,
      updated_at: new Date().toISOString(),
      _storage_mode: "local",
    };
    return updatedRow;
  });
  saveLocalRows(nextRows);
  return updatedRow;
}

async function runRemoteInsert(payload) {
  return supabase
    .from("patient_records")
    .insert([payload])
    .select()
    .single();
}

async function runRemoteUpdate(id, updates) {
  return supabase
    .from("patient_records")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();
}

export async function listPatientRecords(patientId) {
  if (!patientId) return [];

  const localRows = listLocalRows(patientId);

  if (patientRecordsTableUnavailable) {
    return localRows;
  }

  const { data, error } = await supabase
    .from("patient_records")
    .select("*")
    .eq("patient_id", patientId)
    .order("record_date", { ascending: false })
    .order("record_time", { ascending: false });

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

export async function createPatientRecord(payload) {
  if (patientRecordsTableUnavailable) {
    return createLocalRow(payload);
  }

  const normalizedPayload = {
    ...payload,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await runRemoteInsert(normalizedPayload);

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

export async function updatePatientRecord(id, updates) {
  if (patientRecordsTableUnavailable) {
    const row = updateLocalRow(id, updates);
    if (row) return row;
  }

  const { data, error } = await runRemoteUpdate(id, updates);

  if (error) {
    if (shouldUseLocalFallback(error)) {
      markTableUnavailableIfNeeded(error);
      const row = updateLocalRow(id, updates);
      if (row) return row;
    }
    throw error;
  }

  markTableAvailable();

  return markRemoteRow(data);
}

export async function syncLocalPatientRecords(patientId) {
  const localRows = listLocalRows(patientId);

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
      .from("patient_records")
      .upsert([
        {
          ...payload,
          updated_at: new Date().toISOString(),
        },
      ], { onConflict: "id" })
      .select()
      .single();

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