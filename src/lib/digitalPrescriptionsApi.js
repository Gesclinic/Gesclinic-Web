import { supabase } from "@/lib/customSupabaseClient";

const OPTIONAL_COLUMNS = new Set(["professional_specialty", "professional_rqe"]);
const unsupportedColumns = new Set();
const LOCAL_STORAGE_KEY = "gesclinic-local-digital-prescriptions";

function markRemoteRow(row) {
  return row ? { ...row, _storage_mode: "supabase" } : row;
}

function markRemoteRows(rows) {
  return (rows || []).map(markRemoteRow);
}

function mergePrescriptionRows(remoteRows, localRows) {
  const mergedMap = new Map();

  for (const row of remoteRows || []) {
    mergedMap.set(row.id, row);
  }

  for (const row of localRows || []) {
    if (!mergedMap.has(row.id)) {
      mergedMap.set(row.id, row);
    }
  }

  return Array.from(mergedMap.values()).sort(
    (left, right) => new Date(right.created_at || 0) - new Date(left.created_at || 0)
  );
}

function shouldUseLocalFallback(error) {
  return error?.code === "42501" || /row-level security|unauthorized/i.test(error?.message || "");
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

function listLocalRows(patientId, clinicId) {
  return loadLocalRows()
    .filter((row) => row.patient_id === patientId)
    .filter((row) => !clinicId || row.clinic_id === clinicId)
    .sort((left, right) => new Date(right.created_at || 0) - new Date(left.created_at || 0));
}

function createLocalRow(payload) {
  const timestamp = new Date().toISOString();
  const row = {
    id: globalThis.crypto?.randomUUID?.() || `local-rx-${Date.now()}`,
    ...sanitizePayload(payload),
    created_at: payload.created_at || timestamp,
    updated_at: timestamp,
    _storage_mode: "local",
  };

  const rows = loadLocalRows();
  rows.unshift(row);
  saveLocalRows(rows);
  return row;
}

function updateLocalRow(id, updates) {
  const rows = loadLocalRows();
  const timestamp = new Date().toISOString();
  const nextRows = rows.map((row) => row.id === id ? {
    ...row,
    ...sanitizePayload(updates),
    updated_at: timestamp,
    _storage_mode: "local",
  } : row);

  saveLocalRows(nextRows);
  return nextRows.find((row) => row.id === id) || null;
}

function deleteLocalRow(id) {
  const rows = loadLocalRows();
  saveLocalRows(rows.filter((row) => row.id !== id));
}

function sanitizePayload(payload) {
  return Object.fromEntries(
    Object.entries(payload).filter(([key]) => !unsupportedColumns.has(key))
  );
}

function getMissingColumn(error) {
  const message = error?.message || "";
  const match = message.match(/'([^']+)' column/i);
  return match?.[1] || null;
}

async function runWithOptionalColumnFallback(executor, payload) {
  let result = await executor(sanitizePayload(payload));

  while (result.error) {
    const missingColumn = getMissingColumn(result.error);

    if (!missingColumn || !OPTIONAL_COLUMNS.has(missingColumn) || unsupportedColumns.has(missingColumn)) {
      return result;
    }

    unsupportedColumns.add(missingColumn);
    result = await executor(sanitizePayload(payload));
  }

  return result;
}

function buildListQuery(patientId, clinicId) {
  let query = supabase
    .from("digital_prescriptions")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  if (clinicId) {
    query = query.eq("clinic_id", clinicId);
  }

  return query;
}

export async function listPatientDigitalPrescriptions(patientId, clinicId = null) {
  if (!patientId) return [];

  const localRows = listLocalRows(patientId, clinicId);

  const { data, error } = await buildListQuery(patientId, clinicId);

  if (error) {
    if (shouldUseLocalFallback(error)) {
      return localRows;
    }
    console.error("❌ Erro ao listar receita:", error);
    throw error;
  }

  return mergePrescriptionRows(markRemoteRows(data || []), localRows);
}

export async function createDigitalPrescription(payload) {
  const { data, error } = await runWithOptionalColumnFallback(
    (sanitizedPayload) => supabase
      .from("digital_prescriptions")
      .insert([
        {
          ...sanitizedPayload,
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single(),
    payload
  );

  if (error) {
    if (shouldUseLocalFallback(error)) {
      return createLocalRow(payload);
    }
    console.error("❌ Erro ao criar receita:", error);
    throw error;
  }

  return markRemoteRow(data);
}

export async function updateDigitalPrescription(id, updates) {
  const { data, error } = await runWithOptionalColumnFallback(
    (sanitizedPayload) => supabase
      .from("digital_prescriptions")
      .update({
        ...sanitizedPayload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(),
    updates
  );

  if (error) {
    if (shouldUseLocalFallback(error)) {
      const localRow = updateLocalRow(id, updates);
      if (localRow) {
        return localRow;
      }
    }
    throw error;
  }

  if (!data || data.length === 0) {
    throw new Error('Record not found');
  }

  return data[0];
}

export async function deleteDigitalPrescription(id) {
  const { error } = await supabase
    .from("digital_prescriptions")
    .delete()
    .eq("id", id);

  if (error) {
    if (shouldUseLocalFallback(error)) {
      deleteLocalRow(id);
      return true;
    }
    console.error("❌ Erro ao deletar receita:", error);
    throw error;
  }

  return true;
}

export async function syncLocalDigitalPrescriptions(patientId, clinicId = null) {
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

    const { data, error } = await runWithOptionalColumnFallback(
      (sanitizedPayload) => supabase
        .from("digital_prescriptions")
        .upsert([
          {
            ...sanitizedPayload,
            updated_at: new Date().toISOString(),
          },
        ], { onConflict: "id" })
        .select(),
      payload
    );

    if (error) {
      failedRows.push({ row, error });

      if (shouldUseLocalFallback(error)) {
        return {
          syncedRows,
          failedRows,
          blockedByPolicy: true,
        };
      }

      failedRows[failedRows.length - 1].error = error;
      continue;
    }

    if (!data || data.length === 0) {
      throw new Error('Record not found');
    }

    syncedRows.push(data[0]);
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