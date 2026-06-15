import { useState, useCallback } from 'react';
import { retryWithBackoff, isRetryableError } from '@/lib/retryUtils';
import { useToast } from '@/components/ToastSystem';

/**
 * useApiCall - Hook para gerenciar chamadas API com error handling
 * FASE 15: Error Handling & Notifications
 */
export function useApiCall() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { addToast } = useToast();

  const execute = useCallback(async (apiFunction, options = {}) => {
    const {
      retry = false,
      retryConfig = {},
      showToast = true,
      errorMessage = 'Erro ao carregar dados',
      successMessage = null
    } = options;

    setLoading(true);
    setError(null);

    try {
      let result;

      if (retry) {
        result = await retryWithBackoff(apiFunction, {
          shouldRetry: isRetryableError,
          ...retryConfig
        });
      } else {
        result = await apiFunction();
      }

      setLoading(false);

      if (successMessage && showToast) {
        addToast(successMessage, 'success');
      }

      return result;
    } catch (err) {
      const message = err.message || errorMessage;
      setError(message);
      setLoading(false);

      if (showToast) {
        addToast(message, 'error', 5000);
      }

      console.error('🔴 API Error:', {
        message,
        error: err,
        stack: err.stack
      });

      throw err;
    }
  }, [addToast]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return { loading, error, execute, clearError };
}

/**
 * useApiData - Hook para gerenciar estado de dados de API
 * Mais adequado para queries que não mudam frequentemente
 */
export function useApiData(apiFunction, dependencies = [], options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { addToast } = useToast();

  const {
    retry = true,
    retryConfig = { maxAttempts: 3 },
    showErrorToast = true,
    errorMessage = 'Erro ao carregar dados'
  } = options;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let result;

      if (retry) {
        result = await retryWithBackoff(apiFunction, {
          shouldRetry: isRetryableError,
          ...retryConfig
        });
      } else {
        result = await apiFunction();
      }

      setData(result);
      setLoading(false);
    } catch (err) {
      const message = err.message || errorMessage;
      setError(message);
      setLoading(false);

      if (showErrorToast) {
        addToast(message, 'error', 5000);
      }

      console.error('🔴 API Data Error:', { message, error: err });
    }
  }, [apiFunction, retry, retryConfig, showErrorToast, errorMessage, addToast]);

  // Fetch data when component mounts or dependencies change
  React.useEffect(() => {
    fetchData();
  }, dependencies);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch };
}

/**
 * useAsyncOperation - Hook para operações assíncronas genéricas
 * Mais flexível que useApiCall
 */
export function useAsyncOperation(operation, options = {}) {
  const [state, setState] = useState({
    status: 'idle', // idle, loading, success, error
    data: null,
    error: null
  });

  const { addToast } = useToast();

  const execute = useCallback(async (...args) => {
    setState({ status: 'loading', data: null, error: null });

    try {
      const result = await operation(...args);
      setState({ status: 'success', data: result, error: null });

      if (options.successMessage) {
        addToast(options.successMessage, 'success');
      }

      return result;
    } catch (err) {
      const message = err.message || options.errorMessage || 'Erro ao executar operação';
      setState({ status: 'error', data: null, error: message });

      if (options.showErrorToast !== false) {
        addToast(message, 'error', 5000);
      }

      throw err;
    }
  }, [operation, options, addToast]);

  const reset = useCallback(() => {
    setState({ status: 'idle', data: null, error: null });
  }, []);

  return {
    ...state,
    execute,
    reset,
    isLoading: state.status === 'loading',
    isSuccess: state.status === 'success',
    isError: state.status === 'error'
  };
}

/**
 * Exemplo de uso completo
 */
/*
// Em um componente
function BillingReportDashboard() {
  const { data, loading, error, refetch } = useApiData(
    () => getBillingReport(clinicId, startDate, endDate),
    [clinicId, startDate, endDate],
    { retry: true, errorMessage: 'Erro ao carregar relatório de faturamento' }
  );

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} onRetry={refetch} />;

  return <BillingReportTable reports={data} />;
}

// Ou para operações (POST, PUT, DELETE)
function SaveReportButton() {
  const { execute, isLoading } = useAsyncOperation(
    (reportData) => saveReport(reportData),
    {
      successMessage: 'Relatório salvo com sucesso!',
      errorMessage: 'Erro ao salvar relatório'
    }
  );

  return (
    <button 
      onClick={() => execute(formData)}
      disabled={isLoading}
    >
      {isLoading ? 'Salvando...' : 'Salvar'}
    </button>
  );
}
*/
