# 🧪 INTEGRATION TESTS + DASHBOARD QUICK START

**Status**: ✅ Ready to Deploy  
**Date**: 2026-05-25

---

## 1️⃣ Running Integration Tests

### Setup
```bash
# Make sure dependencies are installed
npm install

# Start dev server
npm run dev
```

### Execute Tests (Option A: Console)
```javascript
// In browser DevTools Console (F12)
import { runAllIntegrationTests } from '@/lib/integrationTests.js';

// Get your clinic ID (from useAuth or useClinicContext)
const clinicId = 'your-clinic-id-here';

// Run all 6 tests
const result = await runAllIntegrationTests(clinicId);

console.log(result);
// {
//   success: true,
//   results: [
//     { success: true, testName: 'TEST 1: Create Receivable', data: {...} },
//     { success: true, testName: 'TEST 2: Register Payment with Parcelamento', data: {...} },
//     { success: true, testName: 'TEST 3: Settle Payment Atomically', data: {...} },
//     { success: true, testName: 'TEST 4: Calculate Medical Commission with Taxes', data: {...} },
//     { success: true, testName: 'TEST 5: Import Bank Transaction', data: {...} },
//     { success: true, testName: 'TEST 6: Auto-Reconcile with Confidence', data: {...} }
//   ],
//   passCount: 6,
//   failCount: 0
// }
```

### Execute Tests (Option B: Component)
Create a test page:

**File**: `src/pages/admin/TestSuite.jsx`

```jsx
import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { runAllIntegrationTests } from '@/lib/integrationTests';

export default function TestSuite() {
  const { clinicId } = useAuth();
  const [results, setResults] = useState(null);
  const [running, setRunning] = useState(false);

  const handleRunTests = async () => {
    setRunning(true);
    const result = await runAllIntegrationTests(clinicId);
    setResults(result);
    setRunning(false);
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">Integration Tests</h1>
      
      <button
        onClick={handleRunTests}
        disabled={running}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {running ? 'Running...' : 'Run All Tests'}
      </button>

      {results && (
        <div className="mt-6">
          <h2 className="text-2xl font-bold mb-4">
            {results.success ? '✅ All Tests Passed!' : '❌ Some Tests Failed'}
          </h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
```

---

## 2️⃣ DRE Dashboard Integration

### Add to Routes
**File**: `src/AppRoutes.jsx`

```jsx
import DREDashboard from '@/components/financeiro/DRE/DREDashboard';

// Add to clinica/financeiro routes:
{
  path: 'dre',
  element: <DREDashboard />
}

// Now accessible at: /clinica/financeiro/dre
```

### Add to Navigation Menu
**File**: `src/components/layout/Sidebar.jsx`

```jsx
{
  name: 'DRE Dashboard',
  path: '/clinica/financeiro/dre',
  icon: '📊'
}
```

### Test DRE Dashboard
1. Navigate to `/clinica/financeiro/dre`
2. Should see KPI cards loading
3. Verify monthly chart renders
4. Check profitability table populates

---

## 3️⃣ Real-Time Alerts Integration

### Add to App Layout
**File**: `src/components/layout/AppLayout.jsx`

```jsx
import RealtimeAlertsManager from '@/components/financeiro/RealtimeAlertsManager';

export default function AppLayout() {
  return (
    <>
      {/* Add this component */}
      <RealtimeAlertsManager />
      
      <Sidebar />
      <main>
        <Outlet />
      </main>
    </>
  );
}
```

### Request Notification Permission
**File**: `src/main.jsx` or `src/App.jsx`

```jsx
useEffect(() => {
  // Request browser notification permission
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
      .then(permission => {
        console.log('Notification permission:', permission);
      });
  }
}, []);
```

### Test Real-Time Alerts
1. Open console in DevTools
2. Make a database change (e.g., update payment status)
3. Should see alert toast in bottom-right corner
4. Check browser notifications (if permitted)

---

## 4️⃣ Manual Testing Workflow

### Test 1: Create Receivable
```sql
-- Supabase SQL Editor
INSERT INTO ar_receivables (
  clinic_id, payer_name, payer_document, 
  service_description, original_amount
) VALUES (
  'YOUR-CLINIC-ID', 'Test Patient', '12345678901',
  'Consultation', 250.00
) RETURNING *;
```

### Test 2: Create Payment
```sql
INSERT INTO ar_payments (
  clinic_id, receivable_id, payment_amount,
  payment_date, payment_method, status
) VALUES (
  'YOUR-CLINIC-ID', 'RECEIVABLE-ID', 250.00,
  NOW()::date, 'pix', 'pending'
) RETURNING *;
```

### Test 3: Create Settlement
```sql
INSERT INTO payment_settlements (
  clinic_id, payment_id, receivable_id,
  settlement_amount, settlement_date, status
) VALUES (
  'YOUR-CLINIC-ID', 'PAYMENT-ID', 'RECEIVABLE-ID',
  250.00, NOW()::date, 'completed'
) RETURNING *;
```

### Test 4: View DRE Metrics
```sql
SELECT * FROM dre_periods
WHERE clinic_id = 'YOUR-CLINIC-ID'
ORDER BY period_start_date DESC
LIMIT 5;
```

### Test 5: Check Alerts Triggered
```sql
SELECT * FROM dre_periods
WHERE clinic_id = 'YOUR-CLINIC-ID'
  AND gross_margin_pct < 20;
```

---

## 5️⃣ Performance Verification

### Check Indexes
```sql
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename;
```

### Check Query Performance
```sql
EXPLAIN ANALYZE
SELECT * FROM dre_periods
WHERE clinic_id = 'YOUR-CLINIC-ID'
ORDER BY period_start_date DESC
LIMIT 12;
```

Expected: < 10ms with proper indexes

---

## 6️⃣ Troubleshooting

### Alerts not appearing?
```javascript
// Check subscription status
supabase.getChannels()
// Should show 5 channels for payments, dre, commissions, etc.
```

### DRE data not loading?
```sql
-- Verify data exists
SELECT COUNT(*) as dre_count FROM dre_periods
WHERE clinic_id = 'YOUR-CLINIC-ID';

-- Check RLS policies
SELECT * FROM pg_policies 
WHERE tablename = 'dre_periods';
```

### Real-time not working?
1. Check Supabase project settings: Realtime should be enabled
2. Verify RLS policies allow access
3. Check browser console for errors
4. Ensure clinicId is correct

---

## 7️⃣ Deployment Checklist

- [ ] All 6 integration tests pass
- [ ] DRE Dashboard displays correctly
- [ ] Real-time alerts appear within 2 seconds
- [ ] No console errors in production build
- [ ] Supabase RLS policies verified
- [ ] Database backups configured
- [ ] Monitoring alerts set up
- [ ] Documentation updated

---

## 8️⃣ Code Examples

### Get Current Month DRE
```jsx
const { data: dre } = await getCurrentMonthDRE(clinicId);
console.log(`Revenue: R$ ${dre.gross_revenue}`);
console.log(`Margin: ${dre.net_margin_pct}%`);
```

### Compare Periods
```jsx
const comparison = await generateDREComparison(
  clinicId,
  currentStart, currentEnd,
  previousStart, previousEnd
);
console.log(`Revenue change: ${comparison.revenue.variance_pct}%`);
```

### Listen to Alerts
```jsx
const unsubscribe = subscribeToAllAlerts(clinicId, (alert) => {
  console.log(`${alert.type}: ${alert.message}`);
  // Handle alert
});

// Later, unsubscribe
unsubscribe();
```

---

## 📞 Support

### Common Issues & Solutions

**Issue**: "Table dre_periods does not exist"  
**Solution**: Run ETAPA 5 migrations in Supabase SQL Editor

**Issue**: "Real-time subscription not working"  
**Solution**: Check Supabase project Realtime is enabled in settings

**Issue**: "RLS policy rejects all rows"  
**Solution**: Verify user has clinic_id in user_clinic_roles table

**Issue**: "Alerts don't trigger"  
**Solution**: Check browser notification permission is granted

---

## ✅ Completion Status

```
✅ 6 Tests Ready              src/lib/integrationTests.js
✅ Dashboard Components       src/components/financeiro/DRE/
✅ Real-Time Alerts          src/lib/realtimeAlertsApi.js
✅ API Layer                  src/lib/dreMotorApi.js
✅ Integration Guide          REALTIME_ALERTS_INTEGRATION.md
✅ Quick Start                This file

Ready for Production Deployment! 🚀
```
