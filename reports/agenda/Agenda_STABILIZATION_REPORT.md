# Agenda - Relatorio de estabilizacao

## Antes

- PR carregava historico nao relacionado e migration versions duplicadas.
- Platform tests tinham imports ausentes, estado de outbox persistente e dispatcher sem configuracao efetiva de worker/lease.
- Hash chain lia `previous_hash` da linha anterior, nao o `hmac` anterior.
- Movimento para DLQ no PostgreSQL era uma sequencia nao atomica.
- Suite completa: 40 testes falhando, uma suite sem carregar e cinco integracoes ignoradas.
- Build passava, mas lint, typecheck, Supabase Preview e E2E nao passavam.

## Depois

- PR isolado sobre `master` e migrations Platform ordenadas por timestamps unicos.
- Runtime Platform restaurado e corrigido para schema-scoped Supabase RPC/table access.
- Dispatcher, retries, DLQ, leases e concorrencia corrigidos; testes de escala 2/4/8/16 workers passam.
- Hash chain serializada por advisory lock, `previous_hash = hmac anterior` e insert do evento+hmac atomico.
- Appointment RPCs, workers e outbox RPCs com `SECURITY DEFINER`, search path fechado, owner e grants explicitos.
- Full Vitest: 183 passed, 5 skipped, 0 failed.
- Platform Vitest: 18 passed, 5 skipped, 0 failed.
- Cypress E2E: 22 passed, 0 failed.
- Build local e GitHub Actions: success.
- Vercel previews: success no commit anterior do PR; novo commit ainda precisara de novos checks.

## Bloqueadores restantes

- Cinco testes de integracao nao executados por ausencia de `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PG_CONNECTION_STRING` e `TEST_CLINIC_ID` na sessao.
- Docker Desktop indisponivel; Supabase local nao pode iniciar.
- Supabase linked lint retorna 25 erros em funcoes publicas existentes.
- `npm audit --omit=dev`: 12 vulnerabilidades runtime (1 critica, 7 altas, 4 moderadas).
- ESLint global retorna 341 erros em 75 arquivos, incluindo 17 arquivos Agenda.
- TypeScript retorna 40 erros em 13 arquivos Financeiro.
- Supabase Preview do PR estava vermelho antes das renomeacoes; precisa ser reexecutado apos push.
- O inventario remoto mostra muitas migrations legadas com nomes fora do padrao e varias versoes locais duplicadas; o conjunto Platform foi normalizado, mas a divida global permanece.
- E2E de formularios passou; o E2E transacional Platform depende do banco de integracao.