import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import {
  getStoredActiveCompanyId,
  normalizeCompanyAccess,
  normalizeCompanyFromClinic,
  persistActiveCompany,
  publishTenantContext,
} from '@/lib/tenantContext';

const ClinicContext = createContext(undefined);

export function ClinicProvider({ children }) {
  const { user, clinicId, currentRole, loading: authLoading } = useAuth();

  const [clinic, setClinic] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [activeCompanyId, setActiveCompanyId] = useState(null);
  const [loadingClinic, setLoadingClinic] = useState(true);

  const fallbackClinicId = user ? clinicId : null;
  const activeCompany = useMemo(
    () => companies.find((company) => company.id === activeCompanyId) || companies[0] || null,
    [activeCompanyId, companies],
  );
  const resolvedClinicId = activeCompany?.clinic_id || fallbackClinicId;
  const tenantId = activeCompany?.tenant_id || null;
  const companyId = activeCompany?.company_id || resolvedClinicId || null;
  const branchId = activeCompany?.branch_id || null;

  const switchCompany = useCallback(
    (companyIdToActivate) => {
      const nextCompany = companies.find((company) => company.id === companyIdToActivate);
      if (!nextCompany || nextCompany.id === activeCompanyId) {
        return;
      }

      persistActiveCompany(nextCompany);
      publishTenantContext(nextCompany);
      setActiveCompanyId(nextCompany.id);
    },
    [activeCompanyId, companies],
  );

  useEffect(() => {
    let active = true;

    async function loadCompanies() {
      if (authLoading) {
        return;
      }

      const userId = user?.id;

      if (!userId && !fallbackClinicId) {
        if (active) {
          setCompanies([]);
          setActiveCompanyId(null);
          setClinic(null);
          setLoadingClinic(false);
        }
        return;
      }

      setLoadingClinic(true);
      let nextCompanies = [];
      let hasPrimaryMembership = false;

      if (userId) {
        const { data, error } = await supabase
          .from('user_companies')
          .select(
            'tenant_id, company_id, branch_id, role, permissions, is_active, companies:company_id(id, tenant_id, clinic_id, name, legal_name, trade_name, cnpj, default_branch_id)',
          )
          .eq('user_id', userId)
          .order('created_at', { ascending: true });

        if (error) {
          console.warn(
            '[ClinicContext] user_companies indisponível, usando fallback legado:',
            error.message,
          );
        } else {
          hasPrimaryMembership = (data || []).some((row) => row.companies?.clinic_id === fallbackClinicId);
          nextCompanies = (data || []).filter((row) => row.is_active)
            .map(normalizeCompanyAccess).filter(Boolean);
        }
      }

      if (nextCompanies.length === 0 && fallbackClinicId && !hasPrimaryMembership) {
        const { data, error } = await supabase
          .from('clinics')
          .select('*')
          .eq('id', fallbackClinicId)
          .maybeSingle();

        if (error) {
          console.error('[ClinicContext] erro ao carregar clínica fallback:', error.message);
        } else {
          const fallbackCompany = normalizeCompanyFromClinic(data, { role: currentRole });
          nextCompanies = fallbackCompany ? [fallbackCompany] : [];
        }
      }

      if (!active) {
        return;
      }

      const storedCompanyId = getStoredActiveCompanyId();
      const nextActiveCompany =
        nextCompanies.find((company) => company.id === storedCompanyId) || nextCompanies[0] || null;

      setCompanies(nextCompanies);
      setActiveCompanyId(nextActiveCompany?.id || null);

      if (nextActiveCompany) {
        persistActiveCompany(nextActiveCompany);
        publishTenantContext(nextActiveCompany);
      } else {
        publishTenantContext(null);
      }

      setLoadingClinic(false);
    }

    loadCompanies();

    return () => {
      active = false;
    };
  }, [authLoading, fallbackClinicId, currentRole, user?.id]);

  useEffect(() => {
    let active = true;

    async function loadClinic() {
      if (authLoading || !resolvedClinicId) {
        return;
      }

      setLoadingClinic(true);

      const { data, error } = await supabase
        .from('clinics')
        .select('*')
        .eq('id', resolvedClinicId)
        .maybeSingle();

      if (!active) {
        return;
      }

      if (error) {
        console.error('[ClinicContext] erro ao carregar clínica:', error.message);
        setClinic(activeCompany ? { id: resolvedClinicId, name: activeCompany.name } : null);
      } else {
        const mergedClinic = data ? { ...data, name: activeCompany?.name || data.name } : null;
        setClinic(mergedClinic);
      }

      setLoadingClinic(false);
    }

    loadClinic();

    return () => {
      active = false;
    };
  }, [activeCompany, authLoading, resolvedClinicId]);

  return (
    <ClinicContext.Provider
      value={{
        clinic,
        clinicId: resolvedClinicId,
        tenantId,
        companyId,
        branchId,
        companies,
        activeCompany,
        activeCompanyId,
        canSwitchCompany: companies.length > 1,
        switchCompany,
        loadingClinic,
        user,
        setClinic,
      }}
    >
      {children}
    </ClinicContext.Provider>
  );
}

export function useClinicContext() {
  const context = useContext(ClinicContext);

  if (context === undefined) {
    throw new Error('useClinicContext deve ser usado dentro de um <ClinicProvider>');
  }

  return context;
}
