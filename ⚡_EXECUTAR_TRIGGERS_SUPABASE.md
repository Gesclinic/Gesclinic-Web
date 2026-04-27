# 🔧 EXECUÇÃO: Aplicar Triggers de Auditoria no Supabase

## 🎯 O QUE FAZER

Você precisa executar o SQL arquivo no Supabase Dashboard para ativar os triggers de auditoria com `auth.uid()`.

---

## 📋 PASSO A PASSO

### PASSO 1: Abrir Supabase Dashboard

1. Acesse: https://supabase.com
2. Faça login com sua conta
3. Abra o projeto Gesclinic

---

### PASSO 2: Localizar SQL Editor

1. No painel esquerdo, clique em **SQL Editor**
2. Você verá uma área para digitar SQL

---

### PASSO 3: Copiar o SQL

1. Abra o arquivo: `⚡_TRIGGERS_AUDITORIA_AUTH_UID.sql`
2. Copie TODO o conteúdo (Ctrl+A, Ctrl+C)

---

### PASSO 4: Colar no SQL Editor

1. Clique na área de texto do SQL Editor
2. Cole o código (Ctrl+V)

---

### PASSO 5: Executar o SQL

1. Procure pelo botão **"Run"** ou **"Execute"** (geralmente azul/verde)
2. Clique para executar

---

### PASSO 6: Verificar Resultado

Você deve ver:

✅ Tabelas criadas/atualizadas  
✅ Índices criados  
✅ Triggers criados com sucesso  
✅ Policies criadas/atualizadas  

Se houver erro, verificar:
- ❌ Typo no SQL?
- ❌ Faltam permissões?
- ❌ Tabela appointments não existe?

---

## ✅ DEPOIS DE EXECUTAR

### Teste 1: Verificar Triggers

Execute no SQL Editor:

```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'appointments'
ORDER BY trigger_name;
```

✅ Deve mostrar 3 triggers:
- `appointment_audit_insert_trigger`
- `appointment_audit_update_trigger`
- `appointment_audit_delete_trigger`

---

### Teste 2: Verificar Policies

Execute no SQL Editor:

```sql
SELECT tablename, policyname, permissive
FROM pg_policies
WHERE tablename IN ('appointments', 'appointment_audit_logs')
ORDER BY tablename;
```

✅ Deve mostrar múltiplas policies criadas

---

### Teste 3: Testar auth.uid()

Execute no SQL Editor:

```sql
SELECT auth.uid() as current_user_id;
```

✅ Deve retornar um UUID (seu ID de usuário logado no Supabase)

---

## 🔄 APÓS APLICAR NO BANCO

### 1. Fazer Login Real no Frontend

```bash
# No seu browser em http://localhost:3000
# Logout → Login com credenciais reais
```

---

### 2. Criar/Editar Agendamento

1. Ir para: http://localhost:3000/clinica/agenda
2. Criar novo agendamento ou editar existente
3. Salvar

---

### 3. Verificar Auditoria

Volte ao SQL Editor e execute:

```sql
SELECT 
  id,
  appointment_id,
  performed_by,
  performed_by_role,
  action,
  created_at
FROM appointment_audit_logs
ORDER BY created_at DESC
LIMIT 5;
```

✅ **Esperado:** `performed_by` está preenchido com UUID, não NULL

```json
{
  "id": "uuid-1234",
  "appointment_id": "uuid-5678",
  "performed_by": "uuid-9999",  // ✅ NÃO NULL
  "performed_by_role": "admin",
  "action": "create",
  "created_at": "2026-04-23T15:30:00Z"
}
```

---

## 🚀 MODO RÁPIDO (Copy-Paste)

Se preferir apenas copiar e colar um comando por vez:

### Comando 1: Criar Tabela
```sql
CREATE TABLE IF NOT EXISTS appointment_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  performed_by UUID NOT NULL DEFAULT auth.uid(),
  performed_by_role TEXT,
  action TEXT NOT NULL,
  changes JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Comando 2: Criar Índices
```sql
CREATE INDEX idx_appointment_audit_logs_appointment_id ON appointment_audit_logs(appointment_id);
CREATE INDEX idx_appointment_audit_logs_performed_by ON appointment_audit_logs(performed_by);
CREATE INDEX idx_appointment_audit_logs_created_at ON appointment_audit_logs(created_at DESC);
```

### Comando 3: Criar Triggers (3 triggers separados)

```sql
-- INSERT Trigger
CREATE OR REPLACE FUNCTION audit_appointment_insert()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NOT NULL THEN
    INSERT INTO appointment_audit_logs (appointment_id, performed_by, performed_by_role, action, changes)
    VALUES (NEW.id, current_user_id, (SELECT role FROM users WHERE id = current_user_id LIMIT 1), 'create', to_jsonb(NEW));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS appointment_audit_insert_trigger ON appointments;
CREATE TRIGGER appointment_audit_insert_trigger AFTER INSERT ON appointments FOR EACH ROW EXECUTE FUNCTION audit_appointment_insert();
```

```sql
-- UPDATE Trigger
CREATE OR REPLACE FUNCTION audit_appointment_update()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NOT NULL THEN
    INSERT INTO appointment_audit_logs (appointment_id, performed_by, performed_by_role, action, changes)
    VALUES (OLD.id, current_user_id, (SELECT role FROM users WHERE id = current_user_id LIMIT 1), 'update', jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW)));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS appointment_audit_update_trigger ON appointments;
CREATE TRIGGER appointment_audit_update_trigger AFTER UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION audit_appointment_update();
```

```sql
-- DELETE Trigger
CREATE OR REPLACE FUNCTION audit_appointment_delete()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NOT NULL THEN
    INSERT INTO appointment_audit_logs (appointment_id, performed_by, performed_by_role, action, changes)
    VALUES (OLD.id, current_user_id, (SELECT role FROM users WHERE id = current_user_id LIMIT 1), 'delete', to_jsonb(OLD));
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS appointment_audit_delete_trigger ON appointments;
CREATE TRIGGER appointment_audit_delete_trigger BEFORE DELETE ON appointments FOR EACH ROW EXECUTE FUNCTION audit_appointment_delete();
```

### Comando 4: Habilitar RLS
```sql
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_audit_logs ENABLE ROW LEVEL SECURITY;
```

### Comando 5: Criar Policies
```sql
DROP POLICY IF EXISTS "Authenticated users can select appointments" ON appointments;
CREATE POLICY "Authenticated users can select appointments"
  ON appointments FOR SELECT
  USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can insert appointments" ON appointments;
CREATE POLICY "Authenticated users can insert appointments"
  ON appointments FOR INSERT
  WITH CHECK (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can update appointments" ON appointments;
CREATE POLICY "Authenticated users can update appointments"
  ON appointments FOR UPDATE
  USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()))
  WITH CHECK (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can delete appointments" ON appointments;
CREATE POLICY "Authenticated users can delete appointments"
  ON appointments FOR DELETE
  USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can view audit logs for their clinic" ON appointment_audit_logs;
CREATE POLICY "Users can view audit logs for their clinic"
  ON appointment_audit_logs FOR SELECT
  USING (appointment_id IN (SELECT id FROM appointments WHERE clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid())));
```

---

## 🔴 SE DER ERRO

### Erro: "Table already exists"
- Isto é esperado, a tabela pode já existir
- Você pode ignorar ou usar o DROP TABLE para recrear

### Erro: "Permission denied"
- Você está logado como usuário com permissões de admin no Supabase?
- Tente fazer logout e login novamente no Supabase Dashboard

### Erro: "Column does not exist"
- A tabela `appointments` existe?
- A coluna `clinic_id` existe em `appointments`?
- Verifique a estrutura do banco

### Erro no trigger: "auth.uid() returns null"
- Isto é normal se ninguém estiver logado
- Quando você fizer login no frontend, o auth.uid() funcionará

---

## ✅ CHECKLIST FINAL

- [ ] Acessei Supabase Dashboard
- [ ] Abri SQL Editor
- [ ] Copiei SQL do arquivo `⚡_TRIGGERS_AUDITORIA_AUTH_UID.sql`
- [ ] Colei no SQL Editor
- [ ] Cliquei em Run/Execute
- [ ] Verificar se apareceu sucesso
- [ ] Testei os 3 comandos de verificação (triggers, policies, auth.uid)
- [ ] Fiz login real no frontend
- [ ] Criei/Editei agendamento
- [ ] Verifiquei auditoria no banco (SELECT ... FROM appointment_audit_logs)
- [ ] Confirmei que `performed_by` não é NULL

---

## 📞 SUPORTE

Se algo der erro, verifique:

1. **SQL correto?** Copie do arquivo exato, sem modificações
2. **Permissões?** Você é admin no Supabase?
3. **Tabelas existem?** `appointments` e `users` devem existir
4. **Colunas corretas?** `clinic_id`, `scheduled_date`, etc devem existir

Depois de tudo pronto, vá para:
→ `⚡_VERIFICACAO_SUPABASE_AUTH_UID.md` para testar completo

