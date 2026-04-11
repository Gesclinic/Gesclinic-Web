# 📋 TISS Integration - Frontend & Database Setup COMPLETO

## ✅ Status:

- ✅ **Frontend**: Todos os 9 campos TISS adicionados nas abas Liberação e Faturamento
- ⏳ **Database**: Migration criada - aguardando execução
- ⏳ **Validação**: Script de validação pronto

---

## 🚀 PRÓXIMOS PASSOS (SÓ 2 PASSOS):

### PASSO 1: Executar Migration de TISS Fields

**Opção A: Supabase SQL Editor (RECOMENDADO)**

1. Abra https://supabase.com/dashboard/
2. Vá em **SQL Editor** → **New Query**
3. Cole e execute:

```sql
-- Adicionar campos TISS em appointments
ALTER TABLE IF EXISTS appointments
ADD COLUMN IF NOT EXISTS total_value DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS guide_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS authorization_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS authorization_expiry DATE,
ADD COLUMN IF NOT EXISTS subscriber_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS dependent_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS dependent_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS dependent_birthdate DATE,
ADD COLUMN IF NOT EXISTS dependent_gender VARCHAR(1),
ADD COLUMN IF NOT EXISTS requires_authorization BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS diagnosis_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS billing_data JSONB,
ADD COLUMN IF NOT EXISTS billing_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS billing_xml TEXT,
ADD COLUMN IF NOT EXISTS quantity INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_appointments_guide_number 
  ON appointments(guide_number) WHERE guide_number IS NOT NULL;
  
CREATE INDEX IF NOT EXISTS idx_appointments_subscriber_number 
  ON appointments(subscriber_number) WHERE subscriber_number IS NOT NULL;
```

4. Clique em **Run**
5. Veja "Success. No rows returned" ✅

**Opção B: PowerShell Local**

```powershell
cd "c:\Users\ferna\Desktop\Projeto Gesclinic Web"
.\scripts\apply_tiss_fields_migration.ps1
```

---

### PASSO 2: Validar Migration

Após executar PASSO 1, rode também em SQL Editor:

```sql
-- Verificar campos criados
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'appointments'
AND column_name IN (
  'diagnosis_code',
  'subscriber_number',
  'dependent_number',
  'dependent_name',
  'dependent_birthdate',
  'dependent_gender',
  'quantity',
  'authorization_expiry',
  'notes'
)
ORDER BY column_name;
```

✅ Esperado: 9 linhas retornadas

---

## 📊 Campos Adicionados:

### Na Aba "Liberação":
- 📅 **authorization_expiry** - Data de validade da autorização

### Na Aba "Faturamento":  
- 🔍 **diagnosis_code** - Código CID (diagnóstico)
- 👤 **subscriber_number** - Número do beneficiário
- 👨‍👩‍👧 **dependent_number** - Matrícula do dependente
- 👨‍👩‍👧 **dependent_name** - Nome do dependente
- 👨‍👩‍👧 **dependent_birthdate** - Data de nascimento
- 👨‍👩‍👧 **dependent_gender** - Gênero (M/F)
- 🔢 **quantity** - Quantidade procedimentos
- 📝 **notes** - Observações/notas

---

## 📁 Arquivos Modificados:

1. ✅ `src/pages/clinica/agenda/components/AppointmentUnitedModal.jsx` 
   - Adicionado todos os 9 campos nos formulários
   - Campos sincronizam com estado React
   - Salvam para banco quando appointment é atualizado

2. ✅ `supabase/migrations/20260410_ADD_TISS_FIELDS_APPOINTMENTS.sql`
   - Pronto para executar
   - Inclui índices de performance

3. ✅ `supabase/migrations/20260410_VALIDAR_TISS_FIELDS.sql`
   - Script para validar alterações

---

## 🧪 Teste End-to-End (Depois que migration rodar):

1. Abra agenda → Editar agendamento
2. Vá na aba **Liberação** → preencha "Validade da Autorização"
3. Vá na aba **Faturamento** → preencha todos os 9 campos
4. Clique **Salvar** 
5. ✅ Dados devem aparecer no banco

---

## 🔗 Relacionado:

- Frontend form: `src/pages/clinica/agenda/components/AppointmentUnitedModal.jsx`
- TISS API: `src/lib/tissApi.js`
- TISS Submission: `src/lib/tissSubmissionServiceApi.js`
- TISS Dashboard: `src/pages/clinica/faturamento/TISSPage.jsx`

---

## ⏱️ Tempo Estimado:

- Migration: **5 segundos**
- Validação: **2 segundos**
- **Total: ~10 segundos**

---

**💡 Dica:** Após executar, abra um agendamento existente e verá os novos campos na aba Liberação e Faturamento! 🎉
