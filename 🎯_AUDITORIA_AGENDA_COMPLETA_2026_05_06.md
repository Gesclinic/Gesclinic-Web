# 🎯 AUDITORIA COMPLETA DO MÓDULO AGENDA - 2026-05-06

## 📋 SUMÁRIO EXECUTIVO

**Status:** PARCIALMENTE ESTABILIZADO COM RISCOS IDENTIFICADOS
**Objetivo:** Validar integridade de CRUD, persistência, realtime, timezone, e estados React
**Data:** 2026-05-06
**Escopo:** Sem alterações de arquitetura, sem quebra de funcionalidades

---

## 🔴 ACHADOS CRÍTICOS

### 1. **Inconsistência de Nomes de Campos (Frontend vs Backend)**

#### Problema
- Backend usa `snake_case`: `patient_id`, `professional_id`, `scheduled_time`, `scheduled_date`
- Frontend usa `camelCase`: `patientId`, `professionalId`, `startTime`, `date`
- Múltiplos mapeadores convertem entre formatos, mas inconsistentemente

#### Localização
- **API:** `/src/lib/appointmentsApi.js` - `mapToDatabase()` e `mapFromDatabase()`
- **Mapeador:** `/src/modules/agenda/services/agendaMapper.js`
- **Componentes:** `AgendaUnificada.jsx`, `AgendamentoEditarModal.jsx`

#### Status
✅ **Parcialmente Resolvido** - mapFromDatabase() converte camelCase, mas alguns componentes ainda esperam snake_case
- `mapFromDatabase()` retorna AMBOS os formatos (compatibilidade retroativa)
- Logs de debug mostram o mapeamento ocorrendo corretamente
- ⚠️ **RISCO:** Componentes legados podem usar snake_case diretamente

#### Verificação Necessária
```javascript
// ✅ VERIFICADO: Em appointmentsApi.js linhas 201-330
// - Retorna: patientId, professionalId, serviceId, roomId, payerId
// - E também: patient_id, professional_id, service_id (compatibilidade)
```

---

### 2. **Problema de Persistência de Campos (Room, Payer, Plan)**

#### Problema
- Ao criar agendamento: `room_id`, `payer_id`, `plan_id` podem não persistir
- Ao editar: valores retornam `undefined` ou `null` quando deveriam ter o ID

#### Causa Raiz
```javascript
// appointmentsApi.js linha 800+
// updateAppointment() NÃO retorna relacionamentos se RLS bloqueia SELECT
// ⚠️ Fallback construído do payload, mas pode estar vazio
```

#### Locais Afetados
1. **NovoAgendamento.jsx** - criação com múltiplos serviços
2. **AgendamentoEditarModal.jsx** - edição (linha 156-200)
3. **DrawerAtendimento.jsx** - quick edit

#### Status
⚠️ **PARCIALMENTE ARRISCADO** - Fallback existe mas insuficiente
- Quando Supabase retorna dados: ✅ OK
- Quando RLS bloqueia SELECT: ❌ Dados retornam do payload (pode estar vazio)

#### Validação Necessária
```sql
-- Verificar se RLS está bloqueando SELECT após UPDATE
SELECT * FROM appointments WHERE clinic_id = $1 LIMIT 1;
-- Se retorna rows: ✅ RLS OK
-- Se retorna vazio: ❌ RLS bloqueando SELECT
```

---

### 3. **Timezone Inconsistencies**

#### Problema
- `scheduled_date` e `scheduled_time` são armazenados em UTC
- Frontend usa `date-fns` e `date-fns-tz` sem timezone consistente
- Conversão entre ISO string e HH:MM pode gerar bugs de horário

#### Localização
- **API:** `appointmentsApi.js` linhas 45-65 (extractDate, extractTime)
- **Componentes:** Qualquer lugar que usa date inputs

#### Status
⚠️ **RISCO MÉDIO** - Conversão existe mas pode ter edge cases
- Conversão ISO → HH:MM: ✅ Parece OK
- Conversão HH:MM → ISO: ⚠️ Sem timezone explícito

#### Exemplos de Risco
```javascript
// ❌ RISCO: Se usuário está em timezone diferente do servidor
const startTime = "14:00"; // Hora local
const date = "2026-05-06"; // Dia local
// Quando envia para Supabase sem timezone, pode virar 18:00 UTC

// ✅ ESPERADO: Usar date-fns-tz
import { formatInTimeZone } from 'date-fns-tz';
```

---

### 4. **Realtime Updates - Duplicatas e Sync**

#### Problema
- Hook `useAgendaLive.js` escuta mudanças na tabela `appointments`
- Sem tratamento de deduplicação
- Possível que mesmo agendamento chegue 2x (um via UPDATE, outro via realtime)

#### Localização
- **Hook:** `/src/hooks/useAgendaLive.js` (linhas 1-24)
- **Consumo:** Componentes que usam canal realtime

#### Status
🟡 **RISCO MÉDIO** - Sem deduplicação implementada
```javascript
// ❌ Atual: Apenas passa payload para onChange
const channel = supabase
  .channel('agenda-events')
  .on('postgres_changes', { event: '*', ... }, (payload) => {
    onChange(payload); // ← Sem verificar duplicata
  })
```

#### Recomendação
```javascript
// ✅ Melhorado:
const processedIds = new Set();
.on('postgres_changes', {...}, (payload) => {
  if (!processedIds.has(payload.new?.id)) {
    onChange(payload);
    processedIds.add(payload.new?.id);
  }
});
```

---

### 5. **Otimistic Updates Quebrados**

#### Problema
- `updateAppointmentLocal()` atualiza estado React ANTES de confirmar no Supabase
- Se UPDATE falhar, UI fica com dados incorretos
- Sem rollback ou validação pós-sucesso

#### Localização
- **Componentes:** `AgendaUnificada.jsx`, `AgendaPorProfissional.jsx`
- **Padrão:** `setAppointments(prev => prev.map(...))`

#### Status
⚠️ **RISCO ALTO** - Sem confirmação pós-UPDATE
```javascript
// ❌ Atual pattern em componentes:
const handleSaveAgendamento = async () => {
  updateAppointmentLocal(); // ← UI atualiza ANTES
  const result = await updateAppointment(id, data); // ← Pode falhar
  // Sem rollback se falhar!
}

// ✅ Esperado:
const handleSaveAgendamento = async () => {
  const backup = agendamentos; // Guardar estado anterior
  updateAppointmentLocal(); // UI atualiza
  try {
    const result = await updateAppointment(id, data);
    // ✅ Sucesso confirmado
  } catch (error) {
    setAgendamentos(backup); // Rollback
  }
}
```

---

### 6. **Estados React Sobrescrevendo Valores**

#### Problema
- Em `AgendaUnificada.jsx`, múltiplos `useState` rastreiam mesmo dado
- Sincronização manual pode deixar dados desync
- Possível que um atualiza e outro não

#### Localização
- **Arquivo:** `src/pages/clinica/agenda/views/AgendaUnificada.jsx` linhas 30-50
```javascript
const [agendamentos, setAgendamentos] = useState([]);
const [appointments, setAppointments] = useState([]); // ← Mesmo dado?
const [modalDetalhesDados, setModalDetalhesDados] = useState(null);
const [filteredAppointments, setFilteredAppointments] = useState([]);
```

#### Status
⚠️ **RISCO MÉDIO** - Sem unificação de estado
- Não está claro se `agendamentos` e `appointments` são sincronizados
- Possível que dados diferentes estejam em cada variável

---

### 7. **Validação de Campos Incompleta**

#### Problema
- `validateAppointment()` não valida UUIDs existem no banco
- Não valida sobreposição de horários (overlap)
- Não valida se convênio suporta serviço

#### Localização
- **API:** `appointmentsApi.js` linhas 70-120 (validateAppointment)

#### Status
⚠️ **RISCO MÉDIO** - Validação superficial
```javascript
// ❌ Falta validar:
- Se patient_id existe em patients table
- Se professional_id existe em professionals table
- Se service_id existe em services table
- Se room_id existe em rooms table
- Se payer_id existe em payers table
- Se há sobreposição com outro agendamento (overlap)
- Se serviço está disponível para esse convênio (service_prices)
```

#### RPC Disponível
```sql
-- Verificar sobreposição
SELECT * FROM has_overlap_appointments(
  p_appointment_id UUID,
  p_professional_id UUID,
  p_start_time TIMESTAMP,
  p_end_time TIMESTAMP
);
```

---

### 8. **Múltiplos Serviços - Persistência Frágil**

#### Problema
- Implementado em `createAppointmentWithServices()` e `updateAppointmentWithServices()`
- Sem transação atômica: se INSERT no appointment_services falhar, appointment fica órfão
- Sem cascading delete para ar_receivables

#### Localização
- **API:** `appointmentsApi.js` linhas 1100-1350
- **Tabela:** `appointment_services`, `appointment_service_billing_history`

#### Status
⚠️ **RISCO ALTO** - Sem atomicidade
```javascript
// ❌ Problema: Se INSERT na tabela appointment_services falhar
// O agendamento já foi criado mas sem serviços!
const { data: appointmentResult } = await supabase
  .from('appointments').insert([appointmentData]).select()
  // ✅ Agendamento criado

const { data: servicesResult, error: servicesError } = await supabase
  .from('appointment_services').insert(servicesData)
  // ❌ Se aqui falhar, agendamento fica orphan
```

#### Recomendação
Usar Supabase transactions (RPC com BEGIN/COMMIT) ou tratamento de erro mais robusto

---

### 9. **Payloads Incompletos do Frontend**

#### Problema
- Alguns campos deixam de ser enviados em UPDATE
- Exemplo: `room_id` pode vir como `undefined` e não ser incluído no UPDATE

#### Localização
- **Componentes:** `AgendamentoEditarModal.jsx`, `DrawerAtendimento.jsx`
- **Pattern:** Construindo payload manualmente sem validação

#### Status
⚠️ **RISCO MÉDIO** - Sem validação de payload antes de enviar
```javascript
// ❌ Pode acontecer:
const payload = {
  date: '2026-05-06',
  startTime: '14:00',
  // room_id NÃO incluído porque estava undefined!
};

// ✅ Esperado:
const payload = {
  date: '2026-05-06',
  startTime: '14:00',
  room_id: null, // ← Explicitamente null se não preenchido
};
```

---

### 10. **Campos Null Indevidos**

#### Problema
- Alguns campos que deveriam ter valor vêm como `null` ou `undefined`
- Exemplo: `professional_id` null em agendamento de profissional específico

#### Localização
- **Verificação:** Logs de debug em `mapFromDatabase()` mostram quais campos vêm null
- **Esperado:** `patient_id`, `professional_id`, `service_id` nunca devem ser null

#### Status
⚠️ **RISCO MÉDIO** - Sem validação pós-busca
```javascript
// ❌ Possível cenário:
const apt = await getAppointmentById(id);
console.log(apt.patientId); // null ← Deveria ser UUID!

// ✅ Esperado: Validação de integrity
if (!apt.patientId) {
  throw new Error('Agendamento corrompido: patient_id vazio');
}
```

---

## 📊 VALIDAÇÕES RECOMENDADAS

### CRUD COMPLETO

#### ✅ CREATE
- [x] Inserir agendamento com todos os campos obrigatórios
- [x] Retorna dados mapeados em camelCase
- [x] Relacionamentos (patients, professionals, etc) retornam
- ⚠️ **TODO:** Validar se service está disponível para payer (service_prices)

#### ✅ READ
- [x] Buscar agendamento por ID
- [x] Listar agendamentos por range de datas
- [x] Dados retornam em camelCase
- ⚠️ **TODO:** Validar se há agendamentos orphans (serviços sem agendamento)

#### ⚠️ UPDATE
- [x] Atualizar campo único (status, notas)
- ⚠️ **TODO:** Validar se UPDATE retorna dados mesmo com RLS
- ⚠️ **TODO:** Validar se `room_id` persiste após UPDATE

#### ⚠️ DELETE / CANCEL
- [x] Cancelar agendamento (status = 'cancelled')
- [x] Deletar agendamento (com cascading de ar_receivables)
- ⚠️ **TODO:** Validar se appointment_services também são deletados

---

## 🔍 CAMPOS QUE DEVEM PERSISTIR

| Campo | Type | Frontend | Backend | Status |
|-------|------|----------|---------|--------|
| id | UUID | N/A | appointment.id | ✅ OK |
| clinic_id | UUID | N/A | mapToDatabase() | ✅ OK |
| patient_id | UUID | patientId | mapToDatabase() | ⚠️ Pode ser null |
| professional_id | UUID | professionalId | mapToDatabase() | ⚠️ Pode ser null |
| service_id | UUID | serviceId | mapToDatabase() | ⚠️ Pode ser null |
| room_id | UUID | roomId | mapToDatabase() | ⚠️ **CRÍTICO** - não persiste |
| payer_id | UUID | payerId | mapToDatabase() | ⚠️ **CRÍTICO** - não persiste |
| plan_id | UUID | planId | mapToDatabase() | ⚠️ Pode ser null |
| scheduled_date | DATE | date | mapToDatabase() | ✅ OK |
| scheduled_time | TIME | startTime | mapToDatabase() | ⚠️ Timezone issue |
| end_time | TIME | endTime | mapToDatabase() | ⚠️ Timezone issue |
| status | VARCHAR | status | mapToDatabase() | ✅ OK |
| notes | TEXT | notes | mapToDatabase() | ✅ OK |
| value | NUMERIC | value | mapToDatabase() | ✅ OK |
| duration | INT | duration | mapToDatabase() | ✅ OK |
| discount | NUMERIC | discount | mapToDatabase() | ✅ OK |
| payer_id | UUID | payerId | mapToDatabase() | ⚠️ **CRÍTICO** |

---

## 🗄️ VALIDAÇÃO DE BANCO DE DADOS

### Tabelas Críticas
```sql
-- 1. appointments
SELECT COUNT(*) FROM appointments;
SELECT * FROM appointments 
  WHERE room_id IS NULL AND professional_id IS NOT NULL
  LIMIT 5; -- Verificar se há agendamentos sem sala

-- 2. appointment_services
SELECT COUNT(*) FROM appointment_services;
SELECT * FROM appointment_services 
  WHERE appointment_id NOT IN (SELECT id FROM appointments)
  LIMIT 5; -- Verificar orphans

-- 3. ar_receivables
SELECT COUNT(*) FROM ar_receivables;
SELECT * FROM ar_receivables 
  WHERE appointment_id NOT IN (SELECT id FROM appointments)
  LIMIT 5; -- Verificar orphans
```

### RPCs Críticas
```sql
-- 1. create_or_update_appointment_v3
-- 2. list_agenda_completa_v4
-- 3. list_appointments_range_secure
-- 4. has_overlap_appointments

-- Verificar se existem e estão corretas:
SELECT p.proname, p.pronargs 
FROM pg_proc p
WHERE p.proname IN (
  'create_or_update_appointment_v3',
  'list_agenda_completa_v4',
  'list_appointments_range_secure',
  'has_overlap_appointments'
);
```

### RLS Policies
```sql
-- Verificar policies na tabela appointments
SELECT policyname, rol::regrole, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'appointments';
```

---

## 🔧 PROBLEMAS JÁ CORRIGIDOS

### ✅ 1. Infinite Render Loop (2026-04-30)
- **Problema:** AppointmentUnitedModal congelava ao editar
- **Causa:** useEffect dependencies incompletas
- **Solução:** Adicionar todas as deps (appointmentIdToEdit, mode, clinicId)
- **Status:** ✅ RESOLVIDO

### ✅ 2. Snake_Case vs CamelCase (2026-05-02)
- **Problema:** AtendimentoModal esperava snake_case, mas recebia camelCase
- **Solução:** mapFromDatabase() retorna ambos os formatos
- **Status:** ✅ RESOLVIDO (compatibilidade retroativa)

### ✅ 3. Performance de Agenda (Antes de 2026-04-29)
- **Problema:** Cada alteração recarregava TODA a agenda do dia
- **Solução:** updateAppointmentLocal() sem reload se data não mudou
- **Gain:** De 1-2s para <100ms
- **Status:** ✅ RESOLVIDO

### ✅ 4. Múltiplos Serviços por Agendamento (2026-05-03)
- **Problema:** Não havia suporte a múltiplos serviços
- **Solução:** Novas funções createAppointmentWithServices(), etc
- **Status:** ✅ IMPLEMENTADO (mas sem atomicidade)

---

## ⚙️ TÉCNICO - RPCs E QUERIES

### 📍 RPC: has_overlap_appointments
**Uso:** Validar se há sobreposição de horários
```sql
-- Deveria retornar boolean indicando se há overlap
SELECT has_overlap_appointments(
  p_appointment_id => $1,  -- NULL para nova criação
  p_professional_id => $2,
  p_start_time => $3::timestamp,
  p_end_time => $4::timestamp
);
```

**Status:** ⚠️ Não está sendo chamado no frontend!
- Recomendação: Adicionar validação antes de criar/editar

---

### 📍 RPC: list_agenda_completa_v4
**Uso:** Listar agendamentos com dados completos
```sql
SELECT list_agenda_completa_v4(
  p_clinic_id => $1,
  p_start => $2::timestamp,
  p_end => $3::timestamp,
  p_professional_id => $4::uuid  -- opcional
);
```

**Status:** ✅ Sendo usado em `useAgenda.js`
**Problema:** v1 está sendo usado, não v4!
- `useAgenda.js` linha 25 usa `rpc('list_agenda_v1', ...)`
- Deveria usar v4 para dados mais completos

---

### 📍 Query: listAppointments
**Arquivo:** `appointmentsApi.js` linhas 350-450
**Padrão:** SELECT com relacionamentos completos
```javascript
.select(`
  *,
  patients (id, name, phone),
  professionals (id, name),
  services (id, name),
  payers (id, name),
  rooms (id, name)
`)
```

**Status:** ✅ OK
**Relacionamentos:** Completos
**Problema:** Sem busca de service_prices para validação de disponibilidade

---

## 📝 CHECKLIST DE CORREÇÃO RECOMENDADA

### Fase 1: Validação e Logging (Sem Quebras)
- [ ] 1.1 Adicionar logs de debug em mapToDatabase() para ver o que está sendo enviado
- [ ] 1.2 Adicionar logs em mapFromDatabase() para verificar mapeamento
- [ ] 1.3 Adicionar validação de UUIDs em validateAppointment()
- [ ] 1.4 Log quando room_id ou payer_id vêm como null/undefined

### Fase 2: Correção de Timezone
- [ ] 2.1 Usar `date-fns-tz` consistentemente em toda agenda
- [ ] 2.2 Adicionar timezone no extractTime() e extractDate()
- [ ] 2.3 Testar com diferentes timezones

### Fase 3: Validação de Integridade
- [ ] 3.1 Validar se fields obrigatórios existem no banco antes de criar
- [ ] 3.2 Implementar has_overlap_appointments check antes de criar
- [ ] 3.3 Implementar service_prices check (serviço disponível para payer)

### Fase 4: Realtime e Sync
- [ ] 4.1 Implementar deduplicação em useAgendaLive.js
- [ ] 4.2 Testar duplicatas ao criar/editar simultaneamente
- [ ] 4.3 Testar sync entre múltiplos tabs/browsers

### Fase 5: Optimistic Updates
- [ ] 5.1 Adicionar rollback em caso de UPDATE failure
- [ ] 5.2 Adicionar validação pós-confirmação de UPDATE
- [ ] 5.3 Testar com rede lenta/desconexão

---

## 📌 RISCOS DE REGRESSÃO

### Alto
- ❌ Modificar mapToDatabase() - quebra criação/edição
- ❌ Modificar mapFromDatabase() - quebra exibição de dados
- ❌ Remover relacionamentos de queries - quebra campos calculados

### Médio
- ⚠️ Mudar nomes de campos em appointmentsApi.js
- ⚠️ Modificar validateAppointment() - pode rejeitar dados válidos

### Baixo
- ✅ Adicionar logs de debug
- ✅ Adicionar validações adicionais
- ✅ Otimizar queries

---

## 🎯 PRÓXIMAS AÇÕES

1. **Investigação Profunda**
   - Executar SQL queries para validar estado do banco
   - Verificar se há agendamentos com room_id/payer_id NULL
   - Checar se appointment_services tem orphans

2. **Testes Específicos**
   - Criar agendamento → Verificar se room_id persiste
   - Editar agendamento → Verificar se payer_id retorna
   - Múltiplos serviços → Validar sincronização

3. **Documentação**
   - Mapear todas as views/RPCs que foram criadas
   - Documentar padrão de nomeação (camelCase vs snake_case)
   - Criar guia de manutenção

4. **Melhorias**
   - Unificar estado React (agendamentos vs appointments)
   - Implementar transações para múltiplos serviços
   - Adicionar retry logic para operações críticas

---

## 📚 ARQUIVOS MODIFICADOS / RELEVANTES

| Arquivo | Status | Prioridade |
|---------|--------|-----------|
| src/lib/appointmentsApi.js | ⚠️ Crítico | 🔴 ALTA |
| src/modules/agenda/services/agendaMapper.js | ⚠️ Crítico | 🔴 ALTA |
| src/pages/clinica/agenda/views/AgendaUnificada.jsx | ⚠️ Crítico | 🔴 ALTA |
| src/hooks/useAgendaLive.js | ⚠️ Risco | 🟡 MÉDIA |
| src/pages/clinica/agenda/components/AgendamentoEditarModal.jsx | ⚠️ Risco | 🟡 MÉDIA |
| src/pages/clinica/agenda/views/NovoAgendamento.jsx | ✅ OK | 🟢 BAIXA |

---

## 🔒 SEGURANÇA

### RLS Policies
- ✅ SELECT: `USING (true)` - Permite todas as clínicas ler
- ⚠️ **RISCO:** Deveria ser `USING (clinic_id = auth.uid()::uuid)` por clínica
- ✅ INSERT/UPDATE: `WITH CHECK (clinic_id IS NOT NULL)`
- ✅ DELETE: `USING (clinic_id IS NOT NULL)`

### Validação
- ⚠️ Sem rate limiting em criação de agendamentos
- ⚠️ Sem validação de CPF duplicado
- ⚠️ Sem auditoria de quem criou/editou cada agendamento

---

**Documento Gerado:** 2026-05-06
**Versão:** 1.0 - Auditoria Completa
**Responsável:** Análise Automatizada do Sistema Gesclinic
