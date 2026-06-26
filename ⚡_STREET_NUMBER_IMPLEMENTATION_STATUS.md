# ✅ STREET/NUMBER FIELD - IMPLEMENTATION COMPLETE

## 📊 Status Atual

### ✅ PRONTO - Código Front-end
- [x] `src/lib/stockApi.js` - API layer atualizada
- [x] `src/modules/financeiro/contas-pagar/components/modals/CreateEditPayableModal.tsx` - Modal component atualizado
- [x] Todos os 4 SELECT queries em stockApi.js incluem as novas colunas
- [x] npm run build passou com sucesso

### 🔴 PENDENTE - Database Schema
- [ ] Aplicar migração SQL para adicionar colunas `street` e `number` à tabela `stock_suppliers`

### ⏳ PRÓXIMO - Validação End-to-End
- [ ] Testar XML supplier import
- [ ] Verificar se street field agora popula corretamente

---

## 🚀 PRÓXIMOS PASSOS (IMEDIATO)

### Opção A: Manual (Recomendado - mais rápido)
1. Abra Supabase Dashboard: https://app.supabase.com/project/gvdkdjyupktlflwurike/sql
2. Clique em "New Query"
3. Cole este SQL:

```sql
ALTER TABLE public.stock_suppliers
ADD COLUMN IF NOT EXISTS street TEXT,
ADD COLUMN IF NOT EXISTS number TEXT;

COMMENT ON COLUMN public.stock_suppliers.street IS 'Rua/Logradouro do fornecedor (extraído do endereço ou XML)';
COMMENT ON COLUMN public.stock_suppliers.number IS 'Número do logradouro';
COMMENT ON COLUMN public.stock_suppliers.address IS 'Endereço completo - Mantido para compatibilidade legada';
```

4. Clique em "RUN"
5. Resultado esperado: "Command OK"

### Opção B: Automático via Script
```powershell
.\scripts\apply_street_number_migration.ps1
```

### Opção C: Documentação Completa
Ver arquivo: `⚡_MIGRATION_MANUAL_SUPABASE_DASHBOARD.md`

---

## ✔️ Depois de Aplicar a Migration

### 1. Iniciar app
```bash
npm run dev
```

### 2. Testar XML Import
- Ir para: **Módulo Financeiro** > **Contas a Pagar** > **Fornecedores**
- Importar/Criar novo fornecedor via XML
- Verificar se campo "Rua" agora aparece preenchido

### 3. Validar no Banco
No Supabase Dashboard > SQL Editor, execute:

```sql
SELECT id, name, street, number, address 
FROM stock_suppliers 
WHERE clinic_id = '[seu-clinic-id]'
ORDER BY created_at DESC
LIMIT 1;
```

Deve mostrar:
- **street**: Valor do logradouro (ex: "Rua das Flores")
- **number**: Número do logradouro (ex: "123")
- **address**: Completo (ex: "Rua das Flores, 123 - Bairro - Cidade")

---

## 📁 Arquivos Modificados

| Arquivo | Mudança | Status |
|---------|---------|--------|
| src/lib/stockApi.js | API layer: ensureFromDocument(), create(), update(), 4x SELECT | ✅ Pronto |
| CreateEditPayableModal.tsx | Passa street/number separados | ✅ Pronto |
| supabase/migrations/20260623235959_add_stock_suppliers_street_number.sql | Nova migration | ✅ Pronto p/ aplicar |
| payableDocumentParser.ts | Nenhuma mudança necessária | ✅ Já correto |

---

## 🔍 Checklist Final

Após aplicar a migration e testar:

- [ ] SQL migration executada com sucesso (Status: Command OK)
- [ ] npm run dev inicia sem erros
- [ ] Importar XML com fornecedor
- [ ] Campo "Rua" preenchido na forma de edição
- [ ] Salvar novo fornecedor
- [ ] Query no banco mostra valores em street e number
- [ ] Página carrega dados do fornecedor corretamente

---

## 🎯 Ponto de Partida

**Você está aqui:** Aplicar migration SQL

**Próximo:** Validação end-to-end

**Fim:** Street field funcionando em supplier imports
