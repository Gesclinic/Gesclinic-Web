# 🎯 GUIA TÉCNICO - ESTRUTURA DE CADASTROS PARA TISS & FATURAMENTO

**Data:** 18 de Janeiro de 2026  
**Versão:** 2.0 - Pronto para VS Code  
**Status:** ✅ GUIA ACIONÁVEL - Implementar conforme sequência

---

## 🧠 VISÃO GERAL - O CONCEITO-CHAVE

> **Base do Sistema = Núcleo Estrutural**
>
> Base do Sistema NÃO é um "cadastro comum". É:
> - ✅ Estrutura que LIBERA Agenda
> - ✅ Estrutura que LIBERA Faturamento  
> - ✅ Estrutura que LIBERA Repasse
> - ✅ Estrutura que LIBERA XML TISS

Portanto: **cada cadastro precisa de campos mínimos, dependências claras e impactos em cascata**.

---

## 📊 SEQUÊNCIA LÓGICA PARA IMPLEMENTAÇÃO

```
┌─────────────────────────────────────────────────────────┐
│  ORDEM DE IMPLEMENTAÇÃO (DO MÁS IMPORTANTE PRÁ MENOS)  │
└─────────────────────────────────────────────────────────┘

1️⃣  SERVIÇOS/PROCEDIMENTOS     ← Tudo depende disso
2️⃣  PROFISSIONAIS              ← Quem executa?  
3️⃣  CONVÊNIOS                  ← Para quem faturar?
4️⃣  SALAS/EQUIPAMENTOS         ← Onde executar?
5️⃣  VÍNCULOS (relações)        ← Faz funcionarem juntos
6️⃣  PARÂMETROS FINANCEIROS     ← Valores e comissões
```

---

## 🔴 SEÇÃO 1: CADASTROS ESTRUTURAIS

### 1️⃣ SERVIÇOS / PROCEDIMENTOS

#### ✅ Tabelas Envolvidas
```javascript
// Banco de dados
tables {
  services              // Serviço principal
  service_groups        // Agrupamento (Consultas, Exames, Procedimentos)
  service_prices        // Valores por convênio
  professional_services // Relação profissional × serviço
}
```

#### 📌 CAMPOS MÍNIMOS (obrigatórios)

```sql
-- SERVICES TABLE
-- Identificação
✅ id (UUID)
✅ clinic_id (FK → clinics)
✅ name (TEXT) - "Consulta Oftalmológica"
✅ description (TEXT) - Descrição detalhada
✅ service_group_id (FK → service_groups) - Tipo de serviço
✅ status (ENUM: 'active', 'inactive')

-- Faturamento / XML TISS
✅ codigo_tuss (TEXT UNIQUE) - Código TUSS do serviço
✅ codigo_cbhpm (TEXT) - Código CBHPM (para relatórios)
✅ tipo_guia (ENUM: 'consulta', 'sadt', 'internacao')
✅ unidade_medida (ENUM: 'sessao', 'unidade', 'minuto')
✅ duracao_padrao_minutos (INT) - Padrão 30 minutos
✅ valor_base_particular (DECIMAL) - Valor padrão

-- Controle Operacional
✅ permite_faturamento (BOOLEAN) - Pode faturar?
✅ exige_autorizacao (BOOLEAN) - Precisa de auth?
✅ exige_profissional_executante (BOOLEAN) - Quem executa?
✅ exige_profissional_solicitante (BOOLEAN) - Para SADT
✅ permite_multiplos_profissionais (BOOLEAN) - Cirurgia

-- Auditoria
✅ created_at (TIMESTAMP)
✅ updated_at (TIMESTAMP)
```

#### 🔗 DEPENDÊNCIAS

```
Serviços → Profissionais
  (Profissional A pode fazer Consulta, Profissional B não)
  Tabela: professional_services

Serviços → Salas
  (Consulta → Consultório, Ultrassom → Sala de Exames)
  Tabela: TBD (service_rooms ou room_services)

Serviços → Valores por Convênio
  (Convênio X paga R$ 50, Convênio Y paga R$ 60)
  Tabela: service_prices

Serviços → Agenda
  (Define duração mínima, conflitos, etc)
```

#### 🚦 IMPACTO SE FALTAR

```
❌ Não agenda (sem duração)
❌ Não fatura (sem código TUSS)
❌ Não gera XML (sem TUSS/CBHPM)
❌ Rejeição ANS (dados incompletos)
🔴 GLOSA CERTA (faturamento inválido)
```

#### 💡 IMPLEMENTAÇÃO NO VS CODE

**Arquivo:** `src/pages/clinica/cadastros/ServicosCatalogo.jsx`

```jsx
// Form para criar/editar serviço
const campos = [
  { label: 'Nome', name: 'name', type: 'text', required: true },
  { label: 'Descrição', name: 'description', type: 'textarea' },
  { label: 'Tipo de Serviço', name: 'service_group_id', type: 'select', required: true },
  { label: 'Código TUSS', name: 'codigo_tuss', type: 'text', required: true, pattern: /^\d{6}$/ },
  { label: 'Código CBHPM', name: 'codigo_cbhpm', type: 'text' },
  { label: 'Tipo de Guia', name: 'tipo_guia', type: 'select', required: true },
  { label: 'Duração (min)', name: 'duracao_padrao_minutos', type: 'number', required: true },
  { label: 'Valor Base (Particular)', name: 'valor_base_particular', type: 'currency' },
  { label: 'Permite Faturamento?', name: 'permite_faturamento', type: 'checkbox' },
  { label: 'Exige Autorização?', name: 'exige_autorizacao', type: 'checkbox' },
]
```

---

### 2️⃣ PROFISSIONAIS

#### ✅ Tabelas Envolvidas
```javascript
tables {
  professionals           // Profissional principal
  professional_schedules  // Horários de atendimento
  professional_services   // Serviços que executa
  professional_payers     // Convênios que atende
}
```

#### 📌 CAMPOS MÍNIMOS

```sql
-- PROFESSIONALS TABLE
-- Identificação
✅ id (UUID)
✅ clinic_id (FK → clinics)
✅ name (TEXT) - Nome completo
✅ email (TEXT) - Email profissional
✅ phone (TEXT) - Telefone
✅ status (ENUM: 'active', 'inactive', 'on_leave')

-- Conselho Profissional (XML obrigatório)
✅ tipo_profissional (ENUM: 'medico', 'fisioterapeuta', 'psicolog', 'dentista', etc)
✅ conselho (VARCHAR 20) - CRM, CREFITO, CRP
✅ numero_conselho (TEXT UNIQUE) - Número do registro
✅ uf_conselho (VARCHAR 2) - UF do conselho
✅ data_inscricao_conselho (DATE) - Quando se registrou

-- XML / Faturamento
✅ cbo (VARCHAR 10) - Código Brasileiro de Ocupações (OBRIGATÓRIO no XML)
✅ papel_atendimento (ENUM: 'executante', 'solicitante', 'ambos')
✅ permite_faturamento_direto (BOOLEAN)

-- Credentials
✅ rqe (TEXT) - Registro de Qualificação Especial (se médico)

-- Auditoria
✅ created_at (TIMESTAMP)
✅ updated_at (TIMESTAMP)
```

#### 🔗 DEPENDÊNCIAS

```
Profissionais × Serviços
  Define: Quem pode fazer o quê?
  Tabela: professional_services
  Campos: { professional_id, service_id, valor_especifico?, tempo_especifico? }

Profissionais × Convênios
  Define: Para quais convênios cobra?
  Tabela: professional_payers
  Campos: { professional_id, payer_id, percentual_repasse?, status }

Profissionais × Horários
  Define: Quando está disponível?
  Tabela: professional_schedules
  Campos: { professional_id, weekday, start_time, end_time, appointment_duration }

Profissionais → Agenda
  Se profissional_id = NULL → Agenda genérica (erro!)
```

#### 🚦 IMPACTO SE FALTAR

```
❌ XML inválido (sem CBO)
❌ Repasse incorreto (sem profissional × convênio)
❌ GLOSA automática (faturamento inválido)
⚠️  Agenda quebrada (sem profissional)
```

#### 💡 IMPLEMENTAÇÃO NO VS CODE

**Arquivo:** `src/pages/clinica/cadastros/ProfissionaisCadastro.jsx`

```jsx
// TABS: Dados Gerais | Conselho | Serviços | Convênios | Horários

const abasForm = [
  {
    label: 'Dados Gerais',
    fields: [
      { label: 'Nome Completo', name: 'name', type: 'text', required: true },
      { label: 'Email', name: 'email', type: 'email' },
      { label: 'Telefone', name: 'phone', type: 'tel' },
      { label: 'Tipo de Profissional', name: 'tipo_profissional', type: 'select', required: true },
      { label: 'Status', name: 'status', type: 'select', required: true },
    ]
  },
  {
    label: 'Conselho Profissional', // 🔴 OBRIGATÓRIO PARA XML
    fields: [
      { label: 'Órgão Regulador', name: 'conselho', type: 'select', required: true, help: 'CRM, CREFITO, CRP...' },
      { label: 'Número do Registro', name: 'numero_conselho', type: 'text', required: true },
      { label: 'UF', name: 'uf_conselho', type: 'select', required: true },
      { label: 'CBO (Código Brasileiro de Ocupações)', name: 'cbo', type: 'text', required: true, pattern: /^\d{6}$/ },
      { label: 'RQE (se aplicável)', name: 'rqe', type: 'text' },
    ]
  },
  {
    label: 'Serviços',
    fields: [
      // Checkbox list de services
      // Mostrar: service.name, tipo_guia, duracao_padrao
      // Permitir override de valor/tempo específico
    ]
  },
  {
    label: 'Convênios',
    fields: [
      // Checkbox list de payers (convênios)
      // Mostrar: payer.name, codigo_ans
      // Campo: percentual_repasse
    ]
  },
  {
    label: 'Horários',
    fields: [
      // Semanal: Seg-Dom
      // Campos: start_time, end_time, appointment_duration
      // Toggle: Bloqueios especiais (férias, etc)
    ]
  }
]
```

---

### 3️⃣ CONVÊNIOS

#### ✅ Tabelas Envolvidas
```javascript
tables {
  payers           // Convênio/Segurador
  plans            // Planos dentro do convênio
  professional_payers // Profissional × Convênio
  service_prices   // Valores negociados
}
```

#### 📌 CAMPOS MÍNIMOS

```sql
-- PAYERS TABLE (Convênios/Seguradoras)
-- Identificação
✅ id (UUID)
✅ clinic_id (FK → clinics)
✅ nome (TEXT) - "Convênio XYZ"
✅ tipo (ENUM: 'convenio', 'particular', 'governo')
✅ status (ENUM: 'active', 'inactive', 'suspended')

-- Faturamento / XML TISS
✅ cnpj (TEXT UNIQUE) - CNPJ da operadora
✅ codigo_ans (VARCHAR 5) - Registro ANS (se operadora de saúde)
✅ versao_tiss (VARCHAR 20) - "3.02.00" (padrão ANS)
✅ padrao_tiss (BOOLEAN) - Segue padrão TISS? (sim/não)

-- Modelo de Guia
✅ modelo_guia_padrao (ENUM: 'consulta', 'sadt', 'internacao')
✅ requer_guia_impressa (BOOLEAN) - Ou aceitaal eletrônica?

-- Regras
✅ exige_autorizacao (BOOLEAN)
✅ exige_profissional_solicitante (BOOLEAN) - Para SADT
✅ dias_validade_autorizacao (INT) - Quanto tempo vale a auth?
✅ dias_antecedencia_minima_agenda (INT) - Aviso prévio?

-- Webservice / Integração
✅ url_webservice (TEXT) - URL para envio TISS
✅ usuario_webservice (TEXT ENCRYPTED)
✅ senha_webservice (TEXT ENCRYPTED)
✅ ultimo_envio (TIMESTAMP)

-- Auditoria
✅ created_at (TIMESTAMP)
✅ updated_at (TIMESTAMP)
```

#### 🔗 DEPENDÊNCIAS

```
Convênios × Profissionais
  Define: Profissional X atende Convênio Y?
  Tabela: professional_payers
  Campos: { professional_id, payer_id, ativo?, percentual_repasse? }

Convênios × Serviços × Preços
  Define: Serviço X com Convênio Y custa R$ Z
  Tabela: service_prices
  Campos: { service_id, payer_id, valor_negociado, percentual_coparticipacao }

Convênios → Faturamento
  Se convênio_id = NULL → Particular
  Se Particular → Sem TISS, sem glosa, sem XML
```

#### 🚦 IMPACTO SE FALTAR

```
❌ XML rejeitado (sem código ANS)
❌ GLOSA automática (valores errados)
❌ Integração webservice falha (sem URL)
⚠️  Agenda sem validação (sem exigências)
```

#### 💡 IMPLEMENTAÇÃO NO VS CODE

**Arquivo:** `src/pages/clinica/cadastros/ConveniosCadastro.jsx`

```jsx
// TABS: Dados Gerais | Configuração TISS | Profissionais | Serviços & Preços

const abasForm = [
  {
    label: 'Dados Gerais',
    fields: [
      { label: 'Nome do Convênio', name: 'nome', type: 'text', required: true },
      { label: 'Tipo', name: 'tipo', type: 'select', required: true },
      { label: 'CNPJ', name: 'cnpj', type: 'text', required: true, pattern: /^\d{14}$/ },
      { label: 'Status', name: 'status', type: 'select', required: true },
    ]
  },
  {
    label: 'Configuração TISS',
    fields: [
      { label: 'Código ANS', name: 'codigo_ans', type: 'text', required: true, help: '5 dígitos' },
      { label: 'Versão TISS', name: 'versao_tiss', type: 'text', required: true, value: '3.02.00' },
      { label: 'Padrão TISS?', name: 'padrao_tiss', type: 'checkbox' },
      { label: 'URL Webservice', name: 'url_webservice', type: 'text' },
      { label: 'Usuário Webservice', name: 'usuario_webservice', type: 'text' },
      { label: 'Senha Webservice', name: 'senha_webservice', type: 'password' },
    ]
  },
  {
    label: 'Profissionais',
    fields: [
      // Tabela de profissionais com checkbox + percentual_repasse
    ]
  },
  {
    label: 'Serviços & Preços',
    fields: [
      // Tabela de serviços com valores negociados
      // Campos: service_id, valor_negociado, coparticipacao_paciente
    ]
  }
]
```

---

### 4️⃣ SALAS / EQUIPAMENTOS

#### ✅ Tabelas Envolvidas
```javascript
tables {
  rooms           // Salas de atendimento
  resources       // Equipamentos/Recursos
}
```

#### 📌 CAMPOS MÍNIMOS

```sql
-- ROOMS TABLE
✅ id (UUID)
✅ clinic_id (FK → clinics)
✅ nome (TEXT) - "Consultório 01", "Sala de Exames"
✅ tipo (ENUM: 'consultorio', 'exames', 'cirurgia', 'internacao')
✅ andar (INT) - Nível (opcional)
✅ bloco (VARCHAR 20) - Bloco/Ala (opcional)
✅ capacidade (INT) - Quantos pacientes por vez?
✅ status (ENUM: 'active', 'inactive', 'maintenance')
✅ created_at (TIMESTAMP)

-- RESOURCES TABLE (Equipamentos)
✅ id (UUID)
✅ clinic_id (FK → clinics)
✅ nome (TEXT) - "Ultrassom Mindray", "Maca de Cirurgia"
✅ tipo (ENUM: 'equipamento', 'material', 'maquina')
✅ room_id (FK → rooms, NULLABLE) - Se exclusivo de uma sala
✅ status (ENUM: 'active', 'inactive', 'maintenance')
✅ created_at (TIMESTAMP)
```

#### 🔗 DEPENDÊNCIAS

```
Salas × Serviços
  Define: Serviço X só pode ser feito em Sala Y
  Não há tabela explícita → Usar campo em Services?
  
Salas → Agenda
  Bloqueia horários para limpeza, manutenção, etc
```

#### 🚦 IMPACTO SE FALTAR

```
⚠️  Agenda inconsistente (sem sala)
⚠️  Overbooking (mesma sala em dois horários)
⚠️  Uso indevido de equipamento (recurso em sala errada)
```

---

### 5️⃣ DOCUMENTO DE PACIENTES (Mínimo necessário para TISS)

#### ✅ Campos Mínimos em PATIENTS

```sql
-- Para validação básica
✅ nome (TEXT)
✅ document_id (TEXT) - CPF ou RG
✅ birthdate (DATE)
✅ gender (ENUM: 'M', 'F', 'O')
✅ address (TEXT)
✅ city (TEXT)
✅ state (VARCHAR 2)
✅ zip_code (TEXT)
✅ email (TEXT)
✅ phone (TEXT)
✅ emergency_contact (TEXT)
✅ emergency_phone (TEXT)

-- Para XML
✅ document_type (ENUM: 'cpf', 'rg', 'passport')
✅ mother_name (TEXT) - Para pacientes menores
```

---

## 🔵 SEÇÃO 2: REGRAS OPERACIONAIS (Vínculos)

### TABELA: professional_services

```sql
CREATE TABLE professional_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  professional_id UUID NOT NULL REFERENCES professionals(id),
  service_id UUID NOT NULL REFERENCES services(id),
  
  -- Override de valores/tempo
  valor_especifico DECIMAL(10,2), -- Se diferente do serviço
  tempo_especifico_minutos INT,   -- Se diferente do serviço
  
  -- Status
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now()
);

-- Índices
CREATE UNIQUE INDEX idx_prof_service 
  ON professional_services(professional_id, service_id, clinic_id)
  WHERE ativo = true;
```

**Impacto:**
- Sem isso: agenda agenda qualquer serviço com qualquer profissional ❌
- Com isso: validação automática na agenda ✅

---

### TABELA: professional_payers

```sql
CREATE TABLE professional_payers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  professional_id UUID NOT NULL REFERENCES professionals(id),
  payer_id UUID NOT NULL REFERENCES payers(id),
  
  -- Repasse
  percentual_repasse DECIMAL(5,2),    -- % que profissional recebe
  valor_fixo_repasse DECIMAL(10,2),   -- Ou valor fixo por procedimento
  tipo_repasse ENUM('percentual', 'fixo', 'tabela'),
  
  -- Status
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now()
);

-- Índices
CREATE UNIQUE INDEX idx_prof_payer 
  ON professional_payers(professional_id, payer_id, clinic_id)
  WHERE ativo = true;
```

**Impacto:**
- Sem isso: repasse errado, glosa por pagamento indevido ❌
- Com isso: cálculo automático de repasse ✅

---

### TABELA: service_prices (ATUALIZAR)

```sql
-- Já existe, mas CRÍTICA para XML

CREATE TABLE service_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  service_id UUID NOT NULL REFERENCES services(id),
  payer_id UUID NOT NULL REFERENCES payers(id),  -- Ou NULL para particular
  
  -- Preço negociado
  valor_negociado DECIMAL(10,2) NOT NULL,
  percentual_coparticipacao DECIMAL(5,2),  -- % do paciente
  valor_paciente DECIMAL(10,2),            -- Valor que paciente paga
  
  -- Validação
  data_inicio DATE DEFAULT CURRENT_DATE,
  data_fim DATE NULLABLE,
  ativo BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP DEFAULT now()
);

-- Índices
CREATE UNIQUE INDEX idx_service_payer_active
  ON service_prices(service_id, payer_id, clinic_id)
  WHERE ativo = true AND data_fim IS NULL;
```

**Impacto:**
- Sem isto: XML com valores errados ❌
- Com isto: faturamento correto por convênio ✅

---

## 🟡 SEÇÃO 3: PARÂMETROS FINANCEIROS

### TABELA: service_prices (continuação)

Já está acima.

---

### TABELA: repasse_config (REVISAR)

```sql
-- Usa professional_payers + service_prices
-- Mas pode ter regras complexas:
--   - Profissional A recebe X% do Convênio 1
--   - Profissional A recebe Y% do Convênio 2
--   - Profissional A recebe Z% de Particular
--   - Profissional A não atende Convênio 3

CREATE TABLE repasse_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  professional_id UUID NOT NULL REFERENCES professionals(id),
  payer_id UUID REFERENCES payers(id), -- NULL = Particular
  service_id UUID REFERENCES services(id), -- NULL = Todos
  
  -- Tipo de repasse
  tipo ENUM('percentual', 'fixo', 'tabela'),
  percentual DECIMAL(5,2),
  valor_fixo DECIMAL(10,2),
  
  -- Validade
  data_inicio DATE DEFAULT CURRENT_DATE,
  data_fim DATE NULLABLE,
  ativo BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP DEFAULT now()
);
```

---

## 🟢 CHECKLIST: O QUE CADA MENU PRECISA TER

```
┌─────────────────────────────────────────────────────────┐
│         VERIFICAÇÃO DE COMPLETUDE POR MENU              │
└─────────────────────────────────────────────────────────┘

☐ BASE DO SISTEMA (Clínica)
  ☐ Nome da clínica
  ☐ CNPJ (OBRIGATÓRIO para XML)
  ☐ Endereço completo
  ☐ Telefone
  ☐ Email
  ☐ Dados bancários (para repasse)
  → IMPACTO: XML rejeita sem CNPJ

☐ SERVIÇOS / PROCEDIMENTOS
  ☐ Nome do serviço
  ☐ Código TUSS (OBRIGATÓRIO) ← 🔴 CRÍTICO
  ☐ Código CBHPM (recomendado)
  ☐ Tipo de guia
  ☐ Duração padrão
  ☐ Valor base
  ☐ Permite faturamento? (checkbox)
  → IMPACTO: Sem TUSS, XML rejeita tudo

☐ PROFISSIONAIS
  ☐ Nome completo
  ☐ CBO (OBRIGATÓRIO) ← 🔴 CRÍTICO
  ☐ Número do conselho (CRM, etc)
  ☐ UF do conselho
  ☐ Email
  ☐ Telefone
  ☐ Serviços que executa (com override de valor/tempo)
  ☐ Convênios que atende (com % repasse)
  ☐ Horários de disponibilidade
  → IMPACTO: Sem CBO, XML inválido; sem serviços, agenda quebrada

☐ CONVÊNIOS
  ☐ Nome
  ☐ CNPJ
  ☐ Código ANS (OBRIGATÓRIO se operadora) ← 🔴 CRÍTICO
  ☐ Versão TISS
  ☐ Profissionais autorizados (com % repasse)
  ☐ Valores por serviço (tabelado)
  ☐ Exigências (autorização, solicitante, etc)
  → IMPACTO: Sem ANS/TISS, faturamento rejeitado

☐ SALAS / EQUIPAMENTOS
  ☐ Nome
  ☐ Tipo
  ☐ Status
  → IMPACTO: Agenda sem sala = erro

☐ VINCULOS (professional_services, professional_payers)
  ☐ Profissional X → Serviço Y
  ☐ Profissional X → Convênio Z (com % repasse)
  → IMPACTO: Sem vínculos, cálculos errados

☐ VALORES (service_prices)
  ☐ Serviço X + Convênio Y = R$ 100
  ☐ Coparticipação do paciente
  → IMPACTO: Fatura com valor errado
```

---

## 📋 IMPLEMENTAÇÃO PRÁTICA NO VS CODE

### Estrutura de Pastas Recomendada

```
src/
├── pages/
│   └── clinica/
│       ├── cadastros/              ← 🎯 NOVO
│       │   ├── ServicosCatalogo.jsx        (Serviços)
│       │   ├── ProfissionaisCadastro.jsx   (Profissionais)
│       │   ├── ConveniosCadastro.jsx       (Convênios)
│       │   ├── SalasCadastro.jsx           (Salas)
│       │   └── ConfiguracaoPrices.jsx      (Valores)
│       │
│       └── base-sistema/           ← JÁ EXISTE
│           └── ClinicSettings.jsx
│
├── lib/
│   ├── servicesApi.js              ← 🎯 NOVO
│   ├── professionalsApi.js         ← JÁ EXISTE
│   ├── payersApi.js                ← VERIFICAR
│   ├── roomsApi.js                 ← 🎯 NOVO
│   └── servicePricesApi.js         ← 🎯 NOVO
│
└── hooks/
    ├── useProfessionalServices.js  ← 🎯 NOVO
    ├── useProfessionalPayers.js    ← 🎯 NOVO
    └── useServicePrices.js         ← 🎯 NOVO
```

---

## 🚀 FLUXO PARA GERAR XML TISS

```
1. DADOS CAPTURADOS NA AGENDA
   ├─ Paciente (CPF, nome, birthdate)
   ├─ Profissional (CBO, conselho, numero)
   ├─ Serviço (TUSS, CBHPM)
   ├─ Convênio (ANS, CNPJ)
   └─ Data/hora do atendimento

2. VALIDAÇÃO PRÉ-XML
   ├─ Paciente tem CPF válido? ✓
   ├─ Profissional tem CBO? ✓
   ├─ Serviço tem TUSS? ✓
   ├─ Convênio tem ANS/TISS? ✓
   └─ Valores batidos? ✓

3. GERAÇÃO DO XML
   ├─ Monta estrutura TISS
   ├─ Preenche campos obrigatórios
   ├─ Calcula valores/descontos
   └─ Assina digitalmente (se necessário)

4. ENVIO
   ├─ Para webservice do convênio
   ├─ Ou download para envio manual
   └─ Registra no DB (guias enviadas)

5. RETORNO
   ├─ Importa XML de resposta
   ├─ Processa glosas
   ├─ Atualiza status da guia
   └─ Gera relatório
```

---

## ✅ CHECKLIST PRONTO PARA IMPLEMENTAR

```
PRIORIDADE MÁXIMA (Hoje)
[ ] Serviços: Adicionar código_tuss, cbhpm, tipo_guia (se não tiver)
[ ] Profissionais: Adicionar cbo, conselho, numero_conselho (se não tiver)
[ ] Convênios: Adicionar codigo_ans, padrao_tiss (se não tiver)
[ ] Salas: Criar tabela (se não existir)

PRIORIDADE ALTA (Esta semana)
[ ] professional_services: Criar tabela e UI
[ ] professional_payers: Criar tabela e UI
[ ] service_prices: Revisar e completar

PRIORIDADE MÉDIA (Próximas 2 semanas)
[ ] Validações em formulários
[ ] Alertas quando dados faltam para XML
[ ] Testes de XML gerado

PRIORIDADE BAIXA (Próximas 4 semanas)
[ ] Integração webservice
[ ] Assinatura digital
[ ] Retornos TISS
```

---

## 📞 REFERÊNCIAS

- **TISS Standard:** https://www.ans.gov.br/tiss
- **TUSS:** https://www.ans.gov.br/padrao-tuss
- **CBO:** https://www.mtps.gov.br/cbo
- **ANS:** https://www.ans.gov.br

---

## 🎯 PRÓXIMOS PASSOS

1. **Ler este documento** (✓ Feito agora)
2. **Verificar estado atual** das tabelas em `DATABASE_SCHEMA_REFERENCE.md`
3. **Criar migrações SQL** para adicionar campos faltantes
4. **Implementar UIs** seguindo a sequência: Serviços → Profissionais → Convênios → Salas
5. **Criar testes** de validação XML
6. **Documentar** cada decisão no código

---

**Data de Atualização:** 18/01/2026  
**Responsável:** Documentação Técnica  
**Status:** ✅ PRONTO PARA IMPLEMENTAR
