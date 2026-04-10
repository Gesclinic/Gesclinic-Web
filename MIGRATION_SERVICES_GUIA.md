# 🔧 INSTRUÇÕES PARA APLICAR MIGRATION - TABELA SERVICES

## Passo 1: Abrir Supabase
1. Acesse: https://supabase.com/dashboard/
2. Selecione seu projeto Gesclinic

## Passo 2: Ir para SQL Editor
1. No menu lateral, clique em **SQL Editor**
2. Clique em **+ New Query** (ou **New Script**)

## Passo 3: Copiar o SQL
Abra o arquivo `INSTRUCOES_MIGRATION_SERVICES.sql` e copie TODO o conteúdo SQL.

## Passo 4: Colar e Executar
1. Cole o SQL no editor do Supabase
2. Clique no botão **Run** (verde) ou pressione `Cmd/Ctrl + Enter`

## Passo 5: Verificar
O SQL no final faz uma verificação das colunas. Você deverá ver:

```
column_name              data_type           is_nullable  column_default
─────────────────────────────────────────────────────────────────────
id                       uuid                NO           gen_random_uuid()
clinic_id                uuid                NO           
code                     character varying   YES          
name                     text                NO           
description              text                YES          
duration_minutes         integer             YES          
price                    numeric             YES          
active                   boolean             YES          true
created_at               timestamp with tz   YES          CURRENT_TIMESTAMP
updated_at               timestamp with tz   YES          CURRENT_TIMESTAMP
deleted_at               timestamp with tz   YES          
type_billing             character varying   YES          'per_consultation'
allow_scheduling_fit     boolean             YES          true
requires_authorization   boolean             YES          false
base_value               numeric             YES          0
default_duration_minutes integer             YES          30
```

## ✅ Pronto!

Após executar com sucesso, o código React já estará pronto para salvar serviços com todos os campos:
- ✅ name
- ✅ description  
- ✅ default_duration_minutes
- ✅ billing_type
- ✅ allow_scheduling_fit
- ✅ requires_authorization
- ✅ base_value
- ✅ code
- ✅ active

## Problemas?

Se alguma coluna já existir, o SQL usa `ADD COLUMN IF NOT EXISTS`, então não vai gerar erro.
