-- ============================================
-- 🔐 RBAC TABLES — GESCLINIC SUPABASE
-- ============================================
-- Estrutura completa de Role-Based Access Control
-- Data: Janeiro 2026
-- Versão: 1.0
-- ============================================

-- 1️⃣ TABELA: ROLES
-- Perfis de usuário na clínica
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Insert padrão de roles
INSERT INTO roles (name, label, description) VALUES
  ('admin', 'Administrador', 'Acesso total ao sistema'),
  ('gestor', 'Gestor', 'Visão executiva, financeiro e operacional'),
  ('financeiro', 'Financeiro', 'Controle de finanças e faturamento'),
  ('profissional', 'Profissional', 'Agenda, pacientes e repasse'),
  ('recepcao', 'Recepção', 'Agenda e lista de pacientes')
ON CONFLICT (name) DO NOTHING;

-- 2️⃣ TABELA: PERMISSIONS
-- Permissões granulares do sistema
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  module TEXT,
  action TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Insert padrão de permissions
INSERT INTO permissions (key, label, description, module, action) VALUES
  -- Dashboard
  ('dashboard.view', 'Ver Dashboard', 'Acesso ao dashboard geral', 'dashboard', 'read'),

  -- Agenda
  ('agenda.view', 'Ver Agenda', 'Visualizar agenda', 'agenda', 'read'),
  ('agenda.create', 'Criar Agendamento', 'Agendar consulta', 'agenda', 'write'),
  ('agenda.edit', 'Editar Agendamento', 'Modificar agendamento', 'agenda', 'write'),
  ('agenda.cancel', 'Cancelar Agendamento', 'Cancelar consulta', 'agenda', 'write'),
  ('agenda.confirm', 'Confirmar Agendamento', 'Confirmar presença', 'agenda', 'write'),
  ('agenda.professional_view', 'Ver Agenda Profissional', 'Visualizar agenda por profissional', 'agenda', 'read'),
  ('agenda.reports', 'Relatórios de Agenda', 'Ver indicadores de agenda', 'agenda', 'read'),

  -- Pacientes
  ('pacientes.view', 'Ver Pacientes', 'Visualizar lista de pacientes', 'pacientes', 'read'),
  ('pacientes.create', 'Criar Paciente', 'Registrar novo paciente', 'pacientes', 'write'),
  ('pacientes.edit', 'Editar Paciente', 'Modificar dados de paciente', 'pacientes', 'write'),
  ('pacientes.delete', 'Deletar Paciente', 'Remover paciente', 'pacientes', 'delete'),
  ('pacientes.prontuario', 'Acessar Prontuário', 'Visualizar histórico clínico', 'pacientes', 'read'),
  ('pacientes.prontuario_edit', 'Editar Prontuário', 'Adicionar informações clínicas', 'pacientes', 'write'),

  -- Financeiro
  ('financeiro.view', 'Ver Financeiro', 'Visualizar módulo financeiro', 'financeiro', 'read'),
  ('financeiro.receber', 'Contas a Receber', 'Gerenciar receitas', 'financeiro', 'write'),
  ('financeiro.pagar', 'Contas a Pagar', 'Gerenciar despesas', 'financeiro', 'write'),
  ('financeiro.conciliacao', 'Conciliação Bancária', 'Conciliar extratos', 'financeiro', 'write'),
  ('financeiro.fluxo', 'Fluxo de Caixa', 'Visualizar fluxo', 'financeiro', 'read'),
  ('financeiro.relatorios', 'Relatórios Financeiros', 'Gerar relatórios', 'financeiro', 'read'),

  -- Repasse
  ('repasse.view', 'Ver Repasse', 'Visualizar repasse de profissionais', 'repasse', 'read'),
  ('repasse.manage', 'Gerenciar Repasse', 'Criar e processar repasses', 'repasse', 'write'),

  -- Estoque
  ('estoque.view', 'Ver Estoque', 'Visualizar inventário', 'estoque', 'read'),
  ('estoque.create', 'Criar Produto', 'Adicionar novo produto', 'estoque', 'write'),
  ('estoque.edit', 'Editar Produto', 'Modificar produto', 'estoque', 'write'),
  ('estoque.delete', 'Deletar Produto', 'Remover produto', 'estoque', 'delete'),
  ('estoque.movimento', 'Registrar Movimentação', 'Entrada/saída de estoque', 'estoque', 'write'),
  ('estoque.relatorios', 'Relatórios de Estoque', 'Ver relatórios', 'estoque', 'read'),

  -- Faturamento
  ('faturamento.view', 'Ver Faturamento', 'Visualizar faturamento', 'faturamento', 'read'),
  ('faturamento.guias', 'Gerenciar Guias', 'Criar/enviar guias TISS', 'faturamento', 'write'),
  ('faturamento.xml', 'Enviar XML', 'Enviar XML para operadora', 'faturamento', 'write'),

  -- Configurações
  ('configuracoes.view', 'Ver Configurações', 'Acesso ao módulo de configurações', 'configuracoes', 'read'),
  ('configuracoes.agenda', 'Configurar Agenda', 'Definir regras de agendamento', 'configuracoes', 'write'),
  ('configuracoes.financeiro', 'Configurar Financeiro', 'Definir conta bancária, etc', 'configuracoes', 'write'),
  ('configuracoes.estoque', 'Configurar Estoque', 'Definir mínimos, fornecedores', 'configuracoes', 'write'),

  -- Administração
  ('admin.usuarios', 'Gerenciar Usuários', 'Criar, editar, deletar usuários', 'admin', 'write'),
  ('admin.roles', 'Gerenciar Roles', 'Criar e atribuir roles', 'admin', 'write'),
  ('admin.permissions', 'Gerenciar Permissões', 'Definir permissões', 'admin', 'write'),
  ('admin.clinicas', 'Gerenciar Clínicas', 'Cadastrar múltiplas clínicas', 'admin', 'write'),
  ('admin.integracao', 'Gerenciar Integrações', 'Configurar Stripe, Supabase, etc', 'admin', 'write')
ON CONFLICT (key) DO NOTHING;

-- 3️⃣ TABELA: ROLE_PERMISSIONS
-- Mapeamento entre roles e permissions
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT now(),
  PRIMARY KEY (role_id, permission_id)
);

-- 4️⃣ ATRIBUIR PERMISSÕES AOS ROLES
-- Função auxiliar para inserir permissões
DO $$
DECLARE
  v_admin_id UUID;
  v_gestor_id UUID;
  v_financeiro_id UUID;
  v_profissional_id UUID;
  v_recepcao_id UUID;
BEGIN
  -- Buscar IDs dos roles
  SELECT id INTO v_admin_id FROM roles WHERE name = 'admin';
  SELECT id INTO v_gestor_id FROM roles WHERE name = 'gestor';
  SELECT id INTO v_financeiro_id FROM roles WHERE name = 'financeiro';
  SELECT id INTO v_profissional_id FROM roles WHERE name = 'profissional';
  SELECT id INTO v_recepcao_id FROM roles WHERE name = 'recepcao';

  -- ADMIN: acesso total
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_admin_id, id FROM permissions
  ON CONFLICT DO NOTHING;

  -- GESTOR: dashboard, agenda, pacientes, financeiro, estoque, faturamento, configurações
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_gestor_id, id FROM permissions
  WHERE key IN (
    'dashboard.view',
    'agenda.view', 'agenda.create', 'agenda.edit', 'agenda.professional_view', 'agenda.reports',
    'pacientes.view', 'pacientes.create', 'pacientes.edit', 'pacientes.prontuario',
    'financeiro.view', 'financeiro.receber', 'financeiro.pagar', 'financeiro.conciliacao', 'financeiro.fluxo', 'financeiro.relatorios',
    'repasse.view', 'repasse.manage',
    'estoque.view', 'estoque.relatorios',
    'faturamento.view', 'faturamento.guias', 'faturamento.xml',
    'configuracoes.view', 'configuracoes.agenda', 'configuracoes.financeiro', 'configuracoes.estoque'
  )
  ON CONFLICT DO NOTHING;

  -- FINANCEIRO: dashboard, financeiro, faturamento, repasse (view)
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_financeiro_id, id FROM permissions
  WHERE key IN (
    'dashboard.view',
    'financeiro.view', 'financeiro.receber', 'financeiro.pagar', 'financeiro.conciliacao', 'financeiro.fluxo', 'financeiro.relatorios',
    'repasse.view',
    'faturamento.view', 'faturamento.guias', 'faturamento.xml',
    'estoque.view'
  )
  ON CONFLICT DO NOTHING;

  -- PROFISSIONAL: dashboard, agenda, pacientes, repasse (view)
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_profissional_id, id FROM permissions
  WHERE key IN (
    'dashboard.view',
    'agenda.view', 'agenda.professional_view',
    'pacientes.view', 'pacientes.prontuario', 'pacientes.prontuario_edit',
    'repasse.view'
  )
  ON CONFLICT DO NOTHING;

  -- RECEPÇÃO: dashboard, agenda, pacientes
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_recepcao_id, id FROM permissions
  WHERE key IN (
    'dashboard.view',
    'agenda.view', 'agenda.create', 'agenda.edit', 'agenda.cancel', 'agenda.confirm',
    'pacientes.view', 'pacientes.create', 'pacientes.edit'
  )
  ON CONFLICT DO NOTHING;

END $$;

-- 5️⃣ TABELA: USER_ROLES
-- Atribuição de roles aos usuários
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(user_id, clinic_id)
);

-- ============================================
-- 📋 FUNÇÕES AUXILIARES
-- ============================================

-- Função: Buscar permissões de um usuário
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID, p_clinic_id UUID)
RETURNS TABLE(permission_key TEXT, permission_label TEXT) AS $$
SELECT DISTINCT p.key, p.label
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE ur.user_id = p_user_id
  AND ur.clinic_id = p_clinic_id
ORDER BY p.key;
$$ LANGUAGE SQL;

-- Função: Verificar se usuário tem permissão
CREATE OR REPLACE FUNCTION has_permission(p_user_id UUID, p_clinic_id UUID, p_permission_key TEXT)
RETURNS BOOLEAN AS $$
SELECT EXISTS (
  SELECT 1
  FROM user_roles ur
  JOIN roles r ON ur.role_id = r.id
  JOIN role_permissions rp ON r.id = rp.role_id
  JOIN permissions p ON rp.permission_id = p.id
  WHERE ur.user_id = p_user_id
    AND ur.clinic_id = p_clinic_id
    AND p.key = p_permission_key
);
$$ LANGUAGE SQL;

-- ============================================
-- 🔐 ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS nas tabelas
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

-- Política: Usuários só veem suas próprias atribuições de role
CREATE POLICY "users_view_own_roles"
ON user_roles FOR SELECT
USING (auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM user_roles ur2
    WHERE ur2.user_id = auth.uid()
    AND ur2.role_id IN (
      SELECT id FROM roles WHERE name IN ('admin', 'gestor')
    )
  )
);

-- ============================================
-- 📊 ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_clinic_id ON user_roles(clinic_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module);

-- ============================================
-- ✅ VERIFICAÇÃO FINAL
-- ============================================

-- Contar registros
SELECT 'Roles' as tabela, COUNT(*) as total FROM roles
UNION ALL
SELECT 'Permissions', COUNT(*) FROM permissions
UNION ALL
SELECT 'Role Permissions', COUNT(*) FROM role_permissions;
