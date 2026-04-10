# 🔮 PRÓXIMOS PASSOS - EVOLUÇÕES DO MÓDULO INDICADORES

## 📌 VISÃO GERAL

Este documento delineia **possíveis melhorias futuras** para o módulo de indicadores, organizadas por prioridade e complexidade.

---

## 🥇 PRIORIDADE ALTA (Recomendado)

### 1. Real-time Updates com Supabase Realtime
**Impacto**: Alta (UX em tempo real)
**Complexidade**: Média
**Tempo Estimado**: 2-3 horas

```javascript
// Em AgendaPage.jsx ou AgendaIndicators.jsx
import { supabaseClient } from '@/lib/customSupabaseClient';

useEffect(() => {
  const subscription = supabaseClient
    .from('appointments')
    .on('*', () => {
      // Refetch indicadores ao detectar mudança
      handleRefresh();
    })
    .subscribe();
  
  return () => {
    supabaseClient.removeSubscription(subscription);
  };
}, [clinicId, date]);
```

**Benefício**: Indicadores atualizam automaticamente quando:
- Novo agendamento é criado
- Status é alterado (confirmado/falta/encaixe)
- Check-in é realizado

---

### 2. Gráficos de Trend (Últimos 7/30 dias)
**Impacto**: Média (análise histórica)
**Complexidade**: Média
**Tempo Estimado**: 3-4 horas
**Dependências**: recharts ou chart.js

```javascript
// Adicionar em indicatorsApi.js
export async function getTrendData(clinicId, daysBack = 7) {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - daysBack * 24 * 60 * 60 * 1000);
  
  return getAgendaIndicatorsByDateRange(
    clinicId, 
    startDate.toISOString().split('T')[0],
    endDate.toISOString().split('T')[0]
  );
}
```

**UI**: Adicionar abas "Hoje" / "7 dias" / "30 dias" com gráficos de linha

---

### 3. Persistência de Alertas Lidos
**Impacto**: Média (UX - não mostrar alertas repetidos)
**Complexidade**: Baixa
**Tempo Estimado**: 1-2 horas

```javascript
// Em AgendaIndicators.jsx
const [dismissedAlerts, setDismissedAlerts] = useState(() => {
  const saved = localStorage.getItem('dismissed_alerts');
  return saved ? JSON.parse(saved) : [];
});

const filteredAlerts = alerts.filter(
  a => !dismissedAlerts.includes(a.type + a.metric)
);

const handleDismissAlert = (alert) => {
  const key = alert.type + alert.metric;
  setDismissedAlerts(prev => [...prev, key]);
  localStorage.setItem('dismissed_alerts', JSON.stringify([...dismissedAlerts, key]));
};
```

**Benefício**: Alertas não estouram repetidamente

---

### 4. Dashboard Customizável
**Impacto**: Média (flexibilidade por usuário)
**Complexidade**: Média
**Tempo Estimado**: 3-4 horas

```javascript
// Permitir usuário escolher quais cards mostrar
const [visibleMetrics, setVisibleMetrics] = useState(() => {
  const saved = localStorage.getItem('visible_metrics');
  return saved ? JSON.parse(saved) : [
    'taxa_ocupacao',
    'total_agendamentos',
    'confirmados',
    'faltas'
  ];
});

<div className="space-y-2 mb-4">
  {allMetrics.map(metric => (
    <label key={metric}>
      <input 
        type="checkbox" 
        checked={visibleMetrics.includes(metric)}
        onChange={() => toggleMetric(metric)}
      />
      {metric}
    </label>
  ))}
</div>

{visibleMetrics.includes('taxa_ocupacao') && <OcupacaoCard />}
{visibleMetrics.includes('total_agendamentos') && <AgendamentosCard />}
```

---

## 🥈 PRIORIDADE MÉDIA (Útil)

### 5. Exportação de Relatórios (PDF/Excel)
**Impacto**: Média (relatórios gerenciais)
**Complexidade**: Média
**Tempo Estimado**: 2-3 horas
**Dependências**: jsPDF, xlsx

```javascript
// Usar função existente + melhorar
import jsPDF from 'jspdf';
import { exportIndicatorsToCSV } from '@/lib/indicatorsApi';

export function exportToPDF(indicators, format = 'letter') {
  const doc = new jsPDF({ format });
  
  doc.setFontSize(16);
  doc.text('Indicadores da Agenda', 20, 20);
  
  doc.setFontSize(10);
  const y = 40;
  doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 20, y);
  doc.text(`Taxa Ocupação: ${indicators.taxa_ocupacao_percent}%`, 20, y + 10);
  doc.text(`Agendamentos: ${indicators.total_agendamentos}`, 20, y + 20);
  // ... mais dados
  
  doc.save(`indicadores_${Date.now()}.pdf`);
}

<button onClick={() => exportToPDF(indicators)}>
  📥 Exportar PDF
</button>
```

---

### 6. Notificações por Email (Alertas Críticos)
**Impacto**: Média (notificação proativa)
**Complexidade**: Alta
**Tempo Estimado**: 4-5 horas
**Dependências**: Supabase Cron + Email Service

```sql
-- Criar função PostgreSQL
CREATE OR REPLACE FUNCTION notify_critical_alerts()
RETURNS void AS $$
DECLARE
  v_clinic record;
  v_indicators record;
BEGIN
  FOR v_clinic IN SELECT id, admin_email FROM clinics LOOP
    SELECT * INTO v_indicators 
    FROM get_agenda_indicators(v_clinic.id, CURRENT_DATE);
    
    IF v_indicators.taxa_ocupacao_percent < 40 THEN
      -- Chamar function de email
      PERFORM send_alert_email(v_clinic.admin_email, 'Ocupação baixa!');
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Agendar para rodar diariamente às 7h
SELECT cron.schedule('notify_critical_alerts', '0 7 * * *', 'SELECT notify_critical_alerts()');
```

---

### 7. Comparação com Histórico
**Impacto**: Média (análise de tendência)
**Complexidade**: Média
**Tempo Estimado**: 2-3 horas

```javascript
// Mostrar ↑↓ ao lado de cada métrica
<div className="flex items-center gap-2">
  <span className="text-2xl">35%</span>
  {trend > 0 ? (
    <TrendingUp className="text-green-600" /> // Melhorou
  ) : (
    <TrendingDown className="text-red-600" /> // Piorou
  )}
  <span className="text-xs text-gray-500">{Math.abs(trend)}%</span>
</div>
```

---

## 🥉 PRIORIDADE BAIXA (Nice-to-have)

### 8. Predicção com Machine Learning
**Impacto**: Baixo (análise preditiva)
**Complexidade**: Muito Alta
**Tempo Estimado**: 8-10 horas
**Dependências**: Python ML library + API externa

```javascript
// Chamaria API externa para previsões
async function predictNextDayOccupancy(clinicId, daysHistory = 30) {
  const history = await getAgendaIndicatorsByDateRange(clinicId, -daysHistory);
  
  const response = await fetch('/api/predict', {
    method: 'POST',
    body: JSON.stringify({ occupancyHistory: history.map(h => h.taxa_ocupacao_percent) })
  });
  
  return response.json(); // { prediction: 65, confidence: 0.87 }
}

// Mostrar no card
<Card title="Previsão para Amanhã">
  <div className="text-2xl">65%</div>
  <div className="text-xs text-gray-500">Confiança: 87%</div>
</Card>
```

---

### 9. Dashboard Mobile App
**Impacto**: Baixo (acesso mobile)
**Complexidade**: Muito Alta
**Tempo Estimado**: 20+ horas
**Dependências**: React Native / Flutter

- Mesmo componente em mobile
- Notificações push para alertas críticos
- Offline-first com cache local

---

### 10. Integração com Calendário (Google/Outlook)
**Impacto**: Baixo (integração externa)
**Complexidade**: Alta
**Tempo Estimado**: 5-6 horas

```javascript
// Sincronizar agendamentos automaticamente
import { google } from 'googleapis';

async function syncToGoogleCalendar(appointment) {
  const auth = new google.auth.OAuth2(...);
  const calendar = google.calendar({ version: 'v3', auth });
  
  await calendar.events.insert({
    calendarId: 'primary',
    resource: {
      summary: appointment.service_name,
      description: appointment.patient_name,
      start: { dateTime: appointment.start_time },
      end: { dateTime: appointment.end_time }
    }
  });
}
```

---

## 🛠️ ROADMAP SUGERIDO

### Fase 1 (Semana 1-2) - **Essencial**
- [x] ✅ Implementar base (já feito!)
- [ ] Real-time Updates
- [ ] Persistência de Alertas

### Fase 2 (Semana 3-4) - **Recomendado**
- [ ] Gráficos de Trend
- [ ] Dashboard Customizável
- [ ] Exportação PDF

### Fase 3 (Semana 5-6) - **Complementar**
- [ ] Notificações por Email
- [ ] Comparação com Histórico
- [ ] Documentação Avançada

### Fase 4 (Indefinido) - **Futuro**
- [ ] ML Predictions
- [ ] Mobile App
- [ ] Integração Calendários

---

## 💡 IDEIAS ADICIONAIS

### Permissões Granulares
```javascript
// Permitir que gestor escolha quem vê o quê
const permissions = {
  'recepção': ['ocupacao', 'agendamentos', 'confirmados'],
  'profissional': ['meus_agendamentos', 'tempo_atendimento'],
  'gestor': ['*'], // Vê tudo
};
```

### Webhooks Customizáveis
```javascript
// Gestor define regras para alertas
const rules = [
  { when: 'occupancy < 30%', then: 'email_to:gestor@email.com' },
  { when: 'no_shows > 10', then: 'slack_notification' },
  { when: 'revenue < 50% target', then: 'push_notification' },
];
```

### Multi-Clínica Dashboard
```javascript
// Gestor de rede vê todas as clínicas
const indicators = await getAgendaIndicatorsMultiClinic([clinicId1, clinicId2]);
// Comparativo entre clínicas
```

### Alertas Configuráveis
```javascript
// Gestor ajusta thresholds
const thresholds = {
  occupancy_low: 40,     // Default: 40%
  no_shows_high: 15,     // Default: 15%
  revenue_low_percent: 70 // Default: 70%
};
```

---

## 🚀 COMO IMPLEMENTAR

### Template para Cada Feature

```javascript
/**
 * Feature: [Nome]
 * 
 * 1. Criar função em indicatorsApi.js
 * 2. Testar com console.log
 * 3. Criar componente React
 * 4. Integrar em AgendaPage.jsx
 * 5. Validar permissões
 * 6. Documentar em README
 */

// 1. Backend
export async function newFeature() {
  try {
    // Implementação
  } catch (error) {
    console.error('❌ Erro:', error);
    return null;
  }
}

// 2. Frontend
const MyComponent = () => {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    newFeature().then(setData);
  }, []);
  
  return <div>{/* Render */}</div>;
};
```

---

## 📚 REFERÊNCIAS E RECURSOS

### Real-time
- Supabase Realtime Docs
- Socket.io Alternative

### Gráficos
- Recharts Documentation
- Chart.js Tutorials

### Exportação
- jsPDF Guide
- xlsx Package

### ML
- TensorFlow.js
- OpenAI API

### Mobile
- React Native Docs
- Expo Platform

---

## 🎯 CONCLUSÃO

O módulo de indicadores está **pronto e funcional**. As melhorias listadas são **opcionais** e podem ser implementadas conforme necessidade.

### Recomendação Imediata
1. **Real-time Updates** (impacto alto, complexidade média)
2. **Gráficos de Trend** (análise histórica)
3. **Persistência de Alertas** (UX melhorada)

### Segundo Escopo
4. Exportação PDF
5. Email Notifications
6. Customização por Usuário

---

**Status**: 🟢 Base implementada, pronto para evoluções
**Próxima Revisão**: Após 2 semanas de uso em produção

---

Desenvolvido para **Gesclinic Web** v2.0+
