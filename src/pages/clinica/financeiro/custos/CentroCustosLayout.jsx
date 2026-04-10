import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import PageLayout from '@/components/ui/PageLayout';

export default function CentroCustosLayout() {
  const tabs = [
    { to: '/clinica/financeiro/centro-custos', label: 'Visão Geral', end: true },
    { to: '/clinica/financeiro/centro-custos/cadastro', label: 'Cadastro' },
    { to: '/clinica/financeiro/centro-custos/hierarquia', label: 'Hierarquia' },
    { to: '/clinica/financeiro/centro-custos/vinculacoes', label: 'Vinculações' },
    { to: '/clinica/financeiro/centro-custos/rateio', label: 'Rateio' },
    { to: '/clinica/financeiro/centro-custos/analises', label: 'Análises' },
    { to: '/clinica/financeiro/centro-custos/config', label: 'Configurações' },
  ];
  return (
    <PageLayout title="Centro de Custos">
      <div className="border-b mb-3">
        <nav className="-mb-px flex flex-wrap gap-2">
          {tabs.map(t => (
            <NavLink
              key={t.to+String(t.end||false)}
              to={t.to}
              end={t.end}
              className={({ isActive }) => `px-3 py-2 text-sm border-b-2 ${isActive ? 'border-primary text-primary' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
            >{t.label}</NavLink>
          ))}
        </nav>
      </div>
      <Outlet />
    </PageLayout>
  );
}

