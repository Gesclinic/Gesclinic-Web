# 🎯 WAVE 3 - AUDITORIA AVANÇADA (Planejamento)

**Status:** Planejamento  
**Estimado:** 2-3 horas de implementação  
**Complexidade:** Média-Alta  

---

## 📋 FEATURES PLANEJADAS

### 1️⃣ Exportar Relatórios por Período

**Objetivo:** Gerar relatórios resumidos por dia/semana/mês

**Specs:**
```javascript
// Interface de seleção
<select>
  <option value="daily">Resumo Diário</option>
  <option value="weekly">Resumo Semanal</option>
  <option value="monthly">Resumo Mensal</option>
</select>

// Estrutura de relatório
{
  period: "2026-05-26", // ou "2026-W21", "2026-05"
  totalActions: 29,
  byAction: {
    CREATED: 15,
    UPDATED: 3,
    DELETED: 1
  },
  byProfessional: [
    { name: "Profissional teste", actions: 15, byType: {...} }
  ],
  byPatient: [
    { name: "Marcia Gonzalez", actions: 8, byType: {...} }
  ],
  summary: "15 criações, 3 atualizações, 1 deleção"
}
```

**Componentes:**
- `PeriodSelectorModal.jsx` - Interface de seleção
- `ReportGenerator.js` - Lógica de geração
- `generatePeriodReport()` - Helper function

**Tempo:** 45 min

---

### 2️⃣ Alertas Automáticos

**Objetivo:** Notificar sobre padrões suspeitos

**Tipos de Alertas:**

**A. Múltiplos Deletions de Paciente**
```javascript
// Se X deletions de mesmo paciente em Y tempo
if (deleteCountByPatient[patientId] > 3 && timeWindow < '1 hora') {
  showAlert({
    type: 'warning',
    title: '⚠️ Múltiplos Deletions',
    message: `${deleteCountByPatient[patientId]} deletions de ${patientName} em 1 hora`,
    severity: 'high'
  });
}
```

**B. Deletions Fora do Horário**
```javascript
const hour = new Date().getHours();
if ((hour < 6 || hour > 18) && action === 'DELETED') {
  showAlert({
    type: 'warning',
    title: '🕐 Deletion Fora do Horário',
    message: `Deletion às ${hour}h por ${performedBy}`,
    severity: 'medium'
  });
}
```

**C. Deletions por Profissional Incomum**
```javascript
// Se profissional que nunca deletou antes deleta
if (!professionalDeleteHistory[performedBy] && action === 'DELETED') {
  showAlert({
    type: 'info',
    title: '👤 Novo Deletor',
    message: `${performedBy} deletou pela primeira vez`,
    severity: 'low'
  });
}
```

**Storage:**
```javascript
// localStorage key: 'audit_alert_history'
{
  alerts: [
    { id: 1, type: 'warning', message: '...', timestamp, read: false },
    { id: 2, type: 'info', message: '...', timestamp, read: true }
  ],
  alertRules: {
    multipleDeletesThreshold: 3,
    timeWindow: '1h',
    outOfBusinessHours: true,
    newDeletorAlert: true
  }
}
```

**Componentes:**
- `AlertsCenter.jsx` - Central de alertas
- `AlertRule.js` - Lógica de regras
- `AlertNotification.jsx` - Exibição

**Tempo:** 60 min

---

### 3️⃣ Auditoria de Usuários

**Objetivo:** Rastrear login/logout e tentativas de acesso

**Dados a Rastrear:**
```javascript
// appointment_user_audit_logs (nova tabela)
{
  id: UUID,
  clinic_id: UUID,
  user_id: UUID,
  email: string,
  event_type: 'LOGIN' | 'LOGOUT' | 'FAILED_LOGIN' | 'SESSION_TIMEOUT',
  ip_address: string,
  user_agent: string,
  timestamp: timestamp,
  duration_seconds?: int,
  failed_reason?: string // password_wrong, account_locked, etc.
}
```

**Implementação:**

1. **Login Hook** (em `useAuth()`)
```javascript
// src/lib/authLogger.js
export async function logLoginEvent(userId, email, event) {
  await supabase
    .from('appointment_user_audit_logs')
    .insert({
      clinic_id: clinicId,
      user_id: userId,
      email: email,
      event_type: event.type, // LOGIN, FAILED_LOGIN, etc
      ip_address: await getClientIP(),
      user_agent: navigator.userAgent,
      timestamp: new Date().toISOString()
    });
}
```

2. **Login/Logout Tracking**
```javascript
// In useAuth() context
useEffect(() => {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') {
      logLoginEvent(session.user.id, session.user.email, { type: 'LOGIN' });
    }
    if (event === 'SIGNED_OUT') {
      logLoginEvent(currentUser.id, currentUser.email, { 
        type: 'LOGOUT',
        duration: sessionDuration
      });
    }
  });
}, []);
```

3. **Página de Visualização**
```javascript
// src/pages/clinica/auditoria/UserAuditPage.jsx
export default function UserAuditPage() {
  const [userLogs, setUserLogs] = useState([]);
  const [filters, setFilters] = useState({
    eventType: 'todos',
    dateRange: '7d',
    userId: null
  });
  
  // Filtros, tabela, gráficos...
}
```

**Componentes:**
- `UserAuditPage.jsx` - Página principal
- `UserAuditTable.jsx` - Tabela de logs
- `SessionAnalysis.jsx` - Análise de sessões
- `authLogger.js` - Helper functions

**Banco de Dados:**
```sql
CREATE TABLE appointment_user_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  user_id UUID NOT NULL,
  email VARCHAR(255),
  event_type VARCHAR(20) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  duration_seconds INT,
  failed_reason VARCHAR(100)
);

CREATE INDEX ON appointment_user_audit_logs(clinic_id, created_at DESC);
CREATE INDEX ON appointment_user_audit_logs(user_id, created_at DESC);
```

**Tempo:** 90 min

---

### 4️⃣ Comparação Avançada (Before/After)

**Objetivo:** Visualizar mudanças de forma interativa

**Features:**

**A. Snapshots Visuais**
```javascript
// Componente AuditSnapshotViewer
<div className="grid grid-cols-2 gap-4">
  <div>
    <h3>Antes</h3>
    <pre className="bg-red-50">{JSON.stringify(before, null, 2)}</pre>
  </div>
  <div>
    <h3>Depois</h3>
    <pre className="bg-green-50">{JSON.stringify(after, null, 2)}</pre>
  </div>
</div>
```

**B. Diff Visual (Highlighting)**
```javascript
// Mostrar apenas campos que mudaram com highlight
{
  status: { before: 'scheduled', after: 'completed', changed: true },
  professional: { before: 'Dr. A', after: 'Dr. B', changed: true },
  duration: { before: 30, after: 45, changed: true },
  notes: { before: 'value1', after: 'value2', changed: true }
}
```

**C. Timeline Interativa**
```javascript
// AuditTimeline.jsx
<div className="space-y-2">
  {auditLogs.map((log, idx) => (
    <div key={log.id} className="flex gap-3">
      <div className="w-1 bg-blue-500"></div>
      <div>
        <p className="font-semibold">{log.action_type}</p>
        <p className="text-sm text-gray-600">{format(log.created_at)}</p>
        <button onClick={() => openSnapshot(log)}>Ver mudanças</button>
      </div>
    </div>
  ))}
</div>
```

**D. Export de Comparação**
```javascript
// Exportar antes/depois em PDF side-by-side
export function exportComparisonPDF(logId) {
  const log = logs.find(l => l.id === logId);
  // Gerar PDF com 2 colunas: antes | depois
}
```

**Componentes:**
- `AuditSnapshotViewer.jsx` - Visualizador de snapshots
- `AuditDiffHighlighter.jsx` - Highlight de mudanças
- `AuditTimeline.jsx` - Timeline interativa
- `comparisonExport.js` - Export logic

**Tempo:** 75 min

---

## 🗓️ CRONOGRAMA

```
Fase 1 (45 min):   Relatórios por Período
  └─ Componentes + Lógica + Testes

Fase 2 (60 min):   Alertas Automáticos
  └─ Regras + UI + localStorage

Fase 3 (90 min):   User Audit (Opcional - pode ser Wave 4)
  └─ DB + Backend + UI

Fase 4 (75 min):   Comparação Avançada
  └─ Visualização + Timeline + Export

Total: ~270 minutos (4.5 horas)
```

---

## ⚙️ CONFIGURAÇÃO INICIAL

**O QUE COMEÇAR:**

### Opção A: Rápido (30 min)
```
1. Relatórios por Período (mais simples)
2. Alertas Automáticos (médio)
3. Deixar User Audit para Wave 4
```

### Opção B: Completo (3-4 horas)
```
1. Relatórios por Período
2. Alertas Automáticos
3. Auditoria de Usuários (requer DB migration)
4. Comparação Avançada
```

### Opção C: Médio (2-3 horas)
```
1. Relatórios por Período
2. Alertas Automáticos
3. Comparação Avançada (sem User Audit)
```

---

## 📊 IMPACTO

| Feature | Valor Agregado | Complexidade | Prioridade |
|---------|---|---|---|
| Relatórios | Alto | Baixa | ⭐⭐⭐⭐ |
| Alertas | Alto | Média | ⭐⭐⭐⭐ |
| User Audit | Médio | Alta | ⭐⭐⭐ |
| Comparação | Alto | Média | ⭐⭐⭐⭐ |

---

## ✅ PRÓXIMOS PASSOS

1. **Escolher approach** (Opção A, B ou C)
2. **Criar branch** para Wave 3
3. **Implementar feature por feature**
4. **Testar cada feature**
5. **Criar PR consolidado**
6. **Documentar e commitar**

---

**Pronto para começar? Qual feature quer primeiro?**

- A: Relatórios por Período (mais rápido)
- B: Alertas Automáticos (mais útil)
- C: Ambos (máximo impacto)
- D: Deixar para depois
