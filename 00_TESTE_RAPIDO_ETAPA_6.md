# 🧪 TESTE RÁPIDO - ETAPA 6

## Validando ETAPA 6: Validações e Regras UX

Siga este guia para testar rapidamente os componentes criados em ETAPA 6.

---

## ✅ Teste 1: Health Check Monitor

### Localização
- **Arquivo:** `src/pages/clinica/agenda/AgendaPage.jsx`
- **Página:** Agenda (http://localhost:3000/clinica/agenda)

### Passos
1. Navegar para Agenda
2. Olhar para o topo da página (abaixo do header)
3. **Esperado:** Ver badges com status:
   - ✓ Database (verde se conectado)
   - ✓ Profissionais (mostra número)
   - ✓ Serviços (mostra número)
   - ✓ Salas (mostra número)
   - ✓ Convênios (mostra número)

### Verificação de Erro
1. Se faltarem profissionais ou serviços:
   - Deve aparecer **aviso amarelo/vermelho**
   - Deve oferecer link para resolver

### ✓ Sucesso
Health check aparece e mostra corretamente o status

---

## ✅ Teste 2: Validation de Campo de Email

### Localização
- Qualquer formulário com email (ou crie um com ValidatedFormField)
- Para testar: Abrir DevTools e encontrar um campo

### Passos
1. Clicar no campo de email
2. Digitar algo inválido: `teste@`
3. **Esperado:** 
   - Borda ficar vermelha
   - Ícone ✗ aparecer
   - Mensagem de erro: "Email inválido"

4. Corrigir para: `teste@email.com`
5. **Esperado:**
   - Borda ficar verde
   - Ícone ✓ aparecer
   - Mensagem desaparecer

### ✓ Sucesso
Campo valida e mostra feedback visual em tempo real

---

## ✅ Teste 3: RulesAlert - Regras Incompletas

### Localização
- **Arquivo:** `src/pages/clinica/financeiro/RepasseMedico.jsx`
- **Página:** Financeiro > Repasse Médico

### Passos
1. Navegar para Financeiro (menu lateral)
2. Clicar em "Repasse Médico"
3. **Esperado:** Ver alerta no topo mostrando status de regras

### Expandir Detalhes
1. Clicar no alerta para expandir
2. **Esperado:** Ver contadores:
   - 📅 Regras de Agenda: X/Y ativas
   - 💰 Regras de Repasse: X/Y ativas
   - ✅ Regras de Check-in: X/Y ativas

3. Se alguma está desativada:
   - Ver link "⚙️ Gerenciar Regras"
   - Clicar leva para configuração

### ✓ Sucesso
RulesAlert aparece e mostra corretamente o status de regras

---

## ✅ Teste 4: Select Dinâmico (Cascata)

### Localização
- **Arquivo:** `src/components/AppointmentFormWithValidation.jsx`
- Para testar: Use um formulário de agendamento com profissional + serviço

### Passos
1. Abrir formulário de agendamento
2. Campo "Profissional": vazio (desabilitado)
3. Selecionar um profissional
4. **Esperado:**
   - Campo "Serviço" se habilita
   - Mostra "Carregando serviços..."
   - Aguarda 1-2 segundos
   - Lista de serviços aparece

5. Selecionar um serviço
6. **Esperado:**
   - Serviço é selecionado
   - Pode prosseguir com formulário

### ✓ Sucesso
Select dinâmico carrega corretamente os dados em cascata

---

## ✅ Teste 5: Validação de Formulário Completo

### Localização
- **Componente:** `AppointmentFormWithValidation`
- **Teste:** Preencher formulário de agendamento

### Passos
1. Abrir formulário de agendamento
2. Deixar tudo em branco
3. Ver indicador no final: **"Existem erros no formulário"**
4. Botão enviar está **desabilitado** (cinza)

5. Preencher campos:
   - Data: `2026-01-20`
   - Hora Inicial: `09:00`
   - Hora Final: `10:00`
   - Paciente: selecionar
   - Profissional: selecionar
   - Serviço: selecionar
   - Convênio: selecionar

6. **Esperado:** 
   - Todos os campos ficam ✓ verdes
   - Indicador muda para: **"✅ Formulário válido - pronto para enviar"**
   - Botão enviar se habilita (azul)

### ✓ Sucesso
Formulário valida corretamente e habilita submit apenas quando tudo é válido

---

## ✅ Teste 6: Smart Tips (Dicas Inteligentes)

### Localização
- **Componente:** `SmartTips`
- Integrado em `AppointmentFormWithValidation`

### Passos
1. Abrir formulário de agendamento
2. Clicar no campo "Data"
3. **Esperado:** Dica aparece: "📅 Selecione uma data"

4. Clicar no campo "Profissional"
5. **Esperado:** Dica aparece: "👤 Profissional obrigatório"

6. Selecionar profissional sem selecionar serviço
7. **Esperado:** Dica aparece: "💼 Selecione um serviço"

8. Clicar no X da dica
9. **Esperado:** Dica desaparece (dismissível)

### ✓ Sucesso
SmartTips mostra dicas contextuais conforme o usuário preenche

---

## ✅ Teste 7: PreAppointmentChecklist

### Localização
- **Componente:** `PreAppointmentChecklist`
- Dentro de `SmartTips`

### Passos
1. Abrir formulário de agendamento
2. Procurar por checklist visual
3. **Esperado:** Ver checklist com items:
   - ✓ Dados do paciente completos
   - ✓ Autorização do convênio
   - ✓ Profissional disponível
   - ✓ Serviço disponível

4. Cada item mostra:
   - ✗ Se faltando (cinza)
   - ✓ Se completo (verde)

5. Barra de progresso no topo mostrando %
6. Quando tudo OK: Mensagem "🎉 Tudo pronto para criar o agendamento!"

### ✓ Sucesso
Checklist mostra progresso visual clara e mensagem de sucesso

---

## 📋 Checklist de Verificação

### Hooks
- [ ] useFormValidation importa corretamente
- [ ] Validadores funcionam (email, required, etc)
- [ ] validateAll() bloqueia submit se erro
- [ ] resetForm() limpa campos

### Componentes
- [ ] ValidatedFormField mostra ✓ e ✗
- [ ] HealthCheckMonitor aparece na Agenda
- [ ] RulesAlert aparece na Financeiro
- [ ] SmartTips mostra dicas contextuais
- [ ] AppointmentFormWithValidation integra tudo

### Integrações
- [ ] AgendaPage: HealthCheckMonitor presente
- [ ] RepasseMedico: RulesAlert presente
- [ ] Sem erros no console
- [ ] Sem breaking changes

### Documentação
- [ ] `00_ETAPA_6_VALIDACOES_UX_COMPLETA.md` exists
- [ ] `00_ETAPA_6_RESUMO_RAPIDO.md` exists
- [ ] `00_ETAPA_6_INDEX_VISUAL.md` exists
- [ ] `🎉_ETAPA_6_ENTREGA_FINAL.md` exists

---

## 🐛 Se Algo Não Funcionar

### Erro: "Cannot find module useFormValidation"
```
Solução:
1. Verificar arquivo existe: src/hooks/useFormValidation.js
2. Verificar import: import { useFormValidation } from '@/hooks/useFormValidation'
3. Verificar @ alias está configurado
```

### Erro: "HealthCheckMonitor is not defined"
```
Solução:
1. Verificar arquivo existe: src/components/HealthCheckMonitor.jsx
2. Verificar import está presente em AgendaPage.jsx
3. Verificar export default no componente
```

### Erro: "Select options empty"
```
Solução:
1. Verificar banco de dados tem dados
2. Verificar queries estão corretas
3. Verificar loadCascade está sendo chamado
4. Ver console para erros de API
```

### Componente não aparece na página
```
Solução:
1. Abrir DevTools (F12)
2. Ver Console para erros
3. Verificar Network para API calls
4. Verificar sintaxe de JSX
```

---

## 📊 Resultado Esperado

Após passar todos os testes:
✅ Health Check mostrando status do sistema
✅ Campos com validação visual em tempo real
✅ Selects dinâmicos carregando corretamente
✅ Dicas inteligentes guiando o usuário
✅ Checklist de progresso visual
✅ Formulário bloqueando submit até validar
✅ Rules Alert mostrando configurações

---

## 🎊 Conclusão

Se todos os testes passarem, ETAPA 6 está **100% FUNCIONAL** ✅

Pode prosseguir para **ETAPA 7** com confiança!

---

**Tempo de Teste Estimado:** 10-15 minutos
**Dificuldade:** Fácil (testes visuais)
**Acesso:** Qualquer browser moderno

Boa sorte! 🚀
