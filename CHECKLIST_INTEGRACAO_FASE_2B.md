# CHECKLIST DE INTEGRAÇÃO - PRIORIDADE 3
## Integração de Cache em Componentes

**Status:** PRONTA PARA COMEÇAR  
**Tempo Estimado:** 2-3 horas  
**Impacto:** +50% performance, -80% API calls

---

## 📋 COMPONENTES A MODIFICAR

### TIER 1: PRIORIDADE CRÍTICA (30 min)
Estes componentes são usados **frequentemente** e têm **maior impacto**:

#### ☐ ProfessionalsPage.jsx / professionalsPage
- **Localização:** `src/pages/clinica/base-sistema/ProfessionalsPage.jsx`
- **Cache:** `professionals_${clinicId}` (TTL: 5 min)
- **Código Original:**
  ```javascript
  const [professionals, setProfessionals] = useState([]);
  useEffect(() => {
    professionalsApi.listProfessionals(clinicId).then(setProfessionals);
  }, [clinicId]);
  ```
- **Código Otimizado:**
  ```javascript
  const { data: professionals, loading, refresh } = useDataCache({
    key: `professionals_${clinicId}`,
    fetcher: () => professionalsApi.listProfessionals(clinicId),
    ttl: 5 * 60 * 1000,
  });
  ```
- **Adições:**
  - [ ] Importar `useDataCache`, `CacheManager`
  - [ ] Importar `usePagination`
  - [ ] Importar `React.memo`
  - [ ] Substituir useState por useDataCache
  - [ ] Remover useEffect
  - [ ] Adicionar usePagination
  - [ ] Wrap ProfessionalCard com memo
  - [ ] Adicionar handleUpdate/Delete com invalidação
  - [ ] Testar cache (DevTools)

#### ☐ AgendaPage.jsx (Appointments)
- **Localização:** `src/pages/clinica/agenda/`
- **Cache:** `appointments_${clinicId}_${start}_${end}` (TTL: 2 min)
- **Impacto:** Muito alto (agenda é consultada 10-20x/sessão)
- **Adições:**
  - [ ] Importar useDataCache, usePagination
  - [ ] Cache para listAppointments
  - [ ] Cache para listServices (dropdown)
  - [ ] Invalidar cache ao criar/editar appointments
  - [ ] Adicionar paginação para "próximas consultas"

#### ☐ FinanceoDashboard / CashflowPage
- **Localização:** `src/pages/clinica/financeiro/`
- **Cache:** 
  - `cashflow_${clinicId}` (TTL: 10 min)
  - `ap_bills_${clinicId}` (TTL: 5 min)
- **Impacto:** Alto (consultado 5-10x/sessão)
- **Adições:**
  - [ ] Cache para cashflowSummary
  - [ ] Cache para listAPQuery
  - [ ] Composite keys para filters variáveis
  - [ ] Invalidar ao pagar/criar bill

---

### TIER 2: PRIORIDADE ALTA (45 min)
Componentes importantes mas com **menor frequência de uso**:

#### ☐ EstoquePage.jsx (Inventory)
- **Localização:** `src/pages/clinica/estoque/`
- **Cache:** `inventory_${clinicId}` (TTL: 5 min)
- **Adições:**
  - [ ] Importar useDataCache
  - [ ] Cache para listInventory
  - [ ] Paginação para itens
  - [ ] Memo para ItemCard

#### ☐ PatientsPage.jsx (Se existir)
- **Localização:** `src/pages/clinica/pacientes/`
- **Cache:** `patients_${clinicId}` (TTL: 5 min)
- **Adições:**
  - [ ] Importar useDataCache, usePagination
  - [ ] Cache para listPatients
  - [ ] Paginação (20 itens/página)

#### ☐ SelectComponents (Dropdowns)
- **Locais:**
  - `src/components/ui/ProfessionalSelect.jsx`
  - `src/components/ui/ServiceSelect.jsx`
  - `src/components/ui/HealthInsuranceSelect.jsx`
  - `src/components/ui/PatientSelect.jsx`
- **Adições:**
  - [ ] Usar cache para abrir dropdown
  - [ ] TTL: 10 min (dados estáveis)
  - [ ] Reusar dados do cache global

---

### TIER 3: PRIORIDADE MÉDIA (30 min)
Otimizações secundárias com **impacto moderado**:

#### ☐ Wrapping Components com React.memo
Lista de cards/items a fazer wrap:
- [ ] ProfessionalCard.jsx
- [ ] AppointmentCard.jsx
- [ ] FinanceCard.jsx / BillCard.jsx
- [ ] InventoryItemCard.jsx
- [ ] PatientCard.jsx (se existir)
- [ ] ServiceCard.jsx (se existir)

**Padrão:**
```javascript
// ANTES
export function ProfessionalCard({ data, onEdit, onDelete }) { ... }

// DEPOIS
export const ProfessionalCard = memo(function ProfessionalCard({ data, onEdit, onDelete }) { ... });
```

#### ☐ Adicionar useCallback em handlers
Funções a otimizar:
- [ ] handleCreateProfessional
- [ ] handleUpdateProfessional
- [ ] handleDeleteProfessional
- [ ] handleCreateAppointment
- [ ] handleUpdateAppointment
- [ ] handlePayBill
- [ ] handleCreateBill
- [ ] Etc.

**Padrão:**
```javascript
// ANTES
const handleUpdate = async (id, data) => { ... }

// DEPOIS
const handleUpdate = useCallback(async (id, data) => { ... }, [dependencies]);
```

#### ☐ Adicionar useMemo a computed values
Valores a memoizar:
- [ ] filteredProfessionals (filter, search, etc)
- [ ] appointmentsByDate (groupBy)
- [ ] cashflowSummary (cálculos)
- [ ] billStats (count, sum, etc)

**Padrão:**
```javascript
// ANTES
const filtered = professionals.filter(...);

// DEPOIS
const filtered = useMemo(() => professionals.filter(...), [professionals]);
```

---

## 🔄 FLUXO DE INTEGRAÇÃO

### Passo 1: Setup (5 min)
```bash
# Verificar se hooks existem
ls src/hooks/useDataCache.js
ls src/hooks/usePagination.js
```

### Passo 2: TIER 1 - Profissionais (15 min)
1. Abrir `src/pages/clinica/base-sistema/ProfessionalsPage.jsx`
2. Copiar exemplo de `EXEMPLO_INTEGRACAO_CACHE_PAGINACAO.jsx`
3. Testar no navegador
4. Verificar no DevTools (Network tab: deve ter 1 request instead of 5+)

### Passo 3: TIER 1 - Agenda (10 min)
1. Abrir `src/pages/clinica/agenda/...`
2. Aplicar mesmo padrão
3. Testar integração

### Passo 4: TIER 1 - Financeiro (5 min)
1. Abrir `src/pages/clinica/financeiro/...`
2. Aplicar padrão com composite keys
3. Testar

### Passo 5: TIER 2 - Outros (30 min)
1. Estoque
2. Pacientes (se houver)
3. Selects/Dropdowns

### Passo 6: TIER 3 - Otimizações (30 min)
1. Aplicar React.memo a cards
2. Aplicar useCallback a handlers
3. Aplicar useMemo a computed values

### Passo 7: Validação (20 min)
1. Rodar Lighthouse
2. Verificar Network tab
3. Medir performance com React Profiler

---

## 📊 TRACKING DE PROGRESSO

### TIER 1: CRÍTICA (Est. 30 min)
- [ ] ProfessionalsPage.jsx (EST: 10 min)
  - [ ] useDataCache implementado
  - [ ] usePagination implementado
  - [ ] ProfessionalCard com memo
  - [ ] Handlers com callback
  - [ ] Testado

- [ ] AgendaPage.jsx (EST: 10 min)
  - [ ] useDataCache para appointments
  - [ ] Cache para services
  - [ ] Invalidação ao editar
  - [ ] Testado

- [ ] CashflowPage.jsx (EST: 10 min)
  - [ ] useDataCache para cashflow
  - [ ] Cache para bills
  - [ ] Composite keys
  - [ ] Testado

### TIER 2: ALTA (Est. 45 min)
- [ ] EstoquePage.jsx (EST: 15 min)
- [ ] PatientsPage.jsx (EST: 15 min)
- [ ] SelectComponents (EST: 15 min)

### TIER 3: MÉDIA (Est. 30 min)
- [ ] React.memo em 6 cards (EST: 10 min)
- [ ] useCallback em 8 handlers (EST: 10 min)
- [ ] useMemo em 5 computed values (EST: 10 min)

### Validação (Est. 20 min)
- [ ] Lighthouse audit (target: 80+)
- [ ] Network tab check (target: <60 requests)
- [ ] React Profiler (check re-renders)
- [ ] Performance report

---

## 🔧 COMO USAR OS HOOKS

### useDataCache Básico
```javascript
const { data, loading, error, refresh, isCached } = useDataCache({
  key: "unique_key",
  fetcher: () => apiCall(),
  ttl: 5 * 60 * 1000,  // 5 minutos
  enabled: true,        // quando desabilitar
});
```

### Invalidar Cache Manualmente
```javascript
// Opção 1: Via hook
const { refresh } = useDataCache({ ... });
refresh(); // Refetch

// Opção 2: Via CacheManager (global)
import { CacheManager } from "@/hooks/useDataCache";
CacheManager.invalidate("unique_key");
```

### usePagination
```javascript
const {
  items,        // Itens da página atual
  page,         // Número página
  totalPages,   // Total
  nextPage,     // Função
  prevPage,     // Função
  goToPage,     // Função
} = usePagination(allItems, 20); // 20 itens/página
```

---

## ⏱️ TIMELINE ESTIMADA

| Fase | Componentes | Tempo | Status |
|------|-----------|-------|--------|
| 1 | Audit | 30 min | ✅ CONCLUÍDO |
| 2A | Hooks | 20 min | ✅ CONCLUÍDO |
| **2B** | **Integração T1** | **30 min** | 🔄 EM PROGRESSO |
| 3 | Integração T2 | 45 min | ⏳ PRÓXIMO |
| 4 | Otimizações | 30 min | ⏳ PRÓXIMO |
| 5 | Validação | 20 min | ⏳ PRÓXIMO |
| **TOTAL** | | **2h 55m** | |

---

## 🎯 MÉTRICAS DE SUCESSO

### ANTES
- Lighthouse: 55
- API calls: 150/sessão
- First Paint: 2.5s
- TTI: 5.2s
- Memory: 180MB

### DEPOIS (Meta)
- Lighthouse: 85+
- API calls: 60/sessão (-60%)
- First Paint: 1.0s (-60%)
- TTI: 1.8s (-65%)
- Memory: 120MB (-33%)

---

## 📝 NOTAS IMPORTANTES

1. **Cache Invalidation:** Sempre invalidar após CREATE/UPDATE/DELETE
2. **TTL Values:**
   - Profissionais: 5 min (mudam pouco)
   - Appointments: 2 min (mudam frequentemente)
   - Services/Insurances: 10 min (raramente mudam)
   - Finance: 10 min (consultas tendem a ser estáveis)

3. **Clinicização:** SEMPRE usar `clinicId` na cache key
   ```javascript
   key: `professionals_${clinicId}`
   ```

4. **Error Handling:** Todos os hooks já têm, mas sempre testar
5. **DevTools:** Usar React DevTools Profiler para confirmar otimizações

---

## 🚀 PRÓXIMOS PASSOS APÓS INTEGRAÇÃO

1. Executar: `npm run build` e `npm run preview`
2. Rodar: Lighthouse no Chrome DevTools
3. Medir: Performance com React Profiler
4. Documentar: Componentes otimizados em README
5. Testar: Cache invalidation em CRUD flows
6. Deploy: Em staging antes de produção

---

**Criado em:** $(new Date().toISOString())  
**Próxima Ação:** Começar FASE 2B - Integração em ProfessionalsPage
