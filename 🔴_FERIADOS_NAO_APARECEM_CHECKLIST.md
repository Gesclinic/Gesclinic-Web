# 🔴 FERIADOS NÃO APARECEM? - CHECKLIST DE DEBUG

Se os feriados não estão aparecendo na agenda, siga este checklist:

## ✅ Passo 1: Executar Migrations (1 vez - setup inicial)

### 1.1 Abrir Supabase
- Vá para: https://app.supabase.com
- Selecione seu projeto

### 1.2 Executar Migration
- Clique em **SQL Editor**
- Cole: `supabase/migrations/20260206_holidays_system.sql`
- Clique **Run**
- ✅ Verá mensagem: "Queries executed successfully"

**Resultado esperado:** Tabelas `holidays` e `agenda_day_override` criadas + funções RPC

---

## ✅ Passo 2: Descobrir seu CLINIC_ID

Execute este comando no SQL Editor:

```sql
SELECT id, name FROM public.clinics LIMIT 1;
```

**Copie o `id`** - você precisa dele agora

Exemplo: `550e8400-e29b-41d4-a716-446655440000`

---

## ✅ Passo 3: Popular Feriados

### 3.1 Abrir arquivo de seed
- Arquivo: `supabase/seeds/seed_holidays_2026.sql`

### 3.2 Substituir clinic-id
**Buscar e substituir:**
- Buscar: `'seu-clinic-id'`
- Substituir por: `'550e8400-e29b-41d4-a716-446655440000'` (seu ID)

Exemplo final:
```sql
INSERT INTO public.holidays (date, name, scope, is_blocked, clinic_id)
VALUES
  ('2026-01-01', 'Confraternização Universal', 'NACIONAL', true, '550e8400-e29b-41d4-a716-446655440000'),
  ...
```

### 3.3 Executar no Supabase
- Todo o conteúdo modificado → SQL Editor
- Clique **Run**
- ✅ Verá: "Rows inserted: 12"

---

## ✅ Passo 4: Testar na Agenda

### 4.1 Recarregar página
- Acesse: `localhost:3000/clinica/agenda`
- Pressione `F5` (hard refresh)
- Se em produção: limpe cache (Ctrl+Shift+Delete)

### 4.2 Procurar por 01/01/2026
- Clique em **Semana**
- Navegue até 01/01/2026
- ✅ Deverá aparecer:
  - Header: `🎉 FERIADO` + `Confraternização Universal`
  - Grid: Cinza com 🔒
  - Barra superior: `🔒 Agenda bloqueada em feriados` + botão `[🔓 Abrir]`

---

## 🔍 Debugging: Se Ainda Não Aparecer

### Abra DevTools (F12)
- Console aba
- Procure por logs:

**Verde ✅** (o que você quer ver):
```
🔍 AgendaWeekView props: {...}
📍 Carregando feriados para: {...}
✅ Feriados carregados: {2026-01-01: {...}}
```

**Vermelho ❌** (erros):
```
⚠️ AgendaWeekView: clinicId não configurado
❌ Erro ao carregar feriados
```

---

### Se ver: "clinicId não configurado"

**Solução:** Contexto não está inicializado. Verifique:

```javascript
// No arquivo: src/pages/clinica/agenda/views/AgendaWeekView.jsx
// Linha ~80
const activeClinicId = clinicId || clinic?.id;
console.log('activeClinicId:', activeClinicId);  // ← Adicione este log
```

---

### Se ver: "Erro ao carregar feriados"

1. Verificar se tabela existe:
```sql
SELECT COUNT(*) FROM public.holidays;
```

2. Verificar se há dados:
```sql
SELECT * FROM public.holidays WHERE clinic_id = 'seu-clinic-id';
```

3. Verificar se função RPC existe:
```sql
SELECT routine_name FROM information_schema.routines 
WHERE routine_name LIKE '%holiday%';
```

---

## 📝 Checklist Final

- [ ] Executei migration SQL (`20260206_holidays_system.sql`)
- [ ] Descobri meu clinic_id
- [ ] Substitui 'seu-clinic-id' no seed
- [ ] Executei seed COM o clinic_id correto
- [ ] SQL retornou "Rows inserted: 12"
- [ ] Recarteguei página (F5)
- [ ] Naveguei para 01/01/2026
- [ ] Vi "🎉 FERIADO" no cabeçalho
- [ ] Vi grid cinza com 🔒

---

## 🎯 Resultado Final

Quando tudo estiver certo, deverá ver na semana de 01/01/2026:

```
┌─────────────────────────────────────────────────────┐
│ 🔒 Agenda bloqueada em feriados      [🔓 Abrir]    │
├─────────────────────────────────────────────────────┤
│
│    SEG     TER     QUA     THU     SEX     SAB     DOM
│    29      30      31      01      02      03      04
│                            🔒                         
│                        🎉 FERIADO
│                        Confraternização Universal    
│
│    Grid de horários marrom/cinza com 🔒 overlay
│    (indicando bloqueio em feriado)
```

---

## 🆘 Ainda não funciona?

### Envie screenshot de:
1. DevTools Console (com logs)
2. Resultado do SQL:
   ```sql
   SELECT * FROM holidays LIMIT 5;
   ```
3. O clinic_id que está usando

---

**Status:** ✅ Sistema pronto  
**Próxima ação:** Execute passo 1 agora
