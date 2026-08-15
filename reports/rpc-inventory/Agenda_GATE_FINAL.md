# Agenda Gate Final - Evidencias de pre-homologacao

## Estado

Este documento registra apenas evidencias locais de pre-homologacao. As migrations nao foram aplicadas em Staging e os testes de integracao ainda precisam ser executados contra o banco de testes.

## Bloqueadores revisados

- `src/lib/memedApi.js`: arquivo nao esta vazio; contem um shim explicito de descontinuacao e nao possui callsites ativos conhecidos.
- `platform.append_audit_event`: usa a variavel `v_id` no predicado `WHERE id = v_id`, eliminando a ambiguidade `WHERE id = id`.
- `platform.append_audit_event` e `platform.append_audit_event_v2`: migrations declaram `SECURITY DEFINER`, `SET search_path = platform, public`, `GRANT EXECUTE` e `OWNER TO postgres`.
- `platform.register_worker`, `platform.renew_worker_lease` e `platform.release_worker`: migration declara `SECURITY DEFINER`, `SET search_path = platform, public`, grants para `platform_worker` e `OWNER TO postgres`.

## Migrations revisadas

- `supabase/migrations/20260813_create_platform_append_audit_event_fn.sql`
- `supabase/migrations/20260813_create_platform_append_audit_event_v2.sql`
- `supabase/migrations/20260813_create_platform_worker_leases.sql`

As atribuicoes de owner devem ser verificadas contra os papeis disponiveis no ambiente antes da aplicacao.

## Testes do gate

Comando local focado:

```powershell
npx vitest run tests/platform/hashChain.spec.js tests/platform/appointmentTransaction.spec.js tests/platform/auditHashChain.integration.spec.js tests/platform/auditRollback.integration.spec.js tests/platform/appointment.integration.spec.js tests/platform/workerLease.integration.spec.js
```

Resultado local:

- 6 arquivos coletados.
- 2 arquivos aprovados e 4 arquivos de integracao ignorados por ausencia das variaveis do ambiente de integracao.
- 3 testes aprovados e 5 testes ignorados.
- Nenhuma falha nessa execucao focada.

Os testes de integracao cobrem, quando executados com banco configurado:

- cadeia de tres eventos, `previous_hash` e `hmac` persistidos;
- rollback transacional e falha parcial antes do commit;
- appointment, audit event e outbox vinculados por `request_id`, `correlation_id` e `event_id`;
- ciclo do worker com registro, heartbeat, expiracao da lease, renovacao e liberacao;
- propriedades da RPC `append_audit_event` no catalogo PostgreSQL.

## Variaveis necessarias

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PG_CONNECTION_STRING`
- `TEST_CLINIC_ID` para o fluxo de appointment

## Pendencias

- Executar os cinco cenarios de integracao em banco de testes.
- Aplicar e validar as migrations em Staging somente apos o merge aprovado.
- Capturar os logs do banco, Supabase Preview e Vercel Staging.
- Emitir a decisao final de homologacao apenas depois dessas validacoes.

## Status

AGUARDANDO TESTES DE INTEGRACAO E VALIDACAO EM STAGING