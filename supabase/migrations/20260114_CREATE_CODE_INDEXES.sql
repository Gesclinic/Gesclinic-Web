-- Script para criar apenas os índices de "code" após as tabelas existirem
-- Execute este script DEPOIS que todas as tabelas forem criadas

-- Verificar se as colunas existem e criar índices
CREATE INDEX IF NOT EXISTS idx_services_code ON services(code);
CREATE INDEX IF NOT EXISTS idx_service_groups_code ON service_groups(code);
CREATE INDEX IF NOT EXISTS idx_payers_code ON payers(code);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_code ON chart_of_accounts(code);
-- NOTE: idx_stock_categories_code is created in 20260113_COMPREHENSIVE_INIT migration
CREATE INDEX IF NOT EXISTS idx_stock_units_code ON stock_units(code);

-- Confirmação
SELECT 'Índices de code criados com sucesso!' as status;
