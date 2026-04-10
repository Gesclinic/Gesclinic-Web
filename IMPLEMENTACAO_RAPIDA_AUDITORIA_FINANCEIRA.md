# 🚀 IMPLEMENTAÇÃO RÁPIDA - AUDITORIA FINANCEIRA

**Tempo de Implementação:** 15 minutos  
**Nível de Dificuldade:** ⭐⭐⭐ (Intermediário)  
**Data:** 14 de Janeiro de 2026

---

## 3 PASSOS PARA PRODUÇÃO

### PASSO 1: Aplicar Migration SQL (3 min)

1. Abra **Supabase Console** → **SQL Editor**
2. Crie novo arquivo SQL
3. Cole todo o conteúdo de: `supabase/migrations/2026-01-14_create_appointment_financial_audit_logs.sql`
4. Clique em **▶ Run** (botão verde)
5. Verificar resultado: `✅ Tables created successfully`

**Checklist:**
- [ ] Migration executada
- [ ] Tabela `appointment_financial_audit_logs` criada
- [ ] Índices criados
- [ ] RLS policies ativadas

---

### PASSO 2: Verificar Permissões do Usuário (2 min)

Adicione isso a um test file ou console:

```javascript
// Verificar se usuário tem permissão
const { data: { user } } = await supabase.auth.getUser();
const { data: role } = await supabase
  .from('user_roles')
  .select('role_name')
  .eq('user_id', user.id)
  .single();

console.log("User role:", role.role_name);
// Deve retornar: GESTOR, FINANCEIRO ou ADMIN
// Se não retornar, contato suporte
```

**Checklist:**
- [ ] User tem role GESTOR, FINANCEIRO ou ADMIN
- [ ] Conseguiu fazer select na tabela

---

### PASSO 3: Integrar nos Fluxos Existentes (10 min)

#### 3.1 - Em financeApi.js (createAR)

Encontre a função `createAR()` e adicione:

```javascript
// No topo do arquivo, adicione import
import { logReceivableCreated } from "@/lib/auditFinancialIntegration";

// Na função createAR(), após criar a conta
export async function createAR(clinicId, appointmentId, payload) {
  const { data, error } = await supabase
    .from('accounts_receivable')
    .insert([{...}])
    .select()
    .single();

  if (!error && data && appointmentId) {
    // ✨ ADICIONE ESTAS LINHAS
    logReceivableCreated(
      appointmentId,
      data.id,
      data.amount,
      { payer_id: payload.payer_id, description: "Conta a receber criada" }
    ).catch(err => console.warn("Erro ao logar auditoria:", err));
  }

  return { data, error };
}
```

#### 3.2 - Em financeApi.js (updateAR - Pagamento)

Encontre onde status muda para "received" e adicione:

```javascript
// No topo do arquivo, adicione import
import { logPaymentReceived } from "@/lib/auditFinancialIntegration";

// Na parte que atualiza para "received"
if (newStatus === 'received' && appointmentId) {
  // ✨ ADICIONE ESTAS LINHAS
  logPaymentReceived(
    appointmentId,
    receivableId,
    amount,
    previousAmount,
    'received',
    { payment_date: new Date().toISOString() }
  ).catch(err => console.warn("Erro ao logar auditoria:", err));
}
```

#### 3.3 - Em repasseMedicoApi.js (gerarRepasse)

Encontre `gerarRepasse()` e adicione:

```javascript
// No topo do arquivo, adicione import
import { logRepasseCalculated } from "@/lib/auditFinancialIntegration";

// Após gerar repasse com sucesso
if (!error && data) {
  // Se data é um array de repasses
  if (Array.isArray(data)) {
    for (const repasse of data) {
      logRepasseCalculated(
        repasse.appointment_id,
        repasse.professional_id,
        repasse.id,
        repasse.amount,
        repasse.commission || 0
      ).catch(err => console.warn("Erro ao logar:", err));
    }
  }
}
```

**Checklist:**
- [ ] Adicionado import em financeApi.js
- [ ] Adicionado log em createAR()
- [ ] Adicionado log em updateAR() para pagamentos
- [ ] Adicionado log em repasseMedicoApi.js

---

## VALIDAÇÃO RÁPIDA (5 min)

### Teste 1: Criar Conta a Receber

```javascript
import { logReceivableCreated } from "@/lib/auditFinancialIntegration";

// Executar no console
const appointmentId = "seu-appointment-uuid-aqui";
const receivableId = "nova-receivable-uuid";

const result = await logReceivableCreated(
  appointmentId,
  receivableId,
  150.00,
  { test: "Teste manual" }
);

console.log("Log criado:", result);
// Esperado: { id: "...", appointment_id: "...", financial_event_type: "RECEIVABLE_CREATED", ... }
```

**Resultado esperado:** ✅ Log com id UUID

### Teste 2: Buscar Timeline

```javascript
import { getAppointmentFinancialAuditTrail } from "@/lib/auditFinancialApi";

// Executar no console
const trail = await getAppointmentFinancialAuditTrail("seu-appointment-uuid-aqui");

console.log("Timeline:", trail);
// Esperado: Array com 1+ eventos
```

**Resultado esperado:** ✅ Array com eventos

### Teste 3: Visualizar no Componente

```javascript
import { AppointmentFinancialAuditTimeline } from "@/pages/clinica/agenda/components/AppointmentFinancialAuditTimeline";

// Adicionar a um componente React
<AppointmentFinancialAuditTimeline
  appointmentId="seu-appointment-uuid-aqui"
  userRole="GESTOR"
/>

// Esperado: Timeline visual com os eventos
```

**Resultado esperado:** ✅ Componente renderizado com timeline

---

## INTEGRAÇÃO NO DRAWER (5 min)

Se você tem um drawer/modal de detalhes do atendimento:

```javascript
// 1. Importar no topo
import { AppointmentFinancialAuditTimeline } from "@/pages/clinica/agenda/components/AppointmentFinancialAuditTimeline";
import { useAuth } from "@/contexts/AuthContext";

// 2. Em seu componente
export function AppointmentDrawer() {
  const { currentRole } = useAuth();
  const [activeTab, setActiveTab] = useState("details");

  return (
    <Dialog>
      {/* Seu header e conteúdo existente */}
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="details">Detalhes</TabsTrigger>
          
          {/* ✨ ADICIONE ESTA ABA */}
          {["GESTOR", "FINANCEIRO", "ADMIN"].includes(currentRole) && (
            <TabsTrigger value="audit">
              🧾 Auditoria Financeira
            </TabsTrigger>
          )}
          
          <TabsTrigger value="notes">Observações</TabsTrigger>
        </TabsList>

        {/* Suas abas existentes */}
        <TabsContent value="details">{/* seu código */}</TabsContent>
        <TabsContent value="notes">{/* seu código */}</TabsContent>

        {/* ✨ ADICIONE ESTE CONTEÚDO */}
        {["GESTOR", "FINANCEIRO", "ADMIN"].includes(currentRole) && (
          <TabsContent value="audit">
            <AppointmentFinancialAuditTimeline
              appointmentId={appointmentId}
              userRole={currentRole}
            />
          </TabsContent>
        )}
      </Tabs>
    </Dialog>
  );
}
```

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

### Migração
- [ ] Migration SQL aplicada ao Supabase
- [ ] Tabela criada: `appointment_financial_audit_logs`
- [ ] Índices criados
- [ ] RLS policies ativas

### Backend
- [ ] Arquivo `auditFinancialApi.js` criado
- [ ] Arquivo `auditFinancialIntegration.js` criado
- [ ] Imports adicionados em financeApi.js
- [ ] Imports adicionados em repasseMedicoApi.js
- [ ] Chamadas de logging adicionadas nos fluxos

### Frontend
- [ ] Arquivo `AppointmentFinancialAuditTimeline.jsx` criado
- [ ] Arquivo `useAppointmentFinancialAudit.js` criado
- [ ] Componente importado no drawer/modal
- [ ] Aba "Auditoria Financeira" adicionada
- [ ] Componente renderizado com dados

### Testes
- [ ] Teste 1: Criar log manualmente ✅
- [ ] Teste 2: Buscar timeline ✅
- [ ] Teste 3: Visualizar componente ✅
- [ ] Teste 4: Criar conta a receber (fluxo real)
- [ ] Teste 5: Registrar pagamento (fluxo real)
- [ ] Teste 4: Verificar permissões (não GESTOR vê acesso negado)

---

## TROUBLESHOOTING RÁPIDO

### "Erro: appointment_id é obrigatório"
```javascript
// ❌ Errado - sem appointmentId
logReceivableCreated(undefined, receivableId, 150);

// ✅ Correto - com appointmentId
logReceivableCreated(appointmentId, receivableId, 150);
```

### "Erro: Acesso negado"
```javascript
// Verificar role do usuário
const { data: role } = await supabase
  .from('user_roles')
  .select('role_name')
  .eq('user_id', currentUser.id)
  .single();

console.log("Role:", role.role_name); // Deve ser GESTOR/FINANCEIRO/ADMIN
```

### "Timeline não aparece"
```javascript
// Verificar se há eventos
const trail = await getAppointmentFinancialAuditTrail(appointmentId);
console.log("Events count:", trail.length); // Deve ser > 0

// Se vazio, criar um teste
await logReceivableCreated(appointmentId, "test-id", 100);
```

### "Componente não renderiza"
```javascript
// Verificar imports
import AppointmentFinancialAuditTimeline from "@/pages/clinica/agenda/components/AppointmentFinancialAuditTimeline";

// Verificar props
<AppointmentFinancialAuditTimeline
  appointmentId="uuid-válido"
  userRole="GESTOR" // Deve ser GESTOR, FINANCEIRO ou ADMIN
/>
```

---

## PRÓXIMOS PASSOS

### Imediato (Hoje)
1. ✅ Aplicar migration
2. ✅ Integrar nos 3 fluxos
3. ✅ Testar componente
4. ✅ Adicionar no drawer

### Curto Prazo (Esta semana)
- Monitorar logs gerados
- Ajustar contexto dos logs (adicionar mais detalhes)
- Treinar time sobre funcionalidade

### Longo Prazo (Este mês)
- Criar dashboard de análise de auditoria
- Adicionar alertas automáticos para divergências
- Integrar com relatórios financeiros

---

## 📞 SUPORTE RÁPIDO

| Problema | Solução |
|----------|---------|
| "Tabela não criada" | Verificar SQL no Console; copiar novamente |
| "Acesso negado" | Verificar role do usuário em `user_roles` |
| "Eventos não aparecem" | Chamar `refresh()` do hook |
| "Componente em branco" | Verificar `appointmentId` válido |
| "Valores errados" | Verificar conversão `Number(amount).toFixed(2)` |

---

**Status:** ✅ Pronto para Implementação  
**Tempo Total:** ~15 minutos  
**Complexidade:** ⭐⭐⭐ Intermediário  
**Dependências:** Supabase, React 18, Tailwind CSS  

Boa implementação! 🎉
