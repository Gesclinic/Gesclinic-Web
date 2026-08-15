# Agenda / Platform - Matriz RPC final

| RPC | Chamada | Retorno | Caller principal | Seguranca | Estado |
|---|---|---|---|---|---|
| `platform.append_audit_event` | 12 parametros | `(id, new_hash)` | fallback do `auditRepository`; testes | definer, path fechado, service_role | Fonte validada; banco pendente |
| `platform.append_audit_event_v2` | 15 parametros | `id` | `auditRepository`, appointment RPCs | definer, path fechado, service_role | Fonte validada; banco pendente |
| `platform.register_worker` | `(text, integer)` | uuid | `WorkerLeaseService` | definer, path fechado, platform_worker | Fonte/teste validado |
| `platform.renew_worker_lease` | `(uuid, integer)` | boolean | `WorkerLeaseService` | definer, path fechado, platform_worker | Fonte/teste validado |
| `platform.release_worker` | `(uuid)` | boolean | `WorkerLeaseService` | definer, path fechado, platform_worker | Fonte/teste validado |
| `platform.claim_next_outbox_event` | `(uuid)` | outbox row | `PostgresOutboxAdapter` | definer, SKIP LOCKED, service_role | Fonte/concorrencia validada |
| `platform.platform_mark_outbox_failed` | `(uuid, text)` | retry state | `PostgresOutboxAdapter` | definer, path fechado, service_role | Fonte validada |
| `platform.move_outbox_to_dlq` | `(uuid, text)` | boolean | `PostgresOutboxAdapter` | definer, transacional, service_role | Fonte validada |
| `platform.appointment_create` | `(jsonb, uuid, text, text, uuid)` | jsonb | teste de integracao | definer, path fechado, service_role | Banco pendente |
| `platform.appointment_update` | `(uuid, jsonb, uuid, text, text, uuid)` | jsonb | sem caller JS ativo | definer, path fechado, service_role | Candidato a RPC orfa; revisar |
| `platform.appointment_cancel` | `(uuid, text, uuid, text, text, uuid)` | jsonb | sem caller JS ativo | definer, path fechado, service_role | Candidato a RPC orfa; revisar |
| `platform.cleanup_expired_worker_leases` | `()` | integer | sem caller ativo | definer, path fechado, service_role | Requer scheduler/owner operacional |

## Compatibilidade

- Supabase JS usa `client.schema('platform').rpc('nome')` para chamadas reais.
- Compatibilidade com mocks legados que esperam `platform.nome` foi preservada nos wrappers.
- RPCs sem caller ativo nao foram removidas porque fazem parte da migration transacional e podem ser chamadas por jobs externos.