// memedApi.js
// Deprecated stub for legacy Memed integration.
// Historically this file contained runtime wrappers for dynamic RPC calls
// to external prescription providers. The file is intentionally left as a
// minimal deprecation shim to make the project explicit about the state
// of this integration and to avoid unresolved-wrapper reports during
// automated analysis.

export function deprecatedMemedCall() {
  throw new Error('memedApi is deprecated or not implemented in this checkout. If you need this integration, add an implementation or provide runtime evidence in the repository history.');
}

export default {
  deprecatedMemedCall,
}
