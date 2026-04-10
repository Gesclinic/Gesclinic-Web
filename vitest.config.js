import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // ===== Ambiente de Teste =====
    environment: 'jsdom',
    globals: true,
    
    // ===== Setup =====
    setupFiles: ['./tests/setup.js'],
    
    // ===== Coverage =====
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        'dist/',
        '**/*.test.js',
        '**/*.spec.js'
      ],
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80
    },
    
    // ===== Transformação de Imports =====
    include: ['tests/**/*.test.{js,jsx,ts,tsx}', 'tests/**/*.spec.{js,jsx,ts,tsx}'],
    
    // ===== Pool (threads para paralelização) =====
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false
      }
    },
    
    // ===== Timeout =====
    testTimeout: 10000,
    hookTimeout: 10000,
    
    // ===== Reporters =====
    reporters: ['default'],
    
    // ===== Aliases =====
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
