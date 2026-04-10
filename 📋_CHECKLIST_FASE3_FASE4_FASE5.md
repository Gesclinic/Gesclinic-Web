# ✅ CHECKLIST - Próximas Fases ETAPA 10

## 📋 FASE 3: Integração em AppRoutes.jsx

**Objetivo**: Registrar todos os 12 componentes nas rotas  
**Tempo Estimado**: 15 minutos  
**Status**: ⏳ Pendente  

### Tarefas:

- [ ] **Tarefa 1**: Localizar `src/AppRoutes.jsx`
  - [ ] Verificar estrutura de rotas
  - [ ] Identificar onde adicionar rotas de base-sistema
  - [ ] Verificar padrão de roteamento (/clinica/...)

- [ ] **Tarefa 2**: Importar componentes
  ```jsx
  import {
    ServicesPage,
    ProfessionalsPage,
    ProfessionalServicesPage,
    RoomsPage,
    ResourcesPage,
    HealthInsurancesPage,
    AgendaRulesPage,
    RoomResourcesPage,
    ProfessionalSchedulePage,
    ServicePricesPage,
    RevenueRulesPage,
    ProfessionalPayerPage,
  } from "@/pages/clinica/base-sistema/pages";
  ```

- [ ] **Tarefa 3**: Registrar 12 rotas
  ```jsx
  // Dentro de clinica/* - base-sistema
  {
    path: "base-sistema/servicos",
    element: <ServicesPage />,
  },
  {
    path: "base-sistema/profissionais",
    element: <ProfessionalsPage />,
  },
  // ... adicionar 10 mais
  ```

- [ ] **Tarefa 4**: Testar navegação manual
  - [ ] Acessar `/clinica/base-sistema/servicos`
  - [ ] Acessar cada uma das 12 rotas
  - [ ] Verificar se componentes carregam
  - [ ] Verificar se dados são listados

- [ ] **Tarefa 5**: Validar integração com menu
  - [ ] Se há menu lateral, verificar se links apontam corretos
  - [ ] Testar navegação via cliques no menu
  - [ ] Verificar breadcrumbs se existir

---

## 🧪 FASE 4: Testes Abrangentes

**Objetivo**: Validar CRUD em todas as 12 páginas  
**Tempo Estimado**: 1 hora 30 minutos  
**Status**: ⏳ Pendente  

### Testes por Página:

#### ✅ Serviços
- [ ] **CREATE**: Adicionar novo serviço
  - [ ] Clique em "Novo Serviço"
  - [ ] Preencher form (nome, descrição)
  - [ ] Submeter
  - [ ] Verificar se aparece na tabela
  - [ ] Verificar se foi salvo (recarregar página)

- [ ] **READ**: Listar serviços
  - [ ] Página carrega com serviços existentes
  - [ ] Tabela exibe todos os campos
  - [ ] Status (ativo/inativo) mostra correto

- [ ] **UPDATE**: Editar serviço
  - [ ] Clique em ícone editar
  - [ ] Modal abre com dados preenchidos
  - [ ] Alterar campo
  - [ ] Submeter
  - [ ] Verificar mudança na tabela

- [ ] **DELETE**: Deletar serviço
  - [ ] Clique em ícone trash
  - [ ] Confirmar deleção
  - [ ] Verificar se desaparece da lista

- [ ] **VALIDATION**: Testar validações
  - [ ] Deixar nome vazio → erro "obrigatório"
  - [ ] Nome < 3 chars → erro "mínimo 3"
  - [ ] Submeter com dados válidos → sucesso

#### ✅ Profissionais
- [ ] **CREATE**: Novo profissional
  - [ ] Preencher: name, email, phone, specialization
  - [ ] Email inválido → erro
  - [ ] Email válido → sucesso

- [ ] **READ**: Listar profissionais com todos campos

- [ ] **UPDATE**: Editar profissional

- [ ] **DELETE**: Deletar profissional

- [ ] **VALIDATION**:
  - [ ] Email inválido rejeitado
  - [ ] Nome obrigatório

#### ✅ Convênios
- [ ] **CREATE**: Novo convênio
  - [ ] Preencher: code, name, type, cnpj, email
  - [ ] Validar code obrigatório
  - [ ] Validar name obrigatório

- [ ] **READ**: Listar convênios

- [ ] **UPDATE**: Editar convênio

- [ ] **DELETE**: Deletar convênio

#### ✅ Salas
- [ ] **CREATE**: Nova sala
  - [ ] Preencher: name, description, location, capacity
  - [ ] Capacity com número inválido → erro
  - [ ] Capacity válido → sucesso

- [ ] **READ**: Listar salas

- [ ] **UPDATE**: Editar sala

- [ ] **DELETE**: Deletar sala

- [ ] **VALIDATION**:
  - [ ] Capacity só aceita números
  - [ ] Name obrigatório

#### ✅ Recursos
- [ ] **CREATE**: Novo recurso

- [ ] **READ**: Listar recursos

- [ ] **UPDATE**: Editar recurso

- [ ] **DELETE**: Deletar recurso

#### ✅ Profissional-Serviços (M:M)
- [ ] **CREATE**: Vincular profissional a serviço
  - [ ] Selecionar profissional
  - [ ] Selecionar serviço
  - [ ] Submeter
  - [ ] Verificar na tabela

- [ ] **READ**: Listar atribuições

- [ ] **UPDATE**: Editar atribuição

- [ ] **DELETE**: Remover atribuição

- [ ] **VALIDATION**:
  - [ ] Ambos campos obrigatórios
  - [ ] Sem duplicatas (mesmo prof + serviço)

#### ✅ Regras de Agenda
- [ ] **CREATE**: Nova regra
  - [ ] Preencher: nome, tipo, valor (opcional)
  - [ ] Testar diferentes tipos (default, min_interval, etc)

- [ ] **READ**: Listar regras

- [ ] **UPDATE**: Editar regra

- [ ] **DELETE**: Deletar regra

#### ✅ Sala-Recursos (M:M)
- [ ] **CREATE**: Adicionar recurso à sala
  - [ ] Selecionar sala
  - [ ] Selecionar recurso
  - [ ] Definir quantidade
  - [ ] Submeter

- [ ] **READ**: Listar sala-recursos

- [ ] **UPDATE**: Editar quantidade

- [ ] **DELETE**: Remover recurso de sala

- [ ] **VALIDATION**:
  - [ ] Quantity > 0
  - [ ] Sem duplicatas

#### ✅ Horários Profissionais
- [ ] **CREATE**: Novo horário
  - [ ] Selecionar profissional
  - [ ] Selecionar dia semana
  - [ ] Definir start_time e end_time
  - [ ] Definir break (opcional)
  - [ ] Validar start < end
  - [ ] Validar intervalo dentro do turno

- [ ] **READ**: Listar horários

- [ ] **UPDATE**: Editar horário

- [ ] **DELETE**: Deletar horário

- [ ] **VALIDATION**:
  - [ ] Horário fim > horário início
  - [ ] Intervalo dentro do turno
  - [ ] Sem duplicatas por dia

#### ✅ Preços de Serviços
- [ ] **CREATE**: Novo preço
  - [ ] Selecionar serviço
  - [ ] Definir price (decimal)
  - [ ] Definir cost (decimal)
  - [ ] Selecionar moeda
  - [ ] Verificar margem calculada

- [ ] **READ**: Listar preços com margem%

- [ ] **UPDATE**: Editar preço

- [ ] **DELETE**: Deletar preço

- [ ] **VALIDATION**:
  - [ ] Price > 0
  - [ ] Cost válido (se preenchido)
  - [ ] Currency selecionado
  - [ ] Sem duplicatas service+currency

#### ✅ Regras de Receita
- [ ] **CREATE**: Nova regra
  - [ ] Selecionar tipo (percentage, fixed, combined, tiered)
  - [ ] Teste cada tipo
  - [ ] Percentage: 0-100
  - [ ] Fixed: valor positivo

- [ ] **READ**: Listar regras com valores formatados

- [ ] **UPDATE**: Editar regra

- [ ] **DELETE**: Deletar regra

#### ✅ Profissional-Convênio
- [ ] **CREATE**: Vincular profissional a convênio
  - [ ] Selecionar profissional
  - [ ] Selecionar convênio
  - [ ] Definir comissão %
  - [ ] Definir número registro

- [ ] **READ**: Listar vinculações

- [ ] **UPDATE**: Editar comissão

- [ ] **DELETE**: Remover vínculo

- [ ] **VALIDATION**:
  - [ ] Sem duplicatas
  - [ ] Commission 0-100%

### Testes Gerais (Todas as 12 páginas):

- [ ] **Soft Delete Funcionando**
  - [ ] Deletar item
  - [ ] Item desaparece da lista
  - [ ] Recarregar página → item permanece deletado

- [ ] **Clinic Isolation**
  - [ ] Se houver 2 clínicas, dados isolados por clinic_id
  - [ ] Usuário clínica A não vê dados clínica B

- [ ] **Error Handling**
  - [ ] Erro de API → mostra alert com mensagem
  - [ ] Network error → comportamento graceful
  - [ ] Validação falha → mostra erro no form

- [ ] **Loading States**
  - [ ] Skeleton loader aparece ao carregar
  - [ ] Skeleton desaparece quando dados chegam
  - [ ] Botão desabilita durante submissão

- [ ] **Responsividade**
  - [ ] Página funciona em mobile
  - [ ] Tabela scrollable em mobile
  - [ ] Modal adapta em mobile

---

## 📚 FASE 5: Documentação Final

**Objetivo**: Criar documentação completa  
**Tempo Estimado**: 1 hora  
**Status**: ⏳ Pendente  

### Documentos a Criar:

- [ ] **1. Guia de Uso - Base do Sistema**
  - [ ] Introdução
  - [ ] Como acessar cada página
  - [ ] Passo-a-passo de CRUD para cada entidade
  - [ ] Exemplos práticos
  - [ ] Dicas de uso

- [ ] **2. Fluxos de Negócio**
  - [ ] Fluxo: Cadastrar serviço → Precificar → Vincular profissional
  - [ ] Fluxo: Setup inicial de clínica
  - [ ] Fluxo: Gerenciar disponibilidade
  - [ ] Diagramas simples

- [ ] **3. Referência de APIs**
  - [ ] Lista de todas 12 APIs usadas
  - [ ] Operações suportadas (GET, POST, PUT, DELETE)
  - [ ] Campos obrigatórios por entidade
  - [ ] Exemplos de resposta

- [ ] **4. Troubleshooting**
  - [ ] Problema: "Nenhum profissional aparece"
    - Solução: Verificar se estão cadastrados na clínica correta
  - [ ] Problema: "Formulário não salva"
    - Solução: Verificar validações
  - [ ] Problema: "Dados desaparecem após delete"
    - Solução: É soft delete, verificar se está realmente marcado deleted_at

- [ ] **5. Checklist de Implantação**
  - [ ] Pré-requisitos (APIs disponíveis)
  - [ ] Passos de deployment
  - [ ] Testes pós-deploy
  - [ ] Rollback procedure

- [ ] **6. Sumário Executivo ETAPA 10**
  - [ ] O que foi feito
  - [ ] Quanto tempo levou
  - [ ] Que funcionalidades estão prontas
  - [ ] Próximos passos (ETAPA 11+)

---

## 🎯 Critérios de Sucesso

### FASE 3:
- ✅ Todos 12 componentes acessíveis via URL
- ✅ Navegação entre páginas funciona
- ✅ Componentes carregam dados

### FASE 4:
- ✅ CRUD funciona em todas 12 páginas
- ✅ Validações funcionam
- ✅ Soft delete funciona
- ✅ Clinic isolation funciona
- ✅ Error handling funciona
- ✅ Loading states funcionam

### FASE 5:
- ✅ Documentação completa e clara
- ✅ Exemplos práticos incluídos
- ✅ Troubleshooting cobre casos comuns
- ✅ Checklist pronto para deploy

---

## 📊 Métrica de Progresso

```
ETAPA 10:
├── FASE 1 (Auditoria)      ✅ 100%
├── FASE 2 (12 Componentes) ✅ 100%
├── FASE 3 (AppRoutes)      ⏳  0% → 100%
├── FASE 4 (Testes)         ⏳  0% → 100%
└── FASE 5 (Docs)           ⏳  0% → 100%

Total ETAPA 10: 40% → 100%
Overall Projeto: 95% → 100%
```

---

## 🚀 Próximo Comando

Quando estiver pronto para FASE 3, execute:

```
"próxima fase" ou "continuar" ou "fase 3"
```

O agente então:
1. Acessará AppRoutes.jsx
2. Adicionará imports dos 12 componentes
3. Registrará 12 rotas
4. Testará navegação
5. Relatará status

---

## 📞 Suporte

Se encontrar problemas:
1. Consulte este checklist
2. Releia a documentação relevante em FASE correspondente
3. Reporte erro específico (página, ação, mensagem)

