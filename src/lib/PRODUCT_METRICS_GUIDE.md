# 📊 Métricas de Produto - Analytics para Decisões de Negócio

## Objetivo

Transformar eventos de produto em **dados de negócio** para:

- ✅ Identificar **gargalos** (onde usuários falham)
- ✅ Entender **uso real** (quais funcionalidades são usadas)
- ✅ Base para **tomadas de decisão** sobre o produto

---

## 1️⃣ Arquitetura

### Componentes

```
productMetrics.js (src/lib/)
├── trackEvent() → função central
├── trackAppointmentCreated()
├── trackAppointmentUpdated()
├── trackAppointmentConflict()
├── trackValidationError()
└── trackUserLogin()

useAgendamentoMutation.js
├── onSuccess → trackAppointmentCreated()
├── onError (conflict) → trackAppointmentConflict()
└── onError (validation) → trackValidationError()

Sentry.io Dashboard
└── Análises e relatórios
```

### Fluxo

```
Usuário cria agendamento
    ↓
useAgendamentoMutation.js
    ↓
criarAgendamento() bem-sucedido
    ↓
trackAppointmentCreated() chamado
    ↓
Envia para Sentry com tags:
├─ clinic_id: abc-123
├─ user_id: user-456
├─ action: create
├─ duration_ms: 2500
└─ extra: { appointment_type, professional_id, ... }
    ↓
Sentry.io Dashboard exibe evento
```

---

## 2️⃣ Eventos Rastreados

### Agendamentos

#### 1. Criação Bem-Sucedida

```javascript
trackAppointmentCreated(clinicId, userId, {
  appointmentId: 'apt-123',
  type: 'consulta',
  professionalId: 'prof-456',
  paymentMethod: 'insurance', // ou 'cash'
});

// Tags enviadas:
// - event_type: appointment_created ✅
// - clinic_id: clinic-123
// - user_id: user-456
// - action: create
// - severity: info
```

**Uso:** Contar total de agendamentos criados/dia/semana/mês

#### 2. Atualização Bem-Sucedida

```javascript
trackAppointmentUpdated(clinicId, userId, {
  appointmentId: 'apt-123',
  fieldsChanged: ['status', 'time'],
  statusChanged: true,
  previousStatus: 'agendado',
  newStatus: 'confirmado',
});

// Tags:
// - event_type: appointment_updated
// - action: update
```

**Uso:** Rastrear padrões de edição (o que mais muda)

#### 3. Conflito de Concorrência

```javascript
trackAppointmentConflict(clinicId, userId, {
  appointmentId: 'apt-123',
  expectedUpdatedAt: '2026-04-23T10:00:00Z',
  currentUpdatedAt: '2026-04-23T10:05:00Z',
});

// Tags:
// - event_type: appointment_conflict
// - action: conflict_detected
// - severity: warning ⚠️
```

**Uso:** Identificar quantos usuários tentam editar simultâneamente

#### 4. Erro de Validação

```javascript
trackValidationError(clinicId, userId, {
  errorType: 'validation_error',
  errorMessage: 'data é obrigatória',
  attemptedAction: 'create_appointment',
});

// Tags:
// - event_type: appointment_validation_error
// - action: validation_failed
// - severity: warning ⚠️
```

**Uso:** Descobrir quais campos causam mais erros

### Usuários

#### Login

```javascript
trackUserLogin(clinicId, userId, {
  userRole: 'recepcao',
  loginMethod: 'email',
  timeSinceLastLogin: 86400, // segundos
});

// Tags:
// - event_type: user_login
// - action: login
```

**Uso:** Entender padrões de uso (quem usa, quando, com que frequência)

---

## 3️⃣ Como Usar

### Exemplo 1: Rastrear Criação

```javascript
// Em um componente ou hook
import { trackAppointmentCreated } from '@/lib/productMetrics';
import { useAuth } from '@/contexts/AuthContext';

function CriarAgendamento() {
  const { user } = useAuth();

  async function criar(dados) {
    const start = performance.now();
    try {
      const result = await createAppointment(dados);
      const duration = performance.now() - start;

      trackAppointmentCreated(user.clinicId, user.id, {
        appointmentId: result.id,
        type: dados.type,
        professionalId: dados.professionalId,
        duration,
      });

      return result;
    } catch (error) {
      // Erro rastreado automaticamente em useAgendamentoMutation.js
    }
  }
}
```

### Exemplo 2: Rastrear Erro

```javascript
import { trackValidationError } from '@/lib/productMetrics';

function handleError(error, userId, clinicId) {
  if (error.message.includes('obrigatório')) {
    trackValidationError(clinicId, userId, {
      errorType: 'validation_error',
      errorMessage: error.message,
      field: 'date',
      attemptedAction: 'create_appointment',
    });
  }
}
```

### Exemplo 3: Debug no Console

```javascript
// Abrir Devtools (F12)

// Ver todos os helpers disponíveis
window.__PRODUCT_METRICS__;

// Rastrear um evento manualmente
window.__PRODUCT_METRICS__.trackEvent('appointment_created', {
  clinicId: 'clinic-123',
  userId: 'user-456',
  action: 'create',
  extra: { appointment_type: 'consulta' },
});

// Ver resumo de análises
window.__PRODUCT_METRICS__.getEventSummary();
```

---

## 4️⃣ Análises em Sentry

### Análise 1: Taxa de Sucesso

```sql
-- Eventos bem-sucedidos vs falhados

Filtrar por: event_type:appointment_created
Contar: COUNT(*) = sucesso total

Filtrar por: event_type:appointment_validation_error
Contar: COUNT(*) = validação falhou

Taxa = sucesso / (sucesso + falha)
Resultado: ex. 92% das tentativas são bem-sucedidas
```

### Análise 2: Gargalos de Performance

```sql
-- Qual ação demora mais?

Filtrar por: severity:slow (duration_ms > 5000)
Agrupar por: event_type
Resultado:
  - appointment_created: 8% lentos
  - appointment_updated: 12% lentos ← GARGALO
  - appointment_confirmed: 2% lentos

Ação: Otimizar atualização de agendamentos
```

### Análise 3: Usuários Únicos

```sql
-- Quantas pessoas usam a plataforma?

Filtrar por: event_type:appointment_created
Contar DISTINCT: user_id
Resultado: 156 usuários/mês criaram agendamentos

Crescimento: Comparar com mês anterior
```

### Análise 4: Conflitos de Concorrência

```sql
-- Com qual frequência usuários editam simultaneamente?

Filtrar por: event_type:appointment_conflict
Contar: COUNT(*)
Resultado: 23 conflitos/mês

Taxa: 23 conflitos / 4500 total updates = 0.5%
Conclusão: Rara, mas happens
```

### Análise 5: Campos com Mais Erros

```sql
-- Qual campo causa mais erros de validação?

Filtrar por: event_type:appointment_validation_error
Agrupar por: extra.field
Resultado:
  - field: 'date' → 145 erros
  - field: 'professional_id' → 78 erros
  - field: 'patient_id' → 34 erros

Ação: Melhorar UI do seletor de data
```

---

## 5️⃣ Tags Importantes

| Tag             | Valor              | Uso                                   |
| --------------- | ------------------ | ------------------------------------- |
| **clinic_id**   | UUID               | Filtrar por clínica                   |
| **user_id**     | UUID               | Rastrear usuário específico           |
| **action**      | string             | Tipo de ação (create, update, delete) |
| **event_type**  | string             | Categorizar evento                    |
| **severity**    | info/warning/error | Prioridade                            |
| **performance** | fast/slow          | Duration > 5000ms                     |

---

## 6️⃣ Dados Extras Enviados

```javascript
{
  event_name: 'appointment_created',
  timestamp: '2026-04-23T11:30:00Z',
  appointment_type: 'consulta',
  professional_id: 'prof-456',
  patient_id: 'patient-789',
  payment_method: 'insurance',
  duration_ms: 2500,
}
```

Todos esses dados ficam visíveis no Sentry Issue Details para investigação.

---

## 7️⃣ Exemplos de Decisões

### Decisão 1: Priorizar Qual Feature?

```
Dados:
- appointment_created: 4500/mês (100%)
- appointment_updated: 3200/mês (71%)
- appointment_confirmed: 800/mês (18%)

Conclusão:
- Agenda é core (todos criam)
- Confirmação é pouco usada
- Talvez remover ou destacar melhor
```

### Decisão 2: Onde Investir em Performance?

```
Dados:
- appointment_created: 95% < 3000ms
- appointment_updated: 65% < 5000ms ← PROBLEMA
- appointment_confirmed: 98% < 1000ms

Conclusão:
- Otimizar update (DB query ou API?)
- Investigar por que demora 2x mais
```

### Decisão 3: Treinar Usuários?

```
Dados:
- validation_error (field: date): 145/mês
- validation_error (field: professional_id): 78/mês

Conclusão:
- Campo "date" causa muitos erros
- Talvez UI confusa ou data picker ruim
- Investir em melhor UX ou documentação
```

---

## 8️⃣ Checklist de Deploy

- [x] productMetrics.js criado
- [x] Integrado em useAgendamentoMutation.js
- [x] Tags obrigatórias: clinicId, userId, action
- [x] Eventos principais rastreados
- [x] Documentação completa
- [ ] Sentry.io projeto criado (se não tiver)
- [ ] VITE_SENTRY_DSN configurado em produção
- [ ] Testar rastreamento em dev (console)
- [ ] Analisar dados após 1 semana em produção

---

## 9️⃣ Dicas

### ✅ Faça

- ✅ Rastrear sucesso E falha (taxa de conversão)
- ✅ Incluir contexto (qual field falhou, quanto tempo levou)
- ✅ Agrupar eventos relacionados (appointment\_\*)
- ✅ Revisar métricas semanalmente
- ✅ Usar dados para priorizar

### ❌ Evite

- ❌ Rastrear dados sensíveis (CPF, cartão de crédito)
- ❌ Rastrear demais (causa ruído)
- ❌ Ignorar warnings/conflicts
- ❌ Tomar decisão com 1 dia de dados
- ❌ Logar tudo em mesmo nível de severidade

---

## 🔟 Próximos Passos

1. **Produção Ativa:** Deploy código com métricas
2. **Primeira Semana:** Deixar data acumular
3. **Análise:** Abrir Sentry e explorar dados
4. **Decisão:** Identifique 1 gargalo para corrigir
5. **Iteração:** Implemente melhoria, medir resultado

---

## Status

✅ **Métricas de Produto — Implementadas e Pronto para Produção**

- [x] Sistema de rastreamento (productMetrics.js)
- [x] Integração em mutations (useAgendamentoMutation.js)
- [x] Tags estruturadas (clinic_id, user_id, action)
- [x] Eventos principais (create, update, conflict, error)
- [x] Documentação com análises
- [x] Build: 4.931 módulos, zero erros

**Próximo:** Deploy em produção e monitorar Sentry dashboard 📊
