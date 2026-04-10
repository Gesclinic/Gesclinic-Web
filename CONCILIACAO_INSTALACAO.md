# 🚀 Guia de Instalação - Conciliação Bancária

## Pré-requisitos
- Supabase project ativo
- Acesso ao Supabase Studio ou admin
- Banco de dados criado

## Passo 1: Aplicar Migrations SQL

### Opção A: Via Supabase Studio (Recomendado)
1. Abra o projeto no [Supabase Dashboard](https://app.supabase.com)
2. Vá para **SQL Editor**
3. Clique em **New Query**
4. Cole todo o conteúdo de `supabase/migrations/20260112_create_conciliation_tables.sql`
5. Clique em **Run**
6. Aguarde a execução (deve levar alguns segundos)

### Opção B: Via CLI
```bash
supabase db push
```

## Passo 2: Verificar Tabelas Criadas

No **Supabase Studio** > **Table Editor**, você deve ver:
- ✅ conciliation_bank_statements
- ✅ conciliation_link_history
- ✅ conciliation_auto_rules
- ✅ conciliation_suggestions
- ✅ conciliation_import_batches
- ✅ clinic_bank_accounts

## Passo 3: Testar a Implementação

### 1. Acessar a Página
```
http://localhost:3000/clinica/financeiro/conciliacao-bancaria
```

### 2. Criar uma Conta Bancária (Opcional - Demo)
```sql
INSERT INTO clinic_bank_accounts (
  clinic_id,
  account_name,
  bank_name,
  account_number,
  account_holder,
  active
) VALUES (
  'SEU_CLINIC_ID_AQUI',
  'Conta Principal',
  'Banco do Brasil',
  '123456-7',
  'Clínica X',
  true
);
```

### 3. Importar Arquivo de Teste
Use o arquivo `exemplo_extrato.csv` incluído no projeto

## Passo 4: Configurar Permissões (RLS)

Se você estiver usando Row Level Security (RLS), adicione as políticas:

```sql
-- Políticas para conciliation_bank_statements
ALTER TABLE conciliation_bank_statements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own clinic statements" ON conciliation_bank_statements
  FOR SELECT USING (
    clinic_id IN (
      SELECT id FROM clinics 
      WHERE id = auth.jwt()->>'clinic_id'
    )
  );

CREATE POLICY "Users can insert own clinic statements" ON conciliation_bank_statements
  FOR INSERT WITH CHECK (
    clinic_id IN (
      SELECT id FROM clinics 
      WHERE id = auth.jwt()->>'clinic_id'
    )
  );

CREATE POLICY "Users can update own clinic statements" ON conciliation_bank_statements
  FOR UPDATE USING (
    clinic_id IN (
      SELECT id FROM clinics 
      WHERE id = auth.jwt()->>'clinic_id'
    )
  );
```

## Passo 5: Configurar Variáveis de Ambiente (se necessário)

Nenhuma variável de ambiente adicional é necessária. A implementação usa:
- `VITE_SUPABASE_URL` (já existente)
- `VITE_SUPABASE_ANON_KEY` (já existente)

## Passo 6: Testar no Navegador

1. **Importar Extrato**
   - Vá para `/clinica/financeiro/conciliacao-bancaria`
   - Selecione uma conta (se não houver, a seção aparecerá vazia)
   - Clique em "Importar Extrato"
   - Use o arquivo `exemplo_extrato.csv`

2. **Ver Indicadores**
   - Após importação, os indicadores devem mostrar valores

3. **Buscar Sugestões**
   - Clique em um lançamento
   - Vá para aba "Sugestões"
   - Clique em "Buscar Sugestões"
   - Se houver lançamentos similares em AP/AR, aparecerão

4. **Conciliar**
   - Clique em uma sugestão para conciliar
   - Ou crie um novo lançamento na aba "Criar Lançamento"

## Troubleshooting

### ❌ Erro: "clinic_id não encontrado"
**Solução**: Certifique-se de que `useClinicContext()` está funcionando corretamente

### ❌ Erro: "Tabelas não existem"
**Solução**: Verifique se as migrations foram aplicadas com sucesso

### ❌ Lista vazia após importação
**Verificar**:
1. Selecionar uma conta bancária antes de importar
2. Verificar se os dados foram realmente inseridos no Supabase

### ❌ Sugestões não aparecem
**Verificar**:
1. Se existem lançamentos em `ap_bills` ou `ar_invoices` com valor similar
2. Se a diferença de data está dentro de ±2 dias

## 📱 Como Usar - Guia Rápido

### Fluxo Padrão

1. **Importar Extrato Bancário**
   ```
   Bloco: Importação de Extrato
   → Selecionar Conta
   → Selecionar Arquivo (CSV/OFX)
   → Clicar "Importar"
   ```

2. **Visualizar Lançamentos**
   ```
   Lista: Movimentações do Extrato
   → Filtrar por Status, Tipo, Período
   → Cada linha é um lançamento do banco
   ```

3. **Conciliar**
   ```
   Opção A: Manual
   → Clicar em um lançamento
   → Aba "Sugestões"
   → Selecionar sugestão com melhor score
   → Clicar "Conciliar"
   
   Opção B: Em Lote
   → Selecionar múltiplos com checkbox
   → Clicar "Conciliar Selecionados"
   → Confirmar
   ```

4. **Criar Lançamento (se necessário)**
   ```
   → Clicar em lançamento sem sugestão
   → Aba "Criar Lançamento"
   → Preencher formulário
   → Clicar "Criar e Vincular"
   → Novo lançamento é criado em AP/AR
   ```

5. **Marcar Divergência**
   ```
   → Clicar em lançamento divergente
   → Aba "Ações"
   → Seção "Marcar como Divergente"
   → Informar motivo
   → Clicar "Marcar como Divergente"
   ```

## 🔗 Integrações Implementadas

✅ **Com Contas a Pagar**: Lançamentos podem ser vinculados a AP
✅ **Com Contas a Receber**: Lançamentos podem ser vinculados a AR
✅ **Com Centro de Custos**: Novo lançamento pode ter centro de custo
✅ **Com Plano de Contas**: Novo lançamento pode ter categoria
✅ **Com Fluxo de Caixa**: Atualizado após conciliação
✅ **Com Auditoria**: Histórico completo de ações

## 📊 Banco de Dados - Estrutura

```
conciliation_bank_statements (principal)
├── id (UUID PK)
├── clinic_id (UUID FK → clinics)
├── statement_date (DATE)
├── description (TEXT)
├── amount (DECIMAL)
├── transaction_type (VARCHAR: 'credit'/'debit')
├── status (VARCHAR: pendente/conciliado/ajustado/divergente/ignorado)
├── linked_financial_id (UUID FK → ap_bills OU ar_invoices)
└── created_at, updated_at (TIMESTAMP)

conciliation_link_history (auditoria)
├── id (UUID PK)
├── bank_statement_id (FK)
├── financial_id (FK)
├── action (VARCHAR: conciliate/adjust/divergent/ignore/unlink)
├── action_notes (TEXT)
└── created_at (TIMESTAMP)

clinic_bank_accounts
├── id (UUID PK)
├── clinic_id (FK)
├── account_name (VARCHAR)
├── bank_name (VARCHAR)
├── account_number (VARCHAR)
├── bank_balance (DECIMAL)
├── system_balance (DECIMAL)
└── last_reconciliation_date (DATE)
```

## 🎓 Exemplos de Código

### Importar Extrato Manualmente
```javascript
import { importBankStatements } from '@/lib/conciliationApi';

await importBankStatements({
  clinicId: 'clinic-uuid',
  statements: [
    {
      date: '2026-01-10',
      description: 'PIX Recebido',
      amount: 1200,
      type: 'credit'
    }
  ],
  accountId: 'account-uuid'
});
```

### Buscar Sugestões
```javascript
import { findSuggestions } from '@/lib/conciliationApi';

const suggestions = await findSuggestions({
  clinicId: 'clinic-uuid',
  amount: 1200,
  description: 'PIX Recebido',
  transactionType: 'credit',
  statementDate: '2026-01-10'
});
// Retorna array com sugestões ordenadas por score
```

### Conciliar
```javascript
import { conciliateStatement } from '@/lib/conciliationApi';

await conciliateStatement(
  'statement-uuid',  // ID do lançamento de extrato
  'financial-uuid',  // ID do lançamento AP/AR
  'receivable'       // Tipo: 'payable' ou 'receivable'
);
```

---

## 💡 Dicas

- Use o exemplo_extrato.csv para testar
- Comece com alguns lançamentos simples
- Verifique se AP/AR têm dados antes de buscar sugestões
- O score de correspondência é baseado em valor (±5%) e data (±2 dias)
- Histórico completo fica em conciliation_link_history para auditoria

---

## 📞 Suporte

Se encontrar problemas:
1. Verifique se as migrations foram aplicadas
2. Verifique se clinic_id está sendo passado corretamente
3. Veja o console do navegador (F12) para erros
4. Verifique o Supabase Studio para dados inseridos
