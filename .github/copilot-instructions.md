# Gesclinic Web — AI Agent Coding Instructions

These instructions help AI agents work productively in this codebase by capturing architecture, workflows, and project-specific conventions.

## Architecture Overview
- **Frontend Stack:** React 18 + Vite 5 + TailwindCSS; React Router v6 drives navigation. Radix UI components and FullCalendar power rich UI.
- **Entry + Providers:** App is mounted in `src/main.jsx` with `HelmetProvider`, `AuthProvider`, `ClinicProvider`, and `BrowserRouter`. Use `useAuth()` and `useClinicContext()` for user/clinic state.
- **Routing:** Primary routes live in `src/AppRoutes.jsx`. Public routes (`/`, `/login`, `/register`) are gated by `PublicRoute`. Auth paths are nested under `/clinica` with `AppLayout` and feature modules (Agenda, Estoque, Financeiro). Example: `/clinica/financeiro/fluxo-caixa`.
- **Legacy/Alternative Routes:** `src/routes.tsx` contains a separate lazy-loading route map used by older views; prefer `AppRoutes.jsx` unless specifically working on those.
- **Data Layer:** Supabase is the backend. A singleton client is defined in `src/lib/customSupabaseClient.js` and accessed throughout `src/lib/**Api.js` modules (e.g., `clinicsApi.js`, `appointmentsApi.js`, `financeApi.js`). Both direct table access and `rpc()` calls are used.

## Environment & Config
- **Required Env:** Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`. The app throws on missing values; HMR relies on a single client instance.
- **Vite Config:** See `vite.config.js` for custom error overlay handling, fetch monkey patch (logs API errors), and server defaults (port 3000, host=true). Aliases: `@` → `./src`.
- **Tailwind:** Config in `tailwind.config.js` with CSS variables for theme colors; content scanning includes `./index.html` and `./src/**/*.{js,jsx,ts,tsx}`.

## Critical Workflows
- **Run Dev:** `npm run dev` (Vite on port 3000). Windows clean: `npm run clean:win`.
- **Build/Preview:** `npm run build` then `npm run preview`.
- **Database Migrations:** Apply SQL in Supabase using PowerShell helpers:
  - Finance: `scripts/apply_finance_migrations.ps1` (reads `supabase/migrations/20260111_*.sql`).
  - Stock balance: `scripts/apply_stock_balance_migration.ps1` (reads `supabase/migrations/2026-01-07_create_stock_balance_function.sql`).
  Ensure these are applied before using related UI/API paths.

## Conventions & Patterns
- **Protected vs Public:** Use `ProtectedRoute` in `AppRoutes.jsx` for authenticated sections; it blocks until auth resolves (`loading` state in `useAuth()`), then gates by `isAuthenticated`.
- **Clinic Context:** Pages that rely on clinic settings should read `clinicId` and `clinic` from `useClinicContext()`. Handle `loadingClinic` or design page to assume availability under `/clinica`.
- **API Modules:**
  - `appointmentsApi.listAppointments()` queries `view_agenda_completa_v6` filtered by `clinic_id`, time range, and optional professional/room/status.
  - `clinicsApi.updateClinicSettings()` updates whitelisted fields and normalizes `undefined → null` to clear values.
  - `financeApi` uses both direct tables (`ap_bills`, `ap_items`, `invoices`) and RPCs (`list_ap_bills`, `cashflow_summary`, `pay_accounts_payable_batch`). It normalizes UI statuses to DB enums and includes fallbacks when optional columns don’t exist.
- **Status Normalization:** Finance status strings are normalized (`open`, `paid`, `canceled`, `partial`, `scheduled`) from various locales/labels; prefer using helpers in `financeApi.js`.
- **Error Visibility:** Vite overlay and `window.fetch` monkey patch (in `vite.config.js`) log non-HTML fetch errors to the console. Don’t suppress these; they help catch API issues.

## Adding Features
- **New Page:** Create under `src/pages/<area>/...`. Register route in `src/AppRoutes.jsx` inside the appropriate module (e.g., `/clinica/estoque/*`). Wrap under `AppLayout`; for Agenda, nest under `AgendaLayout`.
- **Data Access:** Reuse existing API modules in `src/lib`. If introducing new tables/RPCs, follow the pattern: small helpers for normalization, wide filters via `.or()` when needed, and `select(...).single()` when expecting one.
- **Auth-Aware UI:** Read `useAuth()` for `user`, `clinicId`, `currentRole`. Use `ProtectedRoute` or check `isAuthenticated` before firing queries.

## Examples
- **List appointments (Agenda):**
  ```js
  const appts = await listAppointments({ clinicId, start, end, professionalId });
  ```
- **Query AP bills (Finance):**
  ```js
  const rows = await listAPQuery({ clinicId, statusList: ['open','partial'], start, end, search: 'fornecedor' });
  ```
- **Update clinic branding:**
  ```js
  const updated = await updateClinicSettings(clinicId, { brand_name: 'Minha Clínica', primary_color: '#0055ff' });
  ```

## Notes
- This repo contains an `app/` Angular structure not used by the Vite/React app. Unless explicitly directed, focus on React paths under `src/`.
- UI uses Tailwind and Radix; prefer existing components in `src/components/ui` and `src/components/layout`.
