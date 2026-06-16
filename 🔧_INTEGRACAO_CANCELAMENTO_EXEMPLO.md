# 🔧 INTEGRAÇÃO: Como Adicionar Cancelamento/Estorno na UI

## 📍 ONDE ADICIONAR

Na aba de edição do atendimento (provavelmente em `AtendimentoModal.jsx`), adicione uma aba ou seção para cancelamento.

---

## 💻 CÓDIGO DE EXEMPLO

### Passo 1: Importar o Componente

```javascript
import CancelamentoEstorno from '@/pages/clinica/agenda/components/CancelamentoEstorno';
```

### Passo 2: Adicionar uma Aba (Se aplicável)

```javascript
// Dentro das abas:
const abas = [
  { id: 'cadastrais', label: 'Cadastrais' },
  { id: 'liberacao', label: 'Liberação' },
  { id: 'faturamento', label: 'Faturamento' },
  { id: 'pagamento', label: 'Pagamento' },
  // ✨ NOVA ABA:
  { id: 'cancelamento', label: '⚠️ Cancelamento/Estorno', className: 'text-red-600 font-bold' },
];
```

### Passo 3: Renderizar o Componente

```javascript
// Dentro da aba:
{activeTab === 'cancelamento' && (
  <div className="p-6 space-y-4">
    <CancelamentoEstorno
      appointment={appointment}
      clinicId={clinicId}
      financialData={{
        totalAmount: parseFloat(appointment.estimated_value || 0),
      }}
      onCancelSuccess={(result) => {
        console.log('✅ Cancelamento bem-sucedido!', result);
        // Atualizar UI:
        alert(`Estorno de R$ ${result.totalRefundAmount.toFixed(2)} processado!`);
        // Refresh ou fechar modal:
        onRefresh?.();
      }}
    />
  </div>
)}
```

---

## 📐 EXEMPLO COMPLETO (AtendimentoModal.jsx)

```javascript
// ❌ ANTES:
const ABAS = [
  { id: 'cadastrais', label: 'Cadastrais' },
  { id: 'liberacao', label: 'Liberação' },
  { id: 'faturamento', label: 'Faturamento' },
  { id: 'pagamento', label: 'Pagamento' },
];

// ✅ DEPOIS:
const ABAS = [
  { id: 'cadastrais', label: 'Cadastrais' },
  { id: 'liberacao', label: 'Liberação' },
  { id: 'faturamento', label: 'Faturamento' },
  { id: 'pagamento', label: 'Pagamento' },
  { 
    id: 'cancelamento', 
    label: '⚠️ Cancelamento/Estorno',
    hidden: false, // mostrar sempre
    className: 'text-red-600 font-bold',
    condition: appointment?.status !== 'cancelado' // esconder se já cancelado
  },
];

// Na renderização:
{ABAS
  .filter(tab => !tab.hidden && (!tab.condition || tab.condition))
  .map(tab => (
    <button
      key={tab.id}
      onClick={() => setActiveTab(tab.id)}
      className={`px-4 py-2 font-semibold transition ${
        activeTab === tab.id
          ? 'border-b-2 border-blue-600 text-blue-600'
          : 'text-gray-600 hover:text-gray-900'
      } ${tab.className || ''}`}
    >
      {tab.label}
    </button>
  ))}

// Renderizar aba de cancelamento:
{activeTab === 'cancelamento' && (
  <div className="p-6">
    <CancelamentoEstorno
      appointment={appointment}
      clinicId={clinicId}
      financialData={{
        totalAmount: parseFloat(appointment.estimated_value || 0),
      }}
      onCancelSuccess={(result) => {
        // Feedback ao usuário:
        console.log('Cancelamento bem-sucedido:', result);
        
        // Atualizar dados locais:
        setAppointment({
          ...appointment,
          status: 'cancelado',
          updated_at: new Date().toISOString(),
        });
        
        // Alertar usuário:
        alert(
          `✅ Atendimento cancelado com sucesso!\n` +
          `Estorno: R$ ${result.totalRefundAmount.toFixed(2)}\n` +
          `Rastreabilidade: ${result.chargebackId}`
        );
        
        // Recarregar dados:
        onRefresh?.();
        
        // Fechar modal após 2 segundos:
        setTimeout(() => {
          onClose?.();
        }, 2000);
      }}
    />
  </div>
)}
```

---

## 🎯 ALTERNATIVA: Menu Dropdown

Se não quiser adicionar aba, coloque em um dropdown/menu:

```javascript
<div className="relative">
  <button
    onClick={() => setShowCancelMenu(!showCancelMenu)}
    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg border border-red-200"
  >
    ⚠️ Ações Perigosas ▼
  </button>
  
  {showCancelMenu && (
    <div className="absolute right-0 mt-2 w-80 bg-white border border-red-300 rounded-lg shadow-lg p-4 z-10">
      <CancelamentoEstorno
        appointment={appointment}
        clinicId={clinicId}
        financialData={{
          totalAmount: parseFloat(appointment.estimated_value || 0),
        }}
        onCancelSuccess={(result) => {
          console.log('Cancelamento bem-sucedido!', result);
          setShowCancelMenu(false);
          onRefresh?.();
        }}
      />
    </div>
  )}
</div>
```

---

## 🔐 VALIDAÇÃO DE PERMISSÕES (Antes de renderizar)

```javascript
// Em AtendimentoModal.jsx:
const { currentRole } = useAuth();
const canCancelAppointment = ['admin', 'gerente', 'operador_financeiro'].includes(currentRole);

// Ao renderizar:
{canCancelAppointment && activeTab === 'cancelamento' && (
  <CancelamentoEstorno {...props} />
)}

// Ou mostrar mensagem se não tem permissão:
{!canCancelAppointment && activeTab === 'cancelamento' && (
  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
    <p className="text-red-900">❌ Você não tem permissão para cancelar atendimentos</p>
    <p className="text-sm text-red-800">Role requerida: admin, gerente ou operador_financeiro</p>
  </div>
)}
```

---

## 🧪 TESTE DE INTEGRAÇÃO

Após integrar, teste:

1. **Abra um atendimento finalizado**
2. **Vá para aba "Cancelamento/Estorno"** (ou menu)
3. **Selecione "Cancelamento Total"**
4. **Preencha:**
   - Motivo: "Teste de integração"
   - Autorização: "TEST_123456"
5. **Clique "Confirmar Estorno"**
6. **Confirme no modal**
7. **Verifique:**
   - Console mostra sucesso ✅
   - Banco tem lançamento negativo ✅
   - Auditoria registrou tudo ✅

---

## 📊 RESULTADO ESPERADO

```
Modal de Sucesso:
✅ "Estorno de R$ 700,00 autorizado e registrado com rastreabilidade completa"

Banco:
- invoices: amount = -700.00
- audit_financial_events: event = CHARGEBACK_INITIATED
- context.authorized_by = user_id
- context.reason = "Teste de integração"
```

---

## 🎓 PROPS DO COMPONENTE

```javascript
<CancelamentoEstorno
  // OBRIGATÓRIO:
  appointment={appointmentObject}        // Dados do atendimento
  clinicId={clinicIdString}              // ID da clínica
  
  // OPCIONAL:
  financialData={{                       // Dados financeiros
    totalAmount: 700.00,                 // Valor total
  }}
  onCancelSuccess={(result) => {         // Callback de sucesso
    console.log('Cancelado:', result);
  }}
/>
```

---

## 🚀 CHECKLIST DE INTEGRAÇÃO

- [ ] Importei `CancelamentoEstorno`
- [ ] Adicionei aba ou menu
- [ ] Validei permissões (role-based)
- [ ] Testei com rol de admin/gerente
- [ ] Testei com rol sem permissão
- [ ] Verifiquei console para erros
- [ ] Verifiquei banco para lançamento
- [ ] Verifiquei auditoria
- [ ] Feedback do usuário é claro
- [ ] Modal fecha depois de sucesso

---

## ❓ DÚVIDAS FREQUENTES

**P: E se o usuário não tem permissão?**
R: O componente renderiza mensagem de erro automaticamente

**P: Como saber se foi bem-sucedido?**
R: Callback `onCancelSuccess` é chamado e retorna resultado com tudo

**P: E se o atendimento já está cancelado?**
R: Pode esconder a aba com `hidden` ou `condition`

**P: Preciso fazer algo especial?**
R: Não! O componente cuida de tudo (validações, auditoria, etc)

---

**Pronto para integrar?** 🚀

Copie e cole o código acima e teste! 💪
