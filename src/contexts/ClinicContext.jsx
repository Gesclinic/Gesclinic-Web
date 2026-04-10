import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/customSupabaseClient";
import { useAuth } from "@/contexts/SupabaseAuthContext";

const ClinicContext = createContext(undefined);

export function ClinicProvider({ children }) {
  const { user, clinicId, loading: authLoading } = useAuth();

  const [clinic, setClinic] = useState(null);
  const [loadingClinic, setLoadingClinic] = useState(true);

  // Obter clinicId: primeiro de useAuth, depois do localStorage customizado
  const getClinicId = () => {
    if (clinicId) return clinicId;
    
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

  const resolvedClinicId = getClinicId();

  useEffect(() => {
    let active = true;

    async function loadClinic() {
      console.log('🏥 [ClinicContext] loadClinic acionado. authLoading:', authLoading, 'resolvedClinicId:', resolvedClinicId);
      
      // 🔒 Aguarda o Auth terminar
      if (authLoading) {
        console.log('⏳ [ClinicContext] Aguardando auth completar...');
        return;
      }

      if (!resolvedClinicId) {
        console.log('⚠️ [ClinicContext] Sem resolvedClinicId');
        if (active) {
          setClinic(null);
          setLoadingClinic(false);
        }
        return;
      }

      console.log('🔄 [ClinicContext] Buscando clínica com ID:', resolvedClinicId);
      setLoadingClinic(true);

      const { data, error } = await supabase
        .from("clinics")
        .select("id, name, brand_color")
        .eq("id", resolvedClinicId)
        .single();

      if (!active) return;

      if (error) {
        console.error("[ClinicContext] erro ao carregar clínica:", error.message);
        setClinic(null);
      } else {
        console.log("✅ [ClinicContext] Clínica carregada:", data);
        setClinic(data);
        window.__clinic = data; // 👈 debug global
      }

      setLoadingClinic(false);
    }

    loadClinic();

    return () => {
      active = false;
    };
  }, [resolvedClinicId, authLoading]);

  return (
    <ClinicContext.Provider
      value={{
        clinic,
        clinicId: resolvedClinicId,
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
    throw new Error(
      "useClinicContext deve ser usado dentro de um <ClinicProvider>"
    );
  }

  return context;
}
