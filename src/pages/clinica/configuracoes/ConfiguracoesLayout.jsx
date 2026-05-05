import React from 'react';
import { Helmet } from 'react-helmet';
import { Outlet, NavLink, useLocation } from 'react-router-dom';

export default function ConfiguracoesLayout() {
  const location = useLocation();
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Helmet>
        <title>Configurações — Gesclinic Web</title>
      </Helmet>

      {/* Conteúdo dinâmico (carregado por rotas internas) */}
      <main className="flex-1 p-10">
        <Outlet />
      </main>
    </div>
  );
}
