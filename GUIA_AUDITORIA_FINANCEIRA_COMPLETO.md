# 🧾 AUDITORIA FINANCEIRA DO ATENDIMENTO - GUIA COMPLETO

**Versão:** 1.0  
**Data:** 14 de Janeiro de 2026  
**Status:** ✅ Pronto para Implementação

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Componentes](#componentes)
4. [Integração](#integração)
5. [Permissões](#permissões)
6. [Exemplos de Uso](#exemplos-de-uso)
7. [Validações](#validações)
8. [Troubleshooting](#troubleshooting)

---

## Visão Geral

### O que é?

Sistema **append-only** (apenas leitura/inserção) que registra **todos** os eventos financeiros de um atendimento:

- ✅ Conta a receber criada
- ✅ Guia de convênio gerada
- ✅ Pagamento recebido
- ✅ Glosa registrada
- ✅ Glosa revertida
- ✅ Repasse médico calculado
- ✅ Repasse pago

### Por quê?

- **Rastreabilidade total:** Saber exatamente quem fez o quê e quando
- **Conformidade:** LGPD, NR, SOC2 exigem auditoria completa
- **Detecção de problemas:** Alertas automáticos para divergências
- **Recuperação:** Se algo der errado, temos o histórico completo

### Como funciona?

```
Atendimento criado
    ↓
├─ Conta a receber criada → Log: RECEIVABLE_CREATED
├─ Guia enviada → Log: BILLING_SENT
├─ Pagamento recebido → Log: PAYMENT_RECEIVED
├─ Glosa registrada → Log: GLOSA_REGISTERED
└─ Repasse calculado → Log: REPASSE_CALCULATED
```

Cada evento é imutável e inclui:
- **O quê** aconteceu (tipo de evento)
- **Quando** aconteceu (timestamp)
- **Quem** fez (usuário + role)
- **Quanto** (valores antes/depois)
- **Por quê** (contexto, observações)

---

## Arquitetura

### Banco de Dados

```sql
appointment_financial_audit_logs
├── id (UUID, PK)
├── appointment_id (FK → appointments)
├── financial_event_type (ENUM)
├── related_entity (accounts_receivable, billing_guide, glosa, repasse_medico)
├── related_entity_id (UUID da entidade relacionada)
├── amount (NUMERIC)
├── previous_amount (NUMERIC)
├── status (TEXT)
├── performed_by (FK → auth.users)
├── performed_by_role (TEXT: GESTOR, FINANCEIRO, etc)
├── performed_at (TIMESTAMPTZ)
├── context (JSONB)
└── created_at (TIMESTAMPTZ)
```

**Características:**
- ✅ Append-only: Triggers previnem UPDATE/DELETE
- ✅ Índices por appointment_id, event_type, performed_at
- ✅ RLS policies para segurança
- ✅ JSONB para contexto flexível

### Backend API

**Arquivo:** `src/lib/auditFinancialApi.js` (500+ linhas)

#### Função Principal
```javascript
await logAppointmentFinancialAudit({
  appointmentId: "...",                    // OBRIGATÓRIO
  financialEventType: "RECEIVABLE_CREATED", // OBRIGATÓRIO
  relatedEntity: "accounts_receivable",
  relatedEntityId: "...",
  amount: 150.00,
  previousAmount: null,
  status: "open",
  context: { ... }
});
```

#### Queries Disponíveis
```javascript
// Timeline completa
await getAppointmentFinancialAuditTrail(appointmentId);

// Sumário com estatísticas
await getAppointmentFinancialSummary(appointmentId);

// Detectar divergências
await checkFinancialDivergences(appointmentId);

// Eventos por tipo
await getAppointmentEventsByType(appointmentId, "PAYMENT_RECEIVED");

// Listar por clínica
await listFinancialAuditEvents({ clinicId, eventType, startDate, endDate });
```

### Frontend Components

#### AppointmentFinancialAuditTimeline
```javascript
<AppointmentFinancialAuditTimeline
  appointmentId="..."
  compact={false}  // false = timeline completa, true = resumo
  userRole="GESTOR"
/>
```

**Mostra:**
- Timeline visual com ícones
- Valores e status
- Contexto expandível
- Alertas de divergências
- Estatísticas

#### Hook: useAppointmentFinancialAudit
```javascript
const { trail, summary, divergences, loading, refresh } = 
  useAppointmentFinancialAudit(appointmentId, {
    autoLoad: true,
    refreshInterval: 30000  // 30 segundos
  });
```

---

## Componentes

### 1. Migration SQL
**Arquivo:** `supabase/migrations/2026-01-14_create_appointment_financial_audit_logs.sql`

O quê faz:
- ✅ Cria tabela append-only
- ✅ Adiciona índices para performance
- ✅ Implementa RLS policies
- ✅ Cria triggers de prevenção de update/delete

Como aplicar:
```bash
# Via Supabase Console: SQL Editor → cole o conteúdo do arquivo
# OU via CLI:
supabase db push
```

### 2. Backend API
**Arquivo:** `src/lib/auditFinancialApi.js`

Funções principais:
- `logAppointmentFinancialAudit()` - Inserir novo evento
- `getAppointmentFinancialAuditTrail()` - Buscar timeline
- `getAppointmentFinancialSummary()` - Obter sumário completo
- `checkFinancialDivergences()` - Detectar problemas
- `listFinancialAuditEvents()` - Listar por clínica

### 3. Componente React
**Arquivo:** `src/pages/clinica/agenda/components/AppointmentFinancialAuditTimeline.jsx`

Mostra:
- Timeline visual dos eventos
- Ícones e cores por tipo
- Valores de movimentação
- Contexto expandível
- Alertas de divergências

Permissões:
- GESTOR: Acesso completo
- FINANCEIRO: Acesso completo
- Outros: Acesso negado (componente oculto)

### 4. Custom Hook
**Arquivo:** `src/pages/clinica/agenda/hooks/useAppointmentFinancialAudit.js`

Facilita:
- Auto-load de dados
- Refresh manual
- Refresh automático
- Gerenciamento de estado

### 5. Integração Helper
**Arquivo:** `src/lib/auditFinancialIntegration.js`

Funções simplificadas:
```javascript
// Usar nos fluxos existentes
await logReceivableCreated(appointmentId, receivableId, amount);
await logPaymentReceived(appointmentId, receivableId, amount, ...);
await logGlosaRegistered(appointmentId, glosaId, amount, reason);
await logRepasseCalculated(appointmentId, professionalId, repasseId, amount);
// ... etc
```

### 6. Exemplo de Integração
**Arquivo:** `src/pages/clinica/agenda/examples/AppointmentDetailWithAuditExample.jsx`

Dois componentes prontos:
- `AppointmentDetailModalWithAudit` - Modal com abas
- `AppointmentDetailDrawerWithAudit` - Drawer lateral

---

## Integração

### Passo 1: Aplicar Migration

No Supabase Console:
1. Ir para **SQL Editor**
2. Abrir `supabase/migrations/2026-01-14_create_appointment_financial_audit_logs.sql`
3. Colar conteúdo completo
4. Executar (▶ botão)

Resultado esperado: ✅ "Tables created"

### Passo 2: Adicionar ao main.jsx ou App.jsx

```javascript
// Importar para inicializar globalmente (opcional)
import "@/lib/auditFinancialIntegration";
```

### Passo 3: Adicionar Logging nos Fluxos Existentes

#### Em financeApi.js - createAR()
```javascript
import { logReceivableCreated } from "@/lib/auditFinancialIntegration";

export async function createAR(clinicId, appointmentId, payload) {
  const { data, error } = await supabase.from('accounts_receivable').insert([...]);
  
  if (!error && data) {
    // ✨ Adicionar este log
    await logReceivableCreated(
      appointmentId,
      data.id,
      data.amount,
      { payer_id: payload.payer_id }
    );
  }
  
  return { data, error };
}
```

#### Em financeApi.js - updateAR() quando pago
```javascript
import { logPaymentReceived } from "@/lib/auditFinancialIntegration";

export async function updateAR(id, patch) {
  const { data, error } = await supabase.from('accounts_receivable')
    .update(patch).eq('id', id).select().single();
  
  if (!error && patch.status === 'received') {
    // ✨ Adicionar este log
    const appointmentId = ... // buscar da AR
    await logPaymentReceived(
      appointmentId,
      id,
      patch.amount,
      previousAmount,
      'received'
    );
  }
  
  return { data, error };
}
```

#### Em repasseMedicoApi.js - gerarRepasse()
```javascript
import { logRepasseCalculated } from "@/lib/auditFinancialIntegration";

export async function gerarRepasse({ clinicId, mes, ano }) {
  const { data, error } = await supabase.rpc('gerar_repasse_medico', {...});
  
  if (!error && data) {
    // ✨ Para cada atendimento no repasse
    for (const appointment of data.appointments) {
      await logRepasseCalculated(
        appointment.appointment_id,
        appointment.professional_id,
        appointment.repasse_id,
        appointment.amount,
        appointment.commission
      );
    }
  }
  
  return { data, error };
}
```

### Passo 4: Adicionar Botão ao Drawer/Modal Existente

```javascript
import { AppointmentFinancialAuditTimeline } from "@/pages/clinica/agenda/components/AppointmentFinancialAuditTimeline";

// Em seu componente Modal/Drawer de detalhes de atendimento:

export function AppointmentDrawer() {
  const { currentRole } = useAuth();
  
  // ... seu código existente ...
  
  return (
    <div>
      {/* Suas abas existentes */}
      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Detalhes</TabsTrigger>
          
          {/* ADICIONAR ESTA ABA */}
          {["GESTOR", "FINANCEIRO"].includes(currentRole) && (
            <TabsTrigger value="audit">
              🧾 Auditoria Financeira
            </TabsTrigger>
          )}
          
          <TabsTrigger value="notes">Observações</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details">
          {/* Seu conteúdo */}
        </TabsContent>
        
        {/* ADICIONAR ESTE CONTEÚDO */}
        {["GESTOR", "FINANCEIRO"].includes(currentRole) && (
          <TabsContent value="audit">
            <AppointmentFinancialAuditTimeline
              appointmentId={appointmentId}
              userRole={currentRole}
            />
          </TabsContent>
        )}
        
        <TabsContent value="notes">
          {/* Seu conteúdo */}
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

## Permissões

### Níveis de Acesso

| Role | Visualizar | Criar Log | Editar | Deletar |
|------|-----------|----------|--------|---------|
| **GESTOR** | ✅ Completo | ✅ Sim | ❌ Não | ❌ Não |
| **FINANCEIRO** | ✅ Completo | ✅ Sim | ❌ Não | ❌ Não |
| **ADMIN** | ✅ Completo | ✅ Sim | ❌ Não | ❌ Não |
| **PROFISSIONAL** | ❌ Não | ❌ Não | ❌ Não | ❌ Não |
| **RECEPÇÃO** | ❌ Não | ❌ Não | ❌ Não | ❌ Não |

### RLS Policies (Supabase)

```sql
-- Somente GESTOR/FINANCEIRO/ADMIN podem VER
CREATE POLICY "audit_logs_select_authorized" 
ON appointment_financial_audit_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role_name IN ('GESTOR', 'FINANCEIRO', 'ADMIN')
  )
);

-- Somente usuários da clínica podem INSERIR
CREATE POLICY "audit_logs_insert_own" 
ON appointment_financial_audit_logs 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM appointments a
    WHERE a.id = appointment_id
    AND a.clinic_id IN (
      SELECT clinic_id FROM user_clinic_assignments 
      WHERE user_id = auth.uid()
    )
  )
);
```

---

## Exemplos de Uso

### Exemplo 1: Buscar Timeline de Atendimento

```javascript
import { getAppointmentFinancialAuditTrail } from "@/lib/auditFinancialApi";

// Em um componente
async function showAuditTrail() {
  const trail = await getAppointmentFinancialAuditTrail(appointmentId);
  
  trail.forEach(event => {
    console.log({
      tipo: event.financial_event_type,
      valor: event.amount,
      quando: event.performed_at,
      quem: event.performed_by_role,
      detalhes: event.context
    });
  });
}
```

### Exemplo 2: Registrar Pagamento Recebido

```javascript
import { logPaymentReceived } from "@/lib/auditFinancialIntegration";

// Quando um pagamento é recebido em financeApi.js
async function registerPayment(appointmentId, receivableId, amount) {
  // 1. Atualizar conta a receber no banco
  const { data, error } = await supabase
    .from('accounts_receivable')
    .update({ status: 'received', paid_amount: amount })
    .eq('id', receivableId);
  
  // 2. Registrar na auditoria
  if (!error) {
    await logPaymentReceived(
      appointmentId,
      receivableId,
      amount,
      previousAmount,
      'received',
      { 
        payment_method: 'pix',
        bank_account: '123456',
        receipt_number: 'REC-001'
      }
    );
  }
}
```

### Exemplo 3: Usar Hook no Componente

```javascript
import { useAppointmentFinancialAudit } from "@/pages/clinica/agenda/hooks/useAppointmentFinancialAudit";
import { AppointmentFinancialAuditTimeline } from "@/pages/clinica/agenda/components/AppointmentFinancialAuditTimeline";

export function AppointmentPanel() {
  const appointmentId = "...";
  
  const {
    trail,
    summary,
    divergences,
    loading,
    hasDivergences,
    refresh
  } = useAppointmentFinancialAudit(appointmentId, {
    refreshInterval: 30000 // Atualizar a cada 30s
  });
  
  return (
    <div>
      {hasDivergences && (
        <div className="alert alert-warning">
          ⚠️ {divergences.length} problema(s) detectado(s)!
        </div>
      )}
      
      <AppointmentFinancialAuditTimeline
        appointmentId={appointmentId}
      />
      
      <button onClick={refresh}>
        Atualizar
      </button>
    </div>
  );
}
```

---

## Validações

### Regras Críticas

1. **appointment_id é obrigatório**
   - Todo evento financeiro DEVE estar vinculado a um atendimento
   - Se não houver appointment_id, o log falha silenciosamente

2. **Imutabilidade garantida**
   - Nenhum log pode ser editado após criação
   - Tentativas de UPDATE/DELETE são bloqueadas por trigger
   - Logs deletados = inválido e não é permitido

3. **Divergências detectadas automaticamente**
   - Pagamento sem conta a receber → ALERTA HIGH
   - Glosa revertida sem glosa original → ALERTA HIGH
   - Glosa + Repasse simultâneos → ALERTA MEDIUM

4. **Valores normalizados**
   - Todos os valores são `NUMERIC(12,2)` 
   - Conversão automática: `Number(event.amount).toFixed(2)`

### Validação de Entry

```javascript
// Antes de logar, validar:

// ✅ appointment_id existe
const appt = await supabase
  .from('appointments')
  .select('id')
  .eq('id', appointmentId)
  .single();

if (!appt) throw new Error("Atendimento não encontrado");

// ✅ Usuário tem permissão
const userRole = await getCurrentUserRole();
if (!["GESTOR", "FINANCEIRO"].includes(userRole)) {
  throw new Error("Permissão negada");
}

// ✅ Valores são válidos
if (amount < 0) throw new Error("Valor não pode ser negativo");
```

---

## Troubleshooting

### Problema: "appointment_id is null"
**Solução:** Verificar se appointmentId está sendo passado corretamente
```javascript
// ❌ Errado
logAppointmentFinancialAudit({ 
  financialEventType: "RECEIVABLE_CREATED" 
});

// ✅ Correto
logAppointmentFinancialAudit({ 
  appointmentId: "uuid-here",
  financialEventType: "RECEIVABLE_CREATED" 
});
```

### Problema: "Acesso negado" ao visualizar timeline
**Solução:** Verificar role do usuário
```javascript
// Verificar role
const { data: { user } } = await supabase.auth.getUser();
const { data: role } = await supabase
  .from('user_roles')
  .select('role_name')
  .eq('user_id', user.id)
  .single();

console.log("User role:", role.role_name); // Deve ser GESTOR/FINANCEIRO/ADMIN
```

### Problema: Timeline não aparece depois de atualização
**Solução:** Chamar refresh manualmente
```javascript
const { refresh } = useAppointmentFinancialAudit(appointmentId);

// Após criar evento
await logReceivableCreated(...);

// Atualizar UI
await refresh();
```

### Problema: Valores muito altos/baixos não aparecem
**Solução:** Verificar se está dentro do range NUMERIC(12,2)
```javascript
// MAX: 9999999.99
// MIN: -9999999.99

if (amount > 9999999.99 || amount < -9999999.99) {
  console.warn("Valor fora do range");
}
```

---

## 📞 Suporte

### Documentação Relacionada
- [Auditoria de Atendimentos](./auditApi.md)
- [API de Contas a Receber](./receivablesApi.md)
- [API de Repasse Médico](./repasseMedicoApi.md)

### Arquivos Criados
- ✅ `supabase/migrations/2026-01-14_create_appointment_financial_audit_logs.sql`
- ✅ `src/lib/auditFinancialApi.js`
- ✅ `src/lib/auditFinancialIntegration.js`
- ✅ `src/pages/clinica/agenda/components/AppointmentFinancialAuditTimeline.jsx`
- ✅ `src/pages/clinica/agenda/hooks/useAppointmentFinancialAudit.js`
- ✅ `src/pages/clinica/agenda/examples/AppointmentDetailWithAuditExample.jsx`

### Status de Implementação
- ✅ Banco de dados: Pronto
- ✅ Backend API: Pronto
- ✅ Frontend components: Pronto
- ⏳ Integração com fluxos: Necessário adicionar chamadas (veja passo 3)
- ⏳ UI no drawer: Necessário adicionar abas (veja passo 4)

---

**Versão:** 1.0  
**Atualizado:** 14 de Janeiro de 2026  
**Status:** ✅ Pronto para Implementação  
**Autor:** GitHub Copilot
