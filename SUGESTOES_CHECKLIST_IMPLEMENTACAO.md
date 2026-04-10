# ✅ CHECKLIST DE IMPLEMENTAÇÃO - SISTEMA DE SUGESTÕES

## 📋 PRÉ-REQUISITOS

### Verificações Iniciais
- [ ] Projeto Gesclinic Web aberto em VS Code
- [ ] Node.js instalado (`npm -v`)
- [ ] Supabase CLI instalado (`supabase --version`)
- [ ] Acesso ao dashboard Supabase
- [ ] Permissões de admin no Supabase
- [ ] Contextos de autenticação configurados (`AuthProvider`, `ClinicContext`)

---

## 🚀 PASSO 1: PREPARAÇÃO (5 MIN)

### 1.1 Verificar Arquivos Existentes
- [ ] `src/lib/appointmentsApi.js` existe
- [ ] `src/lib/indicatorsApi.js` existe
- [ ] `src/lib/auditApi.js` existe
- [ ] `src/contexts/AuthContext.jsx` existe
- [ ] `src/contexts/ClinicContext.jsx` existe
- [ ] `src/pages/clinica/agenda/` existe

### 1.2 Verificar RPC `get_agenda_indicators`
```sql
-- No Supabase SQL Editor, executar:
SELECT * FROM pg_proc WHERE proname = 'get_agenda_indicators';
-- Deve retornar resultado
```
- [ ] RPC existe

### 1.3 Criar diretórios se necessário
```bash
mkdir -p src/pages/clinica/agenda/components
mkdir -p src/pages/clinica/agenda/hooks
mkdir -p supabase/migrations
```
- [ ] Diretórios criados

---

## 📦 PASSO 2: ADICIONAR ARQUIVOS (10 MIN)

### 2.1 Backend API
- [ ] Copiar `agendaSuggestionsApi.js` para `src/lib/`
  - Validar: Arquivo tem 420+ linhas
  - Validar: Importa `supabase` corretamente
  - Validar: Exports `generateEncaixeSuggestions`

### 2.2 Components React
- [ ] Copiar `AgendaSuggestions.jsx` para `src/pages/clinica/agenda/components/`
  - Validar: Importa `lucide-react`
  - Validar: Importa `agendaSuggestionsApi`

- [ ] Copiar `SuggestionsDrawer.jsx` para `src/pages/clinica/agenda/components/`
  - Validar: Hook `useSuggestionsDrawer` exportado

- [ ] Copiar `NobleHoursSettings.jsx` para `src/pages/clinica/agenda/components/`
  - Validar: Integra com Supabase

### 2.3 Hooks
- [ ] Copiar `useAgendaSuggestions.js` para `src/pages/clinica/agenda/hooks/`
  - Validar: Hook chamável como `useAgendaSuggestions(clinicId, date, trigger)`

### 2.4 Migration
- [ ] Copiar SQL migration para `supabase/migrations/`
  - Validar: Nome: `20260114_create_suggestion_audit_logs.sql`
  - Validar: Contém CREATE TABLE e RLS policies

---

## 🔧 PASSO 3: APLICAR MIGRATION (3 MIN)

### 3.1 Via Supabase Dashboard
- [ ] Acessar: https://app.supabase.com/project/[seu-project]/sql/new
- [ ] Copiar conteúdo de `20260114_create_suggestion_audit_logs.sql`
- [ ] Executar
- [ ] Validar: Sem erros

Ou via CLI:
```bash
supabase migration up
```
- [ ] Migration aplicada

### 3.2 Verificar Tabela
```sql
SELECT * FROM suggestion_audit_logs LIMIT 1;
-- Deve retornar estructura (ainda vazia)
```
- [ ] Tabela criada
- [ ] Colunas corretas

### 3.3 Verificar RLS
```sql
SELECT * FROM pg_policies WHERE tablename = 'suggestion_audit_logs';
-- Deve retornar 2 policies
```
- [ ] RLS habilitado
- [ ] Policies criadas

---

## 💻 PASSO 4: IMPORTAR E INTEGRAR (15 MIN)

### 4.1 Editar Página de Agenda Existente
**Arquivo:** `src/pages/clinica/agenda/AgendaPage.jsx` (ou similar)

```jsx
// Adicionar imports no topo
import { useAgendaSuggestions } from "./hooks/useAgendaSuggestions";
import SuggestionsDrawer, { useSuggestionsDrawer } from "./components/SuggestionsDrawer";
import AgendaSuggestions from "./components/AgendaSuggestions";
```
- [ ] Imports adicionados

### 4.2 Adicionar Estados
```jsx
const [selectedDate, setSelectedDate] = useState(
  new Date().toISOString().split("T")[0]
);
const [refreshTrigger, setRefreshTrigger] = useState(0);
const suggestionsDrawer = useSuggestionsDrawer();
const { suggestions } = useAgendaSuggestions(clinicId, selectedDate, refreshTrigger);
const userRole = user?.role || "profissional";
```
- [ ] Estados configurados

### 4.3 Adicionar Handler
```jsx
const handleSuggestionAction = useCallback((data) => {
  const { suggestion, action } = data;
  
  switch (action) {
    case "VER_LISTA_ESPERA":
      // TODO: Abrir modal de lista de espera
      break;
    case "CRIAR_ENCAIXE":
      // TODO: Abrir form de criar encaixe
      break;
    // ... outros cases
  }
  
  // Recarregar sugestões após ação
  setTimeout(() => setRefreshTrigger(prev => prev + 1), 500);
}, []);
```
- [ ] Handler implementado

### 4.4 Renderizar Componentes
```jsx
// No JSX, adicionar:

// Desktop Drawer (lado direito)
<div className="hidden lg:block w-96 border-l">
  {suggestions.length > 0 ? (
    <AgendaSuggestions {...props} />
  ) : (
    <p className="text-gray-500">Nenhuma sugestão</p>
  )}
</div>

// Mobile Drawer
<SuggestionsDrawer
  clinicId={clinicId}
  date={selectedDate}
  isOpen={suggestionsDrawer.isOpen}
  onClose={suggestionsDrawer.close}
  onSuggestionAction={handleSuggestionAction}
  userRole={userRole}
/>
```
- [ ] Componentes renderizados

---

## 🔄 PASSO 5: CONECTAR EVENTOS (10 MIN)

### 5.1 Check-in
Localizar onde check-in é executado (ex: `handleCheckIn()`) e adicionar:
```jsx
const handleCheckIn = async (appointmentId) => {
  // ... código existente
  await createCheckIn(appointmentId);
  
  // ✅ ADICIONAR ESTA LINHA
  setRefreshTrigger(prev => prev + 1);
};
```
- [ ] Check-in refresh adicionado

### 5.2 Marcar Falta
Localizar onde falta é marcada e adicionar:
```jsx
const handleMarkNoShow = async (appointmentId) => {
  // ... código existente
  await updateAppointmentStatus(appointmentId, "falta");
  
  // ✅ ADICIONAR ESTA LINHA
  setRefreshTrigger(prev => prev + 1);
};
```
- [ ] Falta refresh adicionado

### 5.3 Criar Agendamento
```jsx
const handleCreateAppointment = async (data) => {
  // ... código existente
  await createAppointment(data);
  
  // ✅ ADICIONAR ESTA LINHA
  setRefreshTrigger(prev => prev + 1);
};
```
- [ ] Criar refresh adicionado

### 5.4 Finalizar Atendimento
```jsx
const handleFinishAppointment = async (appointmentId) => {
  // ... código existente
  await finishAttendance(appointmentId);
  
  // ✅ ADICIONAR ESTA LINHA
  setRefreshTrigger(prev => prev + 1);
};
```
- [ ] Finalizar refresh adicionado

---

## 🧪 PASSO 6: TESTAR (10 MIN)

### 6.1 Teste no Console
```javascript
// Abrir console (F12)
// Copiar e executar:

import { generateEncaixeSuggestions } from "@/lib/agendaSuggestionsApi";
const suggestions = await generateEncaixeSuggestions(
  "seu-clinic-uuid-aqui",
  "2026-01-14"
);
console.log(suggestions);
```
- [ ] API retorna array
- [ ] Sem erros de sintaxe
- [ ] Sem erros de tipos

### 6.2 Teste de Componente
```javascript
// No mesmo console:

import { TEST_generateSuggestions } from "@/pages/clinica/agenda/SISTEMA_SUGESTOES_TESTES.js";
await TEST_generateSuggestions();
```
- [ ] Teste 1 passa ✅
- [ ] Sem erros

### 6.3 Suite Completo
```javascript
import { runAllTests } from "@/pages/clinica/agenda/SISTEMA_SUGESTOES_TESTES.js";
await runAllTests();
```
- [ ] 7/7 testes passam ✅

### 6.4 Teste Visual
```
1. Abrir página de Agenda
2. Verificar se sugestões aparecem
3. Clicar em sugestão
4. Verificar se modal/drawer abre
5. Clicar em ação
6. Verificar se auditoria registrou
```
- [ ] UI renderiza corretamente
- [ ] Sugestões aparecem
- [ ] Cliques funcionam
- [ ] Sem erros no console

### 6.5 Teste de Permissões
```javascript
// Como recepción (role='recepcion')
// Deve ver sugestões e botões

// Como profissional (role='profissional')
// Não deve ver sugestões

// Como gestor (role='gestor')
// Deve ver tudo + métricas
```
- [ ] Recepcion vê sugestões
- [ ] Gestor vê tudo
- [ ] Profissional não vê

---

## 📊 PASSO 7: VALIDAR DADOS (5 MIN)

### 7.1 Verificar Auditoria
```sql
SELECT * FROM suggestion_audit_logs 
ORDER BY executed_at DESC 
LIMIT 10;
```
- [ ] Registros aparecem após ações
- [ ] Dados consistentes

### 7.2 Verificar Indicadores
```javascript
// No console:
import { getAgendaIndicators } from "@/lib/indicatorsApi";
const indicators = await getAgendaIndicators("clinic-uuid", "2026-01-14");
console.log(indicators);
```
- [ ] Indicadores retornam dados
- [ ] Taxa de ocupação presente
- [ ] Receita estimada presente

### 7.3 Verificar Appointments
```javascript
import { listAppointments } from "@/lib/appointmentsApi";
const apts = await listAppointments({
  clinicId: "clinic-uuid",
  start: "2026-01-14T00:00:00",
  end: "2026-01-14T23:59:59"
});
console.log(apts);
```
- [ ] Agendamentos retornam corretamente
- [ ] Status aparecem

---

## 🎯 PASSO 8: CONFIGURAR HORÁRIOS NOBRES (5 MIN)

### 8.1 Via UI
```
1. Menu > Configurações > Agenda > Horários Nobres
2. Adicionar períodos:
   - 07:00 - 09:00
   - 12:00 - 13:00
   - 17:00 - 18:00
3. Salvar
```
- [ ] Interface acessível
- [ ] Horários salvos

### 8.2 Verificar Salvamento
```sql
SELECT noble_hours_config FROM clinic_settings 
WHERE clinic_id = 'clinic-uuid';
```
- [ ] Configuração persistida
- [ ] JSON válido

---

## 🚀 PASSO 9: DEPLOY (QUANDO PRONTO)

### 9.1 Staging
```bash
# Copiar branch para staging
git checkout -b feature/sugestoes-inteligentes

# Fazer commit
git add .
git commit -m "feat: Sistema de Sugestão Inteligente de Encaixe"

# Push para staging
git push origin feature/sugestoes-inteligentes
```
- [ ] Branch criado
- [ ] Commits feitos
- [ ] Push realizado

### 9.2 Testes em Staging
```
1. Acessar ambiente staging
2. Executar suite de testes (PASSO 6)
3. Testar com dados reais
4. Verificar permissões
5. Testar em mobile/tablet
```
- [ ] Todos os testes passam
- [ ] Sem bugs críticos
- [ ] Performance OK

### 9.3 Produção
```bash
# Após aprovação:
git checkout main
git merge feature/sugestoes-inteligentes
git push origin main

# Migration já será aplicada no Supabase
```
- [ ] Merged em main
- [ ] Migration em produção
- [ ] Deploy realizado

---

## 📈 PASSO 10: MONITORAMENTO (CONTÍNUO)

### 10.1 Dashboard Analytics
```sql
-- Sugestões aceitas
SELECT 
  suggestion_type,
  action_taken,
  COUNT(*) as total
FROM suggestion_audit_logs
WHERE executed_at >= NOW() - INTERVAL '7 days'
GROUP BY suggestion_type, action_taken;
```
- [ ] Relatório executável
- [ ] Dados sendo coletados

### 10.2 Métricas de Sucesso
Monitorar diariamente:
- [ ] Taxa de ocupação (+20% esperado)
- [ ] Receita (+25% esperado)
- [ ] Sugestões aceitas (>50% esperado)
- [ ] Tamanho da fila (-70% esperado)

### 10.3 Feedback de Usuários
```
1. Coletar feedback de recepcionistas
2. Ajustar mensagens se necessário
3. Otimizar regras de sugestão
4. Documentar melhorias
```
- [ ] Feedback coletado
- [ ] Ajustes realizados (se necessário)

---

## ✅ CHECKLIST FINAL

### Antes de Produção
- [ ] Todos os 9 passos anteriores completos
- [ ] 7/7 testes passando
- [ ] Nenhum erro no console
- [ ] Permissões validadas
- [ ] Migration aplicada
- [ ] Documentação lida
- [ ] Equipe treinada

### Após Produção
- [ ] Dashboard de analytics pronto
- [ ] Métricas sendo coletadas
- [ ] Feedback sendo monitorado
- [ ] Bugs documentados
- [ ] Melhorias planejadas

---

## 📞 TROUBLESHOOTING

Se encontrar problema em algum passo:

1. **Erro de import:** Verificar caminho exato do arquivo
2. **RPC not found:** Garantir que `get_agenda_indicators` existe
3. **Permissão negada:** Verificar RLS policies e role do usuário
4. **UI não aparece:** Verificar console para erros React
5. **Dados não persistem:** Verificar migration foi aplicada

Consulte: [SISTEMA_SUGESTOES_INTELIGENTES_GUIA_COMPLETO.md#-troubleshooting](./SISTEMA_SUGESTOES_INTELIGENTES_GUIA_COMPLETO.md)

---

## 🎉 CONCLUSÃO

Após completar este checklist:
- ✅ Sistema completamente implementado
- ✅ Testes passando
- ✅ Dados sendo auditados
- ✅ Pronto para produção
- ✅ Equipe preparada

**Tempo total estimado: ~1 hora** ⏱️

---

**Versão:** 1.0  
**Data:** 2026-01-14  
**Status:** ✅ Pronto para Começar

Marca cada item conforme progride! 📋✅
