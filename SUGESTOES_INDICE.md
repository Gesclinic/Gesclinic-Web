# 📑 ÍNDICE - SISTEMA DE SUGESTÃO INTELIGENTE DE ENCAIXE

## 🚀 COMECE AQUI

1. **Quer entender rápido?**
   → Leia: [SUGESTOES_RESUMO_VISUAL.md](./SUGESTOES_RESUMO_VISUAL.md) (5 min)

2. **Quer implementar?**
   → Leia: [SUGESTOES_IMPLEMENTACAO_RAPIDA.md](./SUGESTOES_IMPLEMENTACAO_RAPIDA.md) (20 min)

3. **Quer referência técnica?**
   → Leia: [SISTEMA_SUGESTOES_INTELIGENTES_GUIA_COMPLETO.md](./SISTEMA_SUGESTOES_INTELIGENTES_GUIA_COMPLETO.md) (30 min)

4. **Quer exemplos de código?**
   → Veja: [SUGESTOES_INTEGRACAO_COM_MODALS.jsx](./src/pages/clinica/agenda/SUGESTOES_INTEGRACAO_COM_MODALS.jsx)

5. **Quer testar?**
   → Execute: [SISTEMA_SUGESTOES_TESTES.js](./src/pages/clinica/agenda/SISTEMA_SUGESTOES_TESTES.js)

---

## 📁 ARQUIVOS PRINCIPAIS

### Backend

| Arquivo | Linhas | Descrição |
|---------|--------|-----------|
| [`src/lib/agendaSuggestionsApi.js`](./src/lib/agendaSuggestionsApi.js) | 420 | API Core - Geração de sugestões |

### Frontend Components

| Arquivo | Linhas | Descrição |
|---------|--------|-----------|
| [`src/pages/clinica/agenda/components/AgendaSuggestions.jsx`](./src/pages/clinica/agenda/components/AgendaSuggestions.jsx) | 360 | Componente principal com cards |
| [`src/pages/clinica/agenda/components/SuggestionsDrawer.jsx`](./src/pages/clinica/agenda/components/SuggestionsDrawer.jsx) | 90 | Drawer lateral responsivo |
| [`src/pages/clinica/agenda/components/NobleHoursSettings.jsx`](./src/pages/clinica/agenda/components/NobleHoursSettings.jsx) | 180 | Interface de configuração |

### Hooks & Utils

| Arquivo | Linhas | Descrição |
|---------|--------|-----------|
| [`src/pages/clinica/agenda/hooks/useAgendaSuggestions.js`](./src/pages/clinica/agenda/hooks/useAgendaSuggestions.js) | 70 | Hook customizado para sugestões |

### Database

| Arquivo | Linhas | Descrição |
|---------|--------|-----------|
| [`supabase/migrations/20260114_create_suggestion_audit_logs.sql`](./supabase/migrations/20260114_create_suggestion_audit_logs.sql) | 70 | Migration de auditoria |

### Exemplos & Testes

| Arquivo | Linhas | Descrição |
|---------|--------|-----------|
| [`src/pages/clinica/agenda/EXEMPLO_INTEGRACAO_SUGESTOES.jsx`](./src/pages/clinica/agenda/EXEMPLO_INTEGRACAO_SUGESTOES.jsx) | 200 | Exemplo completo de página |
| [`src/pages/clinica/agenda/SUGESTOES_INTEGRACAO_COM_MODALS.jsx`](./src/pages/clinica/agenda/SUGESTOES_INTEGRACAO_COM_MODALS.jsx) | 450 | Exemplos com modals |
| [`src/pages/clinica/agenda/SISTEMA_SUGESTOES_TESTES.js`](./src/pages/clinica/agenda/SISTEMA_SUGESTOES_TESTES.js) | 380 | 7 testes automatizados |

### Documentação

| Arquivo | Descrição |
|---------|-----------|
| [`SISTEMA_SUGESTOES_INTELIGENTES_GUIA_COMPLETO.md`](./SISTEMA_SUGESTOES_INTELIGENTES_GUIA_COMPLETO.md) | 📖 Referência técnica detalhada |
| [`SUGESTOES_IMPLEMENTACAO_RAPIDA.md`](./SUGESTOES_IMPLEMENTACAO_RAPIDA.md) | ⚡ Quick start em 3 passos |
| [`SUGESTOES_RESUMO_VISUAL.md`](./SUGESTOES_RESUMO_VISUAL.md) | 🎨 Diagramas e visual overview |
| [`🎉_SUGESTOES_ENTREGA_FINAL.md`](./🎉_SUGESTOES_ENTREGA_FINAL.md) | ✅ Status final e checklist |

---

## 🎯 FLUXOS DE USO

### Para Recepcionista
```
Página Agenda abre
    ↓
Vê sugestões 💡 (não pode ver todas)
    ↓
Clica "Ver Lista de Espera"
    ↓
Abre modal com pacientes aguardando
    ↓
Seleciona paciente
    ↓
Preenche dados (data, horário, prof)
    ↓
Confirma encaixe
    ↓
Sistema atualiza sugestões
```

### Para Gestor
```
Menu > Configurações > Agenda
    ↓
Define "Horários Nobres"
    ↓
Salva configuração
    ↓
Volta para Agenda
    ↓
Vê todas as sugestões + métricas
    ↓
Monitora aceitas/ignoradas
```

### Para Desenvolver (Integração)
```
1. Aplicar migration
   SQL: supabase/migrations/20260114_*.sql
    ↓
2. Importar API
   import { generateEncaixeSuggestions } from "@/lib/agendaSuggestionsApi"
    ↓
3. Usar componentes
   <AgendaSuggestions /> ou <SuggestionsDrawer />
    ↓
4. Conectar callbacks
   onSuggestionAction={(data) => {...}}
    ↓
5. Testar
   npm test ou console: await TEST_generateSuggestions()
```

---

## 🔧 GUIAS POR TAREFA

### "Como implementar?"
1. Leia: [SUGESTOES_IMPLEMENTACAO_RAPIDA.md](./SUGESTOES_IMPLEMENTACAO_RAPIDA.md)
2. Copie: Migration SQL
3. Importe: Componentes React
4. Integre: Callbacks e refresh
5. Teste: Suite de testes

### "Como configurar horários nobres?"
1. Abra: Menu > Configurações > Agenda
2. Vá para: "Horários Nobres"
3. Adicione: Períodos premium (7h-9h, 12h-13h, etc)
4. Salve: Configuração
5. Pronto: Sistema usará em sugestões

### "Como depurar?"
1. Console: F12
2. Importe: SISTEMA_SUGESTOES_TESTES.js
3. Execute: `await runAllTests()`
4. Verifique: Logs e validações
5. Consulte: Troubleshooting na docs

### "Como customizar?"
1. Edite: `agendaSuggestionsApi.js`
2. Modifique: Regras de análise (linhas 180-220)
3. Altere: Limites (ocupação, receita)
4. Atualize: Cores em `AgendaSuggestions.jsx`
5. Teste: Nova suite de testes

### "Como monitorar uso?"
1. Acesse: Supabase > suggestion_audit_logs
2. Filtre: Por clinic_id, data, usuário
3. Analise: Sugestões aceitas vs ignoradas
4. Exporte: Relatório em CSV

---

## 📊 ESTRUTURA DE DADOS

### Entrada: `generateEncaixeSuggestions()`
```javascript
{
  clinicId: "uuid",
  date: "2026-01-14",
  config: { /* opcional */ }
}
```

### Saída: Array de Sugestões
```javascript
[
  {
    type: "SLOT_LIVRE",
    prioridade: "ALTA",
    horario: "07:30",
    profissional_id: "uuid",
    profissional_nome: "Dr. João",
    mensagem: "Horário nobre...",
    acao: "VER_LISTA_ESPERA",
    metadata: { ... }
  },
  // ... mais sugestões
]
```

### Storage: `suggestion_audit_logs`
```
id (UUID)
clinic_id (UUID) ← Essencial
suggestion_type (VARCHAR)
appointment_id (UUID)
action_taken (VARCHAR)
executed_by (UUID)
executed_at (TIMESTAMP)
result (JSONB)
```

---

## 🧪 TESTES DISPONÍVEIS

```javascript
// No console do navegador

import { runAllTests } from "@/pages/clinica/agenda/SISTEMA_SUGESTOES_TESTES.js";

// Suite completo (7 testes)
await runAllTests();

// Testes individuais
await TEST_generateSuggestions();
await TEST_priorityOrdering();
await TEST_suggestionTypes();
await TEST_requiredFields();
await TEST_metadata();
await TEST_validActions();
await TEST_noDuplicates();
```

Resultados esperados:
- ✅ 7/7 testes passando
- ✅ Sem erros de tipo
- ✅ Estrutura válida
- ✅ Campos obrigatórios presentes

---

## 🎨 COMPONENTES REUTILIZÁVEIS

### AgendaSuggestions
```jsx
<AgendaSuggestions
  clinicId={string}
  date={string}           // "YYYY-MM-DD"
  onSuggestionAction={fn}
  userRole={string}       // "recepcion" | "gestor"
  compact={boolean}       // Modo compacto
/>
```

### SuggestionsDrawer
```jsx
const drawer = useSuggestionsDrawer();

<button onClick={drawer.toggle}>Sugestões</button>
<SuggestionsDrawer
  clinicId={string}
  date={string}
  isOpen={boolean}
  onClose={fn}
  onSuggestionAction={fn}
  userRole={string}
/>
```

### NobleHoursSettings
```jsx
<NobleHoursSettings
  clinicId={string}
  onSave={fn}
/>
```

---

## 🔒 PERMISSÕES & SEGURANÇA

### RLS Policies
- ✅ Só recepcion/gestor/admin veem sugestões
- ✅ Logs inseridos por qualquer autenticado
- ✅ Leitura restrita por clinic_id

### Validação
- ✅ User role verificado em componentes
- ✅ Callbacks verificam permissões
- ✅ Auditoria registra tudo

### Dados Sensíveis
- ✅ Não persiste sugestões (geradas em tempo real)
- ✅ Apenas ações são registradas
- ✅ IP e User-Agent armazenados

---

## 📈 MÉTRICAS DE SUCESSO

Após implementação, monitor:

```
✅ Taxa de ocupação
   Objetivo: +20% após 2 semanas

✅ Sugestões aceitas
   Objetivo: >50% de aceitação

✅ Receita adicional
   Objetivo: +25% via encaixe

✅ Redução de faltas
   Objetivo: -50% com recuperação

✅ Tamanho da fila
   Objetivo: -70% em 30 dias
```

---

## 🆘 TROUBLESHOOTING

| Problema | Solução |
|----------|---------|
| Nenhuma sugestão aparece | Verificar `clinicId`, há indicadores? |
| "Cannot read property 'x'" | Garantir migration aplicada |
| Sugestões não atualizam | Verificar `refreshTrigger` |
| Permissão negada | Verificar role do usuário |
| RPC error | Garantir RPC `get_agenda_indicators` existe |

Consulte: [SISTEMA_SUGESTOES_INTELIGENTES_GUIA_COMPLETO.md](./SISTEMA_SUGESTOES_INTELIGENTES_GUIA_COMPLETO.md#-troubleshooting)

---

## 🚀 ROADMAP FUTURO

- [ ] Dashboard de analytics (aceitas vs ignoradas)
- [ ] Machine Learning para personalização
- [ ] Notificações push
- [ ] Integração SMS/WhatsApp
- [ ] Previsão de receita
- [ ] Teste A/B de mensagens
- [ ] Integração com Google Calendar
- [ ] CRM sync

---

## 📞 DOCUMENTAÇÃO RELACIONADA

### No Projeto
- [Indicadores da Agenda](./src/lib/indicatorsApi.js) - Dados que alimentam sugestões
- [Appointments API](./src/lib/appointmentsApi.js) - Operações com agendamentos
- [Audit API](./src/lib/auditApi.js) - Sistema de auditoria

### Externo
- [Supabase Docs](https://supabase.com/docs)
- [React Docs](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)

---

## ✨ STATUS

| Item | Status | Data |
|------|--------|------|
| Backend API | ✅ Completo | 2026-01-14 |
| Components React | ✅ Completo | 2026-01-14 |
| Hook Customizado | ✅ Completo | 2026-01-14 |
| Migration SQL | ✅ Pronto | 2026-01-14 |
| Documentação | ✅ Completa | 2026-01-14 |
| Exemplos | ✅ Completos | 2026-01-14 |
| Testes | ✅ 7 testes | 2026-01-14 |
| **PRONTO PARA PRODUÇÃO** | ✅ SIM | 2026-01-14 |

---

## 📋 PRÓXIMOS PASSOS

1. **Hoje:** Ler documentação
2. **Amanhã:** Aplicar migration e implementar
3. **Semana 1:** Testar com dados reais
4. **Semana 2:** Deploy em staging
5. **Semana 3:** Deploy em produção
6. **Semana 4:** Monitorar métricas e otimizar

---

**Documentação atualizada: 2026-01-14**  
**Versão: 1.0**  
**Status: ✅ Completo e Testado**

Para dúvidas ou sugestões, consulte a documentação principal ou abra uma issue.
