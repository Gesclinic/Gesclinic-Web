const META_START = "[[GESCLINIC_PATIENT_RECORD_META]]";
const META_END = "[[/GESCLINIC_PATIENT_RECORD_META]]";

function sanitizeMetadata(metadata = {}) {
  return Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => {
      if (value === undefined || value === null) return false;
      if (typeof value === "string") return value.trim() !== "";
      if (typeof value === "object") return Object.keys(value).length > 0;
      return true;
    })
  );
}

export function buildPatientRecordPrescription(notes = "", metadata = {}) {
  const normalizedNotes = (notes || "").trim();
  const normalizedMetadata = sanitizeMetadata(metadata);

  if (!Object.keys(normalizedMetadata).length) {
    return normalizedNotes;
  }

  return `${META_START}${JSON.stringify(normalizedMetadata)}${META_END}${normalizedNotes ? `\n${normalizedNotes}` : ""}`;
}

export function parsePatientRecordPrescription(rawValue = "") {
  const raw = rawValue || "";

  if (!raw.startsWith(META_START)) {
    return { metadata: {}, notes: raw };
  }

  const metaEndIndex = raw.indexOf(META_END);
  if (metaEndIndex === -1) {
    return { metadata: {}, notes: raw };
  }

  try {
    const metadata = JSON.parse(raw.slice(META_START.length, metaEndIndex));
    const notes = raw.slice(metaEndIndex + META_END.length).trim();
    return { metadata: metadata || {}, notes };
  } catch {
    return { metadata: {}, notes: raw };
  }
}