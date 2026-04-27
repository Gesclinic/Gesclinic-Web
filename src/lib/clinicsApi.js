import { supabase } from "@/lib/customSupabaseClient.js";

const OPTIONAL_COLUMNS = new Set(["brand_name", "logo_url", "primary_color", "secondary_color"]);
const unsupportedColumns = new Set();

function normalizeClinicRow(row) {
  if (!row) return row;

  return {
    ...row,
    brand_name: row.brand_name ?? row.name ?? null,
    logo_url: row.logo_url ?? null,
    primary_color: row.primary_color ?? null,
    secondary_color: row.secondary_color ?? null,
  };
}

function getMissingColumn(error) {
  const message = error?.message || "";
  const match = message.match(/column\s+clinics\.([a-zA-Z0-9_]+)/i);
  return match?.[1] || null;
}

/** Mantém só os campos permitidos e normaliza undefined -> null (permite limpar valores) */
function onlyAllowed(patch = {}) {
  const allowed = ["name", "brand_name", "logo_url", "primary_color", "secondary_color"];
  const out = {};
  for (const k of allowed) {
    if (k in patch && !unsupportedColumns.has(k)) out[k] = patch[k] ?? null;
  }
  return out;
}

async function runClinicUpdate(clinicId, patch) {
  let sanitizedPatch = onlyAllowed(patch);

  while (true) {
    const { data, error } = await supabase
      .from("clinics")
      .update(sanitizedPatch)
      .eq("id", clinicId)
      .select("*");

    if (!data || data.length === 0) {
      throw new Error('Record not found');
    }
    return data[0];

    if (!error) {
      return { data: normalizeClinicRow(data), error: null };
    }

    const missingColumn = getMissingColumn(error);
    if (!missingColumn || !OPTIONAL_COLUMNS.has(missingColumn) || unsupportedColumns.has(missingColumn)) {
      return { data: null, error };
    }

    unsupportedColumns.add(missingColumn);
    sanitizedPatch = onlyAllowed(patch);
  }
}

/** Opcional: adiciona cache-busting para exibir logo atualizado sem pegar do cache/CDN */
export function withCacheBust(url) {
  if (!url) return url;
  try {
    const u = new URL(url);
    u.searchParams.set("_", Date.now().toString());
    return u.toString();
  } catch {
    return url;
  }
}

/** Lê dados da clínica direto na tabela `clinics`. */
export async function getClinic(clinicId) {
  if (!clinicId) throw new Error("clinicId é obrigatório");
  const { data, error } = await supabase
    .from("clinics")
    .select("*")
    .eq("id", clinicId);

    if (!data || data.length === 0) {
      throw new Error('Record not found');
    }
    return data[0];

  if (error) {
    console.error("[clinic] get error", error);
    throw new Error(error.message ?? "Falha ao buscar clínica");
  }
  return normalizeClinicRow(data);
}

/** Atualiza branding direto na tabela `clinics`. */
export async function updateClinicSettings(clinicId, patch) {
  if (!clinicId) throw new Error("clinicId é obrigatório");

  const direct = onlyAllowed(patch);
  if (Object.keys(direct).length === 0) {
    // Nada para atualizar – retorna o registro atual
    return getClinic(clinicId);
  }

  const { data, error } = await runClinicUpdate(clinicId, direct);

  if (error) {
    console.error("[clinic] update error", error);
    throw new Error(error.message ?? "Falha ao atualizar clínica");
  }
  return data;
}
