# 🧪 GUIA DE TESTES - RECEPÇÃO DRAWER

**Objetivo**: Validar que a integração da Recepção como drawer flutuante está funcionando corretamente.

---

## ✅ CHECKLIST DE VALIDAÇÃO

### 1. **Compilação**
- [x] `npm run build` passou sem erros
- [x] 3325 módulos transformados
- [x] Nenhum erro de import ou sintaxe
- [x] Arquivo gerado em `dist/`

### 2. **Arquivo RecepcaoDrawer**
- [ ] Arquivo criado em `src/pages/clinica/recepcao/RecepcaoDrawer.jsx`
- [ ] Contém 200+ linhas de código
- [ ] Importa `AtendimentoModal` corretamente
- [ ] Importa todos os hooks necessários

### 3. **Integração na Agenda**
- [ ] Importação adicionada em `index.jsx`
- [ ] Estado `recepcaoDrawerOpen` adicionado
- [ ] Botão 🎫 Recepção aparece na toolbar
- [ ] Botão toggle funciona (abre/fecha)

---

## 🧪 PROCEDIMENTO DE TESTE MANUAL

### **Pré-requisitos**
```bash
# Garantir que o servidor está rodando
npm run dev

# Ou, se porta 3000 está em uso:
# Kill todos os node processes e reiniciar
```

### **Teste 1: Botão de Recepção**
1. Abrir agenda em `http://localhost:3000/clinica/agenda`
2. Na barra de ferramentas, procurar por botão **🎫 Recepção**
3. Verificar:
   - [ ] Botão existe e é visível
   - [ ] Está ao lado do botão de WhatsApp
   - [ ] Tem ícone 🎫 e texto "Recepção"
   - [ ] É verde quando fechado, mais escuro quando aberto

### **Teste 2: Abrir Drawer**
1. Clicar no botão **🎫 Recepção**
2. Verificar:
   - [ ] Drawer abre suavemente do lado direito
   - [ ] Fundo escurece (overlay 50% preto)
   - [ ] Header mostra "🎫 Recepção"
   - [ ] Subtítulo: "Pacientes agendados para hoje"
   - [ ] Botão X aparece no canto superior direito
   - [ ] Max-width (~500px) deixa agenda visível ao fundo

### **Teste 3: Carregar Agendamentos**
1. Com drawer aberto, verificar:
   - [ ] Search bar aparece com placeholder "Buscar paciente ou horário..."
   - [ ] Lista de agendamentos carrega (pode estar vazia se nenhum para hoje)
   - [ ] Se houver agendamentos:
     - [ ] Aparecem ordenados por horário crescente
     - [ ] Cada um mostra: horário, nome, serviço, profissional, convênio
     - [ ] Botão "Chegou" está disponível
   - [ ] Se vazio: mensagem "Nenhum agendamento encontrado"

### **Teste 4: Busca Entre Agendamentos**
1. Com vários agendamentos, digitar nome num agendamento:
   - [ ] Lista filtra em tempo real
   - [ ] Não precisa clicar Enter
   - [ ] Limpar campo mostra todos novamente
2. Digitar horário (ex: "14:30"):
   - [ ] Filtra por horário também
3. Digitar texto inválido:
   - [ ] Mostra "Nenhum agendamento encontrado"

### **Teste 5: Registrar Chegada**
1. Clicar [Chegou] em um agendamento:
   - [ ] Botão desaparece e muda para [Atender]
   - [ ] Fundo do item fica com borda verde
   - [ ] Badge "Presença registrada" aparece
   - [ ] Senha apareça: "🎟 Senha: 001"
2. Clicar [Chegou] em outro agendamento:
   - [ ] Senha é "002" (sequencial)
   - [ ] Terceiro recebe "003", etc.

### **Teste 6: Persistência de Senhas**
1. Registrar chegadas de 2-3 agendamentos
2. Recarregar página (F5)
3. Verificar:
   - [ ] Drawer abre com histórico mantido
   - [ ] Senhas aparecem iguais (001, 002, etc.)
   - [ ] Badges "Presença registrada" continuam presentes

### **Teste 7: Fechar Drawer**
1. Clicar X no header:
   - [ ] Drawer fecha suavemente
   - [ ] Overlay desaparece
   - [ ] Agenda fica totalmente visível
2. Clicar no overlay (fundo escuro):
   - [ ] Drawer fecha
3. Clicar novamente em "🎫 Recepção":
   - [ ] Drawer abre novamente
   - [ ] Histórico de senhas mantém-se

### **Teste 8: Abrir Atendimento**
1. Com agendamento que já tem "Chegou", clicar [Atender]:
   - [ ] AtendimentoModal abre (formulário de consulta)
   - [ ] Dados do paciente aparecem pré-preenchidos
   - [ ] Drawer fica visível atrás do modal
2. Fechar modal sem salvar:
   - [ ] Drawer volta em foco
   - [ ] Lista de agendamentos mantém estado
3. Salvar dados no modal:
   - [ ] Modal fecha
   - [ ] Drawer recarrega agendamentos automaticamente

### **Teste 9: Estilo Responsivo**
1. Em desktop:
   - [ ] Drawer ocupa ~1/3 da tela (max-w-md)
   - [ ] Agenda visível ao fundo
2. Tentar redimensionar window:
   - [ ] Drawer mantém proporções legíveis
   - [ ] Scroll funciona se conteúdo exceder altura

---

## 📊 CENÁRIOS AVANÇADOS

### **Cenário A: Múltiplos Agendamentos**
```
Precondição: 10+ agendamentos para hoje
1. Abrir drawer
2. Verificar scroll automático (max-h-screen)
3. Registrar chegada de 5 pacientes
4. Verificar senhas sequenciais (001-005)
5. Recarregar página
6. Verificar persistência
```

### **Cenário B: Sem Agendamentos**
```
Precondição: Nenhum agendamento marcado
1. Abrir drawer
2. Verificar mensagem: "Nenhum agendamento encontrado"
3. Verificar search ainda funciona
```

### **Cenário C: Agendamentos Cancelados**
```
Precondição: Alguns agendamentos têm status "canceled"
1. Verificar se aparecem ou não na lista
2. Verificar comportamento desejado com PM
```

### **Cenário D: Múltiplas Aberturas**
```
1. Abrir e fechar drawer 5+ vezes
2. Verificar performance (não deve travar)
3. Verificar estado mantém-se consistente
```

---

## 🔍 TESTES TÉCNICOS

### **Console Logs**
Abrir DevTools (F12) → Console
Procurar por:
- [ ] "📥 Agendamentos carregados:" com dados
- [ ] Nenhum erro de import
- [ ] Nenhum erro de undefined/null

### **Network Tab**
1. Abrir DevTools → Network
2. Clicar em "🎫 Recepção"
3. Verificar:
   - [ ] Query Supabase executada
   - [ ] Status 200 OK
   - [ ] Dados retornados em <1s

### **LocalStorage**
1. Abrir DevTools → Application → LocalStorage
2. Procurar por chave: `arrivals_YYYY-MM-DD`
3. Verificar:
   - [ ] JSON contém senhas geradas
   - [ ] Valores sequenciais (001, 002, etc.)

---

## ✨ TESTES DE INTEGRAÇÃO

### **Com Agenda**
- [ ] Agendamentos na agenda NÃO são duplicados no drawer
- [ ] Clique em agendamento na agenda não abre drawer
- [ ] Drawer não interfere com navegação por data
- [ ] WhatsApp button continua funcionando

### **Com Pacientes**
- [ ] Informações do paciente corretas (nome, telefone)
- [ ] Foto não causa problemas no drawer

### **Com Profissionais**
- [ ] Nome do profissional correto
- [ ] Múltiplos profissionais aparecem corretamente

---

## 🚨 PROBLEMAS CONHECIDOS ESPERADOS

Se ocorrerem, verificar:

| Problema | Causa Provável | Solução |
|----------|---|---|
| Botão não aparece | Import faltando | Verificar `index.jsx` imports |
| Drawer não abre | Estado não atualiza | Verificar onClick handler |
| Senhas não persistem | LocalStorage desabilitado | Verificar permissões browser |
| AtendimentoModal erro | Path incorreto | Verificar path relativo |
| Sem agendamentos | Banco vazio | Criar agendamento de teste |
| Compilação falha | Syntax error | Verificar RecepcaoDrawer.jsx |

---

## 📝 LOG DE TESTES

```
Data: _______________
Testador: _______________
Versão: _______________

Teste 1 - Compilação: [ ] PASSOU [ ] FALHOU
Teste 2 - Botão: [ ] PASSOU [ ] FALHOU  
Teste 3 - Abrir/Fechar: [ ] PASSOU [ ] FALHOU
Teste 4 - Listar Agendamentos: [ ] PASSOU [ ] FALHOU
Teste 5 - Busca: [ ] PASSOU [ ] FALHOU
Teste 6 - Registrar Chegada: [ ] PASSOU [ ] FALHOU
Teste 7 - Persistência: [ ] PASSOU [ ] FALHOU
Teste 8 - Atendimento: [ ] PASSOU [ ] FALHOU
Teste 9 - Responsivo: [ ] PASSOU [ ] FALHOU

Status Overall: [ ] FUNCIONAL [ ] REQUER AJUSTES

Observações:
_________________________________________
_________________________________________
_________________________________________
```

---

## ✅ ASSINATURA

- [ ] Todos os testes passaram
- [ ] Código compilado com sucesso
- [ ] Pronto para staging
- [ ] Pronto para produção

**Aprovado por**: _______________  
**Data**: _______________  
**Assinatura**: _______________

---

## 🎯 PRÓXIMAS AÇÕES

Após validar todos os testes:
1. Merge para branch `main`
2. Deploy para staging
3. Testes de user acceptance (UAT)
4. Deploy para produção
5. Comunicar usuários sobre nova feature

**Tudo pronto! 🚀**
