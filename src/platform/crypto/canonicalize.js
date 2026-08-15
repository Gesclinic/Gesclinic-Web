// Deterministic JSON canonicalization: sort object keys recursively and serialize without whitespace
function sortKeys(obj) {
  if (obj === null || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(sortKeys)
  const keys = Object.keys(obj).sort()
  const out = {}
  for (const k of keys) out[k] = sortKeys(obj[k])
  return out
}

export function canonicalizeJSON(value) {
  const sorted = sortKeys(value)
  return JSON.stringify(sorted)
}

export default canonicalizeJSON
