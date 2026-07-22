import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getStoredActiveCompanyId,
  normalizeCompanyAccess,
  normalizeCompanyFromClinic,
  persistActiveCompany,
  publishTenantContext,
} from '../src/lib/tenantContext';

describe('tenantContext', () => {
  let storage;

  beforeEach(() => {
    storage = new Map();
    localStorage.getItem.mockImplementation((key) => storage.get(key) ?? null);
    localStorage.setItem.mockImplementation((key, value) => storage.set(key, value));
    localStorage.removeItem.mockImplementation((key) => storage.delete(key));
    localStorage.clear.mockImplementation(() => storage.clear());
    vi.spyOn(window, 'dispatchEvent').mockImplementation(() => true);
  });

  it('normaliza empresa autorizada a partir de user_companies', () => {
    const company = normalizeCompanyAccess({
      tenant_id: 'tenant-1',
      company_id: 'company-1',
      branch_id: 'branch-1',
      role: 'admin',
      permissions: { financeiro: true },
      companies: {
        id: 'company-1',
        tenant_id: 'tenant-1',
        clinic_id: 'clinic-1',
        name: 'Neuroclinica Cascavel LTDA',
        trade_name: 'Neuroclinica Cascavel',
        cnpj: '12345678000190',
        default_branch_id: 'branch-main',
      },
    });

    expect(company).toEqual({
      id: 'company-1',
      tenant_id: 'tenant-1',
      company_id: 'company-1',
      clinic_id: 'clinic-1',
      branch_id: 'branch-1',
      name: 'Neuroclinica Cascavel',
      legal_name: null,
      trade_name: 'Neuroclinica Cascavel',
      cnpj: '12345678000190',
      role: 'admin',
      permissions: { financeiro: true },
    });
  });

  it('mantem fallback legado quando existe apenas clinic_id', () => {
    const company = normalizeCompanyFromClinic(
      {
        id: 'clinic-1',
        tenant_id: 'tenant-1',
        company_id: 'company-1',
        default_branch_id: 'branch-main',
        name: 'Clinica Alpha LTDA',
        brand_name: 'Clinica Alpha',
      },
      { role: 'recepcao' },
    );

    expect(company).toMatchObject({
      id: 'company-1',
      tenant_id: 'tenant-1',
      company_id: 'company-1',
      clinic_id: 'clinic-1',
      branch_id: 'branch-main',
      name: 'Clinica Alpha',
      role: 'recepcao',
    });
  });

  it('persiste empresa ativa sem refresh e atualiza a sessao customizada', () => {
    storage.set(
      'gesclinic_session',
      JSON.stringify({
        user_id: 'user-1',
        clinic_id: 'clinic-old',
        clinic_name: 'Empresa antiga',
        role: 'recepcao',
      }),
    );

    persistActiveCompany({
      id: 'company-2',
      tenant_id: 'tenant-1',
      company_id: 'company-2',
      clinic_id: 'clinic-2',
      branch_id: 'branch-2',
      name: 'Hospital Sao Lucas',
      role: 'admin',
    });

    expect(getStoredActiveCompanyId()).toBe('company-2');
    expect(JSON.parse(storage.get('gesclinic_session'))).toMatchObject({
      user_id: 'user-1',
      tenant_id: 'tenant-1',
      company_id: 'company-2',
      clinic_id: 'clinic-2',
      branch_id: 'branch-2',
      clinic_name: 'Hospital Sao Lucas',
      role: 'admin',
    });
  });

  it('publica o contexto ativo para consumidores globais e consultas legadas', () => {
    publishTenantContext({
      tenant_id: 'tenant-1',
      company_id: 'company-1',
      clinic_id: 'clinic-1',
      branch_id: 'branch-1',
    });

    expect(window.__tenantContext).toEqual({
      tenantId: 'tenant-1',
      companyId: 'company-1',
      clinicId: 'clinic-1',
      branchId: 'branch-1',
    });
    expect(window.clinicId).toBe('clinic-1');
    expect(window.dispatchEvent).toHaveBeenCalledWith(expect.any(CustomEvent));
  });
});
