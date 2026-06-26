import React from 'react';
import { NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';

const sections = [
  { key: 'dashboard-executivo', label: 'Dashboard Executivo' },
  { key: 'producao-medica', label: 'Produção Médica' },
  { key: 'calculo-repasse', label: 'Cálculo de Repasse' },
  { key: 'regras', label: 'Regras de Repasse' },
  { key: 'contas-pagar-medicas', label: 'Contas a Pagar Médicas' },
  { key: 'aprovacoes', label: 'Aprovações' },
  { key: 'glosas-impacto', label: 'Glosas e Impacto' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'rentabilidade', label: 'Rentabilidade Médica' },
  { key: 'simulacoes', label: 'Simulações' },
  { key: 'contas-bancarias', label: 'Contas Bancárias' },
  { key: 'automacoes', label: 'Automações' },
  { key: 'auditoria', label: 'Auditoria' },
];

export default function RepasseMedicoLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  React.useEffect(() => {
    const legacyTab = searchParams.get('tab');
    if (!legacyTab) {
      return;
    }

    const tabToSectionMap = {
      'visao-geral': 'dashboard-executivo',
      'regras-avancadas': 'regras/individual',
      analytics: 'analytics',
      automacao: 'automacoes',
    };

    const target = tabToSectionMap[legacyTab];
    if (!target) {
      return;
    }

    if (!location.pathname.endsWith(`/repasse/${target}`)) {
      navigate(`/clinica/financeiro/repasse/${target}`, { replace: true });
    }
  }, [searchParams, location.pathname, navigate]);

  return (
    <div className="w-full space-y-6 bg-slate-50">
      <div className="w-full">
        <div className="rounded-lg border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">Repasse Médico Enterprise</h1>
          <p className="mt-1 text-sm text-gray-600">
            Gestão integrada de produção médica, repasses, custos assistenciais e rentabilidade.
          </p>
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white px-2 py-2 shadow-sm">
          <nav className="flex w-max min-w-full gap-1">
            {sections.map((section) => (
              <NavLink
                key={section.key}
                to={`/clinica/financeiro/repasse/${section.key}`}
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                {section.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="mt-4">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
