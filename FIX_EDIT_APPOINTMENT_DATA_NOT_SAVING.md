# 🔧 FIX: Agendamento Não Salva ao Editar (Data, Hora, etc)

## Problema
Quando você clica para editar um agendamento e muda campos como data, hora, sala, etc., o modal abre, você consegue fazer as alterações, mas ao clicar em "Salvar" ou "Atualizar", a data não é salva no banco de dados.

## Causas Possíveis

### 1️⃣ **Erro de RLS (Row Level Security) silencioso**
O Supabase está rejeitando o UPDATE porque a política de segurança está bloqueando.

### 2️⃣ **Erro de autenticação**
O usuário não tem permissão para atualizar agendamentos da clínica.

### 3️⃣ **Erro na tabela `users`**
A política RLS está procurando `clinic_id` na tabela `users`, mas pode estar em `profiles` ou `clinic_users`.

---

## ✅ Como Diagnosticar

### Passo 1: Abrir Console do Navegador
1. Pressione **F12** no navegador
2. Vá para a aba **Console**
3. Limpe os logs existentes (`Ctrl+L`)

### Passo 2: Reproduzir o Problema
1. Vá até Agenda
2. Clique em um agendamento existente
3. Clique no botão **Editar** ou na linha do agendamento
4. Change a **Data** para outro dia
5. Clique em **"Atualizar"**

### Passo 3: Procurar pelos Logs
Procure por mensagens começando com:
- ✏️ `[Modal] Atualizando agendamento:`
- ❌ `[Modal] Erro ao atualizar agendamento:`
- 🔴 `[Modal] ERRO ao processar agendamento:`

### Exemplo de Erro RLS (PGRST301):
```
❌ [Modal] Erro ao atualizar agendamento: {
  code: "PGRST301",
  message: "row level security violation",
  ...
}
```

---

## 🔧 Solução 1: Verificar/Corrigir Política RLS (Supabase)

Se você vê `PGRST301` ou "row level security", execute este SQL no Supabase:

**Acesse:** https://app.supabase.com/project/seu-projeto/sql/new

```sql
-- 1️⃣ REMOVER POLÍTICAS ANTIGAS
DROP POLICY IF EXISTS "Users can update appointments from their clinic" ON appointments;
DROP POLICY IF EXISTS "Users can view appointments from their clinic" ON appointments;
DROP POLICY IF EXISTS "Users can insert appointments in their clinic" ON appointments;

-- 2️⃣ HABILITAR RLS
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- 3️⃣ RECRIAR POLÍTICA CORRETA PARA UPDATE
CREATE POLICY "Users can update appointments in their clinic"
ON appointments FOR UPDATE
USING (
  clinic_id IN (
    SELECT clinic_id FROM users WHERE id = auth.uid()
  )
)
WITH CHECK (
  clinic_id IN (
    SELECT clinic_id FROM users WHERE id = auth.uid()
  )
);

-- 4️⃣ SE A ACIMA NÃO FUNCIONAR, USE ESTA (usando profiles):
-- DROP POLICY IF EXISTS "Users can update appointments in their clinic" ON appointments;
-- CREATE POLICY "Users can update appointments in their clinic"
-- ON appointments FOR UPDATE
-- USING (
--   clinic_id IN (
--     SELECT clinic_id FROM profiles WHERE user_id = auth.uid()
--   )
-- )
-- WITH CHECK (
--   clinic_id IN (
--     SELECT clinic_id FROM profiles WHERE user_id = auth.uid()
--   )
-- );

-- 5️⃣ VERIFICAR POLÍTICAS
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'appointments'
ORDER BY tablename, policyname;
```

---

## 🔧 Solução 2: Verificar se a Tabela `users` tem `clinic_id`

Rode no Supabase SQL Editor:

```sql
-- Verificar colunas da tabela users
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Se NÃO tem clinic_id, procurar em profiles
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;
```

**Se `clinic_id` está em `profiles`, não em `users`:**
Use a solução acima (comentada) com `SELECT clinic_id FROM profiles WHERE user_id = auth.uid()`

---

## 🔧 Solução 3: Verificar Permissões do Usuário

Rode no Supabase (substitua `seu-user-id`):

```sql
-- Ver qual clínica o usuário pertence
SELECT * FROM users WHERE id = 'seu-user-id-aqui';

-- Ou em profiles:
SELECT * FROM profiles WHERE user_id = 'seu-user-id-aqui';

-- Ou em clinic_users:
SELECT * FROM clinic_users WHERE user_id = 'seu-user-id-aqui';
```

---

## 📋 Checklist de Testes

Depois de aplicar a solução:

- [ ] **F12 → Console** - Procurar por erros vermelhos
- [ ] **Editar agendamento** - Mudar data
- [ ] **Clicar "Atualizar"** - Deve aparecer `✅ [Modal] Agendamento salvo com sucesso`
- [ ] **Recarregar página** `F5` - Data deve estar atualizada
- [ ] **Agenda visualmente** - Agendamento deve ter mudado de dia se for outro dia

---

## 🚀 Se Ainda Não Funcionar

1. **Abrir DevTools (F12)**
2. **Aba Console** → Procurar por erro vermelho
3. **Copiar toda mensagem de erro**
4. **Enviar screenshot ou mensagem de erro completa para debug**

---

## 📝 Logs Esperados (quando funciona)

```
✏️ [Modal] Atualizando agendamento: abc-123-def
✏️ [Modal] Novos dados: {
  scheduledDate: "2026-02-28",
  scheduledTime: "14:30",
  departureTime: "15:00",
  ...
}
✅ [Modal] Agendamento atualizado com sucesso!
   Resultado: {...atualizado com sucesso...}
✅ [Modal] Agendamento salvo com sucesso
🔍 [Modal] Dados para callback: {
  date: "2026-02-28",
  originalDate: "2026-02-27",
  time: "14:30:00",
  appointmentId: "abc-123-def"
}
```

---

## ⚡ Alternativa Rápida (Desabilitar RLS)

Se nenhuma solução funcionar e você está em desenvolvimento/teste:

```sql
-- ⚠️ ⚠️ ⚠️ APENAS EM DESENVOLVIMENTO ⚠️ ⚠️ ⚠️
ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;
```

After ao confirmar que funciona, reabilite:
```sql
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
```

---

**Última atualização:** 3 de Março de 2026  
**Versão:** 1.0
