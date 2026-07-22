const ACTIVE_COMPANY_STORAGE_KEY = 'gesclinic_active_company_id';

function parseStoredJson(key) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.warn(`[tenantContext] Falha ao ler ${key}:`, error);
    return null;
  }
}

function writeStoredJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`[tenantContext] Falha ao salvar ${key}:`, error);
  }
}

export function getStoredSession() {
  return parseStoredJson('gesclinic_session');
}

export function getStoredActiveCompanyId() {
  return localStorage.getItem(ACTIVE_COMPANY_STORAGE_KEY);
}

export function normalizeCompanyFromClinic(clinic, session = null) {
  if (!clinic?.id && !session?.clinic_id && !session?.clinicId) {
    return null;
  }

  const clinicId = clinic?.id || session?.clinic_id || session?.clinicId;
  const name =
    clinic?.trade_name ||
    clinic?.brand_name ||
    clinic?.name ||
    session?.clinic_name ||
    session?.company_name ||
    'Clínica';

  return {
    id: clinic?.company_id || clinicId,
    tenant_id: clinic?.tenant_id || session?.tenant_id || null,
    company_id: clinic?.company_id || clinicId,
    clinic_id: clinicId,
    branch_id: clinic?.default_branch_id || session?.branch_id || null,
    name,
    legal_name: clinic?.legal_name || null,
    trade_name: clinic?.trade_name || clinic?.brand_name || clinic?.name || name,
    cnpj: clinic?.cnpj || clinic?.document || null,
    role: session?.role || null,
    permissions: null,
  };
}

export function normalizeCompanyAccess(row) {
  const company = row?.companies || row?.company || row;
  if (!company?.id && !row?.company_id) {
    return null;
  }

  const companyId = row.company_id || company.id;
  const clinicId = company.clinic_id || companyId;
  const name =
    company.trade_name || company.brand_name || company.name || company.legal_name || 'Clínica';

  return {
    id: companyId,
    tenant_id: row.tenant_id || company.tenant_id || null,
    company_id: companyId,
    clinic_id: clinicId,
    branch_id: row.branch_id || company.default_branch_id || null,
    name,
    legal_name: company.legal_name || null,
    trade_name: company.trade_name || name,
    cnpj: company.cnpj || null,
    role: row.role || null,
    permissions: row.permissions || null,
  };
}

export function persistActiveCompany(company) {
  if (!company) {
    return;
  }

  localStorage.setItem(ACTIVE_COMPANY_STORAGE_KEY, company.id);

  const session = getStoredSession();
  if (session) {
    writeStoredJson('gesclinic_session', {
      ...session,
      tenant_id: company.tenant_id,
      company_id: company.company_id,
      branch_id: company.branch_id,
      clinic_id: company.clinic_id,
      clinic_name: company.name,
      role: company.role || session.role,
    });
  }
}

export function publishTenantContext(company) {
  const context = company
    ? {
        tenantId: company.tenant_id,
        companyId: company.company_id,
        clinicId: company.clinic_id,
        branchId: company.branch_id,
      }
    : null;

  window.__tenantContext = context;
  window.clinicId = context?.clinicId || null;
  window.dispatchEvent(new CustomEvent('gesclinic:tenant-context-changed', { detail: context }));
}
