/**
 * 🪝 useAppointments HOOK
 * =====================
 *
 * Hook para gerenciar listagem e estado de agendamentos
 * Encapsula lógica de fetch, cache, e updates
 */

import { useState, useCallback, useEffect } from 'react';
import {
  Appointment,
  AgendaFilters,
  ValidationResult,
} from '../types';
import {
  listAppointments,
  getAppointment,
  createAppointment as apiCreate,
  updateAppointment as apiUpdate,
  deleteAppointment as apiDelete,
  subscribeToAppointments,
  unsubscribeFromAppointments,
} from '../services/agendaApi.service';
import { validateAppointmentPayload } from '../services/appointments.service';

export interface UseAppointmentsOptions {
  clinicId: string;
  autoSubscribe?: boolean;
  filters?: AgendaFilters;
  enableCache?: boolean;
  cacheTTL?: number;
}

export interface UseAppointmentsReturn {
  // Estado
  appointments: Appointment[];
  isLoading: boolean;
  error: string | null;
  total: number;

  // Operações
  fetch: (filters?: AgendaFilters) => Promise<void>;
  getOne: (id: string) => Promise<Appointment | null>;
  create: (data: any) => Promise<Appointment | null>;
  update: (id: string, data: any) => Promise<Appointment | null>;
  delete: (id: string) => Promise<boolean>;

  // Validação
  validate: (data: any) => ValidationResult;

  // Realtime
  isRealtimeActive: boolean;
  subscriptionId: string | null;
}

export function useAppointments(options: UseAppointmentsOptions): UseAppointmentsReturn {
  const {
    clinicId,
    autoSubscribe = true,
    filters: initialFilters,
    enableCache = true,
    cacheTTL = 5 * 60 * 1000,
  } = options;

  // Estado
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [cachedAt, setCachedAt] = useState<number>(0);

  // Fetch
  const fetch = useCallback(
    async (filters?: AgendaFilters) => {
      try {
        setIsLoading(true);
        setError(null);

        // Verificar cache
        if (enableCache && Date.now() - cachedAt < cacheTTL) {
          return;
        }

        const data = await listAppointments({
          clinicId,
          filters: filters || initialFilters,
        });

        setAppointments(data);
        setCachedAt(Date.now());
      } catch (err) {
        setError((err as Error).message);
        console.error('Error fetching appointments:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [clinicId, initialFilters, enableCache, cacheTTL, cachedAt]
  );

  // Get one
  const getOne = useCallback(async (id: string) => {
    try {
      return await getAppointment(id);
    } catch (err) {
      console.error('Error getting appointment:', err);
      return null;
    }
  }, []);

  // Create
  const create = useCallback(
    async (data: any) => {
      try {
        // Validar antes de criar
        const validation = validateAppointmentPayload(data);
        if (!validation.valid) {
          throw new Error(Object.values(validation.errors).join(', '));
        }

        const result = await apiCreate(data);

        // Adicionar à lista
        setAppointments(prev => [...prev, result]);

        return result;
      } catch (err) {
        setError((err as Error).message);
        console.error('Error creating appointment:', err);
        return null;
      }
    },
    []
  );

  // Update
  const update = useCallback(async (id: string, data: any) => {
    try {
      const result = await apiUpdate(id, data);

      // Atualizar lista
      setAppointments(prev =>
        prev.map(apt => (apt.id === id ? result : apt))
      );

      return result;
    } catch (err) {
      setError((err as Error).message);
      console.error('Error updating appointment:', err);
      return null;
    }
  }, []);

  // Delete
  const deleteOne = useCallback(async (id: string) => {
    try {
      await apiDelete(id);

      // Remover da lista
      setAppointments(prev => prev.filter(apt => apt.id !== id));

      return true;
    } catch (err) {
      setError((err as Error).message);
      console.error('Error deleting appointment:', err);
      return false;
    }
  }, []);

  // Validação
  const validate = useCallback(
    (data: any) => validateAppointmentPayload(data),
    []
  );

  // Setup realtime
  useEffect(() => {
    if (!autoSubscribe) return;

    // Fazer fetch inicial
    fetch();

    // Inscrever para updates
    const subId = subscribeToAppointments({
      clinicId,
      onInsert: apt => {
        setAppointments(prev => [...prev, apt]);
      },
      onUpdate: apt => {
        setAppointments(prev =>
          prev.map(existing => (existing.id === apt.id ? apt : existing))
        );
      },
      onDelete: apt => {
        setAppointments(prev => prev.filter(a => a.id !== apt.id));
      },
      onError: err => {
        setError(err.message);
      },
    });

    setSubscriptionId(subId);

    return () => {
      if (subId) {
        unsubscribeFromAppointments(subId);
      }
    };
  }, [clinicId, autoSubscribe, fetch]);

  return {
    appointments,
    isLoading,
    error,
    total: appointments.length,
    fetch,
    getOne,
    create,
    update,
    delete: deleteOne,
    validate,
    isRealtimeActive: !!subscriptionId,
    subscriptionId,
  };
}

export default useAppointments;
