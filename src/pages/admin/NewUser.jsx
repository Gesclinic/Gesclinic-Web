import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Mail,
  User,
  Lock,
  Building,
  Shield,
  Save,
  ArrowLeft,
  Info,
  Search,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { HEALTHCARE_ROLES, defaultPermissionForRole } from '@/lib/rbacCatalog';
import {
  getDefaultMenuPermissionsForRole,
  getMenuPermissionModules,
} from '@/lib/menuPermissionCatalog';

// Papéis disponíveis
const AVAILABLE_ROLES = {
  admin: {
    label: 'Administrador',
    description: 'Acesso total ao sistema e gerenciamento de usuários',
    color: 'bg-red-50 border-red-200',
  },
  recepcao: {
    label: 'Recepção',
    description: 'Acesso a agenda, pacientes e atendimentos',
    color: 'bg-blue-50 border-blue-200',
  },
  gestor: {
    label: 'Gestor',
    description: 'Acesso gerencial com visão de operação e indicadores',
    color: 'bg-indigo-50 border-indigo-200',
  },
  medico: {
    label: 'Médico',
    description: 'Acesso clínico, prontuário e agenda própria',
    color: 'bg-teal-50 border-teal-200',
  },
  enfermeiro: {
    label: 'Enfermeiro',
    description: 'Acesso assistencial com foco em atendimento e evolução',
    color: 'bg-cyan-50 border-cyan-200',
  },
  tecnico_enfermagem: {
    label: 'Técnico de Enfermagem',
    description: 'Acesso operacional assistencial controlado',
    color: 'bg-sky-50 border-sky-200',
  },
  multiprofissional: {
    label: 'Multiprofissional',
    description: 'Acesso por equipe multiprofissional (nutrição, fisio, etc.)',
    color: 'bg-violet-50 border-violet-200',
  },
  profissional: {
    label: 'Profissional',
    description: 'Acesso a agenda, pacientes e prontuário',
    color: 'bg-purple-50 border-purple-200',
  },
  faturamento: {
    label: 'Faturamento',
    description: 'Acesso a emissão de notas fiscais e faturas',
    color: 'bg-amber-50 border-amber-200',
  },
  estoque: {
    label: 'Estoque',
    description: 'Acesso ao controle de estoque e movimentações',
    color: 'bg-orange-50 border-orange-200',
  },
  financeiro: {
    label: 'Financeiro',
    description: 'Acesso a contas a pagar/receber e fluxo de caixa',
    color: 'bg-green-50 border-green-200',
  },
  contabilidade: {
    label: 'Contabilidade',
    description: 'Acesso contábil para exportações e conferências',
    color: 'bg-emerald-50 border-emerald-200',
  },
};

const PERMISSIONS_BY_MODULE = getMenuPermissionModules();

export default function NewUser() {
  const navigate = useNavigate();
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [showPermissionsPanel, setShowPermissionsPanel] = useState(false);
  const [permissionSearch, setPermissionSearch] = useState('');

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    username: '',
    password: '',
    cpf: '',
    birthdate: '',
    role: 'recepcao',
    clinic_id: '',
  });

  useEffect(() => {
    loadClinics();
    setSelectedPermissions(getDefaultMenuPermissionsForRole('recepcao'));
  }, []);

  async function loadClinics() {
    try {
      const { data } = await supabase.from('clinics').select('id, name');
      setClinics(data || []);
    } catch (err) {
      console.error('Erro ao carregar clínicas:', err);
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    // Se mudar role, auto-selecionar permissões do novo papel
    if (name === 'role') {
      const rolePermissions = getDefaultMenuPermissionsForRole(value);
      setSelectedPermissions(rolePermissions);
    }
  };

  const saveUserPermissions = async (userId, clinicId, role, permissionIds) => {
    if (!userId || !clinicId) return;
    const presetMap = defaultPermissionForRole(role);

    const rows = permissionIds.map((permissionKey) => {
      const exact = presetMap[permissionKey];
      const wildcard = presetMap['*'];
      const moduleWildcard = presetMap[`${permissionKey.split('.')[0]}.*`];
      const source = exact || moduleWildcard || wildcard;

      return {
        user_id: userId,
        clinic_id: clinicId,
        permission_key: permissionKey,
        access_level: source?.accessLevel || 'view',
        data_scope: source?.dataScope || 'own',
        source: 'custom',
      };
    });

    // limpa e reaplica para manter coerência transacional de configuração
    await supabase.from('user_permissions').delete().eq('user_id', userId).eq('clinic_id', clinicId);

    if (rows.length) {
      const { error } = await supabase.from('user_permissions').upsert(rows, {
        onConflict: 'user_id,clinic_id,permission_key',
      });
      if (error) throw error;
    }
  };

  const handlePermissionToggle = (permissionId) => {
    setSelectedPermissions((prev) => {
      if (prev.includes(permissionId)) {
        return prev.filter((id) => id !== permissionId);
      } else {
        return [...prev, permissionId];
      }
    });
  };

  const handlePermissionCheckAll = (modulePermissions) => {
    const moduleIds = modulePermissions.map((p) => p.id);
    const allSelected = moduleIds.every((id) => selectedPermissions.includes(id));

    if (allSelected) {
      setSelectedPermissions((prev) => prev.filter((id) => !moduleIds.includes(id)));
    } else {
      setSelectedPermissions((prev) => [...new Set([...prev, ...moduleIds])]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    // Validações
    if (!form.full_name.trim()) {
      setError('Nome completo é obrigatório');
      setLoading(false);
      return;
    }
    if (!form.username.trim()) {
      setError('Nome de usuário é obrigatório');
      setLoading(false);
      return;
    }
    if (!form.email.trim()) {
      setError('Email é obrigatório');
      setLoading(false);
      return;
    }
    if (!form.cpf.trim()) {
      setError('CPF é obrigatório');
      setLoading(false);
      return;
    }
    if (!form.birthdate) {
      setError('Data de nascimento é obrigatória');
      setLoading(false);
      return;
    }
    if (!form.password || form.password.length < 12) {
      setError('Senha deve ter no mínimo 12 caracteres');
      setLoading(false);
      return;
    }
    if (!form.clinic_id) {
      setError('Clínica é obrigatória');
      setLoading(false);
      return;
    }

    try {
      // Validar duplicatas na clínica
      const { data: existingEmail } = await supabase
        .from('users')
        .select('id')
        .eq('email', form.email)
        .eq('clinic_id', form.clinic_id)
        .maybeSingle();

      if (existingEmail) {
        setError('Este email já está cadastrado nesta clínica');
        setLoading(false);
        return;
      }

      const { data: existingUsername } = await supabase
        .from('users')
        .select('id')
        .eq('username', form.username)
        .eq('clinic_id', form.clinic_id)
        .maybeSingle();

      if (existingUsername) {
        setError('Este nome de usuário já está cadastrado nesta clínica');
        setLoading(false);
        return;
      }

      const { data: existingCpf } = await supabase
        .from('users')
        .select('id')
        .eq('cpf', form.cpf)
        .eq('clinic_id', form.clinic_id)
        .maybeSingle();

      if (existingCpf) {
        setError('Este CPF já está cadastrado nesta clínica');
        setLoading(false);
        return;
      }

      const { data: created, error: createError } = await supabase.functions.invoke('manage-user-auth', {
        body: {
        action: 'create',
        email: form.email,
        full_name: form.full_name,
        username: form.username,
        cpf: form.cpf,
        birthdate: form.birthdate,
        password: form.password,
        role: form.role,
        clinic_id: form.clinic_id,
        },
      });
      if (createError || !created?.user_id) throw new Error(created?.error || 'Falha ao criar usuário');
      const userId = created.user_id;

      try {
        await saveUserPermissions(userId, form.clinic_id, form.role, selectedPermissions);
      } catch (permError) {
        console.warn('⚠️ Permissões customizadas não persistidas:', permError?.message);
      }

      // 🔗 Se é profissional/médico, criar registro na tabela professionals
      if (form.role === 'profissional' || form.role === 'medico') {
        console.log('🔗 [INTEGRAÇÃO] Criando profissional para:', form.full_name);
        const { error: profError } = await supabase.from('professionals').insert({
          name: form.full_name,
          email: form.email,
          clinic_id: form.clinic_id,
          active: true,
          cpf: form.cpf || null,
          phone: form.phone || null,
        });

        if (profError) {
          console.warn('⚠️ [INTEGRAÇÃO] Aviso ao criar profissional:', profError.message);
          // Não lançar erro - o usuário foi criado com sucesso, apenas o profissional não foi
        } else {
          console.log('✅ [INTEGRAÇÃO] Profissional criado com sucesso');
        }
      }

      setMessage(`✓ Usuário ${form.full_name} criado com sucesso!`);
      setForm({
        full_name: '',
        email: '',
        username: '',
        password: '',
        cpf: '',
        birthdate: '',
        role: 'recepcao',
        clinic_id: '',
      });
      setSelectedPermissions(getDefaultMenuPermissionsForRole('recepcao'));

      setTimeout(() => {
        navigate('/clinica/administracao/usuarios');
      }, 2000);
    } catch (err) {
      console.error('Erro ao criar usuário:', err);
      setError(err.message || 'Erro ao criar usuário');
    }

    setLoading(false);
  };

  const roleConfig = AVAILABLE_ROLES[form.role];
  const selectedClinic = clinics.find((clinic) => clinic.id === form.clinic_id);
  const inputClassName =
    'w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[hsl(var(--primary))] focus:ring-4 focus:ring-[hsl(var(--primary))]/10 disabled:bg-slate-50 disabled:text-slate-500';
  const iconInputClassName =
    'w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[hsl(var(--primary))] focus:ring-4 focus:ring-[hsl(var(--primary))]/10 disabled:bg-slate-50 disabled:text-slate-500';

  const filteredPermissionModules = useMemo(() => {
    const query = permissionSearch.trim().toLowerCase();

    return Object.entries(PERMISSIONS_BY_MODULE)
      .map(([moduleName, module]) => {
        if (!query) {
          return [moduleName, module];
        }

        const moduleMatches = (module.label || '').toLowerCase().includes(query);
        const filteredPermissions = (module.permissions || []).filter((permission) => {
          return (
            (permission.label || '').toLowerCase().includes(query) ||
            (permission.id || '').toLowerCase().includes(query) ||
            (permission.description || '').toLowerCase().includes(query)
          );
        });

        if (moduleMatches) {
          return [moduleName, module];
        }

        if (filteredPermissions.length > 0) {
          return [moduleName, { ...module, permissions: filteredPermissions }];
        }

        return null;
      })
      .filter(Boolean);
  }, [permissionSearch]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-white to-slate-50 p-6 shadow-sm md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/clinica/administracao/usuarios')}
            className="mt-1 rounded-2xl border border-slate-200 bg-white p-3 text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="space-y-2">
            <span className="inline-flex items-center rounded-full bg-[hsl(var(--primary))]/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[hsl(var(--primary))]">
              Administração
            </span>
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-slate-950">
                Criar Novo Usuário
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Cadastre o acesso, selecione a clínica e defina o papel inicial com uma estrutura
                mais clara para revisão antes de salvar.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 md:w-[360px]">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Clínicas</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{clinics.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Permissões
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{selectedPermissions.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Papel</p>
            <p className="mt-2 text-lg font-bold text-slate-900">{roleConfig?.label || '-'}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          <div className="flex gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
            <p>{error}</p>
          </div>
        </div>
      )}

      {message && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 shadow-sm">
          <div className="flex gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
            <p>{message}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card className="overflow-hidden rounded-3xl border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50/80">
              <CardTitle className="flex items-center gap-3 text-3xl text-slate-950">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]">
                  <User className="h-6 w-6" />
                </span>
                Informações do Usuário
              </CardTitle>
              <CardDescription>
                Dados principais de acesso e identificação do novo usuário.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 p-6">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Nome Completo *</label>
                  <input
                    type="text"
                    name="full_name"
                    value={form.full_name}
                    onChange={handleChange}
                    placeholder="João Silva"
                    className={inputClassName}
                    disabled={loading}
                  />
                  <p className="text-xs text-slate-500">
                    Use o nome completo para facilitar busca e identificação.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Nome de Usuário (Login) *
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    placeholder="joao.silva"
                    className={inputClassName}
                    disabled={loading}
                  />
                  <p className="text-xs text-slate-500">
                    Esse valor será usado no acesso ao sistema.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">CPF *</label>
                  <input
                    type="text"
                    name="cpf"
                    value={form.cpf}
                    onChange={handleChange}
                    placeholder="123.456.789-00"
                    className={inputClassName}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Data de Nascimento *
                  </label>
                  <input
                    type="date"
                    name="birthdate"
                    value={form.birthdate}
                    onChange={handleChange}
                    className={inputClassName}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Email *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="joao@example.com"
                      className={iconInputClassName}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Senha *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Mínimo 12 caracteres"
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[hsl(var(--primary))] focus:ring-4 focus:ring-[hsl(var(--primary))]/10 disabled:bg-slate-50 disabled:text-slate-500"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 transition hover:text-slate-600"
                      disabled={loading}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">
                    Use uma senha inicial temporária e altere no primeiro acesso, se necessário.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-3xl border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50/80">
              <CardTitle className="flex items-center gap-3 text-3xl text-slate-950">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]">
                  <Building className="h-6 w-6" />
                </span>
                Vínculo e Papel
              </CardTitle>
              <CardDescription>
                Defina a clínica e o papel base que servirá como ponto de partida para as
                permissões.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 p-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Clínica Vinculada *</label>
                <div className="relative">
                  <Building className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                  <select
                    name="clinic_id"
                    value={form.clinic_id}
                    onChange={handleChange}
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-10 text-sm text-slate-900 outline-none transition focus:border-[hsl(var(--primary))] focus:ring-4 focus:ring-[hsl(var(--primary))]/10 disabled:bg-slate-50 disabled:text-slate-500"
                    disabled={loading}
                  >
                    <option value="">Selecione uma clínica...</option>
                    {clinics.map((clinic) => (
                      <option key={clinic.id} value={clinic.id}>
                        {clinic.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-5 w-5 text-slate-400" />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-700">Papel de Acesso *</label>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {HEALTHCARE_ROLES.filter((r) => AVAILABLE_ROLES[r.id]).map(({ id: roleKey }) => {
                    const roleInfo = AVAILABLE_ROLES[roleKey];
                    return (
                    <label
                      key={roleKey}
                      className={`group rounded-2xl border p-4 transition ${
                        form.role === roleKey
                          ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/5 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="role"
                          value={roleKey}
                          checked={form.role === roleKey}
                          onChange={handleChange}
                          className="mt-1 h-4 w-4"
                          disabled={loading}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold text-slate-900">{roleInfo.label}</p>
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${roleInfo.color}`}
                            >
                              Perfil
                            </span>
                          </div>
                          <p className="mt-1 text-xs leading-5 text-slate-600">
                            {roleInfo.description}
                          </p>
                        </div>
                      </div>
                    </label>
                    );
                  })}
                </div>
              </div>

              {roleConfig && (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                  <div className="flex gap-3">
                    <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
                    <div>
                      <p className="font-semibold">Papel selecionado: {roleConfig.label}</p>
                      <p className="mt-1">{roleConfig.description}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-3xl border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50/80">
              <CardTitle className="flex items-center gap-3 text-2xl text-slate-950">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]">
                  <Shield className="h-5 w-5" />
                </span>
                Permissões Detalhadas
              </CardTitle>
              <CardDescription>
                Expanda apenas se precisar sair do padrão automático do papel selecionado.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <button
                type="button"
                onClick={() => setShowPermissionsPanel(!showPermissionsPanel)}
                className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left font-medium text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <span>Customizar Permissões Detalhadas</span>
                {showPermissionsPanel ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </button>

              {showPermissionsPanel && (
                <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-slate-900">Permissões selecionadas</h3>
                    <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                      {selectedPermissions.length} ativas
                    </span>
                  </div>

                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={permissionSearch}
                      onChange={(e) => setPermissionSearch(e.target.value)}
                      placeholder="Buscar por módulo, submenu ou permissão..."
                      className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[hsl(var(--primary))] focus:ring-4 focus:ring-[hsl(var(--primary))]/10"
                    />
                  </div>

                  {filteredPermissionModules.map(([moduleName, module]) => {
                    const modulePermissions = module.permissions;
                    const selectedCount = modulePermissions.filter((permission) =>
                      selectedPermissions.includes(permission.id),
                    ).length;
                    const allSelected = modulePermissions.every((permission) =>
                      selectedPermissions.includes(permission.id),
                    );

                    return (
                      <div
                        key={moduleName}
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                      >
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <label className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                            <input
                              type="checkbox"
                              checked={allSelected}
                              onChange={() => handlePermissionCheckAll(modulePermissions)}
                              className="h-4 w-4 rounded"
                            />
                            {module.label}
                          </label>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                            {selectedCount}/{modulePermissions.length}
                          </span>
                        </div>

                        <div className="grid gap-2">
                          {modulePermissions.map((permission) => {
                            const isSelected = selectedPermissions.includes(permission.id);

                            return (
                              <label
                                key={permission.id}
                                className={`rounded-xl border p-3 transition ${
                                  isSelected
                                    ? 'border-emerald-300 bg-emerald-50'
                                    : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handlePermissionToggle(permission.id)}
                                    className="mt-1 h-4 w-4 rounded"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-slate-900">
                                      {permission.label}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">
                                      {permission.description}
                                    </p>
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {filteredPermissionModules.length === 0 && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                      Nenhuma permissão encontrada para o filtro informado.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 xl:sticky xl:top-6">
          <Card className="rounded-3xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl text-slate-950">Resumo da Configuração</CardTitle>
              <CardDescription>
                Revise os pontos principais antes de criar o usuário.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Usuário
                </p>
                <p className="mt-2 font-semibold text-slate-900">
                  {form.full_name || 'Nome não preenchido'}
                </p>
                <p className="mt-1 text-sm text-slate-600">{form.email || 'Email não informado'}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Clínica
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {selectedClinic?.name || 'Selecione uma clínica'}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Papel
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {roleConfig?.label || 'Selecione um papel'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {roleConfig?.description ||
                      'As permissões base serão definidas automaticamente.'}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">Checklist rápido</p>
                <p className="mt-2">1. Validar clínica vinculada.</p>
                <p>2. Confirmar login e email.</p>
                <p>3. Revisar papel e permissões.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-slate-200 shadow-sm">
            <CardContent className="space-y-3 p-6">
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[hsl(var(--primary))] px-4 py-3.5 font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Criando usuário...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    Criar Usuário
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => navigate('/clinica/administracao/usuarios')}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancelar
              </button>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
