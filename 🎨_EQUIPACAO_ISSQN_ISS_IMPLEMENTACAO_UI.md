# 🎨 EQUIPARAÇÃO ISSQN→ISS - IMPLEMENTAÇÃO DE UI

## 📋 Resumo
Após a migration SQL ser executada, precisamos atualizar 3 arquivos principais para adicionar a UI de equiparação.

---

## 🔧 ETAPA 2: Atualizar API (servicesApi.js e healthInsurancesApi.js)

### servicesApi.js - Atualizar SELECT
**Arquivo:** `src/lib/servicesApi.js`

**Local de mudança:** Linha ~15 (função `listServices`)

**Antes:**
```javascript
const { data, error } = await supabase
  .from('services')
  .select(
    'id, name, code, description, default_duration_minutes, type_billing, allow_scheduling_fit, requires_authorization, base_value, service_category, is_billable, tuss_code, type_service, guide_type, unit_measure, cost_value, active',
  )
```

**Depois:**
```javascript
const { data, error } = await supabase
  .from('services')
  .select(
    'id, name, code, description, default_duration_minutes, type_billing, allow_scheduling_fit, requires_authorization, base_value, service_category, is_billable, tuss_code, type_service, guide_type, unit_measure, cost_value, active, has_issqn_equiparation',
  )
```

---

### healthInsurancesApi.js - Atualizar SELECT
**Arquivo:** `src/lib/healthInsurancesApi.js`

**Local de mudança:** Linha ~20 (função `listHealthInsurances`)

**Adicionar no SELECT:**
```javascript
.select(`
  id,
  code,
  name,
  // ... campos existentes ...
  has_issqn_equiparation
`)
```

---

## 🎨 ETAPA 3: Atualizar UI - ServicosPage.jsx

### Adicionar Campo no Formulário
**Arquivo:** `src/pages/clinica/base-sistema/ServicosPage.jsx`

**Localizar:** Linha ~45-70 (onde está `formData`)

**Adicionar no estado formData:**
```javascript
const [formData, setFormData] = useState({
  name: '',
  description: '',
  // ... outros campos ...
  has_issqn_equiparation: false, // ← NOVO
  // ===== NOVOS CAMPOS TISS =====
  tuss_code: '',
  // ... outros campos ...
});
```

**Localizar:** Na função `handleNew()` (linha ~305)

**Adicionar:**
```javascript
has_issqn_equiparation: false, // ← NOVO
```

**Localizar:** Na função `handleEdit()` (linha ~340)

**Adicionar:**
```javascript
has_issqn_equiparation: service.has_issqn_equiparation || false, // ← NOVO
```

### Adicionar Checkbox no Formulário

**Localizar:** Após o setor de "Tipo de Faturamento" (linha ~900)

**Adicionar este bloco:**
```jsx
{/* ===== EQUIPARAÇÃO ISSQN → ISS ===== */}
<div className="border-t border-gray-200 pt-6 mt-6">
  <h3 className="text-lg font-bold text-gray-900 mb-4">
    💰 Tributação
  </h3>
  
  <div className="flex items-start gap-3">
    <input
      type="checkbox"
      id="has_issqn_equiparation"
      checked={formData.has_issqn_equiparation}
      onChange={(e) =>
        setFormData({ ...formData, has_issqn_equiparation: e.target.checked })
      }
      className="w-5 h-5 rounded border border-gray-300 cursor-pointer accent-blue-600 mt-1"
      disabled={submitting}
    />
    <div>
      <label
        htmlFor="has_issqn_equiparation"
        className="text-sm font-semibold text-gray-800 cursor-pointer"
      >
        ✓ Pode estar equiparado de ISSQN para ISS
      </label>
      <p className="text-xs text-gray-600 mt-2">
        📌 <strong>Equiparação (Lei 13.985/2020):</strong> Alguns serviços podem ter tributação por ISS em vez de ISSQN<br/>
        📌 <strong>Exemplo:</strong> Serviços de TI, consultoria, pesquisa técnica<br/>
        📌 <strong>Nota:</strong> A aplicação final depende das regras do convênio e município
      </p>
    </div>
  </div>
</div>
```

### Adicionar na Tabela de Listagem

**Localizar:** Linha ~600 (onde está a tabela de serviços)

**Adicionar coluna no `<thead>`:**
```jsx
<th className="p-4 text-left font-semibold">Equiparação</th>
```

**Adicionar coluna no `<tbody>`:**
```jsx
<td className="p-4">
  {service.has_issqn_equiparation ? (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
      🔷 ISS
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-semibold">
      📋 ISSQN
    </span>
  )}
</td>
```

### Adicionar no Salvamento

**Localizar:** Função `handleSubmit()` (linha ~430)

**No objeto `dataToSave`, adicionar:**
```javascript
const dataToSave = {
  name: formData.name.trim(),
  // ... outros campos ...
  has_issqn_equiparation: formData.has_issqn_equiparation, // ← NOVO
  // ===== NOVOS CAMPOS TISS =====
  // ... outros campos ...
};
```

---

## 🎨 ETAPA 4: Atualizar UI - ConveniosPage.jsx (Aba Tributos)

### Adicionar Campo no formData

**Localizar:** Linha ~110-140 (formData state)

**Adicionar:**
```javascript
has_issqn_equiparation: false, // ← NOVO
```

### Adicionar Seção na Aba Tributos

**Localizar:** Após a "Seção 4 - Alíquotas Customizadas" (linha ~4950)

**Adicionar este bloco:**
```jsx
{/* ============================================================
    SEÇÃO 5 - EQUIPARAÇÃO ISSQN → ISS
    ============================================================ */}
<div className="border rounded-lg p-6 bg-gradient-to-br from-indigo-50 to-purple-50">
  {/* Header */}
  <div className="flex items-center gap-2 mb-4">
    <span className="text-2xl">⚖️</span>
    <div>
      <h3 className="text-lg font-bold text-gray-900">
        Seção 5 - Equiparação ISSQN → ISS
      </h3>
      <p className="text-sm text-gray-600">
        Define se os serviços desta clínica usam ISS (Lei 13.985/2020) em vez de ISSQN municipal
      </p>
    </div>
  </div>

  {/* Info Box */}
  <div className="mb-4 p-3 bg-indigo-100 border border-indigo-300 rounded-lg text-sm text-indigo-900">
    <p>
      <strong>ℹ️ Equiparação:</strong> Transferência de tributação de ISSQN (municipal, 2-5%) para ISS federal (2% + IBS estadual, ~9.65%)
    </p>
    <p className="mt-2">
      <strong>✓ Aplica a:</strong> Serviços de TI, consultoria, pesquisa, serviços especializados (conforme Lei)
    </p>
    <p className="mt-2">
      <strong>⚠️ Importante:</strong> Marque esta opção se seu convênio/fornecedor exige ISS em vez de ISSQN
    </p>
  </div>

  {/* Checkbox */}
  <div className="flex items-start gap-3 p-4 bg-white rounded-lg border border-gray-200">
    <input
      type="checkbox"
      id="checkbox_issqn_equiparation"
      checked={formData.has_issqn_equiparation || false}
      onChange={(e) => setFormData({ ...formData, has_issqn_equiparation: e.target.checked })}
      className="w-5 h-5 rounded border border-gray-300 cursor-pointer accent-indigo-600 mt-1"
      disabled={submitting}
    />
    <div className="flex-1">
      <label
        htmlFor="checkbox_issqn_equiparation"
        className="text-sm font-semibold text-gray-800 cursor-pointer block"
      >
        ✓ Aplicar equiparação ISSQN → ISS neste convênio
      </label>
      <p className="text-xs text-gray-600 mt-2">
        Quando marcado, os serviços desta clínica neste convênio serão tributados por ISS em vez de ISSQN (conforme legislação de equiparação)
      </p>
      <p className="text-xs text-gray-500 mt-2 font-mono">
        Padrão: FALSE (usa ISSQN municipal conforme regra geral)
      </p>
    </div>
  </div>

  {/* Feedback */}
  {formData.has_issqn_equiparation && (
    <div className="mt-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex items-start gap-2">
      <span className="text-lg">✓</span>
      <div>
        <p className="text-sm font-semibold text-indigo-900">Equiparação Ativada</p>
        <p className="text-xs text-indigo-800 mt-1">
          Serviços equipáveis neste convênio usarão: <strong>ISS (2%) + IBS (~9.65%)</strong>
        </p>
      </div>
    </div>
  )}
</div>
```

### Adicionar no Salvamento

**Localizar:** Função de salvamento de Tributos (próximo ao botão Atualizar)

**Adicionar no objeto que salva:**
```javascript
has_issqn_equiparation: formData.has_issqn_equiparation,
```

---

## 📊 ETAPA 5: Atualizar Tabela de Preços (ServicePricesPage.jsx)

### Adicionar Coluna

**Localizar:** Tabela de preços (linha ~380)

**No `<thead>` adicionar:**
```jsx
<th className="p-3 text-left font-semibold">Equiparação</th>
```

**No `<tbody>` adicionar:**
```jsx
<td className="p-3">
  <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
    {priceEntry.service_issqn_equiparation === null
      ? '— (padrão)'
      : priceEntry.service_issqn_equiparation
      ? '✓ ISS'
      : '✗ ISSQN'}
  </span>
</td>
```

---

## ✅ Checklist de Implementação

- [ ] 1. Executar migration SQL no Supabase
- [ ] 2. Atualizar `servicesApi.js` (SELECT)
- [ ] 3. Atualizar `healthInsurancesApi.js` (SELECT)
- [ ] 4. Atualizar `ServicosPage.jsx`:
  - [ ] 4a. Adicionar campo formData
  - [ ] 4b. Adicionar na função handleNew()
  - [ ] 4c. Adicionar na função handleEdit()
  - [ ] 4d. Adicionar checkbox no formulário
  - [ ] 4e. Adicionar coluna na tabela
  - [ ] 4f. Adicionar no salvamento
- [ ] 5. Atualizar `ConveniosPage.jsx` (Seção 5 Tributos)
- [ ] 6. Atualizar `ServicePricesPage.jsx` (coluna)
- [ ] 7. Testar UI
- [ ] 8. Testar salvamento/carregamento
- [ ] 9. Criar helper para determinar equiparação

---

## 🧪 Testes Sugeridos

### Teste 1: Marcar Equiparação no Serviço
1. Ir a Serviços
2. Criar novo serviço
3. Marcar "Pode estar equiparado"
4. Salvar
5. Reabrir → Verificar se checkbox está marcado

### Teste 2: Marcar Equiparação no Convênio
1. Ir a Convênios
2. Editar convênio
3. Ir a aba "Tributos"
4. Marcar "Aplicar equiparação ISSQN → ISS"
5. Salvar
6. Reabrir → Verificar se checkbox está marcado

### Teste 3: Verificar Dados Salvos
1. Abrir Supabase Dashboard
2. Abrir tabela `services`
3. Verificar coluna `has_issqn_equiparation`
4. Abrir tabela `health_insurances`
5. Verificar coluna `has_issqn_equiparation`

---

## 📝 Próximas Etapas Futuras

### ETAPA 6: Criar Helper Function
```javascript
// em src/lib/financeHelpers.js
export function getTaxTreatment(service, healthInsurance, servicePrice) {
  // Lógica de prioridade
  if (servicePrice?.service_issqn_equiparation !== null) {
    return servicePrice.service_issqn_equiparation ? 'ISS' : 'ISSQN';
  }
  if (healthInsurance?.has_issqn_equiparation && service?.has_issqn_equiparation) {
    return 'ISS';
  }
  return 'ISSQN';
}
```

### ETAPA 7: Integração Financeiro
Usar a helper para classificar receitas com tipo correto

### ETAPA 8: Integração NF-e
Usar a helper para aplicar imposto correto na NF

---

**Status:** 📋 Pronto para Implementação  
**Próximo:** Executar as mudanças listadas acima
