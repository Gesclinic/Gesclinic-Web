# ✅ EQUIPARAÇÃO ISSQN→ISS - CHECKLIST RÁPIDO

## 🎯 Resumo 1 Linha
Adicionar campos para rastrear se serviço/convênio usa **ISS** ou **ISSQN** (impacta NF, financeiro, contabilidade).

---

## 📋 FASE 1: MIGRAÇÃO DB ⏳ PRÓXIMO

### Passo 1: Executar SQL no Supabase
- [ ] Abrir: https://supabase.com/dashboard/project/gvdkdjyupktlflwurike/sql
- [ ] Copiar: `supabase/migrations/2026-05-21_add_issqn_equiparation_fields.sql`
- [ ] Colar no editor
- [ ] Clicar "Run"
- [ ] ✅ Sem erros?

### Passo 2: Verificar Colunas
```sql
-- Verificar services
SELECT * FROM information_schema.columns 
WHERE table_name='services' AND column_name LIKE '%equiparation%';

-- Verificar health_insurances
SELECT * FROM information_schema.columns 
WHERE table_name='health_insurances' AND column_name LIKE '%equiparation%';

-- Verificar service_prices
SELECT * FROM information_schema.columns 
WHERE table_name='service_prices' AND column_name LIKE '%equiparation%';

-- Verificar função
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'get_service_tax_treatment';
```
- [ ] Todas as colunas aparecem?
- [ ] Função `get_service_tax_treatment` criada?

---

## 💻 FASE 2: ATUALIZAR APIs

### Passo 3: servicesApi.js
**Arquivo:** `src/lib/servicesApi.js`

**Localizar:** Linha 15 (SELECT da função listServices)

**Mudança:**
```diff
  .select(
-   'id, name, code, description, ..., cost_value, active',
+   'id, name, code, description, ..., cost_value, active, has_issqn_equiparation',
  )
```

- [ ] Alterado?
- [ ] Sem erros de lint?

### Passo 4: healthInsurancesApi.js
**Arquivo:** `src/lib/healthInsurancesApi.js`

**Localizar:** Linha 20 (SELECT da função listHealthInsurances)

**Mudança:**
```diff
  .select(`
    id,
    code,
    name,
    ...(todos os campos)...,
+   has_issqn_equiparation
  `)
```

- [ ] Alterado?
- [ ] Sem erros de lint?

### Passo 5: Testar APIs
```bash
# No terminal
npm run dev
```

- [ ] Página carrega sem erros?
- [ ] Console limpo (sem avisos)?

---

## 🎨 FASE 3: SERVICOS PAGE

### Passo 6: Adicionar ao formData
**Arquivo:** `src/pages/clinica/base-sistema/ServicosPage.jsx`

**Localizar:** Linha 45 (const [formData, setFormData])

**Mudança:**
```diff
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    ...outros campos...,
+   has_issqn_equiparation: false,
  });
```

- [ ] Alterado?

### Passo 7: Adicionar no handleNew()
**Localizar:** Função handleNew() linha ~305

**Mudança:** Adicionar `has_issqn_equiparation: false,`

- [ ] Alterado?

### Passo 8: Adicionar no handleEdit()
**Localizar:** Função handleEdit() linha ~340

**Mudança:** Adicionar `has_issqn_equiparation: service.has_issqn_equiparation || false,`

- [ ] Alterado?

### Passo 9: Adicionar Checkbox no Formulário
**Localizar:** Após setor "Tipo de Faturamento" (~line 900)

**Mudança:** Copiar bloco de checkbox do arquivo `🎨_EQUIPACAO_ISSQN_ISS_IMPLEMENTACAO_UI.md`

- [ ] Checkbox adicionado?
- [ ] Estilos corretos?
- [ ] Info box renderiza?

### Passo 10: Adicionar Coluna na Tabela
**Localizar:** Tabela de serviços (~line 600)

**Mudança (thead):**
```jsx
<th className="p-4 text-left font-semibold">Equiparação</th>
```

**Mudança (tbody):**
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

- [ ] Coluna adicionada?
- [ ] Badges aparecem?

### Passo 11: Adicionar no Salvamento
**Localizar:** Função handleSubmit() linha ~430

**Mudança:**
```diff
  const dataToSave = {
    name: formData.name.trim(),
    ...outros campos...,
+   has_issqn_equiparation: formData.has_issqn_equiparation,
  };
```

- [ ] Alterado?

### Passo 12: Testar Serviços
- [ ] Criar novo serviço sem marcar equiparação → Salvar → Reabrir → Badge ISSQN?
- [ ] Criar novo serviço marcando equiparação → Salvar → Reabrir → Badge ISS?
- [ ] Editar serviço → Mudar checkbox → Salvar → Verificar DB?

---

## 💼 FASE 4: CONVENIOS PAGE - ABA TRIBUTOS

### Passo 13: Adicionar ao formData
**Arquivo:** `src/pages/clinica/base-sistema/ConveniosPage.jsx`

**Localizar:** Linha ~110-140 (formData state)

**Mudança:**
```diff
  const [formData, setFormData] = useState({
    ...campos existentes...,
+   has_issqn_equiparation: false,
  });
```

- [ ] Alterado?

### Passo 14: Adicionar Seção 5 em Tributos
**Localizar:** Após "Seção 4 - Alíquotas Customizadas" (~line 4950)

**Mudança:** Copiar seção inteira do arquivo `🎨_EQUIPACAO_ISSQN_ISS_IMPLEMENTACAO_UI.md`

- [ ] Seção adicionada?
- [ ] Info box renderiza?
- [ ] Checkbox funciona (click marca/desmarca)?
- [ ] Feedback verde aparece ao marcar?

### Passo 15: Adicionar no Salvamento
**Localizar:** Função que salva Tributos

**Mudança:** Adicionar `has_issqn_equiparation: formData.has_issqn_equiparation,` no objeto de save

- [ ] Alterado?

### Passo 16: Testar Convênios
- [ ] Abrir convênio → Tributos → Marcar "Aplicar equiparação" → Atualizar → Reabrir → Checkbox marcado?
- [ ] Desmarcar → Atualizar → Reabrir → Checkbox desmarcado?
- [ ] Verificar DB field com valor correto?

---

## 💰 FASE 5: TABELA DE PREÇOS (OPCIONAL AGORA)

### Passo 17: Adicionar Coluna
**Arquivo:** `src/pages/clinica/base-sistema/ServicePricesPage.jsx`

**Localizar:** Tabela de preços (~line 380)

**Mudança (thead):**
```jsx
<th className="p-3 text-left font-semibold">Equiparação</th>
```

**Mudança (tbody):**
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

- [ ] Coluna adicionada?

---

## 🧪 FASE 6: TESTES INTEGRADOS

### Teste 1: Criar Serviço + Convênio
- [ ] Criar serviço "Consulta Médica" com equiparação = TRUE
- [ ] Criar convênio "Unimed" com equiparação = FALSE
- [ ] Resultado esperado: NF usa ISSQN (convênio não ativa)

### Teste 2: Ativar Equiparação
- [ ] Editar "Unimed" → Marcar "Aplicar equiparação" → Salvar
- [ ] Resultado esperado: Agora NF deve usar ISS

### Teste 3: Override
- [ ] Se implementar override na tabela de preços
- [ ] Resultado esperado: Override prevalece sobre convênio

### Teste 4: Verificar DB
```sql
SELECT name, has_issqn_equiparation FROM services WHERE clinic_id = 'YOUR_CLINIC_ID';
SELECT name, has_issqn_equiparation FROM health_insurances WHERE clinic_id = 'YOUR_CLINIC_ID';
```

- [ ] Dados aparecem corretamente?

---

## 📊 FASE 7: DOCUMENTAÇÃO

### Passo 18: Atualizar Documentação
- [ ] Atualizar README com novo campo
- [ ] Criar guia de usuário: "Como marcar equiparação"
- [ ] Documentar para TI de outros sistemas que consultam API

---

## 🚀 FASE 8: INTEGRAÇÃO (PRÓXIMAS SESSÕES)

### Integração Financeiro
- [ ] Consultar equiparação ao registrar receita
- [ ] Classificar como ISSQN ou ISS
- [ ] Aplicar alíquota correta

### Integração NF-e
- [ ] Consultar equiparação ao emitir NF
- [ ] Aplicar tipo de imposto correto

### Integração Contabilidade
- [ ] Segregar receitas por tipo de tributação
- [ ] Natureza de receita diferente

---

## 📈 Progresso

```
FASE 1: Migração DB              [████████░░] 50% (criada, não executada)
FASE 2: APIs                     [░░░░░░░░░░]  0%
FASE 3: ServicosPage             [░░░░░░░░░░]  0%
FASE 4: ConveniosPage            [░░░░░░░░░░]  0%
FASE 5: Tabela de Preços         [░░░░░░░░░░]  0% (opcional)
FASE 6: Testes                   [░░░░░░░░░░]  0%
FASE 7: Documentação             [░░░░░░░░░░]  0%
FASE 8: Integração               [░░░░░░░░░░]  0% (próximas)

Total:                           [████░░░░░░] ~12%
```

---

## 📞 Suporte

| Dúvida | Resposta |
|--------|----------|
| Onde está a migration? | `supabase/migrations/2026-05-21_add_issqn_equiparation_fields.sql` |
| Como executar? | Abrir Supabase → SQL → Copiar/Colar → Run |
| Qual o padrão? | FALSE = ISSQN (regime geral) |
| Posso mudar depois? | Sim, afeta apenas novos registros |
| Preciso de equiparação? | Consulte seu contador! |

---

## ⏰ Tempo Estimado

| Fase | Tempo | Status |
|------|-------|--------|
| 1. Migração | 5 min | ⏳ |
| 2. APIs | 10 min | ⏳ |
| 3. ServicosPage | 20 min | ⏳ |
| 4. ConveniosPage | 20 min | ⏳ |
| 5. Tabela Preços | 15 min | ⏳ |
| 6. Testes | 30 min | ⏳ |
| 7. Docs | 15 min | ⏳ |
| **Total** | **~2h** | ⏳ |

---

## 🎯 Próximo Passo Imediato

```
👉 EXECUTE A MIGRATION NO SUPABASE

1. Abra: https://supabase.com/dashboard/project/gvdkdjyupktlflwurike/sql
2. Clique: "New Query"
3. Cole: supabase/migrations/2026-05-21_add_issqn_equiparation_fields.sql
4. Clique: "Run"
5. Verifique: Sem erros?
6. Próximo: Atualizar APIs
```

---

**Status:** 🟡 Aguardando Execução da Migration  
**Documentação:** ✅ Completa  
**Código:** ✅ Pronto  
**Tempo Total Estimado:** ~2 horas  

