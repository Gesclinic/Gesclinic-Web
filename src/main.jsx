// src/main.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Sentry from "@sentry/react";

import App from "./App.jsx";
import ErrorBoundary from "@/components/common/ErrorBoundary.jsx";

import { AuthProvider } from "@/contexts/SupabaseAuthContext.jsx";
import { ClinicProvider } from "@/contexts/ClinicContext.jsx";
import { PatientProvider } from "@/contexts/PatientContext.jsx";

import "./index.css";
import "./react-calendar-custom.css";

// Configurar Sentry para produção
if (import.meta.env.PROD) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN || "",
    integrations: [
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: 0.1, // 10% de amostras em produção
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0, // Capturar 100% das sessões com erro
    environment: import.meta.env.VITE_APP_ENV || "production",
  });
}

const queryClient = new QueryClient();

createRoot(document.getElementById("root")).render(
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
  </React.StrictMode>
);
