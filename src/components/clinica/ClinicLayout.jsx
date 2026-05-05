import * as React from 'react';
import { Outlet, Link } from 'react-router-dom';

export default function ClinicLayout() {
  return (
    <div className="min-h-screen">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-medium">Configurações da Clínica</h2>
          <nav className="space-x-3">
            {/* links relativos para funcionar com HashRouter */}
            <Link to="/" className="text-sm text-primary">
              Visão Geral
            </Link>
            <Link to="branding" className="text-sm text-primary">
              Branding
            </Link>
            {/* adicionar outros links de navegação de clinica aqui */}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
