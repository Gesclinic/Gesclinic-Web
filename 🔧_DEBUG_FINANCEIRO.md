# 🔧 DEBUG GUIDE - RASTREANDO CRIAÇÃO DE FINANCEIRO

## 🎯 COMO VERIFICAR EXATAMENTE O QUE ESTÁ ACONTECENDO

### Passo 1: Abrir Console do Navegador
```
Chrome: F12 → Console
Firefox: F12 → Console
```

### Passo 2: Adicionar Filtros de Log

```javascript
// Cole isso no console:

// Criar um monitor para qualquer chamada de createAR
const originalLog = console.log;
const arLogs = [];

console.log = function(...args) {
  if (String(args).includes('Conta a Receber') || 
      String(args).includes('createAR') ||
      String(args).includes('📤 Enviando') ||
      String(args).includes('handleSave')) {
    arLogs.push({
      time: new Date().toLocaleTimeString(),
      message: args.join(' ')
    });
  }
  originalLog.apply(console, args);
};

// Para visualizar depois:
window.arLogs = arLogs;
```

### Passo 3: Executar a Ação

1. Clique em "Liberar para Atendimento"
2. Preencha as abas (se necessário)
3. Salve

### Passo 4: Verificar Logs

```javascript
// No console, digite:
arLogs
// Vai mostrar todos os logs de AR criadas

// Ou especificamente:
arLogs.filter(l => l.message.includes('Conta a Receber'))
```

---

## 🔎 LOGS A PROCURAR

### Se estiver usando CHECK-IN (Recepção):

```
✅ "💾 Tentando salvar liberação:" 
   → Significa que está em CheckinAcoes.jsx
   → Próximo: Status muda para LIBERADO_PARA_ATENDIMENTO
   → Depois: Nenhuma criação de AR aqui

❌ "❌ Erro ao criar Conta a Receber"
   → Seria gerado apenas em AtendimentoModal.jsx, não aqui
```

### Se estiver usando MODAL DE ATENDIMENTO:

```
✅ "📤 Iniciando processo de registro financeiro..."
   → Significa que está em handleSavePagamento()
   → Próximo: Vai criar AR

✅ "✅ Conta a Receber criada para saldo aberto:"
   → AR foi criada com sucesso
   → Valor está sendo rastreado

✅ "✅ Auditoria financeira registrada"
   → Log na tabela de auditoria foi feito
   → Rastreabilidade OK
```

---

## 📊 VERIFICAÇÃO NO BANCO DE DADOS

### Query 1: Ver últimas ARs criadas

```sql
SELECT 
  id,
  appointment_id,
  amount,
  due_date,
  status,
  created_at,
  customer_name
FROM accounts_receivable
ORDER BY created_at DESC
LIMIT 5;
```

**Esperado:**
- `appointment_id`: Pré-preenchido com ID do atendimento
- `amount`: Valor correto (com desconto aplicado se houver)
- `status`: 'open' ou similar
- `created_at`: Data/hora recente

### Query 2: Ver auditoria de financeiro

```sql
SELECT 
  id,
  appointment_id,
  financial_event_type,
  related_entity_type,
  related_entity_id,
  amount,
  created_at
FROM audit_financial_events
WHERE appointment_id = 'SEU_APPOINTMENT_ID'
ORDER BY created_at DESC;
```

**Esperado:**
- `financial_event_type`: 'RECEIVABLE_CREATED'
- `related_entity_type`: 'accounts_receivable'
- `related_entity_id`: ID da AR criada
- `amount`: Valor da AR

### Query 3: Correlação Temporal

```sql
SELECT 
  'AR' as tipo,
  ar.created_at,
  ar.amount,
  apt.id as appointment_id,
  apt.status,
  apt.updated_at
FROM accounts_receivable ar
LEFT JOIN appointments apt ON ar.appointment_id = apt.id
WHERE ar.appointment_id = 'SEU_APPOINTMENT_ID'

UNION ALL

SELECT
  'Appointment' as tipo,
  apt.updated_at,
  NULL,
  apt.id,
  apt.status,
  apt.updated_at
FROM appointments apt
WHERE apt.id = 'SEU_APPOINTMENT_ID'

ORDER BY created_at DESC;
```

**O que significa:**
- Se AR vem DEPOIS de "LIBERADO_PARA_ATENDIMENTO": AR criada manualmente (aba Pagamento)
- Se AR vem ANTES ou junto: Pode estar automática (não deveria, mas está)

---

## 🎯 CENÁRIOS POSSÍVEIS

### Cenário A: ✅ Funcionamento Correto Atual

```
TIMELINE:
09:30 - Clica "Liberar para Atendimento"
        └─ Status: LIBERADO_PARA_ATENDIMENTO
        └─ appointment.updated_at: 09:30

09:31 - Abre aba "Pagamento" do modal
09:32 - Clica "Salvar" na aba "Pagamento"
        └─ createAR() executado
        └─ AR criada
        └─ accounts_receivable.created_at: 09:32

DATABASE:
- appointment.updated_at: 09:30
- accounts_receivable.created_at: 09:32
- Diferença: +2 minutos (manual, não automático)
```

### Cenário B: ❌ Problema: Criando sem IR para aba Pagamento

```
TIMELINE:
09:30 - Clica "Liberar para Atendimento"
        └─ Status: LIBERADO_PARA_ATENDIMENTO
        └─ appointment.updated_at: 09:30
        └─ AR criada AQUI (ERRO!)
        └─ accounts_receivable.created_at: 09:30

DATABASE:
- appointment.updated_at: 09:30
- accounts_receivable.created_at: 09:30
- Diferença: 0 segundos (automático, mas ERRADO!)
- Problema: AR criada no botão, não em "Salvar Pagamento"
```

### Cenário C: ✅ Ideal (Após Fase 1)

```
TIMELINE:
09:30 - Clica "Liberar para Atendimento"
        └─ Status: LIBERADO_PARA_ATENDIMENTO
        └─ appointment.updated_at: 09:30
        └─ AR criada automaticamente (origem: 'agenda')
        └─ Lançamento criado (origin: 'agenda')
        └─ accounts_receivable.created_at: 09:30
        └─ financial_transactions.created_at: 09:30

DATABASE:
- financial_transactions.origin: 'agenda'
- financial_transactions.appointment_id: preenchido
- financial_transactions.status: 'pending'
- Diferença: 0 segundos (automático, CORRETO!)
```

---

## 🛠️ CÓDIGO PARA COPIAR E TESTAR

### Adicionar Debug ao Seu Navegador

Salve este código em um arquivo e abra no console:

```javascript
// ===== DEBUG: Rastreador de Conta a Receber =====

console.log('🔧 Iniciando DEBUG de Conta a Receber...');

const debugAR = {
  eventos: [],
  
  // Registrar evento
  log(tipo, mensagem, dados = {}) {
    const evento = {
      timestamp: new Date().toISOString(),
      tipo,
      mensagem,
      dados
    };
    this.eventos.push(evento);
    console.log(`[${tipo}] ${mensagem}`, dados);
  },
  
  // Monitorar clic nos botões importantes
  setupMonitors() {
    // Procurar por botões que dizem "Liberar"
    const liberarButtons = Array.from(document.querySelectorAll('button'))
      .filter(btn => btn.textContent.includes('Liberar'));
    
    liberarButtons.forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        this.log('CLICK', `Botão "Liberar" clicado (#${idx})`, {
          buttonText: btn.textContent,
          timestamp: new Date().toLocaleTimeString()
        });
      });
    });
    
    // Procurar por botões "Salvar"
    const salvarButtons = Array.from(document.querySelectorAll('button'))
      .filter(btn => btn.textContent.includes('Salvar'));
    
    salvarButtons.forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        this.log('CLICK', `Botão "Salvar" clicado (#${idx})`, {
          buttonText: btn.textContent,
          timestamp: new Date().toLocaleTimeString()
        });
      });
    });
    
    console.log('✅ Monitores instalados');
  },
  
  // Mostrar relatório
  relatorio() {
    console.table(this.eventos);
    return this.eventos;
  }
};

// Instalar monitores
debugAR.setupMonitors();

// Usar:
// debugAR.relatorio() para ver todos os eventos
// debugAR.eventos para acessar array bruto
window.debugAR = debugAR;

console.log('✅ Use: debugAR.relatorio() para ver eventos');
```

### Executar:

1. Copie o código acima
2. Abra DevTools (F12)
3. Vá para Console
4. Cole e execute
5. Execute a ação (Liberar para Atendimento)
6. Digite `debugAR.relatorio()` para ver timeline

---

## 📋 CHECKLIST DE DEBUG

- [ ] Abri DevTools (F12)
- [ ] Procurei por logs "Conta a Receber"
- [ ] Verifiquei no banco se AR foi criada
- [ ] Comparei timestamps (appointment vs AR)
- [ ] Anotei a diferença de tempo
- [ ] Identifiquei: Manual ou Automática?

---

## 🎯 RESULTADO ESPERADO

Depois de executar os passos acima, você vai saber:

**1. Está criando financeiro?**
- ✅ SIM: AR aparece no banco
- ❌ NÃO: Nenhuma AR criada

**2. Quando está criando?**
- ✅ Logo ao clicar "Liberar": Automática (Fase 1 já?)
- ✅ Depois, em "Pagamento": Manual (Correto atual)

**3. Está rastreando origem?**
- ✅ SIM: financial_transactions.origin = 'agenda'
- ❌ NÃO: origin está null/vazio

**4. Está criando lançamento?**
- ✅ SIM: financial_transactions tem registro
- ❌ NÃO: Apenas AR, sem lançamento

---

Se ainda tiver dúvidas depois disso, compartilhe:
- Screenshot do console com os logs
- Resultado da query do banco
- Timestamp de quando clicou vs quando criou
