import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import {
  getStoredActiveCompanyId,
  getStoredSession,
  normalizeCompanyAccess,
  normalizeCompanyFromClinic,
  persistActiveCompany,
  publishTenantContext,
} from '@/lib/tenantContext';

const ClinicContext = createContext(undefined);

export function ClinicProvider({ children }) {
  const { user, clinicId, loading: authLoading } = useAuth();

  const [clinic, setClinic] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [activeCompanyId, setActiveCompanyId] = useState(null);
  const [loadingClinic, setLoadingClinic] = useState(true);

  // Obter clinicId: primeiro de useAuth, depois do localStorage customizado
  const getClinicId = () => {
    if (clinicId) {
      return clinicId;
    }

    // Fallback para sessão customizada do localStorage
    const customSession = localStorage.getItem('gesclinic_session');
    if (customSession) {
      try {
        const sessionData = JSON.parse(customSession);
        return sessionData.clinic_id || sessionData.clinicId;
      } catch (e) {
        console.error('Erro ao parsear sessão customizada:', e);
      }
    }
    return null;
  };

  const fallbackClinicId = getClinicId();
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
      console.log(
        '🏢 [ClinicContext] loadCompanies acionado. authLoading:',
        authLoading,
        'fallbackClinicId:',
        fallbackClinicId,
      );

      if (authLoading) {
        console.log('⏳ [ClinicContext] Aguardando auth completar...');
        return;
      }

      const session = getStoredSession();
      const userId = user?.id || session?.user_id;

      if (!userId && !fallbackClinicId) {
        console.log('⚠️ [ClinicContext] Sem usuário ou clínica de fallback');
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

      if (userId) {
        const { data, error } = await supabase
          .from('user_companies')
          .select(
            'tenant_id, company_id, branch_id, role, permissions, companies:company_id(id, tenant_id, clinic_id, name, legal_name, trade_name, cnpj, default_branch_id)',
          )
          .eq('user_id', userId)
          .eq('is_active', true)
          .order('created_at', { ascending: true });

        if (error) {
          console.warn(
            '[ClinicContext] user_companies indisponível, usando fallback legado:',
            error.message,
          );
        } else {
          nextCompanies = (data || []).map(normalizeCompanyAccess).filter(Boolean);
        }
      }

      if (nextCompanies.length === 0 && fallbackClinicId) {
        const { data, error } = await supabase
          .from('clinics')
          .select('*')
          .eq('id', fallbackClinicId)
          .maybeSingle();

        if (error) {
          console.error('[ClinicContext] erro ao carregar clínica fallback:', error.message);
        } else {
          const fallbackCompany = normalizeCompanyFromClinic(data, session);
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
  }, [authLoading, fallbackClinicId, user?.id]);

  useEffect(() => {
    let active = true;

    async function loadClinic() {
      if (authLoading || !resolvedClinicId) {
        return;
      }

      console.log('🔄 [ClinicContext] Buscando clínica com ID:', resolvedClinicId);
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
        console.log('✅ [ClinicContext] Clínica carregada:', data);
        const mergedClinic = data ? { ...data, name: activeCompany?.name || data.name } : null;
        setClinic(mergedClinic);
        window.__clinic = mergedClinic; // 👈 debug global
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
