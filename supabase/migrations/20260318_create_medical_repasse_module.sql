-- ============================================
-- MÓDULO COMPLETO DE REPASSE AUTOMÁTICO
-- Data: 2026-03-18
-- Integrado com Plano de Contas
-- ============================================

-- ==== 1. CONFIGURAÇÃO DE REPASSE POR PROFISSIONAL ====
CREATE TABLE IF NOT EXISTS medical_repasse_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL,
    professional_id UUID NOT NULL,
    
    percentual_profissional NUMERIC(5,2) DEFAULT 70,
    percentual_clinica NUMERIC(5,2) DEFAULT 30,
    
    aplicar_imposto BOOLEAN DEFAULT TRUE,
    aplicar_glosa BOOLEAN DEFAULT TRUE,
    
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(clinic_id, professional_id)
);

CREATE INDEX IF NOT EXISTS idx_medrepconf_clinic ON medical_repasse_config(clinic_id);
CREATE INDEX IF NOT EXISTS idx_medrepconf_professional ON medical_repasse_config(professional_id);
CREATE INDEX IF NOT EXISTS idx_medrepconf_ativo ON medical_repasse_config(ativo);

-- Foreign keys for medical_repasse_config
ALTER TABLE medical_repasse_config 
ADD CONSTRAINT fk_medrepconf_professional 
FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE CASCADE;

ALTER TABLE medical_repasse_config 
ADD CONSTRAINT fk_medrepconf_clinic 
FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;

-- ==== 2. PRODUÇÃO MÉDICA (BASE DO CÁLCULO) ====
CREATE TABLE IF NOT EXISTS medical_production (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL,
    professional_id UUID NOT NULL,
    
    atendimento_id UUID,
    tipo TEXT, -- 'consulta', 'exame', 'cirurgia'
    
    valor_bruto NUMERIC(10,2),
    valor_liquido NUMERIC(10,2),
    
    data_atendimento DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medprod_clinic ON medical_production(clinic_id);
CREATE INDEX IF NOT EXISTS idx_medprod_professional ON medical_production(professional_id);
CREATE INDEX IF NOT EXISTS idx_medprod_atendimento ON medical_production(atendimento_id);
CREATE INDEX IF NOT EXISTS idx_medprod_data ON medical_production(data_atendimento);

-- Foreign keys for medical_production
ALTER TABLE medical_production 
ADD CONSTRAINT fk_medprod_professional 
FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE CASCADE;

ALTER TABLE medical_production 
ADD CONSTRAINT fk_medprod_clinic 
FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;

-- ==== 3. RESULTADO DO REPASSE ====
CREATE TABLE IF NOT EXISTS medical_repasse (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL,
    professional_id UUID,
    
    periodo_inicio DATE,
    periodo_fim DATE,
    
    total_bruto NUMERIC(12,2),
    total_liquido NUMERIC(12,2),
    
    valor_profissional NUMERIC(12,2),
    valor_clinica NUMERIC(12,2),
    
    status TEXT DEFAULT 'pendente', -- 'pendente', 'processado', 'pago'
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medrepa_clinic ON medical_repasse(clinic_id);
CREATE INDEX IF NOT EXISTS idx_medrepa_professional ON medical_repasse(professional_id);
CREATE INDEX IF NOT EXISTS idx_medrepa_status ON medical_repasse(status);
CREATE INDEX IF NOT EXISTS idx_medrepa_periodo ON medical_repasse(periodo_inicio, periodo_fim);

-- Foreign keys for medical_repasse
ALTER TABLE medical_repasse 
ADD CONSTRAINT fk_medrepa_professional 
FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE CASCADE;

ALTER TABLE medical_repasse 
ADD CONSTRAINT fk_medrepa_clinic 
FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;

-- ==== 4. FUNÇÃO AUTOMÁTICA DE CÁLCULO ====
CREATE OR REPLACE FUNCTION calcular_repasse(
    p_professional_id UUID,
    p_data_inicio DATE,
    p_data_fim DATE
)
RETURNS VOID AS $$
DECLARE
    v_config RECORD;
    v_total_bruto NUMERIC := 0;
    v_total_liquido NUMERIC := 0;
    v_valor_profissional NUMERIC := 0;
    v_valor_clinica NUMERIC := 0;
    v_clinic_id UUID;
BEGIN

    -- Obter clinic_id da produção
    SELECT DISTINCT clinic_id INTO v_clinic_id
    FROM medical_production
    WHERE professional_id = p_professional_id
    AND data_atendimento BETWEEN p_data_inicio AND p_data_fim
    LIMIT 1;

    -- Se não tiver produção, sair
    IF v_clinic_id IS NULL THEN
        RETURN;
    END IF;

    -- Buscar configuração
    SELECT * INTO v_config
    FROM medical_repasse_config
    WHERE professional_id = p_professional_id
    AND clinic_id = v_clinic_id
    AND ativo = TRUE
    LIMIT 1;

    -- Se não tiver config, usar padrão 70/30
    IF v_config IS NULL THEN
        v_config := ROW(
            gen_random_uuid(),
            v_clinic_id,
            p_professional_id,
            70,
            30,
            TRUE,
            TRUE,
            TRUE,
            NOW(),
            NOW()
        )::medical_repasse_config;
    END IF;

    -- Somar produção
    SELECT
        COALESCE(SUM(valor_bruto), 0),
        COALESCE(SUM(valor_liquido), 0)
    INTO v_total_bruto, v_total_liquido
    FROM medical_production
    WHERE professional_id = p_professional_id
    AND data_atendimento BETWEEN p_data_inicio AND p_data_fim;

    -- Calcular repasse
    v_valor_profissional := v_total_liquido * (v_config.percentual_profissional / 100);
    v_valor_clinica := v_total_liquido * (v_config.percentual_clinica / 100);

    -- Inserir resultado (atualizar se já existe para o período)
    INSERT INTO medical_repasse (
        clinic_id,
        professional_id,
        periodo_inicio,
        periodo_fim,
        total_bruto,
        total_liquido,
        valor_profissional,
        valor_clinica,
        status
    ) VALUES (
        v_clinic_id,
        p_professional_id,
        p_data_inicio,
        p_data_fim,
        v_total_bruto,
        v_total_liquido,
        v_valor_profissional,
        v_valor_clinica,
        'processado'
    )
    ON CONFLICT (clinic_id, professional_id, periodo_inicio, periodo_fim) 
    DO UPDATE SET
        total_bruto = EXCLUDED.total_bruto,
        total_liquido = EXCLUDED.total_liquido,
        valor_profissional = EXCLUDED.valor_profissional,
        valor_clinica = EXCLUDED.valor_clinica,
        status = 'processado',
        updated_at = NOW();

END;
$$ LANGUAGE plpgsql;

-- ==== 5. FUNÇÃO PARA GERAR CONTAS A PAGAR ====
CREATE OR REPLACE FUNCTION gerar_conta_repasse()
RETURNS TRIGGER AS $$
BEGIN

    -- Inserir na tabela de transações financeiras
    INSERT INTO financial_transactions (
        clinic_id,
        description,
        amount,
        type,
        account_id,
        category,
        status,
        created_at
    )
    VALUES (
        NEW.clinic_id,
        'Repasse médico - ' || (SELECT name FROM professionals WHERE id = NEW.professional_id LIMIT 1),
        NEW.valor_profissional,
        'expense',
        (SELECT id FROM financial_accounts 
         WHERE clinic_id = NEW.clinic_id AND name = 'Repasse Médico' LIMIT 1),
        'payroll',
        'pending',
        NOW()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==== 6. TRIGGER PARA AUTO-GERAR CONTAS ====
DROP TRIGGER IF EXISTS trg_repasse_financeiro ON medical_repasse;
CREATE TRIGGER trg_repasse_financeiro
AFTER INSERT ON medical_repasse
FOR EACH ROW
EXECUTE FUNCTION gerar_conta_repasse();

-- ==== 7. RLS POLICIES ====
ALTER TABLE medical_repasse_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_production ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_repasse ENABLE ROW LEVEL SECURITY;

-- Policies para medical_repasse_config
DROP POLICY IF EXISTS "Users can view repasse config" ON medical_repasse_config;
CREATE POLICY "Users can view repasse config" ON medical_repasse_config
  FOR SELECT USING (
    clinic_id IN (SELECT clinic_id FROM user_roles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert repasse config" ON medical_repasse_config;
CREATE POLICY "Users can insert repasse config" ON medical_repasse_config
  FOR INSERT WITH CHECK (
    clinic_id IN (SELECT clinic_id FROM user_roles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update repasse config" ON medical_repasse_config;
CREATE POLICY "Users can update repasse config" ON medical_repasse_config
  FOR UPDATE USING (
    clinic_id IN (SELECT clinic_id FROM user_roles WHERE user_id = auth.uid())
  );

-- Policies para medical_production
DROP POLICY IF EXISTS "Users can view medical production" ON medical_production;
CREATE POLICY "Users can view medical production" ON medical_production
  FOR SELECT USING (
    clinic_id IN (SELECT clinic_id FROM user_roles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert medical production" ON medical_production;
CREATE POLICY "Users can insert medical production" ON medical_production
  FOR INSERT WITH CHECK (
    clinic_id IN (SELECT clinic_id FROM user_roles WHERE user_id = auth.uid())
  );

-- Policies para medical_repasse
DROP POLICY IF EXISTS "Users can view medical repasse" ON medical_repasse;
CREATE POLICY "Users can view medical repasse" ON medical_repasse
  FOR SELECT USING (
    clinic_id IN (SELECT clinic_id FROM user_roles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert medical repasse" ON medical_repasse;
CREATE POLICY "Users can insert medical repasse" ON medical_repasse
  FOR INSERT WITH CHECK (
    clinic_id IN (SELECT clinic_id FROM user_roles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update medical repasse" ON medical_repasse;
CREATE POLICY "Users can update medical repasse" ON medical_repasse
  FOR UPDATE USING (
    clinic_id IN (SELECT clinic_id FROM user_roles WHERE user_id = auth.uid())
  );

-- ==== ✅ MIGRATION COMPLETA ====
