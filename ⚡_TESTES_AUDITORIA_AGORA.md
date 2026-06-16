# 🧪 Testes End-to-End - Sistema de Auditoria de Agendamentos

## Status: ✅ Infraestrutura PRONTA

Todos os triggers e RLS foram implementados com sucesso!

---

## 📝 Passos de Teste

### **1. Iniciar Dev Server**
```bash
npm run dev
```
Aguarde: `http://localhost:3000` aberto em localhost:3000

### **2. Fazer Login**
- Navegar para: `http://localhost:3000/login`
- Usar credenciais de teste válidas (consulte `.env.local`)

### **3. Verificar Acesso ao Agenda**
- Navegar para: `http://localhost:3000/clinica/agenda`
- Confirmar que a página carrega corretamente

### **4. TESTE 1: CREATE (Criar Agendamento)**
1. Clicar em "+ Novo Agendamento" ou similar
2. Preencher formulário:
   - Paciente: [seu_paciente_teste]
   - Profissional: [seu_profissional_teste]
   - Data/Hora: [próximos 30 minutos]
   - Status: "Agendado"
3. Clicar "Salvar"
4. **Verificação BD:**
   ```sql
   SELECT * FROM appointment_audit_logs 
   WHERE appointment_id = '[novo_id]'
   ORDER BY created_at DESC
   LIMIT 1;
   ```
   - Deve retornar 1 linha com `action_type = 'CREATED'`
   - `performed_by` deve ser o UUID do usuário logado (não NULL)

### **5. TESTE 2: UPDATE (Editar Agendamento)**
1. Encontrar o agendamento criado
2. Clicar "Editar"
3. Mudar um campo:
   - Alterar "Status" para "Confirmado"
   - OU mudar "Horário" para 30 min depois
4. Clicar "Salvar"
5. **Verificação BD:**
   ```sql
   SELECT * FROM appointment_audit_logs 
   WHERE appointment_id = '[seu_id]'
   ORDER BY created_at DESC
   LIMIT 1;
   ```
   - Deve retornar linha com `action_type = 'UPDATED'`
   - `context` deve conter os valores OLD e NEW
   - `performed_by` deve ser válido

### **6. TESTE 3: DELETE (Cancelar/Deletar Agendamento)**
1. Encontrar o agendamento
2. Clicar "Cancelar" ou "Deletar"
3. Confirmar ação
4. **Verificação BD:**
   ```sql
   SELECT * FROM appointment_audit_logs 
   WHERE appointment_id = '[seu_id]'
   ORDER BY created_at DESC
   LIMIT 1;
   ```
   - Deve retornar linha com `action_type = 'DELETED'`
   - `context` deve ter o registro deletado

---

## 🔍 Validações Gerais

✅ **Todos os 3 eventos capturados:**
```sql
SELECT action_type, COUNT(*) 
FROM appointment_audit_logs 
GROUP BY action_type;
-- Esperado: CREATED (1), UPDATED (1+), DELETED (0-1)
```

✅ **Atribuição de usuário funcionando:**
```sql
SELECT DISTINCT performed_by 
FROM appointment_audit_logs 
WHERE performed_by != '00000000-0000-0000-0000-000000000000';
-- Esperado: UUIDs válidos, não zeros
```

✅ **RLS Policy funcionando:**
```sql
-- Conectar como usuário 1
SELECT COUNT(*) FROM appointment_audit_logs;
-- Conectar como usuário 2 (clínica diferente)
SELECT COUNT(*) FROM appointment_audit_logs;
-- Esperado: Usuário 2 vê 0 linhas (seus logs apenas)
```

---

## 📊 Query Útil: Ver Histórico Completo

```sql
SELECT 
  a.appointment_id,
  a.action_type,
  a.performed_by,
  u.email as performed_by_email,
  a.context->>'old_status' as status_anterior,
  a.context->>'new_status' as status_novo,
  a.created_at
FROM appointment_audit_logs a
LEFT JOIN users u ON a.performed_by = u.id
WHERE a.appointment_id = '[seu_appointment_id]'
ORDER BY a.created_at ASC;
```

---

## ⚠️ Possíveis Problemas & Soluções

| Problema | Solução |
|----------|---------|
| `performed_by` é NULL | Verificar se `auth.uid()` está retornando valor. Fazer login novamente. |
| `performed_by` é todos zeros | `auth.uid()` retornou NULL. Verificar sistema de auth. |
| Nenhuma linha em auditoria | Verificar se triggers foram criados: `SELECT * FROM information_schema.triggers WHERE trigger_name LIKE 'appointment_audit%';` |
| RLS bloqueando leitura | Verificar se policy está em permissive mode. Confirmar clinic_id do usuário. |

---

## 🎯 Próximos Passos

1. ✅ Testes manuais (este documento)
2. ⏳ Testes automatizados (Jest/Vitest)
3. ⏳ UI de visualização de logs (Nova página: `/clinica/auditoria`)
4. ⏳ Deployment para produção

**Data de Conclusão Esperada:** Próxima sessão (Task 5)
