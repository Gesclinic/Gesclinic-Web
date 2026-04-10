-- Adicionar coluna rule_name à tabela revenue_rules
ALTER TABLE revenue_rules
ADD COLUMN rule_name VARCHAR(255) NULL;

-- Criar índice para melhorar performance
CREATE INDEX idx_revenue_rules_rule_name ON revenue_rules(rule_name);
