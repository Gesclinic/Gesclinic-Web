import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
import {
  criarAgendamento,
  atualizarAgendamento,
  deletarAgendamento,
} from '@/modules/agenda/services/agenda.api.mutations';
import * as Sentry from '@sentry/react';
import { normalizeError, retryWithBackoff, isRetryableError } from '@/lib/errorHandler';

/**
 * Hook: Mutações de agendamento com validação, auditoria e retry
 * ✅ Validação de auth e clinic
 * ✅ Payload normalizado (sem user_id/role)
 * ✅ Retry automático em falhas recuperáveis
 * ✅ Logs estruturados + Sentry
 */
export function useAgendamentoMutation() {
  const queryClient = useQueryClient();
  const { user, userId } = useAuth();
  const { clinicId, loadingClinic } = useClinicContext();

  // ============================================================
  // VALIDAÇÃO PRÉ-REQUISITOS
  // ============================================================

  const validatePrerequisites = () => {
    if (!userId) {
      throw new Error('Usuário não autenticado');
    }
    if (!clinicId) {
      throw new Error('Clínica não identificada');
    }
    return true;
  };

  // ============================================================
  // MUTATION: CRIAR AGENDAMENTO
  // ============================================================

  const createMutation = useMutation({
    mutationFn: async (formData) => {
      try {
        validatePrerequisites();
        const payload = { ...formData, clinicId, status: formData.status || 'scheduled' };

        console.log('📝 [CRIAR] Payload:', {
          clinicId,
          patientId: payload.patientId,
          date: payload.date,
        });
        return await retryWithBackoff(() => criarAgendamento(payload), {
          maxRetries: 3,
          initialDelay: 1000,
        });
      } catch (error) {
        const normalized = normalizeError(error, { action: 'create_appointment', clinicId });
        Sentry.captureException(normalized);
        throw normalized;
      }
    },

    onMutate: async (formData) => {
      await queryClient.cancelQueries({ queryKey: ['appointments', clinicId, formData.date] });
      const previous = queryClient.getQueryData(['appointments', clinicId, formData.date]);
      queryClient.setQueryData(['appointments', clinicId, formData.date], (old = []) => [
        ...old,
        { ...formData, id: 'temp-' + crypto.randomUUID(), __optimistic: true },
      ]);
      return { previous };
    },

    onSuccess: (data) => {
      console.log('✅ [CRIAR] Sucesso:', data.id);
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      Sentry.captureMessage('Agendamento criado', 'info', {
        tags: { action: 'create_appointment_success' },
      });
    },

    onError: (error, formData, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(['appointments', clinicId, formData.date], context.previous);
      }
      console.error('❌ [CRIAR] Erro:', error.userMessage || error.message);
    },

    retry: (failureCount, error) => failureCount < 3 && isRetryableError(error),
  });

  // ============================================================
  // MUTATION: ATUALIZAR AGENDAMENTO
  // ============================================================

  const updateMutation = useMutation({
    mutationFn: async ({ agendamentoId, formData }) => {
      try {
        validatePrerequisites();
        if (!agendamentoId) {
          throw new Error('ID obrigatório');
        }

        // ⚠️ CRÍTICO: Garantir que clinicId vem do CONTEXTO, não do formData
        // formData pode ter clinicId errado de um agendamento anterior
        const payload = {
          ...formData,
          clinicId, // SEMPRE DO CONTEXTO - sobrescreve formData.clinicId
          id: agendamentoId,
        };

        console.log('✏️ [ATUALIZAR] Payload:', {
          agendamentoId,
          clinicId: clinicId, // Log do contexto
          formDataClinicId: formData.clinicId, // Log do que veio do form
          date: payload.date,
          finalClinicId: payload.clinicId, // Log do final
        });
        return await retryWithBackoff(() => atualizarAgendamento(agendamentoId, payload), {
          maxRetries: 3,
        });
      } catch (error) {
        const normalized = normalizeError(error, {
          action: 'update_appointment',
          clinicId,
          agendamentoId,
        });
        Sentry.captureException(normalized);
        throw normalized;
      }
    },

    onMutate: async ({ agendamentoId, formData }) => {
      await queryClient.cancelQueries({ queryKey: ['appointments', clinicId, formData.date] });
      const previous = queryClient.getQueryData(['appointments', clinicId, formData.date]);
      queryClient.setQueryData(['appointments', clinicId, formData.date], (old = []) =>
        old.map((item) =>
          item.id === agendamentoId ? { ...item, ...formData, __optimistic: true } : item,
        ),
      );
      return { previous };
    },

    onSuccess: (data) => {
      console.log('✅ [ATUALIZAR] Sucesso:', data.id);
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      Sentry.captureMessage('Agendamento atualizado', 'info', {
        tags: { action: 'update_appointment_success' },
      });
    },

    onError: (error, variables, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(
          ['appointments', clinicId, variables.formData.date],
          context.previous,
        );
      }
      console.error('❌ [ATUALIZAR] Erro:', error.userMessage || error.message);
    },

    retry: (failureCount, error) => failureCount < 3 && isRetryableError(error),
  });

  // ============================================================
  // MUTATION: DELETAR AGENDAMENTO
  // ============================================================

  const deleteMutation = useMutation({
    mutationFn: async (agendamentoId) => {
      try {
        validatePrerequisites();
        if (!agendamentoId) {
          throw new Error('ID obrigatório');
        }

        console.log('🗑️ [DELETAR] Agendamento:', { agendamentoId, clinicId });
        return await retryWithBackoff(() => deletarAgendamento(agendamentoId, clinicId), {
          maxRetries: 3,
        });
      } catch (error) {
        const normalized = normalizeError(error, {
          action: 'delete_appointment',
          clinicId,
          agendamentoId,
        });
        Sentry.captureException(normalized);
        throw normalized;
      }
    },

    onSuccess: () => {
      console.log('✅ [DELETAR] Sucesso');
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      Sentry.captureMessage('Agendamento deletado', 'info', {
        tags: { action: 'delete_appointment_success' },
      });
    },

    onError: (error) => {
      console.error('❌ [DELETAR] Erro:', error.userMessage || error.message);
    },

    retry: (failureCount, error) => failureCount < 3 && isRetryableError(error),
  });

  // ============================================================
  // RETORNAR HOOK
  // ============================================================

  return {
    // Mutations
    create: createMutation,
    update: updateMutation,
    delete: deleteMutation,

    // Funções de mutação assincronizadas (compatibilidade)
    criarAgendamento: createMutation.mutateAsync,
    atualizarAgendamento: updateMutation.mutateAsync,
    deletarAgendamento: deleteMutation.mutateAsync,

    // Status agregado
    isLoading: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
    isError: createMutation.isError || updateMutation.isError || deleteMutation.isError,

    // Dados
    data: createMutation.data || updateMutation.data || deleteMutation.data,

    // Erros
    error: createMutation.error || updateMutation.error || deleteMutation.error,

    // Helpers por operação
    loading: {
      create: createMutation.isPending,
      update: updateMutation.isPending,
      delete: deleteMutation.isPending,
    },

    // Reset
    reset: () => {
      createMutation.reset();
      updateMutation.reset();
      deleteMutation.reset();
    },
  };
}
