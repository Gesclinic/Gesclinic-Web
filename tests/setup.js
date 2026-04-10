import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

/**
 * Setup para Testes Vitest
 * - Limpeza de componentes após cada teste
 * - Mocks de localStorage, sessionStorage
 * - Mocks de window.fetch e console
 * - Setup de variáveis de ambiente
 */

// ===== Limpeza Automática =====
afterEach(() => {
  cleanup();
});

// ===== Mock: localStorage =====
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;

// ===== Mock: sessionStorage =====
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.sessionStorage = sessionStorageMock;

// ===== Mock: window.matchMedia =====
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// ===== Mock: IntersectionObserver =====
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
};

// ===== Mock: ResizeObserver =====
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// ===== Variáveis de Ambiente para Testes =====
process.env.VITE_SUPABASE_URL = 'http://localhost:54321';
process.env.VITE_SUPABASE_ANON_KEY = 'test-key-123';

// ===== Mock: fetch global =====
global.fetch = vi.fn((url) => {
  // Mock padrão: retorna erro
  return Promise.reject(new Error(`Fetch não foi mockado para ${url}`));
});

// ===== Suprime Warnings no Console (opcional) =====
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = (...args) => {
    // Ignorar certos warnings conhecidos
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
       args[0].includes('act(...)') ||
       args[0].includes('useLayoutEffect'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };

  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('componentWillReceiveProps') ||
       args[0].includes('UNSAFE_componentWillMount'))
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

/**
 * Custom Matchers (se necessário)
 */
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

/**
 * Helpers Úteis para Testes
 */
export const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const waitFor = async (callback, options = {}) => {
  const { timeout = 1000, interval = 50 } = options;
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    try {
      return callback();
    } catch (e) {
      await wait(interval);
    }
  }
  
  throw new Error(`waitFor timeout after ${timeout}ms`);
};

/**
 * Mock de API Padrão
 */
export const mockApiCall = (url, response, options = {}) => {
  const { status = 200, delay = 0 } = options;
  
  global.fetch.mockImplementationOnce(() =>
    new Promise(resolve =>
      setTimeout(() => {
        resolve({
          ok: status >= 200 && status < 300,
          status,
          json: async () => response,
          text: async () => JSON.stringify(response),
        });
      }, delay)
    )
  );
};

/**
 * Mock de Supabase (se usado nos testes)
 */
export const mockSupabaseClient = {
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: {}, error: null }),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
      order: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }),
    insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
    update: vi.fn().mockResolvedValue({ data: {}, error: null }),
    delete: vi.fn().mockResolvedValue({ data: null, error: null }),
  }),
  rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
  auth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
  },
};
