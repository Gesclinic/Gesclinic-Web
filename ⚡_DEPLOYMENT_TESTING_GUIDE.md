# Enterprise Financial Module - Deployment & Testing Guide

## 📋 Pre-Deployment Checklist

### ✅ Code Generation Complete
- [x] Database migration SQL created
- [x] TypeScript types defined
- [x] React components built (5 new components)
- [x] API service extended
- [x] Custom hook enhanced
- [x] Main page redesigned
- [x] No compilation errors

### ⏭️ Next: Database Migration

## 🗄️ Step 1: Execute Database Migration

### Option A: Supabase Dashboard (Manual)
1. Go to: https://supabase.com/dashboard/project/gvdkdjyupktlflwurike/sql/new
2. Copy entire SQL from: `supabase/migrations/2026-05-13_expand_financial_accounts_enterprise.sql`
3. Paste into SQL Editor
4. Click "Run" button
5. Verify: All queries execute successfully

### Option B: PowerShell Script (Automated)
```powershell
# Location: c:\dev\gesclinic-web\scripts\
# Execute finance migration script
.\apply_finance_migrations.ps1
```

### Verification After Migration
```sql
-- Check new columns on financial_accounts
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'financial_accounts' 
  AND column_name IN (
    'bank_code', 'account_chart_code', 'participates_cashflow',
    'allows_reconciliation', 'reconciliation_status', 'balance_reconciled'
  );

-- Check new tables created
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('account_movements', 'account_reconciliation');

-- Check RLS policies
SELECT policyname 
FROM pg_policies 
WHERE tablename IN ('account_movements', 'account_reconciliation');
```

## 🧪 Step 2: Test in Development

### Start Dev Server
```bash
cd c:\dev\gesclinic-web
npm run dev
# Should start on http://localhost:3000 with no TypeScript errors
```

### Test the Module UI
1. Login with test user: `GESCL-DEMO-0001` / password
2. Navigate to: `/clinica/financeiro/contas-financeiras`
3. Verify page loads without errors

### Test Dashboard Metrics
- [ ] 6 metric cards display (even with 0 values initially)
- [ ] Cards show: Total, Reconciled, Entries Today, Exits Today, Forecast, Projected
- [ ] Currency formatting works (R$ format)
- [ ] Color coding is correct

### Test Account Display
- [ ] Toggle between "Cards" and "Table" views works
- [ ] Card view shows enriched account information:
  - Bank name, account type, current balance
  - Reconciliation status badge
  - Last movement info (if exists)
  - Enterprise fields display
- [ ] All action buttons present and clickable

### Test Recent Movements
- [ ] Recent movements panel displays (empty initially)
- [ ] When movements are added, they appear in the list
- [ ] Pagination works when >10 movements

### Test Reconciliation Panel
- [ ] Can select an account for reconciliation
- [ ] Form accepts statement balance input
- [ ] Difference is calculated correctly
- [ ] Can submit reconciliation record
- [ ] History displays after submission

## 📝 Step 3: Add Test Data (After Migration)

### Create Test Movements
```sql
INSERT INTO public.account_movements (clinic_id, account_id, movement_date, description, amount, movement_type, origin)
VALUES 
  ('dcee437c-fd14-463c-b25e-a318f5da60b7', 'a9d78b23-c616-4415-8253-9a53a6211a7a', NOW()::DATE, 'Depósito teste', 1000.00, 'entrada', 'teste'),
  ('dcee437c-fd14-463c-b25e-a318f5da60b7', 'a9d78b23-c616-4415-8253-9a53a6211a7a', NOW()::DATE, 'Saque operacional', 500.00, 'saida', 'teste');
```

### Create Test Reconciliation
```sql
INSERT INTO public.account_reconciliation (clinic_id, account_id, reconciliation_date, balance_statement, balance_system, status)
VALUES 
  ('dcee437c-fd14-463c-b25e-a318f5da60b7', 'a9d78b23-c616-4415-8253-9a53a6211a7a', NOW()::DATE, 1500.00, 1500.00, 'conciliado');
```

## 🔄 Step 4: Component Integration Testing

### Test DashboardMetricsCards
```typescript
// Should render without errors even with default metrics
const metrics = {
  total_balance: 1500.00,
  reconciled_balance: 1500.00,
  entries_today: 1000.00,
  exits_today: 500.00,
  forecast_7_days: 0,
  projected_balance: 1500.00,
};
```

### Test FinancialAccountCardRich
- [ ] All fields display correctly
- [ ] Action buttons are clickable
- [ ] Reconciliation status shows correct color
- [ ] Last movement displays if present

### Test RecentMovementsPanel
- [ ] Pagination controls appear when >10 items
- [ ] Movement type icons correct (up/down arrows)
- [ ] Amounts formatted correctly
- [ ] Origin badges display

### Test ReconciliationPanel
- [ ] Form fields accept input
- [ ] Difference calculation is accurate
- [ ] History shows past reconciliations
- [ ] Status badges color correctly

## 🐛 Troubleshooting

### If dashboard metrics show 0 values
- Check that account exists in database
- Verify movements table is empty (expected for new setup)
- Metrics calculation is correct; add test movements

### If new components don't render
- Check browser console for errors
- Verify imports in page component
- Check TypeScript compilation

### If reconciliation fails
- Verify database migration was executed
- Check RLS policies on account_reconciliation table
- Verify clinic_id is correctly passed

## ✨ Phase 2: Modal Enhancement (Future)

When ready, the next phase will add these fields to the create/edit form:
- [ ] banco (bank_code input)
- [ ] conta_contábil (accounting code)
- [ ] centro_custo (cost center select)
- [ ] fluxo_caixa (toggle)
- [ ] conciliação (toggle)
- [ ] saldo_inicial (date)
- [ ] limite (credit limit)

## 📞 Support

If issues arise:
1. Check browser DevTools console for errors
2. Check Supabase logs for API errors
3. Verify RLS policies in Supabase dashboard
4. Check that migration executed successfully
5. Verify data exists in tables

---

**Status**: Ready for deployment ✅
**Last Updated**: 2026-05-13
**Next Checkpoint**: After database migration execution
