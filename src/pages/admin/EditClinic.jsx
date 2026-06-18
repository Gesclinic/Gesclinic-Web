import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import TaxCalculatorComponent from '@/components/admin/TaxCalculatorComponent';
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
  DollarSign,
  Calculator,
  Landmark,
  Hospital,
  Award,
  Image,
  Upload,
  Trash2,
} from 'lucide-react';
import { useClinicContext } from '@/contexts/ClinicContext';
import { replaceClinicLogo, getClinicLogoPublicURL } from '@/lib/clinicBrandingStorage';

export default function EditClinic() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { clinic, setClinic } = useClinicContext();
  const logoInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [clinicas, setClinicas] = useState([]);
  const [logoPreview, setLogoPreview] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [removeLogo, setRemoveLogo] = useState(false);

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
    clinic_code: '',
    clinic_type: 'matriz',
    parent_clinic_id: null,
    status: 'active',
    slug: '',
    timezone: 'America/Sao_Paulo',
    locale: 'pt-BR',
    settings: {},
    logo_url: '',
    // Campos de Regime Tributário
    tax_regime: 'simples_nacional', // simples_nacional, lucro_presumido, lucro_real
    municipal_registration: '',
    cnae_code: '',
    iss_rate: 3.0,
    rps_series: 'A',
    rps_number_next: 1,
    // Campos de Equiparação Hospitalar
    has_hospital_equivalence: false,
    hospital_equivalence_certified_at: null,
    hospital_equivalence_certificate_number: '',
    // Lucro Real
    estimated_annual_profit: null,
    estimated_profit_margin: 20.0,
  });

  useEffect(() => {
    loadClinica();
    loadClinicas();
  }, [id]);

  const loadClinica = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: fetchError } = await supabase
        .from('clinics')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      if (!data) {
        throw new Error('Clínica não encontrada');
      }

      setForm({
        name: data.name || '',
        fantasy_name: data.fantasy_name || '',
        cnpj: formatCNPJ(data.cnpj || ''),
        email: data.email || '',
        phone: formatPhone(data.phone || ''),
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        zipcode: data.zipcode || '',
        clinic_code: data.clinic_code || '',
        clinic_type: data.clinic_type || 'matriz',
        parent_clinic_id: data.parent_clinic_id || null,
        status: data.status || 'active',
        slug: data.slug || '',
        timezone: data.timezone || 'America/Sao_Paulo',
        locale: data.locale || 'pt-BR',
        settings: data.settings || {},
        logo_url: data.logo_url || '',
        // Campos de Regime Tributário
        tax_regime: data.tax_regime || 'simples_nacional',
        municipal_registration: data.municipal_registration || '',
        cnae_code: data.cnae_code || '',
        iss_rate: data.iss_rate ?? 3.0,
        rps_series: data.rps_series || 'A',
        rps_number_next: data.rps_number_next ?? 1,
        // Campos de Equiparação Hospitalar
        has_hospital_equivalence: data.has_hospital_equivalence || false,
        hospital_equivalence_certified_at: data.hospital_equivalence_certified_at || null,
        hospital_equivalence_certificate_number:
          data.hospital_equivalence_certificate_number || '',
        // Lucro Real
        estimated_annual_profit: data.estimated_annual_profit ?? null,
        estimated_profit_margin: data.estimated_profit_margin ?? 20.0,
      });

      setLogoPreview(data.logo_url ? getClinicLogoPublicURL(data.logo_url) : '');
      setLogoFile(null);
      setRemoveLogo(false);
    } catch (err) {
      console.error('❌ Erro ao carregar clínica:', err);
      setError(err.message || 'Erro ao carregar dados da clínica');
    } finally {
      setLoading(false);
    }
  };

  const loadClinicas = async () => {
    try {
      const { data } = await supabase
        .from('clinics')
        .select('id, name')
        .eq('status', 'active')
        .eq('clinic_type', 'matriz')
        .neq('id', id)
        .order('name', { ascending: true });

      setClinicas(data || []);
    } catch (error) {
      console.error('Erro ao carregar clínicas:', error);
    }
  };

  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  };

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

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type?.startsWith('image/')) {
      setError('Envie uma imagem válida para a logo.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('A logo deve ter no máximo 5 MB.');
      return;
    }

    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setRemoveLogo(false);
    setError('');
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview('');
    setRemoveLogo(true);
    if (logoInputRef.current) {
      logoInputRef.current.value = '';
    }
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

  const withTimeout = async (promise, timeoutMs, timeoutMessage) => {
    let timeoutId;
    try {
      return await Promise.race([
        promise,
        new Promise((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error(timeoutMessage));
          }, timeoutMs);
        }),
      ]);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);

    try {
      // Validar campos obrigatórios
      if (!form.name.trim()) {
        throw new Error('Nome da clínica é obrigatório');
      }

      if (!form.fantasy_name.trim()) {
        throw new Error('Nome fantasia é obrigatório');
      }

      if (!form.cnpj.trim()) {
        throw new Error('CNPJ é obrigatório');
      }

      if (!form.email.trim()) {
        throw new Error('E-mail é obrigatório');
      }

      if (!form.city.trim()) {
        throw new Error('Cidade é obrigatória');
      }

      if (form.clinic_type === 'filial' && !form.parent_clinic_id) {
        throw new Error('Selecione a clínica matriz');
      }

      // Limpar CNPJ para validação e salvamento
      const cnpjClean = form.cnpj.replace(/\D/g, '');

      // Verificar se email já existe (excluindo a clínica atual)
      const { data: existingEmail } = await supabase
        .from('clinics')
        .select('id')
        .eq('email', form.email)
        .neq('id', id)
        .maybeSingle();

      if (existingEmail) {
        throw new Error('Este e-mail já está cadastrado');
      }

      // Verificar se CNPJ já existe (excluindo a clínica atual)
      const { data: existingCNPJ } = await supabase
        .from('clinics')
        .select('id')
        .eq('cnpj', cnpjClean)
        .neq('id', id)
        .maybeSingle();

      if (existingCNPJ) {
        throw new Error('Este CNPJ já está cadastrado');
      }

      // Gerar slug automático
      const slug = generateSlug(form.name);

      // Remover pontuação do telefone para salvar
      const phoneClean = form.phone.replace(/\D/g, '');

      let finalLogoUrl = form.logo_url || null;

      // Tentar fazer upload de logo, mas não falhar se não conseguir
      if (logoFile) {
        try {
          const uploaded = await withTimeout(
            replaceClinicLogo({
              clinicId: id,
              newFile: logoFile,
              previousPathOrUrl: form.logo_url || null,
            }),
            15000,
            'Tempo limite ao enviar logo. Tente novamente.',
          );
          finalLogoUrl = uploaded.publicUrl || uploaded.path || null;
          console.log('✅ Logo upload bem-sucedido:', finalLogoUrl);
        } catch (logoErr) {
          console.warn('⚠️ Erro ao fazer upload da logo (continuando com salvamento):', logoErr);
          // Não falhar a operação inteira por causa do logo
          // Manter o logo anterior se falhar no novo upload
          finalLogoUrl = form.logo_url || null;
        }
      } else if (removeLogo) {
        finalLogoUrl = null;
      }

      // Atualizar clínica
      const { data: updatedClinic, error: updateError } = await withTimeout(
        supabase
          .from('clinics')
          .update({
            name: form.name,
            fantasy_name: form.fantasy_name,
            cnpj: cnpjClean,
            email: form.email,
            phone: phoneClean,
            address: form.address,
            city: form.city,
            state: form.state,
            zipcode: form.zipcode,
            clinic_type: form.clinic_type,
            parent_clinic_id: form.parent_clinic_id || null,
            status: form.status,
            slug: slug,
            timezone: form.timezone,
            locale: form.locale,
            settings: form.settings,
            logo_url: finalLogoUrl,
            // Regime Tributário
            tax_regime: form.tax_regime,
            municipal_registration: form.municipal_registration,
            cnae_code: form.cnae_code,
            iss_rate: parseFloat(form.iss_rate) || 3.0,
            rps_series: form.rps_series,
            rps_number_next: parseInt(form.rps_number_next) || 1,
            // Equiparação Hospitalar
            has_hospital_equivalence: form.has_hospital_equivalence,
            hospital_equivalence_certified_at: form.hospital_equivalence_certified_at || null,
            hospital_equivalence_certificate_number:
              form.hospital_equivalence_certificate_number || '',
            // Lucro Real
            estimated_annual_profit: form.estimated_annual_profit
              ? parseFloat(form.estimated_annual_profit)
              : null,
            estimated_profit_margin: parseFloat(form.estimated_profit_margin) || 20.0,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select('*')
          .single(),
        20000,
        'Tempo limite ao salvar clínica. Verifique sua conexão e tente novamente.',
      );

      if (updateError) {
        throw updateError;
      }

      if (clinic?.id === id && setClinic && updatedClinic) {
        setClinic((current) =>
          current
            ? {
                ...current,
                id: updatedClinic.id,
                name: updatedClinic.name,
                brand_name: updatedClinic.fantasy_name,
                logo_url: updatedClinic.logo_url,
              }
            : current,
        );
      }

      localStorage.setItem(
        'gesclinic_clinic_data',
        JSON.stringify({
          ...(JSON.parse(localStorage.getItem('gesclinic_clinic_data') || '{}') || {}),
          name: updatedClinic?.name || form.name,
          brand_name: updatedClinic?.fantasy_name || form.fantasy_name,
          logo_url: updatedClinic?.logo_url ?? finalLogoUrl,
          updated_at: new Date().toISOString(),
        }),
      );

      setMessage(`✓ Clínica ${updatedClinic?.name || form.name} atualizada com sucesso!`);

      // Redirecionar após 2 segundos
      setTimeout(() => {
        navigate('/clinica/administracao/clinicas');
      }, 2000);
    } catch (err) {
      console.error('❌ Erro ao atualizar clínica:', err);
      setError(err.message || 'Erro ao atualizar clínica');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  const inputClassName =
    'w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[hsl(var(--primary))] focus:ring-4 focus:ring-[hsl(var(--primary))]/10';
  const iconInputClassName =
    'w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[hsl(var(--primary))] focus:ring-4 focus:ring-[hsl(var(--primary))]/10';
  const selectedParentClinic = clinicas.find((clinic) => clinic.id === form.parent_clinic_id);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <Helmet>
        <title>Editar Clínica - Gesclinic</title>
        <meta name="description" content="Editar dados da clínica." />
      </Helmet>

      <div className="flex flex-col gap-6 rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-50 p-8 shadow-sm md:flex-row md:items-center md:justify-between">
        <button
          onClick={() => navigate('/clinica/administracao/clinicas')}
          className="inline-flex items-center gap-2 w-fit rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>

        <div className="flex flex-1 flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[hsl(var(--primary))]/10 to-blue-100 px-4 py-1.5">
              <span className="h-2 w-2 rounded-full bg-[hsl(var(--primary))]" />
              <span className="text-xs font-semibold uppercase tracking-widest text-[hsl(var(--primary))]">
                Administração
              </span>
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-950">Editar Clínica</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Atualize dados cadastrais, estrutura operacional, regime fiscal e configuração de
                emissão de notas fiscais.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 md:w-auto">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Código</p>
            <p className="mt-1 text-sm font-bold text-slate-900">{form.clinic_code || 'Auto'}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tipo</p>
            <p className="mt-1 text-sm font-bold text-slate-900">
              {form.clinic_type === 'filial' ? 'Filial' : 'Matriz'}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p>
            <p className="mt-1 text-sm font-bold text-green-600">● Ativa</p>
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
                Atualize os dados fiscais, de contato e o código operacional da unidade.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 p-6">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="space-y-3 md:col-span-2">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-sm font-semibold text-slate-700">Logo da Clínica</label>
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      <Upload className="h-4 w-4" />
                      Anexar logo
                    </button>
                  </div>

                  <div className="flex items-center gap-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                      {logoPreview ? (
                        <img
                          src={logoPreview}
                          alt="Prévia da logo"
                          className="h-full w-full object-contain p-2"
                        />
                      ) : (
                        <Image className="h-6 w-6 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800">
                        {logoPreview ? 'Logo pronta para exibição' : 'Nenhuma logo anexada'}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Use uma imagem PNG, JPG, WEBP ou SVG. Ela aparecerá no topo do sistema.
                      </p>
                    </div>
                    {(logoPreview || form.logo_url) && (
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remover
                      </button>
                    )}
                  </div>

                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoChange}
                  />
                </div>

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
                  <label className="text-sm font-semibold text-slate-700">Código da Clínica</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                    <input
                      type="text"
                      value={form.clinic_code}
                      readOnly
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm text-slate-600"
                    />
                  </div>
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
                Gerencie endereço, tipo da unidade e hierarquia com a matriz.
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

          <Card className="overflow-hidden rounded-3xl border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50/80">
              <CardTitle className="flex items-center gap-3 text-3xl text-slate-950">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                  <Landmark className="h-6 w-6" />
                </span>
                Regime Tributário e Configuração Fiscal
              </CardTitle>
              <CardDescription>
                Defina o regime de tributação, inscrição municipal e configuração automática de RPS
                para emissão de notas fiscais.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 p-6">
              {/* Explicação rápida de regimes */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                  <p className="font-semibold text-blue-950">📊 Simples Nacional</p>
                  <p className="mt-1 text-xs text-blue-700">
                    Empresas com receita até R$ 4.8M/ano. Impostos unificados em uma alíquota única.
                  </p>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="font-semibold text-amber-950">📈 Lucro Presumido</p>
                  <p className="mt-1 text-xs text-amber-700">
                    Receita de 4.8M a 78M/ano. Impostos calculados sobre lucro presumido.
                  </p>
                </div>
                <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4">
                  <p className="font-semibold text-purple-950">🔢 Lucro Real</p>
                  <p className="mt-1 text-xs text-purple-700">
                    Empresas com receita acima de 78M/ano. Impostos sobre lucro real.
                  </p>
                </div>
              </div>

              {/* Formulário de regime tributário */}
              <div className="space-y-6 border-t border-slate-100 pt-6">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Regime Tributário *
                    </label>
                    <select
                      name="tax_regime"
                      value={form.tax_regime}
                      onChange={handleChange}
                      className={inputClassName}
                    >
                      <option value="simples_nacional">Simples Nacional</option>
                      <option value="lucro_presumido">Lucro Presumido</option>
                      <option value="lucro_real">Lucro Real</option>
                    </select>
                    <p className="mt-2 text-xs text-slate-500">
                      💡 Usado para cálculo automático de impostos nas notas fiscais emitidas.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Inscrição Municipal
                    </label>
                    <div className="relative">
                      <Landmark className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                      <input
                        type="text"
                        name="municipal_registration"
                        value={form.municipal_registration}
                        onChange={handleChange}
                        className={iconInputClassName}
                        placeholder="Ex: 12.345.678.901-23"
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      💡 Necessária para emissão de RPS e cálculo de ISS municipal.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Código CNAE</label>
                    <div className="relative">
                      <Calculator className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                      <input
                        type="text"
                        name="cnae_code"
                        value={form.cnae_code}
                        onChange={handleChange}
                        className={iconInputClassName}
                        placeholder="Ex: 8622-1/00"
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      💡 Classificação da atividade econômica (clínicas: 8622-1/00 ou 8649-1/99).
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Taxa ISS Municipal (%)
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                      <input
                        type="number"
                        name="iss_rate"
                        value={form.iss_rate}
                        onChange={handleChange}
                        step="0.01"
                        min="0"
                        max="100"
                        className={iconInputClassName}
                        placeholder="0.00"
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      💡 Alíquota ISS varia por município (em SP: 3% a 5% para serviços).
                    </p>
                  </div>
                </div>
              </div>

              {/* Configuração de RPS */}
              <div className="rounded-3xl border-2 border-emerald-200 bg-emerald-50 p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white font-bold">
                    RPS
                  </span>
                  <div>
                    <h3 className="font-bold text-emerald-950">
                      Configuração de RPS (Recibo de Prestação de Serviço)
                    </h3>
                    <p className="text-sm text-emerald-700">
                      Série e numeração para emissão automática de recibos que serão convertidos em
                      NF-e.
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-emerald-950">Série RPS *</label>
                    <input
                      type="text"
                      name="rps_series"
                      value={form.rps_series}
                      onChange={(e) => {
                        if (e.target.value.length <= 1) {
                          handleChange(e);
                        }
                      }}
                      maxLength="1"
                      className={inputClassName}
                      placeholder="A"
                    />
                    <p className="mt-2 text-xs text-emerald-700">
                      🔤 Usar letra única (A-Z). Ex: série A, série B, etc.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-emerald-950">
                      Próximo Número RPS *
                    </label>
                    <input
                      type="number"
                      name="rps_number_next"
                      value={form.rps_number_next}
                      onChange={handleChange}
                      min="1"
                      className={inputClassName}
                      placeholder="1"
                    />
                    <p className="mt-2 text-xs text-emerald-700">
                      🔢 Será incrementado automaticamente a cada NF emitida.
                    </p>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl bg-white p-4 border border-emerald-200">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                    📋 Exemplo de RPS que será gerado:
                  </p>
                  <p className="mt-3 font-mono text-lg font-bold text-emerald-900">
                    RPS {form.rps_series}
                    {String(form.rps_number_next).padStart(6, '0')} • {form.rps_series}
                    {String(form.rps_number_next + 1).padStart(6, '0')} • {form.rps_series}
                    {String(form.rps_number_next + 2).padStart(6, '0')}
                  </p>
                </div>
              </div>

              {/* Aviso importante */}
              <div className="rounded-2xl border-l-4 border-l-amber-500 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-900">⚠️ Importante</p>
                <ul className="mt-2 space-y-1 text-xs text-amber-800">
                  <li>• Verifique os dados com a Receita Federal e Prefeitura antes de salvar</li>
                  <li>• O regime tributário afeta o cálculo automático de impostos</li>
                  <li>• RPS e inscrição municipal são necessários para emissão de notas fiscais</li>
                  <li>• Alterações aqui se aplicam a todas as futuras notas fiscais</li>
                </ul>
              </div>

              {/* Equiparação Hospitalar */}
              <div className="border-t border-slate-100 pt-8">
                <div className="flex items-center gap-3 mb-6">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white">
                    <Hospital className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-bold text-slate-950">Equiparação Hospitalar</h3>
                    <p className="text-sm text-slate-600">
                      Clínicas com certificação hospitalar têm redução de base de cálculo (IRPJ: 32%
                      → 8%, CSLL: 32% → 12%).
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.has_hospital_equivalence}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            has_hospital_equivalence: e.target.checked,
                          }))
                        }
                        className="h-5 w-5 rounded border-slate-300 text-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/20"
                      />
                      <span className="text-sm font-semibold text-slate-900">
                        Esta clínica é equiparada a hospital
                      </span>
                    </label>
                    <p className="text-xs text-slate-500 ml-7">
                      Marque se a clínica possui certificação de equiparação hospitalar.
                    </p>
                  </div>
                </div>

                {form.has_hospital_equivalence && (
                  <div className="mt-6 rounded-2xl border-2 border-emerald-200 bg-emerald-50/50 p-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-900">
                          Data de Certificação
                        </label>
                        <input
                          type="date"
                          name="hospital_equivalence_certified_at"
                          value={form.hospital_equivalence_certified_at?.split('T')[0] || ''}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              hospital_equivalence_certified_at: e.target.value
                                ? new Date(e.target.value).toISOString()
                                : null,
                            }))
                          }
                          className={inputClassName}
                        />
                        <p className="text-xs text-slate-500">
                          Data do certificado de equiparação.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-900">
                          Número do Certificado
                        </label>
                        <div className="relative">
                          <Award className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                          <input
                            type="text"
                            name="hospital_equivalence_certificate_number"
                            value={form.hospital_equivalence_certificate_number}
                            onChange={handleChange}
                            className={iconInputClassName}
                            placeholder="Ex: CERT-2026-001"
                          />
                        </div>
                        <p className="text-xs text-slate-500">Referência do certificado emissor.</p>
                      </div>
                    </div>

                    <div className="mt-6 rounded-2xl bg-white p-4 border border-emerald-200">
                      <p className="text-xs font-semibold text-emerald-700 mb-3">
                        ✨ Redução de Base de Cálculo
                      </p>
                      <div className="grid gap-2 text-sm">
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                          <span className="text-emerald-900">
                            <strong>IRPJ Reduzido:</strong> Base 32% → 8% (redução de 75% em
                            impostos)
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                          <span className="text-emerald-900">
                            <strong>CSLL Reduzido:</strong> Base 32% → 12% (redução de 62,5%)
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                          <span className="text-emerald-900">
                            <strong>Redução Total:</strong> Carga tributária reduz de 14,33% para
                            8,93%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Calculador de Tributos */}
          <Card className="overflow-hidden rounded-3xl border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50/80">
              <CardTitle className="flex items-center gap-3 text-lg text-slate-950">
                <Calculator className="h-5 w-5" />
                Simulador de Tributos
              </CardTitle>
              <CardDescription>
                Veja como os tributos são calculados no regime atual.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <TaxCalculatorComponent clinicConfig={form} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 xl:sticky xl:top-6">
          <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-[hsl(var(--primary))]/5 to-blue-50">
              <CardTitle className="text-xl text-slate-950">Resumo da Edição</CardTitle>
              <CardDescription>
                Verifique as informações principais antes de salvar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-white border border-slate-100 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Clínica
                </p>
                <p className="mt-2 text-lg font-bold text-slate-900">
                  {form.fantasy_name || form.name || '—'}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  {form.email || 'Email não preenchido'}
                </p>
              </div>

              <div className="grid gap-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 hover:border-[hsl(var(--primary))]/30 transition">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Estrutura
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {form.clinic_type === 'filial' ? '📍 Filial' : '🏢 Matriz'}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    {selectedParentClinic?.name || 'Sem matriz vinculada'}
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 hover:border-emerald-300 transition">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                    Regime Tributário
                  </p>
                  <p className="mt-2 text-sm font-semibold text-emerald-900">
                    {form.tax_regime === 'simples_nacional'
                      ? '📊 Simples Nacional'
                      : form.tax_regime === 'lucro_presumido'
                        ? '📈 Lucro Presumido'
                        : '🔢 Lucro Real'}
                  </p>
                  <p className="mt-1 text-xs text-emerald-700">
                    RPS: {form.rps_series}
                    {String(form.rps_number_next).padStart(6, '0')}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 hover:border-[hsl(var(--primary))]/30 transition">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Código
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {form.clinic_code || 'Sem código'}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">Status: Ativa</p>
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
                <p className="text-xs font-semibold text-amber-900">⚡ Checklist</p>
                <ul className="mt-2 space-y-1 text-xs text-amber-800">
                  <li>✓ Dados fiscais atualizados</li>
                  <li>✓ Status da unidade confirmado</li>
                  <li>✓ Regime tributário selecionado</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden">
            <CardContent className="space-y-3 p-6">
              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[hsl(var(--primary))] to-blue-600 px-4 py-4 font-semibold text-white shadow-lg shadow-[hsl(var(--primary))]/30 transition hover:shadow-xl hover:shadow-[hsl(var(--primary))]/40 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    Salvar Alterações
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate('/clinica/administracao/clinicas')}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 font-medium text-slate-700 transition hover:bg-slate-50 hover:border-slate-300"
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
