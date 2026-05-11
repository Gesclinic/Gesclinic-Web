# 📋 RESUMO EXECUTIVO - AUDITORIA AGENDA

**Data:** 2026-05-06
**Responsável:** Análise Automatizada do Sistema
**Status:** Auditoria Completa Finalizada
**Risco Geral:** 🔴 MÉDIO-ALTO (estável mas com riscos)

---

## ⚡ SITUAÇÃO ATUAL

### ✅ O que funciona
1. **CRUD Básico** - Create, Read, Update, Delete funcionam
2. **Múltiplos Serviços** - Implementado (mas sem atomicidade)
3. **Realtime Updates** - Hook escuta mudanças
4. **Performance** - Otimizado (< 100ms para updates locais)
5. **Campos Mapeados** - CamelCase vs snake_case sincronizados

### ⚠️ O que tem risco
1. **Room_id e Payer_id** - Podem não persistir em UPDATE
2. **Timezone** - Conversão sem timezone explícito
3. **Validação** - Sem check de overlap, sem service_prices
4. **Atomicidade** - Múltiplos serviços sem transação
5. **Realtime** - Sem deduplicação de eventos

### 🔴 O que é crítico
1. **RLS SELECT após UPDATE** - Pode bloquear retorno de dados
2. **Rollback** - Optimistic updates sem rollback em falha
3. **Campos NULL** - Sem validação de integridade referencial
4. **Orphans** - Sem cascading delete consistente

---

## 📊 DIAGNÓSTICO POR ÁREA

| Área | Saúde | Risco | Prioridade |
|------|-------|-------|-----------|
| Mapeamento Campos | 🟢 OK | Baixo | 🟢 |
| CRUD Base | 🟢 OK | Baixo | 🟢 |
| Persistência (room/payer) | 🟡 RISCO | Médio | 🔴 |
| Timezone | 🟡 RISCO | Médio | 🟡 |
| Validação | 🔴 CRÍTICO | Alto | 🔴 |
| Realtime | 🟡 RISCO | Médio | 🟡 |
| Múltiplos Serviços | 🟡 RISCO | Médio | 🔴 |
| Rollback/Sync | 🔴 CRÍTICO | Alto | 🔴 |
| RLS Policies | 🟡 RISCO | Médio | 🟡 |
| Performance | 🟢 OK | Baixo | 🟢 |

---

## 🎯 RECOMENDAÇÕES POR PRIORIDADE

### FASE 1: VALIDAÇÃO (SEM QUEBRAS) - 1-2 dias
**Objetivo:** Identificar bugs sem corrigir

#### 1.1 Executar SQL Queries
```
Tempo: 2-4 horas
Risco: Nenhum (read-only)

- Contar registros orphans (appointment_services, ar_receivables)
- Verificar room_id e payer_id NULL
- Validar relacionamentos (FK integrity)
- Verificar status distribution
- Checar índices de performance
```

**Arquivo referência:** `📊_QUERIES_SQL_VALIDACAO_AGENDA.md`

#### 1.2 Executar Testes Manuais
```
Tempo: 4-6 horas
Risco: Nenhum (testes não modificam dados)

- Testar criação com room_id/payer_id
- Testar UPDATE e verificar se persiste
- Testar timezone (criar em diferentes horários)
- Testar realtime (2 abas simultâneas)
- Testar múltiplos serviços
```

**Arquivo referência:** `🧪_PLANO_TESTES_AGENDA_DETALHADO.md`

#### 1.3 Adicionar Logs de Debug
```
Tempo: 1-2 horas
Risco: Nenhum (apenas logs)

- Adicionar console.log em mapToDatabase()
- Adicionar console.log em mapFromDatabase()
- Adicionar logs em updateAppointment() (sucesso/RLS block)
- Adicionar logs de deduplicação em useAgendaLive.js
```

**Resultado:** Documento com achados específicos

---

### FASE 2: CORREÇÕES CRÍTICAS (COM RISCO) - 2-3 dias

#### 2.1 Validação de Overlaps 🔴 CRÍTICO
```javascript
// Arquivo: src/lib/appointmentsApi.js
// Adicionar ANTES de createAppointment()

export async function checkAndCreateAppointment(payload) {
  // ✅ Validar overlap ANTES de criar
  const hasOverlap = await hasOverlapAppointments({
    appointionalId: null, // Nova criação
    professionalId: payload.professionalId,
    startTime: payload.startTime,
    endTime: payload.endTime,
  });
  
  if (hasOverlap) {
    throw new Error('Horário indisponível - overlap com outro agendamento');
  }
  
  return createAppointment(payload);
}
```

**Impacto:** Previne double-booking
**Teste:** Tentar criar overlap → Deve rejeitar

#### 2.2 Validação de Service × Payer 🔴 CRÍTICO
```javascript
// Arquivo: src/lib/appointmentsApi.js
// Adicionar ANTES de createAppointment()

export async function validateServiceAvailability(serviceId, payerId, clinicId) {
  const { available, price } = await validateServicePayerAvailability(
    serviceId, payerId, clinicId
  );
  
  if (!available) {
    throw new Error(`Serviço não disponível para este convênio`);
  }
  
  return { available: true, price };
}
```

**Impacto:** Previne faturamento inválido
**Teste:** Tentar criar com serviço não disponível → Deve rejeitar

#### 2.3 Rollback em UPDATE Failure 🔴 CRÍTICO
```javascript
// Arquivo: src/pages/clinica/agenda/views/AgendaUnificada.jsx
// Pattern para todos os handlers de UPDATE

const handleUpdateAppointment = async (id, newData) => {
  const backup = agendamentos.find(a => a.id === id);
  
  try {
    // Otimistic update na UI
    setAgendamentos(prev => prev.map(a => 
      a.id === id ? { ...a, ...newData } : a
    ));
    
    // Tentar salvar no servidor
    const result = await updateAppointment(id, newData);
    
    // ✅ Sucesso confirmado
    setAgendamentos(prev => prev.map(a => 
      a.id === id ? mapFromDatabase(result) : a
    ));
  } catch (error) {
    // ❌ Rollback em caso de falha
    setAgendamentos(prev => prev.map(a => 
      a.id === id ? backup : a
    ));
    throw error;
  }
};
```

**Impacto:** Evita UI com dados incorretos
**Teste:** Desconectar network, tentar update, reconectar

#### 2.4 Cascading Delete Consistente 🔴 CRÍTICO
```javascript
// Arquivo: src/lib/appointmentsApi.js
// Na função deleteAppointment(), garantir ordem correta

export async function deleteAppointment(id) {
  try {
    // Ordem importantíssima:
    // 1. Deletar ar_receivables (depende de appointment_id)
    await supabase.from('ar_receivables').delete().eq('appointment_id', id);
    
    // 2. Deletar appointment_services (depende de appointment_id)
    await supabase.from('appointment_services').delete().eq('appointment_id', id);
    
    // 3. Deletar appointments (agora sem dependências)
    await supabase.from('appointments').delete().eq('id', id);
    
    // ✅ Tudo deletado atomicamente
  } catch (error) {
    console.error('Erro no cascading delete:', error);
    throw error;
  }
}
```

**Impacto:** Evita orphaned records
**Teste:** Deletar agendamento com serviços → Verificar se tudo foi deletado

#### 2.5 RLS SELECT After UPDATE 🟡 MÉDIO
```sql
-- Verificar se RLS está bloqueando SELECT após UPDATE
-- Se sim, adicionar permissão extra

-- TESTE PRIMEIRO:
UPDATE appointments SET status = 'confirmed' WHERE id = '...'
RETURNING *; -- Se retorna vazio = RLS está bloqueando

-- FIX (se necessário):
ALTER POLICY "appointments_select_all" ON appointments
USING (true);  -- Permitir SELECT para todos
```

**Impacto:** Dados retornam corretamente após UPDATE
**Teste:** Editar agendamento e verificar se room_id volta

---

### FASE 3: MELHORIAS (SEM URGÊNCIA) - 3-5 dias

#### 3.1 Deduplicação Realtime
```javascript
// Arquivo: src/hooks/useAgendaLive.js

const processedIds = new Set();
const DEDUP_TIMEOUT = 5000; // 5 segundos

const channel = supabase
  .channel('agenda-events')
  .on('postgres_changes', {...}, (payload) => {
    const id = payload.new?.id || payload.old?.id;
    
    // Verificar se já foi processado recentemente
    if (!processedIds.has(id)) {
      onChange(payload);
      
      processedIds.add(id);
      setTimeout(() => processedIds.delete(id), DEDUP_TIMEOUT);
    }
  });
```

**Impacto:** Evita duplicação de eventos
**Teste:** Criar agendamento em 2 abas → Deve aparecer 1x

#### 3.2 Timezone Explícito
```javascript
// Arquivo: src/lib/appointmentsApi.js

import { formatInTimeZone, zonedTimeToUtc } from 'date-fns-tz';

const CLINIC_TIMEZONE = 'America/Sao_Paulo'; // Configurável

function normalizeTime(timeStr, dateStr, timezone = CLINIC_TIMEZONE) {
  const dt = new Date(`${dateStr}T${timeStr}`);
  const utc = zonedTimeToUtc(dt, timezone);
  return formatInTimeZone(utc, timezone, 'HH:mm:ss');
}
```

**Impacto:** Sem problemas de timezone
**Teste:** Criar em diferentes timezones → Deve ter mesmo horário

#### 3.3 Atomicidade com Transações
```javascript
// Usar RPC para operações multi-tabela

export async function createAppointmentAtomically(payload, services) {
  const { data, error } = await supabase.rpc(
    'create_appointment_with_services', 
    {
      p_appointment_data: payload,
      p_services: services,
    }
  );
  
  if (error) throw error;
  return data;
}
```

**Impacto:** Múltiplos serviços sempre sincronizados
**Teste:** Criar com 3 serviços → Falhar artificialmente → Tudo rolback

#### 3.4 Unificar Estado React
```javascript
// Consolidar agendamentos + appointments em um único useState

// ❌ ANTES (2 sources de verdade):
const [agendamentos, setAgendamentos] = useState([]);
const [appointments, setAppointments] = useState([]);

// ✅ DEPOIS (1 source of truth):
const [agendamentos, setAgendamentos] = useState([]);
const appointments = agendamentos; // Alias
```

**Impacto:** Menos bugs de sync
**Teste:** Editar → Verificar ambas as vars

---

## 📈 TIMELINE RECOMENDADA

```
Semana 1:
├─ Seg-Ter: FASE 1 - Validação (SQL + Testes)
├─ Qua-Qui: FASE 2 - Correções Críticas (Validação + Rollback)
└─ Sex: Review + Testes de Regressão

Semana 2:
├─ Seg-Ter: FASE 2 - Cascading Delete + RLS
├─ Qua-Qui: FASE 3 - Deduplicação + Timezone
└─ Sex: Testes Completos

Semana 3:
├─ Seg-Ter: FASE 3 - Atomicidade + Unificar Estado
├─ Qua: Performance Testing
├─ Qui: Documentação
└─ Sex: Deploy + Monitoring
```

---

## 🔒 SEGURANÇA - PONTOS DE ATENÇÃO

### RLS Policies
- [ ] Verificar se SELECT permite leitura de dados de outras clínicas
- [ ] Garantir que INSERT valida clinic_id
- [ ] Validar que UPDATE não muda clinic_id
- [ ] Testar DELETE sem permissões

### Validações
- [ ] Sem rate limiting (possível spam de criação)
- [ ] Sem auditoria de WHO criou/editou
- [ ] Sem CPF duplicado

---

## 📞 PRÓXIMAS AÇÕES

### Para o Time
1. **Imediato:** Executar SQL queries para diagnóstico
2. **Hoje:** Documentar achados com dados reais
3. **Semana:** Priorizar correções críticas

### Riscos a Monitorar
- ⚠️ Room_id não persistindo em UPDATE
- ⚠️ Payer_id não persistindo em UPDATE
- ⚠️ RLS bloqueando SELECT após UPDATE
- ⚠️ Overlaps de horários

### Antes do Próximo Release
- [ ] Validação de overlaps ativada
- [ ] Validação de service × payer ativada
- [ ] Rollback em UPDATE failures
- [ ] Cascading delete testado

---

## 📚 DOCUMENTOS CRIADOS

| Documento | Propósito | Tamanho |
|-----------|-----------|--------|
| 🎯_AUDITORIA_AGENDA_COMPLETA_2026_05_06.md | Análise detalhada de todos os 10 problemas | ~600 linhas |
| 🧪_PLANO_TESTES_AGENDA_DETALHADO.md | Testes manuais específicos para cada área | ~400 linhas |
| 📊_QUERIES_SQL_VALIDACAO_AGENDA.md | SQL para validar estado do banco | ~300 linhas |
| 📋_RESUMO_EXECUTIVO_AUDITORIA_AGENDA.md | Este documento | ~250 linhas |

---

## ✅ CONCLUSÃO

**Status:** Sistema funcionando mas com riscos médios-altos

**Recomendação:** 
1. ✅ Continuar usando agenda atual
2. ⚠️ Implementar correções críticas (validação, rollback, cascading)
3. 🔴 **NÃO fazer lançamento premium até corrigir atomicidade**

**Próximo Passo:** Executar FASE 1 (Validação) para dados concretos

---

**Auditoria Finalizada:** 2026-05-06 08:00
**Próxima Review:** 2026-05-13 (após correções)
**Responsável:** Sistema de Análise Gesclinic
