/**
 * Tratamento centralizado de erros
 * Transforma erros técnicos em mensagens amigáveis para usuário
 */

// ============================================================
// TIPO: Erro Amigável
// ============================================================

export class FriendlyError extends Error {
  constructor(userMessage, technicalMessage, code = 'UNKNOWN_ERROR') {
    super(technicalMessage);
    this.userMessage = userMessage;
    this.technicalMessage = technicalMessage;
    this.code = code;
    this.timestamp = new Date().toISOString();
  }
}

// ============================================================
// MAPA DE ERROS
// ============================================================

const ERROR_TRANSLATIONS = {
  // Erros de validação
  validation_error: {
    user: 'Dados inválidos. Verifique os campos e tente novamente.',
    code: 'VALIDATION_ERROR',
  },
  clinic_id_required: {
    user: 'Clínica não identificada. Faça login novamente.',
    code: 'CLINIC_REQUIRED',
  },
  invalid_clinic_id: {
    user: 'Clínica inválida.',
    code: 'INVALID_CLINIC',
  },

  // Erros de dados
  not_found: {
    user: 'Registro não encontrado.',
    code: 'NOT_FOUND',
  },
  duplicate_key: {
    user: 'Este registro já existe.',
    code: 'DUPLICATE',
  },
  foreign_key_violation: {
    user: 'Não é possível deletar: há registros relacionados.',
    code: 'HAS_RELATIONS',
  },

  // Erros de autenticação/autorização
  unauthorized: {
    user: 'Você não tem permissão para realizar esta ação.',
    code: 'UNAUTHORIZED',
  },
  forbidden: {
    user: 'Acesso negado.',
    code: 'FORBIDDEN',
  },
  unauthenticated: {
    user: 'Sessão expirada. Faça login novamente.',
    code: 'UNAUTHENTICATED',
  },

  // Erros de database
  database_error: {
    user: 'Erro ao acessar banco de dados. Tente novamente.',
    code: 'DATABASE_ERROR',
  },
  connection_error: {
    user: 'Erro de conexão. Verifique sua internet.',
    code: 'CONNECTION_ERROR',
  },

  // Erros de negócio
  appointment_conflict: {
    user: 'Conflito de horário. Escolha outro horário.',
    code: 'APPOINTMENT_CONFLICT',
  },
  invalid_time_range: {
    user: 'Horário inválido. Hora final deve ser após hora inicial.',
    code: 'INVALID_TIME_RANGE',
  },
};

// ============================================================
// FUNÇÃO: Normalizar erro
// ============================================================

export function normalizeError(error, context = {}) {
  if (!error) {
    return new FriendlyError('Erro desconhecido', 'Unknown error occurred', 'UNKNOWN');
  }

  // Se já é FriendlyError, retornar
  if (error instanceof FriendlyError) {
    return error;
  }

  // Extrair informações
  const message = error?.message || String(error);
  const code = error?.code;
  const errorDetails = error?.details;

  console.error('🔴 [ERROR] Normalizando erro:', {
    message,
    code,
    context,
    stack: error?.stack,
  });

  // SUPABASE ERRORS
  if (code === 'PGRST116') {
    // Nenhuma linha retornada (single/many sem resultado)
    return new FriendlyError(
      'Registro não encontrado.',
      `Database query returned no rows: ${message}`,
      'NOT_FOUND',
    );
  }

  if (code === '23505') {
    // Duplicate key violation
    return new FriendlyError(
      'Este registro já existe no sistema.',
      `Duplicate key error: ${message}`,
      'DUPLICATE',
    );
  }

  if (code === '23503') {
    // Foreign key violation
    return new FriendlyError(
      'Não é possível deletar: há registros relacionados.',
      `Foreign key constraint violated: ${message}`,
      'HAS_RELATIONS',
    );
  }

  if (code === '42P01') {
    // Tabela não existe
    return new FriendlyError(
      'Erro ao acessar banco de dados.',
      `Table not found: ${message}`,
      'DATABASE_ERROR',
    );
  }

  // RLS ERRORS
  if (message.includes('new row violates row-level security policy')) {
    return new FriendlyError(
      'Você não tem permissão para acessar esta clínica.',
      `RLS policy violation: ${message}`,
      'FORBIDDEN',
    );
  }

  if (message.includes('Unauthorized')) {
    return new FriendlyError(
      'Sessão expirada. Faça login novamente.',
      `Unauthorized: ${message}`,
      'UNAUTHENTICATED',
    );
  }

  // VALIDAÇÃO
  if (message.includes('obrigatório') || message.includes('required')) {
    return new FriendlyError(message, `Validation error: ${message}`, 'VALIDATION_ERROR');
  }

  if (message.includes('invalid') || message.includes('inválido')) {
    return new FriendlyError(message, `Invalid data: ${message}`, 'VALIDATION_ERROR');
  }

  if (message.includes('clinic_id')) {
    return new FriendlyError(
      'Clínica não identificada. Faça login novamente.',
      `clinic_id error: ${message}`,
      'CLINIC_REQUIRED',
    );
  }

  // CONEXÃO
  if (message.includes('fetch') || message.includes('network')) {
    return new FriendlyError(
      'Erro de conexão. Verifique sua internet.',
      `Network error: ${message}`,
      'CONNECTION_ERROR',
    );
  }

  // TIMEOUT
  if (message.includes('timeout')) {
    return new FriendlyError(
      'Operação levou muito tempo. Tente novamente.',
      `Timeout: ${message}`,
      'TIMEOUT',
    );
  }

  // PADRÃO
  return new FriendlyError(
    'Ocorreu um erro. Tente novamente mais tarde.',
    `Unhandled error: ${message}`,
    'UNKNOWN_ERROR',
  );
}

// ============================================================
// FUNÇÃO: Extrair mensagem amigável
// ============================================================

export function getUserFriendlyMessage(error) {
  if (error instanceof FriendlyError) {
    return error.userMessage;
  }

  const normalized = normalizeError(error);
  return normalized.userMessage;
}

// ============================================================
// FUNÇÃO: Log estruturado de erro
// ============================================================

export function logError(error, context = {}) {
  const normalized = normalizeError(error, context);

  console.error(`[ERROR-${normalized.code}] ${normalized.userMessage}`, {
    technical: normalized.technicalMessage,
    context,
    timestamp: normalized.timestamp,
  });

  // Adicionar contexto para Sentry
  return {
    message: normalized.userMessage,
    technicalMessage: normalized.technicalMessage,
    code: normalized.code,
    context,
    timestamp: normalized.timestamp,
  };
}

// ============================================================
// FUNÇÃO: Retry com backoff exponencial
// ============================================================

export async function retryWithBackoff(
  fn,
  options = { maxRetries: 3, initialDelay: 1000, maxDelay: 10000 },
) {
  const { maxRetries, initialDelay, maxDelay } = options;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 [RETRY] Tentativa ${attempt}/${maxRetries}`);
      return await fn();
    } catch (error) {
      // Se for último tentatativa, relançar erro
      if (attempt === maxRetries) {
        console.error(`❌ [RETRY] Falhou após ${maxRetries} tentativas`);
        throw error;
      }

      // Calcular delay: exponencial com jitter
      const exponentialDelay = Math.min(initialDelay * Math.pow(2, attempt - 1), maxDelay);
      const jitter = Math.random() * 0.1 * exponentialDelay; // ±10%
      const delay = exponentialDelay + jitter;

      console.log(`⏳ [RETRY] Aguardando ${Math.round(delay)}ms antes de tentar novamente...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

// ============================================================
// FUNÇÃO: Handler para mutações React Query
// ============================================================

export function createMutationErrorHandler(context = {}) {
  return (error) => {
    const normalized = normalizeError(error, context);
    console.error(`[MUTATION-ERROR] ${normalized.code}:`, normalized);
    return normalized;
  };
}

// ============================================================
// FUNÇÃO: Verificar se erro é recuperável
// ============================================================

export function isRetryableError(error) {
  const normalized = normalizeError(error);

  // Erros que NÃO devem fazer retry
  const nonRetryable = [
    'VALIDATION_ERROR',
    'UNAUTHORIZED',
    'FORBIDDEN',
    'CLINIC_REQUIRED',
    'NOT_FOUND',
    'DUPLICATE',
  ];

  return !nonRetryable.includes(normalized.code);
}
