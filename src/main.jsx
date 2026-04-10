// src/main.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

import App from "./App.jsx";
import ErrorBoundary from "@/components/common/ErrorBoundary.jsx";

import { AuthProvider } from "@/contexts/SupabaseAuthContext.jsx";
import { ClinicProvider } from "@/contexts/ClinicContext.jsx";
import { PatientProvider } from "@/contexts/PatientContext.jsx";

import "./index.css";
import "./react-calendar-custom.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
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
    </ErrorBoundary>
  </React.StrictMode>
);
