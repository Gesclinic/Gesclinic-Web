## ✅ Implementação de Número de Prontuário - Instruções

### 📋 O que foi feito:

1. **Migração SQL** criada com:
   - Coluna `prontuario_numero` (VARCHAR UNIQUE)
   - Função `generate_prontuario_numero()` para gerar sequencial por clínica
   - Trigger automático `trigger_auto_generate_prontuario` para auto-gerar ao criar paciente
   - Formato: `CODCLINICA-NNNN` (ex: GESCL-1001, GESCL-1002)

2. **Frontend atualizado:**
   - ✅ PatientDetailPage: Exibe prontuário em **destaque no header** (em azul)
   - ✅ DadosCadastraisTab: Campo **somente leitura** com label "(Automático)"
   - ✅ HistoricoClinicoTab: Card destacado mostrando prontuário do paciente
   - ✅ patientsApi.js: Campo incluído em todas as queries

3. **Padrão implementado:**
   - Sequencial por clínica (nunca reutiliza números)
   - Gerado automaticamente no cadastro
   - Imutável para usuários comuns
   - CPF separado do prontuário

---

### 🚀 Passos para Ativar:

#### Passo 1: Aplicar a Migração SQL

1. Abra [Supabase Dashboard](https://supabase.com/dashboard)
2. Navegue até seu projeto
3. Vá em **SQL Editor**
4. Clique em **New Query**
5. Copie e execute este SQL:

```sql
-- ============================================================
-- ADD PRONTUÁRIO FIELD TO PATIENTS
-- ============================================================

-- 1. Adicionar coluna de prontuário
ALTER TABLE patients ADD COLUMN IF NOT EXISTS prontuario_numero VARCHAR(50) UNIQUE;

-- 2. Adicionar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_patients_prontuario ON patients(prontuario_numero);
CREATE INDEX IF NOT EXISTS idx_patients_clinic_prontuario ON patients(clinic_id, prontuario_numero);

-- 3. Criar função para gerar número de prontuário automático
CREATE OR REPLACE FUNCTION generate_prontuario_numero(p_clinic_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
  v_clinic_code VARCHAR(50);
  v_next_number INT;
  v_prontuario VARCHAR(50);
BEGIN
  -- Obter código da clínica
  SELECT code INTO v_clinic_code FROM clinics WHERE id = p_clinic_id LIMIT 1;
  
  IF v_clinic_code IS NULL THEN
    v_clinic_code := 'CLI';
  END IF;
  
  -- Gerar próximo número sequencial por clínica
  v_next_number := (SELECT COALESCE(MAX(CAST(SUBSTRING(prontuario_numero FROM LENGTH(v_clinic_code) + 2) AS INT)), 999)) 
                    FROM patients 
                    WHERE clinic_id = p_clinic_id 
                    AND prontuario_numero LIKE v_clinic_code || '-%') + 1;
  
  -- Formatar: CODCLINICA-0001
  v_prontuario := v_clinic_code || '-' || LPAD(v_next_number::TEXT, 4, '0');
  
  RETURN v_prontuario;
END;
$$ LANGUAGE plpgsql;

-- 4. Criar trigger para auto-gerar prontuário ao criar paciente
CREATE OR REPLACE FUNCTION auto_generate_prontuario()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.prontuario_numero IS NULL THEN
    NEW.prontuario_numero := generate_prontuario_numero(NEW.clinic_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Deletar trigger anterior se existir
DROP TRIGGER IF EXISTS trigger_auto_generate_prontuario ON patients;

-- Criar novo trigger
CREATE TRIGGER trigger_auto_generate_prontuario
BEFORE INSERT ON patients
FOR EACH ROW
EXECUTE FUNCTION auto_generate_prontuario();

COMMENT ON COLUMN patients.prontuario_numero IS 'Número de prontuário único por clínica, gerado automaticamente no formato CODCLINICA-NNNN';
```

6. Clique **RUN** ✅

#### Passo 2: Testar

1. Navegue para http://localhost:3000/clinica/pacientes/novo
2. Crie um novo paciente
3. Após criar, verifique:
   - ✅ Prontuário gerado automaticamente no formato `CODCLINICA-NNNN`
   - ✅ Visível no **header** da página (em azul)
   - ✅ Na aba **"Dados Cadastrais"** como somente leitura
   - ✅ Na aba **"Histórico Clínico"** destacado em um card azul

#### Passo 3: Verificar Prontuários Existentes

Se você já tem pacientes cadastrados e quer adicionar prontuários retroativamente:

```sql
-- Gerar prontuários para pacientes existentes que não têm
UPDATE patients 
SET prontuario_numero = generate_prontuario_numero(clinic_id)
WHERE prontuario_numero IS NULL;
```

---

### 📍 Localização dos Números de Prontuário:

| Localização | Tipo | Status |
|---|---|---|
| Header da página do paciente | Destaque (azul, grande) | ✅ Sempre visível |
| Aba "Dados Cadastrais" | Campo somente leitura | ✅ Imutável |
| Aba "Histórico Clínico" | Card informativo no topo | ✅ Referência |
| Lista de pacientes | ID principal | ✅ Pronto para usar |

---

### 🎯 Benefícios:

✅ Identificação única e profissional  
✅ Padrão de clínicas reais  
✅ Sequencial por clínica (não reutiliza)  
✅ Gerado automaticamente  
✅ CPF e prontuário separados  
✅ Imutável para segurança  

---

### ❓ Dúvidas Frequentes:

**P: Posso editar o prontuário manualmente?**  
R: Não. Está como somente leitura para usuários comuns. Apenas admins poderão editar (futuro).

**P: E se eu precisar resetar a sequência?**  
R: Entre em contato com o suporte. Isso é raro e requer alteração direta no banco.

**P: O prontuário é compartilhado entre clínicas?**  
R: Não. Cada clínica tem sua própria sequência (ex: GESCL-1001, OUTRO-1001).

---

**Status:** ✅ Pronto para ativar!
