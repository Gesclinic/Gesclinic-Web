# 📊 INTEGRAÇÃO ETAPA 5 & DASHBOARD

---

## ✅ ETAPA 5 - ALERTAS FINANCEIROS

### 1️⃣ Executar SQL no Supabase

```bash
# Copie todo o conteúdo de:
supabase/migrations/20260523_ETAPA5_ALERTAS_FINANCEIROS.sql

# Cole e execute no SQL Editor do Supabase
# Dashboard → SQL Editor → Novo Query → Cole → Run
```

**O que será criado:**
- ✅ Tabela `alerts` - Armazena todos os alertas
- ✅ 5 Functions para detectar e resolver alertas
- ✅ 2 Triggers automáticos
- ✅ 3 Views para dashboard

---

## 2️⃣ DASHBOARD REACT - ETAPA 4

### Instalação de Dependências

```bash
cd c:\dev\gesclinic-web
npm install recharts
```

**Dependências utilizadas:**
- `recharts` - Gráficos (LineChart, BarChart, PieChart)
- `lucide-react` - Ícones
- Componentes UI existentes (Card, CardHeader, etc)

---

## 3️⃣ Registrar Rotas

### Adicionar em `src/AppRoutes.jsx`

```jsx
import { DashboardDRE } from './pages/financeiro/DashboardDRE';

// Dentro de AppRoutes, na seção de Financeiro:
{
  path: '/clinica/financeiro/dashboard',
  element: (
    <ProtectedRoute>
      <AppLayout>
        <DashboardDRE />
      </AppLayout>
    </ProtectedRoute>
  ),
}
```

### Ou adicionar a tab em página existente

Se preferir adicionar como tab na página `/clinica/financeiro/repasse`:

```jsx
import { DashboardDRE } from './components/DashboardDRE';

// No componente da página Repasse:
const [activeTab, setActiveTab] = useState('visao-geral');

return (
  <>
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList>
        <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
        <TabsTrigger value="dashboard">📊 Dashboard DRE</TabsTrigger>
      </TabsList>
      <TabsContent value="dashboard">
        <DashboardDRE />
      </TabsContent>
    </Tabs>
  </>
);
```

---

## 4️⃣ EXECUTAR E TESTAR

### Iniciar Dev Server

```bash
npm run dev
# Acesse: http://localhost:3000/clinica/financeiro/dashboard
```

### O que Você Verá:

1. **KPIs Card** - 6 cards com métricas principais
   - Contas a Receber (R$)
   - Contas Pagas (R$)
   - Taxa de Recebimento (%)
   - Repasses Pendentes (R$)
   - Repasses Pagos (R$)
   - Total em Repasses (R$)

2. **Alertas** - Badge com contagem de alertas críticos/médios/baixos
   - Aparece apenas se houver alertas pendentes
   - Color-coded por severidade

3. **Gráficos**
   - Fluxo de Caixa Diário (últimos 30 dias)
   - Fluxo de Caixa Mensal (últimos 12 meses)

4. **Tabelas**
   - Análise de Inadimplência (contas >30 dias atrasadas)
   - Contribuição de Profissionais (faturamento vs recebimento)

---

## 5️⃣ USANDO AS QUERIES DIRETAMENTE

### Em Componentes React

```javascript
// Query KPIs
const { data: kpis } = await supabase
  .from('v_executive_kpis')
  .select('*')
  .eq('clinic_id', clinicId);

// Query Alertas
const { data: alerts } = await supabase
  .from('v_alerts_summary_by_clinic')
  .select('*')
  .eq('clinic_id', clinicId);

// Query Inadimplência
const { data: overdue } = await supabase
  .from('v_delinquency_analysis')
  .select('*')
  .eq('clinic_id', clinicId);
```

---

## 6️⃣ EXECUTAR VERIFICAÇÃO DE ALERTAS

### Manual (Sempre que Desejar)

```sql
SELECT * FROM run_all_alert_checks();
```

Retorna JSONB com resumo de alertas criados.

### Automático (Recomendado - 1x/dia)

Use Supabase Cron Job ou Temporal (criar em próxima sprint).

```sql
-- Agenda para executar diariamente às 2 AM UTC
SELECT cron.schedule('check-financial-alerts', '0 2 * * *', 'SELECT run_all_alert_checks()');
```

---

## 7️⃣ RESOLVER ALERTAS

### Automático

Quando uma conta é marcada como paga ou um repasse é pago:

```javascript
// Atualizar conta para paga
await supabase
  .from('ar_invoices')
  .update({ status: 'paid' })
  .eq('id', invoiceId);

// ✅ Trigger automático resolve todos os alertas relacionados!
```

### Manual

```sql
-- Resolver alertas de uma conta específica
SELECT * FROM resolve_invoice_alerts('invoice-uuid-here');

-- Resolver alertas de um repasse específico
SELECT * FROM resolve_repayment_alerts('repayment-uuid-here');
```

---

## 8️⃣ OTIMIZAÇÕES & PRÓXIMAS MELHORIAS

### Já Implementado ✅
- ✅ Loading states
- ✅ Gradientes e styling Tailwind
- ✅ Ícones Lucide
- ✅ Gráficos Recharts
- ✅ Tabelas responsivas
- ✅ Cards KPI com cores por métrica

### Para Próxima Sprint:
- 📌 Exportar dashboard como PDF
- 📌 Filtros avançados (data range, profissionais)
- 📌 Alertas sonoros para contas críticas
- 📌 Integração com email/SMS
- 📌 Drill-down em gráficos
- 📌 Cache de dados com 5min TTL

---

## 9️⃣ TROUBLESHOOTING

### "View não existe"
```bash
# Verifique se o SQL foi executado
SELECT * FROM v_executive_kpis LIMIT 1;
# Se der erro, execute novamente: supabase/migrations/20260523_ETAPA5_ALERTAS_FINANCEIROS.sql
```

### "Sem dados no dashboard"
```bash
# Verifique se há dados na clínica
SELECT COUNT(*) FROM ar_invoices WHERE clinic_id = 'seu-clinic-id';
SELECT COUNT(*) FROM appointments WHERE clinic_id = 'seu-clinic-id';
```

### "Gráfico não aparece"
```bash
# Verifique se há dados para o período
SELECT * FROM v_daily_financial_summary WHERE clinic_id = 'seu-clinic-id' LIMIT 5;
# Se vazio, crie alguns atendimentos de teste
```

---

## 🔟 RESUMO RÁPIDO

| Componente | Arquivo | Status | Próximo Passo |
|---|---|---|---|
| ETAPA 5 SQL | supabase/migrations/20260523_ETAPA5_ALERTAS_FINANCEIROS.sql | ✅ Pronto | Executar no Supabase |
| Dashboard React | src/pages/financeiro/DashboardDRE.jsx | ✅ Pronto | Registrar rota |
| Dependências | recharts | ✅ Pronto | npm install recharts |
| Alertas Automáticos | run_all_alert_checks() | ✅ Pronto | Agendar job diário |

---

## 🎯 FLUXO COMPLETO DE AUTOMAÇÃO

```
1. Appointment Finalizado (official_status = 'completed')
   ↓ [Trigger ETAPA 3]
2. Conta a Receber Criada (ar_invoices)
   ↓ [Automático]
3. Repasse Médico Calculado (professional_repayments, status='pending')
   ↓ [Job Diário]
4. Alertas Verificados (check_overdue_invoices, check_pending_repayments)
   ↓ [Trigger]
5. Dashboard Atualizado (v_executive_kpis, v_pending_alerts, etc)
   ↓
6. UI Exibe em Tempo Real ✅
```

---

**Status:** ✅ PRONTO PARA PRODUÇÃO

*Gerado em: 23/05/2026*
