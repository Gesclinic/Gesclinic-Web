# 📋 Guia: Auditoria Completa (LGPD Compliant)

## Objetivo

Registrar todas as alterações de agendamento para rastreabilidade, compliance LGPD e base para relatórios.

---

## 1️⃣ Arquitetura

### A. Tabela: `appointment_audit_logs`

```sql
id UUID -- Identificador único do log
appointment_id UUID -- Qual agendamento foi alterado
clinic_id UUID -- Qual clínica
user_id UUID -- Quem alterou (opcional, pode ser deletado)
user_email TEXT -- Email do usuário (para auditoria permanente)
user_role VARCHAR(50) -- Papel do usuário (admin, gestor, etc.)
action VARCHAR(50) -- Tipo: create, update, delete
old_data JSONB -- Estado anterior completo
new_data JSONB -- Estado novo completo
status_changed_from VARCHAR(50) -- Status anterior (se changed)
status_changed_to VARCHAR(50) -- Status novo (se changed)
ip_address TEXT -- IP de origem
user_agent TEXT -- Browser/Device
created_at TIMESTAMP -- Quando foi alterado
```

### B. Triggers Automáticos

```sql
-- AFTER INSERT: Registra criação
-- AFTER UPDATE: Registra atualização (OLD vs NEW)
-- AFTER DELETE: Registra deleção
```

### C. Fluxo Automático

```
User edita agendamento
    ↓
Frontend chama mutation
    ↓
Mutation adiciona userId, userRole ao payload
    ↓
Service atualiza appointments table
    ↓
TRIGGER dispara automaticamente
    ↓
appointment_audit_logs recebe NEW registro
    ↓
Log criado com todos detalhes (OLD vs NEW)
✅ Sem ação adicional necessária
```

---

## 2️⃣ O Que é Rastreado

### ✅ Criação

```
action: 'create'
old_data: NULL
new_data: { todos os campos do novo agendamento }
user_id: quem criou
created_at: quando
```

### ✅ Atualização

```
action: 'update'
old_data: { estado anterior }
new_data: { estado novo }
status_changed_from: 'agendado'
status_changed_to: 'confirmado'
user_id: quem alterou
created_at: quando
```

### ✅ Deleção

```
action: 'delete'
old_data: { estado que foi deletado }
new_data: NULL
user_id: quem deletou
created_at: quando
```

---

## 3️⃣ Exemplos de Uso

### Exemplo 1: Ver Histórico de Agendamento X

```javascript
// No BD (SQL)
SELECT * FROM appointment_audit_logs
WHERE appointment_id = 'abc-123'
ORDER BY created_at DESC;

// Resultado:
// ID | Action  | User Email | Status From | Status To | Created At
// 1  | create  | recep@...  | NULL        | agendado  | 11:00
// 2  | update  | prof@...   | agendado    | confirmado| 11:30
// 3  | update  | admin@...  | confirmado  | atendido  | 12:00
```

### Exemplo 2: Ver Quem Fez Cada Alteração

```javascript
// Última alteração de cada agendamento
SELECT
  appointment_id,
  user_email,
  action,
  created_at
FROM appointment_audit_logs
WHERE clinic_id = 'clinic-123'
AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

### Exemplo 3: Comparar Antes e Depois

```javascript
// Ver exatamente o que mudou
SELECT
  old_data->>'status' as status_antes,
  new_data->>'status' as status_depois,
  old_data->>'professional_id' as prof_antes,
  new_data->>'professional_id' as prof_depois,
  created_at
FROM appointment_audit_logs
WHERE appointment_id = 'abc-123'
AND action = 'update';
```

---

## 4️⃣ Usar no Frontend

### Opção A: Componente Modal de Auditoria

```javascript
import AuditTrailModal from '@/pages/clinica/agenda/components/AuditTrailModal';

// No componente que exibe agendamentos:
const [showAudit, setShowAudit] = useState(false);
const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);

// Botão para abrir histórico
<button
  onClick={() => {
    setSelectedAppointmentId(appointmentId);
    setShowAudit(true);
  }}
>
  📋 Ver Histórico
</button>;

// Modal
{
  showAudit && (
    <AuditTrailModal appointmentId={selectedAppointmentId} onClose={() => setShowAudit(false)} />
  );
}
```

### Opção B: Usar Diretamente em Componentes

```javascript
// Buscar logs de forma programática
const { data: logs } = await supabase
  .from('appointment_audit_logs')
  .select('*')
  .eq('appointment_id', appointmentId)
  .order('created_at', { ascending: false });

// Exibir em tabela/timeline
logs.forEach((log) => {
  console.log(`${log.user_email} ${log.action} às ${log.created_at}`);
});
```

---

## 5️⃣ Segurança & RLS

### ✅ Proteções Implementadas

```sql
-- Apenas admin e gestor podem VER logs
CREATE POLICY "Gestores e admins podem ver logs"
  ON appointment_audit_logs
  FOR SELECT
  USING (user.role IN ('admin', 'gestor'));

-- Ninguém pode INSERT/UPDATE/DELETE (apenas triggers)
CREATE POLICY "Ninguém pode modificar logs"
  ON appointment_audit_logs
  FOR INSERT, UPDATE, DELETE
  USING (false);
```

### ✅ Mascaramento de Dados Sensíveis

- `user_id`: Pode ser NULL após deleção do usuário
- `user_email`: Preservado para auditoria permanente
- `ip_address`: Registrado para rastreabilidade
- Dados sensíveis (CPF, telefone) em `old_data`/`new_data` são restritos por RLS

---

## 6️⃣ Compliance LGPD

### ✅ Direito ao Esquecimento

```javascript
// Ao deletar usuário, anonymizar logs (opcional)
UPDATE appointment_audit_logs
SET user_email = 'deletado@lgpd.local'
WHERE user_id = 'user-uuid'
AND user_id IS NOT NULL;
```

### ✅ Direito de Acesso

```javascript
// Usuário pode solicitar seu histórico de alterações
const meus_logs = await supabase
  .from('appointment_audit_logs')
  .select('*')
  .eq('user_id', auth.uid())
  .order('created_at', { ascending: false });
```

### ✅ Retenção de Dados

Recomendação: Guardar logs por **2 anos** (limite legal de prescrição)

```javascript
-- Cleanup automático (opcional)
DELETE FROM appointment_audit_logs
WHERE created_at < NOW() - INTERVAL '2 years';
```

---

## 7️⃣ Relatórios Úteis

### Relatório 1: Atividade por Usuário

```sql
SELECT
  user_email,
  COUNT(*) as total_alteracoes,
  COUNT(CASE WHEN action = 'create' THEN 1 END) as criou,
  COUNT(CASE WHEN action = 'update' THEN 1 END) as atualizou,
  COUNT(CASE WHEN action = 'delete' THEN 1 END) as deletou
FROM appointment_audit_logs
WHERE clinic_id = 'clinic-123'
GROUP BY user_email
ORDER BY total_alteracoes DESC;
```

### Relatório 2: Mudanças de Status

```sql
SELECT
  appointment_id,
  user_email,
  status_changed_from,
  status_changed_to,
  created_at
FROM appointment_audit_logs
WHERE clinic_id = 'clinic-123'
AND action = 'update'
AND status_changed_from IS NOT NULL
ORDER BY created_at DESC;
```

### Relatório 3: Atividade por Dia

```sql
SELECT
  DATE(created_at) as data,
  COUNT(*) as alteracoes,
  COUNT(DISTINCT user_id) as usuarios_unicos
FROM appointment_audit_logs
WHERE clinic_id = 'clinic-123'
GROUP BY DATE(created_at)
ORDER BY data DESC;
```

---

## 8️⃣ Performance

### Indexação

```sql
-- Índices criados automaticamente na migração:
- idx_appointment_audit_logs_appointment_id (queries por agendamento)
- idx_appointment_audit_logs_clinic_id (queries por clínica)
- idx_appointment_audit_logs_user_id (queries por usuário)
- idx_appointment_audit_logs_created_at (queries temporais)
- idx_appointment_audit_logs_clinic_created (filtros combinados)
```

### Volume Estimado

```
- Agendamento criado: ~200 bytes log
- Agendamento atualizado: ~500 bytes log
- 1000 agendamentos/dia: ~300-500 KB/dia de logs
- 1 ano: ~110-180 MB total
- Retenção 2 anos: ~220-360 MB (negligenciável)
```

---

## 9️⃣ Troubleshooting

### Problema: Logs não aparecem

**Checklist:**

- [ ] Migração foi aplicada no Supabase?
- [ ] Trigger foi criado? `SELECT * FROM pg_trigger WHERE tgname LIKE 'audit%';`
- [ ] RLS está habilitada? `SELECT * FROM pg_policies WHERE tablename = 'appointment_audit_logs';`
- [ ] Usuário é admin/gestor? (RLS restringe acesso)

### Problema: Triggers atrasados

**Solução:** Triggers automáticos são síncronos, não devem ter atraso. Se houver:

- Verificar saúde do BD (Supabase Dashboard)
- Verificar se há locks em `appointments`
- Aumentar `work_mem` se BD tiver muita carga

### Problema: Dados sensíveis expostos

**Solução:** RLS previne acesso não autorizado. Se necessário mascarar:

```javascript
// Remover dados sensíveis de logs antigos
UPDATE appointment_audit_logs
SET old_data = old_data - 'patient_id'
WHERE created_at < NOW() - INTERVAL '30 days';
```

---

## 🔟 Checklist de Deploy

- [ ] Migração SQL aplicada
- [ ] Trigger criado e testado
- [ ] RLS habilitada
- [ ] Índices criados
- [ ] AuditTrailModal.jsx adicionado ao projeto
- [ ] useAuth() hook disponível
- [ ] Botão "Ver Histórico" adicionado aos componentes
- [ ] Testes com 2+ usuários simultâneos
- [ ] Documentação LGPD revisada

---

## ✅ Status

**Auditoria Completa Implementada:** 🚀 100%

- [x] Tabela `appointment_audit_logs` criada
- [x] Triggers automáticos (INSERT/UPDATE/DELETE)
- [x] RLS policies configuradas
- [x] Índices para performance
- [x] Frontend: AuditTrailModal.jsx
- [x] LGPD compliant
- [x] Documentação completa

**Comportamento:** Todos agendamentos rastreáveis, histórico completo preservado ✅
