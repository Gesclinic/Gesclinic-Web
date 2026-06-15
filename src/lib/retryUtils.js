/**
 * Retry Utilities - FASE 15: Error Handling
 * Implements exponential backoff retry logic for API calls
 */

/**
 * Executa uma função com retry e exponential backoff
 * @param {Function} fn - Função a executar (deve ser async)
 * @param {Object} options - Opções de configuração
 * @returns {Promise} Resultado da função
 */
export async function retryWithBackoff(fn, options = {}) {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    onRetry = null,
    shouldRetry = () => true
  } = options;

  let lastError;
  let attempt = 0;

  while (attempt < maxAttempts) {
    attempt++;

    try {
      console.log(`🔄 [Retry] Attempt ${attempt}/${maxAttempts}`);
      const result = await fn();
      if (attempt > 1) {
        console.log(`✅ [Retry] Success on attempt ${attempt}`);
      }
      return result;
    } catch (err) {
      lastError = err;
      console.error(`❌ [Retry] Attempt ${attempt} failed:`, err.message);

      // Check if we should retry this error
      if (!shouldRetry(err)) {
        console.log('⛔ [Retry] Error is not retryable, throwing...');
        throw err;
      }

      // If this is the last attempt, throw
      if (attempt >= maxAttempts) {
        console.error(`❌ [Retry] All ${maxAttempts} attempts failed`);
        throw lastError;
      }

      // Calculate delay with exponential backoff and jitter
      const exponentialDelay = initialDelay * Math.pow(backoffMultiplier, attempt - 1);
      const cappedDelay = Math.min(exponentialDelay, maxDelay);
      const jitter = Math.random() * cappedDelay * 0.1; // 10% jitter
      const totalDelay = cappedDelay + jitter;

      console.log(`⏳ [Retry] Waiting ${Math.round(totalDelay)}ms before retry...`);

      // Call onRetry callback if provided
      if (onRetry) {
        onRetry({ attempt, maxAttempts, delay: totalDelay, error: err });
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, totalDelay));
    }
  }

  throw lastError;
}

/**
 * Determina se um erro é "retryable"
 * Alguns erros não devem ser retried (ex: 401 Unauthorized, 403 Forbidden)
 */
export function isRetryableError(error) {
  // Network errors (connection refused, timeout, etc)
  if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') {
    return true;
  }

  // HTTP status codes
  const status = error.status || error.response?.status;
  
  // 5xx errors (server errors) - retryable
  if (status >= 500) {
    return true;
  }

  // 429 (Too Many Requests) - retryable
  if (status === 429) {
    return true;
  }

  // 503 (Service Unavailable) - retryable
  if (status === 503) {
    return true;
  }

  // 4xx errors (client errors) - not retryable
  if (status >= 400 && status < 500) {
    return false;
  }

  // Unknown errors - retry by default
  return true;
}

/**
 * Create a wrapped API function with automatic retries
 * Usage: const retryBillingReport = createRetryableFunction(getBillingReport);
 */
export function createRetryableFunction(apiFunction, defaultOptions = {}) {
  return async (...args) => {
    return retryWithBackoff(
      () => apiFunction(...args),
      {
        shouldRetry: isRetryableError,
        ...defaultOptions
      }
    );
  };
}

/**
 * Simple retry without backoff (for quick retries)
 */
export async function simpleRetry(fn, maxAttempts = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100 * attempt));
      }
    }
  }

  throw lastError;
}

/**
 * Retry with linear backoff (simpler than exponential)
 */
export async function retryWithLinearBackoff(fn, options = {}) {
  const {
    maxAttempts = 3,
    delay = 1000
  } = options;

  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }

  throw lastError;
}

/**
 * Race condition retry - tries multiple times in quick succession
 * Useful for handling race conditions in concurrent operations
 */
export async function retryOnRaceCondition(fn, maxAttempts = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      // Very short delays for race conditions
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
  }

  throw lastError;
}
