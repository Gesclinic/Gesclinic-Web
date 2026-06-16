# ⚡ PRÓXIMOS PASSOS - Teste AtendimentoUnificado Modal

## 🎯 O que foi feito
✅ Componente `AtendimentoUnificado.jsx` criado e integrado  
✅ SQL triggers deployados no Supabase  
✅ App compila sem erros  
✅ Login funciona  
✅ Agenda acessível  

## 🚀 O que falta (10 minutos)

### Opção 1: Criar Agendamento via SQL (Mais Rápido)

**PASSO 1:** Ir para Supabase SQL Editor
```
https://supabase.com/dashboard/project/gvdkdjyupktlflwurike/sql
```

**PASSO 2:** Cole este SQL:
```sql
-- Primeiro: Verificar clinic_id atual
SELECT id, name FROM clinics LIMIT 1;

-- Verificar um paciente e profissional existentes
SELECT id FROM patients LIMIT 1;  -- Copie este ID
SELECT id FROM professionals LIMIT 1;  -- Copie este ID
SELECT id FROM rooms LIMIT 1;  -- Copie este ID

-- Depois: Criar agendamento
INSERT INTO appointments (
  clinic_id,
  patient_id,
  professional_id,
  room_id,
  scheduled_at,
  status
) VALUES (
  'a41e6efc-c6ad-45fc-9a6b-7abba7d50f02',  -- seu clinic_id
  'COLOQUE_ID_PACIENTE',
  'COLOQUE_ID_PROFISSIONAL',
  'COLOQUE_ID_SALA',
  NOW() + INTERVAL '2 hours',
  'scheduled'
) RETURNING id;
```

**PASSO 3:** Copie o ID retornado

### Opção 2: Criar via UI (Mais Lento)
- Ir para `/clinica/agenda`
- Clicar "Novo"
- Preencher dados manuais

## 🧪 Testar o Modal

**PASSO 1:** Ir para `http://localhost:3000/clinica/agenda`

**PASSO 2:** Procurar pelo agendamento criado  
*(Se criou via SQL, pode estar em outro dia - use as setas para navegar)*

**PASSO 3:** Clicar no agendamento

**PASSO 4:** Esperar modal `AtendimentoUnificado` abrir com:
- [ ] Tab: Dados (paciente, convênio, profissional, sala)
- [ ] Tab: Serviços (adicionar serviços)
- [ ] Tab: Financeiro (status em tempo real)
- [ ] Tab: Auditoria (timeline de eventos)
- [ ] Tab: Check-in (chegada/saída)

**PASSO 5:** Testar:
1. Adicionar um serviço
2. Salvar alterações
3. Clicar "Finalizar Atendimento"
4. Verificar recebível criado no Supabase

## ✅ Validar Triggers

Após finalizar um atendimento, execute no Supabase:

```sql
-- Verificar se recebível foi criado
SELECT id, appointment_id, status, total_amount 
FROM ar_invoices 
WHERE appointment_id = 'SEU_APPOINTMENT_ID'
LIMIT 1;

-- Verificar se auditoria foi registrada
SELECT event_type, event_data, created_at
FROM financial_audit_logs 
WHERE appointment_id = 'SEU_APPOINTMENT_ID'
ORDER BY created_at DESC;
```

## 📊 Resultado Esperado

| Ação | Esperado |
|------|----------|
| Modal abre | ✅ 5 abas carregam |
| Adicionar serviço | ✅ Aparece na lista |
| Finalizar atendimento | ✅ Recebível criado automaticamente |
| Verificar BD | ✅ `ar_invoices` tem novo registro |
| Verificar auditoria | ✅ `financial_audit_logs` mostra eventos |

## 🐛 Se algo não funcionar

### Modal não abre?
1. Abra DevTools (F12)
2. Verifique console por erros vermelhos
3. Compartilhe o erro aqui

### Recebível não criado?
1. Verifique se status mudou para 'completed'
2. Verifique se há dados suficientes (paciente, profissional, serviços)
3. Verifique logs: `SELECT * FROM financial_audit_logs LIMIT 10;`

### Erro de "syncAppointmentServices"?
- Significa que a mutation de adicionar serviço falhou
- Verifique se `appointmentsApi.js` tem essa função
- Se não, use `updateAppointmentWithServices` em vez disso

---

**Tempo Estimado:** 10-15 minutos para validar tudo  
**Depois:** Deploy em staging e produção  
**Status:** 🟢 Pronto para testes
