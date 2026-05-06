// src/main.jsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Sentry from '@sentry/react';

import App from './App.jsx';
import ErrorBoundary from '@/components/common/ErrorBoundary.jsx';

import { AuthProvider } from '@/contexts/SupabaseAuthContext.jsx';
import { ClinicProvider } from '@/contexts/ClinicContext.jsx';
import { PatientProvider } from '@/contexts/PatientContext.jsx';

import './index.css';
import './react-calendar-custom.css';

// Configurar Sentry para produção
if (import.meta.env.PROD) {
  try {
    const integrations = [];
    
    // Apenas adicionar Replay se existir e DSN estiver configurado
    if (Sentry.Replay && import.meta.env.VITE_SENTRY_DSN) {
      integrations.push(
        new Sentry.Replay({
          maskAllText: true,
          blockAllMedia: true,
        })
      );
    }
    
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN || '',
      integrations: integrations,
      tracesSampleRate: 0.1, // 10% de amostras em produção
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0, // Capturar 100% das sessões com erro
      environment: import.meta.env.VITE_APP_ENV || 'production',
    });
  } catch (err) {
    console.warn('⚠️ Falha ao inicializar Sentry:', err.message);
  }
}

const queryClient = new QueryClient();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <HelmetProvider>
          <AuthProvider>
            <ClinicProvider>
              <PatientProvider>
                <BrowserRouter>
                  <App />
                </BrowserRouter>
              </PatientProvider>
            </ClinicProvider>
          </AuthProvider>
        </HelmetProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
