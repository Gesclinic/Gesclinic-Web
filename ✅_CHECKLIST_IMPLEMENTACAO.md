# ✅ CHECKLIST IMPLEMENTAÇÃO - Marque conforme avança

**Data:** 18 de Janeiro de 2026  
**Duração Estimada:** 6-8 horas  
**Status:** Pronto para começar agora

---

## 📍 ONDE ESTOU AGORA?

```
[ ] Não comecei ainda
[✓] Lendo documentação (VOCÊ ESTÁ AQUI)
[ ] Executando SQL
[ ] Desenvolvendo componentes
[ ] Testando
[ ] Pronto para produção
```

---

## ⚡ FASE 1: LEITURA & PREPARAÇÃO (30 minutos)

### Documentação
- [ ] Li: ⚡_RESUMO_EXECUTIVO_1_PAGINA.md
  - [ ] Entendi o problema (TUSS, CBO, ANS faltam)
  - [ ] Entendi a solução (5 passos)
  - [ ] Entendi o resultado final (XML pronto)

- [ ] Li: 🎯_GUIDE_CADASTROS_ESTRUTURA_TISS.md
  - [ ] Entendi visão geral (Base do Sistema é núcleo)
  - [ ] Entendi sequência (Base → Serviços → Profissionais → Convênios)
  - [ ] Entendi seção 1 (Cadastros Estruturais)
  - [ ] Entendi seção 2 (Regras Operacionais)
  - [ ] Entendi seção 3 (Parâmetros Financeiros)

- [ ] Consultei: 📋_QUICK_REFERENCE_CAMPOS_OBRIGATORIOS.md
  - [ ] Entendi tabelas rápidas
  - [ ] Entendi relações críticas
  - [ ] Anotei campos obrigatórios

### Preparação Técnica
- [ ] Abri VS Code com projeto
- [ ] Abri Supabase em aba separada
- [ ] Testei conexão npm run dev (funciona?)
- [ ] Git commitado (antes de mudanças)

---

## 💾 FASE 2: MIGRAÇÃO SQL (15 minutos)

### Supabase - SQL Editor

**SCRIPT 1: Adicionar campos faltantes**
- [ ] Copiei: 🔧_IMPLEMENTACAO_SQL_MIGRACAO.md - SCRIPT 1
- [ ] Colei no Supabase SQL Editor
- [ ] Executei (Run)
- [ ] ✅ Sucesso? Sem erros?
- [ ] Verificação:
  - [ ] `services.codigo_tuss` existe? (SELECT * FROM services LIMIT 1)
  - [ ] `professionals.cbo` existe?
  - [ ] `payers.codigo_ans` existe?

**SCRIPT 2: Criar tabelas novas**
- [ ] Copiei: 🔧_IMPLEMENTACAO_SQL_MIGRACAO.md - SCRIPT 2
- [ ] Colei no Supabase SQL Editor
- [ ] Executei (Run)
- [ ] ✅ Sucesso? Sem erros?
- [ ] Verificação:
  - [ ] `professional_services` criada?
  - [ ] `professional_payers` criada?
  - [ ] `service_prices` criada?
  - [ ] `rooms` criada?

**SCRIPT 3: Criar índices**
- [ ] Copiei: 🔧_IMPLEMENTACAO_SQL_MIGRACAO.md - SCRIPT 3
- [ ] Colei no Supabase SQL Editor
- [ ] Executei (Run)
- [ ] ✅ Sucesso? Índices criados?

**SCRIPT 4: Constraints (Opcional)**
- [ ] Copiei: 🔧_IMPLEMENTACAO_SQL_MIGRACAO.md - SCRIPT 4
- [ ] Colei no Supabase SQL Editor
- [ ] Executei (Run)
- [ ] ✅ Sucesso?

**SCRIPT 5: Dados de teste (Opcional)**
- [ ] Copiei: 🔧_IMPLEMENTACAO_SQL_MIGRACAO.md - SCRIPT 5
- [ ] Colei no Supabase SQL Editor
- [ ] Executei (Run)
- [ ] ✅ Sucesso? Dados aparecem?

---

## 💻 FASE 3: CRIAR APIs JAVASCRIPT (1 hora)

### Localização: `src/lib/`

**Arquivo 1: servicesApi.js (NOVO)**
- [ ] Criar arquivo: `src/lib/servicesApi.js`
- [ ] Implementar funções:
  - [ ] `listServices(clinicId)`
  - [ ] `getService(serviceId)`
  - [ ] `createService(clinicId, data)`
  - [ ] `updateService(serviceId, data)`
  - [ ] `validateServiceForTISS(service)` ← Obrigatório!
- [ ] Validar codigo_tuss:
  - [ ] Campo obrigatório
  - [ ] 6 dígitos numéricos
  - [ ] Erro se vazio: "codigo_tuss é obrigatório para XML"
- [ ] Git commit

**Arquivo 2: professionalsApi.js (ATUALIZAR)**
- [ ] Abrir: `src/lib/professionalsApi.js`
- [ ] Adicionar funções:
  - [ ] `validateProfessionalForTISS(professional)`
  - [ ] `getCBOOptions()` ← Lista de CBO válidos
- [ ] Validar CBO:
  - [ ] Campo obrigatório
  - [ ] 6 dígitos numéricos
  - [ ] Erro se vazio: "CBO é obrigatório para XML"
- [ ] Git commit

**Arquivo 3: professionalsServicesApi.js (NOVO)**
- [ ] Criar arquivo: `src/lib/professionalsServicesApi.js`
- [ ] Implementar funções:
  - [ ] `listServicesByProfessional(professionalId)`
  - [ ] `addServiceToProfessional(professionalId, serviceId, data?)`
  - [ ] `removeServiceFromProfessional(professionalId, serviceId)`
  - [ ] `validateProfessionalServices(professionalId)`
- [ ] Testar: Profissional sem serviço → Aviso
- [ ] Git commit

**Arquivo 4: payersApi.js (ATUALIZAR)**
- [ ] Abrir: `src/lib/payersApi.js`
- [ ] Adicionar campos:
  - [ ] codigo_ans
  - [ ] cnpj
  - [ ] versao_tiss
  - [ ] url_webservice
- [ ] Adicionar função:
  - [ ] `validatePayerForTISS(payer)`
- [ ] Validar ANS:
  - [ ] Campo obrigatório (se tipo = 'convenio')
  - [ ] 5 dígitos numéricos
  - [ ] Erro se vazio: "código ANS é obrigatório para convênios"
- [ ] Git commit

**Arquivo 5: servicePricesApi.js (NOVO)**
- [ ] Criar arquivo: `src/lib/servicePricesApi.js`
- [ ] Implementar funções:
  - [ ] `listPricesByService(serviceId)`
  - [ ] `getPriceForPayerService(payerId, serviceId)`
  - [ ] `setPriceForPayerService(payerId, serviceId, value, coparticipacao)`
  - [ ] `validateServicePrices(serviceId)`
- [ ] Testar: Serviço sem preço → Aviso
- [ ] Git commit

**Arquivo 6: professionalPayersApi.js (NOVO)**
- [ ] Criar arquivo: `src/lib/professionalPayersApi.js`
- [ ] Implementar funções:
  - [ ] `listPayersByProfessional(professionalId)`
  - [ ] `addPayerToProfessional(professionalId, payerId, percentualRepasse)`
  - [ ] `removePayerFromProfessional(professionalId, payerId)`
  - [ ] `getRepassePercentual(professionalId, payerId)`
- [ ] Testar: Profissional sem convênio → Aviso
- [ ] Git commit

**Arquivo 7: roomsApi.js (NOVO)**
- [ ] Criar arquivo: `src/lib/roomsApi.js`
- [ ] Implementar funções:
  - [ ] `listRooms(clinicId)`
  - [ ] `createRoom(clinicId, data)`
  - [ ] `updateRoom(roomId, data)`
  - [ ] `deleteRoom(roomId)`
- [ ] Git commit

### Status Fase 3
- [ ] Todas as 7 APIs criadas/atualizadas
- [ ] Todas as validações implementadas
- [ ] Npm run dev executa sem erros
- [ ] Commit realizado

---

## 🎨 FASE 4: CRIAR COMPONENTES REACT (2-3 horas)

### Localização: `src/pages/clinica/cadastros/`

**Tela 1: ServicosCatalogo.jsx**
- [ ] Criar arquivo: `src/pages/clinica/cadastros/ServicosCatalogo.jsx`
- [ ] Estrutura:
  - [ ] Lista de serviços (tabela)
  - [ ] Botão: Novo Serviço
  - [ ] Botão: Editar
  - [ ] Botão: Deletar
- [ ] Formulário com ABAS:
  - [ ] ABA 1: Dados Básicos (name, description, service_group_id, status)
  - [ ] ABA 2: TISS & Faturamento ★ (codigo_tuss, tipo_guia, codigo_cbhpm)
  - [ ] ABA 3: Valores (valor_base_particular)
  - [ ] ABA 4: Controle (permite_faturamento, exige_autorizacao, etc)
- [ ] Validações:
  - [ ] Aba 1: obrigatório tudo
  - [ ] Aba 2: codigo_tuss obrigatório (★ crítico)
  - [ ] Antes de salvar: validar com validateServiceForTISS()
- [ ] Indicador visual:
  - [ ] ✅ Verde: Pronto para XML
  - [ ] ⚠️ Amarelo: Faltam campos
  - [ ] 🔴 Vermelho: Erro crítico
- [ ] Git commit

**Tela 2: ProfissionaisCadastro.jsx**
- [ ] Criar arquivo: `src/pages/clinica/cadastros/ProfissionaisCadastro.jsx`
- [ ] Estrutura:
  - [ ] Lista de profissionais
  - [ ] Botão: Novo Profissional
  - [ ] Botão: Editar
  - [ ] Botão: Deletar
- [ ] Formulário com ABAS:
  - [ ] ABA 1: Dados Gerais (name, email, phone, tipo_profissional, status)
  - [ ] ABA 2: Conselho Profissional ★ (conselho, numero_conselho, cbo, uf_conselho)
  - [ ] ABA 3: Serviços (checkbox list com override valor/tempo)
  - [ ] ABA 4: Convênios (checkbox list com percentual_repasse)
  - [ ] ABA 5: Horários (semanal)
- [ ] Validações:
  - [ ] Aba 2: CBO obrigatório (★ crítico)
  - [ ] Aba 2: Conselho + numero obrigatório
  - [ ] Aba 3: Pelo menos 1 serviço vinculado
  - [ ] Aba 4: Se não tem convênio → Aviso (particular only)
  - [ ] Antes de salvar: validar com validateProfessionalForTISS()
- [ ] Integração:
  - [ ] ABA 3: Carregar serviços com listServices()
  - [ ] ABA 4: Carregar convênios com listPayers()
  - [ ] Salvar professional_services ao salvar
  - [ ] Salvar professional_payers ao salvar
- [ ] Indicador visual:
  - [ ] ✅ Verde: Pronto para XML
  - [ ] ⚠️ Amarelo: Faltam serviços ou convênios
  - [ ] 🔴 Vermelho: Faltam CBO/Conselho
- [ ] Git commit

**Tela 3: ConveniosCadastro.jsx**
- [ ] Criar arquivo: `src/pages/clinica/cadastros/ConveniosCadastro.jsx`
- [ ] Estrutura:
  - [ ] Lista de convênios
  - [ ] Botão: Novo Convênio
  - [ ] Botão: Editar
  - [ ] Botão: Deletar
- [ ] Formulário com ABAS:
  - [ ] ABA 1: Dados Gerais (nome, tipo, cnpj, status)
  - [ ] ABA 2: Configuração TISS ★ (codigo_ans, versao_tiss, padrao_tiss, url_webservice)
  - [ ] ABA 3: Profissionais (tabela: profissional + percentual_repasse)
  - [ ] ABA 4: Serviços & Preços (matriz: serviço × valor_negociado)
- [ ] Validações:
  - [ ] Aba 1: cnpj obrigatório (14 dígitos)
  - [ ] Aba 2: codigo_ans obrigatório se tipo='convenio' (★ crítico)
  - [ ] Aba 2: versao_tiss obrigatório (padrão: 3.02.00)
  - [ ] Aba 3: percentual_repasse > 0
  - [ ] Aba 4: valor_negociado > 0
  - [ ] Antes de salvar: validar com validatePayerForTISS()
- [ ] Integração:
  - [ ] ABA 3: Carregar profissionais com listProfessionals()
  - [ ] ABA 4: Carregar serviços com listServices()
  - [ ] Salvar professional_payers ao salvar (ABA 3)
  - [ ] Salvar service_prices ao salvar (ABA 4)
- [ ] Indicador visual:
  - [ ] ✅ Verde: Pronto para faturamento
  - [ ] ⚠️ Amarelo: Faltam profissionais ou preços
  - [ ] 🔴 Vermelho: Faltam ANS
- [ ] Git commit

**Tela 4: SalasCadastro.jsx**
- [ ] Criar arquivo: `src/pages/clinica/cadastros/SalasCadastro.jsx`
- [ ] Estrutura:
  - [ ] Lista de salas
  - [ ] Botão: Nova Sala
  - [ ] Botão: Editar
  - [ ] Botão: Deletar
- [ ] Formulário simples:
  - [ ] nome (obrigatório)
  - [ ] tipo (select: consultorio, exames, cirurgia, internacao)
  - [ ] capacidade
  - [ ] andar
  - [ ] bloco
  - [ ] status
- [ ] Validações: nome obrigatório
- [ ] Git commit

**Tela 5: ConfiguracaoPrices.jsx**
- [ ] Criar arquivo: `src/pages/clinica/cadastros/ConfiguracaoPrices.jsx`
- [ ] Estrutura:
  - [ ] Matriz visual (serviços × convênios)
  - [ ] Células editáveis (valor_negociado)
  - [ ] Campo: percentual_coparticipacao (calculado automaticamente)
- [ ] Funcionalidade:
  - [ ] Carregar todos os serviços (linha)
  - [ ] Carregar todos os convênios (coluna)
  - [ ] Editar inline: valor
  - [ ] Salvar automaticamente ao desfocar
  - [ ] Indicador visual: ✅ (tem preço) ou ⚠️ (sem preço)
- [ ] Git commit

### Status Fase 4
- [ ] 5 telas criadas
- [ ] Todas com validações
- [ ] Todas com indicadores visuais
- [ ] Npm run dev executa sem erros
- [ ] Commit realizado

---

## 🔗 FASE 5: INTEGRAÇÃO COM AGENDA (1 hora)

**Arquivo: src/pages/clinica/agenda/NovaAgenda.jsx (ATUALIZAR)**
- [ ] Abrir arquivo
- [ ] Adicionar validação: Ao selecionar profissional
  - [ ] Listar APENAS serviços que ele tem em professional_services
  - [ ] Mostrar erro se profissional sem serviços
  - [ ] [ ] Query: SELECT * FROM professional_services WHERE professional_id = X
- [ ] Adicionar validação: Ao selecionar convênio
  - [ ] Listar APENAS profissionais que atendem em professional_payers
  - [ ] [ ] Query: SELECT * FROM professional_payers WHERE payer_id = Y
- [ ] Adicionar validação: Ao salvar agendamento
  - [ ] Validar: profissional tem este serviço? (professional_services)
  - [ ] Validar: profissional atende este convênio? (professional_payers)
  - [ ] Validar: sala está disponível?
  - [ ] Validar: horário respeita schedule do profissional?
  - [ ] Se faltar algo: mostrar erro específico
- [ ] Teste:
  - [ ] Crie serviço SEM vincular a profissional
  - [ ] Tente agendar → Erro (esperado)
  - [ ] Vincule profissional × serviço
  - [ ] Agora funciona (esperado)
- [ ] Git commit

**Arquivo: src/components/AppointmentFormWithValidation.jsx (ATUALIZAR)**
- [ ] Abrir arquivo
- [ ] Adicionar:
  - [ ] Validação professional_services
  - [ ] Validação professional_payers
  - [ ] Preencher valor automaticamente (de service_prices)
  - [ ] Mostrar percentual_repasse (informacional)
- [ ] Teste: Agendar e ver valores preenchidos automaticamente
- [ ] Git commit

### Status Fase 5
- [ ] Agenda integrada com Base do Sistema
- [ ] Validações funcionando
- [ ] Sem erros de faturamento por validação
- [ ] Commit realizado

---

## 💰 FASE 6: FATURAMENTO & TISS (2 horas)

**Arquivo: src/lib/tissXmlGenerator.js (NOVO)**
- [ ] Criar arquivo: `src/lib/tissXmlGenerator.js`
- [ ] Implementar funções:
  - [ ] `generateGuiaConsultaXML(appointmentId)` → XML válido
  - [ ] `generateGuiaSADTXML(appointmentId)` → XML válido
  - [ ] `validateXMLBeforeSend(xml)` → Valida estrutura
  - [ ] `signXML(xml)` → Assinatura digital (opcional)
- [ ] Validações internas:
  - [ ] Serviço tem codigo_tuss? ❌ Erro
  - [ ] Profissional tem cbo? ❌ Erro
  - [ ] Convênio tem codigo_ans? ❌ Erro
  - [ ] Paciente tem CPF válido? ❌ Erro
  - [ ] Clínica tem CNPJ? ❌ Erro
  - [ ] Valor = service_prices[serviceId][payerId]? ❌ Erro
- [ ] Teste:
  - [ ] Gere XML com dados completos → Sucesso
  - [ ] Gere XML sem TUSS → Erro (esperado)
  - [ ] Gere XML sem CBO → Erro (esperado)
- [ ] Git commit

**Arquivo: src/pages/clinica/faturamento/GuiasEnvio.jsx (CRIAR/ATUALIZAR)**
- [ ] Criar ou atualizar arquivo
- [ ] Funcionalidade:
  - [ ] Lista de agendamentos não faturados
  - [ ] Botão: "Gerar Guia TISS"
  - [ ] Validação pré-geração (mostra erros)
  - [ ] Botão: "Enviar para Convênio"
  - [ ] Download XML para envio manual
- [ ] Integração:
  - [ ] Carregar agendamentos com status = 'completed'
  - [ ] Validar cada agendamento antes de gerar
  - [ ] Gerar XML com tissXmlGenerator
  - [ ] Salvar guia gerada (tabela guias? ou appointments)
  - [ ] Permitir download
- [ ] Teste:
  - [ ] Agendamento com dados completos → Gera XML
  - [ ] Agendamento incompleto → Mostra erros
- [ ] Git commit

### Status Fase 6
- [ ] XML gerado corretamente
- [ ] Interface de faturamento pronta
- [ ] Validações pré-XML funcionando
- [ ] Commit realizado

---

## ✅ FASE 7: TESTES & VALIDAÇÃO (30 minutos)

### Testes Funcionais

**TESTE 1: Serviço Completo**
- [ ] Crie serviço com codigo_tuss = "010101"
- [ ] Tente salvar SEM codigo_tuss → Erro ✅
- [ ] Salve COM codigo_tuss → Sucesso ✅
- [ ] Verificar em DB: `SELECT codigo_tuss FROM services WHERE name = ...`

**TESTE 2: Profissional Completo**
- [ ] Crie profissional com cbo = "225101"
- [ ] Tente salvar SEM cbo → Erro ✅
- [ ] Salve COM cbo + conselho + numero_conselho → Sucesso ✅
- [ ] Verificar em DB: `SELECT cbo, conselho FROM professionals WHERE name = ...`

**TESTE 3: Convênio Completo**
- [ ] Crie convênio com codigo_ans = "00123"
- [ ] Tente salvar SEM codigo_ans → Erro ✅
- [ ] Salve COM codigo_ans + cnpj → Sucesso ✅
- [ ] Verificar em DB: `SELECT codigo_ans FROM payers WHERE nome = ...`

**TESTE 4: Vínculos**
- [ ] Vincule Profissional com Serviço
- [ ] Verifique: professional_services criada ✅
- [ ] Vincule Profissional com Convênio (com % repasse)
- [ ] Verifique: professional_payers criada com percentual ✅
- [ ] Defina Preço: Serviço × Convênio
- [ ] Verifique: service_prices criada com valor ✅

**TESTE 5: Agenda Validada**
- [ ] Agende com Profissional + Serviço + Convênio
- [ ] Validar: Profissional tem este serviço? ✅
- [ ] Validar: Profissional atende este convênio? ✅
- [ ] Validar: Valor correto do service_prices? ✅

**TESTE 6: Geração de XML**
- [ ] Gere Guia para agendamento
- [ ] Validar XML estrutura ✅
- [ ] Verificar campos obrigatórios preenchidos ✅
- [ ] Download XML funciona ✅
- [ ] Abra XML em editor → estrutura válida ✅

### Testes em BD

**Validação SQL**
- [ ] Executar: SQL de validação (📋_QUICK_REFERENCE)
  - [ ] `SELECT * FROM services WHERE codigo_tuss IS NULL`
    - [ ] Deve retornar 0 (nenhum)
  - [ ] `SELECT * FROM professionals WHERE cbo IS NULL`
    - [ ] Deve retornar 0 (nenhum)
  - [ ] `SELECT * FROM payers WHERE tipo='convenio' AND codigo_ans IS NULL`
    - [ ] Deve retornar 0 (nenhum)

### Status Fase 7
- [ ] Todos os testes passaram ✅
- [ ] Nenhum erro encontrado
- [ ] Sistema pronto para produção ✅

---

## 🎉 FASE FINAL: DOCUMENTAÇÃO & COMMIT

**Documentação**
- [ ] Listar todas as APIs criadas em comentário
- [ ] Listar todas as validações implementadas
- [ ] Documentar campos adicionados (comentários em código)
- [ ] Criar README.md com instruções

**Git**
- [ ] Git add .
- [ ] Git commit -m "Estrutura Base do Sistema para XML TISS - Completo"
- [ ] Git push

**Demo/Deploy**
- [ ] Testar em staging
- [ ] Deploy para produção (se aprovado)

---

## 📊 RESUMO FINAL

```
┌──────────────────────────────────────────┐
│         PROGRESSO DE IMPLEMENTAÇÃO       │
└──────────────────────────────────────────┘

FASE 1: Leitura & Preparação        [ ] 0%  [ ] 100%
FASE 2: Migração SQL                [ ] 0%  [ ] 100%
FASE 3: APIs JavaScript             [ ] 0%  [ ] 100%
FASE 4: Componentes React           [ ] 0%  [ ] 100%
FASE 5: Integração Agenda           [ ] 0%  [ ] 100%
FASE 6: Faturamento & TISS          [ ] 0%  [ ] 100%
FASE 7: Testes & Validação          [ ] 0%  [ ] 100%

TOTAL:                              [ ] 0%  [ ] 100%
```

---

## 🎯 PRÓXIMO PASSO IMEDIATO

```
➡️ Você está aqui: Lendo este checklist

AGORA:
1. [ ] Marque: FASE 1 como "LENDO"
2. [ ] Abra: ⚡_RESUMO_EXECUTIVO_1_PAGINA.md
3. [ ] Leia: Todas as 3 páginas (3 minutos)
4. [ ] Marque: FASE 1 como "COMPLETO" ✅
5. [ ] Passe para: FASE 2 (SQL no Supabase)

TEMPO ESTIMADO: 3 minutos

RESULTADO: Entendimento 100% claro do que fazer
```

---

**Última Atualização:** 18/01/2026  
**Status:** ✅ Pronto para começar AGORA  
**Tempo Total:** 6-8 horas  
**Próximo Passo:** Ler RESUMO EXECUTIVO
