/**
 * HTTP Error Handler
 * Centraliza tratamento de erros HTTP
 */

export class ApiError extends Error {
  constructor(message, statusCode = 500, originalError = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.originalError = originalError;
  }
}

/**
 * Handle Supabase errors
 */
export const handleSupabaseError = (error) => {
  if (!error) {
    return null;
  }

  const statusCode = error.status || 500;
  const message = error.message || 'Erro desconhecido';

  console.error(`[Supabase Error ${statusCode}]:`, message);

  return new ApiError(message, statusCode, error);
};

/**
 * Handle API errors com retry
 */
export const handleApiError = (error, context = '') => {
  if (error instanceof ApiError) {
    console.error(`[${context}] API Error:`, error.message);
    return error;
  }

  if (error?.status === 401) {
    return new ApiError('Sesão expirada. Faça login novamente', 401, error);
  }

  if (error?.status === 403) {
    return new ApiError('Acesso negado', 403, error);
  }

  if (error?.status === 404) {
    return new ApiError('Recurso não encontrado', 404, error);
  }

  if (error?.status >= 500) {
    return new ApiError('Erro no servidor. Tente novamente mais tarde', error.status, error);
  }

  return new ApiError(
    error?.message || 'Erro ao processar requisição',
    error?.status || 500,
    error,
  );
};

/**
 * Log de erro estruturado
 */
export const logError = (error, context = {}) => {
  const errorLog = {
    timestamp: new Date().toISOString(),
    message: error.message,
    statusCode: error.statusCode || error.status,
    context,
    stack: error.stack,
  };

  console.error('[ERROR LOG]', JSON.stringify(errorLog, null, 2));

  // Em produção, enviar para serviço de logging (Sentry, etc)
  if (import.meta.env.MODE === 'production') {
    // TODO: Integrar com Sentry ou outro serviço
  }

  return errorLog;
};
