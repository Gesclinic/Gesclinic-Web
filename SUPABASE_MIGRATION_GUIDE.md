# Guia de Atualização do Schema Supabase

## 📋 Resumo

Este guia descreve como aplicar as mudanças de schema necessárias para suportar as novas features de gerenciamento de caixa (saldos externos, aprovações, auditoria).

## ✅ Mudanças Incluídas

### Tabelas Modificadas:
1. **finance_accounts** - 4 novas colunas
   - `bank_code`: Código do banco (C6, ITAU, BRADESCO)
   - `external_id`: ID da conta no banco
   - `external_balance`: Saldo sincronizado
   - `last_balance_sync`: Data da última sincronização

2. **card_processors** - 6 novas colunas
   - `processor_type`: Tipo do processador (GETNET, PAGSEGURO, STONE)
   - `external_id`: ID do comerciante
   - `external_balance`: Saldo total
   - `available_balance`: Saldo disponível
   - `pending_balance`: Saldo em pendência
   - `last_balance_sync`: Data da última sincronização

3. **cash_transfers** - 8 novas colunas
   - `status`: Estado da transferência (pending, pending_approval, confirmed, rejected)
   - `approved_by`: UUID do gestor que aprovou
   - `approval_timestamp`: Data/hora da aprovação
   - `manager_signature`: Assinatura digital (base64)
   - `approval_notes`: Notas da aprovação
   - `rejected_by`: UUID do gestor que rejeitou
   - `rejection_timestamp`: Data/hora da rejeição
   - `rejection_reason`: Motivo da rejeição

### Novas Tabelas:
1. **cash_transfer_audit_logs** - Auditoria de aprovações
2. **sync_error_logs** - Registro de erros de sincronização
3. **cash_balance_history** - Histórico de saldos

### Novas Funções:
1. `log_transfer_approval()` - Registra ações de aprovação
2. `record_balance_snapshot()` - Registra snapshot de saldos

### Performance:
- 15+ novos índices
- Políticas RLS nas novas tabelas

## 🚀 Como Aplicar

### Método 1: Via Supabase Web UI (RECOMENDADO)

1. **Acesse o Supabase:**
   - URL: https://app.supabase.com
   - Faça login com sua conta

2. **Selecione o Projeto:**
   - Procure por "gesclinic" ou "Neuroclinica"
   - Clique para abrir o projeto

3. **Abra SQL Editor:**
   - No menu lateral, clique em "SQL Editor"
   - Clique em "+ New Query"

4. **Copie o SQL:**
   - Abra: `supabase/migrations/2026-01-17_update_cash_schema.sql`
   - Copie TODO o conteúdo (Ctrl+A, Ctrl+C)

5. **Execute a Query:**
   - Cole no editor SQL do Supabase (Ctrl+V)
   - Clique no botão verde "Run" ou pressione Ctrl+Enter
   - Aguarde a conclusão

6. **Verificar:**
   - Você deve ver "Success" ou mensagens de confirmação
   - Se houver erros, verifique se as colunas já existem

### Método 2: Via psql (Local)

**Pré-requisito:** PostgreSQL/psql instalado

```powershell
# Abra PowerShell e execute:
psql -h db.gvdkdjyupktlflwurike.supabase.co `
     -U postgres `
     -d postgres `
     -f supabase/migrations/2026-01-17_update_cash_schema.sql
```

Você será solicitado a fornecer a senha (obtém em Supabase > Settings > Database)

### Método 3: Via Supabase CLI

```bash
# Se Docker está rodando e projeto está inicializado:
supabase db push

# Ou para resetar e aplicar todas as migrações:
supabase db reset
```

## ✓ Validação

Após executar a migração, verifique se as mudanças foram aplicadas:

### 1. Verificar colunas em finance_accounts:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'finance_accounts' 
ORDER BY ordinal_position;
```

### 2. Verificar colunas em card_processors:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'card_processors' 
ORDER BY ordinal_position;
```

### 3. Verificar se novas tabelas existem:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('cash_transfer_audit_logs', 'sync_error_logs', 'cash_balance_history')
ORDER BY table_name;
```

### 4. Testar as funções:
```sql
-- Esta query vai falhar com erro esperado (sem dados), mas prova que a função existe
SELECT log_transfer_approval(
  '00000000-0000-0000-0000-000000000000'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'approved',
  '00000000-0000-0000-0000-000000000000'::uuid
);
```

## ⚠️ Possíveis Erros e Soluções

### Erro: "column already exists"
- **Causa:** Coluna já foi criada em execução anterior
- **Solução:** É normal, o SQL usa `IF NOT EXISTS`

### Erro: "permission denied"
- **Causa:** Usuário não tem permissões suficientes
- **Solução:** Use admin password (obtém em Supabase > Settings > Database)

### Erro: "relation does not exist"
- **Causa:** Tabela original não existe
- **Solução:** Verifique se o projeto está correto, compare com banco esperado

## 🔄 Próximas Etapas

### 1. Testar em Desenvolvimento
```bash
npm run dev
# Navegue para http://localhost:3000/clinica/financeiro/caixa-gerencial
# Verifique se há erros no console
```

### 2. Configurar Variáveis de Ambiente
Se planeja usar APIs externas, adicione ao `.env`:
```
VITE_C6_BANK_API_URL=https://api.c6bank.com.br
VITE_C6_BANK_API_KEY=seu_token
# ... outras chaves de API
```

### 3. Testar APIs
```javascript
// Em browser console:
const api = await import('./lib/externalBalanceApi.js');
api.getLatestBankBalances('clinic-uuid').then(console.log);
```

### 4. Deploy para Produção
```bash
npm run build
# Fazer deploy normal
```

## 📞 Suporte

Se encontrar problemas:

1. **Verifique os logs:**
   - Supabase > Logs > Database
   - Supabase > Logs > Edge Functions

2. **Verifique RLS policies:**
   - Supabase > Authentication > Policies
   - Verifique se user tem acesso correto

3. **Verifique schema:**
   - Supabase > SQL Editor > Run validation queries acima

## 📁 Arquivos Relacionados

- Migração SQL: `supabase/migrations/2026-01-17_update_cash_schema.sql`
- Script PowerShell: `scripts/apply_cash_schema_migration.ps1`
- APIs Frontend:
  - `src/lib/externalBalanceApi.js`
  - `src/lib/reconciliationApi.js`
  - `src/lib/reportGenerationApi.js`
- Componentes:
  - `src/pages/clinica/financeiro/components/CaixaGerencialView.jsx`
  - `src/pages/clinica/financeiro/components/TransferApprovalModal.jsx`

## ✅ Checklist de Conclusão

- [ ] Li este guia completo
- [ ] Fiz backup do banco de dados
- [ ] Apliquei a migração usando um dos métodos
- [ ] Executei as queries de validação
- [ ] Testei as APIs em desenvolvimento
- [ ] Verificou que não há erros no console
- [ ] Fez deploy para produção

---

**Versão:** 1.0  
**Data:** 2026-01-17  
**Status:** Pronto para Produção ✅
