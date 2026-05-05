import { useState, useEffect } from 'react';
import { customSupabaseClient } from '@/lib/customSupabaseClient';

export interface ProfessionalRepasse {
  professional_id: string;
  commission_percentage: number;
  commission_type: 'percentage' | 'fixed'; // percentage = %, fixed = valor fixo
  min_value?: number;
}

export function useRepasseCalculation() {
  const [reprises, setReprises] = useState<Map<string, ProfessionalRepasse>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfessionalReprises = async (clinicId: string) => {
    if (!clinicId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: err } = await customSupabaseClient
        .from('professional_repassse_configs')
        .select('*')
        .eq('clinic_id', clinicId);

      if (err && err.code !== 'PGRST116') throw err; // PGRST116 = table doesn't exist yet

      const reprisesMap = new Map<string, ProfessionalRepasse>();

      if (data) {
        data.forEach((config: any) => {
          reprisesMap.set(config.professional_id, {
            professional_id: config.professional_id,
            commission_percentage: config.commission_percentage || 0,
            commission_type: config.commission_type || 'percentage',
            min_value: config.min_value,
          });
        });
      }

      setReprises(reprisesMap);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Erro ao carregar configurações de repasse';
      console.warn('Repasse config não encontrada, usando valores padrão:', errorMessage);
      setError(null); // Don't show error if table doesn't exist
    } finally {
      setLoading(false);
    }
  };

  const calculateRepasse = (
    professionalId: string,
    servicePrice: number,
    discount: number = 0,
  ): {
    commission: number;
    netValue: number;
    description: string;
  } => {
    const config = reprises.get(professionalId);

    if (!config) {
      // Default: 30% commission if no config found
      const defaultCommission = 0.3;
      const netValue = servicePrice - discount;
      const commission = netValue * defaultCommission;
      return {
        commission: Math.round(commission * 100) / 100,
        netValue,
        description: `Repasse padrão 30%`,
      };
    }

    const netValue = servicePrice - discount;
    let commission = 0;

    if (config.commission_type === 'percentage') {
      commission = netValue * (config.commission_percentage / 100);
    } else {
      commission = config.commission_percentage; // Fixed value
    }

    if (config.min_value && commission < config.min_value) {
      commission = config.min_value;
    }

    return {
      commission: Math.round(commission * 100) / 100,
      netValue,
      description:
        config.commission_type === 'percentage'
          ? `Repasse ${config.commission_percentage}%`
          : `Repasse R$ ${config.commission_percentage.toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
            })}`,
    };
  };

  return {
    reprises,
    loading,
    error,
    fetchProfessionalReprises,
    calculateRepasse,
  };
}
