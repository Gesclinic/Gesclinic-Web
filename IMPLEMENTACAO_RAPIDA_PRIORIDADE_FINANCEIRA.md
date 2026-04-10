# ⚡ Implementação Rápida - Prioridade Financeira

**Tempo:** 30 minutos para produção  
**Dificuldade:** 🟢 Fácil

---

## 🎯 Resumo do Que Será Implementado

O sistema de Prioridade Financeira adiciona uma **segunda camada de sugestões** ao seu Agenda:

```
Agenda Atual
├─ Sugestões de Encaixe (SLOT_LIVRE, NO_SHOW, etc)
│
└─ ✨ NOVO: Sugestões Financeiras (Score 0-100)
   ├─ Ordena por lucratividade
   ├─ Mostra score para gestor
   ├─ Registra auditoria
   └─ Integrado com Agenda
```

---

## 📦 Arquivos Criados

```
✅ src/lib/financialPriorityApi.js
   → Cálculos de score financeiro

✅ src/pages/clinica/agenda/components/FinancialPrioritySuggestions.jsx
   → UI para exibir sugestões

✅ src/pages/clinica/agenda/components/CombinedAgendaSuggestions.jsx
   → Integração com sugestões normais

✅ src/pages/clinica/agenda/hooks/useFinancialPrioritySuggestions.js
   → Hook customizado para gerenciar estado

✅ Documentação + Testes + Exemplos
   → Guias, testes automatizados, código pronto
```

---

## 🚀 3 PASSOS PARA PRODUÇÃO

### PASSO 1: Validar Banco de Dados (2 min)

Verifique que suas tabelas têm:

```sql
-- Tabela: waitlist
SELECT * FROM waitlist;
-- Deve ter: id, patient_id, service_id, status, ...

-- Tabela: services
SELECT * FROM services;
-- Deve ter: id, name, value, duration_minutes, type, default_repasse

-- Tabela: appointments
SELECT * FROM appointments;
-- Deve ter: id, clinic_id, patient_id, status, ...
```

✅ Se todas as colunas existem, **próximo passo!**

### PASSO 2: Copiar Arquivos (3 min)

Copie os 5 arquivos para seu projeto:

```bash
# Backend
cp financialPriorityApi.js src/lib/

# Frontend - Componentes
cp FinancialPrioritySuggestions.jsx src/pages/clinica/agenda/components/
cp CombinedAgendaSuggestions.jsx src/pages/clinica/agenda/components/

# Frontend - Hook
cp useFinancialPrioritySuggestions.js src/pages/clinica/agenda/hooks/
```

### PASSO 3: Integrar na Página de Agenda (5 min)

**Antes:**
```javascript
// src/pages/clinica/agenda/AgendaPage.jsx
function AgendaPage() {
  return (
    <div>
      {/* Componentes da agenda... */}
    </div>
  );
}
```

**Depois:**
```javascript
import useFinancialPrioritySuggestions from './hooks/useFinancialPrioritySuggestions';
import CombinedAgendaSuggestions from './components/CombinedAgendaSuggestions';

function AgendaPage() {
  const { clinicId } = useClinicContext();
  const { user } = useAuth();
  const [selectedDate] = useState('2026-01-14');

  // Carregar sugestões financeiras
  const {
    suggestions: financialSuggestions,
    loading: loadingFinancial,
    error: errorFinancial,
  } = useFinancialPrioritySuggestions(clinicId, selectedDate);

  return (
    <div>
      {/* Seus componentes... */}
      
      {/* NOVO: Sugestões Financeiras */}
      <CombinedAgendaSuggestions
        financialSuggestions={financialSuggestions}
        loadingFinancial={loadingFinancial}
        errorFinancial={errorFinancial}
        onFinancialSuggestionAction={handleFinancialAction}
        userRole={user.role}
      />
    </div>
  );
}
```

---

## ✅ Validação Rápida (5 min)

Após integração, teste no console:

```javascript
// 1. Importar funções de teste
import { runAllTests } from './SISTEMA_TESTES_PRIORIDADE_FINANCEIRA.js';

// 2. Executar suite
await runAllTests();

// 3. Resultado esperado: 8/8 testes ✅
```

---

## 🧪 Teste Manual (15 min)

### Teste 1: Ver Sugestões

1. Abra a página de Agenda
2. Procure pela seção "💰 Sugestões Inteligentes por Prioridade Financeira"
3. Deve exibir sugestões se houver pacientes em lista de espera

### Teste 2: Verificar Score (apenas Gestor)

1. Faça login como gestor
2. Expanda uma sugestão
3. Deve ver:
   - Score numérico (0-100)
   - Valor estimado
   - Margem
   - Análise financeira

### Teste 3: Criar Encaixe

1. Clique em "Criar Encaixe" em uma sugestão
2. Sistema deve abrir modal/form
3. Após criar, auditoria é registrada

### Teste 4: Permissões

1. **Recepção**: Vê apenas ALTA/MEDIA/BAIXA (sem número)
2. **Gestor**: Vê score numérico (78, 45, etc)
3. **Profissional**: Não vê nada
4. **Admin**: Vê tudo

---

## 📊 Exemplo: Sugestão Financeira

```json
{
  "id": "sugg-001",
  "patient_name": "João Silva",
  "service_name": "Consulta Dermatologia",
  "valor_estimado": 250,
  "margem_estimada": 150,
  "duracao_minutos": 30,
  "score_financeiro": 78,
  "prioridade": "ALTA",
  "justificativa": "Maior receita por hora • Paciente confiável"
}
```

**Interpretação:**
- ✅ Score 78 = Muito bom (ALTA)
- ✅ R$ 250 de receita
- ✅ R$ 150 de margem
- ✅ 30 minutos de duração
- ✅ Paciente sem no-shows

---

## 🎯 Checklist Final

- [ ] Arquivos copiados
- [ ] Componentes importados
- [ ] Hook integrado
- [ ] Sugestões aparecem
- [ ] Score visível (gestor)
- [ ] Botões funcionam
- [ ] Testes passam 8/8
- [ ] Permissões funcionam

---

## 🚨 Troubleshooting

### Problema: Nenhuma sugestão aparecer

**Solução:** 
1. Verifique se há pacientes em lista de espera
2. Verifique logs: `console.log()` em `useFinancialPrioritySuggestions`
3. Validate chamada em `generateFinancialPrioritySuggestions()`

```javascript
// Debug no console
const { suggestions } = useFinancialPrioritySuggestions(clinicId, date);
console.log('Sugestões carregadas:', suggestions); // Deve ter dados
```

### Problema: Score sempre igual

**Solução:**
Verifique se `calculateFinancialPriorityScore()` está recebendo parâmetros corretos:

```javascript
const score = calculateFinancialPriorityScore({
  valor_servico: 250,      // ✅ Número
  tipo_pagamento: 'particular',  // ✅ String válida
  duracao_servico: 30,     // ✅ Número > 0
  margem_estimada: 150,    // ✅ Número >= 0
  no_show_count: 0,        // ✅ Número
  tipo_atendimento: 'consulta',  // ✅ String válida
});
```

### Problema: Gestor não vê score numérico

**Solução:**
Verifique se `userRole` está sendo passado corretamente:

```javascript
// Verificar no DevTools
const { user } = useAuth();
console.log('User role:', user.role); // Deve ser 'gestor'

<FinancialPrioritySuggestions
  userRole={user.role}  // ✅ Passar role
  ...
/>
```

### Problema: Auditoria não registra

**Solução:**
Certifique-se que `suggestion_audit_logs` table existe:

```sql
SELECT * FROM suggestion_audit_logs LIMIT 1;
-- Se não existir, aplicar migration SQL
```

---

## 📈 Próximos Passos (Opcional)

Após implementação básica:

1. **Customizar Pesos**: Ajuste `DEFAULT_WEIGHTS` conforme sua clínica
2. **Analytics**: Adicione dashboard com `getFinancialSuggestionsStats()`
3. **Notificações**: Envie SMS/Email quando novo score alto aparecer
4. **Machine Learning**: Colete dados e treine modelo preditivo

---

## 📞 Suporte Rápido

Arquivo | Propósito
---------|----------
[financialPriorityApi.js](../lib/financialPriorityApi.js) | Cálculos e API
[FinancialPrioritySuggestions.jsx](./components/FinancialPrioritySuggestions.jsx) | Componente UI
[useFinancialPrioritySuggestions.js](./hooks/useFinancialPrioritySuggestions.js) | Hook
[GUIA_PRIORIDADE_FINANCEIRA_COMPLETO.md](./GUIA_PRIORIDADE_FINANCEIRA_COMPLETO.md) | Documentação Completa
[SISTEMA_TESTES_PRIORIDADE_FINANCEIRA.js](./SISTEMA_TESTES_PRIORIDADE_FINANCEIRA.js) | Testes

---

**Tempo total: 30 minutos ⏱️**

**Status: Pronto para produção em 3 passos simples! 🎉**
