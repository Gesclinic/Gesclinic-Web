# 🎯 RESUMO EXECUTIVO - MAPEAMENTO AGENDA

## 📊 Números

```
Total de Arquivos:     ~150+
Components:            48
Views:                 23
Services:              5
Hooks:                 10
Utils:                 15+
Outros:                ~50
```

## ⚡ Estratégia de Migração

```
FASE 1: Utils Puros              🟢 15 min   RISCO: BAIXO
FASE 2: Serviços                 🟡 30 min   RISCO: MÉDIO
FASE 3: Hooks Específicos        🟡 45 min   RISCO: MÉDIO-ALTO
FASE 4: Componentes Puros        🟠 60 min   RISCO: ALTO
FASE 5: Context                  🔴 30 min   RISCO: MUITO ALTO
FASE 6: Componentes Container    🔴 90 min   RISCO: MUITO ALTO
FASE 7: Views                    🔴🔴 120 min  RISCO: CRÍTICO
─────────────────────────────────────────────────────────
TOTAL:                           ~360 min    (6 horas)
```

## 📁 Estrutura Final Esperada

```
src/modules/agenda/
├── README.md                 (já criado)
├── components/
│   ├── ui/                   (StatusBadge, EmptyState, etc)
│   ├── filters/              (AgendaFilters, etc)
│   ├── containers/           (AppointmentModal, etc)
│   └── index.js
├── views/
│   ├── calendar/             (WeekView, DayView, etc)
│   ├── management/           (Dashboard, KPIs, etc)
│   ├── reception/            (CheckinRecepacao, etc)
│   └── index.js
├── services/
│   ├── agendaService.js
│   ├── agendaMapper.js
│   └── index.js
├── hooks/
│   ├── useAgenda*.js
│   └── index.js
├── utils/
│   ├── suggestEncaixe.js
│   ├── validation/
│   ├── formatting/
│   └── index.js
├── context/
│   ├── AgendaContext.jsx
│   └── index.js
└── types/                    (para futuro: TypeScript)
```

## 🚀 Comandos de Migração

### Fase 1 (Exemplo)
```bash
# Mover utils
mv src/pages/clinica/agenda/utils/suggestEncaixe.js src/modules/agenda/utils/
mv src/pages/clinica/agenda/utils/appointmentHelpers.js src/modules/agenda/utils/
...

# Atualizar imports em ~5 arquivos
npm run build  # validar
```

## 🎯 Arquivos Críticos (Atenção Máxima)

```
🔴🔴 CRÍTICO - Validar SEMPRE após mover
  - AgendaLayout.jsx      (orquestrador central)
  - Agenda.jsx            (entry point)
  - AgendaContext.jsx     (provider global)

🔴 MUITO ALTO - Testar bem
  - AppointmentModal.jsx  (acoplamento alto)
  - CheckinRecepacao.jsx  (lógica de negócio)
  - agendaService.js      (API layer)

🟠 ALTO - Possíveis quebras
  - Views (todas)
  - Componentes container
  - Hooks complexos
```

## ✅ Validação Após Cada Fase

```javascript
// Sempre rodar
npm run build
npm run dev

// Testar rotas
/clinica/agenda
/clinica/agenda/novo-agendamento
/clinica/agenda/confirmacoes
```

## 📌 Notas Importantes

```
✓ Nenhum arquivo foi movido ainda
✓ Este é apenas o MAPEAMENTO
✓ Ordem de migração é ESSENCIAL
✓ Build validation é OBRIGATÓRIA
✓ Começar com FASE 1 (safest)
```

---

**Leia o arquivo completo:** `MAPEAMENTO_DOMINIO_AGENDA.md`

