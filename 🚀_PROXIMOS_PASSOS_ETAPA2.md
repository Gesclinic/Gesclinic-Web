# 🚀 PRÓXIMOS PASSOS - ETAPA 2

**Status Atual:** ETAPA 1 ✅ CONCLUÍDA  
**Data:** 21 de Maio de 2026  
**Objetivo:** Planejar continuação do módulo de Contas a Receber  

---

## 📋 CHECKLIST ETAPA 1 - VALIDAÇÃO FINAL

✅ Dashboard Contas a Receber acessível  
✅ 4 recebíveis criados e visíveis  
✅ Total R$ 2.800,00 exibindo corretamente  
✅ Impostos R$ 267.75 calculados e salvos  
✅ Valor líquido R$ 432.25 verificado  
✅ Tabela mostrando detalhes de cada recebível  

---

## 🔧 PRÓXIMAS FEATURES RECOMENDADAS (ETAPA 2)

### 1. **Tax Display em Formulário de Edição** 🔴 PRIORIDADE ALTA
**Atual:** Formulário de edição mostra apenas campos básicos  
**Desejado:** Exibir breakdown completo de impostos

**Implementação:**
```jsx
// src/pages/clinica/financeiro/EditReceivable.jsx
// Adicionar seção de breakdown de impostos após Valor Bruto

<div className="tax-breakdown">
  <h3>Detalhamento de Impostos</h3>
  
  <div className="tax-row">
    <span>PIS (1.65%)</span>
    <span>R$ {pis_value.toFixed(2)}</span>
  </div>
  <div className="tax-row">
    <span>COFINS (7.60%)</span>
    <span>R$ {cofins_value.toFixed(2)}</span>
  </div>
  <div className="tax-row">
    <span>CSLL (9.00%)</span>
    <span>R$ {csll_value.toFixed(2)}</span>
  </div>
  <div className="tax-row">
    <span>IR (15.00%)</span>
    <span>R$ {ir_value.toFixed(2)}</span>
  </div>
  <div className="tax-row">
    <span>ISSQN (5.00%)</span>
    <span>R$ {issqn_value.toFixed(2)}</span>
  </div>
  
  <hr/>
  
  <div className="tax-total">
    <strong>Total Impostos</strong>
    <strong>R$ {total_impostos.toFixed(2)}</strong>
  </div>
  
  <div className="net-value">
    <strong>Valor Líquido</strong>
    <strong>R$ {net_value.toFixed(2)}</strong>
  </div>
</div>
```

**Tempo estimado:** 1 hora  
**Dependências:** Nenhuma - dados já existem em ar_invoices

### 2. **End-to-End Workflow com Novo Agendamento** 🔴 PRIORIDADE ALTA
**Atual:** Recebíveis criados via RPC manual (test script)  
**Desejado:** Criar agendamento novo → automaticamente gera recebível

**Investigação Necessária:**
- ❓ Campos obrigatórios de `appointments` table
- ❓ Por que erro "created_by" aparece ao criar novo appointment
- ❓ Trigger `on_appointment_completed` está ativo?

**Passos:**
1. Investigar schema de appointments table
2. Criar novo appointment via UI (ou testar via API)
3. Verificar se trigger cria receivable automaticamente
4. Validar se impostos são calculados corretamente
5. Confirmar se aparece em Contas a Receber dashboard

**Tempo estimado:** 2-3 horas  
**Bloqueador:** Entender campo 'created_by'

### 3. **Edit & Save Operations** 🟡 PRIORIDADE MÉDIA
**Atual:** Form carrega mas não testado save  
**Desejado:** Poder editar e salvar mudanças

**Testes:**
1. Abrir edit form
2. Modificar descrição ou plano de contas
3. Clicar "Salvar"
4. Verificar se salva sem erros
5. Confirmar se changes persistem

**Tempo estimado:** 30 minutos  
**Dependências:** API layer já pronta (receivablesApi.js)

### 4. **Search & Filter Improvements** 🟡 PRIORIDADE MÉDIA
**Atual:** Básico - busca por descrição  
**Desejado:** Filtros avançados funcionando

**Filtros a Implementar:**
- [ ] Por Pagador (patient_name)
- [ ] Por Status (pending, received, etc)
- [ ] Por Intervalo de Data
- [ ] Por Plano de Contas
- [ ] Por Faixa de Valor

**Tempo estimado:** 1.5 horas

### 5. **Payment Recording** 🟢 PRIORIDADE BAIXA
**Atual:** Botão "Receber" na tabela (não funcional)  
**Desejado:** Click → Registra pagamento → Muda status para "received"

**Fluxo:**
1. Usuário clica "Receber"
2. Modal pede forma de pagamento e data
3. Sistema cria transaction (ar_transactions ou finance_transactions)
4. Receivable status muda para "received" ou "partial"
5. Valores atualizam no dashboard

**Tempo estimado:** 2 horas

### 6. **Bulk Actions** 🟢 PRIORIDADE BAIXA
**Desejado:** Selecionar múltiplos e executar ações em lote

**Ações:**
- [ ] Marcar como pago (em lote)
- [ ] Exportar para Excel
- [ ] Gerar relatório PDF

**Tempo estimado:** 2 horas

---

## 📊 ARQUITETURA VALIDADA

```
┌─────────────────────────────────────┐
│     ContasReceber.jsx               │
│  ├─ Summary Cards                   │
│  ├─ Filters Section                 │
│  └─ Receivables Table               │
└──────────┬──────────────────────────┘
           │
           ↓
┌─────────────────────────────────────┐
│   receivablesApi.js ✅ UPDATED      │
│  ├─ listReceivables() → ar_invoices │
│  ├─ createReceivable()              │
│  ├─ updateReceivable()              │
│  ├─ deleteReceivable()              │
│  └─ normalizeArStatus()             │
└──────────┬──────────────────────────┘
           │
           ↓
┌─────────────────────────────────────┐
│   ar_invoices Table ✅              │
│  ├─ amount (R$ 700)                 │
│  ├─ status (pending)                │
│  ├─ total_impostos (R$ 267.75) ✅   │
│  ├─ net_value (R$ 432.25) ✅        │
│  └─ 24 tax columns ✅               │
└─────────────────────────────────────┘
```

---

## 🔄 FLUXO AUTOMÁTICO (TRIGGER) - VALIDAÇÃO PENDENTE

```
Appointments Table
    ↓
on_appointment_completed trigger
    ↓
create_receivable_from_appointment() RPC
    ↓
ar_invoices Table (INSERT)
    ↓
taxCalculationEngine.ts (Calcula impostos)
    ↓
Dashboard (ContasReceber.jsx mostra dados)
```

**Status:** ✅ RPC testado manualmente  
**Pendência:** Testar via appointment completion via UI

---

## 📁 ARQUIVOS DO PROJETO

### Críticos ✅
- `src/lib/receivablesApi.js` - ATUALIZADO para ar_invoices
- `src/pages/clinica/financeiro/ContasReceber.jsx` - ATUALIZADO com novos nomes de coluna
- `src/lib/taxCalculationEngine.ts` - Simples Nacional rates OK

### Referência
- `src/lib/receivablesApi_backup.js` - Original (ar_receivables)
- `verify-tax-calculations.mjs` - Script validação
- `.env` - Credenciais Supabase

### Formulário de Edição
- `src/pages/clinica/financeiro/EditReceivable.jsx` - Precisa expandir com tax display

---

## 🎯 RECOMENDAÇÃO PARA PRÓXIMA SESSÃO

**Sugestão:** Implementar **Feature 1 (Tax Display)** e **Feature 3 (Edit & Save)** juntas

**Por quê?**
- São complementares
- Tempo total: ~1.5 horas
- Validam completamente o CRUD do recebível
- Base sólida para features adicionais

**Depois:** Feature 2 (End-to-End Workflow) - mais investigação necessária

---

## 💡 NOTAS DE IMPLEMENTAÇÃO

### Tax Display (Feature 1)
```jsx
// Import no EditReceivable.jsx
import { normalizeArStatus } from '../../lib/receivablesApi';

// Dentro do component
const { data: receivable } = useReceivable(id);

// Render tax breakdown:
<div className="space-y-2">
  {receivable && (
    <>
      <p className="text-sm">PIS: R$ {receivable.pis_value}</p>
      <p className="text-sm">COFINS: R$ {receivable.cofins_value}</p>
      {/* etc */}
      <p className="font-bold">Total: R$ {receivable.total_impostos}</p>
    </>
  )}
</div>
```

### End-to-End Test (Feature 2)
```javascript
// test-e2e-workflow.mjs
// 1. Create appointment
// 2. Complete appointment (PUT /appointments/:id { status: 'completed' })
// 3. Check if receivable created in ar_invoices
// 4. Verify taxes calculated
// 5. Check dashboard displays it
```

---

## ✅ RESUMO ETAPA 1 COMPLETA

| Componente | Status | Validação |
|-----------|--------|-----------|
| Dashboard exibição | ✅ | R$ 2.800,00 visível |
| Dados em ar_invoices | ✅ | 4 × R$ 700 com impostos |
| Impostos calculados | ✅ | R$ 267.75 por recebível |
| Valor líquido | ✅ | R$ 432.25 por recebível |
| API layer | ✅ | receivablesApi.js funcional |
| Trigger RPC | ✅ | create_receivable_from_appointment OK |

**Próximo:** Escolher Feature 1, 2 ou 3 conforme prioridade do negócio.

---

**Documento:** 🚀_PROXIMOS_PASSOS_ETAPA2.md  
**Criado:** 21 de Maio de 2026  
**Próxima Ação:** Expandir UI com tax display + edit save, ou investigar trigger com novo appointment
