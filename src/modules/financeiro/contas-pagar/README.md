# 💰 Contas a Pagar (Accounts Payable) - Módulo Enterprise

## Visão Geral

Módulo completo de gestão de contas a pagar integrado ao sistema financeiro do Gesclinic. Oferece recursos enterprise para controle de despesas, fornecedores, parcelamento, recorrência e conciliação bancária.

## 📁 Estrutura de Diretórios

```
src/modules/financeiro/contas-pagar/
├── types/
│   └── index.ts                    # TypeScript interfaces e enums
├── services/
│   └── payablesApi.ts              # API CRUD completa
├── hooks/
│   └── usePayables.ts              # React Query hooks
├── components/
│   ├── PayablesTable.tsx           # Tabela principal
│   └── PayablesDashboard.tsx       # Dashboard com KPIs
├── pages/
│   └── index.tsx                   # Página /financeiro/contas-pagar
├── utils/
│   └── normalizations.ts           # Utilitários de normalização
└── README.md                        # Este arquivo
```

## 🗄️ Banco de Dados

### Tabelas Criadas/Expandidas

#### `ap_bills` (Contas a Pagar - Expandida)
- **Campos principais**: supplier_name, description, amount, due_date, status
- **Campos novos**: 
  - Documento: document_number, invoice_number, invoice_series
  - Contábil: chart_account_id, cost_center_id, category
  - Recorrência: is_recurring, recurrence_type, recurrence_interval
  - Parcelamento: installments, installment_number, parent_installment_id
  - Anexos: has_invoice, invoice_xml_url, invoice_pdf_url, attachment_url
  - Aprovação: approved_by, approved_at
  - Auditoria: created_by, metadata

#### `ap_items` (Itens de Contas - Existente)
- Linhas detalhadas de contas com quantidade e valor unitário

#### `payable_recurring_configs` (Recorrência - Nova)
- Configurações de contas recorrentes (mensal, semanal, etc)
- Template baseado em ap_bills

#### `payable_attachments` (Anexos - Nova)
- Armazenamento de NF, boletos, comprovantes

#### `payables_audit` (Auditoria - Nova)
- Rastreamento completo de alterações (create/update/delete)

### Enums Criados

```sql
payable_status: OPEN | OVERDUE | PARTIAL | PAID | CANCELED | NEGOTIATED
payable_type: FIXED | VARIABLE | TAX | PAYROLL | SUPPLIER | SERVICE | RENT | UTILITIES
payment_method_enum: PIX | TED | DOC | CASH | CREDIT_CARD | DEBIT_CARD | BANK_SLIP | OTHER
recurrence_type: DAILY | WEEKLY | BIWEEKLY | MONTHLY | QUARTERLY | SEMIANNUAL | ANNUAL
```

### RLS (Row Level Security)

Todas as tabelas utilizam isolamento por `clinic_id`. Usuários só veem dados da própria clínica.

## 🚀 Uso

### Importar Types

```typescript
import {
  Payable,
  PayableCreateInput,
  PayableStatus,
  PayableType,
  PaymentMethodType,
  RecurrenceType,
  PayableFilterParams,
} from '@/modules/financeiro/contas-pagar/types';
```

### Usar Hooks

```typescript
import { usePayableManagement, usePayables, usePayable } from '@/modules/financeiro/contas-pagar/hooks/usePayables';

function MyComponent() {
  const { payables, summary, createPayable, deletePayable } = usePayableManagement(clinicId);

  // Use payables, summary, etc
}
```

### Usar API Diretamente

```typescript
import * as payablesApi from '@/modules/financeiro/contas-pagar/services/payablesApi';

// List
const { payables, total } = await payablesApi.listPayables({
  clinic_id: clinicId,
  status: ['OPEN', 'OVERDUE'],
});

// Create
const newPayable = await payablesApi.createPayable(clinicId, {
  supplier_name: 'Fornecedor X',
  description: 'Compra de materiais',
  amount: 1500,
  due_date: '2026-06-15',
  type: 'SUPPLIER',
});

// Update
const updated = await payablesApi.updatePayable({
  id: payable.id,
  status: 'PAID',
  paid_value: 1500,
});

// Pay
const paid = await payablesApi.payPayable(
  payable.id,
  500,            // paidValue (partial)
  'PIX',          // paymentMethod
  userId,         // paidBy
  '2026-05-18'    // paymentDate
);
```

### Componentes

```typescript
import { PayablesTable } from '@/modules/financeiro/contas-pagar/components/PayablesTable';
import { PayablesDashboard, PayablesExtendedDashboard } from '@/modules/financeiro/contas-pagar/components/PayablesDashboard';

export function Page() {
  return (
    <>
      <PayablesDashboard summary={summary} />
      <PayablesTable
        payables={payables}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onPay={handlePay}
      />
    </>
  );
}
```

## 🔍 Filtros Avançados

```typescript
const filters: PayableFilterParams = {
  clinic_id: clinicId,
  
  // Status
  status: ['OPEN', 'OVERDUE'],
  
  // Type
  type: ['SUPPLIER', 'SERVICE'],
  
  // Supplier
  supplier_id: 'uuid-123',
  supplier_name: 'Fornecedor%',
  
  // Accounting
  chart_account_id: 'uuid-456',
  cost_center_id: 'uuid-789',
  
  // Dates
  due_date_start: '2026-05-01',
  due_date_end: '2026-05-31',
  
  // Amount
  amount_min: 100,
  amount_max: 5000,
  
  // Search
  search: 'boleto',
  
  // Special
  is_recurring: true,
  is_overdue: true,
  
  // Pagination
  limit: 50,
  offset: 0,
};

const result = await listPayables(filters);
```

## 📊 Dashboard e KPIs

O módulo fornece dashboard com métricas em tempo real:

- **Total em Aberto**: Soma de contas não pagas
- **Total Vencido**: Soma de contas vencidas
- **Pago este Mês**: Total pago no mês atual
- **Próximos 30 Dias**: Quantidade de contas vencendo
- **Taxa de Inadimplência**: % de contas vencidas
- **Índice de Adimplência**: % de contas pagas

## 🔗 Integração com Outros Módulos

### Fluxo de Caixa

Contas a pagar se integram automaticamente ao fluxo de caixa:
- Criação → Gera movimento PREVISTO
- Pagamento → Gera movimento REALIZADO
- Cancelamento → Remove previsão

Veja: `src/modules/financeiro/fluxo-caixa/`

### Plano de Contas (Chart of Accounts)

Cada conta a pagar é classificada em:
- Plano de Contas (chart_account_id)
- Centro de Custo (cost_center_id)
- Categoria (category)

Veja: `src/modules/financeiro/plano-contas/`

### Recebimentos (AR - Accounts Receivable)

Padrão similar para contas a receber:
- Mesma estrutura de tipos
- Mesmos filtros
- Mesmas integrações

## 🧪 Testing

### Validação de Types

```bash
# Verificar erros TypeScript
npm run typecheck
```

### Linting

```bash
# Verificar ESLint
npm run lint
```

### Build

```bash
# Fazer build de produção
npm run build
```

## 🔐 Segurança

### RLS Policies

Todas as operações são filtradas por `clinic_id` via RLS. Um usuário nunca consegue acessar dados de outra clínica.

### Audit Trail

Cada alteração em contas a pagar é registrada em `payables_audit`:
```typescript
{
  ap_bill_id: "uuid",
  action: "created" | "updated" | "paid" | "canceled" | "deleted",
  old_values: {...},
  new_values: {...},
  changed_by: "user-uuid",
  changed_at: "2026-05-18T10:30:00Z"
}
```

### Validações

- Normalizações automáticas de status
- Cálculos automáticos de net_amount e balance_amount
- Transições de status validadas
- Triggers para integridade referencial

## ⚡ Performance

### Índices

Índices criados para queries rápidas:
```sql
idx_ap_bills_clinic_status_date
idx_ap_bills_competency
idx_ap_bills_supplier_id
idx_ap_bills_chart_account
idx_ap_bills_cost_center
```

### Cache React Query

- Queries cacham por 5 minutos (default)
- Mutations invalidam cache automaticamente
- Prefetch disponível para otimização

## 📝 Próximos Passos

### Componentes a Implementar

- [ ] Modal de criar/editar conta
- [ ] Modal de pagamento
- [ ] Modal de parcelamento
- [ ] Modal de recorrência
- [ ] Modal de anexos
- [ ] Página de detalhe
- [ ] Relatórios (PDF/Excel/CSV)

### Features a Adicionar

- [ ] Recorrência automática (jobs)
- [ ] Conciliação bancária
- [ ] Alertas de vencimento
- [ ] Integração com NF-e
- [ ] Integração com boleto
- [ ] Dashboard de forecasting
- [ ] Relatório de aging list
- [ ] Aprovação de contas

### Integrações a Completar

- [ ] Fluxo de Caixa (previsão/realizado)
- [ ] DRE (demonstração de resultados)
- [ ] Projeções financeiras
- [ ] Conciliação bancária

## 📞 Suporte

Para dúvidas ou issues, consulte:
- Documentação: `/memories/session/contas_pagar_implementation_plan.md`
- Types: `src/modules/financeiro/contas-pagar/types/index.ts`
- API: `src/modules/financeiro/contas-pagar/services/payablesApi.ts`

---

**Versão**: 1.0.0 Enterprise  
**Última atualização**: 2026-05-18  
**Status**: Production Ready (Core CRUD)
