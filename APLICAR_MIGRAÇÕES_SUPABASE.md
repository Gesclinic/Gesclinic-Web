# 🔧 Como Aplicar as Migrações do Supabase

## Passo 1: Acessar o SQL Editor

1. Abra https://app.supabase.com
2. Selecione o projeto **gvdkdjyupktlflwurike** (Gesclinic Demo)
3. Na sidebar esquerda, clique em **SQL Editor**
4. Clique em **New Query**

## Passo 2: Copiar e Executar o SQL

Copie TODO o conteúdo abaixo e cole no SQL Editor do Supabase:

### SQL para Criar Tabela de Salas (rooms)

```sql
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50),
  unit VARCHAR(100),
  
  description TEXT,
  capacity INT,
  
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rooms_clinic ON rooms(clinic_id);
CREATE INDEX IF NOT EXISTS idx_rooms_active ON rooms(is_active);
CREATE INDEX IF NOT EXISTS idx_rooms_clinic_active ON rooms(clinic_id, is_active);
```

### SQL para Adicionar Colunas aos Agendamentos

```sql
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES rooms(id),
ADD COLUMN IF NOT EXISTS value DECIMAL(10, 2);

CREATE INDEX IF NOT EXISTS idx_appointments_room ON appointments(room_id);
```

### SQL para Criar Tabela de Auditoria

```sql
CREATE TABLE IF NOT EXISTS appointment_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT,
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  performed_by_role TEXT,
  performed_at TIMESTAMPTZ DEFAULT now(),
  context JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_appointment_audit_logs_appointment_id 
  ON appointment_audit_logs(appointment_id);

CREATE INDEX idx_appointment_audit_logs_performed_at 
  ON appointment_audit_logs(performed_at DESC);

CREATE INDEX idx_appointment_audit_logs_action_type 
  ON appointment_audit_logs(action_type);

ALTER TABLE appointment_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestores e admins podem ver todos os logs"
  ON appointment_audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
        AND r.name IN ('admin', 'gestor', 'gerente')
    )
  );

CREATE POLICY "Apenas inserção para authenticated users"
  ON appointment_audit_logs
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
```

### SQL para Criar as Views e RPC dos Indicadores

**⚠️ IMPORTANTE:** Este arquivo é grande (355 linhas). 

Abra o arquivo em seu editor:
`supabase/migrations/2026-01-14_create_agenda_indicators.sql`

Copie TODO o conteúdo do arquivo e cole no Supabase SQL Editor.

## Passo 3: Executar o SQL

1. Clique no botão **Ctrl+Enter** ou **⌘+Enter** (Mac)
2. Ou clique no botão de play (▶️) no canto superior direito
3. Aguarde a execução (pode levar 1-2 minutos)

## Verificação

Se tudo funcionou:
- ✅ Você verá mensagens de sucesso
- ✅ Na página da agenda, os indicadores vão aparecer
- ✅ No console do browser (F12), não haverá erros de "relation X does not exist"

## Se Houver Erros

Se receber erro como "table already exists":
- Isso é NORMAL e esperado (migrações são idempotentes)
- Clique em **Run again** ou execute novamente
- O SQL tem `IF NOT EXISTS` que evita conflitos

## Arquivo Completo da Migração

O arquivo completo está em:
`c:\Users\ferna\Desktop\Projeto Gesclinic Web\supabase\migrations\2026-01-14_create_agenda_indicators.sql`

Você pode abri-lo com:
- VS Code (Ctrl+Shift+P > "Open File")
- Notepad
- Qualquer editor de texto

Depois copiar e colar tudo no Supabase SQL Editor.

---

**💡 Próximos Passos:**

1. ✅ Abra Supabase SQL Editor
2. ✅ Copie e execute os 4 blocos SQL acima
3. ✅ Volte ao navegador e pressione F5 para recarregar
4. ✅ Os indicadores devem aparecer!

**Precisa de ajuda?** Me avise e posso executar programaticamente via Python + API
