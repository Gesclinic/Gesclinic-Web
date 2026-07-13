import { useState, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

export interface Patient {
  id: string;
  name: string;
  email?: string;
}

export interface Professional {
  id: string;
  name: string;
  specialization?: string;
}

export interface Service {
  id: string;
  name: string;
  price: number;
  category?: string;
}

export interface Payer {
  id: string;
  name: string;
  type?: string;
}

export const useCashFormData = (clinicId: string) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [payers, setPayers] = useState<Payer[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPatients = useCallback(async () => {
    if (!clinicId) return;

    try {
      const { data, error } = await supabase
        .from('patients')
        .select('id, name, email')
        .eq('clinic_id', clinicId)
        .order('name');

      if (error) throw error;
      setPatients(data || []);
    } catch (err) {
      console.error('Erro ao buscar pacientes:', err);
    }
  }, [clinicId]);

  const fetchProfessionals = useCallback(async () => {
    if (!clinicId) return;

    try {
      const { data, error } = await supabase
        .from('professionals')
        .select('id, name, specialization')
        .eq('clinic_id', clinicId)
        .order('name');

      if (error) throw error;
      setProfessionals(data || []);
    } catch (err) {
      console.error('Erro ao buscar profissionais:', err);
    }
  }, [clinicId]);

  const fetchServices = useCallback(async () => {
    if (!clinicId) return;

    try {
      const { data, error } = await supabase
        .from('services')
        .select('id, name, price')
        .eq('clinic_id', clinicId)
        .order('name');

      if (error) throw error;
      setServices(data || []);
    } catch (err) {
      console.error('Erro ao buscar serviços:', err);
    }
  }, [clinicId]);

  const fetchPayers = useCallback(async () => {
    if (!clinicId) return;

    try {
      const [{ data: healthInsurances, error: healthInsurancesError }, { data: payersData, error: payersError }] = await Promise.all([
        supabase
        .from('health_insurances')
        .select('id, name, active')
        .eq('clinic_id', clinicId)
        .eq('active', true)
          .order('name'),
        supabase
          .from('payers')
          .select('id, name')
          .eq('clinic_id', clinicId)
          .eq('active', true)
          .order('name'),
      ]);

      if (healthInsurancesError && payersError) {
        throw payersError;
      }

      const payerMap = new Map<string, Payer>();

      if (!healthInsurancesError) {
        (healthInsurances || []).forEach((payer) => payerMap.set(payer.id, {
          id: payer.id,
          name: payer.name || 'Convênio',
          type: 'convenio',
        }));
      }

      if (!payersError) {
        (payersData || []).forEach((payer) => {
          if (!payerMap.has(payer.id)) {
            payerMap.set(payer.id, { ...payer, type: 'convenio' });
          }
        });
      }

      setPayers(Array.from(payerMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
    } catch (err) {
      console.error('Erro ao buscar convênios:', err);
    }
  }, [clinicId]);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([fetchPatients(), fetchProfessionals(), fetchServices(), fetchPayers()]);
    } finally {
      setLoading(false);
    }
  }, [fetchPatients, fetchProfessionals, fetchServices, fetchPayers]);

  return {
    patients,
    professionals,
    services,
    payers,
    loading,
    fetchPatients,
    fetchProfessionals,
    fetchServices,
    fetchPayers,
    fetchAllData,
  };
};
