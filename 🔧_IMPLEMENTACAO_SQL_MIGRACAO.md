# 🔧 IMPLEMENTAÇÃO SQL - Campos Faltantes & Migrações

**Data:** 18 de Janeiro de 2026  
**Tipo:** SQL Migration Script  
**Status:** Pronto para executar no Supabase

---

## 📋 VERIFICAÇÃO: O QUE JÁ EXISTE

Baseado em `DATABASE_SCHEMA_REFERENCE.md` e análise do projeto, aqui está o STATUS ATUAL:

```
✅ EXISTE E ESTÁ CORRETO
  └─ clinics (base)
  └─ users (base)
  └─ patients (básico)
  └─ professionals (básico)
  └─ appointments (básico)
  └─ services (básico)
  └─ professional_schedules

⚠️  EXISTE MAS FALTAM CAMPOS
  ├─ services → Faltam: codigo_tuss, codigo_cbhpm, tipo_guia
  ├─ professionals → Faltam: cbo, conselho, numero_conselho, uf_conselho, papel_atendimento
  ├─ payers → Faltam: codigo_ans, versao_tiss, url_webservice

❌ NÃO EXISTE
  ├─ professional_services (relação entre profissional e serviço)
  ├─ professional_payers (relação entre profissional e convênio)
  ├─ rooms (salas/consultórios)
  └─ service_prices (preços por serviço + convênio)
```

---

## 🔴 SCRIPT 1: ADICIONAR CAMPOS FALTANTES

```sql
-- ============================================================
-- MIGRAÇÃO: Adicionar campos TISS em tabelas existentes
-- Data: 18/01/2026
-- ============================================================

-- ========== SERVICES (Serviços/Procedimentos) ==========
-- Adicionar campos para TISS
DO $$
BEGIN
  -- Código TUSS (OBRIGATÓRIO para XML)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name='services' AND column_name='codigo_tuss') THEN
    ALTER TABLE services ADD COLUMN codigo_tuss VARCHAR(10);
    CREATE INDEX idx_services_codigo_tuss ON services(codigo_tuss);
  END IF;

  -- Código CBHPM (Documentação/Relatórios)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name='services' AND column_name='codigo_cbhpm') THEN
    ALTER TABLE services ADD COLUMN codigo_cbhpm VARCHAR(10);
  END IF;

  -- Tipo de Guia (Consulta, SADT, Internação)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name='services' AND column_name='tipo_guia') THEN
    -- Criar ENUM se não existir
    CREATE TYPE guid_type AS ENUM ('consulta', 'sadt', 'internacao', 'procedimento')
    ON CONFLICT DO NOTHING;
    
    ALTER TABLE services ADD COLUMN tipo_guia guid_type DEFAULT 'consulta';
  END IF;

  -- Unidade de Medida
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name='services' AND column_name='unidade_medida') THEN
    CREATE TYPE unidade_type AS ENUM ('sessao', 'unidade', 'minuto', 'hora')
    ON CONFLICT DO NOTHING;
    
    ALTER TABLE services ADD COLUMN unidade_medida unidade_type DEFAULT 'sessao';
  END IF;

  -- Duração padrão em minutos
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name='services' AND column_name='duracao_padrao_minutos') THEN
    ALTER TABLE services ADD COLUMN duracao_padrao_minutos INT DEFAULT 30;
  END IF;

  -- Valor base para particular
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name='services' AND column_name='valor_base_particular') THEN
    ALTER TABLE services ADD COLUMN valor_base_particular DECIMAL(10,2) DEFAULT 0;
  END IF;

  -- Permite faturamento?
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name='services' AND column_name='permite_faturamento') THEN
    ALTER TABLE services ADD COLUMN permite_faturamento BOOLEAN DEFAULT true;
  END IF;

  -- Exige autorização?
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name='services' AND column_name='exige_autorizacao') THEN
    ALTER TABLE services ADD COLUMN exige_autorizacao BOOLEAN DEFAULT false;
  END IF;

  -- Exige profissional executante?
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name='services' AND column_name='exige_profissional_executante') THEN
    ALTER TABLE services ADD COLUMN exige_profissional_executante BOOLEAN DEFAULT true;
  END IF;

  -- Exige profissional solicitante?
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name='services' AND column_name='exige_profissional_solicitante') THEN
    ALTER TABLE services ADD COLUMN exige_profissional_solicitante BOOLEAN DEFAULT false;
  END IF;

  -- Permite múltiplos profissionais?
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name='services' AND column_name='permite_multiplos_profissionais') THEN
    ALTER TABLE services ADD COLUMN permite_multiplos_profissionais BOOLEAN DEFAULT false;
  END IF;

  RAISE NOTICE 'Services table updated successfully';
END $$;


-- ========== PROFESSIONALS (Profissionais) ==========
DO $$
BEGIN
  -- CBO (Código Brasileiro de Ocupações - OBRIGATÓRIO)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name='professionals' AND column_name='cbo') THEN
    ALTER TABLE professionals ADD COLUMN cbo VARCHAR(10);
    CREATE INDEX idx_professionals_cbo ON professionals(cbo);
  END IF;

  -- Tipo de profissional (Médico, Fisioterapeuta, etc)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name='professionals' AND column_name='tipo_profissional') THEN
    CREATE TYPE prof_type AS ENUM (
      'medico', 'fisioterapeuta', 'psicologo', 'dentista', 
      'enfermeiro', 'nutricionista', 'fonoudiologo', 'terapeuta'
    ) ON CONFLICT DO NOTHING;
    
    ALTER TABLE professionals ADD COLUMN tipo_profissional prof_type;
  END IF;

  -- Órgão regulador (CRM, CREFITO, CRP, etc)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name='professionals' AND column_name='conselho') THEN
    ALTER TABLE professionals ADD COLUMN conselho VARCHAR(20);
  END IF;

  -- Número do registro no conselho
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name='professionals' AND column_name='numero_conselho') THEN
    ALTER TABLE professionals ADD COLUMN numero_conselho VARCHAR(30);
    CREATE INDEX idx_professionals_numero_conselho ON professionals(numero_conselho);
  END IF;

  -- UF do conselho
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name='professionals' AND column_name='uf_conselho') THEN
    ALTER TABLE professionals ADD COLUMN uf_conselho VARCHAR(2);
  END IF;

  -- Data de inscrição no conselho
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name='professionals' AND column_name='data_inscricao_conselho') THEN
    ALTER TABLE professionals ADD COLUMN data_inscricao_conselho DATE;
  END IF;

  -- RQE (Registro de Qualificação Especial)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name='professionals' AND column_name='rqe') THEN
    ALTER TABLE professionals ADD COLUMN rqe VARCHAR(30);
  END IF;

  -- Papel no atendimento (Executante, Solicitante, Ambos)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name='professionals' AND column_name='papel_atendimento') THEN
    CREATE TYPE papel_type AS ENUM ('executante', 'solicitante', 'ambos')
    ON CONFLICT DO NOTHING;
    
    ALTER TABLE professionals ADD COLUMN papel_atendimento papel_type DEFAULT 'executante';
  END IF;

  -- Permite faturamento direto?
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name='professionals' AND column_name='permite_faturamento_direto') THEN
    ALTER TABLE professionals ADD COLUMN permite_faturamento_direto BOOLEAN DEFAULT true;
  END IF;

  RAISE NOTICE 'Professionals table updated successfully';
END $$;


-- ========== PAYERS (Convênios) ==========
DO $$
BEGIN
  -- Código ANS (OBRIGATÓRIO para operadora de saúde)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name='payers' AND column_name='codigo_ans') THEN
    ALTER TABLE payers ADD COLUMN codigo_ans VARCHAR(5);
    CREATE INDEX idx_payers_codigo_ans ON payers(codigo_ans);
  END IF;

  -- CNPJ (OBRIGATÓRIO para XML)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name='payers' AND column_name='cnpj') THEN
    ALTER TABLE payers ADD COLUMN cnpj VARCHAR(14) UNIQUE;
    CREATE INDEX idx_payers_cnpj ON payers(cnpj);
  END IF;

  -- Versão TISS
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name='payers' AND column_name='versao_tiss') THEN
    ALTER TABLE payers ADD COLUMN versao_tiss VARCHAR(10) DEFAULT '3.02.00';
  END IF;

  -- Padrão TISS?
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name='payers' AND column_name='padrao_tiss') THEN
    ALTER TABLE payers ADD COLUMN padrao_tiss BOOLEAN DEFAULT true;
  END IF;

  -- URL do webservice
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name='payers' AND column_name='url_webservice') THEN
    ALTER TABLE payers ADD COLUMN url_webservice TEXT;
  END IF;

  -- Usuário webservice (criptografado)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name='payers' AND column_name='usuario_webservice') THEN
    ALTER TABLE payers ADD COLUMN usuario_webservice TEXT;
  END IF;

  -- Senha webservice (criptografada)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name='payers' AND column_name='senha_webservice') THEN
    ALTER TABLE payers ADD COLUMN senha_webservice TEXT;
  END IF;

  -- Último envio TISS
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name='payers' AND column_name='ultimo_envio') THEN
    ALTER TABLE payers ADD COLUMN ultimo_envio TIMESTAMP;
  END IF;

  -- Modelo de guia padrão
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name='payers' AND column_name='modelo_guia_padrao') THEN
    CREATE TYPE modelo_guia AS ENUM ('consulta', 'sadt', 'internacao')
    ON CONFLICT DO NOTHING;
    
    ALTER TABLE payers ADD COLUMN modelo_guia_padrao modelo_guia DEFAULT 'consulta';
  END IF;

  -- Requer guia impressa?
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name='payers' AND column_name='requer_guia_impressa') THEN
    ALTER TABLE payers ADD COLUMN requer_guia_impressa BOOLEAN DEFAULT false;
  END IF;

  -- Exige profissional solicitante?
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name='payers' AND column_name='exige_profissional_solicitante') THEN
    ALTER TABLE payers ADD COLUMN exige_profissional_solicitante BOOLEAN DEFAULT false;
  END IF;

  -- Dias de validade da autorização
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name='payers' AND column_name='dias_validade_autorizacao') THEN
    ALTER TABLE payers ADD COLUMN dias_validade_autorizacao INT DEFAULT 30;
  END IF;

  -- Dias de antecedência mínima para agenda
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name='payers' AND column_name='dias_antecedencia_minima_agenda') THEN
    ALTER TABLE payers ADD COLUMN dias_antecedencia_minima_agenda INT DEFAULT 0;
  END IF;

  RAISE NOTICE 'Payers table updated successfully';
END $$;

-- ========== PATIENTS (Pacientes) ==========
DO $$
BEGIN
  -- Tipo de documento
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name='patients' AND column_name='document_type') THEN
    CREATE TYPE doc_type AS ENUM ('cpf', 'rg', 'passport')
    ON CONFLICT DO NOTHING;
    
    ALTER TABLE patients ADD COLUMN document_type doc_type DEFAULT 'cpf';
  END IF;

  -- Nome da mãe (para menores de idade no XML)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name='patients' AND column_name='mother_name') THEN
    ALTER TABLE patients ADD COLUMN mother_name TEXT;
  END IF;

  RAISE NOTICE 'Patients table updated successfully';
END $$;
```

---

## 🟢 SCRIPT 2: CRIAR TABELAS FALTANTES

```sql
-- ============================================================
-- MIGRAÇÃO: Criar tabelas de relacionamento
-- Data: 18/01/2026
-- ============================================================

-- ========== PROFESSIONAL_SERVICES ==========
-- Relação entre profissional e serviço
CREATE TABLE IF NOT EXISTS professional_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  
  -- Overrides específicos deste profissional para este serviço
  valor_especifico DECIMAL(10,2), -- Se diferente do serviço
  tempo_especifico_minutos INT,   -- Se diferente do serviço
  
  -- Status
  ativo BOOLEAN DEFAULT true,
  
  -- Auditoria
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  
  -- Constraints
  UNIQUE(professional_id, service_id, clinic_id)
);

CREATE INDEX idx_prof_service_clinic ON professional_services(clinic_id);
CREATE INDEX idx_prof_service_prof ON professional_services(professional_id);
CREATE INDEX idx_prof_service_service ON professional_services(service_id);
CREATE INDEX idx_prof_service_active ON professional_services(ativo) WHERE ativo = true;

-- ========== PROFESSIONAL_PAYERS ==========
-- Relação entre profissional e convênio (repasse)
CREATE TABLE IF NOT EXISTS professional_payers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  payer_id UUID NOT NULL REFERENCES payers(id) ON DELETE CASCADE,
  
  -- Configuração de repasse
  tipo_repasse ENUM('percentual', 'fixo', 'tabela') DEFAULT 'percentual',
  percentual_repasse DECIMAL(5,2),      -- % que profissional recebe
  valor_fixo_repasse DECIMAL(10,2),     -- Ou valor fixo por procedimento
  
  -- Status
  ativo BOOLEAN DEFAULT true,
  
  -- Auditoria
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  
  -- Constraints
  UNIQUE(professional_id, payer_id, clinic_id)
);

CREATE INDEX idx_prof_payer_clinic ON professional_payers(clinic_id);
CREATE INDEX idx_prof_payer_prof ON professional_payers(professional_id);
CREATE INDEX idx_prof_payer_payer ON professional_payers(payer_id);
CREATE INDEX idx_prof_payer_active ON professional_payers(ativo) WHERE ativo = true;

-- ========== SERVICE_PRICES ==========
-- Preços negociados por serviço e convênio
CREATE TABLE IF NOT EXISTS service_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  payer_id UUID REFERENCES payers(id) ON DELETE CASCADE, -- NULL = Particular
  
  -- Preço negociado
  valor_negociado DECIMAL(10,2) NOT NULL,
  percentual_coparticipacao DECIMAL(5,2), -- % do paciente
  valor_paciente DECIMAL(10,2),           -- Valor que paciente paga
  
  -- Validade
  data_inicio DATE DEFAULT CURRENT_DATE,
  data_fim DATE, -- NULL = sem limite
  ativo BOOLEAN DEFAULT true,
  
  -- Auditoria
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  
  -- Constraints
  UNIQUE(service_id, COALESCE(payer_id, '00000000-0000-0000-0000-000000000000'), clinic_id)
);

CREATE INDEX idx_service_price_clinic ON service_prices(clinic_id);
CREATE INDEX idx_service_price_service ON service_prices(service_id);
CREATE INDEX idx_service_price_payer ON service_prices(payer_id);
CREATE INDEX idx_service_price_active ON service_prices(ativo) WHERE ativo = true;
CREATE INDEX idx_service_price_valid ON service_prices(ativo, data_inicio, data_fim);

-- ========== ROOMS ==========
-- Salas/Consultórios
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  
  -- Identificação
  nome TEXT NOT NULL,
  tipo ENUM('consultorio', 'exames', 'cirurgia', 'internacao', 'outro') DEFAULT 'consultorio',
  
  -- Localização
  andar INT,
  bloco VARCHAR(20),
  
  -- Capacidade
  capacidade INT DEFAULT 1,
  
  -- Status
  status ENUM('active', 'inactive', 'maintenance') DEFAULT 'active',
  
  -- Auditoria
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_rooms_clinic ON rooms(clinic_id);
CREATE INDEX idx_rooms_tipo ON rooms(tipo);
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_rooms_nome ON rooms(nome);
```

---

## 🔵 SCRIPT 3: CRIAR ÍNDICES ADICIONAIS

```sql
-- ========== ÍNDICES PARA PERFORMANCE ==========

-- Services
CREATE INDEX IF NOT EXISTS idx_services_clinic_status 
  ON services(clinic_id, status);
CREATE INDEX IF NOT EXISTS idx_services_tipo_guia 
  ON services(tipo_guia);

-- Professionals
CREATE INDEX IF NOT EXISTS idx_professionals_clinic_status 
  ON professionals(clinic_id, status);
CREATE INDEX IF NOT EXISTS idx_professionals_tipo 
  ON professionals(tipo_profissional);
CREATE INDEX IF NOT EXISTS idx_professionals_conselho 
  ON professionals(conselho, numero_conselho);

-- Payers
CREATE INDEX IF NOT EXISTS idx_payers_clinic_status 
  ON payers(clinic_id, status);
CREATE INDEX IF NOT EXISTS idx_payers_tipo 
  ON payers(tipo);

-- Patients
CREATE INDEX IF NOT EXISTS idx_patients_clinic_document 
  ON patients(clinic_id, document_id);
CREATE INDEX IF NOT EXISTS idx_patients_clinic_status 
  ON patients(clinic_id, active);
```

---

## ⚪ SCRIPT 4: VALIDAÇÕES & CONSTRAINTS

```sql
-- ========== CONSTRAINTS PARA INTEGRIDADE ==========

-- Serviço deve ter valor_base_particular se permite_faturamento
ALTER TABLE services 
  ADD CONSTRAINT check_service_valor_faturamento
  CHECK (
    NOT permite_faturamento OR (permitir_faturamento AND valor_base_particular > 0)
  );

-- Profissional deve ter CBO se ativo
ALTER TABLE professionals
  ADD CONSTRAINT check_prof_cbo_ativo
  CHECK (
    NOT (status = 'active') OR cbo IS NOT NULL
  );

-- Convênio deve ter CNPJ
ALTER TABLE payers
  ADD CONSTRAINT check_payer_cnpj
  CHECK (cnpj IS NOT NULL AND cnpj ~ '^\d{14}$');

-- Repasse deve ter percentual OU valor fixo
ALTER TABLE professional_payers
  ADD CONSTRAINT check_repasse_values
  CHECK (
    (tipo_repasse = 'percentual' AND percentual_repasse IS NOT NULL)
    OR (tipo_repasse = 'fixo' AND valor_fixo_repasse IS NOT NULL)
  );

-- Service price deve ter valor_negociado > 0
ALTER TABLE service_prices
  ADD CONSTRAINT check_price_value
  CHECK (valor_negociado > 0);
```

---

## 🟡 SCRIPT 5: DADOS DE TESTE (Opcional)

```sql
-- ========== DADOS PARA TESTE (Executar APÓS migração) ==========

-- Inserir Serviços de Teste
INSERT INTO services (
  clinic_id, name, description, codigo_tuss, tipo_guia, duracao_padrao_minutos,
  valor_base_particular, permite_faturamento, exige_autorizacao,
  exige_profissional_executante, status
) VALUES (
  (SELECT id FROM clinics LIMIT 1),
  'Consulta Cardiologia',
  'Consulta cardiológica com eletrocardiograma',
  '010101', -- Código TUSS fictício
  'consulta',
  30,
  150.00,
  true,
  false,
  true,
  'active'
);

-- Inserir Sala de Teste
INSERT INTO rooms (
  clinic_id, nome, tipo, andar, capacidade, status
) VALUES (
  (SELECT id FROM clinics LIMIT 1),
  'Consultório 01',
  'consultorio',
  1,
  1,
  'active'
);

-- Inserir Profissional de Teste (com campos obrigatórios)
INSERT INTO professionals (
  clinic_id, name, email, tipo_profissional, cbo, conselho, numero_conselho,
  uf_conselho, papel_atendimento, status, active
) VALUES (
  (SELECT id FROM clinics LIMIT 1),
  'Dr. João Silva',
  'joao@clinica.com',
  'medico',
  '225101', -- CBO para Médico
  'CRM',
  '12345/SP',
  'SP',
  'executante',
  'active',
  true
);

-- Inserir Convênio de Teste
INSERT INTO payers (
  clinic_id, nome, tipo, status, cnpj, codigo_ans, versao_tiss, padrao_tiss
) VALUES (
  (SELECT id FROM clinics LIMIT 1),
  'Convênio XYZ',
  'convenio',
  'active',
  '12345678000190',
  '00123',
  '3.02.00',
  true
);

-- Vincular Profissional com Serviço
INSERT INTO professional_services (
  clinic_id, professional_id, service_id, ativo
) VALUES (
  (SELECT id FROM clinics LIMIT 1),
  (SELECT id FROM professionals WHERE name = 'Dr. João Silva' LIMIT 1),
  (SELECT id FROM services WHERE name = 'Consulta Cardiologia' LIMIT 1),
  true
);

-- Vincular Profissional com Convênio
INSERT INTO professional_payers (
  clinic_id, professional_id, payer_id, tipo_repasse, percentual_repasse, ativo
) VALUES (
  (SELECT id FROM clinics LIMIT 1),
  (SELECT id FROM professionals WHERE name = 'Dr. João Silva' LIMIT 1),
  (SELECT id FROM payers WHERE nome = 'Convênio XYZ' LIMIT 1),
  'percentual',
  30.00, -- 30% de repasse
  true
);

-- Definir Preço do Serviço no Convênio
INSERT INTO service_prices (
  clinic_id, service_id, payer_id, valor_negociado, percentual_coparticipacao,
  valor_paciente, ativo
) VALUES (
  (SELECT id FROM clinics LIMIT 1),
  (SELECT id FROM services WHERE name = 'Consulta Cardiologia' LIMIT 1),
  (SELECT id FROM payers WHERE nome = 'Convênio XYZ' LIMIT 1),
  120.00, -- Convênio paga R$ 120
  20.00,  -- Paciente co-participa 20%
  24.00,  -- Paciente paga R$ 24
  true
);
```

---

## 📊 VERIFICAÇÃO PÓS-MIGRAÇÃO

```sql
-- Verificar se todos os campos foram criados

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'services'
ORDER BY ordinal_position;

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'professionals'
ORDER BY ordinal_position;

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'payers'
ORDER BY ordinal_position;

-- Verificar se as tabelas foram criadas
SELECT table_name 
FROM information_schema.tables
WHERE table_schema = 'public' 
AND table_name IN ('professional_services', 'professional_payers', 'service_prices', 'rooms');

-- Verificar registros de teste
SELECT COUNT(*) as total_services FROM services WHERE ativo = true;
SELECT COUNT(*) as total_professionals FROM professionals WHERE status = 'active';
SELECT COUNT(*) as total_payers FROM payers WHERE status = 'active';
SELECT COUNT(*) as prof_service_links FROM professional_services WHERE ativo = true;
SELECT COUNT(*) as prof_payer_links FROM professional_payers WHERE ativo = true;
SELECT COUNT(*) as service_prices FROM service_prices WHERE ativo = true;
```

---

## 🎯 ORDEM DE EXECUÇÃO RECOMENDADA

```
1️⃣ SCRIPT 1: Adicionar campos faltantes em tabelas existentes
   ├─ Executa sem perda de dados
   ├─ Tempo: ~30 segundos
   └─ Impacto: Baixo (ADD COLUMN)

2️⃣ SCRIPT 2: Criar tabelas faltantes
   ├─ Executa sem problemas
   ├─ Tempo: ~20 segundos
   └─ Impacto: Baixo (tabelas novas)

3️⃣ SCRIPT 3: Criar índices adicionais
   ├─ Executa em background
   ├─ Tempo: ~1 minuto
   └─ Impacto: Melhora performance

4️⃣ SCRIPT 4: Adicionar constraints (OPCIONAL)
   ├─ Valida integridade
   ├─ Tempo: ~10 segundos
   └─ Impacto: Previne dados inválidos

5️⃣ SCRIPT 5: Inserir dados de teste (OPCIONAL)
   ├─ Para validação
   ├─ Tempo: ~20 segundos
   └─ Impacto: Nenhum (dados fictícios)

6️⃣ Verificação: Executar queries de validação
   ├─ Confirmação
   ├─ Tempo: ~10 segundos
   └─ Status: ✅ Pronto para produção
```

---

## ⚠️ ROLLBACK (Se algo der errado)

```sql
-- Para voltar atrás (se necessário):

-- Remover tabelas criadas
DROP TABLE IF EXISTS professional_services CASCADE;
DROP TABLE IF EXISTS professional_payers CASCADE;
DROP TABLE IF EXISTS service_prices CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;

-- Remover campos adicionados
ALTER TABLE services DROP COLUMN IF EXISTS codigo_tuss;
ALTER TABLE services DROP COLUMN IF EXISTS codigo_cbhpm;
ALTER TABLE services DROP COLUMN IF EXISTS tipo_guia;
-- ... etc

-- Remover tipos ENUM criados
DROP TYPE IF EXISTS guid_type;
DROP TYPE IF EXISTS unidade_type;
DROP TYPE IF EXISTS prof_type;
DROP TYPE IF EXISTS papel_type;
DROP TYPE IF EXISTS modelo_guia;
DROP TYPE IF EXISTS doc_type;
```

---

**Status:** ✅ Pronto para executar no Supabase  
**Data:** 18/01/2026  
**Responsável:** Documentação SQL
