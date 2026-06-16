# ⚡ FASE 13: PERFORMANCE OPTIMIZATION (45 MIN)

---

## 🎯 STATUS

```
✅ FASE 12: E2E Tests         CONCLUÍDA (65%)
🔵 FASE 13: Performance       ← COMEÇANDO AGORA! (45 min)
⏳ FASE 14-17: Restante       (2h 30min até 100%)
```

---

## 🚀 FASE 13: O QUE FAZER

### Objetivo: Otimizar performance da aplicação

```
1️⃣  Pagination em Relatórios        (15 min)
    └─ Adicionar limit/offset
    └─ Lazy load de dados
    
2️⃣  React Query Caching             (15 min)
    └─ Cache queries
    └─ Invalidation patterns
    
3️⃣  Memoization Otimizações         (10 min)
    └─ useMemo para cálculos
    └─ useCallback para handlers
    └─ React.memo para componentes
    
4️⃣  Build Size & Metrics            (5 min)
    └─ Tree shake
    └─ Lazy load componentes
```

---

## 📝 TAREFAS ESPECÍFICAS

### 1️⃣ Pagination (15 min)

**Arquivo**: `src/pages/clinica/financeiro/FinanceiroDashboard.jsx`

```javascript
// ANTES:
const { data: report } = await supabase
  .from('vw_production_report')
  .select('*');

// DEPOIS:
const [page, setPage] = useState(1);
const pageSize = 10;

const { data: report } = await supabase
  .from('vw_production_report')
  .select('*')
  .range((page - 1) * pageSize, page * pageSize - 1);
```

### 2️⃣ React Query Setup (15 min)

```javascript
// Instalar (se necessário)
npm install @tanstack/react-query

// Usar em componentes:
import { useQuery } from '@tanstack/react-query';

const { data: productionReport } = useQuery({
  queryKey: ['production-report', clinicId],
  queryFn: () => appointmentsApi.getProductionReport(clinicId, startDate, endDate),
  staleTime: 5 * 60 * 1000, // 5 minutos
});
```

### 3️⃣ Memoization (10 min)

```javascript
// ProductionReportCard.jsx
const ProductionReportCard = React.memo(({ report }) => {
  const averageTicket = useMemo(
    () => report.total_revenue / report.total_appointments,
    [report.total_revenue, report.total_appointments]
  );
  
  return (
    // ... render
  );
});

export default ProductionReportCard;
```

### 4️⃣ Build Analysis (5 min)

```bash
# Analisar tamanho do build
npm run build -- --analyze

# Resultado esperado:
# ✅ Main chunk < 200KB
# ✅ CSS < 50KB
# ✅ Assets otimizados
```

---

## 📊 MÉTRICAS DE SUCESSO

```
ANTES (FASE 12):
  FCP: ~3s
  LCP: ~3.5s
  Build: 5181 modules

DEPOIS (FASE 13):
  FCP: < 2s ✅
  LCP: < 2.5s ✅
  Build: Otimizado
```

---

## 🔴 PRÓXIMO PASSO

### Após FASE 13 (45 min):
```
Arquivo: ✅_FASE_13_CONCLUIDA.md
Próximo: FASE 14 (Security) - 45 min
Projeto: 65% → 75% ✅
```

---

## 🎬 COMECE AGORA!

**Tempo**: 45 minutos

**Resultado**: Performance otimizada + Projeto em 75%

**VAI!** ⚡

