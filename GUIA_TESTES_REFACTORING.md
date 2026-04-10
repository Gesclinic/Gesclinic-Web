# 🧪 GUIA DE TESTES - Refatoração Base do Sistema

## Objetivo
Validar que todas as 7 páginas refatoradas funcionam corretamente com o novo padrão visual.

---

## 📋 Testes por Página

### 1️⃣ ProfessionalServicesPage (Profissionais × Serviços)
**URL:** `/clinica/base-sistema/profissionais-servicos`

#### Visual
- [ ] Header com breadcrumb "Base do Sistema > 4.2 Regras Operacionais > Profissionais × Serviços"
- [ ] Título "Profissionais × Serviços" em H1
- [ ] Subtítulo "Gerencie quais serviços cada profissional oferece"

#### Funcionalidade
- [ ] Empty state aparece quando sem dados (ícone + texto)
- [ ] Botão "+ Adicionar" está no CardHeader à direita
- [ ] Clicando em "+Adicionar", formulário modal abre
- [ ] Pode criar novo registro
- [ ] Pode editar registro existente
- [ ] Pode deletar registro
- [ ] Erro de validação mostra com componente Alert

---

### 2️⃣ ProfessionalPayerPage (Profissionais × Convênios)
**URL:** `/clinica/base-sistema/profissionais-convenios`

#### Visual
- [ ] Header correto com categoria "4.2 Regras Operacionais"
- [ ] Título "Profissionais × Convênios"
- [ ] Subtítulo descritivo

#### Funcionalidade
- [ ] Tabela exibe comissão e registro número
- [ ] Empty state quando vazio
- [ ] Botão "+ Adicionar" funciona
- [ ] Validação de duplicatas funciona

---

### 3️⃣ AgendaRulesPage (Regras da Agenda)
**URL:** `/clinica/base-sistema/regras-agenda`

#### Visual
- [ ] Header com "4.2 Regras Operacionais"
- [ ] CardHeader com "Regras Cadastradas ({count})" e botão "+ Nova Regra"
- [ ] Badge com tipo de regra (Padrão, Intervalo Mínimo, etc)

#### Funcionalidade
- [ ] Criar nova regra
- [ ] Editar regra existente
- [ ] Deletar regra
- [ ] Status Ativo/Inativo com ícone Check/X

---

### 4️⃣ RoomResourcesPage (Salas × Serviços)
**URL:** `/clinica/base-sistema/salas-recursos`

#### Visual
- [ ] Título "Salas × Serviços"
- [ ] Categoria "4.2 Regras Operacionais"
- [ ] Coluna "Quantidade" na tabela

#### Funcionalidade
- [ ] Pode adicionar recurso para sala
- [ ] Valida quantidade > 0
- [ ] Evita duplicatas (sala + recurso)

---

### 5️⃣ ServicePricesPage (Tabela de Preços)
**URL:** `/clinica/base-sistema/precos-servicos`

#### Visual
- [ ] Categoria "4.3 Parâmetros Financeiros"
- [ ] Tabela exibe Preço, Custo, Margem
- [ ] Botão "+ Novo Preço"

#### Funcionalidade
- [ ] Cria preço com moeda BRL/USD/EUR
- [ ] Calcula margem automaticamente
- [ ] Validação de valores positivos

---

### 6️⃣ ProfessionalSchedulePage (Valores por Convênio)
**URL:** `/clinica/base-sistema/horarios-profissionais`

#### Visual
- [ ] Categoria "4.3 Parâmetros Financeiros"
- [ ] Título "Valores por Convênio" (nota: título intencionalmente diferente de breadcrumb)
- [ ] Tabela com Profissional, Dia, Início-Fim, Intervalo

#### Funcionalidade
- [ ] Pode adicionar horário por dia da semana
- [ ] Valida horário de término > início
- [ ] Valida intervalo dentro do horário

---

### 7️⃣ RevenueRulesPage (Regras de Repasse)
**URL:** `/clinica/base-sistema/regras-receita`

#### Visual
- [ ] Categoria "4.3 Parâmetros Financeiros"
- [ ] Badge com tipo (Percentual, Valor Fixo, Combinado, Escalonado)
- [ ] Botão "+ Nova Regra"

#### Funcionalidade
- [ ] Tipo Percentual mostra só campo %
- [ ] Tipo Fixo mostra só campo Valor
- [ ] Tipo Combinado mostra ambos os campos
- [ ] Valida valores 0-100 para percentual

---

## 🎨 Testes Visuais Gerais

### Responsividade
- [ ] Desktop (1920px): Layout correto
- [ ] Tablet (768px): Cards empilham se necessário
- [ ] Mobile (375px): Menu acessível, scroll horizontal em tabelas

### Consistência
- [ ] Todos os headers têm o mesmo visual/estrutura
- [ ] Todos os alertas de erro usam o mesmo componente Alert
- [ ] Todos os empty states usam o mesmo EmptyState
- [ ] Todos os botões "+ Novo" estão na mesma posição

### Cores
- [ ] Header: Sem cores agressivas
- [ ] Alert erro: Vermelho suave (red-50, red-200, red-900)
- [ ] Alert sucesso: Verde suave
- [ ] Sem amarelo, laranja ou cores vibrantes

### Tipografia
- [ ] H1 (Títulos): 3xl bold
- [ ] Subtítulo: tamanho normal, texto muted
- [ ] Breadcrumb: pequeno, separado por ChevronRight

---

## ✅ Checklist de Regressão

### Funcionalidade Preservada
- [ ] CRUD create funciona
- [ ] CRUD read funciona
- [ ] CRUD update funciona
- [ ] CRUD delete funciona
- [ ] Validações funcionam
- [ ] API calls funcionam
- [ ] Loading states funcionam
- [ ] Error handling funciona

### Sem Breaking Changes
- [ ] Nenhum console error vermelho
- [ ] Nenhum componente faltando
- [ ] Nenhuma propriedade inválida
- [ ] Sem warnings no console

---

## 🐛 Teste de Cenários de Erro

Para cada página:

1. **Erro ao carregar dados**
   - [ ] Alert mostra mensagem de erro
   - [ ] Botão de fechar o alerta funciona
   - [ ] Não exibe mensagem técnica/SQL

2. **Erro ao criar registro**
   - [ ] Validação funciona
   - [ ] Alert mostra mensagem legível
   - [ ] Formulário permanece aberto

3. **Erro ao deletar registro**
   - [ ] Confirmação funciona
   - [ ] Se erro, Alert mostra mensagem
   - [ ] Registro não é removido da lista

---

## 📊 Teste de Performance

- [ ] Página carrega em < 2 segundos
- [ ] Sem lag ao abrir formulário
- [ ] Tabela com 100+ registros renderiza smooth
- [ ] Sem memory leaks

---

## 🔐 Teste de Segurança

- [ ] Sem dados sensíveis em console
- [ ] Sem SQL injetáveis em inputs
- [ ] CORS funcionando
- [ ] Auth token gerenciado corretamente

---

## 📝 Relatório de Testes

Use este template para documentar os resultados:

```
Data: ___/___/_____
Testador: _______________

Página: _________________________
URL: ____________________________

✅ Visuais: Passou / Falhou
Observações: _________________

✅ Funcionalidade: Passou / Falhou
Observações: _________________

✅ Erros: Passou / Falhou
Observações: _________________

Status Geral: ✅ APROVADO / ⚠️ REQUER AJUSTES

Problemas encontrados:
- _____________________________
- _____________________________
```

---

## 🚀 Conclusão

Quando todos os testes passarem ✅:

1. Fazer commit das mudanças
2. Criar pull request
3. Deploy em staging
4. Deploy em produção

---

**Última atualização:** 16 de janeiro de 2026
