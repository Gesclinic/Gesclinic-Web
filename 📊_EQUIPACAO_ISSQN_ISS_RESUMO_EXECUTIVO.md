# 📊 EQUIPARAÇÃO ISSQN→ISS - RESUMO EXECUTIVO

## 🎯 Objetivo da Solução
Rastrear se cada serviço em cada convênio usa **ISSQN (municipal)** ou **ISS (federal/estadual)**, com impacto automático em:
- ✅ Emissão de Nota Fiscal
- ✅ Financeiro (classificação de receita)
- ✅ Contabilidade (natureza e código contábil)

---

## 🏗️ Arquitetura da Solução

```
┌─────────────────────────────────────────────────────────────┐
│                     SERVIÇO                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ • Nome: "Consulta Médica"                            │  │
│  │ • Categoria: Consulta                                │  │
│  │ • ☑️ Pode estar equiparado? (TRUE/FALSE)   ← NOVO    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                  CONVÊNIO/SEGURO                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ • Nome: "Unimed"                                     │  │
│  │ • Tipo: Health Insurance                             │  │
│  │ • ☑️ Aplicar equiparação ISSQN→ISS?  ← NOVO         │  │
│  │   (FALSE=ISSQN / TRUE=ISS)                           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│              PREÇO DO SERVIÇO × CONVÊNIO                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ • Serviço: Consulta Médica                           │  │
│  │ • Convênio: Unimed                                   │  │
│  │ • Valor: R$ 100,00                                   │  │
│  │ • Override: — / ✓ ISS / ✗ ISSQN     ← NOVO (opt)   │  │
│  │   (NULL=padrão do convênio)                          │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          ↓
         ┌────────────────┴────────────────┐
         │                                 │
    EMISSÃO DE NF                   REGISTRO FINANCEIRO
    ┌────────────────┐             ┌──────────────────┐
    │ Consulta: R$100│             │ Receita: R$ 100  │
    │ Imposto: ISSQN │             │ Tipo: ISSQN 4%   │
    │ Alíquota: 4%   │             │ Imposto: R$ 4    │
    │ Líquido: R$ 96 │             │ Líquido: R$ 96   │
    └────────────────┘             └──────────────────┘
```

---

## 🔄 Lógica de Determinação

```
QUAL IMPOSTO USAR? (Prioridade)

1️⃣ OVERRIDE ESPECÍFICO (service_prices.service_issqn_equiparation)
   ├─ NULL  → Passar para próxima regra
   ├─ TRUE  → ISS ✓
   └─ FALSE → ISSQN ✓

2️⃣ CONVÊNIO + SERVIÇO
   ├─ Convênio equiparado (TRUE) + Serviço equipável (TRUE)
   │  └─ ISS ✓
   └─ Caso contrário
      └─ ISSQN ✓

3️⃣ PADRÃO
   └─ ISSQN ✓ (regime geral)
```

---

## 📈 Impactos por Módulo

### 📑 SERVIÇOS
```
ServicosPage.jsx
├─ Novo campo: "☑️ Pode estar equiparado de ISSQN→ISS"
├─ Checkbox (FALSE por padrão)
├─ Coluna na tabela: 🔷 ISS / 📋 ISSQN
└─ Impacto: Define disponibilidade de equiparação
```

### 💼 CONVÊNIOS
```
ConveniosPage.jsx → Aba Tributos
├─ Nova SEÇÃO 5: "Equiparação ISSQN → ISS"
├─ Checkbox: "☑️ Aplicar equiparação"
├─ Info box: Regra e alíquotas
└─ Impacto: Define padrão para todos os serviços
```

### 💰 TABELA DE PREÇOS
```
ServicePricesPage.jsx
├─ Nova coluna: "Equiparação"
├─ Opções: — (padrão) / ✓ ISS / ✗ ISSQN
├─ Permite override por serviço×convênio
└─ Impacto: Controle fino por linha
```

### 📄 FINANCEIRO
```
financeiro/fluxo-caixa/
├─ Ao registrar receita: Consulta equiparação
├─ Classifica como: "ISSQN 4%" ou "ISS 2%"
├─ Alíquota aplicada automaticamente
└─ Impacto: Receita com classificação correta
```

### 📋 NOTA FISCAL
```
nf-e/emissions/
├─ Ao emitir NF: Consulta equiparação
├─ Define: Tipo de imposto na NF
├─ Alíquota refletida no PDF
└─ Impacto: NF com imposto correto
```

### 📊 CONTABILIDADE
```
contabilidade/
├─ Natureza de receita: ISSQN vs ISS
├─ Código contábil diferente
├─ Lançamentos separa por tipo
└─ Impacto: DRE com segregação correta
```

---

## 📋 Exemplo de Uso

### Cenário 1: Serviço Normal (Padrão)
```
Serviço: Consulta Médica
  has_issqn_equiparation = FALSE (padrão)

Convênio: Unimed
  has_issqn_equiparation = FALSE (padrão)

Resultado: ISSQN 4% (conforme município)
```

### Cenário 2: Serviço + Convênio Equiparados
```
Serviço: Consultoria de TI
  has_issqn_equiparation = TRUE ✓

Convênio: Empresa X
  has_issqn_equiparation = TRUE ✓

Resultado: ISS 2% (Lei 13.985/2020)
```

### Cenário 3: Serviço Equipável, Convênio Não
```
Serviço: Consultoria
  has_issqn_equiparation = TRUE ✓

Convênio: Segurado Conservador
  has_issqn_equiparation = FALSE

Resultado: ISSQN 4% (convênio não ativa equiparação)
```

### Cenário 4: Override na Tabela de Preços
```
Serviço: Consulta
  has_issqn_equiparation = TRUE ✓

Convênio: Unimed
  has_issqn_equiparation = TRUE ✓

Preço do Serviço × Convênio:
  service_issqn_equiparation = FALSE ← Override!

Resultado: ISSQN 4% (override prevalece!)
```

---

## 📁 Arquivos Criados

| Arquivo | Propósito |
|---------|-----------|
| `📋_EQUIPACAO_ISSQN_ISS_PLANO.md` | Planejamento arquitetural completo |
| `⚡_EQUIPACAO_ISSQN_ISS_EXECUCAO.md` | Guia de execução (migration) |
| `🎨_EQUIPACAO_ISSQN_ISS_IMPLEMENTACAO_UI.md` | Detalhes de implementação de UI |
| `supabase/migrations/2026-05-21_...sql` | Migration SQL (campos + função) |
| `📊_EQUIPACAO_ISSQN_ISS_RESUMO_EXECUTIVO.md` | Este arquivo |

---

## 🚀 Roadmap de Implementação

### FASE 1: Preparação ✅ CONCLUÍDO
- [x] Criar plano arquitetural
- [x] Definir campos no banco
- [x] Escrever migration SQL
- [x] Documentar solução

### FASE 2: Banco de Dados ⬜ PRÓXIMO
- [ ] Executar migration no Supabase
- [ ] Verificar colunas criadas
- [ ] Testar função `get_service_tax_treatment()`

### FASE 3: Backend APIs ⬜
- [ ] Atualizar `servicesApi.js` (SELECT)
- [ ] Atualizar `healthInsurancesApi.js` (SELECT)
- [ ] Adicionar helper `getTaxTreatment()`

### FASE 4: Frontend UI ⬜
- [ ] ServicosPage.jsx (checkbox + coluna)
- [ ] ConveniosPage.jsx (Seção 5)
- [ ] ServicePricesPage.jsx (coluna override)
- [ ] Testar UI

### FASE 5: Integração ⬜
- [ ] Financeiro (classificar receita)
- [ ] NF-e (aplicar imposto)
- [ ] Contabilidade (segregar)

### FASE 6: Testes e Validação ⬜
- [ ] Testes unitários
- [ ] Testes integrados
- [ ] Validação fiscal

---

## 🎓 Referências Legais

### Lei 13.985/2020 (Equiparação)
Transfere tributação de alguns serviços de **ISSQN (municipal)** para **ISS (federal)**

### Reforma 2024 (IBS/CBS)
- **IBS:** ~9.65% (estadual)
- **CBS:** ~6.97% (federal)
- **ISS (total):** ~2% (federal, após reforma)

### Nota Importante
A equiparação é opcional por convênio. Cada clínica decide se aplica baseado em:
1. Lei aplicável ao município
2. Contrato com seguradora
3. Orientação contábil/fiscal

---

## 💡 Benefícios

| Benefício | Descrição |
|-----------|-----------|
| **Conformidade Fiscal** | Cada serviço tributado conforme lei |
| **Automação** | Imposto correto na NF automaticamente |
| **Auditoria** | Rastreabilidade de decisões |
| **Flexibilidade** | Marcar por serviço, convênio ou linha |
| **Redução de Erros** | Menos chances de erro manual |
| **Financeiro Correto** | Receitas classificadas conforme imposto |
| **Contabilidade Precisa** | DRE segregada por tipo de tributação |

---

## ❓ FAQ

**P: Preciso usar equiparação?**  
R: Depende de sua legislação local e contratos. Consulte seu contador!

**P: Posso mudar depois?**  
R: Sim, mas afetará apenas novos registros/reemissões.

**P: O que fazer com invoices antigas?**  
R: Continuam com configuração original. Reemissões usarão nova regra.

**P: E se esqueci de marcar?**  
R: Padrão é ISSQN (regime geral). Pode marcar depois.

**P: Afeta a agenda?**  
R: Não. Apenas impacta financeiro, NF e contabilidade.

---

## 📞 Próximos Passos

1. **Hoje:** Revisar este plano ✓
2. **Próximo:** Executar migration no Supabase
3. **Depois:** Atualizar UIs conforme guia
4. **Validar:** Testar completo

---

**Status:** ✅ Planejamento Concluído  
**Data:** 2026-05-21  
**Versão:** 1.0  
**Responsável:** Implementação

---

## 📎 Links Rápidos

- 📋 [Plano Completo](📋_EQUIPACAO_ISSQN_ISS_PLANO.md)
- ⚡ [Guia Execução](⚡_EQUIPACAO_ISSQN_ISS_EXECUCAO.md)
- 🎨 [Detalhes UI](🎨_EQUIPACAO_ISSQN_ISS_IMPLEMENTACAO_UI.md)
- 📊 [Este Resumo](📊_EQUIPACAO_ISSQN_ISS_RESUMO_EXECUTIVO.md)
