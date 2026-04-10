# 🚀 PRÓXIMOS PASSOS - ETAPA 4.4 E ETAPA 5

**Planejamento detalhado para as próximas implementações**

---

## 📍 Status Atual

```
✅ ETAPA 1: SQL Schema
✅ ETAPA 2: API Modules
✅ ETAPA 3: Menu Base do Sistema
✅ ETAPA 4: Setup Wizard Completo
⏳ ETAPA 4.4: Proteger Páginas (próximo)
⏳ ETAPA 5: Refatorar Telas Existentes
⏳ ETAPA 6-10: Features e Testes

Progresso: 40% (4/10 etapas) → 50% (5/10) com ETAPA 4.4
```

---

## 🛡️ [ETAPA 4.4] PROTEGER PÁGINAS COM VALIDAÇÕES

**Objetivo:** Bloquear acesso a módulos críticos até wizard estar completo  
**Tempo Estimado:** 1-2 horas  
**Prioridade:** ALTA

### O que Precisa Ser Feito

#### 1. Criar Componente ProtectedWizardRoute
**Arquivo:** `src/components/ProtectedWizardRoute.jsx` (100 linhas)

```javascript
import { useWizardBlocker } from '@/pages/clinica/base-sistema/useSetupWizard'
import { Modal } from '@/components/ui/modal'

export function ProtectedWizardRoute({ feature, children }) {
  const { canAccess, getBlockReason } = useWizardBlocker(clinicId)
  
  if (!canAccess(feature)) {
    const reason = getBlockReason(feature)
    return <BlockingModal reason={reason} />
  }
  
  return children
}
```

**Features do Modal:**
- [x] Título claro: "Configuração Incompleta"
- [x] Ícone de bloqueio (🔒)
- [x] Mensagem do que está faltando
- [x] Lista de itens faltando
- [x] Botão "Ir para Setup Wizard"
- [x] Botão "Cancelar" (volta atrás)
- [x] Descrição de por que bloqueado

#### 2. Bloquear Agenda
**Arquivo:** `src/pages/clinica/agenda/AgendaPage.jsx`

```javascript
return (
  <ProtectedWizardRoute feature="agenda">
    <AgendaContent />
  </ProtectedWizardRoute>
)
```

**Regra de Bloqueio:**
```
Bloqueia se:
- Nenhum profissional cadastrado
- Nenhum serviço cadastrado
- Nenhuma vinculação profissional-serviço
- Nenhuma regra de agenda definida
```

#### 3. Bloquear Financeiro
**Arquivo:** `src/pages/clinica/financeiro/FinanceiroPage.jsx`

```javascript
return (
  <ProtectedWizardRoute feature="financeiro">
    <FinanceiroContent />
  </ProtectedWizardRoute>
)
```

**Regra de Bloqueio:**
```
Bloqueia se:
- Agenda não está configurada (pois sem agendamentos, não há financeiro)
- Nenhuma regra de repasse definida (warning)
```

#### 4. Bloquear Check-in
**Arquivo:** `src/pages/clinica/checkin/CheckinPage.jsx`

```javascript
return (
  <ProtectedWizardRoute feature="checkin">
    <CheckinContent />
  </ProtectedWizardRoute>
)
```

**Regra de Bloqueio:**
```
Bloqueia se:
- Agenda não está configurada
- Nenhum agendamento existe
```

### Checklist ETAPA 4.4

- [ ] ProtectedWizardRoute.jsx criado
- [ ] BlockingModal.jsx criado (sub-componente)
- [ ] Feature blocker logic implementada
- [ ] Messages customizadas por feature
- [ ] Botão direto para wizard
- [ ] Agenda bloqueada quando necessário
- [ ] Financeiro bloqueado quando necessário
- [ ] Check-in bloqueado quando necessário
- [ ] Modal responsivo
- [ ] Testes de bloqueio

---

## 🔄 [ETAPA 5] REFATORAR TELAS EXISTENTES

**Objetivo:** Integrar novo schema com telas existentes  
**Tempo Estimado:** 3-4 horas  
**Prioridade:** ALTA

### 5.1 Refatorar Agenda
**Arquivo:** `src/pages/clinica/agenda/AgendaPage.jsx`

#### Mudanças Necessárias

```javascript
// ANTES:
- Buscava appointments da view_agenda_completa_v6
- Sem validações de regras
- Sem bloqueio de slots

// DEPOIS:
- Continua buscando view_agenda_completa_v6
- Usa agendaRulesApi.validateSchedulingByRules()
- Bloqueia slots inválidos automaticamente
- Calcula duração via agendaRulesApi.getServiceDuration()
- Valida profissional-serviço via professionalServicesApi.canProfessionalServe()
```

#### Código a Adicionar

```javascript
import { agendaRulesApi } from '@/lib/agendaRulesApi'
import { professionalServicesApi } from '@/lib/professionalServicesApi'

// Em onAddAppointment:
const serviceId = selectedService.id
const professionalId = selectedProfessional.id
const date = selectedDate

// Validação de serviço por profissional
const canServe = await professionalServicesApi.canProfessionalServe(
  professionalId, 
  serviceId, 
  clinicId
)
if (!canServe) {
  throw new Error("Este profissional não pode fazer este serviço")
}

// Validação de regras de agenda
const ruleValidation = await agendaRulesApi.validateSchedulingByRules(
  serviceId,
  clinicId,
  date
)
if (!ruleValidation.valid) {
  throw new Error(`Agendamento inválido: ${ruleValidation.errors.join(', ')}`)
}

// Cálculo automático de duração
const endTime = await agendaRulesApi.calculateEndTime(
  startTime,
  serviceId,
  clinicId
)
```

### 5.2 Refatorar Financeiro
**Arquivo:** `src/pages/clinica/financeiro/FinanceiroPage.jsx`

#### Mudanças Necessárias

```javascript
// ANTES:
- Cálculo manual de repasse
- Sem regras configuráveis
- Valores hardcoded

// DEPOIS:
- Usa revenueRulesApi.calculateRepasse()
- Lê regras de repasse.revenue_rules
- Aplica min/max automaticamente
- Suporta múltiplos tipos (porcentagem, fixo, comissão)
```

#### Código a Adicionar

```javascript
import { revenueRulesApi } from '@/lib/revenueRulesApi'

// Em cálculo de repasse:
const repasse = await revenueRulesApi.calculateRepasse(
  professionalId,
  serviceId,
  clinicId,
  baseAmount,     // Valor da consulta
  appointmentStatus // 'completed', 'no-show', etc
)

// Resultado:
{
  ruleId: '123',
  amount: 150.00,        // Valor final (com min/max aplicado)
  percentage: 40,        // % da regra
  type: 'percentage'     // Tipo da regra
}
```

### 5.3 Refatorar Check-in
**Arquivo:** `src/pages/clinica/checkin/CheckinPage.jsx`

#### Mudanças Necessárias

```javascript
// ANTES:
- Apenas confirmação simples
- Sem validações

// DEPOIS:
- Valida appointment contra regras
- Mostra informações do profissional-serviço
- Confirma dados de convênio
- Valida recursos necessários
```

#### Código a Adicionar

```javascript
import { professionalServicesApi } from '@/lib/professionalServicesApi'
import { resourcesApi } from '@/lib/resourcesApi'

// Buscar dados de competência do profissional:
const psData = await professionalServicesApi.getProfessionalServiceData(
  professionalId,
  serviceId,
  clinicId
)

// Buscar recursos necessários para sala:
const roomResources = await resourcesApi.listRoomResources(
  roomId,
  clinicId
)

// Mostrar informações:
- Profissional + competência
- Serviço + duração
- Sala + recursos
- Convênio + autorização
```

### Checklist ETAPA 5

- [ ] Agenda importa agendaRulesApi
- [ ] Agenda importa professionalServicesApi
- [ ] Agenda valida serviço por profissional
- [ ] Agenda bloqueia slots inválidos
- [ ] Agenda calcula duração automática
- [ ] Financeiro importa revenueRulesApi
- [ ] Financeiro calcula repasse por regra
- [ ] Financeiro aplica min/max
- [ ] Financeiro suporta tipos múltiplos
- [ ] Check-in valida appointment
- [ ] Check-in mostra dados do PS
- [ ] Check-in mostra recursos
- [ ] Check-in mostra convênio

---

## 📋 Implementação Paralela

Estas etapas podem ser feitas em paralelo:

### Dia 1 - ETAPA 4.4 (2 horas)
```
09:00-11:00: Proteger páginas
  ✓ ProtectedWizardRoute
  ✓ BlockingModal
  ✓ Feature blocker logic
```

### Dia 2-3 - ETAPA 5 (4 horas)
```
14:00-18:00: Refatorar telas
  ✓ Agenda
  ✓ Financeiro
  ✓ Check-in
  ✓ Testes
```

---

## 🎯 Detalhes de Implementação

### ProtectedWizardRoute

```jsx
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useWizardBlocker } from '@/pages/clinica/base-sistema/useSetupWizard'
import { Modal, ModalContent } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Lock, AlertCircle } from 'lucide-react'

export function ProtectedWizardRoute({ feature, children }) {
  const navigate = useNavigate()
  const { canAccess, getBlockReason } = useWizardBlocker(clinicId)
  
  if (!canAccess(feature)) {
    const reason = getBlockReason(feature)
    return (
      <Modal open={true}>
        <ModalContent>
          <div className="flex items-start gap-4">
            <Lock className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-lg font-bold">Configuração Incompleta</h2>
              <p className="text-gray-600 mt-2">{reason.reason}</p>
              <div className="bg-red-50 border border-red-200 rounded p-3 mt-3">
                {reason.issues.map(issue => (
                  <div key={issue.id}>{issue.message}</div>
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                <Button 
                  onClick={() => navigate('/clinica/base-sistema')}
                  className="bg-blue-600"
                >
                  Ir para Setup Wizard
                </Button>
                <Button 
                  onClick={() => navigate(-1)}
                  variant="outline"
                >
                  Voltar
                </Button>
              </div>
            </div>
          </div>
        </ModalContent>
      </Modal>
    )
  }
  
  return children
}
```

---

## 🧪 Testes Recomendados

### Teste de Bloqueio
```
1. Acesse /clinica/agenda sem setup
   ✓ Modal aparece
   ✓ Mensagem clara
   ✓ Botão funciona
   ✓ Volta funciona

2. Acesse /clinica/financeiro sem setup
   ✓ Modal aparece
   ✓ Mensagem específica
   ✓ Botão funciona

3. Acesse /clinica/checkin sem setup
   ✓ Modal aparece
   ✓ Mensagem específica
```

### Teste de Integração Agenda
```
1. Complete setup (profissional + serviço + link)
2. Configure regra de agenda
3. Tente agendar:
   ✓ Valida profissional-serviço
   ✓ Bloqueia slot inválido
   ✓ Calcula duração correta
   ✓ Salva appointment
   ✓ Aparece na agenda
```

### Teste de Integração Financeiro
```
1. Agende vários appointments
2. Configure regra de repasse
3. Vá para financeiro:
   ✓ Calcula repasse por regra
   ✓ Aplica min/max
   ✓ Mostra valor correto
   ✓ Suporta múltiplos profissionais
```

---

## 📊 Cronograma Recomendado

| Data | Etapa | Tempo | Status |
|------|-------|-------|--------|
| 15 jan | ETAPA 4 | 3h | ✅ |
| 16 jan | ETAPA 4.4 | 2h | ⏳ |
| 17 jan | ETAPA 5 | 4h | ⏳ |
| 18 jan | ETAPA 6 | 3h | ⏳ |
| 19 jan | ETAPA 7-10 | 6h | ⏳ |
| 20 jan | Testes | 3h | ⏳ |

**Total:** ~21 horas = 3 dias

---

## 🎓 Recursos Disponíveis

### APIs Prontas
- `agendaRulesApi.validateSchedulingByRules()` ✅
- `agendaRulesApi.calculateEndTime()` ✅
- `professionalServicesApi.canProfessionalServe()` ✅
- `revenueRulesApi.calculateRepasse()` ✅
- `resourcesApi.listRoomResources()` ✅

### Hooks Prontos
- `useSetupWizard()` ✅
- `useWizardBlocker()` ✅

### Componentes Prontos
- `SetupWizard` ✅
- `BaseSystemLayout` ✅

---

## 💡 Dicas para Implementação

1. **Testes Primeiro:** Sempre teste as APIs antes de integrar
2. **Errors Claros:** Mensagens do usuário devem ser específicas
3. **Performance:** Cache os dados de wizard para evitar muitos requests
4. **UX:** Feedback visual (loading, sucesso, erro) é crucial
5. **Rollback:** Sempre tenha fallback se novo código falhar

---

## 🔗 Links Úteis

- [ETAPA_4_SETUP_WIZARD_COMPLETA.md](./ETAPA_4_SETUP_WIZARD_COMPLETA.md) - Documentação do wizard
- [GUIA_API_MODULES_BASE_SISTEMA.md](./GUIA_API_MODULES_BASE_SISTEMA.md) - Como usar APIs
- [RESUMO_EXECUTIVO_BASE_SISTEMA.md](./RESUMO_EXECUTIVO_BASE_SISTEMA.md) - Visão geral

---

**Próxima Etapa:** ETAPA 4.4 - Proteger Páginas com Validações

Tempo de Início: ~1-2 horas
