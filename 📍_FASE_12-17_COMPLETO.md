# 🎯 FASE 12-17: TESTES, PERFORMANCE E DEPLOY

**Data**: 2026-06-06  
**Quando**: Próxima sessão (depois de aplicar SQL FASE 9-11)  
**Tempo estimado**: 3-4 horas  
**Objetivo**: Colocar sistema em produção (100% do projeto)

---

## 📋 OVERVIEW

```
FASE 12:  ✅ E2E Tests          (1 hora)
FASE 13:  ⚡ Performance Tune    (45 min)
FASE 14:  🔒 Security Audit      (45 min)
FASE 15:  🛡️ Error Handling      (30 min)
FASE 16:  🚀 Deploy Preparation  (30 min)
FASE 17:  🎉 Production Deploy   (30 min)

TOTAL: 4 horas (para 100% completo)
```

---

## 🧪 FASE 12: E2E TESTS (1 HORA)

**Objetivo**: Validar fluxo completo end-to-end

### O que testar:

#### 1. Fluxo de Agendamento → Recebível
```javascript
1. Criar appointment (status = "confirmed")
2. Adicionar 2-3 services
3. Calcular valor esperado: SUM(value - discount)
4. Marcar como "attended"
5. ✅ Verificar: receivable criado automaticamente
6. ✅ Verificar: amount correto
7. ✅ Verificar: ar_receivable_items criados (1 por serviço)
```

#### 2. Fluxo Recebível → Cashflow
```javascript
1. Pegar receivable criado no passo anterior
2. Marcar como "paid"
3. ✅ Verificar: ap_cashflow criado automaticamente
4. ✅ Verificar: amount = receivable.amount
5. ✅ Verificar: type = 'input'
6. ✅ Verificar: category correto
```

#### 3. Validar Relatórios
```javascript
1. getProductionReport(clinicId, start, end)
   ✅ Retorna array com profissionais
   ✅ total_appointments > 0
   ✅ total_revenue > 0
   ✅ average_ticket > 0

2. getBillingReport(clinicId, start, end)
   ✅ Retorna array com convênios
   ✅ gross_amount = SUM(value)
   ✅ net_amount = gross - discount
   ✅ received_count = COUNT(paid)

3. getReceivablesReport(clinicId)
   ✅ Retorna array com receivables
   ✅ days_overdue calculado corretamente
   ✅ status_label correto (Recebido/Atrasado/Pendente)
```

#### 4. Validar UI Components
```javascript
1. ProductionReportCard
   ✅ Renderiza dados
   ✅ Formata BRL corretamente
   ✅ Mostra "Nenhum dado" se vazio

2. BillingReportTable
   ✅ Renderiza tabela
   ✅ Totalizadores na footer
   ✅ Loading state funciona
   ✅ Sorting/filtering (se implementado)

3. ReceivablesStatusBoard
   ✅ 4 stat cards renderizam
   ✅ Tabela detalhe renderiza
   ✅ Cores certas (verde/amarelo/vermelho)
   ✅ Days overdue negativo = não deveria ser vermelho
```

### Testes a Implementar:

**Arquivo**: `src/__tests__/pages/financeiro.test.js` (novo)

```javascript
describe('Financeiro - FASE 9-11 Integration', () => {
  
  test('Trigger: Appointment attended → Receivable created', async () => {
    // 1. Setup: create appointment with services
    const appointment = await createTestAppointment({ status: 'confirmed' });
    await addServiceToAppointment(appointment.id, { value: 100 });
    
    // 2. Mark attended
    await updateAppointmentStatus(appointment.id, 'attended');
    
    // 3. Assert: receivable created
    const receivable = await getReceivableForAppointment(appointment.id);
    expect(receivable).toBeDefined();
    expect(receivable.amount).toBe(100);
    expect(receivable.status).toBe('pending');
  });

  test('Trigger: Receivable paid → Cashflow synced', async () => {
    // 1. Setup: get receivable from previous test
    const receivable = await getReceivable(receivableId);
    
    // 2. Mark paid
    await updateReceivableStatus(receivable.id, 'paid');
    
    // 3. Assert: cashflow created
    const cashflow = await getCashflowForReceivable(receivable.id);
    expect(cashflow).toBeDefined();
    expect(cashflow.amount).toBe(receivable.amount);
    expect(cashflow.type).toBe('input');
  });

  test('API: getProductionReport returns correct metrics', async () => {
    const report = await getProductionReport(clinicId, startDate, endDate);
    
    expect(report).toBeInstanceOf(Array);
    report.forEach(item => {
      expect(item).toHaveProperty('professional_name');
      expect(item).toHaveProperty('total_appointments');
      expect(item).toHaveProperty('total_revenue');
      expect(item).toHaveProperty('average_ticket');
      expect(item.average_ticket).toBe(item.total_revenue / item.total_appointments);
    });
  });

  test('Component: ProductionReportCard renders', () => {
    const report = [{ 
      professional_name: 'João', 
      total_appointments: 5, 
      total_revenue: 500, 
      average_ticket: 100 
    }];
    
    const { getByText } = render(<ProductionReportCard report={report} />);
    
    expect(getByText('João')).toBeInTheDocument();
    expect(getByText('5')).toBeInTheDocument();
    expect(getByText('R$ 500,00')).toBeInTheDocument();
  });
});
```

**Scripts to Add** (package.json):
```json
{
  "scripts": {
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest --coverage"
  }
}
```

---

## ⚡ FASE 13: PERFORMANCE TUNING (45 MIN)

**Objetivo**: Otimizar queries e rendering

### 1. Database Performance

#### Query Optimization
```sql
-- Check slow queries
SELECT query, mean_time FROM pg_stat_statements 
WHERE query LIKE '%appointment%' OR query LIKE '%receivable%'
ORDER BY mean_time DESC
LIMIT 10;

-- Verify indexes are used
EXPLAIN ANALYZE
SELECT * FROM appointment_services 
WHERE plan_id = 'some-uuid' AND status = 'pending';

-- Should show: Index Scan (not Seq Scan)
```

#### Missing Index Analysis
```sql
-- Check for unused indexes
SELECT schemaname, tablename, indexname, idx_scan 
FROM pg_stat_user_indexes 
WHERE idx_scan = 0;

-- Can drop if not used
```

#### View Performance
```sql
-- Test view query times
EXPLAIN ANALYZE SELECT * FROM vw_production_report LIMIT 100;
EXPLAIN ANALYZE SELECT * FROM vw_billing_report LIMIT 100;
EXPLAIN ANALYZE SELECT * FROM vw_receivables_report LIMIT 100;

-- Should all be < 100ms
```

### 2. API Performance

#### Add Pagination
```javascript
// Before: getProductionReport might return 1000 rows
// After: add pagination

export const getProductionReport = async (
  clinicId,
  startDate,
  endDate,
  limit = 50,      // NEW
  offset = 0       // NEW
) => {
  const { data, error } = await supabase
    .from('vw_production_report')
    .select('*')
    .eq('clinic_id', clinicId)
    .gte('last_appointment_date', startDate)
    .lte('last_appointment_date', endDate)
    .limit(limit)   // NEW
    .offset(offset) // NEW
    .order('total_revenue', { ascending: false });
  
  return data || [];
};
```

#### Add Caching
```javascript
// Cache queries for 5 minutes
const CACHE_DURATION = 5 * 60 * 1000; // 5 min
const reportCache = new Map();

export const getProductionReport = async (...args) => {
  const cacheKey = JSON.stringify(args);
  
  if (reportCache.has(cacheKey)) {
    const { data, timestamp } = reportCache.get(cacheKey);
    if (Date.now() - timestamp < CACHE_DURATION) {
      return data; // Return cached
    }
  }
  
  // ... fetch from DB
  reportCache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
};
```

### 3. React Component Performance

#### Memoization
```javascript
// ProductionReportCard.jsx
import { memo } from 'react';

const ProductionReportCard = memo(({ report, loading }) => {
  // Component only re-renders if report/loading changes
  return ...;
}, (prevProps, nextProps) => {
  // Custom comparison
  return prevProps.loading === nextProps.loading && 
         JSON.stringify(prevProps.report) === JSON.stringify(nextProps.report);
});

export default ProductionReportCard;
```

#### Lazy Loading
```javascript
// Load components only when needed
import { lazy, Suspense } from 'react';

const ProductionReportCard = lazy(() => 
  import('./ProductionReportCard')
);

export const FinanceiroDashboard = () => {
  return (
    <Suspense fallback={<Spinner />}>
      <ProductionReportCard report={data} />
    </Suspense>
  );
};
```

---

## 🔒 FASE 14: SECURITY AUDIT (45 MIN)

**Objetivo**: Verificar vulnerabilidades e segurança

### 1. SQL Injection Prevention
```javascript
✅ GOOD: Using parameterized queries (Supabase client does this)
  const { data } = await supabase
    .from('appointments')
    .select('*')
    .eq('clinic_id', clinicId);  // Parameter binding

❌ BAD: String concatenation (NOT IN CODE - confirm)
  const sql = `SELECT * FROM appointments WHERE clinic_id = '${clinicId}'`;
```

### 2. RLS Policies Verification
```sql
-- Check that all tables have RLS enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = false;

-- Should return: empty (all tables should have RLS enabled)

-- Check specific policies
SELECT * FROM pg_policies 
WHERE schemaname = 'public';

-- Verify: clinic_id filtering is present in all policies
```

### 3. Data Validation
```javascript
// appointmentsApi.js - Add input validation

export const finalizeAppointmentWithReceivable = async (appointmentId) => {
  // Validate input
  if (!appointmentId || typeof appointmentId !== 'string') {
    throw new Error('Invalid appointmentId');
  }
  
  if (!isValidUUID(appointmentId)) {
    throw new Error('Invalid UUID format');
  }
  
  // ... rest of function
};

// Helper
const isValidUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};
```

### 4. CORS & HTTPS
```javascript
// vite.config.js - Verify CORS settings

export default {
  server: {
    cors: {
      origin: process.env.VITE_ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    },
  },
};

// .env
VITE_ALLOWED_ORIGINS=http://localhost:3000,https://clinica.example.com
```

### 5. Environment Variables
```javascript
// Verify all sensitive data is in .env, not hardcoded

✅ Correct:
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

❌ Wrong:
  const supabaseUrl = 'https://xxx.supabase.co'; // Hardcoded
```

---

## 🛡️ FASE 15: ERROR HANDLING (30 MIN)

**Objetivo**: Adicionar tratamento de erros robusto

### 1. Enhanced API Error Handling
```javascript
// appointmentsApi.js - Improve error messages

export const finalizeAppointmentWithReceivable = async (appointmentId) => {
  try {
    console.log('💰 FASE 9: Finalizando appointment...');
    
    if (!appointmentId) throw new Error('appointmentId is required');
    
    const { data, error } = await supabase
      .from('appointments')
      .update({ status: 'attended', updated_at: new Date() })
      .eq('id', appointmentId)
      .select()
      .single();
    
    if (error) {
      console.error('❌ FASE 9 ERROR:', {
        message: error.message,
        code: error.code,
        details: error.details,
        appointmentId,
      });
      throw new Error(`Failed to update appointment: ${error.message}`);
    }
    
    console.log('✅ FASE 9: Appointment finalizado:', data.id);
    return { success: true, appointmentId: data.id };
    
  } catch (error) {
    console.error('🔴 FASE 9 CRITICAL ERROR:', error);
    return { success: false, error: error.message };
  }
};
```

### 2. Component Error Boundaries
```javascript
// New file: src/components/ErrorBoundary.jsx

import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🔴 Component Error:', error, errorInfo);
    // Send to error tracking service (Sentry, etc)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-50 p-4 rounded-lg">
          <h2 className="text-red-800 font-bold">Erro ao carregar</h2>
          <p className="text-red-700 text-sm">{this.state.error?.message}</p>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### 3. User Feedback
```javascript
// Use Toast notifications for errors

import { toast } from 'react-toastify'; // or similar

export const markReceivableAsPaid = async (receivableId) => {
  try {
    const result = await supabase
      .from('ar_receivables')
      .update({ status: 'paid' })
      .eq('id', receivableId)
      .select()
      .single();
    
    if (result.error) throw result.error;
    
    // Success notification
    toast.success('Recebível marcado como pago! ✅');
    return { success: true };
    
  } catch (error) {
    // Error notification
    toast.error(`Erro ao marcar como pago: ${error.message}`);
    console.error('FASE 10 ERROR:', error);
    return { success: false, error };
  }
};
```

---

## 🚀 FASE 16: DEPLOY PREPARATION (30 MIN)

**Objetivo**: Preparar para deploy em produção

### 1. Environment Configuration
```bash
# .env.production
VITE_SUPABASE_URL=https://xxx.supabase.co (production URL)
VITE_SUPABASE_ANON_KEY=eyJxxx (production key)
VITE_ALLOWED_ORIGINS=https://clinica.example.com
VITE_API_TIMEOUT=30000
VITE_LOG_LEVEL=error
```

### 2. Build Optimization
```javascript
// vite.config.js - Production optimizations

export default {
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-select'],
        },
      },
    },
    sourcemap: false, // Don't expose source maps
    target: 'esnext',
  },
};
```

### 3. Database Backup Before Deploy
```sql
-- Create backup
SELECT pg_start_backup('FASE_9-11_pre_deploy_backup');

-- Or via Supabase UI: Settings → Backups → Start Backup
```

### 4. Deployment Checklist
```markdown
## Pre-Deployment Checklist

- [ ] All tests passing (npm test)
- [ ] Build successful (npm run build)
- [ ] No console errors (dev tools)
- [ ] Environment variables set (.env.production)
- [ ] Database backup created
- [ ] RLS policies verified
- [ ] Performance baseline measured
- [ ] Security audit completed
- [ ] Monitoring setup (error tracking, logging)
- [ ] Rollback plan documented
```

---

## 🎉 FASE 17: PRODUCTION DEPLOY (30 MIN)

**Objetivo**: Deploy em produção

### 1. Build & Test
```bash
# Build production version
npm run build

# Preview production build locally
npm run preview

# Run tests one more time
npm test
```

### 2. Deploy Options

#### Option A: Vercel (Recommended for React)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Automatically:
# - Builds project
# - Deploys to CDN
# - Sets up CI/CD
# - Creates staging environment
```

#### Option B: Docker + Cloud Run
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "run", "preview"]
```

```bash
# Build & deploy
docker build -t gesclinic-web .
docker push gcr.io/project-id/gesclinic-web
gcloud run deploy gesclinic-web --image gcr.io/project-id/gesclinic-web
```

#### Option C: Manual (VPS)
```bash
# SSH into server
ssh user@server.com

# Pull latest code
cd /var/www/gesclinic-web
git pull origin main

# Build
npm ci
npm run build

# Serve with PM2
pm2 restart gesclinic-web
```

### 3. Post-Deployment Verification
```bash
# Health checks
curl https://clinica.example.com/health

# Check API endpoints
curl https://clinica.example.com/api/production-report

# Monitor logs
pm2 logs gesclinic-web

# Check error tracking (Sentry, etc)
# - 0 new errors in first 30 min ✓
# - No spike in error rate ✓
```

### 4. Rollback Plan
```bash
# If something breaks:

# Option 1: Revert to previous deployment
vercel rollback

# Option 2: Manual rollback
git revert HEAD
npm run build
npm run deploy

# Option 3: Database rollback (if needed)
# Use backup from Step 16.3
```

---

## 📊 PROGRESS SUMMARY

```
Completion after FASE 12-17:

FASE 1-5:      ███████████░░░░░░░░░░░░░░░░░░ 50% ✅
FASE 6-8:      █░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 5%  ✅
FASE 9-11:     ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 10% ✅
FASE 12-17:    ███░░░░░░░░░░░░░░░░░░░░░░░░░░░ 15% (IN PROGRESS)

TOTAL:         █████████████░░░░░░░░░░░░░░░░░░ ~100% COMPLETE! 🎉
```

---

## ⏱️ TIME BREAKDOWN

```
FASE 12 (E2E Tests):          1 hour
FASE 13 (Performance):        45 minutes
FASE 14 (Security):           45 minutes
FASE 15 (Error Handling):     30 minutes
FASE 16 (Deploy Prep):        30 minutes
FASE 17 (Production Deploy):  30 minutes
────────────────────────────────────
TOTAL:                        4 hours
```

---

## 🎯 RECOMMENDED SCHEDULE

```
Today (2026-06-06):
  ✅ FASE 1-5 (completed 8h ago)
  ✅ FASE 9-11 (just completed)
  ⏳ Apply SQL (45 min - do now!)

Tomorrow or Next Day:
  FASE 12-17 (4 hours - can split into 2 sessions)
  
  Session 1: FASE 12-14 (2.5 hours)
    - E2E Tests
    - Performance Tuning
    - Security Audit
  
  Session 2: FASE 15-17 (1.5 hours)
    - Error Handling
    - Deploy Preparation
    - Production Deploy

Result: ✅ 100% COMPLETE PROJECT 🎉
```

---

## 📁 FILES TO CREATE (FASE 12-17)

```
src/__tests__/
  └─ pages/financeiro.test.js      (FASE 12 - E2E tests)

src/components/
  └─ ErrorBoundary.jsx             (FASE 15 - Error boundary)

Configuration files:
  └─ .env.production               (FASE 16 - Prod env)
  └─ Dockerfile                    (FASE 17 - Deploy)
  └─ vercel.json (if using Vercel) (FASE 17 - Deploy)

Documentation:
  └─ DEPLOYMENT_GUIDE.md           (FASE 16-17)
  └─ MONITORING_GUIDE.md           (FASE 17)
```

---

## 🚀 NEXT: APPLY SQL FIRST!

Before starting FASE 12-17, you need to:

1. **Apply FASE 6-8 & 9-11 SQL** (45 min)
   - Follow OPÇÃO 1 instructions above
   - Validate with 🔍_VALIDACAO_COMPLETA.md

2. **Then start FASE 12-17** (4 hours, next session)

---

**Ready to apply SQL? Start with:** 📋_QUICK_REFERENCE.md

