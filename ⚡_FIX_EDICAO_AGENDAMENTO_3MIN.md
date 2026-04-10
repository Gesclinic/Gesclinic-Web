# ⚡ SOLUÇÃO RÁPIDA: Agendamento não Salva (3 MINUTOS)

## 🎯 PROBLEMA
Quando edita um agendamento e clica em "ATUALIZAR", a data não muda.

## ✅ SOLUÇÕES JÁ APLICADAS

### ✅ 1. Removi código duplicado em AgendaDayView
- Deletei função `handleEdit` que usava modal não definido
- Agora usa apenas `handleReschedule` → `onEditAppointment`

### ✅ 2. Removi `.select()` do UPDATE
- O `.select()` estava sendo bloqueado por RLS
- Agora UPDATE não tenta retornar dados
- Se não houver erro, significa que funcionou

### ✅ 3. Código para carregar dados já existe
- ModalCriarAgendamento já tem useEffect que carrega dados
- Não precisava de mudança

---

## 🔴 PROBLEMA RESTANTE: RLS Policy

Mesmo com as correções acima, o UPDATE pode estar bloqueado por RLS.

### Execute AGORA no Supabase SQL Editor:

**PASSO 1:** Verificar clinic_id do usuário
```sql
SELECT id, email, clinic_id FROM users WHERE id = auth.uid();
```

**Resultado esperado:** Uma linha com `clinic_id` preenchido (UUID grande)
**Resultado problema:** clinic_id vazio/NULL

---

**PASSO 2:** Se clinic_id for NULL, atualike ASSIM:

First, find your clinic ID:
```sql
SELECT id, name FROM clinics LIMIT 5;
```

Depois update (copie o UUID da sua clínica):
```sql
UPDATE users 
SET clinic_id = 'COPIE-O-UUID-AQUI'
WHERE id = auth.uid();
```

---

**PASSO 3:** Testar se funciona agora

1. Fechar e reabrir o navegador
2. Ir para Agenda
3. Editar um agendamento
4. Mudar a data
5. Clicar "ATUALIZAR"
6. **Pressionar F12** para abrir DevTools
7. Procurar por log: `📥 [Modal] RESPOSTA do Supabase após UPDATE:`
8. Se mostrar: `updateError: null` → ✅ FUNCIONOU!

---

**PASSO 4:** Se ainda não funcionar

Execute este script completo:
```sql
-- Ver todas as policies atualmente
SELECT policyname, permissive, qual, with_check 
FROM pg_policies 
WHERE tablename = 'appointments';

-- Recriar a policy completa
DROP POLICY IF EXISTS "appointments_update" ON public.appointments;

CREATE POLICY "appointments_update"
  ON public.appointments
  FOR UPDATE
  USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()))
  WITH CHECK (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

-- Verificar se criou corretamente
SELECT policyname, with_check FROM pg_policies 
WHERE tablename = 'appointments' AND policyname = 'appointments_update';
```

---

## 📝 CHECKLIST

- [ ] Executei PASSO 1 (verificar clinic_id)
- [ ] Executei PASSO 2 (se era NULL, atualizei)
- [ ] Executei PASSO 3 (testei no navegador)
- [ ] Se não funcionou, executei PASSO 4 (recriar policy)
- [ ] Testei novamente no navegador

---

## 📞 PRÓXIMAS ETAPAS

Após confirmsr que UPDATE funciona:

1. **Integrar Recepção** (Check-in → muda status para at_reception)
2. **Integrar Profissional** (Iniciar atendimento → muda status para in_progress)
3. **Criar Finalização** (Finalizar atendimento → muda status para completed)

Ver arquivo: `⚡_DIAGNOSTICO_COMPLETO_AGENDA_RECEPCAO_ATENDIMENTO.md`
