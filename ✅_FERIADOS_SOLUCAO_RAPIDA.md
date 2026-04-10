# ✅ SOLUÇÃO: Feriados Não Aparecem

## 🎯 Problema Root Cause
Você **NÃO executou a Migration SQL** que cria as tabelas de feriados.

---

## ⚡ SOLUÇÃO em 3 Minutos

### 1️⃣ Abrir Supabase (1 min)
```
https://app.supabase.com
├─ Login
├─ Selecione seu projeto
└─ Clique em "SQL Editor" (no menu esquerdo)
```

### 2️⃣ Cole SQL (1 min)
Copie **TUDO** deste arquivo:
```
supabase/migrations/20260206_holidays_system.sql
```

Cole na aba SQL Editor em branco

### 3️⃣ Execute (1 min)
Clique no botão verde: **"Run"**

Vão aparecer vários `CREATE TABLE`, `CREATE FUNCTION`, etc. ✅ Tudo OK.

---

## 🧪 Testar (1 min)

### No SQL Editor, cole isto:
```sql
SELECT COUNT(*) as total FROM public.holidays;
SELECT COUNT(*) as total FROM public.agenda_day_override;
```

Clique **Run**

**Esperado:**
```
total
─────
  0
  0
```
(Vazio é normal, ainda não inseriu dados)

---

## 🌱 Popular Feriados (1 min)

### Ainda no SQL Editor:
Cole TUDO isso:

```sql
INSERT INTO public.holidays (date, name, scope, is_blocked, clinic_id)
VALUES
  ('2026-01-01', 'Confraternização Universal', 'NACIONAL', true, 'national-seed'),
  ('2026-02-13', 'Carnaval', 'NACIONAL', true, 'national-seed'),
  ('2026-04-03', 'Sexta-feira Santa', 'NACIONAL', true, 'national-seed'),
  ('2026-04-21', 'Tiradentes', 'NACIONAL', true, 'national-seed'),
  ('2026-05-01', 'Dia do Trabalho', 'NACIONAL', true, 'national-seed'),
  ('2026-09-07', 'Independência do Brasil', 'NACIONAL', true, 'national-seed'),
  ('2026-10-12', 'Nossa Senhora Aparecida', 'NACIONAL', true, 'national-seed'),
  ('2026-11-02', 'Finados', 'NACIONAL', true, 'national-seed'),
  ('2026-11-20', 'Consciência Negra', 'NACIONAL', true, 'national-seed'),
  ('2026-12-25', 'Natal', 'NACIONAL', true, 'national-seed');
```

Clique **Run**

**Esperado:**
```
12 rows inserted
```

---

## ✅ Testar na Agenda (1 min)

### Ir para agenda
```
localhost:3000/clinica/agenda
```

### Pressione F5 (reload)

### Vá para a semana de 01/01/2026
- Método 1: Clique no calendário → 01/01/2026
- Método 2: Botão "Semana" → setas ← →

### ✅ Esperado ver:
```
┌─────────────────────────────────────────┐
│ 🔒 Agenda bloqueada em feriados         │
│                   [🔓 Abrir Agenda]    │
├─────────────────────────────────────────┤
│
│  QUINTA-FEIRA
│  🎉 FERIADO
│  01
│  Confraternização Universal
│
│  (Grid cinza com 🔒 overlay)
└─────────────────────────────────────────┘
```

---

## ❌ Se Ainda NÃO Funcionar

### Abra DevTools (F12) → Console

Copie e cole ISTO:

```javascript
const { debugHolidaysTable, getAllNationalHolidays } = await import('/src/lib/holidaysApi.js');
console.log('=== TESTE ===');
const result = await debugHolidaysTable();
console.log('Tabela existe?', !result.error);
const holidays = await getAllNationalHolidays(2026);
console.log('Feriados encontrados:', holidays.length);
```

**Se ver:**
- `Tabela existe? true`
- `Feriados encontrados: 10`

✅ Sistema está OK! Recarregue página (F5).

**Se ver:**
- Erro com `relation "public.holidays" does not exist`

❌ Você não executou a migration SQL. Volte para **Passo 1**.

---

## 🆘 Checklist Final

- [ ] Abri Supabase
- [ ] Cliquei em "SQL Editor"
- [ ] Colei migration SQL (20260206_holidays_system.sql)
- [ ] Cliquei "Run"
- [ ] Colei INSERT de feriados
- [ ] Cliquei "Run" novamente
- [ ] Recarreguei agenda (F5)
- [ ] Naveguei até 01/01/2026
- [ ] Vi "🎉 FERIADO" no cabeçalho
- [ ] Vi grid cinza com 🔒

Se todos checked ✅ está funcionando!

---

## ⚡ Se Quiser Testar Agora Mesmo

Abra DevTools (F12) → Console e rode:

```javascript
// Auto-test
(async () => {
  const { seedNationalHolidays, getAllNationalHolidays } = await import('/src/lib/holidaysApi.js');
  await seedNationalHolidays(2026, 'national-seed');
  const holidays = await getAllNationalHolidays(2026);
  console.log('✅ Feriados criados:', holidays.length);
})();
```

Depois F5 (reload).

---

**Status:** ⏳ Aguardando você executar os passos  
**Tempo Total:** ~5 minutos  
**Dificuldade:** ⭐ Muito Fácil
