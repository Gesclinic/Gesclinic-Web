# Agenda / Platform - Relatorio de seguranca

## Validado no codigo

- Funcoes criticas Platform usam `SECURITY DEFINER` e search path fechado em `pg_catalog`, `platform` e, quando necessario, `extensions`.
- `PUBLIC` perde EXECUTE nas RPCs criticas.
- `service_role` e `platform_worker` recebem apenas os grants necessarios ao fluxo.
- Tabelas Platform usam RLS e revogam acesso de `anon`/`authenticated`.
- Nao ha SQL dinamico com entrada do usuario nas RPCs criticas.
- O unico `EXECUTE` novo usa literal constante para criar role `NOLOGIN`.
- Claim de outbox usa `FOR UPDATE SKIP LOCKED`.
- Cadeia de auditoria usa advisory transaction lock por tenant/clinic.
- Movimento outbox para DLQ ocorre em uma unica RPC transacional.

## Bloqueadores no banco vinculado

O `supabase db lint --linked --level error` retornou 25 erros em funcoes publicas existentes. Entre elas: `calculate_net_revenue`, `calcular_repasse`, `sync_plan_info_to_service`, `create_receivable_from_appointment`, `update_appointment_safe`, `process_appointment_medical_production`, `finalize_appointment_financial`, `rollback_appointment_transaction` e `create_appointment_with_auth`.

Esses erros incluem referencias ambiguas, colunas inexistentes, casts invalidos, retornos incompatíveis e funcoes ausentes. O gate de seguranca/integridade do banco permanece aberto.

## Dependencias de producao

`npm audit --omit=dev` retornou 12 vulnerabilidades: 1 critica, 7 altas e 4 moderadas.

- Diretas: `jspdf`, `next`, `postcss`, `xlsx` e `react-router-dom`.
- `xlsx` nao possui correcao automatica disponivel no audit.
- `jspdf` requer upgrade major para `4.2.1`.
- Upgrades nao foram aplicados automaticamente porque exigem validacao de compatibilidade de relatorios, roteamento e build.