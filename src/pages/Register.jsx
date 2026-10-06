import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/hooks/useToast';
import logoGesclinic from '@/assets/logo_gesclinic_g.png';

const TERMS_VERSION = '2026-07-15';
const TERMS_URL = '/termos-de-uso';

const ENTERPRISE_PLAN = {
  name: 'Plano Enterprise',
  slug: 'enterprise',
  description: 'Escalas & Performance - para redes, grupos e operações complexas',
  price_monthly: 489,
  price_annual: 4890,
  max_users: 999,
  max_doctors: 999,
  max_patients: 999999,
  features: {
    agenda: true,
    financeiro: true,
    estoque: true,
    relatorios: true,
    custom_branding: true,
  },
  active: true,
};

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();

  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [formData, setFormData] = useState({
    clinicName: '',
    clinicCnpj: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    adminPasswordConfirm: '',
    agreeTerms: false,
  });

  useEffect(() => {
    const selectedPlanSlug = searchParams.get('plan');

    if (!selectedPlanSlug) {
      navigate('/#planos', { replace: true });
      return;
    }

    loadSelectedPlan(selectedPlanSlug);
  }, [navigate, searchParams]);

  const loadSelectedPlan = async (selectedPlanSlug) => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('active', true)
        .order('price_monthly', { ascending: true });

      if (error) {
        throw error;
      }

      const activePlans = [...data];
      const enterpriseIndex = activePlans.findIndex((plan) => plan.slug === 'enterprise');

      if (enterpriseIndex !== -1) {
        activePlans[enterpriseIndex] = { ...activePlans[enterpriseIndex], ...ENTERPRISE_PLAN };
      }

      const planFromUrl = activePlans.find((plan) => plan.slug === selectedPlanSlug);
      if (!planFromUrl) {
        navigate('/#planos', { replace: true });
        return;
      }

      setSelectedPlan(planFromUrl);
    } catch (error) {
      console.error('Error loading selected plan:', error);
      showToast('Erro ao carregar plano selecionado', 'error');
      navigate('/#planos', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.clinicName.trim()) {
      errors.clinicName = 'Nome da clínica é obrigatório';
    }

    if (!formData.clinicCnpj.trim()) {
      errors.clinicCnpj = 'CNPJ é obrigatório';
    }

    if (!formData.adminName.trim()) {
      errors.adminName = 'Nome completo é obrigatório';
    }

    if (!formData.adminEmail.trim() || !formData.adminEmail.includes('@')) {
      errors.adminEmail = 'Email válido é obrigatório';
    }

    if (formData.adminPassword.length < 12) {
      errors.adminPassword = 'Senha deve ter no mínimo 12 caracteres';
    }

    if (formData.adminPassword !== formData.adminPasswordConfirm) {
      errors.adminPasswordConfirm = 'Senhas não correspondem';
    }

    if (!formData.agreeTerms) {
      errors.agreeTerms = 'Você deve aceitar os termos de uso';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSignup = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!selectedPlan) {
      showToast('Selecione um plano', 'error');
      navigate('/#planos', { replace: true });
      return;
    }

    setSubmitting(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.adminEmail,
        password: formData.adminPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/complete-registration`,
          data: {
            pending_clinic_name: formData.clinicName.trim(),
            pending_clinic_cnpj: formData.clinicCnpj.trim(),
            pending_admin_name: formData.adminName.trim(),
            pending_plan_id: selectedPlan.id,
            pending_terms_accepted: true,
          },
        },
      });

      if (authError) {
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Erro ao criar usuário');
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const token = authData.session?.access_token;
      if (!token) {
        showToast('Confira seu e-mail para confirmar a conta e concluir o cadastro.', 'success');
        navigate('/complete-registration');
        return;
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/create-clinic-from-signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: authData.user.id,
          clinicName: formData.clinicName,
          clinicCnpj: formData.clinicCnpj,
          planId: selectedPlan.id,
          adminName: formData.adminName,
          adminEmail: formData.adminEmail,
          termsAccepted: true,
          termsVersion: TERMS_VERSION,
          termsUrl: TERMS_URL,
          termsAcceptedAt: new Date().toISOString(),
          userAgent: navigator.userAgent,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar clínica');
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.adminEmail,
        password: formData.adminPassword,
      });

      if (signInError) {
        throw signInError;
      }

      showToast('Clínica criada com sucesso! Redirecionando para pagamento...', 'success');
      navigate(
        `/checkout?planId=${selectedPlan.id}&clinicName=${encodeURIComponent(formData.clinicName)}`,
      );
    } catch (error) {
      console.error('Signup error:', error);
      showToast(error.message || 'Erro ao realizar cadastro', 'error');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
          <p>Carregando plano selecionado...</p>
        </div>
      </div>
    );
  }

  if (!selectedPlan) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-5 sm:py-8">
      <div className="mx-auto max-w-2xl rounded-xl bg-white p-6 shadow-xl ring-1 ring-blue-100 sm:p-8">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-md ring-1 ring-slate-200">
            <img src={logoGesclinic} alt="Gesclinic" className="h-10 w-10 object-contain" />
          </span>
          <p className="mb-1 text-sm font-bold text-cyan-800">Gesclinic Web</p>
          <h1 className="mb-1 text-2xl font-bold text-gray-900 sm:text-3xl">Criar Conta</h1>
          <p className="text-gray-600">
            Plano: <span className="font-semibold">{selectedPlan.name}</span>
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Nome da Clínica *</label>
            <input
              type="text"
              value={formData.clinicName}
              onChange={(event) => updateFormData('clinicName', event.target.value)}
              className={`h-11 w-full rounded-lg border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                formErrors.clinicName ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Ex: Clínica Vida"
            />
            {formErrors.clinicName && <p className="mt-1 text-sm text-red-500">{formErrors.clinicName}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">CNPJ *</label>
            <input
              type="text"
              value={formData.clinicCnpj}
              onChange={(event) => updateFormData('clinicCnpj', event.target.value)}
              className={`h-11 w-full rounded-lg border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                formErrors.clinicCnpj ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="00.000.000/0000-00"
            />
            {formErrors.clinicCnpj && <p className="mt-1 text-sm text-red-500">{formErrors.clinicCnpj}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Seu Nome Completo *</label>
            <input
              type="text"
              value={formData.adminName}
              onChange={(event) => updateFormData('adminName', event.target.value)}
              className={`h-11 w-full rounded-lg border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                formErrors.adminName ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="João da Silva"
            />
            {formErrors.adminName && <p className="mt-1 text-sm text-red-500">{formErrors.adminName}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Email *</label>
            <input
              type="email"
              value={formData.adminEmail}
              onChange={(event) => updateFormData('adminEmail', event.target.value)}
              className={`h-11 w-full rounded-lg border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                formErrors.adminEmail ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="seu@email.com"
            />
            {formErrors.adminEmail && <p className="mt-1 text-sm text-red-500">{formErrors.adminEmail}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Senha *</label>
            <input
              type="password"
              value={formData.adminPassword}
              onChange={(event) => updateFormData('adminPassword', event.target.value)}
              className={`h-11 w-full rounded-lg border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                formErrors.adminPassword ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Mínimo 12 caracteres"
            />
            {formErrors.adminPassword && <p className="mt-1 text-sm text-red-500">{formErrors.adminPassword}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Confirmar Senha *</label>
            <input
              type="password"
              value={formData.adminPasswordConfirm}
              onChange={(event) => updateFormData('adminPasswordConfirm', event.target.value)}
              className={`h-11 w-full rounded-lg border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                formErrors.adminPasswordConfirm ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Confirme sua senha"
            />
            {formErrors.adminPasswordConfirm && (
              <p className="mt-1 text-sm text-red-500">{formErrors.adminPasswordConfirm}</p>
            )}
          </div>
          </div>

          <div className="flex items-start">
            <input
              type="checkbox"
              checked={formData.agreeTerms}
              onChange={(event) => updateFormData('agreeTerms', event.target.checked)}
              className="mr-3 mt-1"
            />
            <label className="text-sm text-gray-600">
              Concordo com os{' '}
              <Link
                to={TERMS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                termos de uso
              </Link>
              <span className="text-red-500">*</span>
            </label>
          </div>
          {formErrors.agreeTerms && <p className="text-sm text-red-500">{formErrors.agreeTerms}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="h-11 w-full rounded-lg bg-blue-600 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Criando conta...' : 'Criar Conta'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/#planos')}
            className="w-full py-2 font-semibold text-blue-600 hover:underline"
          >
            Trocar plano
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Já tem uma conta?{' '}
            <button onClick={() => navigate('/login')} className="font-semibold text-blue-600 hover:underline">
              Faça login
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
