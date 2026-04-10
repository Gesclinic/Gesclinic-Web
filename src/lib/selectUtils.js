export const NONE = "__none__";

export const isNone = (value) => value === NONE;

export const asUuidOrNull = (value) => {
  if (!value || value === NONE) {
    return null;
  }
  return String(value);
};

export const asStringOrNull = (value) => {
  if (!value || value === NONE) {
    return null;
  }
  return String(value);
};

export const asNumberOrNull = (value) => {
  if (value === null || value === undefined || value === "" || value === NONE) {
    return null;
  }
  const num = Number(value);
  return isNaN(num) ? null : num;
};


export const toIsoUtcOrNull = (localDateTimeString) => {
  if (!localDateTimeString) return null;
  try {
    // Se vier só data/hora, monta string ISO sem offset
    let dateStr = localDateTimeString;
    if (!dateStr.match(/T\d{2}:\d{2}:\d{2}/)) {
      dateStr = dateStr.replace(/T(\d{2}:\d{2})$/, 'T$1:00');
    }
    // Retorna string ISO local sem conversão para UTC
    return dateStr;
  } catch {
    return null;
  }
};

export const selectValue = (value) => value || NONE;

export const fromSelect = (value) => (isNone(value) ? null : value);

export const noneOr = (value) => (value === NONE ? null : value);