import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import {
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
} from 'lucide-react';

export default function NewClinic() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [form, setForm] = useState({
    name: '',
    fantasy_name: '',
    cnpj: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipcode: '',
    clinic_type: 'matriz',
    parent_clinic_id: null,
    status: 'active',
    // Campos automáticos (hidden)
    clinic_code: '',
    slug: '',
    timezone: 'America/Sao_Paulo',
    locale: 'pt-BR',
    settings: {},
  });

  const [clinicas, setClinicas] = useState([]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;

    // Formatar CNPJ automaticamente
    if (name === 'cnpj') {
      finalValue = formatCNPJ(value);
    }

    // Formatar telefone automaticamente
    if (name === 'phone') {
      finalValue = formatPhone(value);
    }

    setForm((prev) => ({
      ...prev,
      [name]: finalValue,
    }));
    setError('');
  };

  const formatCNPJ = (value) => {
    // Remove tudo que não é número
    const cleaned = value.replace(/\D/g, '');

    // Limita a 14 números
    const truncated = cleaned.slice(0, 14);

    // Formata no padrão XX.XXX.XXX/XXXX-XX
    if (truncated.length <= 2) {
      return truncated;
    } else if (truncated.length <= 5) {
      return `${truncated.slice(0, 2)}.${truncated.slice(2)}`;
    } else if (truncated.length <= 8) {
      return `${truncated.slice(0, 2)}.${truncated.slice(2, 5)}.${truncated.slice(5)}`;
    } else if (truncated.length <= 12) {
      return `${truncated.slice(0, 2)}.${truncated.slice(2, 5)}.${truncated.slice(5, 8)}/${truncated.slice(8)}`;
    } else {
      return `${truncated.slice(0, 2)}.${truncated.slice(2, 5)}.${truncated.slice(5, 8)}/${truncated.slice(8, 12)}-${truncated.slice(12)}`;
    }
  };

  const formatPhone = (value) => {
    // Remove tudo que não é número
    const cleaned = value.replace(/\D/g, '');

    // Limita a 11 números
    const truncated = cleaned.slice(0, 11);

    // Se tem 11 dígitos, é celular: (XX) 9 XXXX-XXXX
    // Se tem 10 dígitos, é fixo: (XX) XXXX-XXXX
    if (truncated.length <= 2) {
      return truncated;
    } else if (truncated.length <= 7) {
      return `(${truncated.slice(0, 2)}) ${truncated.slice(2)}`;
    } else if (truncated.length === 10) {
      return `(${truncated.slice(0, 2)}) ${truncated.slice(2, 6)}-${truncated.slice(6)}`;
    } else if (truncated.length === 11) {
      return `(${truncated.slice(0, 2)}) ${truncated.slice(2, 3)} ${truncated.slice(3, 7)}-${truncated.slice(7)}`;
    }

    return truncated;
  };

  useEffect(() => {
    loadClinicas();
  }, []);

  const loadClinicas = async () => {
    try {
      const { data } = await supabase
        .from('clinics')
        .select('id, name')
        .eq('status', 'active')
        .eq('clinic_type', 'matriz')
        .order('name', { ascending: true });

      setClinicas(data || []);
    } catch (error) {
      console.error('Erro ao carregar clínicas:', error);
    }
  };

  // Gerar slug automático
  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  };

  // Gerar código único da clínica (ex: GESCL-A1B2-C3D4)
  const generateClinicCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const part1 = 'GESCL';
    const part2 = Array.from(
      { length: 4 },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join('');
    const part3 = Array.from(
      { length: 4 },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join('');
    return `${part1}-${part2}-${part3}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      // Validar campos obrigatórios
      if (!form.name.trim()) {
        setError('Nome da clínica é obrigatório');
        setLoading(false);
        return;
      }

      if (!form.fantasy_name.trim()) {
        setError('Nome fantasia é obrigatório');
        setLoading(false);
        return;
      }

      if (!form.cnpj.trim()) {
        setError('CNPJ é obrigatório');
        setLoading(false);
        return;
      }

      if (!form.email.trim()) {
        setError('E-mail é obrigatório');
        setLoading(false);
        return;
      }

      if (!form.city.trim()) {
        setError('Cidade é obrigatória');
        setLoading(false);
        return;
      }

      if (form.clinic_type === 'filial' && !form.parent_clinic_id) {
        setError('Selecione a clínica matriz');
        setLoading(false);
        return;
      }

      // Limpar CNPJ para validação e salvamento
      const cnpjClean = form.cnpj.replace(/\D/g, '');

      // Verificar se email já existe
      const { data: existingClinic } = await supabase
        .from('clinics')
        .select('id')
        .eq('email', form.email)
        .maybeSingle();

      if (existingClinic) {
        setError('Este e-mail já está cadastrado');
        setLoading(false);
        return;
      }

      // Verificar se CNPJ já existe
      const { data: existingCNPJ } = await supabase
        .from('clinics')
        .select('id')
        .eq('cnpj', cnpjClean)
        .maybeSingle();

      if (existingCNPJ) {
        setError('Este CNPJ já está cadastrado');
        setLoading(false);
        return;
      }

      // Gerar slug automático
      const slug = generateSlug(form.name);

      // Gerar código único da clínica
      let clinicCode = generateClinicCode();
      let isUnique = false;
      let attempts = 0;

      // Garantir que o código seja único (máx 10 tentativas)
      while (!isUnique && attempts < 10) {
        const { data: existingCode } = await supabase
          .from('clinics')
          .select('id')
          .eq('clinic_code', clinicCode)
          .maybeSingle();

        if (!existingCode) {
          isUnique = true;
        } else {
          clinicCode = generateClinicCode();
          attempts++;
        }
      }

      if (!isUnique) {
        setError('Erro ao gerar código da clínica. Tente novamente.');
        setLoading(false);
        return;
      }

      // Remover pontuação do telefone para salvar
      const phoneClean = form.phone.replace(/\D/g, '');

      // Inserir nova clínica
      const { data, error: insertError } = await supabase
        .from('clinics')
        .insert([
          {
            name: form.name,
            fantasy_name: form.fantasy_name,
            cnpj: cnpjClean,
            email: form.email,
            phone: phoneClean,
            address: form.address,
            city: form.city,
            state: form.state,
            zipcode: form.zipcode,
            clinic_code: clinicCode,
            clinic_type: form.clinic_type,
            parent_clinic_id: form.parent_clinic_id || null,
            status: form.status,
            slug: slug,
            timezone: form.timezone,
            locale: form.locale,
            settings: form.settings,
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      if (insertError) {
        throw insertError;
      }

      setMessage(`✓ Clínica ${form.name} criada com sucesso!`);

      // Redirecionar após 2 segundos
      setTimeout(() => {
        navigate('/clinica/administracao/clinicas');
      }, 2000);
    } catch (err) {
      console.error('Erro ao criar clínica:', err);
      setError(err.message || 'Erro ao criar clínica');
    }

    setLoading(false);
  };

  const inputClassName =
    'w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[hsl(var(--primary))] focus:ring-4 focus:ring-[hsl(var(--primary))]/10';
  const iconInputClassName =
    'w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[hsl(var(--primary))] focus:ring-4 focus:ring-[hsl(var(--primary))]/10';
  const selectedParentClinic = clinicas.find((clinic) => clinic.id === form.parent_clinic_id);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <Helmet>
        <title>Nova Clínica - Gesclinic</title>
        <meta name="description" content="Criar uma nova clínica." />
      </Helmet>

      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-white to-slate-50 p-6 shadow-sm md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/clinica/administracao/clinicas')}
            className="mt-1 rounded-2xl border border-slate-200 bg-white p-3 text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="space-y-2">
            <span className="inline-flex items-center rounded-full bg-[hsl(var(--primary))]/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[hsl(var(--primary))]">
              Administração
            </span>
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-slate-950">Nova Clínica</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Cadastre a unidade com identidade fiscal, localização e vínculo estrutural em um
                fluxo mais claro para revisão.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 md:w-[360px]">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Matrizes</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{clinicas.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tipo</p>
            <p className="mt-2 text-lg font-bold text-slate-900">
              {form.clinic_type === 'filial' ? 'Filial' : 'Matriz'}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p>
            <p className="mt-2 text-lg font-bold text-slate-900">
              {form.status === 'active'
                ? 'Ativa'
                : form.status === 'inactive'
                  ? 'Inativa'
                  : 'Suspensa'}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
            <p>{error}</p>
          </div>
        </div>
      )}

      {message && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 shadow-sm">
          <div className="flex items-start gap-3">
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
                  <Building2 className="h-6 w-6" />
                </span>
                Identidade da Clínica
              </CardTitle>
              <CardDescription>
                Dados principais para identificação jurídica e operacional da unidade.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 p-6">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-semibold text-slate-700">Nome da Clínica *</label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    className={inputClassName}
                    placeholder="Ex: Clínica Odontológica Silva LTDA"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-semibold text-slate-700">Nome Fantasia *</label>
                  <input
                    type="text"
                    name="fantasy_name"
                    value={form.fantasy_name}
                    onChange={handleChange}
                    className={inputClassName}
                    placeholder="Ex: Clínica Silva"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">CNPJ *</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                    <input
                      type="text"
                      name="cnpj"
                      value={form.cnpj}
                      onChange={handleChange}
                      className={iconInputClassName}
                      placeholder="12.345.678/0001-90"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">E-mail *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      className={iconInputClassName}
                      placeholder="contato@clinica.com.br"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Telefone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                    <input
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      className={iconInputClassName}
                      placeholder="(11) 98765-4321"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-3xl border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50/80">
              <CardTitle className="flex items-center gap-3 text-3xl text-slate-950">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]">
                  <MapPin className="h-6 w-6" />
                </span>
                Localização e Estrutura
              </CardTitle>
              <CardDescription>
                Defina onde a clínica opera e como ela se encaixa na estrutura matriz/filial.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 p-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Endereço</label>
                <input
                  type="text"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  className={inputClassName}
                  placeholder="Rua exemplo, 123"
                />
              </div>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Cidade *</label>
                  <input
                    type="text"
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    className={inputClassName}
                    placeholder="São Paulo"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Estado</label>
                  <input
                    type="text"
                    name="state"
                    value={form.state}
                    onChange={handleChange}
                    maxLength="2"
                    className={inputClassName}
                    placeholder="SP"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">CEP</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                    <input
                      type="text"
                      name="zipcode"
                      value={form.zipcode}
                      onChange={handleChange}
                      className={iconInputClassName}
                      placeholder="01310-100"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Tipo de Clínica *</label>
                  <select
                    name="clinic_type"
                    value={form.clinic_type}
                    onChange={handleChange}
                    className={inputClassName}
                  >
                    <option value="matriz">Matriz</option>
                    <option value="filial">Filial</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Status</label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    className={inputClassName}
                  >
                    <option value="active">Ativa</option>
                    <option value="inactive">Inativa</option>
                    <option value="suspended">Suspensa</option>
                  </select>
                </div>
              </div>

              {form.clinic_type === 'filial' && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Clínica Matriz *</label>
                  <select
                    name="parent_clinic_id"
                    value={form.parent_clinic_id || ''}
                    onChange={handleChange}
                    className={inputClassName}
                  >
                    <option value="">Selecione a clínica matriz...</option>
                    {clinicas.map((clinic) => (
                      <option key={clinic.id} value={clinic.id}>
                        {clinic.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 xl:sticky xl:top-6">
          <Card className="rounded-3xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl text-slate-950">Resumo do Cadastro</CardTitle>
              <CardDescription>Revise a configuração antes de criar a clínica.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Clínica
                </p>
                <p className="mt-2 font-semibold text-slate-900">
                  {form.fantasy_name || form.name || 'Nome não preenchido'}
                </p>
                <p className="mt-1 text-sm text-slate-600">{form.email || 'Email não informado'}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Estrutura
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {form.clinic_type === 'filial' ? 'Filial' : 'Matriz'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {selectedParentClinic?.name || 'Sem matriz vinculada'}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Localização
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {form.city || 'Cidade não informada'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{form.state || 'UF não informada'}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">Checklist rápido</p>
                <p className="mt-2">1. Validar CNPJ e e-mail.</p>
                <p>2. Confirmar tipo da unidade.</p>
                <p>3. Revisar status inicial.</p>
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
                    Criando...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    Criar Clínica
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate('/clinica/administracao/clinicas')}
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
