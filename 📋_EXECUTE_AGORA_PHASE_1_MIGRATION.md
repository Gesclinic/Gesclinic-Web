# ⚡ EXECUTAR AGORA - PHASE 1 DATABASE MIGRATION

**Status:** Pronto para executar  
**Tempo estimado:** 5-10 minutos  
**Criticidade:** 🔴 BLOQUEADOR - Desbloqueará todas as outras fases  

---

## ✅ O que será adicionado ao banco de dados

**Services Table:**
- `tuss_code` (VARCHAR 10) - Código TUSS obrigatório
- `type_service` (VARCHAR 50) - Tipo de serviço
- `guide_type` (VARCHAR 50) - Tipo de guia (Consulta/SADT/Internação)
- `unit_measure` (VARCHAR 20) - Unidade de medida
- `cost_value` (DECIMAL) - Valor de custo

**Professionals Table:**
- `cbo_code` (VARCHAR 6) - Código CBO obrigatório
- `cns_code` (VARCHAR 20) - Código CNS
- `council_type` (VARCHAR 50) - Tipo de conselho (CRM/CREFITO/CRP)
- `council_number` (VARCHAR 20) - Número do conselho
- `council_state` (VARCHAR 2) - Estado do conselho (UF)

**Health Insurances Table:**
- `registration_ans` (VARCHAR 20) - Registro ANS
- `tiss_pattern` (BOOLEAN) - Padrão TISS ativado
- `guide_format` (VARCHAR 50) - Formato de guia

**Professional Payers Table:**
- `credential_number` (VARCHAR 50) - Número de credencial

---

## 🚀 PASSO A PASSO PARA EXECUTAR

### PASSO 1: Copiar o SQL

```bash
Arquivo: supabase/migrations/20260118_add_tiss_mandatory_fields.sql
Ação: Copiar TODO o conteúdo
```

### PASSO 2: Ir ao Supabase Console

1. Abrir: https://supabase.com/dashboard
2. Login com suas credenciais
3. Selecionar projeto `gesclinic`
4. Ir em: **SQL Editor** (menu esquerdo)

### PASSO 3: Executar a migration

1. Clicar em **New Query**
2. **Colar todo o SQL** que copiou
3. Clicar **Execute** (ou Ctrl+Enter)

### PASSO 4: Verificar se funcionou

Se não houver erro vermelho, significa que os campos foram criados com sucesso!

**Se receber mensagem:** "CREATE INDEX IF NOT EXISTS" → Tudo OK! ✅

---

## ❌ SE DER ERRO

Se receber erro tipo:
```
ERROR: column "tuss_code" of relation "services" already exists
```

**Solução:** Significa que o campo já existe! Pule para FASE 2.

Se receber outro erro, copie a mensagem e me avise.

---

## ✅ COMO VERIFICAR QUE FUNCIONOU

Após executar a migration, execute este SQL para confirmar:

```sql
-- Verificar SERVICES
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'services' 
AND column_name IN ('tuss_code', 'type_service', 'guide_type', 'unit_measure', 'cost_value')
ORDER BY column_name;

-- Verificar PROFESSIONALS
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'professionals' 
AND column_name IN ('cbo_code', 'cns_code', 'council_type', 'council_number', 'council_state')
ORDER BY column_name;

-- Verificar HEALTH_INSURANCES
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'health_insurances' 
AND column_name IN ('registration_ans', 'tiss_pattern', 'guide_format')
ORDER BY column_name;

-- Verificar PROFESSIONAL_PAYERS
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'professional_payers' 
AND column_name = 'credential_number';
```

**Resultado esperado:** Deve listar todos os campos acima (13 no total)

---

## 📝 PRÓXIMO PASSO

Após confirmar que os campos foram criados, avise que concluiu FASE 1 e vamos para:

**FASE 2:** Atualizar APIs com validações  
**Tempo:** ~2 horas  
**Ação:** Adicionar funções de validação aos arquivos da API

---

## 🎯 RESUMO

| Item | Status |
|------|--------|
| Migration SQL criado | ✅ Pronto |
| Instruções fornecidas | ✅ Pronto |
| Próximo passo | Executar em Supabase |

**Mensagem importante:** Estes campos são CRÍTICOS para TISS XML. Sem eles, será impossível gerar notas fiscais válidas.
