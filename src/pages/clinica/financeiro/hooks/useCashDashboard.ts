import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

export interface CashDashboardFilters {
  startDate?: string;
  endDate?: string;
  professionalId?: string;
  payerId?: string;
  type?: 'entrada' | 'saida';
  origin?: 'manual' | 'agenda';
}

export interface CashDashboardData {
  // KPIs
  totalReceita: number;
  totalDespesas: number;
  resultado: number;
  receitaParticular: number;
  receitaConvenio: number;
  repasseTotal: number;

  // Agregações
  porProfissional: Array<{
    professional_id: string;
    professional_name: string;
    total: number;
    count: number;
  }>;

  porConvenio: Array<{
    payer_id: string;
    payer_name: string;
    total: number;
    count: number;
    ticketMedio: number;
  }>;

  porServico: Array<{
    service_id: string;
    service_name: string;
    total: number;
    count: number;
  }>;

  evolucaoDiaria: Array<{
    date: string;
    entradas: number;
    saidas: number;
  }>;

  porOrigem: Array<{
    origin: 'manual' | 'agenda';
    total: number;
    percentage: number;
  }>;

  // Dados brutos
  movimentos: Array<any>;
}

export function useCashDashboard(clinicId: string, filters: CashDashboardFilters = {}) {
  const [data, setData] = useState<CashDashboardData>({
    totalReceita: 0,
    totalDespesas: 0,
    resultado: 0,
    receitaParticular: 0,
    receitaConvenio: 0,
    repasseTotal: 0,
    porProfissional: [],
    porConvenio: [],
    porServico: [],
    evolucaoDiaria: [],
    porOrigem: [],
    movimentos: [],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!clinicId) return;

    setLoading(true);
    setError(null);

    try {
      // Construir query com filtros
      let query = supabase
        .from('cash_movements')
        .select(
          `
          id,
          type,
          amount,
          status,
          payment_method,
          created_at,
          source,
          payer_type,
          origin,
          patient_id,
          professional_id,
          service_id,
          payer_id,
          patient:patients(name),
          professional:professionals(name),
          service:services(name),
          payer:payers(name)
        `,
        )
        .eq('clinic_id', clinicId)
        .eq('status', 'confirmado');

      // Aplicar filtros de data
      if (filters.startDate) {
        query = query.gte('created_at', `${filters.startDate}T00:00:00`);
      }
      if (filters.endDate) {
        query = query.lte('created_at', `${filters.endDate}T23:59:59`);
      }

      // Filtros adicionais
      if (filters.type) {
        query = query.eq('type', filters.type);
      }
      if (filters.origin) {
        query = query.eq('origin', filters.origin);
      }
      if (filters.professionalId) {
        query = query.eq('professional_id', filters.professionalId);
      }
      if (filters.payerId) {
        query = query.eq('payer_id', filters.payerId);
      }

      const { data: movements, error: fetchError } = await query.order('created_at', {
        ascending: false,
      });

      if (fetchError) throw fetchError;

      // Calcular agregações
      const aggregatedData = aggregateData(movements || []);
      setData(aggregatedData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar dashboard';
      setError(message);
      console.error('Erro ao buscar dados do dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [clinicId, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}

// Helper: Agregação de dados
function aggregateData(movements: any[]): CashDashboardData {
  const result: CashDashboardData = {
    totalReceita: 0,
    totalDespesas: 0,
    resultado: 0,
    receitaParticular: 0,
    receitaConvenio: 0,
    repasseTotal: 0,
    porProfissional: [],
    porConvenio: [],
    porServico: [],
    evolucaoDiaria: [],
    porOrigem: [],
    movimentos: movements,
  };

  // Mapas para agregação
  const profMap = new Map<string, { name: string; total: number; count: number }>();
  const payerMap = new Map<string, { name: string; total: number; count: number }>();
  const serviceMap = new Map<string, { name: string; total: number; count: number }>();
  const dailyMap = new Map<string, { entradas: number; saidas: number }>();
  const originMap = new Map<'manual' | 'agenda', number>();

  // Processar movimentos
  movements.forEach((mov) => {
    const amount = Number(mov.amount) || 0;
    const isEntrada = mov.type === 'entrada';

    // Totalizações
    if (isEntrada) {
      result.totalReceita += amount;
    } else {
      result.totalDespesas += amount;
    }

    // Receita por tipo de pagador
    if (isEntrada) {
      if (mov.payer_type === 'particular') {
        result.receitaParticular += amount;
      } else if (mov.payer_type === 'convenio') {
        result.receitaConvenio += amount;
      }
    }

    // Repasse do profissional
    if (mov.type === 'saida' && mov.origin === 'agenda') {
      result.repasseTotal += amount;
    }

    // Por Profissional
    if (mov.professional_id) {
      const key = mov.professional_id;
      const current = profMap.get(key) || {
        name: mov.professional?.name || 'N/A',
        total: 0,
        count: 0,
      };
      current.total += amount;
      current.count += 1;
      profMap.set(key, current);
    }

    // Por Convênio/Pagador
    if (mov.payer_id) {
      const key = mov.payer_id;
      const current = payerMap.get(key) || {
        name: mov.payer?.name || 'N/A',
        total: 0,
        count: 0,
      };
      current.total += amount;
      current.count += 1;
      payerMap.set(key, current);
    }

    // Por Serviço
    if (mov.service_id) {
      const key = mov.service_id;
      const current = serviceMap.get(key) || {
        name: mov.service?.name || 'N/A',
        total: 0,
        count: 0,
      };
      current.total += amount;
      current.count += 1;
      serviceMap.set(key, current);
    }

    // Evolução Diária
    const dateKey = mov.created_at?.split('T')[0] || new Date().toISOString().split('T')[0];
    const daily = dailyMap.get(dateKey) || { entradas: 0, saidas: 0 };
    if (isEntrada) {
      daily.entradas += amount;
    } else {
      daily.saidas += amount;
    }
    dailyMap.set(dateKey, daily);

    // Por Origem
    const origin = mov.origin || 'manual';
    originMap.set(origin, (originMap.get(origin) || 0) + amount);
  });

  // Calcular resultado
  result.resultado = result.totalReceita - result.totalDespesas;

  // Converter mapas para arrays
  result.porProfissional = Array.from(profMap.entries())
    .map(([id, data]) => ({
      professional_id: id,
      professional_name: data.name,
      total: data.total,
      count: data.count,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5); // Top 5

  result.porConvenio = Array.from(payerMap.entries())
    .map(([id, data]) => ({
      payer_id: id,
      payer_name: data.name,
      total: data.total,
      count: data.count,
      ticketMedio: data.count > 0 ? data.total / data.count : 0,
    }))
    .sort((a, b) => b.total - a.total);

  result.porServico = Array.from(serviceMap.entries())
    .map(([id, data]) => ({
      service_id: id,
      service_name: data.name,
      total: data.total,
      count: data.count,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5); // Top 5

  result.evolucaoDiaria = Array.from(dailyMap.entries())
    .map(([date, data]) => ({
      date,
      entradas: data.entradas,
      saidas: data.saidas,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Por Origem
  const totalPorOrigem = Array.from(originMap.values()).reduce((a, b) => a + b, 0);
  result.porOrigem = Array.from(originMap.entries()).map(([origin, total]) => ({
    origin,
    total,
    percentage: totalPorOrigem > 0 ? (total / totalPorOrigem) * 100 : 0,
  }));

  return result;
}
