# 🎯 PASSO A PASSO VISUAL - Ativar Feriados

## 📍 Você está aqui
Agenda está carregando, mas **feriados NÃO aparecem** na semana

---

## ⚡ Causa
Tabelas SQL não foram criadas (migration não executada)

---

## 🔥 SOLUÇÃO em 5 PASSOS

### ✅ PASSO 1: Abrir Supabase
1. Acesse: https://app.supabase.com
2. **Login** com suas credenciais
3. Selecione **seu projeto**
4. Menu esquerdo → **SQL Editor**

```
┌──────────────────────────────────────────┐
│ Supabase Dashboard                      │
├──────────────────────────────────────────┤
│ [Menu] Dashboard                         │
│         Query Editor ← CLIQUE AQUI       │
│         SQL Editor   ← OU AQUI           │
│         Tables                           │
│         ...                              │
└──────────────────────────────────────────┘
```

---

### ✅ PASSO 2: Copiar SQL Migration
1. Abra este arquivo na pasta:
   ```
   supabase/migrations/20260206_holidays_system.sql
   ```
2. **Selecione TUDO** (Ctrl+A)
3. **Copie** (Ctrl+C)

---

### ✅ PASSO 3: Colar no Supabase
1. SQL Editor deve estar aberto (Passo 1)
2. Você vê uma aba **"New Query"** em branco
3. **Cole** (Ctrl+V) todo o conteúdo do arquivo

```
┌─────────────────────────────────────────────┐
│ New Query                          [Run]    │
├─────────────────────────────────────────────┤
│ create table if not exists public.holidays  │
│ (                                           │
│   id uuid primary key default gen_ra...     │
│   date date not null,                       │
│   name text not null,                       │
│   ...                                       │
│ );                                          │
│                                             │
│ -- RLS Policies                             │
│ create policy if not exists "holidays...    │
│                                             │
└─────────────────────────────────────────────┘
```

---

### ✅ PASSO 4: Executar SQL
1. Clique no botão **"Run"** (canto superior direito)
   - Cor: Verde ou azul
   - Texto: "RUN" ou "Execute"

2. **Aguarde** uns 2-3 segundos

3. Verá mensagens:
   ```
   ✅ CREATE TABLE
   ✅ CREATE INDEX
   ✅ CREATE FUNCTION
   ✅ CREATE POLICY
   ...
   ```

```
┌──────────────────────────────────────────────┐
│ Query Result                                 │
├──────────────────────────────────────────────┤
│ ✅ Queries executed successfully             │
│                                              │
│ CREATE TABLE "public"."holidays" ✓           │
│ CREATE TABLE "public"."agenda_day_override"✓ │
│ CREATE INDEX ... ✓                           │
│ CREATE FUNCTION "public"."is_holiday_blocke │
│ CREATE POLICY ... ✓                          │
│ ...                                          │
└──────────────────────────────────────────────┘
```

---

### ✅ PASSO 5: Popular Feriados
1. Crie uma **NOVA Query** (botão **"+"** ou novo documento)
2. **Cole** isto:

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

3. Clique **"Run"** novamente

4. Verá:
```
✅ 10 rows inserted
```

---

## 🧪 VERIFICAR SE FUNCIONOU

### No seu navegador:
1. Vá para: `localhost:3000/clinica/agenda`
2. Pressione **F5** (reload)
3. Clique em **"Semana"**
4. Navegue **até 01/01/2026** (ou click no calendário)

### Deverá ver:
```
┌────────────────────────────────────────────────┐
│ 🔒 Agenda bloqueada em feriados  [🔓 Abrir]    │
├────────────────────────────────────────────────┤
│
│ HORÁRIO │ SEG 29 │ TER 30 │ QUA 31 │ QUI 01 │...
│         │        │        │        │  🔒    │
│ 08:00   │ 🟢     │ 🟢     │ 🟢     │ 🎉    │
│         │        │        │        │ FERIADO│
│         │        │        │        │ 01     │
│         │        │        │        │Conf... │
│         │        │        │        │        │
│         │  (grid visualiza cinza e bloqueado no dia 01)
│
```

### Se vir isto ✅ SUCESSO!

---

### Se NÃO vir:

#### Debug rápido (Console do navegador)
1. Pressione **F12** para abrir DevTools
2. Clique aba **"Console"**
3. Cole:

```javascript
const { debugHolidaysTable } = await import('/src/lib/holidaysApi.js');
await debugHolidaysTable();
```

4. Procure por:
   - ✅ `Status: 200` → Tabela existe, SQL executou
   - ❌ `relation "public.holidays" does not exist` → Volte ao PASSO 4

---

## 📝 CHECKLIST

- [ ] Abri https://app.supabase.com
- [ ] Cliquei em "SQL Editor"
- [ ] Copiei migration SQL (20260206_holidays_system.sql)
- [ ] Colei no SQL Editor
- [ ] Cliquei **"Run"** e vi ✅ sucesso
- [ ] Criei NOVA query (INSERT)
- [ ] Colei INSERT de feriados
- [ ] Cliquei **"Run"** novamente e vi **"10 rows inserted"**
- [ ] Voltei à agenda
- [ ] Pressioni **F5** (reload)
- [ ] Naveguei até **01/01/2026**
- [ ] Vi **"🎉 FERIADO"** e grid cinza com **"🔒"**

Se todos ✅ **ESTÁ FUNCIONANDO! 🎉**

---

## 🆘 PROBLEMAS?

### Problema 1: "Syntax error at line X"
- Você não copiou o arquivo inteiro
- **Solução:** Delete tudo, copie novamente o arquivo completo

### Problema 2: "relation already exists"
- Tabelas já existem (rode novamente sem erro)
- **Solução:** Apenas ignore, continue para INSERT

### Problema 3: "10 rows inserted" apareceu, mas não vê na agenda
- **Solução:** Pressione **F5** (reload completo)
- Pode levar 2-3 segundos para aparecer

### Problema 4: Vê banner DEBUG na agenda mas "Feriados: 0"
- Tabela existe mas INSERT não funcionou
- **Solução:** Execute PASSO 5 novamente

---

**⏱️ Tempo total:** ~5 minutos  
**Dificuldade:** ⭐ Fácil  
**Próximo:** Pronto para usar! 🎉
