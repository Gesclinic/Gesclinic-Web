# 🧪 TESTE COMPLETO DO MÓDULO PACIENTES

## 📋 CHECKLIST DE TESTES FUNCIONALIDADE

### ✅ TESTE 1: Lista de Pacientes
```
[ ] Navegue para /clinica/pacientes
[ ] Verifique se lista carrega com sucesso
[ ] Teste busca por nome (ex: "João")
[ ] Teste busca por CPF (ex: "123.456")
[ ] Teste busca por email
[ ] Teste busca por telefone
[ ] Verifique contagem total de pacientes
[ ] Verifique contagem de resultados em busca
[ ] Clique no botão "Novo Paciente"
[ ] Verifique se o card de cada paciente mostra:
    [ ] Avatar com inicial do nome
    [ ] Nome completo
    [ ] CPF
    [ ] Telefone (com ícone)
    [ ] Email (com ícone)
    [ ] Cidade
[ ] Clique no botão "Abrir" de um paciente
[ ] Verifique se navega para HUB do paciente
```

### ✅ TESTE 2: Cadastro Etapa 1
```
[ ] Navegue para /clinica/pacientes/novo
[ ] Verifique indicador de progresso (1/2)
[ ] Preencha Nome Completo
[ ] Preencha CPF
[ ] Preencha Data de Nascimento
[ ] Selecione Sexo
[ ] Preencha Telefone
[ ] Clique "Salvar Apenas"
    [ ] Verifique toast de sucesso
    [ ] Verifique redirect para HUB
[ ] Navegue para /clinica/pacientes/novo novamente
[ ] Deixe campos em branco e clique "Salvar Apenas"
    [ ] Verifique erro de validação
    [ ] Verifique campos marcados em vermelho
[ ] Preencha dados novamente
[ ] Clique "Continuar Cadastro"
    [ ] Verifique redirect para página de dados completos
```

### ✅ TESTE 3: HUB DO PACIENTE
```
[ ] Abra um paciente criado
[ ] Verifique card principal mostra:
    [ ] Nome completo
    [ ] CPF
    [ ] Idade (calculada corretamente)
    [ ] Sexo
    [ ] Telefone com ícone
    [ ] Email com ícone
    [ ] Badge "Completo" ou "Incompleto"
[ ] Verifique breadcrumb: Pacientes > Nome > (vazio)
[ ] Clique em "Editar Cadastro"
    [ ] Verifique navega para /clinica/pacientes/:id/dados
[ ] Volte ao HUB
[ ] Verifique Ações Rápidas (4 cards):
    [ ] "Agendar Atendimento" → Navega para agenda
    [ ] "Prontuário Médico" → Navega para prontuário
    [ ] "Documentos" → Navega para documentos
    [ ] "Convênios" → Navega para convênios
[ ] Verifique se não há alertas (se cadastro completo)
```

### ✅ TESTE 4: Editar Dados Completos
```
[ ] Navegue para /clinica/pacientes/:id/dados
[ ] Verifique breadcrumb: Pacientes > Nome > Dados Cadastrais
[ ] Verifique seções:
    [ ] "Dados Pessoais" com border azul
    [ ] "Contato" com border verde
    [ ] "Endereço" com border purple
[ ] Edite dados e clique "Salvar Alterações"
    [ ] Verifique toast de sucesso
    [ ] Verifique redirect para HUB
[ ] Retorne a dados e verifique se alterações foram salvas
[ ] Teste campos:
    [ ] Nome
    [ ] CPF
    [ ] Data Nascimento
    [ ] Sexo
    [ ] Telefone
    [ ] Celular
    [ ] Email
    [ ] Rua
    [ ] Número
    [ ] Bairro
    [ ] Cidade
    [ ] Estado
    [ ] CEP
```

### ✅ TESTE 5: Dados Familiares
```
[ ] Navegue para /clinica/pacientes/:id/familiares
[ ] Verifique breadcrumb correto
[ ] Verifique empty state com ícone 👥
[ ] Clique "Adicionar Responsável"
[ ] Verifique se abre modal/formulário (ou navega)
```

### ✅ TESTE 6: Convênios
```
[ ] Navegue para /clinica/pacientes/:id/convenios
[ ] Verifique breadcrumb correto
[ ] Verifique empty state com ícone ❤️
[ ] Clique "Adicionar Convênio"
[ ] Verifique se abre modal/formulário (ou navega)
```

### ✅ TESTE 7: Documentos
```
[ ] Navegue para /clinica/pacientes/:id/documentos
[ ] Verifique breadcrumb correto
[ ] Clique "Enviar Documento"
[ ] Verifique filtros:
    [ ] Dropdown "Tipos" - verifique opções
    [ ] Dropdown "Status" - verifique opções
[ ] Verifique empty state com ícone 📄
[ ] Verifique aviso de documentos recomendados
[ ] Se houver documentos:
    [ ] Verifique exibição correta
    [ ] Teste filtros
    [ ] Clique Download
    [ ] Clique Delete
```

### ✅ TESTE 8: Prontuário
```
[ ] Navegue para /clinica/pacientes/:id/prontuario
[ ] Verifique breadcrumb correto
[ ] Clique "Novo Registro"
[ ] Verifique filtros:
    [ ] Tipo (Consulta, Evolução, Exame, Anotação)
    [ ] Data inicial
    [ ] Data final
[ ] Verifique empty state com ícone 📄
[ ] Se houver registros:
    [ ] Clique no registro para expandir
    [ ] Verifique conteúdo completo
    [ ] Verifique botões Editar/Deletar
    [ ] Recolha registro
```

### ✅ TESTE 9: Menu Dinâmico
```
[ ] Abra /clinica/pacientes
[ ] Verifique sidebar mostra:
    [ ] "Lista de Pacientes" (ativo)
    [ ] "Novo Paciente"
[ ] Clique em "Novo Paciente"
[ ] Crie um paciente
[ ] Depois de criado, verifique sidebar:
    [ ] Mostra nome do paciente (box azul)
    [ ] Mostra "Resumo" (ativo)
    [ ] Mostra "Dados Cadastrais"
    [ ] Mostra "Familiares"
    [ ] Mostra "Convênios"
    [ ] Mostra "Documentos"
    [ ] Mostra "Prontuário"
    [ ] Mostra botão "Completar Cadastro"
[ ] Clique em "Dados Cadastrais"
    [ ] Verifique ativa no menu
    [ ] Verifique breadcrumb atualizado
[ ] Clique em "Prontuário"
    [ ] Verifique ativa no menu
    [ ] Verifique breadcrumb atualizado
```

### ✅ TESTE 10: Validações
```
[ ] Tente acessar /clinica/pacientes/invalid-id
    [ ] Verifique se redireciona ou mostra erro
[ ] Tente acessar /clinica/pacientes/novo/dados
    [ ] Verifique se bloqueia (patientId obrigatório)
[ ] Crie paciente SEM endereço
    [ ] Verifique badge "Incompleto" no HUB
[ ] Crie paciente e complete endereço
    [ ] Verifique badge muda para "Completo"
```

### ✅ TESTE 11: Navegação
```
[ ] Abra um paciente
[ ] Use breadcrumb para voltar:
    [ ] Clique em "Pacientes"
    [ ] Verifique volta para lista
[ ] Abra outro paciente
[ ] Use botão voltar do navegador
    [ ] Verifique funciona
[ ] Abra paciente, vá para dados
[ ] Use botão "Cancelar"
    [ ] Verifique volta para HUB
```

### ✅ TESTE 12: Responsividade
```
[ ] Teste em celular (375px):
    [ ] Cards se reorganizam para 1 coluna
    [ ] Menu lateral se esconde (ou hamburger)
    [ ] Botões e inputs acessíveis
[ ] Teste em tablet (768px):
    [ ] Layout se ajusta para 2 colunas
[ ] Teste em desktop (1920px):
    [ ] Layout completo com 3+ colunas
```

### ✅ TESTE 13: Performance
```
[ ] Abra lista com 100+ pacientes
    [ ] Verifique se carrega sem travar
    [ ] Teste busca (deve filtrar rapidamente)
[ ] Abra HUB do paciente
    [ ] Verifique se carrega em <2 segundos
[ ] Abra múltiplas páginas rapidamente
    [ ] Verifique se contexto cache funciona
    [ ] Verifique se não faz múltiplos fetches
```

### ✅ TESTE 14: Alertas
```
[ ] Crie paciente SEM documentos
    [ ] Verifique alerta "Documentos Incompletos"
[ ] Crie paciente SEM endereço
    [ ] Verifique alerta "Cadastro Incompleto"
[ ] Se sistema calcular convênio vencido
    [ ] Verifique alerta "Convênio Vencido"
```

### ✅ TESTE 15: Toast Notifications
```
[ ] Crie paciente
    [ ] Verifique toast "Paciente criado com sucesso!"
[ ] Edite dados
    [ ] Verifique toast "Dados atualizados com sucesso!"
[ ] Delete paciente
    [ ] Verifique confirmação
    [ ] Verifique toast de sucesso
[ ] Tente salvar com erro
    [ ] Verifique toast de erro
```

## 🔍 TESTES DE INTEGRAÇÃO

### Teste com Agenda (quando integrado)
```
[ ] Abra paciente
[ ] Clique "Agendar Atendimento"
[ ] Verifique se agenda abre com paciente pré-selecionado
[ ] Crie agendamento
[ ] Volte para paciente
[ ] Verifique se agendamento aparece em lista (integração futura)
```

### Teste com Faturamento (quando integrado)
```
[ ] Se paciente tiver contas em aberto
[ ] Verifique alerta "Inadimplência" no HUB
[ ] Clique no alerta (quando integrado)
[ ] Verifique se abre página de faturamento
```

## 🐛 TESTES DE BUG

### Casos Extremos
```
[ ] Paciente com nome muito longo (>100 caracteres)
    [ ] Verifique se trunca corretamente no HUB
[ ] Paciente sem email
    [ ] Verifique se não mostra ícone de email
[ ] Paciente com CPF formatado diferente
    [ ] Verifique se aceita e armazena
[ ] Data de nascimento muito antiga (>100 anos)
    [ ] Verifique se calcula idade corretamente
[ ] Telefone com caracteres especiais
    [ ] Verifique se aceita e armazena
```

### Concorrência
```
[ ] Abra mesmo paciente em 2 abas
[ ] Edite em uma aba
[ ] Verifique se outra aba reflete mudança (quando voltar)
[ ] Abra lista em uma aba
[ ] Delete paciente em outra aba
[ ] Verifique se lista atualiza automaticamente
```

## 📊 RELATÓRIO DE TESTE

Ao testar, preencha:

```markdown
# Relatório de Teste - Módulo Pacientes

**Data:** 
**Testador:** 
**Ambiente:** 

## Funcionalidades Testadas
- [ ] Lista de Pacientes
- [ ] Cadastro Etapa 1
- [ ] Cadastro Etapa 2
- [ ] HUB do Paciente
- [ ] Edição de Dados
- [ ] Menu Dinâmico
- [ ] Validações
- [ ] Responsividade

## Bugs Encontrados
1. [Descrição]
   - Passos para reproduzir:
   - Resultado esperado:
   - Resultado atual:
   - Severidade: [Crítica/Alta/Média/Baixa]

## Sugestões de Melhoria
1. [Descrição]

## Status Geral
- [ ] PASSOU (sem problemas)
- [ ] PASSOU COM RESSALVAS (bugs menores)
- [ ] NÃO PASSOU (bugs críticos)
```

---

**Total de Testes:** 95+ cenários
**Tempo Estimado:** 2-3 horas
**Aceitação:** Todos os testes devem passar antes de produção

