# ⚡ CHECKLIST DE IMPLEMENTAÇÃO - AUDITORIA AGENDA

**Imprima ou Use Este Documento para Rastrear Progresso**

---

## 📋 FASE 1: VALIDAÇÃO (1-2 dias) - SEM QUEBRAS

### 1.1 SQL Queries - Validar Estado do Banco

**Tempo:** 2-4 horas | **Risco:** Nenhum (read-only)

**Arquivo de referência:** `📊_QUERIES_SQL_VALIDACAO_AGENDA.md`

#### Executar Queries de Integridade
- [ ] Query 1.1: Total de agendamentos
- [ ] Query 1.1: Total de serviços
- [ ] Query 1.1: Total de receivables
- **Resultado:** Documentar números

#### Campos NULL - Verificar Corrupção
- [ ] Query 2.1: patient_id NULL
- [ ] Query 2.2: professional_id NULL
- [ ] Query 2.3: service_id NULL
- [ ] Query 2.4: Todos campos NULL
- **Resultado:** 0 = ✅ OK, >5 = ❌ PROBLEMA

#### Room_id e Payer_id - CRÍTICO
- [ ] Query 3.1: Agendamentos sem room_id (%)
- [ ] Query 3.2: Agendamentos sem payer_id (%)
- [ ] Query 3.3: Room_id sem referência em rooms
- [ ] Query 3.4: Payer_id sem referência em payers
- **Resultado:** Documentar findings

#### Múltiplos Serviços
- [ ] Query 4.1: Agendamentos sem appointment_services
- [ ] Query 4.2: Serviços orphans
- [ ] Query 4.3: Distribuição de serviços
- **Resultado:** Verificar se muitos orphans

#### Receivables
- [ ] Query 5.1: Receivables orphans
- [ ] Query 5.2: Agendamentos completos sem receivable
- **Resultado:** Documentar

#### Datas/Horários
- [ ] Query 6.1: Scheduled_date/time NULL
- [ ] Query 6.2: End_time < scheduled_time
- [ ] Query 6.3: Formato de horário inválido
- **Resultado:** Esperar 0 em todos

#### Status
- [ ] Query 7.1: Distribuição de status
- [ ] Query 7.2: Agendamentos > 60 dias em scheduled
- **Resultado:** Documentar

#### RLS Policies
- [ ] Query 8.1: Listar policies ativas
- [ ] Query 8.2: SELECT simples funciona
- **Resultado:** Documentar policy names

#### RPCs
- [ ] Query 9.1: Listar RPCs de agenda
- [ ] Query 9.2: Testar has_overlap_appointments
- **Resultado:** Verificar se existem

#### Performance
- [ ] Query 10.1: Índices na tabela
- [ ] Query 10.2: EXPLAIN com timing
- **Resultado:** < 100ms = ✅ OK

#### Auditoria
- [ ] Query 11.1: Campos created_by/updated_by
- [ ] Query 11.2: Agendamentos sem created_by
- **Resultado:** Documentar

#### Relacionamentos Completos
- [ ] Query 12.1: Consulta complexa com JOINs
- **Resultado:** Verificar se todos fields resolvem

**📊 Resultado Final Phase 1.1:**
- [ ] Documento com diagnóstico do banco
- [ ] Identificados orphans e corrupções
- [ ] Documentadas discrepâncias

---

### 1.2 Testes Manuais - Validar Frontend/Backend

**Tempo:** 4-6 horas | **Risco:** Nenhum (testes não modificam)

**Arquivo de referência:** `🧪_PLANO_TESTES_AGENDA_DETALHADO.md`

#### Teste 1: CamelCase vs Snake_Case
- [ ] Criar agendamento
- [ ] Verificar mapFromDatabase retorna camelCase
- [ ] Verificar compatibilidade snake_case
- [ ] Console logging correto?
- **Resultado:** Ambos campos presentes

#### Teste 2: Room_id e Payer_id Persistência
- [ ] Criar com room_id válido
- [ ] Verificar se retorna criado.roomId === room_id
- [ ] Editar agendamento
- [ ] Verificar se room_id persiste após update
- [ ] Repetir para payer_id
- **Resultado:** IDs persistem corretamente

#### Teste 3: Timezone Horários
- [ ] Criar agendamento às 14:00
- [ ] Verificar no banco scheduled_time
- [ ] Verificar no frontend startTime
- [ ] Devem ser iguais
- **Resultado:** Sem conversão indevida

#### Teste 4: Realtime Duplicatas
- [ ] Abrir 2 abas do navegador
- [ ] Aba 1: Criar agendamento
- [ ] Aba 2: Contar quantas vezes aparece
- [ ] Deve ser 1x apenas
- **Resultado:** Sem duplicação

#### Teste 5: Optimistic Updates
- [ ] Editar agendamento
- [ ] UI atualiza imediatamente? ✅
- [ ] Esperar confirmação de servidor
- **Resultado:** Atualização local funciona

#### Teste 6: Validação de Campos
- [ ] Tentar criar com patient_id = null
- [ ] Deve rejeitar com erro
- [ ] Repetir para professional_id, service_id
- **Resultado:** Validação funciona

#### Teste 7: Múltiplos Serviços
- [ ] Criar com 2-3 serviços
- [ ] Verificar em appointment_services
- [ ] Contar registros
- **Resultado:** Todos os serviços salvos

#### Teste 8: RLS SELECT After Update
- [ ] Editar agendamento
- [ ] Verificar se retorna relacionamentos
- [ ] Check se room_id, payer_id voltam
- **Resultado:** Dados completos retornados

#### Teste 9: Overlap Appointments
- [ ] Criar agendamento 14:00-15:00
- [ ] Tentar criar overlap 14:30-15:30
- [ ] Deve rejeitar
- **Resultado:** Sobreposição detectada

#### Teste 10: React State Sync
- [ ] Editar agendamento
- [ ] Verificar se agendamentos.length === appointments.length
- **Resultado:** Estados sincronizados

#### Teste 11: Carga
- [ ] Criar 100 agendamentos
- [ ] Listar todos
- [ ] Timing < 5s
- **Resultado:** Performance aceitável

**📊 Resultado Final Phase 1.2:**
- [ ] Relatório de testes manuais
- [ ] Identificadas áreas com problemas
- [ ] Evidence (screenshots/logs)

---

### 1.3 Logs de Debug - Rastrear Dados

**Tempo:** 1-2 horas | **Risco:** Nenhum (apenas logs)

**Arquivo de referência:** `🎯_AUDITORIA_AGENDA_COMPLETA_2026_05_06.md` (Seção Technical)

#### Adicionar Logs Temporários
- [ ] Em appointmentsApi.js - mapToDatabase()
  - Log: O que entra (payload)
  - Log: O que sai (data)
- [ ] Em appointmentsApi.js - mapFromDatabase()
  - Log: Raw data do Supabase
  - Log: Dados mapeados (camelCase)
- [ ] Em appointmentsApi.js - updateAppointment()
  - Log: Antes de enviar (data)
  - Log: Resposta do Supabase
  - Log: Se RLS bloqueou SELECT
- [ ] Em useAgendaLive.js
  - Log: Cada evento recebido (ID)
  - Log: Detectar duplicatas
  - Log: Timestamp de recepção

#### Recriar Cenários e Capturar Logs
- [ ] Cenário 1: Criar agendamento com room_id
  - [ ] Capturar logs de criação
  - [ ] Verificar se room_id passa pelo mapper
  - [ ] Resultado: Documento com logs
- [ ] Cenário 2: Editar agendamento
  - [ ] Capturar UPDATE request
  - [ ] Capturar UPDATE response
  - [ ] Verificar se room_id retorna
  - [ ] Resultado: Documento com logs
- [ ] Cenário 3: Realtime em 2 abas
  - [ ] Capturar eventos realtime
  - [ ] Contar quantas vezes mesmo ID aparece
  - [ ] Resultado: Documento com logs

**📊 Resultado Final Phase 1.3:**
- [ ] Arquivo de logs agregados
- [ ] Análise de o que passou/falhou
- [ ] Preparado para FASE 2

---

## 🟡 FASE 2: CORREÇÕES CRÍTICAS (2-3 dias) - COM RISCO

### 2.1 Validação de Overlaps 🔴 CRÍTICO

**Arquivo:** `src/lib/appointmentsApi.js`
**Risco:** 🔴 ALTO (quebra se RPC não existe)

- [ ] Verificar se `has_overlap_appointments` RPC existe (Query 9.2)
- [ ] Se não existe: Criar RPC no Supabase
- [ ] Implementar `checkAndCreateAppointment()` (exemplo em Documento 4)
- [ ] Testar: Criar agendamento
- [ ] Testar: Overlap deve rejeitar
- [ ] **Resultado:** Validação de overlaps ativada ✅

---

### 2.2 Validação Service × Payer 🔴 CRÍTICO

**Arquivo:** `src/lib/appointmentsApi.js`
**Risco:** 🔴 ALTO (impacto em faturamento)

- [ ] Verificar se tabela `service_prices` existe
- [ ] Verificar Query: `validateServicePayerAvailability()`
- [ ] Implementar validação antes de create
- [ ] Testar: Serviço disponível → Aceita ✅
- [ ] Testar: Serviço NOT disponível → Rejeita ❌
- [ ] **Resultado:** Validação ativada ✅

---

### 2.3 Rollback em UPDATE Failure 🔴 CRÍTICO

**Arquivo:** `src/pages/clinica/agenda/views/AgendaUnificada.jsx`
**Risco:** 🔴 ALTO (dados incorretos na UI)

- [ ] Adicionar backup antes de otimistic update
- [ ] Envolver em try/catch
- [ ] Em falha: Restaurar dados antigos
- [ ] Testar: Network falha durante update
  - [ ] UI mostra update
  - [ ] Erro é recebido
  - [ ] UI faz rollback
  - [ ] Dados voltam ao original
- [ ] **Resultado:** Rollback implementado ✅

---

### 2.4 Cascading Delete Consistente 🔴 CRÍTICO

**Arquivo:** `src/lib/appointmentsApi.js` (deleteAppointment)
**Risco:** 🟡 MÉDIO (data inconsistency)

- [ ] Revisar ordem de DELETE (deve ser: receivables → services → appointment)
- [ ] Adicionar transaction se possível
- [ ] Testar: Deletar agendamento com serviços
  - [ ] Query 4.2: Verificar orphans = 0
  - [ ] Verificar ar_receivables também deletados
- [ ] **Resultado:** Cascading delete testado ✅

---

### 2.5 Verificar RLS SELECT After UPDATE 🟡 MÉDIO

**Arquivo:** Supabase SQL Editor
**Risco:** 🟡 MÉDIO (dados não retornam)

- [ ] Fazer UPDATE em appointments
- [ ] Verificar se .select() retorna dados
- [ ] Se retorna vazio:
  - [ ] Log de erro
  - [ ] Possível: RLS está bloqueando
  - [ ] Verificar policy "appointments_select_all"
  - [ ] Garantir USING (true)
- [ ] Testar edit de agendamento novamente
- [ ] Room_id agora retorna? ✅
- [ ] **Resultado:** RLS validado e corrigido ✅

**📊 Resultado Final Phase 2:**
- [ ] ✅ Validação de overlaps
- [ ] ✅ Validação de service × payer
- [ ] ✅ Rollback em falha
- [ ] ✅ Cascading delete
- [ ] ✅ RLS verificado
- [ ] Deploy: FASE 2 completa

---

## 🟢 FASE 3: MELHORIAS (3-5 dias) - SEM URGÊNCIA

### 3.1 Deduplicação Realtime

**Arquivo:** `src/hooks/useAgendaLive.js`
**Risco:** 🟢 BAIXO (apenas otimização)

- [ ] Adicionar processedIds Set
- [ ] Implementar check de duplicata
- [ ] Testar: Criar em 2 abas
- [ ] Deve aparecer apenas 1x
- [ ] **Resultado:** Deduplicação ✅

---

### 3.2 Timezone Explícito

**Arquivo:** `src/lib/appointmentsApi.js`
**Risco:** 🟡 MÉDIO (pode quebrar se mal feito)

- [ ] Importar date-fns-tz
- [ ] Definir CLINIC_TIMEZONE
- [ ] Atualizar extractTime() e extractDate()
- [ ] Testar: Criar em diferentes timezones
- [ ] **Resultado:** Timezone tratado ✅

---

### 3.3 Atomicidade com Transações

**Arquivo:** Supabase RPC (criar novo)
**Risco:** 🔴 ALTO (complex SQL)

- [ ] Criar RPC: `create_appointment_with_services_atomic`
- [ ] Usar BEGIN/COMMIT/ROLLBACK
- [ ] Testar: Criar com 3 serviços
- [ ] Simular falha artificial → Rollback
- [ ] **Resultado:** Atomicidade ✅

---

### 3.4 Unificar Estado React

**Arquivo:** `src/pages/clinica/agenda/views/AgendaUnificada.jsx`
**Risco:** 🟢 BAIXO (refactor)

- [ ] Remover useState para appointments
- [ ] Usar agendamentos como source of truth
- [ ] Testar: UI continua funcionando
- [ ] **Resultado:** Estado unificado ✅

---

## ✅ CHECKLIST FINAL

### Antes de Fazer Deploy

- [ ] FASE 1: Validação completa
  - [ ] SQL queries executadas
  - [ ] Testes manuais passaram
  - [ ] Logs documentados
- [ ] FASE 2: Correções implementadas
  - [ ] Validação de overlaps ✅
  - [ ] Validação service × payer ✅
  - [ ] Rollback ✅
  - [ ] Cascading delete ✅
  - [ ] RLS ✅
- [ ] Testes de Regressão
  - [ ] CRUD básico funciona
  - [ ] Múltiplos serviços funciona
  - [ ] Realtime funciona
  - [ ] Relatórios funcionam
  - [ ] Financeiro não foi quebrado
  - [ ] Repasse não foi quebrado
- [ ] Performance
  - [ ] Listar 100 agendamentos < 5s
  - [ ] UPDATE < 100ms
  - [ ] Sem infinite loops
- [ ] Documentação
  - [ ] Atualizar README
  - [ ] Adicionar comments no código
  - [ ] Criar guide de manutenção

### Aprovação Final
- [ ] Tech Lead: ✅ Revisou código
- [ ] QA: ✅ Testou tudo
- [ ] Gerência: ✅ Aprovou timeline
- [ ] Deploy: ✅ Marcado

---

## 📊 PROGRESSO

```
[████████░░] 80% - FASE 1: Validação
[████░░░░░░] 40% - FASE 2: Correções Críticas
[░░░░░░░░░░]  0% - FASE 3: Melhorias

Tempo Total: ~30-40 horas
Início Estimado: 2026-05-07
Conclusão Estimada: 2026-05-20
```

---

**Imprima este documento e marque conforme avança! ✅**
