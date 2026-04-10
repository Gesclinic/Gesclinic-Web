# 📐 ESTRUTURA TÉCNICA - NOVO MODELO CONCEITUAL

## 🎯 Arquitetura de 3 Grupos

A Base do Sistema agora segue um modelo conceitual claro onde os 12 itens de menu se dividem em 3 grupos lógicos e progressivos.

---

## 📋 GRUPO 1: CADASTROS ESTRUTURAIS

**Propósito:** Dados básicos da clínica (nenhuma lógica, apenas cadastro)  
**Ordem:** Primeiro  
**Cores:** 🔵 Azul (bg-blue-50)

### Items

| # | ID | Nome | Path | Descrição | Ícone |
|---|-----|------|------|-----------|-------|
| 1 | `services` | Serviços | `/clinica/base-sistema/servicos` | Tipos de atendimento | 🩺 |
| 2 | `professionals` | Profissionais | `/clinica/base-sistema/profissionais` | Médicos e terapeutas | 👥 |
| 3 | `health_insurances` | Convênios | `/clinica/base-sistema/convenios` | Operadoras de saúde | 🏥 |
| 4 | `rooms` | Salas | `/clinica/base-sistema/salas` | Consultórios e áreas | 🚪 |
| 5 | `resources` | Recursos | `/clinica/base-sistema/recursos` | Equipamentos e materiais | 📦 |

### Dependências
- Nenhuma (são dados básicos)

### Wizard Status
- `category`: `cadastros-estruturais`
- `required`: 3/5 (Serviços, Profissionais obrigatórios)
- `minItems`: Serviços ≥1, Profissionais ≥1

---

## ⚙️ GRUPO 2: REGRAS OPERACIONAIS

**Propósito:** Como o sistema funciona (vínculos, relacionamentos, agendamento)  
**Ordem:** Segundo (após Cadastros)  
**Cores:** 🟠 Âmbar (bg-amber-50)

### Items

| # | ID | Nome | Path | Descrição | Ícone |
|---|-----|------|------|-----------|-------|
| 6 | `professional_services` | Prof × Serviços | `/clinica/base-sistema/professional-services` | Vincular prof aos serviços | 🔗 |
| 7 | `professional_payer` | Prof × Convênios | `/clinica/base-sistema/profissional-payer` | Vincular prof aos convênios | 👤💼 |
| 8 | `agenda_rules` | Regras da Agenda | `/clinica/base-sistema/agenda-rules` | Duração e intervalo | 📅 |
| 9 | `room_resources` | Salas × Recursos | `/clinica/base-sistema/room-resources` | Equipamentos por sala | ⚡ |

### Dependências
- `professional_services` depende de: `services`, `professionals`
- `professional_payer` depende de: `professionals`, `health_insurances`
- `agenda_rules` depende de: `services`
- `room_resources` depende de: `rooms`, `resources`

### Wizard Status
- `category`: `regras-operacionais`
- `required`: 2/4 (Prof×Serviços, Agenda Rules obrigatórios)
- `features_unlocked`: Agenda, Check-in

---

## 💰 GRUPO 3: PARÂMETROS FINANCEIROS

**Propósito:** Preços e repasses (configurações monetárias)  
**Ordem:** Terceiro (após Regras)  
**Cores:** 🟢 Verde (bg-green-50)

### Items

| # | ID | Nome | Path | Descrição | Ícone |
|---|-----|------|------|-----------|-------|
| 10 | `service_prices` | Tabela de Preços | `/clinica/base-sistema/service-prices` | Valores dos serviços | 💵 |
| 11 | `professional_schedule` | Valores por Convênio | `/clinica/base-sistema/profissional-schedule` | Config específica | 📈 |
| 12 | `revenue_rules` | Regras de Repasse | `/clinica/base-sistema/revenue-rules` | Remuneração profissionais | 📊 |

### Dependências
- `service_prices` depende de: `services`, `health_insurances`
- `professional_schedule` depende de: `health_insurances`
- `revenue_rules` depende de: `services`, `professionals`

### Wizard Status
- `category`: `parametros-financeiros`
- `required`: 0/3 (Todos opcionais, recomendados)
- `features_unlocked`: Finance, Auditing

---

## 📊 PROGRESSÃO DO USUÁRIO

```
Fase 1: CADASTROS ESTRUTURAIS (0-30%)
├─ Criar 1+ Serviço
├─ Criar 1+ Profissional
├─ Criar Convênios (opcional)
├─ Criar Salas (opcional)
└─ Criar Recursos (opcional)
   └─ ✅ Progresso: 0-30%

Fase 2: REGRAS OPERACIONAIS (31-60%)
├─ Vincular Prof × Serviço (OBRIGATÓRIO)
├─ Vincular Prof × Convênio (se houver)
├─ Configurar Regras de Agenda (OBRIGATÓRIO)
└─ Vincular Salas × Recursos (se houver)
   └─ ✅ Progresso: 31-60%

Fase 3: PARÂMETROS FINANCEIROS (61-85%)
├─ Configurar Tabela de Preços (recomendado)
├─ Valores por Convênio (se houver)
└─ Regras de Repasse (recomendado)
   └─ ✅ Progresso: 61-85%

Pronto: (85-100%)
└─ ✅ Sistema 100% funcional
```

---

## 🎨 BREADCRUMB EM CADA PÁGINA

Cada página mostra visualmente onde o usuário está:

### Exemplo: Serviços (Cadastros Estruturais)
```
🏠 Home > 📋 Cadastros Estruturais > 🩺 Serviços
[blue background box]
```

### Exemplo: Prof × Serviços (Regras Operacionais)
```
🏠 Home > ⚙️ Regras Operacionais > 🔗 Profissionais × Serviços
[amber background box]
```

### Exemplo: Tabela de Preços (Financeiro)
```
🏠 Home > 💰 Parâmetros Financeiros > 💵 Tabela de Preços
[green background box]
```

---

## 🔗 RELAÇÃO COM FEATURE BLOCKING

O novo modelo **integra perfeitamente** com o sistema de feature blocking:

### Status do Sistema
```javascript
// calculateProgressPercentage() retorna:
{
  percentage: 45,
  phase: "regras-operacionais",  // Baseado em 3 grupos
  breakdown: {
    "cadastros-estruturais": 100,    // Completo
    "regras-operacionais": 50,       // Parcial
    "parametros-financeiros": 0      // Não iniciado
  }
}
```

### Feature Blocking Messages
Agora as mensagens de erro fazem sentido:

❌ **Antes:** "Agenda bloqueada - Configure em Base > Cadastros"  
✅ **Depois:** "Agenda bloqueada - Configure Profissionais × Serviços em Regras Operacionais"

---

## 📁 ESTRUTURA DE ARQUIVOS

```
src/pages/clinica/base-sistema/
│
├── BaseSystemLayout.jsx
│   └── MENU_ITEMS configurado com 3 grupos
│   └── expandedSections = ["cadastros-estruturais", ...]
│   └── Next steps guide mostrando 3 fases
│
├── setupWizardSteps.js
│   ├── SETUP_WIZARD_STEPS (12 items com category)
│   └── SETUP_WIZARD_CATEGORIES (objeto com grouping)
│
├── 🩺 ServicosPage.jsx
│   └── <BaseSystemBreadcrumb category="cadastros-estruturais" ... />
│
├── 👥 ProfessionalsPage.jsx
│   └── <BaseSystemBreadcrumb category="cadastros-estruturais" ... />
│
├── 🏥 ConveniosPage.jsx
│   └── <BaseSystemBreadcrumb category="cadastros-estruturais" ... />
│
├── 🚪 SalasPage.jsx
│   └── <BaseSystemBreadcrumb category="cadastros-estruturais" ... />
│
├── 📦 RecursosPage.jsx
│   └── <BaseSystemBreadcrumb category="cadastros-estruturais" ... />
│
├── 🔗 ProfessionalServicesPage.jsx
│   └── <BaseSystemBreadcrumb category="regras-operacionais" ... />
│
├── 👤💼 ProfessionalPayerPage.jsx
│   └── <BaseSystemBreadcrumb category="regras-operacionais" ... />
│
├── 📅 AgendaRulesPage.jsx
│   └── <BaseSystemBreadcrumb category="regras-operacionais" ... />
│
├── ⚡ RoomResourcesPage.jsx
│   └── <BaseSystemBreadcrumb category="regras-operacionais" ... />
│
├── 💵 ServicePricesPage.jsx
│   └── <BaseSystemBreadcrumb category="parametros-financeiros" ... />
│
├── 📈 ProfessionalSchedulePage.jsx
│   └── <BaseSystemBreadcrumb category="parametros-financeiros" ... />
│
└── 📊 RevenueRulesPage.jsx
    └── <BaseSystemBreadcrumb category="parametros-financeiros" ... />

src/components/base-sistema/
└── BaseSystemBreadcrumb.jsx (NEW)
    ├── CATEGORY_CONFIG (cores/icons)
    └── PAGES_BY_CATEGORY (referência lookup)
```

---

## 🔄 FLUXO DE INTEGRAÇÃO

```
User navigates to /clinica/base-sistema
    │
    ├─→ BaseSystemLayout renders
    │   ├─ Shows MENU_ITEMS with 3 groups
    │   ├─ Calculates progress
    │   └─ Displays next steps
    │
    └─→ User clicks on category (e.g., "Cadastros")
        │
        ├─→ Menu expands showing 5 items
        │
        └─→ User clicks "Serviços"
            │
            └─→ ServicesPage loads
                │
                ├─ BaseSystemBreadcrumb renders (blue, "Cadastros")
                ├─ Shows form and list
                └─ User can manage services

        User clicks home in breadcrumb
            │
            └─→ Returns to /clinica/base-sistema
```

---

## ✨ BENEFÍCIOS TÉCNICOS

### 1. **Single Source of Truth**
Tudo definido em `setupWizardSteps.js`:
```javascript
export const SETUP_WIZARD_STEPS = [
  {
    id: "services",
    category: "cadastros-estruturais",
    menuRoute: "/clinica/base-sistema/servicos",
    ...
  },
  // ... 11 outros
]
```

### 2. **Fácil Manutenção**
Adicionar novo item? 1 entrada em `SETUP_WIZARD_STEPS` +importação

### 3. **Escalabilidade**
Suporta N categorias, sem mudanças arquiteturais

### 4. **Consistency**
Menu, Wizard, Breadcrumbs, Feature Blocking - tudo alinhado

### 5. **User Learning**
Ordem progressiva natural: dados → relacionamentos → financeiro

---

## 🚀 COMO TESTAR

### Teste 1: Menu Estrutura
```
1. Ir para /clinica/base-sistema
2. Verificar 3 grupos visíveis (Cadastros/Regras/Financeiro)
3. Expandir cada grupo
4. Verificar 5+4+3 = 12 items totais
```

### Teste 2: Breadcrumbs
```
1. Clicar em "Serviços"
2. Verificar breadcrumb azul "Cadastros Estruturais"
3. Clicar em "Prof × Serviços"
4. Verificar breadcrumb âmbar "Regras Operacionais"
5. Clicar em "Tabela de Preços"
6. Verificar breadcrumb verde "Parâmetros Financeiros"
```

### Teste 3: Navegação
```
1. Em qualquer página, clicar no home do breadcrumb
2. Deve voltar para Base do Sistema
3. Verificar que menu se recolhe
```

---

## 📝 DOCUMENTAÇÃO GERADA

- [ESTRUTURA TÉCNICA - NOVO MODELO CONCEITUAL](.) (este arquivo)
- [REALINHAMENTO MENU COMPLETO - ENTREGA FINAL](🎉_REALINHAMENTO_MENU_COMPLETO_ENTREGA_FINAL.md)

---

**Última atualização:** 2025-01-14  
**Status:** ✅ Completo e validado  
**Próxima etapa:** Deploy em produção
