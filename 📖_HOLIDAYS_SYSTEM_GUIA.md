# 🎉 Sistema de Feriados - Agenda Bloqueada

**Arquitetura:** 3 camadas (Dados → Lógica → Controle)

## ✅ O que foi implementado

### 1️⃣ **Banco de Dados (Supabase)**
- Tabela `holidays` - Feriados nacionais, estaduais e municipais
- Tabela `agenda_day_override` - Controle manual de overrides
- Funções RPC para verificar bloqueios e gerenciar overrides
- RLS policies para segurança por clínica

**Arquivo:** `supabase/migrations/20260206_holidays_system.sql`

### 2️⃣ **API (lib/holidaysApi.js)**
Funções disponíveis:

```javascript
// Consultasquery
isHolidayBlocked(date, clinicId, { state?, city? })        // true se feriado bloqueado
getHolidayDetails(date, clinicId, options)                  // Detalhes do feriado
checkMultipleDates(dates[], clinicId)                       // Múltiplas datas (semana/mês)
listHolidaysInRange(startDate, endDate, clinicId)          // Lista período

// Mutações
openHolidayManual(date, clinicId, userId, notes)           // Abrir feriado bloqueado
closeHolidayOverride(date, clinicId)                        // Fechar override
createHoliday(holiday)                                      // Criar feriado
updateHoliday(id, updates)                                  // Atualizar
deleteHoliday(id)                                           // Deletar
seedNationalHolidays(year, clinicId)                        // Popular feriados BR
```

### 3️⃣ **Frontend (AgendaWeekView.jsx)**
- Visual claro no header (🎉 FERIADO, 🔒 bloqueado, ⚠️ com override)
- Grid bloqueado visualmente para feriados (overlay cinza + 🔒)
- Botão de abertura manual (apenas admin/gestor)
- Cores contextuais:
  - 🔴 Vermelho = Feriado bloqueado
  - 🟡 Amarelo = Feriado com override aberto
  - 🔵 Azul = Normal

## 🚀 Como começar

### 1. Preparar SQL (Supabase Studio)

1. Abra Supabase → SQL Editor
2. Cole o conteúdo de `supabase/migrations/20260206_holidays_system.sql`
3. Execute tudo

✅ Tabelas, índices, funções RPC e RLS criadas

### 2. Popular Feriados Nacionais (1 time)

**Option A:** Pelo Frontend (quando tiver UI de admin)
```javascript
import { seedNationalHolidays } from '@/lib/holidaysApi';

await seedNationalHolidays(2026, clinicId);
```

**Option B:** SQL direto (teste rápido)
```sql
INSERT INTO holidays (date, name, scope, is_blocked, clinic_id)
VALUES
  ('2026-01-01', 'Confraternização Universal', 'NACIONAL', true, 'seu-clinic-id'),
  ('2026-02-13', 'Carnaval', 'NACIONAL', true, 'seu-clinic-id'),
  ('2026-04-21', 'Tiradentes', 'NACIONAL', true, 'seu-clinic-id'),
  ('2026-05-01', 'Dia do Trabalho', 'NACIONAL', true, 'seu-clinic-id'),
  ('2026-09-07', 'Independência do Brasil', 'NACIONAL', true, 'seu-clinic-id'),
  ('2026-10-12', 'Nossa Senhora Aparecida', 'NACIONAL', true, 'seu-clinic-id'),
  ('2026-11-02', 'Finados', 'NACIONAL', true, 'seu-clinic-id'),
  ('2026-11-20', 'Consciência Negra', 'NACIONAL', true, 'seu-clinic-id'),
  ('2026-12-25', 'Natal', 'NACIONAL', true, 'seu-clinic-id');
```

### 3. Fluxo de Uso

#### 👤 Recepcionista/Profissional
- ✅ Vê feriado no header (🎉 FERIADO)
- ✅ Grid bloqueado (cinza + 🔒)
- ❌ NÃO pode fazer nada
- ℹ️ Deve avisar gestor se precisar abrir

#### 👨‍💼 Gestor/Admin
- ✅ Vê feriado no header
- ✅ Vê botão **"🔓 Abrir Agenda"**
- ✅ Clica para fazer override
- ✅ Torna-se amarelo (⚠️)
- ✅ Pode lançar atendimentos agora
- 📊 Auditoria: registra quem abriu e quando

## 🔧 Configuração Avançada

### Adicionar Feriado Estadual/Municipal

```javascript
import { createHoliday } from '@/lib/holidaysApi';

// Feriado estadual
await createHoliday({
  date: '2026-09-07',
  name: 'Zumbi dos Palmares',
  scope: 'ESTADUAL',
  state: 'AL',  // Alagoas
  is_blocked: true,
  clinic_id: clinicId
});

// Feriado municipal
await createHoliday({
  date: '2026-06-29',
  name: 'São Pedro',
  scope: 'MUNICIPAL',
  state: 'RJ',
  city: 'Rio de Janeiro',
  is_blocked: true,
  clinic_id: clinicId
});
```

### Desabilitar Bloqueio (apenas aviso)

```javascript
await updateHoliday(holidayId, { is_blocked: false });
```

Agora o feriado aparece no header mas o grid continua funcional.

## 📋 Regras de Negócio

| Cenário | Comportamento |
|---------|---------------|
| Feriado bloqueado, sem override | ❌ Grid bloqueado, botão disponível para admin |
| Feriado bloqueado, com override | ✅ Grid funcional, visual amarelo |
| Feriado não-bloqueante | ℹ️ Apenas informativo (aparece no header) |
| Dia normal | ✅ Grid 100% funcional |

## 🔒 Permissões (RLS)

- **Todos (read):** Visualizar feriados
- **Admin/Gestor (write):** Criar, editar, deletar feriados e overrides
- **Auditoria:** Campo `opened_by` + `opened_at` rastreia quem abriu

## 📱 Visual Reference

### Header com Feriado Bloqueado
```
┌─────────────────────────┐
│ 🔒 Agenda bloqueada em feriados  [🔓 Abrir Agenda] │
├─────────────────────────┤
```

### Header do Dia (Bloqueado)
```
┌───────────────────┐
│ 🔒               │ ← Badge emoji
│ 🎉 FERIADO        │ ← Texto colorido
│ 25                │ ← Data
│ Natal             │ ← Nome do feriado
└───────────────────┘
(Fundo vermelho claro - bg-red-50)
```

### Grid com Bloqueio
```
┌──────────────────┐
│  🔒             │ ← Overlay cinza + ícone
│  (célula inativa)│
└──────────────────┘
```

### Grid com Override
```
┌──────────────────┐
│  (borda amarela) │ ← Border + fundo amarelo claro
│  (célula ativa)  │ ← Funciona normalmente
└──────────────────┘
```

## ❓ FAQ

**P: Se abrir a agenda em um feriado, posso agora agendar?**  
R: Sim! Após override, todos os horários funcionam normalmente. O Visual muda para amarelo (aviso).

**P: Quando o override expira?**  
R: Nunca! É permanente até alguém deletar do `agenda_day_override`.

**P: Posso ter múltiplos feriados no mesmo dia?**  
R: Não, há `UNIQUE INDEX` (date, scope, state, city).

**P: Financeiro/Faturamento é afetado?**  
R: Não! Bloqueio é apenas visual na agenda (lógica de agendamento).

**P: Como resetar um override?**  
R: Via SQL ou função:
```javascript
await closeHolidayOverride(date, clinicId);
```

## 🎯 Próximos Passos

1. ✅ Executar migrations SQL
2. ✅ Testar na semana (visualizar feriados)
3. 📝 Criar UI de admin para gerenciar feriados
4. 📊 Adicionar relatório de aberturas manuais
5. 🔔 Notificar quando agenda é aberta em feriado

## 📚 Arquivos Criados/Modificados

```
✅ supabase/migrations/20260206_holidays_system.sql
   └─ Tabelas + RPC + RLS

✅ src/lib/holidaysApi.js
   └─ API cliente para feriados

✅ src/pages/clinica/agenda/views/AgendaWeekView.jsx
   └─ Integração visual + controle

✅ src/pages/clinica/agenda/components/index.jsx
   └─ Props clinicId adicionada
```

---

**Status:** ✅ Implementação Completa  
**Sistema:** Pronto para produção (teste antes)  
**Padrão:** Alinhado com MV, Amplimed, iClinic
