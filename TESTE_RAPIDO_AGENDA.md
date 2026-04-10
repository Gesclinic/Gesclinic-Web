# 🧪 GUIA RÁPIDO DE TESTES - AGENDA

**Data:** 14 de janeiro de 2026  
**Status:** Pronto para testar

## ⚡ TESTE RÁPIDO (5 MINUTOS)

### 1. Iniciar aplicação
```bash
npm run dev
```

### 2. Acessar a Agenda
```
http://localhost:3000/clinica/agenda
```

### 3. Teste básico - Criar agendamento
- [ ] Clique em um slot vazio (qualquer horário)
- [ ] Preencha:
  - Paciente: selecione um da lista
  - Profissional: selecione um
  - Sala: selecione uma
  - Serviço: selecione um
  - Convênio: selecione um
- [ ] Clique "Salvar"
- [ ] Verifique se aparece na timeline

### 4. Teste - Confirmar agendamento
- [ ] Clique no agendamento que criou
- [ ] Clique "Confirmar"
- [ ] Verifique se a cor mudou para verde

### 5. Teste - Cancelar agendamento
- [ ] Crie outro agendamento
- [ ] Clique nele
- [ ] Clique "Cancelar"
- [ ] Verifique se a cor mudou para vermelho

---

## 📱 TESTE POR PERFIL

### Perfil: Recepção

```
Login: recepcao@clinic.com
```

**Testes:**
- [ ] Pode criar novo agendamento? **Sim**
- [ ] Pode editar agendamento? **Sim**
- [ ] Pode editar VALOR do agendamento? **Não** (deve aparecer mensagem)
- [ ] Pode cancelar? **Não** (botão desabilitado)
- [ ] Pode fazer encaixe? **Não** (botão desabilitado)

**Resultado esperado:** ✅ Passa se funciona como acima

---

### Perfil: Profissional

```
Login: profissional@clinic.com
```

**Testes:**
- [ ] Pode criar novo agendamento? **Não** (deve aparecer mensagem)
- [ ] Pode editar agendamento existente? **Sim**
- [ ] Pode confirmar? **Sim**
- [ ] Pode cancelar? **Não** (botão desabilitado)
- [ ] Pode fazer encaixe? **Não** (botão desabilitado)

**Resultado esperado:** ✅ Passa se funciona como acima

---

### Perfil: Gestor

```
Login: gestor@clinic.com
```

**Testes:**
- [ ] Pode criar novo agendamento? **Sim**
- [ ] Pode editar agendamento? **Sim**
- [ ] Pode editar VALOR? **Sim**
- [ ] Pode confirmar? **Sim**
- [ ] Pode cancelar? **Sim**
- [ ] Pode fazer encaixe? **Sim** (botão "Encaixe")

**Resultado esperado:** ✅ Passa se funciona como acima

---

### Perfil: Admin

```
Login: admin@clinic.com
```

**Testes:**
- [ ] Pode fazer TUDO que gestor faz? **Sim**

**Resultado esperado:** ✅ Passa se funciona como acima

---

## 🔍 TESTE DETALHADO (30 MINUTOS)

### Seção 1: Visualizações

- [ ] **Modo Geral** - Ver todos os agendamentos em tabela
  - Clique na aba "Geral"
  - Deve exibir tabela com todos os horários e agendamentos
  
- [ ] **Modo Profissional** - Ver por coluna de profissional
  - Clique na aba "Profissional"
  - Deve exibir colunas de cada profissional
  - Deve ocultar filtro de profissional (já está em coluna)
  
- [ ] **Modo Sala** - Ver por coluna de sala
  - Clique na aba "Sala"
  - Deve exibir colunas de cada sala
  - Deve ocultar filtro de sala (já está em coluna)

### Seção 2: Navegação de Data

- [ ] **Botão "Anterior"** - vai para dia anterior
  - Clique "Anterior"
  - Data deve diminuir 1 dia
  
- [ ] **Botão "Próximo"** - vai para dia próximo
  - Clique "Próximo"
  - Data deve aumentar 1 dia
  
- [ ] **Botão "Hoje"** - vai para hoje
  - Clique "Anterior" várias vezes
  - Clique "Hoje"
  - Deve voltar para hoje
  
- [ ] **Botão "Semana"** - mostra coluna de semana
  - Clique "Semana"
  - Deve expandir para 7 dias (segunda a domingo)
  
- [ ] **Botão "Mês"** - mostra grade do mês
  - Clique "Mês"
  - Deve exibir grade com todos os dias do mês

### Seção 3: Indicadores

- [ ] **Taxa Ocupação** - mostra percentual
  - Deve exibir número entre 0-100%
  - Deve atualizar quando adiciona agendamentos
  
- [ ] **Total de Agendamentos** - conta todos
  - Deve atualizar quando cria/deleta
  
- [ ] **Confirmados** - conta status confirmado
  - Crie agendamento com status "a_confirmar"
  - Confirme-o
  - Número deve aumentar
  
- [ ] **Faltas** - conta status falta
  - Deve atualizar corretamente
  
- [ ] **Encaixes** - conta status encaixe
  - Crie encaixe
  - Número deve aumentar

### Seção 4: Filtros

- [ ] **Filtro Profissional** (em modo Geral)
  - Selecione um profissional
  - Deve filtrar apenas agendamentos daquele profissional
  
- [ ] **Filtro Sala** (em modo Geral e Profissional)
  - Selecione uma sala
  - Deve filtrar apenas agendamentos daquela sala
  
- [ ] **Filtro Status**
  - Selecione "Confirmado"
  - Deve mostrar apenas confirmados
  - Deselecione
  - Deve mostrar novamente
  
- [ ] **Filtro Convênio**
  - Selecione um convênio
  - Deve filtrar por convênio
  
- [ ] **Filtro Serviço**
  - Selecione um serviço
  - Deve filtrar por serviço
  
- [ ] **Botão Limpar Filtros**
  - Adicione alguns filtros
  - Clique "Limpar Filtros"
  - Deve voltar a mostrar todos

### Seção 5: Modal de Agendamento

- [ ] **Abrir Modal**
  - Clique em um slot vazio
  - Deve abrir modal
  
- [ ] **Aba Agendamento**
  - Deve ter campos: Data, Hora, Profissional, Sala, Serviço, Observações
  - Todos pré-preenchidos se veio de slot específico
  
- [ ] **Aba Paciente**
  - Deve permitir selecionar paciente
  - Deve buscar lista de pacientes
  
- [ ] **Aba Financeiro**
  - Deve ter campos: Convênio, Valor, Status
  - Deve estar desabilitado para recepcao (em edição)
  
- [ ] **Aba Histórico**
  - Deve listar mudanças (criação, edições, status)
  - Deve mostrar who, what, when

### Seção 6: Operações CRUD

- [ ] **CREATE** - Criar novo
  - [ ] Clique slot vazio
  - [ ] Preencha dados
  - [ ] Clique "Salvar"
  - [ ] Deve aparecer na timeline
  - [ ] Deve estar no Supabase
  
- [ ] **READ** - Ler agendamentos
  - [ ] Página carrega agendamentos do Supabase
  - [ ] Podem filtrar
  - [ ] Podem ver detalhes ao clicar
  
- [ ] **UPDATE** - Editar
  - [ ] Clique em agendamento existente
  - [ ] Mude dados (profissional, sala, etc)
  - [ ] Clique "Salvar"
  - [ ] Deve atualizar na timeline
  - [ ] Deve estar atualizado no Supabase
  
- [ ] **DELETE** - Deletar
  - [ ] Clique em agendamento
  - [ ] Clique "Cancelar" (soft delete)
  - [ ] Deve aparecer como cancelado (vermelho)
  - [ ] Status no Supabase deve ser "cancelado"

### Seção 7: Erros e Validações

- [ ] **Erro: Paciente obrigatório**
  - Tente salvar sem preencher paciente
  - Deve exibir mensagem de erro
  
- [ ] **Erro: Campo obrigatório**
  - Tente salvar campos vazios obrigatórios
  - Deve exibir mensagem
  
- [ ] **Erro: Sem permissão**
  - Sendo recepção, tente editar valor
  - Deve exibir: "Recepção não tem permissão..."
  
- [ ] **Erro: Conflito de horário**
  - Crie 2 agendamentos no mesmo horário/profissional
  - Deve aceitar (ou bloquear conforme regra de negócio)

### Seção 8: Performance

- [ ] **Carga inicial rápida**
  - Deve carregar em < 2 segundos
  
- [ ] **Filtros responsivos**
  - Deve filtrar em tempo real sem lag
  
- [ ] **Modal abre rápido**
  - Modal deve abrir imediatamente (< 500ms)
  
- [ ] **Sem freezes**
  - Ao adicionar múltiplos agendamentos
  - Não deve congelar interface

---

## 📊 TABELA DE TESTE

| Teste | Esperado | Resultado | Status |
|-------|----------|-----------|--------|
| Criar agendamento | Cria novo | ✅ | PASS/FAIL |
| Editar agendamento | Atualiza | ✅ | PASS/FAIL |
| Confirmar | Status = confirmado | ✅ | PASS/FAIL |
| Cancelar | Status = cancelado | ✅ | PASS/FAIL |
| Encaixe | Cria com status encaixe | ✅ | PASS/FAIL |
| Permissão recepcao | Bloqueia certas ações | ✅ | PASS/FAIL |
| Permissão profissional | Bloqueia certas ações | ✅ | PASS/FAIL |
| Permissão gestor | Permite tudo | ✅ | PASS/FAIL |
| Permissão admin | Permite tudo | ✅ | PASS/FAIL |
| Filtros funcionam | Filtra corretamente | ✅ | PASS/FAIL |
| Modal abre/fecha | Abre ao clicar, fecha ao salvar | ✅ | PASS/FAIL |

---

## 🐛 SE ENCONTRAR ERROS

### Erro: "clinic_id e patient_id são obrigatórios"
- **Causa:** Faltou preencher paciente no formulário
- **Solução:** Preencha o campo "Paciente"

### Erro: "Você não tem permissão"
- **Causa:** Seu perfil não pode fazer essa ação
- **Solução:** Verifique sua permissão no arquivo `AJUSTES_AGENDA_CONCLUIDOS.md`

### Erro: "Agendamento não aparece"
- **Causa:** Pode estar filtrado ou em outro dia
- **Solução:** Limpe filtros, verifique data, recarregue página (F5)

### Erro: "Banco de dados não responde"
- **Causa:** Problema com Supabase
- **Solução:** Verifique `.env`, verifique conexão internet, tente recarregar

### Erro: "Modal não abre"
- **Causa:** Possível erro JavaScript
- **Solução:** Abra F12, veja console, procure por mensagens de erro

---

## ✅ CHECKLIST FINAL

Antes de considerar pronto:

- [ ] Criar agendamento funciona
- [ ] Editar funciona
- [ ] Confirmar funciona
- [ ] Cancelar funciona
- [ ] Encaixe funciona
- [ ] Todos os 4 perfis testados
- [ ] Sem erros no console (F12)
- [ ] Sem erros no Supabase
- [ ] Modal abre e fecha corretamente
- [ ] Filtros funcionam
- [ ] Indicadores atualizam
- [ ] Timeline mostra cores corretas
- [ ] Responsivo em mobile (teste com F12 → device)
- [ ] Performance aceitável (< 2s para carregar)

---

## 🎯 RESULTADO

Quando todos os testes passarem: ✅ **PRONTO PARA PRODUÇÃO**

---

**Desenvolvido em:** 14 de janeiro de 2026  
**Tempo estimado:** 5-30 minutos de testes  
**Status:** ✅ Pronto para testar
