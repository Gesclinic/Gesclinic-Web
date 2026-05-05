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
  type: string;
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
      const { data, error } = await supabase
        .from('payers')
        .select('id, name')
        .eq('clinic_id', clinicId)
        .order('name');

      if (error) throw error;
      setPayers(data || []);
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
