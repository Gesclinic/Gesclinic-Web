<!-- ============================================================================
     🗺️ MAPA DE INTEGRAÇÃO: Validações ETAPA C
     ============================================================================ -->

# 🗺️ Mapa de Integração - ETAPA C: Validações

**Propósito:** Guia visual de como as validações se conectam no sistema  
**Versão:** 1.0  
**Status:** ✅ Implementado e Testado  

---

## 🔄 Fluxo de Dados Completo

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUXO DE VALIDAÇÃO COMPLETO                  │
└─────────────────────────────────────────────────────────────────┘

USUÁRIO SELECIONA PROCESSADORA
         │
         ↓
    CardProcessorSelectorFields
         │
         ├─→ Seleciona: Processadora, Marca, Forma de Recebimento
         │
         ↓
    useEffect: Calcula Taxa
         │
         ├─→ calculateProcessingFee() [API]
         │
         ↓
    VALIDAÇÕES (3 NÍVEIS)
         │
         ├─ Nível 1: validateFeePercentRange()
         │   ├─ Verifica se está vazio
         │   ├─ Verifica se é numérico
         │   ├─ Verifica range 0-100%
         │   └─ Retorna: isValid ✅/❌
         │
         ├─ Nível 2: validateFeeRateReasonableness()
         │   ├─ Verifica se > 10% (aviso alto)
         │   ├─ Verifica se < 0.5% (aviso baixo)
         │   └─ Retorna: [warnings] ⚠️
         │
         └─ Nível 3: checkDuplicateFee() [DB]
             ├─ Verifica clinic_id
             ├─ Verifica processor_id
             ├─ Verifica card_brand
             ├─ Verifica settlement_type
             └─ Retorna: exists 🔄/none ✅
         │
         ↓
    APRESENTAR RESULTADO
         │
         ├─ Se erro (Nível 1): Mostrar em VERMELHO ❌
         │
         ├─ Se aviso (Nível 2): Mostrar em AMARELO ⚠️
         │   └─ Usuário pode ignorar e salvar
         │
         ├─ Se duplicata (Nível 3): Mostrar ERRO 🔄
         │   └─ Previne salvar
         │
         └─ Se OK: Mostrar box AZUL ✅
             └─ Usuário pode salvar
         │
         ↓
    SALVAR AGENDAMENTO
         │
         ├─ AppointmentUnitedModal.handleSaveChanges()
         │
         ├─→ Envia cardProcessorData para backend
         │
         ├─→ syncAppointmentBilling() [API]
         │
         └─→ Insere em appointments table
             ├─ processor_id
             ├─ card_brand
             ├─ settlement_type
             ├─ fee_percent
             ├─ fee_amount
             └─ net_amount
```

---

## 📍 Localização dos Componentes

### 1. **CardProcessorSelectorFields** 📦
```
Arquivo: src/pages/clinica/agenda/components/CardProcessorSelectorFields.jsx
Linhas: ~150
Props Entrada:
  ├─ clinicId: string (UUID)
  ├─ paymentMethod: string ('CARTAO' | outros)
  ├─ grossAmount: number
  ├─ processorId: string (UUID)
  ├─ cardBrand: string ('Visa', 'Mastercard', etc)
  ├─ settlementType: string ('D+0', 'D+1', etc)
  └─ onFeeCalculated: function
Props Saída (callbacks):
  ├─ onProcessorChange(value)
  ├─ onCardBrandChange(value)
  ├─ onSettlementTypeChange(value)
  └─ onFeeCalculated(feeData)
Estado Interno:
  ├─ processors: []
  ├─ loading: boolean
  ├─ feeData: { feePercent, feeAmount, netAmount }
  └─ validationWarnings: []
```

### 2. **AppointmentUnitedModal** 🎯
```
Arquivo: src/pages/clinica/agenda/components/AppointmentUnitedModal.jsx
Integração:
  ├─ L44-45: Import CardProcessorSelectorFields
  ├─ L656-666: Estado cardProcessorData
  ├─ L1150-1166: Carregar dados (EDIT mode)
  ├─ L5520-5545: Render CardProcessorSelectorFields
  └─ Payloads: Incluem processor fields
Local de Renderização:
  └─ Tab: "Pagamento"
     └─ Renderiza CardProcessorSelectorFields quando paymentMethod === 'CARTAO'
```

### 3. **CartasProcessadorTaxasPage** 💳
```
Arquivo: src/pages/clinica/financeiro/CartasProcessadorTaxasPage.jsx
Integração:
  ├─ L20-21: Imports de validação
  ├─ L85-163: handleSubmit() com validações
  │   ├─ Nível 1: validateProcessorFee()
  │   ├─ Nível 2: validateFeeRateReasonableness()
  │   └─ Nível 3: checkDuplicateFee()
  └─ Confirmação: prompt se há avisos
Fluxo:
  1. Usuário preenche formulário
  2. Clica "Salvar"
  3. handleSubmit() executa 3 validações
  4. Se OK: Salva em DB
  5. Se erro: Mostra dialog e interrompe
  6. Se aviso: Pede confirmação
```

### 4. **Validations Module** 🔍
```
Arquivo: src/lib/processorFeeValidations.js
Funções Exportadas:
  ├─ validateProcessorFee(dados) → { isValid, errors[] }
  ├─ validateFeePercentRange(percent) → { isValid, error }
  ├─ validateFeeRateReasonableness(percent) → warnings[]
  ├─ checkDuplicateFee(clinic, proc, brand, settlement, excludeId) → fee | null
  ├─ recordFeeChange({...}) → auditLogId
  └─ getFeeAuditHistory(feeId, limit) → records[]
Padrão de Retorno:
  ├─ Validação Básica: { isValid, errors[] }
  ├─ Validação Avisos: [warnings] (array de strings)
  └─ Validação Duplicata: fee object | null
```

---

## 🔗 Conexões Entre Componentes

```
┌─────────────────────────────────────────────────────┐
│        CARDPROCESSORSELECTORFIELDS                  │
│        (Componente de Seleção)                      │
│                                                      │
│  ├─ Importa:                                        │
│  │  ├─ calculateProcessingFee (da API)             │
│  │  ├─ validateFeePercentRange                      │
│  │  └─ validateFeeRateReasonableness                │
│  │                                                   │
│  └─ Renderiza em:                                   │
│     └─ AppointmentUnitedModal (tab "Pagamento")    │
└─────────────────────────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────┐
│      APPOINTMENTUNITEDMODAL                          │
│      (Modal Principal de Agendamento)               │
│                                                      │
│  ├─ Rende CardProcessorSelectorFields               │
│  ├─ Coleta cardProcessorData                        │
│  ├─ Salva em syncAppointmentBilling()               │
│  └─ Insere em appointments table                    │
└─────────────────────────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────┐
│      CARTASPROCESSADORTAXASPAGE                      │
│      (Página de Gerenciamento)                      │
│                                                      │
│  ├─ Importa:                                        │
│  │  ├─ validateProcessorFee                         │
│  │  ├─ validateFeeRateReasonableness                │
│  │  └─ checkDuplicateFee                            │
│  │                                                   │
│  └─ Usa em handleSubmit():                          │
│     ├─ Valida dados antes de salvar                │
│     ├─ Mostra erros/avisos                          │
│     └─ Pede confirmação se necessário               │
└─────────────────────────────────────────────────────┘
```

---

## 📊 Validações por Contexto

### Contexto 1: Modal de Agendamento
```
Onde: CardProcessorSelectorFields
Quando: Usuário seleciona processadora/marca/forma de recebimento
Validações:
  ├─ Em tempo real: validateFeePercentRange()
  ├─ Em tempo real: validateFeeRateReasonableness()
  └─ Não inclui checkDuplicateFee (usa nova fee cada vez)
UI: 
  ├─ Caixa azul: Mostra fórmula e valores
  ├─ Caixa amarela: Mostra avisos se existem
  └─ Bloqueia salvar apenas se erro grave
```

### Contexto 2: Página de Taxas
```
Onde: CartasProcessadorTaxasPage
Quando: Usuário tenta salvar nova taxa
Validações:
  ├─ validateProcessorFee() - Básica
  ├─ validateFeeRateReasonableness() - Avisos
  └─ checkDuplicateFee() - Duplicata
UI:
  ├─ Dialog com erro: Bloqueia salvar
  ├─ Confirm com aviso: Pede confirmação
  └─ Sem problemas: Salva diretamente
```

---

## 🧪 Fluxo de Teste

### Teste Manual: Validação Funciona?
```
1. Ir para: /clinica/agenda
2. Criar novo agendamento
3. Selecionar "CARTAO" como pagamento
4. Preencher processadora, marca, forma de recebimento
5. Observar:
   ✅ Taxa calculada em tempo real
   ✅ Box azul mostra fórmula
   ✅ Se taxa > 10%, mostra aviso em amarelo
   ✅ Se taxa < 0.5%, mostra aviso em amarelo
6. Salvar agendamento → Taxas salvas em appointments table
```

### Teste Manual: Duplicata Detectada?
```
1. Ir para: /clinica/financeiro/cartoes-taxas-operadoras
2. Criar taxa: Visa + Nubank + D+1 + 2.5%
3. Salvar → ✅ Salva com sucesso
4. Tentar criar novamente (Visa + Nubank + D+1)
5. Salvar → ❌ Erro: "Taxa já existe para essa combinação"
6. Alterar forma recebimento para D+0 e salvar → ✅ Funciona
```

### Teste Automático: Suite de Testes
```javascript
// Abrir browser console
// Copiar: src/lib/__tests__/testValidationsEtapaC.js
// Executar: await runAllValidationTests();
// Resultado: 6 testes passando ✅
```

---

## 🐛 Debug / Troubleshooting

### Problema 1: Validação não aparece
```
Verificar:
  ✅ CardProcessorSelectorFields está sendo renderizado?
  ✅ paymentMethod === 'CARTAO'?
  ✅ Browser console tem erros?
  ✅ calculateProcessingFee() retornando dados?
Solução:
  → Abrir DevTools → Verificar Network aba
  → Procurar requisição calculateProcessingFee
  → Verificar response tem fee_percent
```

### Problema 2: Validação não bloqueia duplicata
```
Verificar:
  ✅ checkDuplicateFee() está sendo chamado?
  ✅ clinicId está correto?
  ✅ Taxa já existe com mesmos valores?
  ✅ is_active = true na tabela?
Solução:
  → Abrir Supabase console
  → Verificar card_processor_fees table
  → Confirmar registros com clinic_id correto
```

### Problema 3: Build falha
```
Erro possível: "is not exported by"
Solução:
  → Verificar todas as funções estão em exports
  → Em processorFeeValidations.js verificar:
     export function validateFeePercentRange() ← tem export?
```

---

## 📚 Referência Rápida

### Validações Disponíveis
```javascript
// Básica: Tipo, Range, Obrigatório
validateProcessorFee({ processorId, cardBrand, settlementType, feePercent })

// Específica: Range 0-100%
validateFeePercentRange(feePercent)

// Avisos: Taxa suspeita
validateFeeRateReasonableness(feePercent)

// Duplicata: Existe combinação?
checkDuplicateFee(clinicId, processorId, cardBrand, settlementType)

// Auditoria: Registra mudança
recordFeeChange({ clinicId, userId, feeId, action, oldValues, newValues })

// Histórico: Busca mudanças
getFeeAuditHistory(feeId, limit)
```

---

## 🎯 Pontos de Entrada

### Para Desenvolvedores
```
Quer adicionar validação nova?
  → Edite: src/lib/processorFeeValidations.js
  → Adicione função
  → Export: export function novaValidacao() {}
  → Importe em CardProcessorSelectorFields ou CartasProcessadorTaxasPage
  → Chame no useEffect/handleSubmit apropriado

Quer testar validação?
  → Edite: src/lib/__tests__/testValidationsEtapaC.js
  → Adicione teste
  → Execute: await runAllValidationTests()

Quer integrar em novo lugar?
  → Importe função de validação
  → Chame no ponto apropriado (form submit, field change, etc)
  → Capture resultado e mostre feedback ao usuário
```

---

## ✅ Checklist de Integração

- [x] CardProcessorSelectorFields importa validações
- [x] CardProcessorSelectorFields mostra avisos
- [x] AppointmentUnitedModal salva cardProcessorData
- [x] CartasProcessadorTaxasPage valida antes de salvar
- [x] checkDuplicateFee funciona com isolamento de clínica
- [x] Build passa sem erros
- [x] Testes criados e executáveis
- [x] Documentação completa

---

## 🚀 Próximos Passos

**ETAPA D: Auditoria**
```
Vai adicionar:
  ├─ Tabela fee_audit_log para rastrear mudanças
  ├─ Componente FeeAuditTrail para visualizar histórico
  ├─ Função revertFeeToVersion() para desfazer
  ├─ Relatório de auditoria em CSV
  └─ Integração em CartasProcessadorTaxasPage
```

---

**Última Atualização:** 15 de janeiro de 2025  
**Status:** ✅ Completo e Testado  
**Próximo:** ETAPA D Auditoria
