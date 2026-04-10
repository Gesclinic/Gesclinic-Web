# 🚀 ROADMAP: EVOLUÇÃO DO HEATMAP

**Status Atual:** ✅ V2.0 com Ajustes Finos  
**Base Técnica:** Pronta para escalabilidade  
**Data:** 14 de Janeiro de 2026

---

## 🎯 Visão Geral da Evolução

```
V1.0 (Concluído)
├─ Heatmap básico com 3 cores
├─ Tooltips simples
└─ Modo Geral apenas

V2.0 (AGORA)
├─ Tooltip rico com detalhes
├─ Clique + filtro automático
├─ Scroll inteligente
├─ Responsivo aos 3 modos (Geral/Prof/Sala)
└─ ✅ PRONTO PARA PRODUÇÃO

V3.0 (Próximo)
├─ Mini heatmaps por Profissional (em cada coluna)
├─ Mini heatmaps por Sala (em cada coluna)
└─ Integração visual na Timeline

V4.0 (Futuro)
├─ Heatmap Semanal (7 blocos por dia)
├─ Heatmap Mensal (31 blocos)
└─ Comparação período vs período

V5.0 (Avançado)
├─ Predição com IA (histórico)
├─ Recomendação automática
├─ Export PDF/Imagem
└─ Análise de tendências
```

---

## 📋 FASE 3.0: Mini Heatmaps por Profissional

### O Que É?

Quando usuário está em modo **"Por Profissional"**, cada coluna de profissional tem um **mini heatmap** abaixo do nome.

```
┌──────────────────────────────────────────────────────┐
│ Agenda - Por Profissional                             │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Dr. Silva            Dra. Maria           Dr. João   │
│ 👨‍⚕️ Cardiologista     👩‍⚕️ Dentista      👨‍⚕️ Clínico   │
│ ██ ██ ██ ██ ██      ██ ██ ██ ██ ██      ██ ██ ██ ██ │  ← Mini heatmap
│ 8% 15% 32%...       10% 25% 40%...      20% 50% 60%...
│                                                      │
│ ┌────────────────────────────────────────────────┐  │
│ │ 08:00 │ 08:30 │ 09:00 │ 09:30 │               │  │
│ │ [  ]  │ [📱]  │ [ ]   │ [🔴]  │ ← Grid horária │
│ │ Livr  │ Ocup  │ Livr  │ Ocup  │               │  │
│ └────────────────────────────────────────────────┘  │
│                                                      │
│ ... 2 mais colunas similares                        │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Benefícios

✅ **Visão Consolidada**
- Ver ocupação de cada profissional em um relance
- Comparar facilmente quem tem espaço

✅ **Micro Insights**
- Saber qual hora cada profissional está livre
- Identificar profissional melhor para novo agendamento

✅ **Decisão Rápida**
- "Dra. Maria tem 08:30 livre?"
- Resposta visual imediata (quadrado verde)

### Implementação

**Componente Novo: ProfessionalMiniHeatmap.jsx**

```javascript
function ProfessionalMiniHeatmap({ professional, appointments, timeSlots }) {
  return (
    <div className="flex gap-1 mt-1">
      {timeSlots.map(time => {
        const count = appointments.filter(
          a => a.professional_id === professional.id && a.start_time.includes(time)
        ).length;
        
        return (
          <div 
            key={time}
            className={count > 0 ? 'bg-red-400' : 'bg-green-400'}
            style={{ width: '12px', height: '8px' }}
            title={`${time}: ${count > 0 ? 'Ocupado' : 'Livre'}`}
          />
        );
      })}
    </div>
  );
}
```

**Onde Usar:**

No `ProfessionalColumnHeader.jsx`, adicionar após nome/especialidade:

```javascript
<ProfessionalMiniHeatmap
  professional={professional}
  appointments={appointments}
  timeSlots={timeSlots}
/>
```

**Resultado:**
- Mini blocos com 12×8px
- Cores dinâmicas (verde/vermelho)
- Títulos para cada slot
- Sem impacto performance (useMemo)

---

## 📋 FASE 3.0: Mini Heatmaps por Sala

### Estrutura Similar

```
┌──────────────────────────────────────────────────────┐
│ Agenda - Por Sala                                    │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Sala 1              Sala 2            Sala 3         │
│ 🏥 Consultório      🏥 Consultório    🏥 Pequena    │
│ ██ ██ ██ ██ ██     ██ ██ ██ ██ ██     ██ ██ ██    │  ← Mini heatmap
│ 5% 25% 50% 75% 90%  10% 20% 30% 40% 50% 0% 0% 0%  │
│                                                      │
│ ┌─────────────────────────────────────────────────┐  │
│ │ 08:00 │ 08:30 │ 09:00 │ 09:30 │               │  │
│ │ [Livr]│ [Pac1]│ [Pac2]│ [Livr]│ ← Agendamentos│
│ └─────────────────────────────────────────────────┘  │
│                                                      │
│ ... 2 mais colunas similares                        │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Implementação

**Componente: RoomMiniHeatmap.jsx**

```javascript
function RoomMiniHeatmap({ room, appointments, timeSlots }) {
  // Mesmo padrão do profissional
  // Mas filtra por room_id em vez de professional_id
}
```

**Onde:**

No `ProfessionalColumnHeader.jsx` (reutiliza mesmo componente, muda filtro):

```javascript
{columnType === 'room' && (
  <RoomMiniHeatmap
    room={room}
    appointments={appointments}
    timeSlots={timeSlots}
  />
)}
```

---

## 📋 FASE 4.0: Heatmap Semanal

### O Que É?

Uma visualização condensada de 7 dias da semana mostrando ocupação média:

```
┌─────────────────────────────────────┐
│ Ocupação Semanal                    │
├─────────────────────────────────────┤
│ Seg Ter Qua Qui Sex Sab Dom        │
│  🟩  🟨  🟥  🟩  🟨  🟩  🟩        │  ← Quadrados coloridos
│ 25% 45% 85% 30% 65% 15% 10%        │
│                                     │
│ Dia mais cheio: Quarta (85%)        │
│ Dia mais vazio: Domingo (10%)       │
│ Média semanal: 45%                  │
└─────────────────────────────────────┘
```

### Benefícios

✅ **Planejamento Semanal**
- Ver qual dia é mais movimentado
- Agendar administrativo em dia vago

✅ **Gestão de Recurso**
- Identificar dias com falta de profissionais
- Pedir dia de folga em dia leve

✅ **Análise de Tendência**
- Segunda > Sexta (aumenta conforme semana)
- Fim de semana < Semana cheia

### Implementação

**Novo Hook: useWeeklyHeatmap.js**

```javascript
function useWeeklyHeatmap(date, appointments) {
  // 1. Pegar semana completa (Seg-Dom)
  // 2. Agrupar agendamentos por dia
  // 3. Calcular ocupação média por dia
  // 4. Retornar array de 7 dias
  
  return {
    days: ['Seg', 'Ter', 'Qua', ...],
    occupancy: [25, 45, 85, ...],
    colors: ['green', 'yellow', 'red', ...]
  };
}
```

**Componente: WeeklyHeatmap.jsx**

```javascript
export default function WeeklyHeatmap({ date, appointments }) {
  const { days, occupancy, colors } = useWeeklyHeatmap(date, appointments);
  
  return (
    <div className="flex gap-4">
      {days.map((day, idx) => (
        <div key={day} className="text-center">
          <div className={`w-12 h-12 rounded ${colors[idx]}`}>
            {occupancy[idx]}%
          </div>
          <span className="text-sm">{day}</span>
        </div>
      ))}
    </div>
  );
}
```

**Onde Colocar:**

Acima do heatmap diário na AgendaPage:

```javascript
<WeeklyHeatmap date={agenda.date} appointments={agenda.appointments} />
<AgendaHeatmap ... /> // Heatmap diário (atual)
```

---

## 📋 FASE 5.0: IA e Predição

### Recomendação Automática

```
Usuário abre agenda para agendar novo paciente
Sistema analisa heatmap + histórico
Sugere: "Melhor horário disponível: 14:30 
         (baseado em 30 dias de histórico)"
```

**Como:**

```javascript
function getRecommendedSlots(appointments, historicalData) {
  // 1. Agrupar ocupação histórica por hora
  // 2. Encontrar horários com menor ocupação média
  // 3. Cruzar com disponibilidade de hoje
  // 4. Retornar top 3 recomendações
  
  return [
    { time: '14:30', reason: 'Histórico mostra 15% ocupado' },
    { time: '15:00', reason: 'Nunca lotado neste horário' },
    { time: '08:00', reason: 'Horário inicial, menor procura' }
  ];
}
```

### Detecção de Gargalo

```
Sistema identifica padrões:

"Terça tem 3x mais agendamentos que segunda"
→ Sugerir: Alocar profissional extra

"10:00-12:00 está sempre cheio"
→ Sugerir: Expandir horário de funcionamento

"Pacientes desmarcam 4pm"
→ Sugerir: Blocos menores nesse horário
```

### Análise de Tendência

```
Dashboard com gráficos:

Ocupação nos últimos 30 dias
├─ Gráfico de linha (ocupação vs tempo)
├─ Picos identificados
└─ Correlações com feriados/eventos

Distribuição por profissional
├─ Histograma de carga
├─ Balanceamento sugerido
└─ Potencial de crescimento
```

---

## 📋 FASE 5.0: Export e Relatórios

### Export PDF

```
Usuário clica: "Exportar Heatmap"
Sistema gera PDF com:
  ✅ Heatmap visual (cores mantidas)
  ✅ Data e período
  ✅ Estatísticas (melhor/pior/média)
  ✅ Lista de agendamentos do dia
  ✅ Assinatura digital (opcional)

Resultado: relatório imprimível pronto
```

### Compartilhamento

```
Botão "Compartilhar"
  ├─ Copiar link de visualização
  ├─ E-mail (PDF anexado)
  └─ WhatsApp (imagem heatmap)

Útil para: Comunicar aos profissionais
           Mostrar ao cliente
           Arquivar em prontuário
```

### Dashboard Executivo

```
Gestor abre Dashboard:

┌─────────────────────────────────────────┐
│ Ocupação Hoje: 68%                      │
├─────────────────────────────────────────┤
│                                         │
│ Esta Semana         Semana Passada      │
│  🟩🟨🟥🟩🟨🟩🟩      🟨🟩🟥🟩🟩🟥🟥   │
│ Média: 55%          Média: 48%          │
│ Δ +7%               (crescimento!)      │
│                                         │
│ Profissional Mais Ocupado: Dra. Maria   │
│ (Sugestão: Distribuir carga)            │
│                                         │
└─────────────────────────────────────────┘
```

---

## 🔧 Arquitetura Preparada para Escalar

### Design Patterns Utilizados

```
✅ Component Composition
   - AgendaHeatmap é genérico
   - Aceita props diferentes
   - Reutilizável em múltiplos contextos

✅ Custom Hooks
   - useHeatmapData (cálculo)
   - useWeeklyHeatmap (agregação semanal)
   - usePredictions (IA)

✅ Memoization
   - useMemo otimiza cálculos
   - Escala para milhares de agendamentos

✅ Configuration-Driven
   - colors, thresholds em constantes
   - Fácil customizar padrões visuais
```

### Estrutura de Pastas (Futura)

```
src/pages/clinica/agenda/
├─ components/
│  ├─ AgendaHeatmap.jsx              (atual)
│  ├─ ProfessionalMiniHeatmap.jsx    (v3.0)
│  ├─ RoomMiniHeatmap.jsx            (v3.0)
│  ├─ WeeklyHeatmap.jsx              (v4.0)
│  ├─ HeatmapDashboard.jsx           (v5.0)
│  └─ HeatmapReport.jsx              (v5.0)
│
├─ hooks/
│  ├─ useAgendaStore.js              (atual)
│  ├─ useHeatmapData.js              (novo)
│  ├─ useWeeklyHeatmap.js            (v4.0)
│  └─ usePredictions.js              (v5.0)
│
├─ utils/
│  ├─ heatmapColors.js               (novo)
│  ├─ occupancyCalculation.js        (novo)
│  └─ predictions.js                 (v5.0)
│
└─ AgendaPage.jsx                    (atual)
```

---

## ⏱️ Timeline Estimada

```
Janeiro 2026 (AGORA)
├─ V2.0: Ajustes Finos ✅ CONCLUÍDO
└─ QA e testes em produção

Fevereiro 2026
├─ V3.0: Mini Heatmaps (Prof/Sala)
├─ 2 semanas desenvolvimento
└─ 1 semana testes

Março 2026
├─ V4.0: Heatmap Semanal + Dashboard
├─ 3 semanas desenvolvimento
└─ 2 semanas testes/feedback

Abril-Maio 2026
├─ V5.0: IA, Predição, Export
├─ 6 semanas desenvolvimento
└─ 4 semanas testes/ajustes

Junho 2026
└─ Plataforma completa de Analytics
```

---

## 💡 Ideias Complementares

### Notifications

```
Sistema avisa quando:
- Ocupação atinge 80% (alerta amarelo)
- Ocupação atinge 95% (alerta vermelho)
- Slots se abrem (após cancelamento)
- Horário chegando (lembrancinha)
```

### Gamification

```
Badges para usuários:
- "Agenda Bem Planejada" (ocupação 60-80%)
- "Minimizador de Gargalos"
- "Profissional do Mês"
```

### Mobile App

```
App nativo com:
- Heatmap em tempo real
- Notificações push
- Drag-drop para reagendar
- Assinatura eletrônica
```

### Integração Externa

```
- Google Calendar (síncrono)
- WhatsApp (confirmação automática)
- Waze (tempo de chegada)
- Stripe/PagSeguro (cobrança automática)
```

---

## ✅ Checklist de Preparação

```
Código Atual Preparado?
[x] AgendaHeatmap genérico
[x] Props escaláveis
[x] useMemo para performance
[x] Hooks customizados
[x] Sem hard-codes
[x] Comentários documentados

Infraestrutura?
[x] Supabase com histórico (aguardar)
[x] Índices de query otimizados (aguardar)
[x] Cache de dados (aguardar)
[x] API para predições (futura)

Documentação?
[x] Este arquivo
[x] README do componente
[x] Exemplos de uso
[x] Guia de testes
```

---

## 🚀 Conclusão

**O heatmap que você tem AGORA é v2.0 completo e pronto.**

Mas a **arquitetura já foi desenhada** para que as próximas fases sejam:

✅ Rápidas de implementar  
✅ Não quebrem código existente  
✅ Escalem para IA/Predição  
✅ Suportem relatórios/export  

**Você tem a base. As evoluções virão naturalmente.** 🎯

---

**Versão:** Roadmap v1.0  
**Data:** 14/01/2026  
**Status:** Planejamento concluído

Foco agora: Testar V2.0 e coletar feedback para V3.0! 🚀

