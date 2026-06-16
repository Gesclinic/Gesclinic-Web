# 🚀 QUICK START - IMPLEMENTAÇÃO FASE 1

## ⚡ COMEÇAR HOJE (30 minutos para setup)

### 1️⃣ LEIA ISTO PRIMEIRO (5 min)
Entenda o objetivo:

```
Quando atendimento é "liberado" na Agenda:
  ✅ Cria Contas a Receber (já funciona)
  ✅ Cria Lançamento automático (NOVO - Fase 1)
  ✅ Aparece em Fluxo de Caixa (automático)
  ✅ Atualiza DRE (automático)
```

---

## 🗂️ ARQUIVO DE REFERÊNCIA TÉCNICA

**Ver:** `🔗_PLANO_INTEGRACAO_LANCAMENTOS.md`

Lá você vai encontrar:
- [ ] Estrutura exata de dados (JSON)
- [ ] SQL para criar campos
- [ ] Código JavaScript para criar lançamento
- [ ] Checklist de implementação
- [ ] Testes a fazer

---

## 🛠️ SETUP (15 min)

### Passo 1: Baixar o Arquivo de Referência
```
Arquivo: 🔗_PLANO_INTEGRACAO_LANCAMENTOS.md
Ler seções:
  - "ESTRUTURA DE DADOS"
  - "CÓDIGO JAVASCRIPT"
  - "TESTES UNITÁRIOS"
```

### Passo 2: Entender o Fluxo Atual
```
Arquivo atual: src/pages/clinica/agenda/components/AtendimentoModal.jsx

Procure por: handleLiberar()
  └─ Onde cria Contas a Receber
  └─ Aqui adicionar: criar Lançamento
```

### Passo 3: Criar Arquivo Helper
```
Novo arquivo: src/lib/lancamentoHelpers.js

Copiar função: createLancamentoFromAppointment()
  └─ Recebe: appointmentData
  └─ Retorna: lancamentoData
  └─ Salva em: financial_transactions
```

---

## 📝 CÓDIGO NECESSÁRIO (Copy/Paste)

### 1. Helper Function (src/lib/lancamentoHelpers.js)

```javascript
// src/lib/lancamentoHelpers.js

import customSupabaseClient from './customSupabaseClient.js';

/**
 * Cria lançamento automaticamente quando atendimento é liberado
 * @param {Object} appointmentData - Dados do atendimento
 * @returns {Object} Lançamento criado
 */
export async function createLancamentoFromAppointment(appointmentData) {
  const supabase = customSupabaseClient();
  
  const lancamento = {
    clinic_id: appointmentData.clinic_id,
    date: new Date().toISOString(),
    description: `Receita - ${appointmentData.patient_name || 'Paciente'} (Atendimento)`,
    
    // ⭐ NOVO: Rastreabilidade de origem
    origin: 'agenda',
    related_entity_type: 'accounts_receivable',
    appointment_id: appointmentData.id,
    
    // Dados financeiros
    account_id: appointmentData.account_id || 'DEFAULT_ACCOUNT',
    cost_center_id: appointmentData.cost_center_id || null,
    amount: parseFloat(appointmentData.valor || 0),
    type: 'entry',
    status: 'pending', // Previsão (ainda não recebido)
    
    // Metadados
    notes: `Auto-criado de atendimento ${appointmentData.id}`,
    created_at: new Date().toISOString(),
  };
  
  try {
    const { data, error } = await supabase
      .from('financial_transactions')
      .insert([lancamento])
      .select()
      .single();
    
    if (error) {
      console.error('Erro ao criar lançamento:', error);
      throw error;
    }
    
    console.log('✅ Lançamento criado:', data);
    return data;
    
  } catch (err) {
    console.error('Erro no createLancamentoFromAppointment:', err);
    throw err;
  }
}

/**
 * Quando AR é marcada como recebida, confirmar lançamento
 * @param {string} appointmentId - ID do atendimento
 * @param {Object} paymentData - Dados do pagamento
 */
export async function confirmLancamentoFromPayment(appointmentId, paymentData) {
  const supabase = customSupabaseClient();
  
  try {
    // Encontra lançamento pendente do atendimento
    const { data: lancamento, error: findError } = await supabase
      .from('financial_transactions')
      .select('*')
      .eq('appointment_id', appointmentId)
      .eq('origin', 'agenda')
      .eq('status', 'pending')
      .single();
    
    if (findError) {
      console.warn('Lançamento pendente não encontrado:', findError);
      return null;
    }
    
    // Atualiza para confirmed
    const { data, error } = await supabase
      .from('financial_transactions')
      .update({
        status: 'confirmed',
        related_entity_type: 'accounts_receivable',
        related_entity_id: paymentData.receivable_id,
        account_id: paymentData.payment_account_id,
        notes: `Confirmado - Pagamento: ${paymentData.payment_method}`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', lancamento.id)
      .select()
      .single();
    
    if (error) {
      console.error('Erro ao confirmar lançamento:', error);
      throw error;
    }
    
    console.log('✅ Lançamento confirmado:', data);
    return data;
    
  } catch (err) {
    console.error('Erro no confirmLancamentoFromPayment:', err);
    throw err;
  }
}
```

### 2. Integração no AtendimentoModal.jsx

```javascript
// Em: src/pages/clinica/agenda/components/AtendimentoModal.jsx

// ✅ Adicionar import
import { createLancamentoFromAppointment } from '../../../lib/lancamentoHelpers.js';

// ✅ Na função handleLiberar(), APÓS criar AR, adicionar:

async function handleLiberar() {
  try {
    // ... código existente que cria AR ...
    
    // ⭐ NOVO: Criar lançamento automaticamente
    if (appointmentData.valor > 0) {
      const lancamentoData = {
        clinic_id: clinicId,
        id: appointmentData.id,
        patient_name: appointmentData.patient_name,
        valor: appointmentData.valor,
        account_id: '12345', // ID da conta padrão
      };
      
      await createLancamentoFromAppointment(lancamentoData);
      console.log('✅ Lançamento criado automaticamente');
    }
    
    // ... resto do código ...
    toast.success('Atendimento liberado e lançamento criado!');
    
  } catch (error) {
    console.error('Erro ao liberar atendimento:', error);
    toast.error('Erro ao liberar atendimento');
  }
}
```

---

## 🗃️ DATABASE (5 min)

### SQL para Adicionar Campos

```sql
-- Adiciona rastreabilidade de origem em financial_transactions
-- Run em: Supabase SQL Editor

ALTER TABLE financial_transactions
ADD COLUMN IF NOT EXISTS origin VARCHAR(50) DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS related_entity_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS related_entity_id UUID,
ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES appointments(id);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_financial_transactions_origin 
ON financial_transactions(origin);

CREATE INDEX IF NOT EXISTS idx_financial_transactions_appointment_id 
ON financial_transactions(appointment_id);

CREATE INDEX IF NOT EXISTS idx_financial_transactions_related_entity 
ON financial_transactions(related_entity_type, related_entity_id);

-- Comentários para documentação
COMMENT ON COLUMN financial_transactions.origin IS 
'Origem do lançamento: agenda, manual, receivable, payable, transfer, etc';

COMMENT ON COLUMN financial_transactions.related_entity_type IS 
'Tipo de entidade relacionada: accounts_receivable, accounts_payable, etc';

COMMENT ON COLUMN financial_transactions.related_entity_id IS 
'ID da entidade relacionada para rastreabilidade';

COMMENT ON COLUMN financial_transactions.appointment_id IS 
'ID do atendimento se origem=agenda';
```

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

### Setup (30 min)
- [ ] Ler `🔗_PLANO_INTEGRACAO_LANCAMENTOS.md` completo
- [ ] Criar arquivo `src/lib/lancamentoHelpers.js`
- [ ] Copiar código do helper
- [ ] Executar SQL de alteração de tabela
- [ ] Importar helper em `AtendimentoModal.jsx`
- [ ] Adicionar chamada ao `createLancamentoFromAppointment()`

### Testes (20 min)
- [ ] Testar criar atendimento
- [ ] Testar liberar atendimento (deve criar AR + Lançamento)
- [ ] Verificar em `financial_transactions`:
  - [ ] Status = 'pending'
  - [ ] origin = 'agenda'
  - [ ] appointment_id = preenchido
- [ ] Verificar em Fluxo de Caixa (deve aparecer)
- [ ] Verificar em DRE (deve impactar)

### Validação (10 min)
- [ ] Menu novo funciona
- [ ] Rotas corretas
- [ ] Sem erros no console
- [ ] Dados aparecem corretos

### QA (30 min)
- [ ] Testar fluxo completo:
  1. Criar atendimento
  2. Liberar (cria AR + Lançamento)
  3. Receber (confirma Lançamento)
  4. Validar Fluxo de Caixa
  5. Validar DRE

---

## 🐛 TROUBLESHOOTING

### Problema: "Tabela financial_transactions não tem origem"
**Solução:** Execute o SQL de ALTER TABLE acima no Supabase

### Problema: "createLancamentoFromAppointment não definida"
**Solução:** Verifique se o arquivo foi criado em `src/lib/lancamentoHelpers.js`

### Problema: "Erro de RLS ao criar lançamento"
**Solução:** Verifique se RLS permite insert com clinic_id

### Problema: "Lançamento não aparece em Fluxo de Caixa"
**Solução:** Confirme status='confirmed' (pending não aparece)

---

## 📊 VERIFICAÇÃO

### No Supabase (SQL)
```sql
-- Verificar lançamentos criados
SELECT id, origin, status, appointment_id, amount, date
FROM financial_transactions
WHERE clinic_id = 'SEU_CLINIC_ID'
ORDER BY date DESC
LIMIT 10;

-- Resultado esperado:
-- id | origin | status | appointment_id | amount | date
-- ---|--------|--------|----------------|--------|------
-- 1  | agenda | pending| APT_123        | 150.00 | 2026-05-22
-- 2  | manual | confirmed| null         | 200.00 | 2026-05-22
```

### No App (React Developer Tools)
```
Chrome → F12 → React Components
Procure: AtendimentoModal
├─ appointmentData
├─ lancamentoData ← Deve estar preenchido
└─ console.log ← Verificar mensagens
```

---

## 🎯 PRÓXIMAS FASES

Depois que Fase 1 (Agenda → Lançamentos) está funcionando:

### Fase 2: AR → Lançamentos
- Quando marca como recebida em Contas a Receber
- Confirmar lançamento pendente
- Usar: `confirmLancamentoFromPayment()`

### Fase 3: AP → Lançamentos
- Quando marca como paga em Contas a Pagar
- Criar lançamento tipo 'exit'
- Mesmo padrão da Fase 2

### Fase 4: DRE Automática
- Ler dados de financial_transactions
- Agrupar por account_type
- Atualizar em tempo real

---

## 📞 SUPORTE

**Dúvidas sobre o plano?**
→ Ver: `🔗_PLANO_INTEGRACAO_LANCAMENTOS.md`

**Dúvidas sobre arquitetura?**
→ Ver: `🔄_FLUXO_DADOS_INTEGRADO.md`

**Dúvidas sobre menu?**
→ Ver: `📊_MENU_VISUALIZACAO.md`

---

## ⏱️ TIMELINE

```
├─ Hoje (30 min)
│  ├─ Ler documentação
│  ├─ Setup SQL
│  └─ Criar helper
│
├─ Amanhã (2-3 horas)
│  ├─ Implementar integração
│  ├─ Testar
│  └─ QA
│
├─ Próximos 2 dias (4-6 horas)
│  ├─ Fase 2 + Fase 3
│  ├─ Testes integrados
│  └─ Validação completa
│
└─ Deploy
   ├─ Staging
   ├─ Usuários piloto
   └─ Produção
```

---

## 🎓 BOA SORTE!

**Você está começando a construir o motor financeiro automático do Gesclinic!**

✅ Documentação completa  
✅ Código de exemplo  
✅ SQL pronto  
✅ Plano claro  

**Próximo passo:** Criar arquivo `src/lib/lancamentoHelpers.js` e começar!

