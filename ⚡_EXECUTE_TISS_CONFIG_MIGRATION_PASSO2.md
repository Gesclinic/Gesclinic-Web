# 🏥 TISS - Passo 2: Executar Migração de Configuração

**Status:** ⏳ AGUARDANDO EXECUÇÃO  
**Data:** 11 de Abril, 2026  
**Tempo Estimado:** 2-3 minutos

---

## 📋 O Que Fazer

Você precisa executar a migração SQL que adiciona **8 novos campos** na tabela `payers` (convênios/operadoras) para armazenar as configurações de TISS.

---

## ✅ Passo 1: Acessar Supabase SQL Editor

1. Acesse: https://supabase.com/dashboard
2. Selecione seu **projeto Gesclinic**
3. Na sidebar esquerda, clique em **"SQL Editor"** (ou **"SQL"**)

---

## ✅ Passo 2: Abrir o Arquivo de Migração

**Opção A: Copiar SQL (Recomendado)**

1. Abra o arquivo: `supabase/migrations/20260411_ADD_TISS_CONFIG_PAYERS.sql`
2. Copie **TODO** o conteúdo SQL
3. Cole no **SQL Editor** do Supabase

**Opção B: Executar Diretamente (Se tiver acesso direto)**

- Se você puder executar migrations de forma automática, use a CLI:
  ```bash
  supabase db push
  ```

---

## 📄 SQL A Executar

```sql
-- ============================================================
-- Adicionar campos de configuração TISS na tabela payers
-- Data: 11 de Abril, 2026
-- ============================================================

ALTER TABLE IF EXISTS payers
ADD COLUMN IF NOT EXISTS registration_ans VARCHAR(20) COMMENT 'Código de registro ANS da operadora';

ADD COLUMN IF NOT EXISTS tiss_enabled BOOLEAN DEFAULT FALSE COMMENT 'Flag para habilitar/desabilitar TISS';

ADD COLUMN IF NOT EXISTS submission_method VARCHAR(50) COMMENT 'Método de submissão: HTTP, SFTP, PORTAL';

ADD COLUMN IF NOT EXISTS tiss_endpoint VARCHAR(500) COMMENT 'URL do endpoint TISS HTTP (se aplicável)';

ADD COLUMN IF NOT EXISTS tiss_username VARCHAR(255) COMMENT 'Usuário para autenticação TISS';

ADD COLUMN IF NOT EXISTS tiss_password VARCHAR(255) COMMENT 'Senha para autenticação TISS (encriptada)';

ADD COLUMN IF NOT EXISTS tiss_response_email VARCHAR(255) COMMENT 'Email para receber respostas/notificações TISS';

ADD COLUMN IF NOT EXISTS tiss_last_sync TIMESTAMP COMMENT 'Timestamp da última sincronização TISS';

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_payers_tiss_enabled ON payers(tiss_enabled) WHERE tiss_enabled = true;

CREATE INDEX IF NOT EXISTS idx_payers_registration_ans ON payers(registration_ans) WHERE registration_ans IS NOT NULL;
```

---

## ✅ Passo 3: Executar a Migração

1. **Cole o SQL** no editor do Supabase
2. Clique no botão **"▶ Run"** ou **"RUN"** (canto superior direito)
3. Aguarde **2-3 segundos** para a execução completar

---

## ✅ Passo 4: Validar a Execução

Para verificar se funcionou, execute esta query de validação:

```sql
-- Validar se os campos foram criados
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'payers' 
AND column_name LIKE 'tiss_%'
ORDER BY ordinal_position;
```

**Resultado Esperado:**
```
column_name           | data_type
-------------------  | ----------
registration_ans      | varchar
tiss_enabled          | boolean
submission_method     | varchar
tiss_endpoint         | varchar
tiss_username         | varchar
tiss_password         | varchar
tiss_response_email   | varchar
tiss_last_sync        | timestamp
```

---

## ⚠️ Se Ocorrer Erro

**Erro: "Column already exists"**
- Significa que os campos já foram criados
- Tudo está ok! Pode continuar

**Erro: "Permission denied"**
- Verifique suas permissões no Supabase
- Tente fazer login novamente

**Outro erro**
- Copie a mensagem de erro e me envie para debug

---

## 📌 Próximos Passos (Após Executar Esta Migração)

### ✅ **Passo 2.1: Validar no Frontend**

O frontend (ConveniosPage) já está pronto com a nova aba "🏥 TISS":

1. Abra http://localhost:3000 (dev) ou vercel preview
2. Vá para **Base do Sistema → Convênios**
3. Clique em qualquer convênio (ex: Unimed) para editar
4. Você deverá ver uma **nova aba "🏥 TISS"** entre "Tabela de Preços"

### ✅ **Passo 2.2: Preencher Dados Unimed**

Na aba TISS, para Unimed:

1. **Marque a checkbox:** ✅ Habilitar TISS para esta operadora
2. **Preenchacompos que aparecem:**
   - **Código ANS:** 342856 (Unimed)
   - **Método de Submissão:** HTTP (para testes), ou SFTP/PORTAL se configurado
   - **Endpoint TISS:** https://api.unimed.com.br/tiss (ou teste com mock)
   - **Usuário TISS:** seu_usuario_unimed
   - **Senha TISS:** sua_senha_unimed
   - **Email para Respostas:** seu@email.com

3. Clique em **"💾 Salvar Configurações TISS"**

---

## 📊 Estrutura de Dados Criada

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `registration_ans` | VARCHAR(20) | Código ANS da operadora |
| `tiss_enabled` | BOOLEAN | Habilitado para TISS? |
| `submission_method` | VARCHAR(50) | HTTP / SFTP / PORTAL |
| `tiss_endpoint` | VARCHAR(500) | URL da API TISS |
| `tiss_username` | VARCHAR(255) | Credenciais |
| `tiss_password` | VARCHAR(255) | Credenciais (encriptada) |
| `tiss_response_email` | VARCHAR(255) | Email de notificações |
| `tiss_last_sync` | TIMESTAMP | Última sincronização |

---

## 🎯 Resumo da Integração TISS (Até Aqui)

✅ **Passo 1:** "Enviar TISS" button adicionado ao formulário de agendamentos  
✅ **Passo 1:** Todos os 17 campos TISS capturam dados nos formulários  
🟡 **Passo 2:** Criar aba TISS no ConveniosPage (COMPLETO ✅)  
⏳ **Passo 2:** Executar migração SQL (VOCÊ ESTÁ AQUI)  
⏳ **Passo 3:** Preencher dados Unimed na aba TISS do frontend  
⏳ **Passo 4:** Testar envio de guia TISS end-to-end  

---

## 💡 Precisa de Ajuda?

Se encontrar dificuldades:
1. Verifique que tem permissão de Editor/Admin no Supabase
2. Verifique que o banco está sendo usado corretamente
3. Me envie a mensagem de erro exato
