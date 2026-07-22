-- ============================================================
-- Multiempresa: Tenant -> Empresa -> Filial
-- Mantem compatibilidade com o Gesclinic atual usando clinic_id.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1. Estrutura base
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_clinic_id UUID UNIQUE REFERENCES public.clinics(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  clinic_id UUID UNIQUE REFERENCES public.clinics(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  legal_name TEXT,
  trade_name TEXT,
  cnpj TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  default_branch_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, cnpj)
);

CREATE TABLE IF NOT EXISTS public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL DEFAULT 'MATRIZ',
  is_main BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, code)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'companies_default_branch_id_fkey'
      AND conrelid = 'public.companies'::regclass
  ) THEN
    ALTER TABLE public.companies
      ADD CONSTRAINT companies_default_branch_id_fkey
      FOREIGN KEY (default_branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  role TEXT,
  permissions JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, company_id)
);

-- ============================================================
-- 2. Colunas de compatibilidade nas tabelas principais
-- ============================================================

ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS default_branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

-- ============================================================
-- 3. Migração automática: Clínica atual -> Tenant -> Empresa -> Matriz
-- ============================================================

INSERT INTO public.tenants (legacy_clinic_id, name)
SELECT c.id, COALESCE(NULLIF(c.name, ''), 'Tenant padrão')
FROM public.clinics c
ON CONFLICT (legacy_clinic_id) DO UPDATE
SET name = EXCLUDED.name,
    updated_at = now();

INSERT INTO public.companies (id, tenant_id, clinic_id, name, legal_name, trade_name, cnpj)
SELECT
  c.id,
  t.id,
  c.id,
  COALESCE(NULLIF(c.name, ''), 'Empresa padrão'),
  COALESCE(NULLIF(to_jsonb(c) ->> 'legal_name', ''), NULLIF(c.name, '')),
  COALESCE(NULLIF(to_jsonb(c) ->> 'trade_name', ''), NULLIF(to_jsonb(c) ->> 'brand_name', ''), NULLIF(c.name, '')),
  NULLIF(COALESCE(to_jsonb(c) ->> 'cnpj', to_jsonb(c) ->> 'document'), '')
FROM public.clinics c
JOIN public.tenants t ON t.legacy_clinic_id = c.id
ON CONFLICT (id) DO UPDATE
SET tenant_id = EXCLUDED.tenant_id,
    clinic_id = EXCLUDED.clinic_id,
    name = EXCLUDED.name,
    legal_name = EXCLUDED.legal_name,
    trade_name = EXCLUDED.trade_name,
    cnpj = EXCLUDED.cnpj,
    updated_at = now();

INSERT INTO public.branches (tenant_id, company_id, name, code, is_main)
SELECT co.tenant_id, co.id, 'Matriz', 'MATRIZ', true
FROM public.companies co
ON CONFLICT (company_id, code) DO UPDATE
SET tenant_id = EXCLUDED.tenant_id,
    name = EXCLUDED.name,
    is_main = true,
    updated_at = now();

UPDATE public.companies co
SET default_branch_id = b.id,
    updated_at = now()
FROM public.branches b
WHERE b.company_id = co.id
  AND b.code = 'MATRIZ';

UPDATE public.clinics c
SET tenant_id = co.tenant_id,
    company_id = co.id,
    default_branch_id = co.default_branch_id
FROM public.companies co
WHERE co.clinic_id = c.id;

UPDATE public.users u
SET tenant_id = c.tenant_id,
    company_id = c.company_id,
    branch_id = c.default_branch_id
FROM public.clinics c
WHERE u.clinic_id = c.id;

INSERT INTO public.user_companies (user_id, tenant_id, company_id, branch_id, role, is_active)
SELECT u.id, u.tenant_id, u.company_id, u.branch_id, u.role, true
FROM public.users u
WHERE u.company_id IS NOT NULL
ON CONFLICT (user_id, company_id) DO UPDATE
SET tenant_id = EXCLUDED.tenant_id,
    branch_id = EXCLUDED.branch_id,
    role = EXCLUDED.role,
    is_active = true,
    updated_at = now();

-- ============================================================
-- 4. Propaga tenant_id/company_id para tabelas com clinic_id
-- ============================================================

DO $$
DECLARE
  table_record RECORD;
BEGIN
  FOR table_record IN
    SELECT DISTINCT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema
     AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND c.column_name = 'clinic_id'
      AND t.table_type = 'BASE TABLE'
      AND c.table_name NOT IN ('clinics', 'companies', 'branches', 'tenants', 'user_companies')
  LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS tenant_id UUID', table_record.table_name);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS company_id UUID', table_record.table_name);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS branch_id UUID', table_record.table_name);

    EXECUTE format(
      'UPDATE public.%I row_data
       SET tenant_id = c.tenant_id,
           company_id = c.company_id,
           branch_id = c.default_branch_id
       FROM public.clinics c
       WHERE row_data.clinic_id = c.id
         AND (row_data.tenant_id IS NULL OR row_data.company_id IS NULL)',
      table_record.table_name
    );

    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (tenant_id)', 'idx_' || table_record.table_name || '_tenant_id', table_record.table_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (company_id)', 'idx_' || table_record.table_name || '_company_id', table_record.table_name);
  END LOOP;
END $$;

-- ============================================================
-- 5. Contexto global para RLS/RPC via headers do cliente Supabase
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_request_header(p_header TEXT)
RETURNS TEXT AS $$
DECLARE
  headers JSONB := '{}'::jsonb;
BEGIN
  BEGIN
    headers := COALESCE(current_setting('request.headers', true), '{}')::jsonb;
  EXCEPTION WHEN OTHERS THEN
    headers := '{}'::jsonb;
  END;

  RETURN headers ->> lower(p_header);
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID AS $$
DECLARE
  value TEXT;
BEGIN
  value := COALESCE(
    public.current_request_header('x-gesclinic-tenant-id'),
    NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id', '')
  );

  RETURN NULLIF(value, '')::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS UUID AS $$
DECLARE
  value TEXT;
BEGIN
  value := COALESCE(
    public.current_request_header('x-gesclinic-company-id'),
    public.current_request_header('x-gesclinic-clinic-id'),
    NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> 'company_id', '')
  );

  RETURN NULLIF(value, '')::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.current_app_user_id()
RETURNS UUID AS $$
DECLARE
  value TEXT;
BEGIN
  value := COALESCE(
    auth.uid()::text,
    public.current_request_header('x-gesclinic-user-id')
  );

  RETURN NULLIF(value, '')::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.user_has_company_access(p_user_id UUID, p_company_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  resolved_user_id UUID;
BEGIN
  resolved_user_id := COALESCE(p_user_id, public.current_app_user_id());

  RETURN EXISTS (
    SELECT 1
    FROM public.user_companies uc
    WHERE uc.user_id = resolved_user_id
      AND uc.company_id = p_company_id
      AND uc.is_active = true
  ) OR EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = resolved_user_id
      AND (u.company_id = p_company_id OR u.clinic_id = p_company_id)
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================
-- 6. RLS das novas tabelas
-- ============================================================

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenants_select_by_user_company ON public.tenants;
CREATE POLICY tenants_select_by_user_company
ON public.tenants FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_companies uc
    WHERE uc.tenant_id = tenants.id
      AND uc.user_id = public.current_app_user_id()
      AND uc.is_active = true
  )
);

DROP POLICY IF EXISTS companies_select_by_user_access ON public.companies;
CREATE POLICY companies_select_by_user_access
ON public.companies FOR SELECT
USING (public.user_has_company_access(public.current_app_user_id(), companies.id));

DROP POLICY IF EXISTS branches_select_by_user_company ON public.branches;
CREATE POLICY branches_select_by_user_company
ON public.branches FOR SELECT
USING (public.user_has_company_access(public.current_app_user_id(), branches.company_id));

DROP POLICY IF EXISTS user_companies_select_own ON public.user_companies;
CREATE POLICY user_companies_select_own
ON public.user_companies FOR SELECT
USING (user_id = public.current_app_user_id());

CREATE INDEX IF NOT EXISTS idx_companies_tenant_id ON public.companies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_companies_clinic_id ON public.companies(clinic_id);
CREATE INDEX IF NOT EXISTS idx_branches_company_id ON public.branches(company_id);
CREATE INDEX IF NOT EXISTS idx_user_companies_user_id ON public.user_companies(user_id);
CREATE INDEX IF NOT EXISTS idx_user_companies_company_id ON public.user_companies(company_id);
