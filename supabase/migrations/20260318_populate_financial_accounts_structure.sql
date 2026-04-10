-- ============================================
-- POPULAÇÃO DE CONTAS - ESTRUTURA PROFISSIONAL SAÚDE
-- Plano de contas padrão com hierarquia para análise real de lucro
-- ============================================

-- Função auxiliar para inserir conta com suporte a hierarquia
CREATE OR REPLACE FUNCTION seed_account(
    p_clinic_id UUID,
    p_name TEXT,
    p_type account_type,
    p_parent_id UUID DEFAULT NULL,
    p_level INTEGER DEFAULT 1
)
RETURNS UUID AS $$
DECLARE
    new_id UUID;
BEGIN
    INSERT INTO financial_accounts (clinic_id, name, type, parent_id, level, is_active)
    VALUES (p_clinic_id, p_name, p_type, p_parent_id, p_level, TRUE)
    RETURNING id INTO new_id;
    RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- Seed data para primeira clínica (se existir)
DO $$
DECLARE
    v_clinic_id UUID;
    
    -- Level 1 (Raiz)
    v_receitas UUID;
    v_deducoes UUID;
    v_custos UUID;
    v_despesas_admin UUID;
    v_despesas_clinica UUID;
    v_despesas_comerciais UUID;
    v_despesas_fin UUID;
    v_investimentos UUID;
    v_ajustes UUID;
    
    -- Level 2 (Receitas)
    v_receita_bruta UUID;
    v_receita_operacional UUID;
    v_outras_receitas UUID;
    
    -- Level 2 (Deduções)
    v_impostos UUID;
    v_glosas UUID;
    
BEGIN

-- Obter primeira clínica
SELECT id INTO v_clinic_id FROM clinics LIMIT 1;

IF v_clinic_id IS NOT NULL THEN

-- ========================
-- 1. RECEITAS (VERDE)
-- ========================

v_receitas := seed_account(v_clinic_id, '1. RECEITAS', 'receita', NULL, 1);

  v_receita_bruta := seed_account(v_clinic_id, '1.1 Receita Bruta', 'receita', v_receitas, 2);
    PERFORM seed_account(v_clinic_id, 'Consultas Particulares', 'receita', v_receita_bruta, 3);
    PERFORM seed_account(v_clinic_id, 'Consultas Convênios', 'receita', v_receita_bruta, 3);
    PERFORM seed_account(v_clinic_id, 'Exames', 'receita', v_receita_bruta, 3);
    PERFORM seed_account(v_clinic_id, 'Procedimentos', 'receita', v_receita_bruta, 3);
    PERFORM seed_account(v_clinic_id, 'Cirurgias', 'receita', v_receita_bruta, 3);
    PERFORM seed_account(v_clinic_id, 'Telemedicina', 'receita', v_receita_bruta, 3);

  v_receita_operacional := seed_account(v_clinic_id, '1.2 Receita Operacional', 'receita', v_receitas, 2);
    PERFORM seed_account(v_clinic_id, 'Taxa Administrativa (Clínica)', 'receita', v_receita_operacional, 3);
    PERFORM seed_account(v_clinic_id, 'Aluguel de Sala', 'receita', v_receita_operacional, 3);
    PERFORM seed_account(v_clinic_id, 'Serviços Terceirizados', 'receita', v_receita_operacional, 3);

  v_outras_receitas := seed_account(v_clinic_id, '1.3 Outras Receitas', 'receita', v_receitas, 2);
    PERFORM seed_account(v_clinic_id, 'Juros Recebidos', 'receita', v_outras_receitas, 3);
    PERFORM seed_account(v_clinic_id, 'Multas Recebidas', 'receita', v_outras_receitas, 3);
    PERFORM seed_account(v_clinic_id, 'Outros Ganhos', 'receita', v_outras_receitas, 3);

-- ========================
-- 2. DEDUÇÕES DA RECEITA (VERMELHO)
-- ========================

v_deducoes := seed_account(v_clinic_id, '2. DEDUÇÕES DA RECEITA', 'deducao', NULL, 1);

  v_impostos := seed_account(v_clinic_id, '2.1 Impostos sobre Faturamento', 'deducao', v_deducoes, 2);
    PERFORM seed_account(v_clinic_id, 'Simples Nacional', 'deducao', v_impostos, 3);
    PERFORM seed_account(v_clinic_id, 'ISS', 'deducao', v_impostos, 3);
    PERFORM seed_account(v_clinic_id, 'PIS', 'deducao', v_impostos, 3);
    PERFORM seed_account(v_clinic_id, 'COFINS', 'deducao', v_impostos, 3);

  v_glosas := seed_account(v_clinic_id, '2.2 Glosas', 'deducao', v_deducoes, 2);
    PERFORM seed_account(v_clinic_id, 'Glosas Convênios', 'deducao', v_glosas, 3);
    PERFORM seed_account(v_clinic_id, 'Cancelamentos e Estornos', 'deducao', v_glosas, 3);

-- ========================
-- 3. CUSTOS DIRETOS (LARANJA)
-- ========================

v_custos := seed_account(v_clinic_id, '3. CUSTOS DIRETOS', 'custo', NULL, 1);
  PERFORM seed_account(v_clinic_id, 'Repasse Médico', 'custo', v_custos, 2);
  PERFORM seed_account(v_clinic_id, 'Repasse Profissionais', 'custo', v_custos, 2);
  PERFORM seed_account(v_clinic_id, 'Custos de Exames', 'custo', v_custos, 2);
  PERFORM seed_account(v_clinic_id, 'Materiais Médicos', 'custo', v_custos, 2);
  PERFORM seed_account(v_clinic_id, 'Medicamentos', 'custo', v_custos, 2);
  PERFORM seed_account(v_clinic_id, 'Instrumentação Cirúrgica', 'custo', v_custos, 2);
  PERFORM seed_account(v_clinic_id, 'Equipamentos (uso por procedimento)', 'custo', v_custos, 2);

-- ========================
-- 4. DESPESAS ADMINISTRATIVAS (AZUL)
-- ========================

v_despesas_admin := seed_account(v_clinic_id, '4. DESPESAS ADMINISTRATIVAS', 'despesa', NULL, 1);
  PERFORM seed_account(v_clinic_id, 'Salários Administrativos', 'despesa', v_despesas_admin, 2);
  PERFORM seed_account(v_clinic_id, 'Encargos Trabalhistas', 'despesa', v_despesas_admin, 2);
  PERFORM seed_account(v_clinic_id, 'Pró-labore', 'despesa', v_despesas_admin, 2);
  PERFORM seed_account(v_clinic_id, 'Contabilidade', 'despesa', v_despesas_admin, 2);
  PERFORM seed_account(v_clinic_id, 'Jurídico', 'despesa', v_despesas_admin, 2);
  PERFORM seed_account(v_clinic_id, 'Sistemas / Softwares', 'despesa', v_despesas_admin, 2);
  PERFORM seed_account(v_clinic_id, 'Internet / Telefonia', 'despesa', v_despesas_admin, 2);

-- ========================
-- 5. DESPESAS DA CLÍNICA (AZUL)
-- ========================

v_despesas_clinica := seed_account(v_clinic_id, '5. DESPESAS DA CLÍNICA', 'despesa', NULL, 1);
  PERFORM seed_account(v_clinic_id, 'Aluguel', 'despesa', v_despesas_clinica, 2);
  PERFORM seed_account(v_clinic_id, 'Condomínio', 'despesa', v_despesas_clinica, 2);
  PERFORM seed_account(v_clinic_id, 'Energia', 'despesa', v_despesas_clinica, 2);
  PERFORM seed_account(v_clinic_id, 'Água', 'despesa', v_despesas_clinica, 2);
  PERFORM seed_account(v_clinic_id, 'Limpeza', 'despesa', v_despesas_clinica, 2);
  PERFORM seed_account(v_clinic_id, 'Manutenção', 'despesa', v_despesas_clinica, 2);
  PERFORM seed_account(v_clinic_id, 'Segurança', 'despesa', v_despesas_clinica, 2);

-- ========================
-- 6. DESPESAS COMERCIAIS (AZUL)
-- ========================

v_despesas_comerciais := seed_account(v_clinic_id, '6. DESPESAS COMERCIAIS', 'despesa', NULL, 1);
  PERFORM seed_account(v_clinic_id, 'Marketing Digital', 'despesa', v_despesas_comerciais, 2);
  PERFORM seed_account(v_clinic_id, 'Tráfego Pago', 'despesa', v_despesas_comerciais, 2);
  PERFORM seed_account(v_clinic_id, 'Agência', 'despesa', v_despesas_comerciais, 2);
  PERFORM seed_account(v_clinic_id, 'Comissões', 'despesa', v_despesas_comerciais, 2);

-- ========================
-- 7. DESPESAS FINANCEIRAS (AZUL)
-- ========================

v_despesas_fin := seed_account(v_clinic_id, '7. DESPESAS FINANCEIRAS', 'despesa', NULL, 1);
  PERFORM seed_account(v_clinic_id, 'Tarifas Bancárias', 'despesa', v_despesas_fin, 2);
  PERFORM seed_account(v_clinic_id, 'Juros Pagos', 'despesa', v_despesas_fin, 2);
  PERFORM seed_account(v_clinic_id, 'Multas', 'despesa', v_despesas_fin, 2);
  PERFORM seed_account(v_clinic_id, 'Antecipação de Recebíveis', 'despesa', v_despesas_fin, 2);

-- ========================
-- 8. INVESTIMENTOS (ROXO)
-- ========================

v_investimentos := seed_account(v_clinic_id, '8. INVESTIMENTOS', 'investimento', NULL, 1);
  PERFORM seed_account(v_clinic_id, 'Equipamentos', 'investimento', v_investimentos, 2);
  PERFORM seed_account(v_clinic_id, 'Reforma / Estrutura', 'investimento', v_investimentos, 2);
  PERFORM seed_account(v_clinic_id, 'Móveis', 'investimento', v_investimentos, 2);

-- ========================
-- 9. AJUSTES CONTÁBEIS (CINZA)
-- ========================

v_ajustes := seed_account(v_clinic_id, '9. AJUSTES CONTÁBEIS', 'ajuste', NULL, 1);
  PERFORM seed_account(v_clinic_id, 'Depreciação', 'ajuste', v_ajustes, 2);
  PERFORM seed_account(v_clinic_id, 'Amortização', 'ajuste', v_ajustes, 2);
  PERFORM seed_account(v_clinic_id, 'Provisões', 'ajuste', v_ajustes, 2);

RAISE NOTICE 'Estrutura de contas criada com sucesso para clínica: %', v_clinic_id;

ELSE
  RAISE NOTICE 'Nenhuma clínica encontrada. Seed data não será aplicado.';
END IF;

END $$;

-- Remover função auxiliar após uso
DROP FUNCTION IF EXISTS seed_account(UUID, TEXT, account_type, UUID, INTEGER);
