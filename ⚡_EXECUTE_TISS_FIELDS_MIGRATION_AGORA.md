# 🚀 Executar Migration TISS Fields AGORA

Para adicionar os 9 campos TISS na tabela `appointments`:

## Opção 1: Supabase SQL Editor (Recomendado)

1. Abra https://supabase.com/dashboard/
2. Navegue até **SQL Editor** (ou abra um novo SQL)
3. Copie e execute o SQL abaixo:

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

## Opção 2: Terminal PowerShell

```powershell
cd "c:\Users\ferna\Desktop\Projeto Gesclinic Web"
.\scripts\apply_tiss_fields_migration.ps1
```

## Opção 3: Via Node.js Script

```bash
npm run exec-migration -- supabase/migrations/20260410_ADD_TISS_FIELDS_APPOINTMENTS.sql
```

---

## ✅ Campos adicionados:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| diagnosis_code | VARCHAR(10) | Código CID (diagnóstico) |
| subscriber_number | VARCHAR(100) | Número do beneficiário |
| dependent_number | VARCHAR(100) | Número do dependente |
| dependent_name | VARCHAR(255) | Nome do dependente |
| dependent_birthdate | DATE | Data de nascimento do dependente |
| dependent_gender | VARCHAR(1) | Gênero (M/F) |
| quantity | INT | Quantidade de procedimentos |
| authorization_expiry | DATE | Validade da autorização |
| notes | TEXT | Observações/notas |

Plus os campos que já existiam:
- total_value, guide_number, authorization_number, requires_authorization, billing_data, billing_status, billing_xml, payment_method

---

## 📋 Frontend já atualizado:

✅ Todos os 9 campos adicionados nas abas:
- **Liberação**: authorization_expiry
- **Faturamento**: diagnosis_code, subscriber_number, dependent_number, dependent_name, dependent_birthdate, dependent_gender, quantity, notes

Arquivo atualizado: `src/pages/clinica/agenda/components/AppointmentUnitedModal.jsx`
