import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function Forbidden() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-rose-50 p-6">
      <div className="max-w-xl rounded-3xl border border-slate-200 bg-white/90 p-8 text-center shadow-xl backdrop-blur">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.22em] text-rose-600">
          403 Forbidden
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">
          Acesso negado para esta área
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Seu perfil não possui a permissão necessária para visualizar esta rota. Se isso parecer
          incorreto, revise as permissões do usuário na clínica.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            to="/clinica/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[hsl(var(--primary))] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao dashboard
          </Link>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Ir para a home
          </Link>
        </div>
      </div>
    </div>
  );
}