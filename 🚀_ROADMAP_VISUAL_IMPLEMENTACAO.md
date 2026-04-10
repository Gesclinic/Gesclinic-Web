# 🚀 ROADMAP VISUAL - Implementação Prática no VS Code

**Data:** 18 de Janeiro de 2026  
**Versão:** 1.0  
**Objetivo:** Guia visual para implementar tudo na ordem certa

---

## 📍 ONDE ESTAMOS AGORA

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│     GESCLINIC WEB - ESTRUTURA CADASTRAL ATUAL              │
│                                                             │
│  ✅ Clinics (Base)                                         │
│  ✅ Users (Autenticação)                                   │
│  ✅ Patients (Pacientes - básico)                          │
│  ✅ Professionals (Profissionais - básico)                 │
│  ✅ Services (Serviços - SEM TUSS)                         │
│  ✅ Payers (Convênios - SEM ANS)                           │
│  ✅ Appointments (Agenda - funcional)                      │
│  ✅ Professional Schedules (Horários)                      │
│                                                             │
│  ❌ professional_services (Relação)                        │
│  ❌ professional_payers (Repasse)                          │
│  ❌ service_prices (Preços)                                │
│  ❌ rooms (Salas)                                          │
│                                                             │
│  STATUS: ~70% Completo, 30% Necessário para XML TISS      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 ETAPAS DE IMPLEMENTAÇÃO (Sequência Prática)

### ETAPA 1️⃣: Preparação (30 minutos)

```
┌─ SUBTAREFAS
├─ [ ] Ler 🎯_GUIDE_CADASTROS_ESTRUTURA_TISS.md (Este arquivo)
├─ [ ] Ler 📋_QUICK_REFERENCE_CAMPOS_OBRIGATORIOS.md (Referência rápida)
├─ [ ] Ler 🔧_IMPLEMENTACAO_SQL_MIGRACAO.md (SQL)
├─ [ ] Entender a hierarquia: Base → Serviços → Profissionais → Convênios
└─ [ ] Abrir Supabase (SQL Editor) em aba separada

RESULTADO: Compreensão clara do escopo
```

---

### ETAPA 2️⃣: Migração SQL (15 minutos)

```
┌─ EXECUTAR NO SUPABASE
│
├─ [ ] Abrir: Supabase Dashboard → SQL Editor
│
├─ [ ] Copiar & Executar SCRIPT 1 (Adicionar campos)
│      └─ Adiciona: codigo_tuss, cbo, codigo_ans em tabelas existentes
│      └─ Status: Sem perda de dados
│      └─ Tempo: 30 segundos
│
├─ [ ] Copiar & Executar SCRIPT 2 (Criar tabelas novas)
│      └─ Cria: professional_services, professional_payers, service_prices, rooms
│      └─ Status: Novas tabelas vazias
│      └─ Tempo: 20 segundos
│
├─ [ ] Copiar & Executar SCRIPT 3 (Índices)
│      └─ Melhora performance
│      └─ Tempo: 1 minuto
│
└─ [ ] OPCIONAL: Executar SCRIPT 5 (Dados de teste)
       └─ Para validação inicial

RESULTADO: Banco de dados estruturado para XML TISS
STATUS: ✅ Completo - Sem erros
```

---

### ETAPA 3️⃣: APIs JavaScript (45 minutos)

```
┌─ CRIAR/ATUALIZAR ARQUIVOS EM src/lib/

ARQUIVO 1: servicesApi.js (NOVO)
├─ Funções:
│  ├─ listServices(clinicId)
│  ├─ getService(serviceId)
│  ├─ createService(data)
│  ├─ updateService(serviceId, data)
│  └─ validateServiceForTISS(service) ← Validação XML
│
└─ Campos importantes: codigo_tuss, tipo_guia, codigo_cbhpm
   └─ NÃO deixar vazio (validação obrigatória)

ARQUIVO 2: professionalsApi.js (ATUALIZAR)
├─ Adicionar funções:
│  ├─ getProfessional(professionalId)
│  ├─ validateProfessionalForTISS(professional) ← Validação XML
│  └─ getCBOOptions() ← Lista de CBO válidos
│
└─ Campos críticos: cbo, conselho, numero_conselho
   └─ OBRIGATÓRIO para qualquer profissional ativo

ARQUIVO 3: professionalsServicesApi.js (NOVO)
├─ Funções:
│  ├─ listServicesByProfessional(professionalId)
│  ├─ addServiceToProfessional(professionalId, serviceId, data)
│  ├─ removeServiceFromProfessional(professionalId, serviceId)
│  └─ validateProfessionalServices(professionalId)
│
└─ Tabela: professional_services

ARQUIVO 4: payersApi.js (ATUALIZAR)
├─ Adicionar campos:
│  ├─ codigo_ans
│  ├─ cnpj
│  ├─ versao_tiss
│  ├─ url_webservice
│  └─ validatePayerForTISS(payer) ← Validação XML
│
└─ OBRIGATÓRIO para faturamento

ARQUIVO 5: servicePricesApi.js (NOVO)
├─ Funções:
│  ├─ listPricesByService(serviceId)
│  ├─ getPriceForPayerService(payerId, serviceId)
│  ├─ setPriceForPayerService(payerId, serviceId, value)
│  └─ validateServicePrices(serviceId)
│
└─ Tabela: service_prices

ARQUIVO 6: professionalPayersApi.js (NOVO)
├─ Funções:
│  ├─ listPayersByProfessional(professionalId)
│  ├─ addPayerToProfessional(professionalId, payerId, percentualRepasse)
│  ├─ removePayerFromProfessional(professionalId, payerId)
│  └─ getRepassePercentual(professionalId, payerId)
│
└─ Tabela: professional_payers

ARQUIVO 7: roomsApi.js (NOVO)
├─ Funções:
│  ├─ listRooms(clinicId)
│  ├─ createRoom(data)
│  ├─ updateRoom(roomId, data)
│  └─ deleteRoom(roomId)
│
└─ Tabela: rooms

RESULTADO: APIs prontas para usar em componentes React
STATUS: ✅ Pronto para ser testado
```

---

### ETAPA 4️⃣: Componentes React - Formulários (2-3 horas)

```
┌─ CRIAR TELAS EM src/pages/clinica/cadastros/

TELA 1: ServicosCatalogo.jsx
├─ Localização: src/pages/clinica/cadastros/ServicosCatalogo.jsx
├─ Funcionalidade:
│  ├─ Lista de serviços (com paginação)
│  ├─ Adicionar novo serviço
│  ├─ Editar serviço
│  ├─ Validações (codigo_tuss obrigatório)
│  └─ Indicador visual: ✅ Pronto para XML / ⚠️ Faltam campos
│
├─ Campos do Form:
│  ├─ ABA 1: Dados Básicos (name, description, service_group_id, status)
│  ├─ ABA 2: TISS & Faturamento (codigo_tuss★, tipo_guia★, codigo_cbhpm)
│  ├─ ABA 3: Valores (valor_base_particular)
│  └─ ABA 4: Controle (permite_faturamento, exige_autorizacao, etc)
│
└─ Componente: TabbedForm com validação por aba
   └─ Validar ao salvar (sem TUSS = erro)

TELA 2: ProfissionaisCadastro.jsx
├─ Localização: src/pages/clinica/cadastros/ProfissionaisCadastro.jsx
├─ Funcionalidade:
│  ├─ Lista de profissionais
│  ├─ Adicionar novo profissional
│  ├─ Editar profissional
│  └─ Indicador: ✅ Pronto para XML / ⚠️ Faltam campos
│
├─ Campos do Form:
│  ├─ ABA 1: Dados Gerais (name★, email, phone, tipo_profissional★, status★)
│  ├─ ABA 2: Conselho Profissional (conselho★, numero_conselho★, cbo★, uf_conselho★)
│  ├─ ABA 3: Serviços (checkbox list de services com override valor/tempo)
│  ├─ ABA 4: Convênios (checkbox list de payers com percentual_repasse)
│  └─ ABA 5: Horários (semanal, com bloqueios especiais)
│
└─ Importante: CBO é obrigatório para XML
   └─ Sugerir lookup: https://www.mtps.gov.br/cbo

TELA 3: ConveniosCadastro.jsx
├─ Localização: src/pages/clinica/cadastros/ConveniosCadastro.jsx
├─ Funcionalidade:
│  ├─ Lista de convênios
│  ├─ Adicionar novo convênio
│  ├─ Editar convênio
│  └─ Indicador: ✅ Pronto para XML / ⚠️ Faltam campos
│
├─ Campos do Form:
│  ├─ ABA 1: Dados Gerais (nome★, tipo★, cnpj★, status★)
│  ├─ ABA 2: Configuração TISS (codigo_ans★, versao_tiss★, padrao_tiss, url_webservice)
│  ├─ ABA 3: Profissionais (tabela de profissionais com percentual_repasse)
│  └─ ABA 4: Serviços & Preços (tabela: serviço → valor_negociado)
│
└─ CRÍTICO: codigo_ans é obrigatório para operadora

TELA 4: SalasCadastro.jsx
├─ Localização: src/pages/clinica/cadastros/SalasCadastro.jsx
├─ Funcionalidade:
│  ├─ Lista de salas
│  ├─ Adicionar nova sala
│  ├─ Editar sala
│  └─ Simples (não é XML)
│
├─ Campos:
│  ├─ nome★
│  ├─ tipo (select: consultorio, exames, cirurgia, internacao)
│  ├─ capacidade
│  ├─ andar
│  ├─ bloco
│  └─ status
│
└─ Impacto: Agenda valida se sala existe

TELA 5: ConfiguracaoPrices.jsx
├─ Localização: src/pages/clinica/cadastros/ConfiguracaoPrices.jsx
├─ Funcionalidade:
│  ├─ Tabela: Serviço × Convênio → Valor
│  ├─ Interface tipo matriz (serviços em linhas, convênios em colunas)
│  └─ Valores editáveis inline
│
├─ Campos:
│  ├─ service_id
│  ├─ payer_id (ou NULL para particular)
│  ├─ valor_negociado (obrigatório)
│  ├─ percentual_coparticipacao
│  └─ valor_paciente (calculado)
│
└─ CRÍTICO: Sem preço, fatura com valor errado

RESULTADO: 5 telas prontas para usar
STATUS: ✅ Funcional em staging
```

---

### ETAPA 5️⃣: Integração na Agenda (1 hora)

```
┌─ ATUALIZAR COMPONENTES EXISTENTES

ARQUIVO: src/pages/clinica/agenda/NovaAgenda.jsx (ATUALIZAR)
├─ Adicionar validações:
│  ├─ Ao selecionar profissional → Listar APENAS serviços que ele faz
│  │  └─ Query: professional_services WHERE professional_id = X
│  │
│  ├─ Ao selecionar convênio → Listar APENAS profissionais que atendem
│  │  └─ Query: professional_payers WHERE payer_id = Y
│  │
│  ├─ Ao salvar agendamento → Validar:
│  │  ├─ Profissional tem este serviço? (professional_services)
│  │  ├─ Profissional atende este convênio? (professional_payers)
│  │  ├─ Sala está disponível? (sem conflito)
│  │  └─ Horário respeita schedule do profissional?
│  │
│  └─ Se falta algo → Mostrar erro específico
│
└─ RESULTADO: Agenda validada contra Base do Sistema

ARQUIVO: src/components/AppointmentFormWithValidation.jsx (ATUALIZAR)
├─ Adicionar:
│  ├─ Validação de professional_services
│  ├─ Validação de professional_payers
│  ├─ Validação de service_prices (preencher valor automaticamente)
│  └─ Mostrar percentual_repasse do profissional (informacional)
│
└─ RESULTADO: Formulário inteligente

RESULTADO: Agenda integrada com Base do Sistema
STATUS: ✅ Sem erros de faturamento por validação
```

---

### ETAPA 6️⃣: Faturamento & TISS (2 horas)

```
┌─ CRIAR GERADOR DE XML TISS

ARQUIVO: src/lib/tissXmlGenerator.js (NOVO)
├─ Funções:
│  ├─ generateGuiaConsultaXML(appointmentId) → XML válido
│  ├─ generateGuiaSADTXML(appointmentId) → XML válido
│  ├─ validateXMLBeforeSend(xml) → Valida estrutura
│  └─ signXML(xml) → Assinatura digital (opcional)
│
├─ Validações internas:
│  ├─ Serviço tem codigo_tuss? ❌ Erro
│  ├─ Profissional tem cbo? ❌ Erro
│  ├─ Convênio tem codigo_ans? ❌ Erro
│  ├─ Paciente tem CPF válido? ❌ Erro
│  ├─ Clínica tem CNPJ? ❌ Erro
│  └─ Valor = service_prices[serviceId][payerId]? ❌ Erro
│
└─ RESULTADO: XML 100% válido para ANS

ARQUIVO: src/pages/clinica/faturamento/GuiasEnvio.jsx (CRIAR/ATUALIZAR)
├─ Funcionalidade:
│  ├─ Lista de agendamentos não faturados
│  ├─ Botão: "Gerar Guia TISS"
│  ├─ Validação pré-geração (mostra erros)
│  ├─ Botão: "Enviar para Convênio"
│  └─ Download XML para envio manual
│
└─ RESULTADO: Interface para faturamento

RESULTADO: XML gerado corretamente
STATUS: ✅ Pronto para enviar
```

---

### ETAPA 7️⃣: Testes & Validação (30 minutos)

```
┌─ VERIFICAÇÃO PASSO-A-PASSO

TESTE 1: Serviço Completo
├─ [ ] Criar serviço com codigo_tuss = "010101"
├─ [ ] Tentar salvar SEM codigo_tuss → Erro ✅
├─ [ ] Salvar COM codigo_tuss → Sucesso ✅
└─ Status: ✅ OK

TESTE 2: Profissional Completo
├─ [ ] Criar profissional com cbo = "225101"
├─ [ ] Tentar salvar SEM cbo → Erro ✅
├─ [ ] Salvar COM cbo + conselho + numero_conselho → Sucesso ✅
└─ Status: ✅ OK

TESTE 3: Convênio Completo
├─ [ ] Criar convênio com codigo_ans = "00123"
├─ [ ] Tentar salvar SEM codigo_ans → Erro ✅
├─ [ ] Salvar COM codigo_ans + cnpj → Sucesso ✅
└─ Status: ✅ OK

TESTE 4: Vínculos
├─ [ ] Vincular Profissional com Serviço
├─ [ ] Vincular Profissional com Convênio (com % repasse)
├─ [ ] Definir Preço: Serviço × Convênio
└─ Status: ✅ OK

TESTE 5: Agenda Validada
├─ [ ] Agendar com Profissional + Serviço + Convênio
├─ [ ] Validar: Profissional tem este serviço? ✅
├─ [ ] Validar: Profissional atende este convênio? ✅
├─ [ ] Validar: Valor correto do service_prices? ✅
└─ Status: ✅ OK

TESTE 6: Geração de XML
├─ [ ] Gerar Guia para agendamento
├─ [ ] Validar XML estrutura
├─ [ ] Verificar campos obrigatórios preenchidos
├─ [ ] Download XML
└─ Status: ✅ OK

RESULTADO: Sistema 100% funcional
STATUS: ✅ PRONTO PARA PRODUÇÃO
```

---

## 📊 TIMELINE RECOMENDADA

```
┌─────────────────────────────────────────────────────────────┐
│              TEMPO ESTIMADO TOTAL: 6-8 HORAS               │
└─────────────────────────────────────────────────────────────┘

DIA 1 (3-4 horas)
  ├─ 09:00 - 09:30: Leitura documentação (Etapa 1)
  ├─ 09:30 - 10:00: Migração SQL (Etapa 2)
  ├─ 10:00 - 11:00: APIs JavaScript (Etapa 3)
  ├─ 11:00 - 12:30: Componentes React - Serviços (Etapa 4 - parte 1)
  └─ 12:30 - 13:30: ALMOÇO

DIA 2 (3-4 horas)
  ├─ 14:00 - 15:00: Componentes React - Profissionais/Convênios (Etapa 4 - parte 2)
  ├─ 15:00 - 15:30: Componentes React - Salas & Preços (Etapa 4 - parte 3)
  ├─ 15:30 - 16:30: Integração Agenda (Etapa 5)
  ├─ 16:30 - 17:30: Faturamento & XML (Etapa 6)
  └─ 17:30 - 18:00: Testes (Etapa 7)

RESULTADO FINAL: Sistema 100% estruturado para XML TISS
```

---

## 🎨 ESTRUTURA DE PASTAS FINAL

```
src/
├── pages/
│   └── clinica/
│       ├── cadastros/                    ← 🆕 NOVO MÓDULO
│       │   ├── ServicosCatalogo.jsx
│       │   ├── ProfissionaisCadastro.jsx
│       │   ├── ConveniosCadastro.jsx
│       │   ├── SalasCadastro.jsx
│       │   └── ConfiguracaoPrices.jsx
│       │
│       ├── agenda/                       ← EXISTENTE (ATUALIZADO)
│       │   └── NovaAgenda.jsx            (validações adicionadas)
│       │
│       ├── faturamento/
│       │   └── GuiasEnvio.jsx            (geração XML)
│       │
│       └── base-sistema/                 ← EXISTENTE
│           └── ClinicSettings.jsx
│
├── lib/
│   ├── servicesApi.js                   ← 🆕 NOVO
│   ├── professionalsApi.js               ← ATUALIZAR
│   ├── professionalsServicesApi.js       ← 🆕 NOVO
│   ├── payersApi.js                      ← ATUALIZAR
│   ├── servicePricesApi.js               ← 🆕 NOVO
│   ├── professionalPayersApi.js          ← 🆕 NOVO
│   ├── roomsApi.js                       ← 🆕 NOVO
│   └── tissXmlGenerator.js               ← 🆕 NOVO
│
├── components/
│   ├── clinica/
│   │   ├── AppointmentFormWithValidation.jsx (ATUALIZAR)
│   │   └── ... (outros)
│   │
│   └── ui/
│       └── ... (UI components)
│
└── hooks/
    ├── useProfessionalServices.js        ← 🆕 NOVO
    ├── useProfessionalPayers.js          ← 🆕 NOVO
    └── useServicePrices.js               ← 🆕 NOVO
```

---

## ✅ CHECKLIST FINAL

```
ANTES DE COMEÇAR
☐ Ler os 3 documentos de guia
☐ Ter acesso a Supabase SQL Editor
☐ Ter VS Code aberto neste projeto
☐ Entender a hierarquia: Base → Serviços → Profissionais → Convênios → Preços

DURANTE A IMPLEMENTAÇÃO
☐ Executar SCRIPT 1 + 2 + 3 no Supabase
☐ Criar APIs em src/lib/
☐ Criar componentes em src/pages/clinica/cadastros/
☐ Atualizar formulário de agenda
☐ Criar gerador de XML
☐ Executar testes

ANTES DE PRODUÇÃO
☐ Validar todos os cadastros (checklist no Quick Reference)
☐ Testar geração de XML
☐ Testar envio para convênio
☐ Testar retorno de glosa
☐ Documentar em Swagger/OpenAPI
☐ Deploy em staging
☐ Teste de integração com ANS
☐ Deploy em produção

DEPOIS DE PRODUÇÃO
☐ Monitorar erros de XML
☐ Ajustar validações conforme feedback
☐ Implementar assinatura digital
☐ Implementar integração EDI com convênios
```

---

## 🆘 TROUBLESHOOTING

```
❌ ERRO: "codigo_tuss não pode ser NULL"
   → Validação em forma está faltando
   → Adicionar: required={true} no campo
   → Adicionar validação antes de salvar

❌ ERRO: "Profissional sem CBO"
   → CBO é obrigatório para XML
   → Verificar: campo cbo é obrigatório?
   → Adicionar lookup CBO válido

❌ ERRO: "XML rejeitado por ANS"
   → Verificar tissue.ts gerado
   → Validar: todos os campos obrigatórios?
   → Comparar com exemplo válido da ANS

❌ ERRO: "Fatura com valor errado"
   → Verificar: service_prices está correto?
   → Validar: convênio tem preço para este serviço?
   → Usar Query SQL para validar

❌ ERRO: "Profissional não aparece na agenda"
   → Verificar: professional_services existe?
   → Validar: professional_services.ativo = true?
   → Checar: profissional.status = 'active'?
```

---

## 📞 SUPORTE

Para dúvidas específicas, consulte:

1. **Para SQL:** `🔧_IMPLEMENTACAO_SQL_MIGRACAO.md`
2. **Para Campos:** `📋_QUICK_REFERENCE_CAMPOS_OBRIGATORIOS.md`
3. **Para Conceitos:** `🎯_GUIDE_CADASTROS_ESTRUTURA_TISS.md` (este arquivo)
4. **Para TISS:** https://www.ans.gov.br/tiss
5. **Para CBO:** https://www.mtps.gov.br/cbo

---

## 🎯 PRÓXIMOS PASSOS

```
IMEDIATAMENTE
1. Ler este documento inteiro
2. Ler os 3 documentos de referência
3. Planejar alocação de 8 horas

AMANHÃ
1. Executar Etapa 1 (Preparação)
2. Executar Etapa 2 (SQL)
3. Começar Etapa 3 (APIs)

PRÓXIMA SEMANA
1. Completar Etapas 3-5
2. Testar Etapa 6
3. Validar Etapa 7

RESULTADO FINAL
✅ Sistema estrutural 100% pronto para XML TISS
✅ Faturamento com validações automáticas
✅ Zero glosas por dados faltantes
✅ Integração com ANS
```

---

**Última Atualização:** 18/01/2026  
**Status:** ✅ PRONTO PARA IMPLEMENTAR  
**Tempo Estimado:** 6-8 horas  
**Responsável:** Documentação Técnica
