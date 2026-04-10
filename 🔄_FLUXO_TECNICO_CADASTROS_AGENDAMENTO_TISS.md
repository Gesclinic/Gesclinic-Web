# 🔄 FLUXO TÉCNICO COMPLETO - DO CADASTRO AO FATURAMENTO TISS

**Data:** 18 de janeiro de 2026  
**Objetivo:** Visualizar o fluxo completo e dependências entre sistemas

---

## 📊 FLUXO PRINCIPAL: AGENDAMENTO → FATURAMENTO → TISS XML

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    FLUXO COMPLETO DO SISTEMA                            │
└─────────────────────────────────────────────────────────────────────────┘

FASE 1: CADASTROS (Base do Sistema)
═════════════════════════════════════

  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
  │  SERVIÇOS    │      │ PROFISSIONAIS│      │  CONVÊNIOS   │
  │              │      │              │      │              │
  │ • TUSS Code  │      │ • CBO Code   │      │ • ANS Code   │
  │ • Type       │      │ • Council    │      │ • TISS       │
  │ • Duration   │      │ • CRM/CREFITO│      │ • Autorização│
  │ • Price      │      │ • Role Type  │      │ • Guide Type │
  └──────────────┘      └──────────────┘      └──────────────┘
         ▲                       ▲                    ▲
         │                       │                    │
         └───────────┬───────────┴────────────────────┘
                     │
              ┌──────▼──────┐
              │   SALAS     │
              │             │
              │ • Code      │
              │ • Type      │
              │ • Capacity  │
              └─────────────┘


FASE 2: VÍNCULOS (Relacionamentos obrigatórios)
═════════════════════════════════════════════════

  Prof ◄──────────────────► Serviço
  (professional_services)
       • Duration override
       • Competence level
       
  Prof ◄──────────────────► Convênio
  (professional_payers)
       • Credential number  ◄─── CRÍTICO TISS
       • Percentage/Fixed
       
  Serviço ◄──────────────────► Convênio
  (service_prices)
       • Base price
       • Co-pay
       
  Prof ◄──────────────────► Convênio ◄──────────────────► Serviço
  (revenue_rules)
       • Percentage %
       • Fixed value
       • Minimum value


FASE 3: OPERACIONAL (Regras de execução)
═════════════════════════════════════════

  ┌─────────────────────────────────────┐
  │   AGENDA (appointments)             │
  │                                     │
  │ Validações antes de criar slot:     │
  │ 1. Prof × Serviço existe? ✅        │
  │ 2. Prof × Convênio existe? ✅       │
  │ 3. Sala × Serviço existe? ✅        │
  │ 4. Prof disponível? (schedule) ✅   │
  │ 5. Preço definido? ✅              │
  │ 6. Regra de repasse existe? ⚠️     │
  └─────────────────────────────────────┘
             │
             ▼
  Agendamento criado com sucesso
  • appointment.id
  • appointment.professional_id
  • appointment.service_id
  • appointment.health_insurance_id
  • appointment.room_id


FASE 4: FATURAMENTO (Integração financeira)
═════════════════════════════════════════════

  ┌─────────────────────────────────────┐
  │   GUIA TISS (consultaXML)           │
  │                                     │
  │ Busca dados de:                     │
  │ 1. appointment (quem, quando)       │
  │ 2. professional (CBO, Council)      │
  │ 3. service (TUSS, type)             │
  │ 4. professional_payer (credential)  │
  │ 5. service_price (valores)          │
  │ 6. health_insurance (ANS)           │
  └─────────────────────────────────────┘
             │
             ▼
  Valida campos TISS (ou GLOSA)
  • TUSS Code ✅
  • CBO Code ✅
  • Council + Number ✅
  • Credential Number ✅ (CRÍTICO)
  • ANS Registration ✅
  • Price > 0 ✅
  • Co-pay definida ✅
             │
             ▼ (Se falhar = ERRO + 🚫 GLOSA)
  Gera XML TISS
  <?xml version="1.0"?>
  <GuiaConsultaSP>
    <TabelaTuss>{{ service.tuss_code }}</TabelaTuss>
    <CBO>{{ professional.cbo_code }}</CBO>
    <CredentialNumber>{{ prof_payer.credential }}</CredentialNumber>
    <ValorProcedimento>{{ price.base_price }}</ValorProcedimento>
  </GuiaConsultaSP>
             │
             ▼
  Envia para operadora
  (integração API ou manual)
             │
             ▼
  Operadora valida
  • Se OK: status = 'approved'
  • Se erro: status = 'rejected' (glosa)
             │
             ▼
  Se aprovada: Aparece em Financeiro
  • Contas a Receber
  • Fluxo de Caixa
  • DRE
             │
             ▼
  Quando paciente paga:
  • Coparticipação → Paciente paga
  • Restante → Operadora repassa
  • Revenue Rule → Prof recebe
  • Diferença → Clínica (margem)
```

---

## 🔐 VALIDAÇÕES EM CASCATA (Bloqueia se faltar)

```
┌─────────────────────────────────────────────────────────────────┐
│              VALIDAÇÃO 1: CRIAR AGENDAMENTO                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ AgendaPage.jsx → handleScheduleAppointment()                   │
│                                                                 │
│ ┌─ Buscar professional_services                                │
│ │  WHERE professional_id = prof                                │
│ │  AND service_id = serv                                       │
│ └─ Se NÃO encontra:                                            │
│    ❌ ERRO: "Prof não credenciado para este serviço"          │
│    ❌ BLOQUEIA AGENDAMENTO                                     │
│                                                                 │
│ ┌─ Buscar professional_schedules                               │
│ │  WHERE professional_id = prof                                │
│ │  AND day_of_week = dia_agendado                              │
│ └─ Se NÃO encontra ou fora do horário:                         │
│    ❌ ERRO: "Prof não trabalha neste horário"                 │
│    ❌ BLOQUEIA AGENDAMENTO                                     │
│                                                                 │
│ ┌─ Buscar service_prices                                       │
│ │  WHERE service_id = serv                                     │
│ │  AND health_insurance_id = conv                              │
│ └─ Se NÃO encontra:                                            │
│    ⚠️ WARNING: "Preço não definido"                            │
│    ⚠️ PERMITE (mas avisa)                                      │
│                                                                 │
│ ✅ Agendamento criado                                          │
│    appointment {                                               │
│      id: UUID,                                                 │
│      professional_id,                                          │
│      service_id,                                               │
│      health_insurance_id,                                      │
│      room_id,                                                  │
│      appointment_date,                                         │
│      status: 'scheduled'                                       │
│    }                                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────────────────────────────┐
│              VALIDAÇÃO 2: GERAR GUIA TISS                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ GuiasConsulta.jsx → handleCreateGuia()                         │
│                                                                 │
│ ┌─ Validar appointment.status                                  │
│ │  Status deve ser: 'completed' ou 'attended'                  │
│ └─ Se NÃO:                                                      │
│    ❌ ERRO: "Atendimento não finalizado"                       │
│                                                                 │
│ ┌─ Buscar professional_payers                                  │
│ │  WHERE professional_id = prof                                │
│ │  AND health_insurance_id = conv                              │
│ └─ Se NÃO encontra:                                            │
│    ❌ ERRO: "Prof não credenciado neste convênio"             │
│    ❌ BLOQUEIA GUIA (GLOSA GARANTIDA)                         │
│                                                                 │
│ ┌─ Validar professional_payers.credential_number               │
│ └─ Se NULL ou vazio:                                           │
│    ❌ ERRO: "Credential number faltando"                       │
│    ❌ BLOQUEIA GUIA (GLOSA GARANTIDA)                         │
│                                                                 │
│ ┌─ Validar professional.cbo_code                               │
│ └─ Se NULL ou vazio:                                           │
│    ❌ ERRO: "CBO Code faltando"                                │
│    ❌ BLOQUEIA GUIA (GLOSA GARANTIDA)                         │
│                                                                 │
│ ┌─ Validar service.tuss_code                                   │
│ └─ Se NULL ou vazio:                                           │
│    ❌ ERRO: "TUSS Code faltando"                               │
│    ❌ BLOQUEIA GUIA (GLOSA GARANTIDA)                         │
│                                                                 │
│ ┌─ Validar health_insurance.registration_ans                   │
│ └─ Se NULL ou vazio:                                           │
│    ❌ ERRO: "ANS faltando"                                     │
│    ❌ BLOQUEIA GUIA (GLOSA GARANTIDA)                         │
│                                                                 │
│ ┌─ Buscar service_prices                                       │
│ │  WHERE service_id = serv                                     │
│ │  AND health_insurance_id = conv                              │
│ └─ Se NÃO encontra ou base_price = 0:                          │
│    ❌ ERRO: "Preço inválido"                                   │
│    ❌ BLOQUEIA GUIA (GLOSA GARANTIDA)                         │
│                                                                 │
│ ✅ Todos validados                                             │
│    → Gera XML TISS                                             │
│    → Envia à operadora                                         │
│    → Salva em guias_consulta                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 💰 FLUXO FINANCEIRO (Cálculos automáticos)

```
┌─────────────────────────────────────────────────────────────────┐
│              QUANDO OPERADORA REPASSA O VALOR                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Guia aprovada pela operadora                                   │
│ ├─ Status = 'approved'                                         │
│ └─ Valor negociado = R$ 100.00                                 │
│                                                                 │
│ Paciente tem coparticipação?                                   │
│ ├─ Co-pay definido em service_prices = R$ 30.00               │
│ └─ Paciente paga R$ 30                                         │
│                                                                 │
│ Sistema calcula repasse:                                       │
│ ├─ Busca revenue_rules:                                        │
│ │  professional_id = prof                                      │
│ │  service_id = serv                                           │
│ │  health_insurance_id = conv                                  │
│ │                                                               │
│ │  Se rule_type = 'percentage':                                │
│ │    Prof recebe = base_price × (percentage / 100)            │
│ │    Exemplo: R$ 100 × 60% = R$ 60                            │
│ │                                                               │
│ │  Se rule_type = 'fixed':                                     │
│ │    Prof recebe = fixed_value                                 │
│ │    Exemplo: R$ 70 (fixo)                                     │
│ │                                                               │
│ │  Aplicar minimum_value se < min:                             │
│ │    Se calculado < minimum_value                              │
│ │    → Use minimum_value                                       │
│ │                                                               │
│ └─ Prof recebe (exemplo): R$ 60                                │
│                                                                 │
│ Divisão do valor:                                              │
│ ┌──────────────────────────────────────────────┐               │
│ │ Total Negociado:          R$ 100.00          │               │
│ ├──────────────────────────────────────────────┤               │
│ │ (-) Coparticipação Paciente: R$ 30.00        │               │
│ │ (-) Repasse Profissional:   R$ 60.00         │               │
│ │ (=) Margem Clínica:         R$ 10.00         │               │
│ └──────────────────────────────────────────────┘               │
│                                                                 │
│ Fluxo de Caixa:                                                │
│ 1. Operadora repassa R$ 70 (100 - 30 coparticipação)          │
│ 2. Paciente paga R$ 30 (sua coparticipação)                    │
│ 3. Clínica recebe: R$ 70 + R$ 30 = R$ 100 ✅                 │
│                                                                 │
│ Relatório DRE (Demonstração Resultado):                        │
│ • Receita Bruta: R$ 100                                        │
│ • Despesa Prof:  R$ 60                                         │
│ • Margem:        R$ 40 (40%)                                   │
│                                                                 │
│ Relatório Repasse:                                             │
│ • Prof: Dr. João                                               │
│ • Período: Jan 2026                                            │
│ • Atendimentos: 50                                             │
│ • Valor Total:  R$ 3.000                                       │
│ • Status: Pendente de pagamento                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 ARQUIVOS ENVOLVIDOS NO FLUXO

```
CADASTROS (Base do Sistema)
├── src/pages/clinica/base-sistema/
│   ├── ServicesPage.jsx                    ← Serviços
│   ├── ProfessionalsPage.jsx               ← Profissionais
│   ├── ConveniosPage.jsx                   ← Convênios
│   ├── SalasPage.jsx                       ← Salas
│   ├── RecursosPage.jsx                    ← Recursos
│   ├── ProfessionalServicesPage.jsx        ← Vínculo Prof×Serviço
│   ├── ProfessionalPayerPage.jsx           ← Vínculo Prof×Convênio
│   ├── RoomResourcesPage.jsx               ← Vínculo Sala×Recurso
│   ├── ServicePricesPage.jsx               ← Preços
│   ├── AgendaRulesPage.jsx                 ← Regras Agenda
│   ├── ProfessionalSchedulePage.jsx        ← Disponibilidade
│   └── RevenueRulesPage.jsx                ← Repasse
│
└── src/lib/ (APIs)
    ├── servicesApi.js
    ├── professionalsApi.js
    ├── healthInsurancesApi.js
    ├── roomsApi.js
    ├── resourcesApi.js
    ├── professionalServicesApi.js
    ├── professionalPayerApi.js
    ├── servicePricesApi.js
    ├── agendaRulesApi.js
    ├── professionalScheduleApi.js
    └── revenueRulesApi.js

AGENDA (Agendamento)
└── src/pages/clinica/agenda/
    ├── AgendaPage.jsx                      ← Cria appointment
    └── appointment validation               ← Valida vínculos

FATURAMENTO (Integração TISS)
└── src/pages/clinica/faturamento/
    ├── tiss/GuiasConsulta.jsx              ← Gera XML TISS
    ├── tiss/GuiasSADT.jsx
    └── tiss/GuiasInternacao.jsx

FINANCEIRO (Repasse e Fluxo de Caixa)
└── src/pages/clinica/financeiro/
    ├── FluxoCaixa.jsx                      ← Registra movimento
    ├── ContasReceber.jsx                   ← Acompanha faturado
    └── RepasseMedicoPage.jsx               ← Calcula repasse
```

---

## 🔍 PONTOS CRÍTICOS DE FALHA (Onde tudo pode quebrar)

### 1️⃣ Se Falta `professional_services`

```
Tentativa de agendar com Prof X Serviço:
  ❌ professional_services não encontrado
  → AgendaPage bloqueia: "Prof não credenciado"
  → Paciente fica sem agendamento
  
Solução: Criar vínculo em ProfessionalServicesPage
```

### 2️⃣ Se Falta `professional_payers` + `credential_number`

```
Tentativa de criar Guia TISS:
  ❌ Não encontra credential number
  → GuiasConsulta bloqueia: "Prof não credenciado no convênio"
  → Guia não sai (GLOSA GARANTIDA se mandar assim)
  
Impacto financeiro: PERDA TOTAL do valor (operadora não paga)
  
Solução: Preencher credential no ProfessionalPayerPage
```

### 3️⃣ Se TUSS Code está vazio

```
Tentativa de gerar XML TISS:
  ❌ Não consegue montar <TabelaTuss>
  → XML inválido
  → Operadora rejeita
  
Impacto: GLOSA (operadora não recebe e não paga)
  
Solução: Validar TUSS em ServicesPage (obrigatório)
```

### 4️⃣ Se CBO Code está vazio

```
Tentativa de gerar XML TISS:
  ❌ Não consegue montar <CBO>{{ professional.cbo_code }}</CBO>
  → XML inválido ou incompleto
  → Operadora não reconhece profissional
  
Impacto: GLOSA + Reclamação ao conselho (pode gerar processo)
  
Solução: Validar CBO em ProfessionalsPage (obrigatório)
```

### 5️⃣ Se Preço é 0 ou negativo

```
Tentativa de faturar:
  ❌ system.revenue_rules calcula: base_price × 0% = R$ 0
  → Prof recebe R$ 0
  → Clínica recebe R$ 0
  → Operadora não entende
  
Impacto: Confusão financeira + Atrito com operadora
  
Solução: Validar em ServicePricesPage (base_price > 0)
```

---

## ✅ TESTES PRÁTICOS (Para validar fluxo)

### Teste 1: Agendamento Bloqueado Corretamente

```javascript
// Cenário: Agendar serviço sem prof credenciado

// Setup:
// 1. Criar Serviço "Consulta"
// 2. NÃO criar vínculo em professional_services
// 3. Tentar agendar

// Esperado:
// ❌ Agendamento bloqueado
// ✅ Mensagem: "Prof não credenciado para este serviço"

// Teste no code:
describe('AgendaPage Validation', () => {
  it('should block appointment if professional_services missing', async () => {
    const result = await validateServiceAvailability(
      serviceId,
      professionalId
    );
    expect(result).toBe(false);
    expect(error).toContain('não credenciado');
  });
});
```

### Teste 2: TISS XML Bloqueado Corretamente

```javascript
// Cenário: Gerar guia sem TUSS Code

// Setup:
// 1. Serviço SEM tuss_code
// 2. Tentar gerar guia

// Esperado:
// ❌ Guia bloqueada
// ✅ Mensagem: "TUSS Code faltando"

describe('GuiasConsulta Validation', () => {
  it('should block guide if TUSS code missing', async () => {
    const result = await validateGuiaData({
      service: { tuss_code: null }
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('TUSS Code');
  });
});
```

### Teste 3: Cálculo de Repasse Correto

```javascript
// Cenário: Profissional recebe 60% de R$ 100

// Setup:
// revenue_rule: percentage = 60, minimum_value = 50
// service_price: base_price = 100

// Esperado:
// Prof recebe: R$ 60
// Clínica fica: R$ 40

describe('Revenue Rules Calculation', () => {
  it('should calculate correct percentage', async () => {
    const result = calculateRepasse({
      base_price: 100,
      percentage: 60,
      minimum_value: 50
    });
    expect(result).toBe(60); // 60% de 100
  });
  
  it('should apply minimum value if lower', async () => {
    const result = calculateRepasse({
      base_price: 100,
      percentage: 30,  // seria 30
      minimum_value: 50 // mas mínimo é 50
    });
    expect(result).toBe(50); // usa mínimo
  });
});
```

---

## 🎯 RESUMO EXECUTIVO DO FLUXO

| Etapa | Responsável | Validações | Consequência se Falhar |
|-------|---|---|---|
| 1. Criar Serviço | ServicesPage | TUSS Code, Type | ❌ Não agenda |
| 2. Criar Prof | ProfessionalsPage | CBO, Council | ❌ GLOSA TISS |
| 3. Criar Convênio | ConveniosPage | ANS, TISS | ❌ GLOSA TISS |
| 4. Vincular Prof×Serv | ProfServicePage | Ambos ativos | ❌ Bloqueia agenda |
| 5. Vincular Prof×Conv | ProfPayerPage | Credential | ❌ GLOSA TISS |
| 6. Definir Preços | ServicePricesPage | base_price > 0 | ❌ Não fatua |
| 7. Definir Repasse | RevenueRulesPage | % válido | ⚠️ Repasse 0 |
| 8. Agendar | AgendaPage | Validações 1-7 | ❌ Bloqueia |
| 9. Gerar Guia | GuiasConsulta | Validações 1-7 | ❌ GLOSA |
| 10. Operadora Aprova | Sistema Externo | Dados corretos | ✅ Fatua |

---

**Próximo passo:** Executar [📋_CHECKLIST_CAMPOS_OBRIGATORIOS_TISS.md](📋_CHECKLIST_CAMPOS_OBRIGATORIOS_TISS.md)
