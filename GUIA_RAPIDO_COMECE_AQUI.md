# 🚀 GUIA RÁPIDO - COMECE A INTEGRAÇÃO AGORA

## ⚡ 3 PASSOS PARA INTEGRAR CACHE

### PASSO 1: Copiar Exemplo (2 min)
```bash
# Abrir arquivo de exemplo
EXEMPLO_INTEGRACAO_CACHE_PAGINACAO.jsx

# Este arquivo mostra:
# ✅ useDataCache em ação
# ✅ usePagination em ação
# ✅ React.memo em ação
# ✅ useCallback em ação
# ✅ useMemo em ação
```

### PASSO 2: Escolher Componente (1 min)
Selecione qual componente fazer primeiro:

1. **MAIS RÁPIDO (5 min):** Qualquer select/dropdown
2. **MAIS IMPACTO (10 min):** ProfessionalsPage.jsx
3. **MAIS COMPLEXO (15 min):** CashflowPage.jsx

**RECOMENDAÇÃO:** Comece com ProfessionalsPage.jsx

### PASSO 3: Aplicar Padrão (5-15 min)
Siga este padrão em qualquer componente:

#### Antes (Sem Cache):
```javascript
// ❌ ANTES
import { useEffect, useState } from "react";
import * as professionalsApi from "@/lib/professionalsApi";

export function ProfessionalsPage() {
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    professionalsApi.listProfessionals(clinicId).then((data) => {
      setProfessionals(data);
      setLoading(false);
    });
  }, [clinicId]);

  return <div>{/* ... */}</div>;
}
```

#### Depois (Com Cache):
```javascript
// ✅ DEPOIS
import { useCallback, useMemo } from "react";
import { useDataCache, CacheManager } from "@/hooks/useDataCache";
import { usePagination } from "@/hooks/usePagination";
import * as professionalsApi from "@/lib/professionalsApi";

export function ProfessionalsPage() {
  // 1️⃣ CACHE: Substituir useState por useDataCache
  const { data: professionals, loading, refresh } = useDataCache({
    key: `professionals_${clinicId}`,
    fetcher: () => professionalsApi.listProfessionals(clinicId),
    ttl: 5 * 60 * 1000, // 5 min
  });

  // 2️⃣ PAGINAÇÃO: Dividir em páginas
  const {
    items: paginatedProfessionals,
    page,
    totalPages,
    nextPage,
    prevPage,
  } = usePagination(professionals || [], 20);

  // 3️⃣ MEMOIZAÇÃO: Filtros com useMemo
  const activeProfessionals = useMemo(
    () => (professionals || []).filter((p) => p.active),
    [professionals]
  );

  // 4️⃣ CALLBACKS: Handlers com useCallback
  const handleUpdate = useCallback(async (id, data) => {
    await professionalsApi.updateProfessional(id, data);
    CacheManager.invalidate(`professionals_${clinicId}`);
    refresh();
  }, [clinicId, refresh]);

  return (
    <div>
      {/* ... */}
      {paginatedProfessionals.map((prof) => (
        <ProfessionalCard
          key={prof.id}
          professional={prof}
          onEdit={(data) => handleUpdate(prof.id, data)}
        />
      ))}
      {/* Paginação */}
    </div>
  );
}

// 5️⃣ MEMO: Wrap cards
import { memo } from "react";
export const ProfessionalCard = memo(function ProfessionalCard(props) {
  return <div>{/* ... */}</div>;
});
```

---

## 📋 CHECKLIST RÁPIDO

Para cada componente que otimizar, seguir esta ordem:

### Setup (1 min)
- [ ] Importar `useDataCache, CacheManager` de `@/hooks/useDataCache`
- [ ] Importar `usePagination` de `@/hooks/usePagination`
- [ ] Importar `memo` de `react`

### Implementar Cache (2 min)
- [ ] Encontrar `useState([])` de lista
- [ ] Substituir por `useDataCache({ key, fetcher, ttl })`
- [ ] Remover `useEffect` que faz fetch

### Implementar Paginação (2 min)
- [ ] Após cache, adicionar `usePagination`
- [ ] Usar `paginatedItems` no render ao invés de `items`
- [ ] Adicionar botões Next/Prev

### Implementar Memo (1 min)
- [ ] Wrap componente Card com `memo()`
- [ ] Testar: Card não deve piscar ao atualizar página

### Implementar Callbacks (2 min)
- [ ] Wrap handlers com `useCallback`
- [ ] Adicionar `CacheManager.invalidate()` após CREATE/UPDATE/DELETE

### Testar (5 min)
- [ ] Abrir DevTools → Network
- [ ] Deve fazer 1-2 requests no máximo
- [ ] Ao mudar página: 0 requests
- [ ] Ao editar: 1 request de update + refresh do cache

---

## 🎯 COMPONENTES RECOMENDADOS POR DIFICULDADE

### ⭐ FÁCIL (5 min cada)
Comece por estes se quiser ganhar confiança:

1. **ServiceSelect.jsx** ou qualquer dropdown
2. **HealthInsuranceSelect.jsx**
3. **PatientSelect.jsx**

Padrão: Todos seguem o mesmo modelo, apenas sem paginação.

### ⭐⭐ MÉDIO (10 min cada)
Maior impacto, complexidade moderada:

1. **ProfessionalsPage.jsx** ← RECOMENDADO PRIMEIRO
2. **EstoquePage.jsx** (se existir)
3. **PatientsPage.jsx** (se existir)

Padrão: useDataCache + usePagination + memo + callback

### ⭐⭐⭐ DIFÍCIL (15 min cada)
Mais complexo, maior payoff:

1. **AgendaPage.jsx** (múltiplos caches)
2. **CashflowPage.jsx** / FinanceoDashboard (composite keys)

Padrão: useDataCache com composite keys, múltiplas caches

---

## 🔥 VALIDAÇÃO RÁPIDA

Depois de cada integração, validar com:

```javascript
// 1. Abrir DevTools → Network
// 2. Reload página
// 3. Verificar: Deve ter apenas 1-2 requisições para a API
// 4. Mudar página: 0 requisições (tudo do cache)
// 5. Editar algo: 1 requisição + refresh do cache

// OU: Usar console para debug
import { CacheManager } from "@/hooks/useDataCache";
CacheManager.debug(); // Mostra estado do cache
```

---

## 🎁 BÔNUS: INVALIDAÇÃO AUTOMÁTICA

Se quiser invalidar cache automaticamente após operações:

```javascript
// EM CADA API CALL DE CREATE/UPDATE/DELETE:

// Opção 1: Direto na API
async function updateProfessional(id, data) {
  const result = await supabase.from("professionals").update(data).eq("id", id);
  CacheManager.invalidate(`professionals_${clinicId}`); // ← ADICIONAR ISSO
  return result;
}

// Opção 2: No componente
const handleUpdate = useCallback(async (id, data) => {
  await api.update(id, data);
  refresh(); // ← OU ISSO (mais seguro)
}, [refresh]);
```

---

## ⏰ TIMELINE

| Componente | Tempo | Status |
|-----------|-------|--------|
| ProfessionalsPage | 10 min | 🟩 PRÓXIMO |
| AgendaPage | 15 min | ⏳ |
| CashflowPage | 15 min | ⏳ |
| Estoque | 10 min | ⏳ |
| Selects (3x) | 10 min | ⏳ |
| Memoização | 10 min | ⏳ |
| Callbacks | 10 min | ⏳ |
| **TOTAL** | **80 min** | |

---

## 📞 AJUDA RÁPIDA

Se algo não funcionar:

1. **"Cache não está funcionando"**
   - Verificar: `key` é único? (deve ter `clinicId`)
   - Verificar: `fetcher` é função que retorna Promise?
   - Verificar: `ttl` é número em millisegundos?

2. **"Componente está re-renderizando muito"**
   - Adicionar: `React.memo()` no componente
   - Verificar: Callbacks têm `useCallback`?
   - Verificar: Props complexas estão memoizadas?

3. **"Mudei dados mas cache não atualizou"**
   - Adicionar: `CacheManager.invalidate(key)` após update
   - OU: Usar `refresh()` do hook

4. **"Paginação não funciona"**
   - Verificar: `usePagination` recebe array como 1º argumento?
   - Verificar: Está usando `items` (paginadas) no render?

---

## 🚀 COMEÇAR AGORA

1. Abrir `src/pages/clinica/base-sistema/ProfessionalsPage.jsx`
2. Copiar padrão de `EXEMPLO_INTEGRACAO_CACHE_PAGINACAO.jsx`
3. Colar no componente
4. Salvar e testar no navegador
5. Verificar DevTools → Network
6. Próximo componente!

**Tempo total esperado:** 2-3 horas para integração completa.

---

**Criado em:** 2025-01-15
**Status:** PRONTO PARA COMEÇAR
**Próximo:** ProfessionalsPage.jsx
