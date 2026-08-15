# Changelog

## Unreleased

### Fixed

- Stabilized Agenda Platform audit hash chain, worker leases, outbox claiming/retries/DLQ, and Supabase schema-scoped RPC calls.
- Added atomic rollback and integration coverage for audit, appointment and worker flows.
- Corrected Platform migration ordering, ownership, grants, search paths and RLS hardening.
- Restored deterministic Platform concurrency tests and removed an obsolete forms integration suite.

### Known Issues

- Integration database tests, E2E, global lint, global typecheck and linked Supabase lint are not yet green. See `reports/agenda/Agenda_STABILIZATION_REPORT.md`.
- Production dependency audit reports 12 unresolved vulnerabilities, including one critical issue.