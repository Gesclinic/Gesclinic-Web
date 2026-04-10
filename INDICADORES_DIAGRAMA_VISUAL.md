# 🎨 DIAGRAMA VISUAL - MÓDULO INDICADORES DA AGENDA

## 📊 Arquitetura Completa

```
┌─────────────────────────────────────────────────────────────────────┐
│                    GESCLINIC WEB - AGENDA                          │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │              INDICADORES DA AGENDA (KPI Dashboard)           │ │
│  │                                                               │ │
│  │  ┌─────────────────────────────────────────────────────────┐ │ │
│  │  │ 📊 Status Geral: ✅ Saudável                            │ │ │
│  │  │ Ocupação: 65% | Agendamentos: 10 | Confirmados: 8      │ │ │
│  │  └─────────────────────────────────────────────────────────┘ │ │
│  │                                                               │ │
│  │  ┌──────────────────────────────────────────────────────────┐ │ │
│  │  │ 🚨 ALERTAS INTELIGENTES                                │ │ │
│  │  │ ├─ Taxa de ocupação abaixo de 40% [Expandir]          │ │ │
│  │  │ ├─ Mais de 15% de faltas [Expandir]                   │ │ │
│  │  │ └─ Meta não atingida (70%) [Expandir]                 │ │ │
│  │  └──────────────────────────────────────────────────────────┘ │ │
│  │                                                               │ │
│  │  ┌──────────────────────────────────────────────────────────┐ │ │
│  │  │ GRID DE INDICADORES (Responsivo)                        │ │ │
│  │  │                                                          │ │ │
│  │  │ [Taxa Ocup.]  [Total Agend.]  [Confirmados]  [Faltas] │ │ │
│  │  │     65%            10             8           1        │ │ │
│  │  │     🟢             🟡             🟢          🔴       │ │ │
│  │  │                                                          │ │ │
│  │  │ [Encaixes]  [Profissionais]  [Slots Livres]  [Tempo]   │ │ │
│  │  │     2            2               5           12 min    │ │ │
│  │  │     🟢            🟢              ⚫          🟡        │ │ │
│  │  └──────────────────────────────────────────────────────────┘ │ │
│  │                                                               │ │
│  │  ┌──────────────────────────────────────────────────────────┐ │ │
│  │  │ 💰 INDICADORES FINANCEIROS (Gestor/Admin)              │ │ │
│  │  │                                                          │ │ │
│  │  │ [Receita Dia]  [Receita/h]  [Meta]  [% Meta Atingida] │ │ │
│  │  │   R$ 500       R$ 62.50    R$ 5000      10%          │ │ │
│  │  │     🔴            🟡         🟢         🔴           │ │ │
│  │  └──────────────────────────────────────────────────────────┘ │ │
│  │                                                               │ │
│  │  ┌──────────────────────────────────────────────────────────┐ │ │
│  │  │ 📅 RESUMO DE SLOTS                                     │ │ │
│  │  │ Ocupação: 5/20 slots                                   │ │ │
│  │  │ ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 25%         │ │ │
│  │  └──────────────────────────────────────────────────────────┘ │ │
│  │                                                               │ │
│  │ [⏰ Atualizado: 10:30:45]  [🔄 Refresh]  [⚙️ Configurar]    │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Stack Técnico

```
┌────────────────────────────────────────────────────────┐
│         FRONTEND - React 18 + TailwindCSS              │
├────────────────────────────────────────────────────────┤
│                                                        │
│  AgendaPage.jsx                                        │
│  └─> <AgendaIndicators                               │
│       ├─ clinicId: "uuid-clinic"                     │
│       ├─ date: "2026-01-14"                          │
│       ├─ currentRole: "gestor"                       │
│       └─ onAlertsChange: (alerts) => {}              │
│       │                                               │
│       └─> AgendaIndicators Component                  │
│           ├─ Status Card                             │
│           ├─ Alerts Display                          │
│           ├─ Metrics Grid (2/3/4 cols)               │
│           ├─ Financial Section (Conditional)          │
│           ├─ Slots Progress Bar                      │
│           └─ Refresh Button                          │
│                                                        │
└────────────────────────────────────────────────────────┘
                         ↓ (RPC Call)
┌────────────────────────────────────────────────────────┐
│      BACKEND API - indicatorsApi.js (Node.js)          │
├────────────────────────────────────────────────────────┤
│                                                        │
│  getAgendaIndicators()                                 │
│  ├─ Chamar RPC: get_agenda_indicators()               │
│  └─ Retornar: { taxa_ocupacao, agendamentos, ... }   │
│                                                        │
│  generateAlerts()                                      │
│  ├─ Verificar condições (6 tipos)                     │
│  └─ Retornar: [ { type, severity, message }, ... ]   │
│                                                        │
│  formatIndicators()                                    │
│  ├─ Transformar valores brutos                        │
│  └─ Retornar: { ocupacao, agendamentos, ... }        │
│                                                        │
│  getStatusColor()                                      │
│  ├─ Map métrica + valor para cor                      │
│  └─ Retornar: 'green'|'yellow'|'red'                 │
│                                                        │
└────────────────────────────────────────────────────────┘
                         ↓ (SQL Query)
┌────────────────────────────────────────────────────────┐
│    DATABASE - Supabase PostgreSQL + RLS                │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Views (Agregação):                                    │
│  ├─ v_agenda_indicators_daily (operacional)            │
│  ├─ v_agenda_time_indicators (tempo)                   │
│  └─ v_agenda_financial_indicators (financeiro)         │
│                                                        │
│  RPC Functions:                                        │
│  ├─ get_agenda_indicators(clinic_id, date, ...)      │
│  └─ get_professional_indicators(clinic_id, ...)      │
│                                                        │
│  Índices (Performance):                                │
│  ├─ idx_appointments_clinic_date                      │
│  ├─ idx_appointments_status                           │
│  └─ idx_appointment_audit_logs_action_date            │
│                                                        │
│  Tabelas Base:                                         │
│  ├─ appointments (agendamentos)                        │
│  ├─ appointment_audit_logs (histórico)                │
│  ├─ services (serviços/receita)                       │
│  ├─ professionals (profissionais)                     │
│  └─ clinics (clínicas)                                │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## 🔄 Fluxo de Dados

```
Usuário Abre /clinica/agenda
        │
        ↓
AgendaPage monta
        │
        ↓
<AgendaIndicators clinicId={...} date={...} />
        │
        ↓
useEffect → fetchIndicators()
        │
        ├─────────────────────────────────┐
        │                                 │
        ↓                                 ↓
isGestor? Não                            Sim
   │                                      │
   ↓                                      ↓
getProfessional              getAgendaIndicators
Indicators()                   (tudo + financeiro)
   │                                      │
   └─────────────────────────────────┬───┘
                                      │
                    ┌─────────────────┴─────────────┐
                    │                               │
                    ↓                               ↓
            supabase.rpc()                  Retorna {
            get_agenda_indicators             taxa_ocupacao,
                    │                         agendamentos,
                    ↓                         confirmados,
        SQL Views em Supabase:                faltas,
        ├─ v_agenda_indicators_daily         encaixes,
        ├─ v_agenda_time_indicators          profissionais,
        └─ v_agenda_financial_indicators     slots_livres,
                    │                         tempo_checkin,
                    ↓                         receita,
            Resultado JSON                    meta,
                    │                         ...
                    └──────────────┬──────────┘
                                   │
                                   ↓
                            setIndicators(data)
                                   │
                                   ├─→ generateAlerts()
                                   │   └─→ setAlerts([...])
                                   │
                                   └─→ useMemo formatIndicators()
                                       └─→ Render UI
                                           │
                                           ├─ Status Card ✅
                                           ├─ Alerts 🚨
                                           ├─ Metrics Grid 📊
                                           ├─ Financial 💰
                                           └─ Progress 📈
```

---

## 🔐 Permissões

```
┌──────────────────────────────────────────────────────┐
│         ROLE-BASED ACCESS CONTROL (RBAC)            │
├──────────────────────────────────────────────────────┤
│                                                      │
│ 👨‍💼 ADMIN / GESTOR                                  │
│ ├─ ✅ Taxa Ocupação                                 │
│ ├─ ✅ Total Agendamentos                            │
│ ├─ ✅ Confirmados                                   │
│ ├─ ✅ Faltas                                        │
│ ├─ ✅ Encaixes                                      │
│ ├─ ✅ Profissionais                                 │
│ ├─ ✅ Slots Livres                                  │
│ ├─ ✅ Tempo Checkin                                 │
│ ├─ ✅ Receita Dia        (Financeiro)               │
│ ├─ ✅ Receita Hora       (Financeiro)               │
│ ├─ ✅ Meta Dia           (Financeiro)               │
│ └─ ✅ % Meta Atingida    (Financeiro)               │
│                                                      │
│ 📞 RECEPÇÃO                                         │
│ ├─ ✅ Taxa Ocupação                                 │
│ ├─ ✅ Total Agendamentos                            │
│ ├─ ✅ Confirmados                                   │
│ ├─ ✅ Faltas                                        │
│ ├─ ✅ Encaixes                                      │
│ ├─ ✅ Profissionais                                 │
│ ├─ ✅ Slots Livres                                  │
│ ├─ ✅ Tempo Checkin                                 │
│ ├─ ❌ Receita Dia                                   │
│ ├─ ❌ Receita Hora                                  │
│ ├─ ❌ Meta Dia                                      │
│ └─ ❌ % Meta Atingida                               │
│                                                      │
│ 👨‍⚕️ PROFISSIONAL                                    │
│ └─ ✅ Apenas seus próprios indicadores:             │
│     ├─ Seus agendamentos                           │
│     ├─ Suas faltas                                 │
│     ├─ Seu tempo médio                             │
│     └─ Seus encaixes                               │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## 📊 Indicadores por Seção

```
┌─────────────────────────────────────────────┐
│      OPERACIONAL (Todos veem)               │
├─────────────────────────────────────────────┤
│                                             │
│  📅 Taxa de Ocupação: 65% 🟢                │
│  ├─ Métrica: taxa_ocupacao_percent         │
│  ├─ Threshold: <40% 🔴 | 40-70% 🟡 | >70% 🟢
│  └─ Alerta: "Taxa ocupação abaixo de 40%"  │
│                                             │
│  ✅ Total de Agendamentos: 10 🟡             │
│  ├─ Métrica: total_agendamentos            │
│  ├─ Threshold: <5 🔴 | 5-10 🟡 | >10 🟢  │
│  └─ Alerta: Implícito (ocupação baixa)     │
│                                             │
│  ✅ Confirmados: 8 🟢                        │
│  ├─ Métrica: confirmados                   │
│  ├─ Cor: Sempre verde                      │
│  └─ Alerta: Nenhum                         │
│                                             │
│  ❌ Faltas: 1 (10%) 🔴                      │
│  ├─ Métrica: faltas                        │
│  ├─ Threshold: <15% 🟢 | 15-20% 🟡 | >20% 🔴
│  └─ Alerta: "Mais de 15% de faltas"        │
│                                             │
│  ➕ Encaixes: 2 🟢                           │
│  ├─ Métrica: encaixes                      │
│  ├─ Cor: Sempre azul                       │
│  └─ Alerta: Nenhum                         │
│                                             │
│  👥 Profissionais Ativos: 2 🟢               │
│  ├─ Métrica: profissionais_ativos          │
│  ├─ Threshold: >0 🟢 | =0 🔴               │
│  └─ Alerta: "Nenhum profissional ativo"    │
│                                             │
│  🕐 Slots Livres: 5 ⚫                       │
│  ├─ Métrica: slots_livres                  │
│  ├─ Threshold: >0 🟢 | =0 🔴               │
│  └─ Alerta: "Nenhum slot disponível"       │
│                                             │
│  ⏱️ Tempo Médio Checkin: 12 min 🟡          │
│  ├─ Métrica: tempo_medio_checkin_minutos   │
│  ├─ Threshold: <10 🟢 | 10-15 🟡 | >15 🔴 │
│  └─ Alerta: "Checkin lento (>15 min)"      │
│                                             │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  FINANCEIRO (Gestor/Admin)                  │
├─────────────────────────────────────────────┤
│                                             │
│  💵 Receita do Dia: R$ 500 🔴                │
│  ├─ Métrica: receita_estimada               │
│  ├─ Baseado em: (services × confirmados)   │
│  └─ Alerta: Implícito (meta não atingida)  │
│                                             │
│  💵 Receita por Hora: R$ 62.50 🟡           │
│  ├─ Métrica: receita_por_hora               │
│  ├─ Cálculo: receita_dia / horas_operando  │
│  └─ Alerta: Nenhum                         │
│                                             │
│  🎯 Meta do Dia: R$ 5000 🟢                 │
│  ├─ Métrica: meta_dia                      │
│  ├─ Fonte: clinic_settings ou default      │
│  └─ Alerta: Nenhum (referência)            │
│                                             │
│  📊 % Meta Atingida: 10% 🔴                 │
│  ├─ Métrica: percentual_meta_atingida      │
│  ├─ Threshold: <70% 🔴 | 70-80% 🟡 | >80% 🟢
│  └─ Alerta: "Meta não atingida (<70%)"     │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 🚨 Alertas por Severidade

```
┌───────────────────────────────────────┐
│  🔴 CRÍTICO (Severity: HIGH)          │
├───────────────────────────────────────┤
│                                       │
│  1. Taxa ocupação < 40%               │
│     └─ Mensagem: "Taxa de ocupação    │
│        abaixo de 40%. Considere       │
│        revisar..."                    │
│                                       │
│  2. Faltas > 15%                      │
│     └─ Mensagem: "Mais de 15% dos    │
│        agendamentos resultaram em     │
│        faltas."                       │
│                                       │
│  3. Nenhum slot disponível            │
│     └─ Mensagem: "Nenhum slot        │
│        disponível para agendamento."  │
│                                       │
└───────────────────────────────────────┘

┌───────────────────────────────────────┐
│  🟡 ATENÇÃO (Severity: MEDIUM)        │
├───────────────────────────────────────┤
│                                       │
│  1. Receita < 70% meta                │
│     └─ Mensagem: "Receita atual      │
│        está abaixo de 70% da meta."   │
│                                       │
│  2. Tempo checkin > 15 min            │
│     └─ Mensagem: "Tempo médio de     │
│        check-in acima de 15 minutos." │
│                                       │
└───────────────────────────────────────┘

┌───────────────────────────────────────┐
│  🚨 CRÍTICO (Severity: CRITICAL)      │
├───────────────────────────────────────┤
│                                       │
│  1. Nenhum profissional ativo         │
│     └─ Mensagem: "Nenhum             │
│        profissional ativo na data."   │
│                                       │
└───────────────────────────────────────┘
```

---

## 📱 Responsividade

```
┌───────────────────────┐
│  📱 MOBILE (360px)    │
│                       │
│  [📊 Indicadores]     │
│  [Atualizar]          │
│                       │
│  ┌──────────────────┐ │
│  │ [Taxa] [Total]   │ │
│  │  35%    10       │ │
│  │ [Faltas][Conf]   │ │
│  │   1       8      │ │
│  │ [Profis][Slots]  │ │
│  │   2       15     │ │
│  │ [Tempo]          │ │
│  │ 12 min           │ │
│  └──────────────────┘ │
│                       │
│  💰 FINANCEIRO        │
│  [Receita: R$500]     │
│  [Meta: R$5000]       │
│  [% Meta: 10%]        │
│                       │
│  📅 SLOTS             │
│  ████░░░░░░░░░░░░░░  │
│  5/20                 │
│                       │
└───────────────────────┘

┌─────────────────────────────────┐
│  📱 TABLET (768px) - 3 COLUNAS  │
│                                 │
│  ┌─────────┬─────────┬─────────┐│
│  │ [Taxa]  │ [Total] │ [Faltas]││
│  │   35%   │   10    │   1     ││
│  │         │         │         ││
│  ├─────────┼─────────┼─────────┤│
│  │[Confirm]│[Profis] │ [Slots] ││
│  │   8     │   2     │   15    ││
│  │         │         │         ││
│  ├─────────┴─────────┴─────────┤│
│  │ [Tempo: 12 min]             ││
│  └─────────────────────────────┘│
│                                 │
│  💰 FINANCEIRO (3 cols)         │
│  ┌─────────┬─────────┬─────────┐│
│  │Receita  │   Meta  │% Atingida││
│  │ R$500   │ R$5000  │  10%     ││
│  └─────────┴─────────┴─────────┘│
│                                 │
│  📅 SLOTS                       │
│  █████░░░░░░░░░░░░░░░░░░░░░░░  │
│  5/20                           │
│                                 │
└─────────────────────────────────┘

┌───────────────────────────────────────────────────┐
│  🖥️ DESKTOP (1024px) - 4 COLUNAS               │
│                                                 │
│  ┌──────────┬──────────┬──────────┬──────────┐  │
│  │ [Taxa]   │ [Total]  │ [Faltas] │ [Confirm]│  │
│  │   35%    │    10    │    1     │    8     │  │
│  │          │          │          │          │  │
│  ├──────────┼──────────┼──────────┼──────────┤  │
│  │[Profis]  │ [Slots]  │ [Tempo]  │          │  │
│  │    2     │   15     │ 12 min   │          │  │
│  │          │          │          │          │  │
│  └──────────┴──────────┴──────────┴──────────┘  │
│                                                 │
│  💰 FINANCEIRO (4 colunas)                     │
│  ┌──────────┬──────────┬──────────┬──────────┐  │
│  │ Receita  │ Receita  │   Meta   │% Atingida│  │
│  │   Dia    │   Hora   │   Dia    │          │  │
│  │ R$ 500   │R$ 62.50  │ R$ 5000  │   10%    │  │
│  └──────────┴──────────┴──────────┴──────────┘  │
│                                                 │
│  📅 RESUMO DE SLOTS                            │
│  Ocupação: 5/20 slots utilizados               │
│  ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│                                                 │
└───────────────────────────────────────────────────┘
```

---

## 🎨 Cores e Significados

```
┌─────────────────────────────┐
│  🟢 VERDE (Bom)            │
├─────────────────────────────┤
│  • Ocupação > 70%           │
│  • Agendamentos > 10        │
│  • Meta atingida > 80%      │
│  • Tempo checkin < 10 min   │
│  • Profissionais > 0        │
└─────────────────────────────┘

┌─────────────────────────────┐
│  🟡 AMARELO (Atenção)      │
├─────────────────────────────┤
│  • Ocupação 40-70%          │
│  • Agendamentos 5-10        │
│  • Meta atingida 70-80%     │
│  • Tempo checkin 10-15 min  │
│  • Receita < 70% meta       │
└─────────────────────────────┘

┌─────────────────────────────┐
│  🔴 VERMELHO (Crítico)     │
├─────────────────────────────┤
│  • Ocupação < 40%           │
│  • Agendamentos < 5         │
│  • Meta atingida < 70%      │
│  • Tempo checkin > 15 min   │
│  • Faltas > 15%             │
│  • Slots livres = 0         │
└─────────────────────────────┘

┌─────────────────────────────┐
│  ⚫ CINZA (Neutro)          │
├─────────────────────────────┤
│  • Slots livres             │
│  • Info geral (sem alerta)  │
└─────────────────────────────┘
```

---

## 📈 Fluxo de Status Geral

```
                    Verificar indicadores
                            ↓
                    
        ┌───────────────────┬───────────────────┐
        │                   │                   │
        ↓                   ↓                   ↓
    
    Todos 🟢          Alguns 🟡           Algum 🔴
    (Saudável)       (Atenção)          (Crítico)
        │                   │                   │
        ↓                   ↓                   ↓
    
    ✅ SAUDÁVEL      ⚠️ ATENÇÃO          🚨 CRÍTICO
        │                   │                   │
        └───────────────────┴───────────────────┘
                            ↓
                    Mostrar status geral
                    com cor correspondente
```

---

**Desenvolvido para Gesclinic Web** ❤️

*Visualização completa do sistema de indicadores*
