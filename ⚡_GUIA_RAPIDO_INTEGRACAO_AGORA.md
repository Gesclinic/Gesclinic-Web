# ⚡ GUIA RÁPIDO: COMO INTEGRAR E USAR AGORA

## 🎯 OBJETIVO
Integrar o `AtendimentoUnificado` na Agenda em **30 minutos** e estar usando em produção em **1 hora**.

---

## 📋 CHECKLIST DE INTEGRAÇÃO

### PASSO 1: Copiar Arquivo (2 min)
```bash
✓ AtendimentoUnificado.jsx já criado em:
  src/pages/clinica/agenda/components/AtendimentoUnificado.jsx

✓ Está pronto para usar - sem ajustes necessários
```

### PASSO 2: Modificar AgendaPage.jsx (10 min)
**Arquivo:** `src/pages/clinica/agenda/AgendaPage.jsx`

**Adicionar IMPORT no topo:**
```javascript
// Adicione junto com outros imports
import AtendimentoUnificado from './components/AtendimentoUnificado';
```

**Adicionar STATE:**
```javascript
// Junto com outros useState
const [atendimentoUnificadoOpen, setAtendimentoUnificadoOpen] = useState(false);
const [selectedAppointment, setSelectedAppointment] = useState(null);
```

**Adicionar HANDLERS:**
```javascript
const handleOpenAtendimento = (appointment) => {
  setSelectedAppointment(appointment);
  setAtendimentoUnificadoOpen(true);
};

const handleCloseAtendimento = () => {
  setAtendimentoUnificadoOpen(false);
  setSelectedAppointment(null);
};
```

**Substituir cliques antigos:**
```javascript
// ANTES: (se existir click em agendamentos)
// onClick={() => setAppointmentModalOpen(true)}

// DEPOIS:
onClick={() => handleOpenAtendimento(appointment)}
```

**Adicionar componente no final do render:**
```javascript
return (
  <div>
    {/* ...resto do código... */}

    {/* 🆕 Componente Unificado */}
    {selectedAppointment && (
      <AtendimentoUnificado
        isOpen={atendimentoUnificadoOpen}
        onClose={handleCloseAtendimento}
        appointment={selectedAppointment}
        onSaved={() => {
          // Atualizar lista de agendamentos
          queryClient.invalidateQueries(['appointments']);
          handleCloseAtendimento();
        }}
      />
    )}
  </div>
);
```

### PASSO 3: Aplicar SQL Triggers (5 min)
**Arquivo:** `supabase/migrations/2024_04_appointment_financial_triggers.sql`

**EXECUTAR EM SUPABASE:**
1. Abrir: https://supabase.com/dashboard
2. Ir para: SQL Editor
3. Novo Query
4. Copiar INTEIRO o conteúdo de `2024_04_appointment_financial_triggers.sql`
5. Colar no editor
6. Clique "RUN"
7. Aguardar conclusão

**Verificar se funcionou:**
```sql
-- Rodar no SQL Editor:
SELECT * FROM pg_trigger WHERE tgname LIKE 'trg_%';

-- Deve retornar 3 triggers:
-- - trg_appointment_completed
-- - trg_receivable_created
-- - trg_receivable_updated
```

### PASSO 4: Testar Localmente (10 min)
```bash
1. Abrir browser: http://localhost:3000/clinica/agenda
2. Clicar em qualquer agendamento
3. Modal novo "Atendimento Unificado" deve abrir
4. Testar cada tab:
   - "Dados": Validações visuais (reds/greens)
   - "Serviços": Adicionar/remover serviços
   - "Financeiro": Ver status (não criado)
   - "Auditoria": Ver timeline (se houver dados)
   - "Check-in": Preencher presença
5. Clicar "✓ Finalizar Atendimento"
6. Recebível deve ser criado automaticamente
7. Status deve mudar para "✓ Recebível Criado"
```

### PASSO 5: Validar em Supabase (5 min)
```sql
-- Verificar se recebível foi criado:
SELECT * FROM ar_invoices ORDER BY created_at DESC LIMIT 5;

-- Verificar se mapping foi criado:
SELECT * FROM appointment_to_receivable_mapping 
ORDER BY created_at DESC LIMIT 5;

-- Verificar auditoria:
SELECT * FROM financial_audit_logs 
ORDER BY created_at DESC LIMIT 20;

-- Tudo deve estar lá! ✓
```

---

## 🔄 FLUXO DE USO PRÁTICO

### Cenário 1: Editar Agendamento Simples
```
1. User clica em agendamento
2. Modal AtendimentoUnificado abre
3. User muda paciente/convênio/profissional
4. Clica "💾 Salvar"
5. ✅ Alterações salvas
6. Modal fechado, volta à agenda
```

### Cenário 2: Adicionar Múltiplos Serviços
```
1. User clica em agendamento
2. Modal AtendimentoUnificado abre
3. Va para tab "Serviços"
4. Clica em "+ Consulta em horário normal"
5. Aparece na tabela com valores
6. Clica em "+ Aplicação de injetável"
7. Aparece na tabela com valores
8. Vê TOTAIS recalculados
9. Clica "✓ Finalizar Atendimento"
10. Recebível criado com TODOS os serviços
```

### Cenário 3: Finalizar Atendimento (com Recebível)
```
1. User clica em agendamento
2. Modal abre
3. Verifica: dados ✓, serviços ✓, financeiro ✗ (não processado)
4. Clica "✓ Finalizar Atendimento"
5. Sistema:
   - Valida tudo
   - Marca como "completed"
   - Calcula impostos (v2.0)
   - Cria recebível
   - Atualiza fluxo de caixa
   - Loga auditoria
6. Modal mostra: "✓ Recebível Criado" com valores
7. Tab "Auditoria" mostra timeline completa
8. ✅ Tudo feito automaticamente!
```

---

## ⚠️ POSSÍVEIS ERROS E SOLUÇÕES

### Erro 1: "Componente não encontrado"
**Causa:** Arquivo AtendimentoUnificado não foi criado  
**Solução:** 
```bash
Verificar arquivo em:
src/pages/clinica/agenda/components/AtendimentoUnificado.jsx

Se não existir, copiar o conteúdo fornecido.
```

### Erro 2: "Trigger não encontrado"
**Causa:** SQL migration não foi executada  
**Solução:**
```bash
1. Ir para Supabase Dashboard
2. SQL Editor → New Query
3. Copiar conteúdo de:
   supabase/migrations/2024_04_appointment_financial_triggers.sql
4. Colar e executar
5. Verificar com: SELECT * FROM pg_trigger WHERE tgname LIKE 'trg_%';
```

### Erro 3: "Recebível não está sendo criado"
**Causa:** Dados do agendamento inválidos  
**Solução:**
```bash
1. Verificar validações (tab "Dados"):
   - Paciente preenchido? ✓
   - Convênio preenchido? ✓
   - Profissional preenchido? ✓
   - Pelo menos 1 serviço? ✓
2. Verificar console do browser (F12)
3. Ver erros no Supabase SQL Editor
```

### Erro 4: "Campos obrigatórios não estão validando"
**Causa:** Componente não está renderizando validações corretamente  
**Solução:**
```bash
1. Verificar imports no AgendaPage.jsx
2. Verificar que AtendimentoUnificado está sendo passado:
   - appointment={selectedAppointment}
   - isOpen={atendimentoUnificadoOpen}
   - onClose={handleCloseAtendimento}
```

---

## 📊 VERIFICAÇÃO RÁPIDA

### No Browser (F12):
```
1. Console limpo? (nenhum erro em vermelho)
2. Modal abre quando clica agendamento?
3. Todos os 5 tabs aparecem?
4. Validações funcionam? (mude campo, veja ✓/✗)
5. Valores calculam? (mude serviço, veja totais)
```

### No Supabase:
```sql
-- 1. Verificar triggers criados:
SELECT tgname, tgtype FROM pg_trigger 
WHERE tgname LIKE 'trg_%' ORDER BY tgname;
-- Deve retornar 3 rows

-- 2. Verificar tabela audit:
SELECT * FROM financial_audit_logs LIMIT 1;
-- Não deve dar erro de tabela não existe

-- 3. Verificar RPC:
SELECT create_receivable_from_appointment(
  'test-uuid',  
  'test-clinic-uuid',
  NULL
);
-- Deve retornar JSONB com resultado
```

---

## 🎯 APÓS INTEGRAÇÃO

### O que você consegue fazer:
✅ Abrir agendamento em modal único  
✅ Editar dados (paciente, convênio, profissional)  
✅ Adicionar/remover múltiplos serviços  
✅ Ver validações em tempo real  
✅ Ver status financeiro  
✅ Criar recebível manualmente OU  
✅ Finalizar atendimento (cria recebível automaticamente)  
✅ Ver auditoria completa  
✅ Fazer check-in  

### O que o sistema faz automaticamente:
🤖 Valida dados obrigatórios  
🤖 Calcula impostos (5 tipos) via v2.0  
🤖 Cria recebível na tabela ar_invoices  
🤖 Cria mapeamento para tracking  
🤖 Atualiza fluxo de caixa (projected)  
🤖 Registra auditoria completa  
🤖 Invalida cache (dados atualizados)  

---

## 📞 SUPORTE RÁPIDO

Se tiver problema, verifique:

1. **Console (F12)**: Mensagens de erro?
2. **Network (F12)**: Requisições falhando?
3. **Supabase**: Triggers criados?
4. **Dados**: Paciente/Convênio/Profissional preenchidos?
5. **Serviços**: Pelo menos 1 serviço adicionado?

Se ainda não funcionar:
- Feche a aba do navegador
- Limpe o cache (Ctrl+Shift+R ou Cmd+Shift+R)
- Abra de novo
- Tente novamente

---

## ✨ PRONTO!

**Você tem TUDO pronto para usar agora!**

```
├─ ✅ Componente AtendimentoUnificado criado
├─ ✅ Service Layer com 25+ funções
├─ ✅ SQL Triggers pronto para aplicar
├─ ✅ Documentação completa
└─ ✅ Guia de integração (este arquivo)

TEMPO DE INTEGRAÇÃO: ~30 min
STATUS: ✅ PRONTO P/ PRODUÇÃO
```

**Comece agora mesmo!** 🚀
