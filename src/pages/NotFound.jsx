import React from 'react';
import { NavLink } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
      <h1 className="text-6xl font-bold text-primary mb-4">404</h1>

      <p className="text-xl text-gray-600 mb-6">Página não encontrada</p>

      <NavLink
        to="/clinica/dashboard"
        className="flex items-center gap-2 text-primary hover:text-primary-hover transition"
      >
        <ArrowLeft className="w-5 h-5" />
        Voltar ao dashboard
      </NavLink>
    </div>
  );
}
