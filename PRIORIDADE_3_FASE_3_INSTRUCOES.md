# 🔄 FASE 3 - Pagination & Memoization

## 📋 Objetivo
Otimizar renderização de listas grandes implementando pagination e memoização para reduzir re-renders desnecessários.

---

## 1️⃣ usePagination Hook (Já Criado)

### Disponível em: [src/hooks/usePagination.js](src/hooks/usePagination.js)

```javascript
// Padrão básico
const { items, pageNum, pageSize, nextPage, prevPage, goToPage, totalPages } = usePagination(allItems, 20);

// Padrão dinâmico (página size ajustável)
const { items, pageNum, pageSize, setPageSize, ... } = useDynamicPagination(allItems);

// Padrão lazy (infinite scroll)
const { items: loadedItems, loadMore, hasMore } = useLazyPagination(allItems, 20);
```

### Componentes Candidatos:

#### A. ContasPagar.jsx (ALTA PRIORIDADE)
- **Dados:** `items` array de contas a pagar
- **Volume:** 100-1000+ items
- **Overhead:** Renderiza todas as linhas
- **Solução:** Paginar por 20-50 itens
  
```javascript
const { items: paginatedItems, pageNum, totalPages, nextPage, prevPage, goToPage } = 
  usePagination(items, 30);

// Depois usar paginatedItems no render
return (
  <>
    {paginatedItems.map(item => <APRow key={item.id} {...item} />)}
    <PaginationControl pageNum={pageNum} totalPages={totalPages} onNext={nextPage} onPrev={prevPage} />
  </>
);
```

**Tempo:** 15 min

---

#### B. Profissionais.jsx (MÉDIA PRIORIDADE)
- **Dados:** `professionals` array
- **Volume:** 10-100+ professionals
- **Overhead:** Card rendering
- **Solução:** Paginar por 10-20 items

```javascript
const { items: paginatedProfessionals } = usePagination(professionals, 15);

return (
  <div className="grid grid-cols-3 gap-4">
    {paginatedProfessionals.map(p => <ProfessionalCard key={p.id} {...p} />)}
  </div>
);
```

**Tempo:** 10 min

---

#### C. PatientListPage.jsx (MÉDIA PRIORIDADE)
- **Dados:** `patients` array
- **Volume:** 50-500+ patients
- **Overhead:** Table rows
- **Solução:** Paginar por 30-50 items

```javascript
const { items: paginatedPatients } = usePagination(patients, 50);

return (
  <table>
    <tbody>
      {paginatedPatients.map(p => <PatientRow key={p.id} {...p} />)}
    </tbody>
  </table>
);
```

**Tempo:** 10 min

---

#### D. AgendaUnificada.jsx (BAIXA PRIORIDADE)
- **Dados:** Agendamentos por dia
- **Volume:** 10-100 appointments
- **Overhead:** Médio (já com virtual scroll?)
- **Solução:** Verificar se já usa virtual scroll

**Tempo:** 5 min (optional)

---

## 2️⃣ React.memo para Componentes

### Padrão Geral

```javascript
// ANTES
export default function APRow({ item, onEdit, onDelete }) {
  return (
    <tr>
      <td>{item.vendor}</td>
      <td>{item.amount}</td>
      {/* ... mais campos ... */}
    </tr>
  );
}

// DEPOIS
const APRow = React.memo(({ item, onEdit, onDelete }) => {
  return (
    <tr>
      <td>{item.vendor}</td>
      <td>{item.amount}</td>
      {/* ... mais campos ... */}
    </tr>
  );
}, (prevProps, nextProps) => {
  // Custom comparison para otimização avançada
  return prevProps.item.id === nextProps.item.id &&
         prevProps.item.status === nextProps.item.status;
});

export default APRow;
```

### Componentes Candidatos:

1. **APRow.jsx** (ContasPagar)
   - Evita re-render quando parent re-renders
   - Use custom comparison se item.id + status bastam
   
2. **ProfessionalCard.jsx** (Profissionais)
   - Frequente re-render em list context
   
3. **PatientRow.jsx** (PatientListPage)
   - Muitos re-renders durante filtering
   
4. **AgendaSlot.jsx** (Agenda)
   - Parte crítica, muitos slots na tela
   
---

## 3️⃣ useMemo para Cálculos Custosos

### Padrão Geral

```javascript
// ANTES - recalcula toda vez que component re-renders
const filteredItems = items.filter(i => i.status === selectedStatus);
const sortedItems = filteredItems.sort((a, b) => b.amount - a.amount);
const summary = sortedItems.reduce((sum, i) => sum + i.amount, 0);

// DEPOIS - recalcula só quando dependencies mudam
const filteredItems = useMemo(() => 
  items.filter(i => i.status === selectedStatus),
  [items, selectedStatus]
);

const sortedItems = useMemo(() =>
  [...filteredItems].sort((a, b) => b.amount - a.amount),
  [filteredItems]
);

const summary = useMemo(() =>
  sortedItems.reduce((sum, i) => sum + i.amount, 0),
  [sortedItems]
);
```

### Candidatos:

1. **ContasPagar.jsx**
   - `filteredItems` com múltiplos filtros
   - `summary` calculations
   - Mapping para CSV export

2. **FluxoCaixa.jsx**
   - `summaryCards` calculations
   - Grouped data by category/month

3. **AgendaPage.jsx**
   - `professionalAppointments` filtering
   - `metrics` calculation (já usa useMemo)

---

## 🎯 Implementação Sequencial

### Passo 1: ContasPagar - Pagination
```bash
1. Importar usePagination
2. Aplicar ao items array
3. Renderizar paginatedItems
4. Adicionar PaginationControl
5. Testar: criar 50+ bills, verificar que só 30 renderizam
```

**Tempo:** 15 min

---

### Passo 2: ContasPagar - React.memo
```bash
1. Extrair APRow para componente se não existir
2. Envolver com React.memo
3. Definir custom comparison
4. Testar: mudar filtro, verificar que rows não re-renderizam
```

**Tempo:** 10 min

---

### Passo 3: ContasPagar - useMemo
```bash
1. Envolver filteredItems com useMemo
2. Envolver summary calculations com useMemo
3. Verificar dependencies
4. Testar: mudar filtros, verificar performance
```

**Tempo:** 10 min

---

### Passo 4: Profissionais - Pagination + Memo
```bash
1. Aplicar usePagination
2. React.memo no ProfessionalCard
3. Testar renderização
```

**Tempo:** 10 min

---

### Passo 5: PatientListPage - Pagination + Memo
```bash
1. Aplicar usePagination
2. React.memo na PatientRow
3. Testar com 100+ patients
```

**Tempo:** 10 min

---

### Passo 6: Refinar AgendaPage
```bash
1. Verificar se há componentes para React.memo
2. Verificar se há cálculos para useMemo
3. Aplicar se necessário
```

**Tempo:** 10 min

---

## 📊 Expected Improvements

### Antes (Com Cache mas sem Pagination/Memo)
```
ContasPagar com 500 bills:
  - DOM nodes: 500+ (table rows)
  - Render time: 2000ms+
  - Memory: 50MB+
  - Scroll performance: Jank 🔴

Profissionais com 100 cards:
  - DOM nodes: 100+ (cards)
  - Render time: 500ms+
  - Memory: 20MB+
```

### Depois (Com Pagination + Memo)
```
ContasPagar com 500 bills (paginated 30/page):
  - DOM nodes: ~30
  - Render time: 50ms
  - Memory: 5MB
  - Scroll performance: 60 FPS ✅

Profissionais com 100 cards (paginated 15/page):
  - DOM nodes: ~15
  - Render time: 30ms
  - Memory: 2MB
  - Scroll performance: 60 FPS ✅
```

---

## ✅ Checklist Implementação

- [ ] Passo 1: ContasPagar pagination
- [ ] Passo 2: ContasPagar React.memo
- [ ] Passo 3: ContasPagar useMemo
- [ ] Passo 4: Profissionais pagination + memo
- [ ] Passo 5: PatientListPage pagination + memo
- [ ] Passo 6: AgendaPage refinement

---

## 🚀 Ready to Implement

Todos os hooks já foram criados na FASE 2A. Basta aplicar os padrões.

**Total Tempo Estimado:** 60-75 minutos
**Próximo:** FASE 4 - Validation com Lighthouse

---

## 📚 Referências

- [usePagination.js](src/hooks/usePagination.js) - Hook documentation
- React.memo: https://react.dev/reference/react/memo
- useMemo: https://react.dev/reference/react/useMemo
- Profiling: https://react.dev/learn/render-and-commit

---

**Status:** ⏳ Ready to Implement  
**Previous Phase:** FASE 2C ✅ CONCLUÍDO  
**Next Phase:** FASE 4 - Validation
