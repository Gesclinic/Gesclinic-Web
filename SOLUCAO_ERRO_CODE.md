# 🔧 SOLUÇÃO PARA O ERRO "column code does not exist"

## 🎯 Problema Identificado

O Supabase está executando **múltiplos arquivos de migração** que estão conflitando entre si. O arquivo `20260113_COMPREHENSIVE_INIT.sql` está correto, mas outros arquivos mais antigos estão:

1. Criando índices ANTES das tabelas existirem
2. Tentando referenciar colunas que ainda não foram criadas
3. Causando conflitos de schema

## ✅ SOLUÇÃO (Siga Estes Passos)

### Opção 1: Limpar o Banco (RECOMENDADO se não tiver dados importantes)

#### PASSO 1: Abra o Supabase SQL Editor
- Acesse: https://app.supabase.com/project/[seu-projeto]/sql/new

#### PASSO 2: Execute Este Comando
```sql
-- ATENÇÃO: Isso deletará TUDO no banco!
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
```

#### PASSO 3: Execute APENAS Este Arquivo
- Copie todo o conteúdo de: `supabase/migrations/20260113_COMPREHENSIVE_INIT.sql`
- Cole no Supabase
- Clique em RUN

#### PASSO 4: Verifique
```sql
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
```

Resultado esperado: **73 tabelas**

---

### Opção 2: Manter Dados Existentes

Se você tem dados importantes que não quer perder:

1. Faça backup das tabelas importantes
2. Siga a Opção 1 acima
3. Restaure os dados depois

---

## 🚨 ARQUIVOS PROBLEMÁTICOS

Estes arquivos em `supabase/migrations/` podem estar causando conflito:

```
❌ 00_CLEAN_AND_INIT.sql
❌ 00_COMPLETE_INIT.sql
❌ 00_SAFE_INIT.sql
❌ 01_CLEAN_AND_CREATE.sql
❌ 20260113_create_conciliation_tables.sql
❌ (outros arquivos .sql anteriores a 20260113_COMPREHENSIVE_INIT.sql)

✅ 20260113_COMPREHENSIVE_INIT.sql (USE APENAS ESTE)
```

---

## 🔧 COMO DESABILITAR OUTROS ARQUIVOS

Se você quiser ser cauteloso, renomeie os outros arquivos:

```powershell
# PowerShell - Na pasta supabase/migrations/

# Renomear arquivos problemáticos
Rename-Item "00_CLEAN_AND_INIT.sql" "00_CLEAN_AND_INIT.sql.bak"
Rename-Item "00_COMPLETE_INIT.sql" "00_COMPLETE_INIT.sql.bak"
Rename-Item "00_SAFE_INIT.sql" "00_SAFE_INIT.sql.bak"
Rename-Item "01_CLEAN_AND_CREATE.sql" "01_CLEAN_AND_CREATE.sql.bak"
Rename-Item "20260113_create_conciliation_tables.sql" "20260113_create_conciliation_tables.sql.bak"
```

Assim o Supabase não vai tentar executar esses arquivos.

---

## ✨ Por Que o Erro Ocorria

```
Sequência de execução do Supabase:

1. Execute: 00_CLEAN_AND_INIT.sql
   ❌ Cria tabelas parcialmente
   
2. Execute: 00_COMPLETE_INIT.sql
   ❌ Tenta criar índice em coluna que não existe
   
3. Execute: 01_CLEAN_AND_CREATE.sql
   ❌ Mais conflitos
   
4. Execute: 20260113_create_conciliation_tables.sql
   ❌ Tenta referenciar tabelas que estão em estado inconsistente
   
5. Execute: 20260113_COMPREHENSIVE_INIT.sql
   ✅ Este está correto, mas chega tarde demais
   
RESULTADO: ERROR: 42703 - column "code" does not exist
```

---

## ✅ SOLUÇÃO FINAL

Use **APENAS**:
- `supabase/migrations/20260113_COMPREHENSIVE_INIT.sql`

Remova/renomeie todos os outros.

---

## 🎯 RESUMO RÁPIDO

1. Abra Supabase SQL Editor
2. Execute: `DROP SCHEMA public CASCADE; CREATE SCHEMA public;`
3. Cole o arquivo: `20260113_COMPREHENSIVE_INIT.sql`
4. Clique: RUN
5. Pronto! ✅

---

**Status:** Problema diagnosticado e solução fornecida
**Ação necessária:** Limpar banco e executar arquivo correto
**Tempo:** 5 minutos
