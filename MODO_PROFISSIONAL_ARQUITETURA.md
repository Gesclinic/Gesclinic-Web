# 🏗️ ARQUITETURA: MODO PROFISSIONAL

## Fluxo de Decisão (User Login)

```
┌─────────────────────────────────────┐
│    USER FAZ LOGIN                   │
│    Supabase Auth                    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   SupabaseAuthContext lê role       │
│   Retorna: currentRole = ?          │
└──────────────┬──────────────────────┘
               │
        ┌──────┴──────┬────────────┬──────────────┐
        │             │            │              │
        ▼             ▼            ▼              ▼
   'recepcao'  'profissional'  'gestor'     'admin' | null
        │             │            │              │
        │        ┌────┘            └──┬───────────┘
        │        │                    │
        ▼        ▼                    ▼
   Modo:    Modo:                 Modo:
   recepcao profissional           recepcao (padrão)
        │        │                    │
        └────┬───┴────────────┬───────┘
             │                │
             ▼                ▼
        [Toggle UI]     [Toggle UI]
        Rec | Gest    Rec | Prof | Gest
```

---

## Estrutura de Componentes

```
AgendaPage.jsx (controlador principal)
│
├─ Estado Global
│  ├─ currentRole (Supabase)
│  ├─ isProfissional (boolean calculado)
│  ├─ agendaMode ('recepcao' | 'profissional' | 'gestor')
│  └─ agenda (useAgendaStore)
│
├─ Hooks
│  ├─ useEffect: Auto-set profissional
│  ├─ useEffect: Bloqueio defensivo
│  ├─ useMemo: Filtragem por professional_id
│  └─ useEffect: Load dados
│
└─ Renderização Condicional
   │
   ├─ canAccessGestorMode && isProfissional?
   │  └─ [Toggle 3 Modos] ← Rec | Prof | Gest
   │
   ├─ agendaMode === 'profissional'?
   │  └─ <AgendaProfessionalView />
   │     ├─ Próximo atendimento 🎯
   │     ├─ Lista vertical expandível
   │     ├─ Botões: Confirmar, Cancelar
   │     └─ Zero financeiro
   │
   └─ agendaMode !== 'profissional'?
      └─ [Timeline / Grid]
         ├─ Recepção: operacional
         └─ Gestor: + Dashboard + Heatmap
```

---

## Fluxo de Filtragem

```
┌─────────────────────────────────────────┐
│  agenda.filteredAppointments (todos)    │
│  Exemplo: [Appt1, Appt2, Appt3, Appt4] │
└──────────────┬──────────────────────────┘
               │
               ▼
        ┌─────────────┐
        │ agendaMode? │
        └──────┬──────┘
               │
        ┌──────┴──────────────┐
        │                     │
        ▼                     ▼
    'profissional'     (recepcao/gestor)
        │                     │
        ▼                     ▼
   currentProfessional   [Sem filtro]
   = metadata.prof      = Todos os agend.
   onde id === user.id
        │
        ▼
   Filtrar appointments
   onde professional_id
   === currentProfessional.id
        │
        ▼
   professionalAppointments
   Exemplo: [Appt1, Appt3]
        │
        ▼
   <AgendaProfessionalView
    appointments={prof...}
   />
```

---

## Matriz de Componentes

```
┌─────────────────────────────────────────────────────────┐
│                      AgendaPage.jsx                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │             [Header] [Tabs]                      │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │    [Toggle Modo] ← Rec | Prof* | Gest*         │  │
│  │    * = condicional por role                      │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │         [Filters] [Metadata]                     │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ IF agendaMode === 'profissional':               │  │
│  │ ┌────────────────────────────────────────────┐  │  │
│  │ │  <AgendaProfessionalView />                │  │  │
│  │ │  ┌──────────────────────────────────────┐  │  │  │
│  │ │  │ 🎯 Próximo Atendimento              │  │  │  │
│  │ │  │ [Card Expandível]                   │  │  │  │
│  │ │  ├──────────────────────────────────────┤  │  │  │
│  │ │  │ 📋 Demais Atendimentos (5)          │  │  │  │
│  │ │  │ [Card 1] [Card 2] [Card 3]...      │  │  │  │
│  │ │  │ ├─ Expandir → Detalhes              │  │  │  │
│  │ │  │ └─ Botões: Confirmar / Cancelar    │  │  │  │
│  │ │  └──────────────────────────────────────┘  │  │  │
│  │ └────────────────────────────────────────────┘  │  │
│  │                                                 │  │
│  │ ELSE:                                           │  │
│  │ ┌────────────────────────────────────────────┐  │  │
│  │ │  <AgendaTimeline />                       │  │  │
│  │ │  Grid/Timeline Completo                   │  │  │
│  │ │  ├─ Recepção: operacional                │  │  │
│  │ │  └─ Gestor: + Dashboard + Heatmap        │  │  │
│  │ └────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  <AppointmentModal /> (para criar/editar)       │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Ciclo de Vida: Profissional Login

```
Step 1: Login
┌─────────────────────────────┐
│ User clica Login            │
│ Email: doctor@clinic.com    │
│ Senha: ****                 │
└──────────┬──────────────────┘

Step 2: Supabase Auth
┌─────────────────────────────┐
│ supabase.auth.signIn()      │
│ ✓ Autenticado               │
│ sessionUser.id = uuid123    │
└──────────┬──────────────────┘

Step 3: SupabaseAuthContext
┌─────────────────────────────┐
│ loadUserData(sessionUser)    │
│ SELECT * FROM users         │
│ WHERE id = uuid123          │
│ ┌────────────────────────┐   │
│ │ id: uuid123            │   │
│ │ role: 'profissional'   │   │
│ │ clinic_id: clinic456   │   │
│ └────────────────────────┘   │
│ setCurrentRole('profissional')│
└──────────┬──────────────────┘

Step 4: AgendaPage Mount
┌─────────────────────────────┐
│ useEffect() dispara         │
│ currentRole = 'profissional'│
│ isProfissional = true       │
└──────────┬──────────────────┘

Step 5: Auto-set Modo
┌─────────────────────────────┐
│ useEffect([isProfissional]) │
│ if (isProfissional) {       │
│   setAgendaMode('prof')     │
│ }                           │
│ ✓ Modo = 'profissional'     │
└──────────┬──────────────────┘

Step 6: Render
┌─────────────────────────────┐
│ canAccessGestorMode = false │
│ isProfissional = true       │
│ ├─ Toggle mostra:           │
│ │  Rec | Prof | (sem Gest)  │
│ └─ Renderiza:               │
│    <AgendaProfessionalView/>│
│    ├─ Próximo destacado     │
│    ├─ Lista expandível      │
│    └─ Botões clínicos       │
└──────────┬──────────────────┘

Step 7: Filtragem
┌─────────────────────────────┐
│ useMemo detecta:            │
│ agendaMode = 'profissional' │
│ Busca profissional no meta  │
│ Filtra: appts onde          │
│ prof_id == currentProf.id   │
│ ✓ Agendamentos filtrados    │
└──────────┬──────────────────┘

Step 8: Usuário Vê
┌─────────────────────────────┐
│ 👨‍⚕️ MODO PROFISSIONAL       │
│                             │
│ 🎯 PRÓXIMO ATENDIMENTO      │
│ 14:30 - João Silva          │
│ ✓ Confirmado                │
│                             │
│ 📋 DEMAIS (2)               │
│ 15:00 - Maria               │
│ 16:30 - Pedro               │
│                             │
│ [Expandir] [Expandir]       │
└─────────────────────────────┘
```

---

## Bloqueio Defensivo (Attack Scenarios)

### Cenário 1: localStorage hack
```
Hacker manipula localStorage
setItem('agendaMode', 'gestor')

┌──────────────────────────┐
│ Component monta          │
│ agendaMode = 'gestor'    │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ useEffect bloqueia       │
│ if (!isProfissional &&   │
│     agendaMode='gestor') │
│   setAgendaMode('prof')  │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ ✅ BLOQUEADO!            │
│ Modo volta para          │
│ 'profissional'           │
└──────────────────────────┘
```

### Cenário 2: JavaScript injection
```
Injeta: setAgendaMode('gestor')

┌──────────────────────────┐
│ Executa comando          │
│ setAgendaMode('gestor')  │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ Component re-renders     │
│ useEffect detecta        │
│ agendaMode mismatch      │
│ Redefine automático      │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ ✅ BLOQUEADO!            │
│ Retorna profissional     │
└──────────────────────────┘
```

### Cenário 3: Network intercept
```
Hacker intercepta Redux/Store

┌──────────────────────────┐
│ Tenta editar: agenda.    │
│ setMode() direto         │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ useEffect constantly     │
│ verifica currentRole     │
│ vs agendaMode            │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ ✅ BLOQUEADO!            │
│ Sync mantém segurança    │
│ Role source of truth     │
└──────────────────────────┘
```

---

## UX Journey: Profissional Típico

```
SEGUNDA 14:00
  ├─ Profissional recebe mensagem no celular
  │  "Novo agendamento para você"
  │
  ├─ Login no sistema
  │  ↓ Auto-ativa Modo Profissional ✓
  │
  ├─ Vê lista limpa
  │  🎯 Próximo: João 14:30 (em 30 min)
  │  📋 Depois: Maria 15:00, Pedro 16:30
  │
  ├─ Clica João
  │  ├─ Expande mostrando:
  │  │  ├─ Telefone
  │  │  ├─ Serviço: Consulta Geral
  │  │  ├─ Observações: "Primeira vez"
  │  │  └─ Botões: Confirmar | Cancelar
  │  │
  │  └─ Clica "Confirmar"
  │     Status muda: ⏳ a_confirmar → ✓ confirmado
  │
  ├─ 14:25 - Paciente chega
  │  Recepção marca "Check-in"
  │  (Futuro: Status atualiza em tempo real)
  │
  ├─ 14:30 - Atende João
  │  Clica "Marcar como atendido" (Futuro)
  │  Abre prontuário (Futuro)
  │
  └─ 16:45 - Finaliza dia
     Viu apenas agendamentos dele
     Zero distrações
     Zero financeiro
     Zero métricas
     ✓ Foco 100% no atendimento
```

---

## Comparação: Antes vs Depois

### ANTES (1 modo flat)
```
┌────────────────────────────────┐
│  Agenda Completa               │
│  ├─ 200 linhas HTML            │
│  ├─ Timeline + Grid            │
│  ├─ Dashboard Financeiro       │
│  ├─ Heatmap                    │
│  ├─ Indicadores                │
│  ├─ Filtros avançados          │
│  ├─ Todas os agendamentos      │
│  └─ Muita info irrelevante     │
│                                │
│  Profissional vê:              │
│  "Preciso achar meu agend.?"   │
│  ❌ Poluído                    │
└────────────────────────────────┘
```

### DEPOIS (3 modos especializados)
```
┌────────────────────────────────┐
│  Modo Profissional             │
│  ├─ 80 linhas HTML            │
│  ├─ Lista vertical limpa       │
│  ├─ Próximo destaque           │
│  ├─ Expandir para detalhes     │
│  ├─ Apenas seus agendamentos   │
│  ├─ Botões clínicos            │
│  └─ Zero poluição              │
│                                │
│  Profissional vê:              │
│  "Próximo paciente aqui!"      │
│  ✅ Limpo e focado             │
└────────────────────────────────┘

┌────────────────────────────────┐
│  Modo Recepção                 │
│  ├─ Timeline operacional       │
│  ├─ Ver todos                  │
│  ├─ Agendar rápido             │
│  └─ Filtrar por prof/sala      │
│  ✅ Rápido e direto            │
└────────────────────────────────┘

┌────────────────────────────────┐
│  Modo Gestor                   │
│  ├─ Timeline completo          │
│  ├─ Dashboard financeiro       │
│  ├─ Heatmap                    │
│  ├─ Indicadores                │
│  └─ Análises avançadas         │
│  ✅ Controle total             │
└────────────────────────────────┘
```

---

**Arquitetura final:** ERP-grade com 3 modos especializados ✅

---

**Data:** 2026-01-14 | **Arquiteto:** GitHub Copilot | **Modelo:** Claude Haiku 4.5
