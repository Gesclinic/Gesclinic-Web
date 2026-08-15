# Agenda - Relatorio de testes

## Aprovados

- `npx vitest run`: 183 passed, 5 skipped, 0 failed.
- `npx vitest run tests/platform`: 18 passed, 5 skipped, 0 failed.
- Dispatcher: delivery, DLQ, concorrencia e escala com 2/4/8/16 workers.
- Unitarios: hash, RPC fallback, worker wrapper, forms, TISS e CRUD fixtures.
- `npm run build`: success.
- `npm run test:e2e`: 22 passed, 0 failed (Electron headless, 7m08s).
- GitHub Actions `Build Production`: success no commit anterior.
- Vercel app e staging preview: success no commit anterior.

## Nao executados

- Audit hash chain real, rollback, partial failure, appointment transaction e worker lifecycle no banco: skipped por falta de ambiente.
- E2E transacional Platform com banco real: nao executado.

## Falhas de gate fora dos testes

- ESLint: 341 errors em 75 files.
- TypeScript: 40 errors em 13 files.
- Supabase linked lint: 25 erros PL/pgSQL.
- Production dependency audit: 12 vulnerabilidades (1 critical, 7 high, 4 moderate).