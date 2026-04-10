# 🚀 PRIORIDADE 3 - PERFORMANCE & OTIMIZAÇÕES
## Guia de Implementação Passo-a-Passo

**Data:** Janeiro 15, 2026  
**Tempo Estimado:** 2-4 horas  
**Dificuldade:** Média  
**Impacto:** 🔥🔥🔥 CRÍTICO (40-50% melhoria)

---

## 📋 FASES DE IMPLEMENTAÇÃO

### FASE 1: Audit de Queries (30 minutos)
### FASE 2: Implementar Cache (45 minutos)
### FASE 3: Paginação & Virtualization (60 minutos)
### FASE 4: Memoization de Componentes (45 minutos)
### FASE 5: Testes & Validação (30 minutos)

---

## 🎯 OBJETIVOS

- [ ] Reduzir N+1 queries em 60%
- [ ] Implementar cache de dados frequentes
- [ ] Adicionar paginação em listas longas
- [ ] Otimizar renders de componentes
- [ ] Lighthouse Score: 80+ (de 55)

---

## 📊 IMPACTO ESPERADO

```
Métrica                   Antes    Depois    Melhoria
─────────────────────────────────────────────────
First Contentful Paint    2.5s → 1.0s        60% ↓
Time to Interactive       5.2s → 1.8s        65% ↓
Total Bundle Size         850KB → 650KB      24% ↓
API Calls (por dia)       150 → 60           60% ↓
Memory Usage              180MB → 120MB      33% ↓
Lighthouse Score          55 → 85            54% ↑
```

---

## 🔧 IMPLEMENTAÇÃO

### FASE 1: Audit de Queries (30 minutos)

#### 1.1 Verificar APIs que precisam otimização

Abrir e analisar cada API:

**Arquivo:** `src/lib/professionalsApi.js`
```javascript
// ANTES (N+1 potencial):
export async function getProfessionals(clinicId) {
  const { data, error } = await supabaseClient
    .from('professionals')
    .select('*')
    .eq('clinic_id', clinicId);
    
  // ⚠️ Se depois fazer loop e chamar getServices() para cada, é N+1!
}

// DEPOIS (Otimizado):
export async function getProfessionals(clinicId) {
  const { data, error } = await supabaseClient
    .from('professionals')
    .select('*, professional_services(service_id)') // Join direto!
    .eq('clinic_id', clinicId);
  
  return data;
}
```

**Arquivos a verificar:**
- [ ] `src/lib/professionalsApi.js`
- [ ] `src/lib/appointmentsApi.js`
- [ ] `src/lib/financeApi.js`
- [ ] `src/lib/servicesApi.js`
- [ ] `src/lib/clinicsApi.js`

#### 1.2 Checklist de Audit

Para cada API, verificar:
- [ ] Usando `select()` corretamente?
- [ ] Filtrando por `clinic_id`?
- [ ] Usando índices nas colunas filtradas?
- [ ] Há loops que causam N+1?
- [ ] Pode usar `join()` ao invés de múltiplas chamadas?

---

### FASE 2: Implementar Cache (45 minutos)

#### 2.1 Criar Hook Universal de Cache

**Arquivo:** `src/hooks/useDataCache.js`

```javascript
import { useState, useEffect, useCallback } from 'react';

/**
 * Hook universal para cache de dados
 * 
 * Uso:
 * const { data, loading, error, refresh } = useDataCache({
 *   key: `professionals_${clinicId}`,
 *   fetcher: () => professionalsApi.getProfessionals(clinicId),
 *   ttl: 5 * 60 * 1000, // 5 minutos
 * });
 */
export function useDataCache({ key, fetcher, ttl = 5 * 60 * 1000 }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cache em memória (pode ser substituído por Redux depois)
  const cache = useCallback(() => {
    const stored = sessionStorage.getItem(key);
    if (stored) {
      const { data, timestamp } = JSON.parse(stored);
      if (Date.now() - timestamp < ttl) {
        return data; // Cache ainda válido
      }
    }
    return null;
  }, [key, ttl]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetcher();
      setData(result);
      // Salvar no cache
      sessionStorage.setItem(key, JSON.stringify({
        data: result,
        timestamp: Date.now(),
      }));
      setError(null);
    } catch (err) {
      setError(err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [fetcher, key]);

  useEffect(() => {
    // Verificar cache primeiro
    const cached = cache();
    if (cached) {
      setData(cached);
      setLoading(false);
      return;
    }

    // Se não há cache, buscar
    refresh();
  }, [key, fetcher]);

  return { data, loading, error, refresh };
}
```

#### 2.2 Usar Hook em Componentes

**Exemplo:** `src/pages/clinica/base-sistema/ProfessionalsPage.jsx`

```javascript
import { useDataCache } from "@/hooks/useDataCache";

export function ProfessionalsPage() {
  const { clinicId } = useClinicContext();

  // ANTES (sem cache):
  // const [professionals, setProfessionals] = useState([]);
  // useEffect(() => {
  //   professionalsApi.getProfessionals(clinicId).then(setProfessionals);
  // }, [clinicId]);

  // DEPOIS (com cache):
  const { data: professionals, loading, refresh } = useDataCache({
    key: `professionals_${clinicId}`,
    fetcher: () => professionalsApi.getProfessionals(clinicId),
    ttl: 5 * 60 * 1000, // 5 minutos
  });

  // ... rest of component
}
```

#### 2.3 Aplicar em Outras APIs

Aplicar o padrão em:
- [ ] `servicesApi.getServices()`
- [ ] `healthInsurancesApi.getHealthInsurances()`
- [ ] `appointmentsApi.listAppointments()`
- [ ] `financeApi.getAPBills()`

---

### FASE 3: Paginação & Virtualization (60 minutos)

#### 3.1 Criar Hook de Paginação

**Arquivo:** `src/hooks/usePagination.js`

```javascript
import { useState, useMemo } from 'react';

/**
 * Hook para paginação de dados
 * 
 * Uso:
 * const { items, page, totalPages, goToPage, nextPage, prevPage } = 
 *   usePagination(allItems, 10);
 */
export function usePagination(items = [], itemsPerPage = 20) {
  const [page, setPage] = useState(1);

  const paginated = useMemo(() => {
    if (!items || items.length === 0) return [];
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return items.slice(start, end);
  }, [items, page, itemsPerPage]);

  const totalPages = Math.ceil((items?.length || 0) / itemsPerPage);

  return {
    items: paginated,
    page,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    goToPage: (newPage) => setPage(Math.min(newPage, totalPages)),
    nextPage: () => setPage((p) => Math.min(p + 1, totalPages)),
    prevPage: () => setPage((p) => Math.max(p - 1, 1)),
    itemsCount: items?.length || 0,
  };
}
```

#### 3.2 Usar Paginação em Listas

**Exemplo:** Lists de Professionals

```javascript
import { usePagination } from "@/hooks/usePagination";

export function ProfessionalsList({ professionals }) {
  const {
    items: visibleProfessionals,
    page,
    totalPages,
    nextPage,
    prevPage,
  } = usePagination(professionals, 20);

  return (
    <div>
      <div className="space-y-2">
        {visibleProfessionals.map((prof) => (
          <ProfessionalCard key={prof.id} professional={prof} />
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={prevPage}
          disabled={page === 1}
          className="px-4 py-2 border rounded"
        >
          ← Anterior
        </button>
        <span className="px-4 py-2">
          Página {page} de {totalPages}
        </span>
        <button
          onClick={nextPage}
          disabled={page === totalPages}
          className="px-4 py-2 border rounded"
        >
          Próxima →
        </button>
      </div>
    </div>
  );
}
```

#### 3.3 Implementar Virtual List (para 1000+ itens)

Para listas muito longas, usar biblioteca como `react-window`:

```bash
npm install react-window
```

**Exemplo:**
```javascript
import { FixedSizeList } from 'react-window';

export function VirtualProfessionalsList({ professionals }) {
  const Row = ({ index, style }) => (
    <div style={style}>
      <ProfessionalCard professional={professionals[index]} />
    </div>
  );

  return (
    <FixedSizeList
      height={600}
      itemCount={professionals.length}
      itemSize={100}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}
```

---

### FASE 4: Memoization de Componentes (45 minutos)

#### 4.1 Usar React.memo em Componentes Pesados

**Antes (sem memo):**
```javascript
export function ProfessionalCard({ professional, onEdit, onDelete }) {
  return (
    <div className="border p-4 rounded">
      {/* Componente complexo */}
    </div>
  );
}
```

**Depois (com memo):**
```javascript
import { memo, useCallback } from 'react';

export const ProfessionalCard = memo(function ProfessionalCard({
  professional,
  onEdit,
  onDelete,
}) {
  return (
    <div className="border p-4 rounded">
      {/* Componente complexo */}
    </div>
  );
});
```

#### 4.2 Usar useCallback para Callbacks Estáveis

**Antes:**
```javascript
const { items } = usePagination(professionals);

return (
  <div>
    {items.map((prof) => (
      <ProfessionalCard
        key={prof.id}
        professional={prof}
        onEdit={(id) => handleEdit(id)} // ❌ Função nova a cada render
        onDelete={(id) => handleDelete(id)} // ❌ Função nova a cada render
      />
    ))}
  </div>
);
```

**Depois:**
```javascript
const { items } = usePagination(professionals);

const handleEdit = useCallback((id) => {
  // ... edit logic
}, []);

const handleDelete = useCallback((id) => {
  // ... delete logic
}, []);

return (
  <div>
    {items.map((prof) => (
      <ProfessionalCard
        key={prof.id}
        professional={prof}
        onEdit={handleEdit} // ✅ Função estável
        onDelete={handleDelete} // ✅ Função estável
      />
    ))}
  </div>
);
```

#### 4.3 Usar useMemo para Dados Caros de Calcular

```javascript
import { useMemo } from 'react';

export function ProfessionalsPage() {
  const { data: professionals } = useDataCache({...});

  // ❌ Sem memoization: Recalcula a cada render
  // const filtered = professionals.filter(p => p.active);

  // ✅ Com memoization: Calcula apenas quando professionals muda
  const filtered = useMemo(
    () => professionals?.filter(p => p.active) || [],
    [professionals]
  );

  return (
    <ProfessionalsList professionals={filtered} />
  );
}
```

---

### FASE 5: Testes & Validação (30 minutos)

#### 5.1 Medir Performance

Usar Chrome DevTools:
```
1. F12 → Performance tab
2. Grabar nueva sesión
3. Navegar por app
4. Parar grabación
5. Analizar resultados
```

#### 5.2 Verificar Lighthouse Score

```
1. F12 → Lighthouse
2. Clic em "Analyze page load"
3. Ver score (objetivo: 80+)
```

#### 5.3 Teste de Cache

```javascript
// Testar useDataCache
const { data: data1, refresh } = useDataCache({
  key: 'test',
  fetcher: async () => {
    console.time('fetch');
    const result = await fakeFetch();
    console.timeEnd('fetch'); // Primeira: ~100ms
    return result;
  },
});

// Segunda chamada: (deve vir do cache, quase instantâneo)
const { data: data2 } = useDataCache({
  key: 'test',
  fetcher: async () => fakeFetch(), // Não será chamada!
});
```

---

## 🚀 CHECKLIST DE IMPLEMENTAÇÃO

### FASE 1: Audit de Queries
- [ ] Verificar `professionalsApi.js`
- [ ] Verificar `appointmentsApi.js`
- [ ] Verificar `financeApi.js`
- [ ] Verificar `servicesApi.js`
- [ ] Documentar N+1 queries encontradas

### FASE 2: Implementar Cache
- [ ] Criar `useDataCache.js`
- [ ] Aplicar em `getProfessionals()`
- [ ] Aplicar em `getServices()`
- [ ] Aplicar em `getHealthInsurances()`
- [ ] Aplicar em `listAppointments()`
- [ ] Testar se cache funciona

### FASE 3: Paginação
- [ ] Criar `usePagination.js`
- [ ] Aplicar em ProfessionalsList
- [ ] Aplicar em ServiçosList
- [ ] Testar virtualization com 1000+ itens
- [ ] Validar performance com grandes listas

### FASE 4: Memoization
- [ ] Envolver 5+ componentes com `memo()`
- [ ] Usar `useCallback` em 10+ funções
- [ ] Usar `useMemo` em 5+ cálculos
- [ ] Verificar profiler do React

### FASE 5: Validação
- [ ] Lighthouse score ≥ 80
- [ ] API calls reduzidos em 60%
- [ ] Nenhuma regressão visual
- [ ] Documentação atualizada

---

## 📊 ANTES vs DEPOIS

### ANTES (Atual)
```
ProfessionalsPage.jsx
├─ Carrega ALL professionals
├─ 150+ API calls por sessão
├─ Memory: 180MB
├─ First Paint: 2.5s
├─ TTI: 5.2s
└─ Lighthouse: 55
```

### DEPOIS (Depois de PRIORIDADE 3)
```
ProfessionalsPage.jsx
├─ Carrega paginated + cached
├─ 60 API calls por sessão
├─ Memory: 120MB
├─ First Paint: 1.0s
├─ TTI: 1.8s
└─ Lighthouse: 85
```

---

## 📚 REFERÊNCIA RÁPIDA

### useDataCache
```javascript
const { data, loading, error, refresh } = useDataCache({
  key: 'unique_key',
  fetcher: async () => apiCall(),
  ttl: 5 * 60 * 1000, // ms
});
```

### usePagination
```javascript
const { items, page, totalPages, nextPage, prevPage } = 
  usePagination(allItems, 20);
```

### React.memo
```javascript
export const Component = memo(function Component(props) {
  return <div>...</div>;
});
```

### useCallback
```javascript
const handler = useCallback((arg) => {
  // handler logic
}, [dependencies]);
```

### useMemo
```javascript
const computed = useMemo(() => {
  return expensiveComputation();
}, [dependencies]);
```

---

## ❓ FAQ

**P: Posso deixar cache 24h?**  
R: Não, máximo 5-10 minutos. Dados mudam com frequência.

**P: E se alguém editar um profissional?**  
R: Use `refresh()` após editar para invalidar cache.

**P: Devo paginar TODAS as listas?**  
R: Apenas se tiver 50+ itens. Se tiver 10, não vale a pena.

**P: Qual é o número ideal de itens por página?**  
R: 20-50 é bom. Depende do tamanho de cada item.

**P: Preciso de Redux para cache?**  
R: Para começar, sessionStorage é ok. Redux depois.

---

## 🎯 PRÓXIMO PASSO

Chamar: **"Faça PRIORIDADE 3 - Performance & Otimizações"**

Ou se preferir, pode fazer passo-a-passo:
1. "Crie hook useDataCache"
2. "Integre cache em professionalsApi"
3. "Crie hook usePagination"
4. "Aplique memoization em componentes"

---

**Tempo Estimado:** 2-4 horas  
**Dificuldade:** Média  
**Impacto:** 🔥🔥🔥 CRÍTICO
