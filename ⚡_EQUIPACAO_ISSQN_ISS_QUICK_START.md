# ⚡ EQUIPARAÇÃO ISSQN→ISS - QUICK START (1 PÁGINA)

## 🎯 O Que?
Adicionar 3 campos no banco para marcar se serviço/convênio usa **ISS** ou **ISSQN**, afetando NF, financeiro e contabilidade.

## 🏗️ Estrutura
```
services.has_issqn_equiparation          → Serviço PODE estar equiparado
health_insurances.has_issqn_equiparation → Convênio APLICA equiparação
service_prices.service_issqn_equiparation → Override por linha
```

## ⚙️ Lógica
```
Se override na linha → usar esse
Senão se convênio + serviço ambos TRUE → ISS
Senão → ISSQN (padrão)
```

---

## 🚀 IMPLEMENTAÇÃO EM 3 PASSOS

### PASSO 1: Migration SQL (5 min)
```
1. Abrir: https://supabase.com/dashboard/project/gvdkdjyupktlflwurike/sql
2. Copiar: supabase/migrations/2026-05-21_add_issqn_equiparation_fields.sql
3. Colar e executar
4. ✅ Done!
```

### PASSO 2: Atualizar 2 APIs (10 min)
**servicesApi.js (linha 15):**
```javascript
// Adicionar no SELECT:
'id, name, ..., cost_value, active, has_issqn_equiparation'
```

**healthInsurancesApi.js (linha 20):**
```javascript
// Adicionar no SELECT:
has_issqn_equiparation
```

### PASSO 3: Atualizar 3 Pages (90 min)

#### ServicosPage.jsx
1. Adicionar no formData: `has_issqn_equiparation: false`
2. Adicionar checkbox no form (copiar de: `🎨_EQUIPACAO_...UI.md`)
3. Adicionar coluna na tabela (badge 🔷 ISS / 📋 ISSQN)
4. Adicionar no salvamento: `has_issqn_equiparation: formData.has_issqn_equiparation`

#### ConveniosPage.jsx (Tributos)
1. Adicionar no formData: `has_issqn_equiparation: false`
2. Adicionar SEÇÃO 5 (copiar bloco de: `🎨_EQUIPACAO_...UI.md`)
3. Adicionar no salvamento

#### ServicePricesPage.jsx
1. Adicionar coluna: "Equiparação"
2. Mostrar: — / ✓ ISS / ✗ ISSQN

---

## 📋 Arquivos de Referência
- 🎯 Solução Completa: `🎯_EQUIPACAO_ISSQN_ISS_SOLUCAO_COMPLETA.md`
- 🎨 Código Exato: `🎨_EQUIPACAO_ISSQN_ISS_IMPLEMENTACAO_UI.md`
- ✅ Checklist: `✅_EQUIPACAO_ISSQN_ISS_CHECKLIST.md`
- 📚 Índice: `📚_EQUIPACAO_ISSQN_ISS_INDICE.md`

---

## 🧪 Testes Rápidos
1. Criar serviço com equiparação = TRUE
2. Criar convênio com equiparação = FALSE
3. Resultado: ISSQN (convênio não ativa)
4. Editar convênio: equiparação = TRUE
5. Resultado: ISS (ambos ativam)

---

## ⏱️ Tempo Total
- Migration: 5 min
- APIs: 10 min
- ServicosPage: 20 min
- ConveniosPage: 20 min
- ServicePricesPage: 20 min
- Testes: 20 min
- **Total: ~95 min (~2h)**

---

## 📞 Dúvidas?
- Técnico: `📋_EQUIPACAO_ISSQN_ISS_PLANO.md`
- UI: `🎨_EQUIPACAO_ISSQN_ISS_IMPLEMENTACAO_UI.md`
- Checar: `✅_EQUIPACAO_ISSQN_ISS_CHECKLIST.md`

---

**Status:** ✅ PRONTO PARA IMPLEMENTAR  
**Começar:** PASSO 1 acima
