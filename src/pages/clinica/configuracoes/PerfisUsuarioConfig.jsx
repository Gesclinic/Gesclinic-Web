import React, { useState, useEffect, useCallback } from 'react';
import { useClinicContext } from '@/contexts/ClinicContext';
import { useNavigate } from 'react-router-dom';
import {
  Shield, Users, LayoutDashboard, CalendarDays, UserRound, BookOpen,
  Wallet, Package, Receipt, Settings, Building2, CheckCircle2,
  MinusCircle, XCircle, ChevronRight, ExternalLink, Info, BarChart3, Stethoscope,
} from 'lucide-react';
import {
  PROFILES_CONFIG, MODULES_LIST, PERMISSION_MATRIX,
  listUsersByProfile, countUsersByProfile,
} from '@/lib/profilesApi';

const MODULE_ICONS = {
  dashboard:         <LayoutDashboard className="w-4 h-4" />,
  agenda:            <CalendarDays className="w-4 h-4" />,
  pacientes:         <UserRound className="w-4 h-4" />,
  cadastros_basicos: <BookOpen className="w-4 h-4" />,
  financeiro:        <Wallet className="w-4 h-4" />,
  estoque:           <Package className="w-4 h-4" />,
  faturamento:       <Receipt className="w-4 h-4" />,
  configuracoes:     <Settings className="w-4 h-4" />,
  administracao:     <Building2 className="w-4 h-4" />,
};

const PROFILE_ICONS = {
  admin:       <Shield className="w-5 h-5" />,
  gestor:      <BarChart3 className="w-5 h-5" />,
  financeiro:  <Wallet className="w-5 h-5" />,
  recepcao:    <CalendarDays className="w-5 h-5" />,
  medico:      <Stethoscope className="w-5 h-5" />,
  estoque:     <Package className="w-5 h-5" />,
  faturamento: <Receipt className="w-5 h-5" />,
};

function AccessBadge({ level }) {
  if (level === 'full')    return <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />;
  if (level === 'partial') return <MinusCircle  className="w-5 h-5 text-amber-400 mx-auto" />;
  return <XCircle className="w-5 h-5 text-slate-200 mx-auto" />;
}

function UsersModal({ roleId, config, onClose, navigate }) {
  const { clinicId } = useClinicContext();
  const [users, setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clinicId || !roleId) return;
    setLoading(true);
    listUsersByProfile(roleId, clinicId).then(setUsers).finally(() => setLoading(false));
  }, [clinicId, roleId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-5">
          <div className={`flex items-center justify-center w-10 h-10 rounded-xl border ${config.bgClass}`}>
            <span className={config.colorClass}>{PROFILE_ICONS[roleId]}</span>
          </div>
          <div>
            <h3 className="font-bold text-slate-900">{config.label}</h3>
            <p className="text-xs text-slate-500">{users.length} usuário(s) neste perfil</p>
          </div>
          <button onClick={onClose} className="ml-auto text-slate-400 hover:text-slate-600 transition">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-slate-400 text-sm">Carregando usuários...</div>
        ) : users.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-sm">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
            Nenhum usuário com este perfil
          </div>
        ) : (
          <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {users.map((u) => (
              <li key={u.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-200 text-slate-600 text-xs font-bold flex-shrink-0">
                  {(u.full_name || u.email || '?')[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{u.full_name || '(sem nome)'}</p>
                  <p className="text-xs text-slate-500 truncate">{u.email}</p>
                </div>
              </li>
            ))}
          </ul>
        )}

        <button
          onClick={() => { onClose(); navigate('/clinica/administracao/usuarios'); }}
          className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 py-2.5 text-sm font-medium transition"
        >
          <ExternalLink className="w-4 h-4" /> Gerenciar Usuários
        </button>
      </div>
    </div>
  );
}

function RoleCard({ roleId, config, userCount, onViewUsers }) {
  return (
    <div className={`rounded-2xl border p-5 transition hover:shadow-md ${config.bgClass}`}>
      <div className="flex items-start gap-3 mb-4">
        <div className={`flex items-center justify-center w-10 h-10 rounded-xl bg-white shadow-sm border ${config.bgClass} flex-shrink-0`}>
          <span className={config.colorClass}>{PROFILE_ICONS[roleId]}</span>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-slate-900 text-sm">{config.label}</h3>
          <p className="text-xs text-slate-500 mt-0.5 leading-snug">{config.description}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-4">
        {config.modules.map((mod) => {
          const m = MODULES_LIST.find((x) => x.id === mod);
          return (
            <span key={mod} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${config.badgeClass}`}>
              {MODULE_ICONS[mod]} {m?.label || mod}
            </span>
          );
        })}
      </div>

      <div className="flex items-center justify-between border-t border-white/60 pt-3">
        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
          <Users className="w-3.5 h-3.5" />
          {userCount} usuário{userCount !== 1 ? 's' : ''}
        </span>
        <button
          onClick={() => onViewUsers(roleId)}
          className={`flex items-center gap-1 text-xs font-semibold ${config.colorClass} hover:underline transition`}
        >
          Ver usuários <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function PerfisUsuarioConfig() {
  const { clinicId } = useClinicContext();
  const navigate = useNavigate();
  const [activeTab, setActiveTab]   = useState('overview');
  const [userCounts, setUserCounts] = useState({});
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading]       = useState(true);
  const [modalRole, setModalRole]   = useState(null);

  const loadCounts = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    const counts = {};
    let total = 0;
    await Promise.all(
      Object.keys(PROFILES_CONFIG).map(async (role) => {
        const c = await countUsersByProfile(role, clinicId);
        counts[role] = c;
        total += c;
      })
    );
    setUserCounts(counts);
    setTotalUsers(total);
    setLoading(false);
  }, [clinicId]);

  useEffect(() => { loadCounts(); }, [loadCounts]);

  const roles = Object.keys(PROFILES_CONFIG);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Perfis e Permissões</h1>
        <p className="text-sm text-slate-500 mt-1">
          Gerencie os perfis de acesso e veja quais módulos cada perfil pode utilizar.
        </p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl bg-blue-50 border border-blue-200 p-4">
        <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-800">
          <span className="font-semibold">Permissões baseadas em perfil (RBAC)</span> — cada usuário herda os
          acessos do seu perfil automaticamente. Para alterar o perfil de um usuário, acesse{' '}
          <button onClick={() => navigate('/clinica/administracao/usuarios')} className="underline font-medium hover:text-blue-900">
            Administração → Usuários
          </button>.
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total de Perfis',       value: roles.length },
          { label: 'Usuários Cadastrados',  value: loading ? '—' : totalUsers },
          { label: 'Módulos do Sistema',    value: MODULES_LIST.length },
          { label: 'Perfis com Usuários',   value: loading ? '—' : Object.values(userCounts).filter((c) => c > 0).length },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide">{stat.label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1 w-fit">
        {[{ id: 'overview', label: 'Visão Geral' }, { id: 'matrix', label: 'Matriz de Permissões' }].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === tab.id ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Visão Geral */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {roles.map((roleId) => (
            <RoleCard
              key={roleId}
              roleId={roleId}
              config={PROFILES_CONFIG[roleId]}
              userCount={loading ? '…' : (userCounts[roleId] ?? 0)}
              onViewUsers={setModalRole}
            />
          ))}
        </div>
      )}

      {/* Tab: Matriz */}
      {activeTab === 'matrix' && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left py-3 px-4 font-semibold text-slate-700 min-w-[160px] sticky left-0 bg-slate-50 z-10">
                    Módulo
                  </th>
                  {roles.map((roleId) => (
                    <th key={roleId} className="py-3 px-3 text-center min-w-[90px]">
                      <div className="flex flex-col items-center gap-1">
                        <span className={PROFILES_CONFIG[roleId].colorClass}>{PROFILE_ICONS[roleId]}</span>
                        <span className="text-xs font-semibold text-slate-700 whitespace-nowrap leading-tight">
                          {PROFILES_CONFIG[roleId].label}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MODULES_LIST.map((mod, i) => (
                  <tr key={mod.id} className={`border-b border-slate-50 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                    <td className="py-3 px-4 sticky left-0 bg-inherit z-10">
                      <div className="flex items-center gap-2 text-slate-700">
                        <span className="text-slate-400">{MODULE_ICONS[mod.id]}</span>
                        <span className="font-medium text-sm">{mod.label}</span>
                      </div>
                    </td>
                    {roles.map((roleId) => (
                      <td key={roleId} className="py-3 px-3 text-center">
                        <AccessBadge level={PERMISSION_MATRIX[mod.id]?.[roleId] ?? 'none'} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center gap-5 px-4 py-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-600">
            <span className="font-semibold text-slate-700">Legenda:</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-green-500" /> Acesso completo</span>
            <span className="flex items-center gap-1.5"><MinusCircle className="w-4 h-4 text-amber-400" /> Acesso parcial</span>
            <span className="flex items-center gap-1.5"><XCircle className="w-4 h-4 text-slate-300" /> Sem acesso</span>
          </div>
        </div>
      )}

      {/* Modal de usuários */}
      {modalRole && (
        <UsersModal
          roleId={modalRole}
          config={PROFILES_CONFIG[modalRole]}
          onClose={() => setModalRole(null)}
          navigate={navigate}
        />
      )}
    </div>
  );
}