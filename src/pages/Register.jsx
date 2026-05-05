import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/hooks/useToast';

export default function Register() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Form state
  const [step, setStep] = useState('plans'); // 'plans' | 'form' | 'loading'
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form data
  const [formData, setFormData] = useState({
    clinicName: '',
    clinicCnpj: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    adminPasswordConfirm: '',
    agreeTerms: false,
  });

  const [formErrors, setFormErrors] = useState({});

  // Load plans on mount
  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('active', true)
        .order('price_monthly', { ascending: true });

      if (error) {
        throw error;
      }

      // Update or add Enterprise plan with correct pricing
      const enterpriseIndex = data.findIndex((p) => p.slug === 'enterprise');
      const enterprisePlan = {
        name: 'Plano Enterprise',
        slug: 'enterprise',
        description: 'Escalas & Performance — para redes, grupos e operações complexas',
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

      if (enterpriseIndex !== -1) {
        data[enterpriseIndex] = { ...data[enterpriseIndex], ...enterprisePlan };
      } else {
        data.push({
          id: 'enterprise-custom',
          ...enterprisePlan,
        });
      }

      setPlans(data);
    } catch (error) {
      showToast('Erro ao carregar planos', 'error');
      console.error('Error loading plans:', error);
    } finally {
      setLoading(false);
    }
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

    if (formData.adminPassword.length < 8) {
      errors.adminPassword = 'Senha deve ter no mínimo 8 caracteres';
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

  const handleSignup = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!selectedPlan) {
      showToast('Selecione um plano', 'error');
      return;
    }

    setStep('loading');

    try {
      // 1. Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.adminEmail,
        password: formData.adminPassword,
      });

      if (authError) {
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Erro ao criar usuário');
      }

      // 2. Chamar Supabase Edge Function para criar clínica e subscription
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const token = authData.session?.access_token;

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
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar clínica');
      }

      // 3. Login automático
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.adminEmail,
        password: formData.adminPassword,
      });

      if (signInError) {
        throw signInError;
      }

      showToast('Clínica criada com sucesso! Redirecionando para pagamento...', 'success');
      // Redirecionar para checkout com o plano selecionado
      navigate(
        `/checkout?planId=${selectedPlan.id}&clinicName=${encodeURIComponent(formData.clinicName)}`,
      );
    } catch (error) {
      console.error('Signup error:', error);
      showToast(error.message || 'Erro ao realizar cadastro', 'error');
      setStep('form');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando planos...</p>
        </div>
      </div>
    );
  }

  if (step === 'plans') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Escolha seu Plano</h1>
            <p className="text-xl text-gray-600">Selecione o melhor plano para sua clínica</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {plans.map((plan) => {
              const isProfessional = plan.slug === 'professional';
              const isEnterprise = plan.slug === 'enterprise';
              const isBasic = plan.slug === 'basic';

              return (
                <div
                  key={plan.id}
                  onClick={() => {
                    setSelectedPlan(plan);
                    setStep('form');
                  }}
                  className={`rounded-lg p-8 cursor-pointer transition-all ${
                    isProfessional
                      ? 'bg-blue-50 border-2 border-blue-600 shadow-xl scale-105'
                      : 'bg-white border border-gray-200 shadow-lg hover:shadow-xl'
                  }`}
                >
                  {/* Badge */}
                  {isBasic && (
                    <div className="mb-4">
                      <span className="bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                        ✨ PERFEITO PARA INICIAR
                      </span>
                    </div>
                  )}
                  {isProfessional && (
                    <div className="mb-4">
                      <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                        ⭐ MAIS ESCOLHIDO
                      </span>
                    </div>
                  )}
                  {isEnterprise && (
                    <div className="mb-4">
                      <span className="bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                        🚀 PARA GRANDES REDES
                      </span>
                    </div>
                  )}

                  <h3 className="text-2xl font-bold text-gray-900 mb-1">{plan.name}</h3>
                  <p className="text-gray-600 text-sm mb-6">{plan.description}</p>

                  <div className="mb-6">
                    {plan.price_monthly ? (
                      <>
                        <div className="flex items-baseline mb-2">
                          <span className="text-4xl font-bold text-gray-900">
                            R$ {parseFloat(plan.price_monthly).toFixed(2)}
                          </span>
                          <span className="text-gray-600 ml-2 text-lg">/mês</span>
                        </div>
                        <p className="text-sm text-gray-500">
                          ou R$ {parseFloat(plan.price_annual).toFixed(2)}/ano
                        </p>
                      </>
                    ) : (
                      <div className="text-lg font-semibold text-gray-900">Preço sob consulta</div>
                    )}
                  </div>

                  <div className="border-t border-gray-200 pt-6 mb-6">
                    <ul className="space-y-3">
                      {isBasic && (
                        <>
                          <li className="flex items-start">
                            <span className="text-green-500 mr-3 font-bold">✔</span>
                            <span className="text-sm text-gray-700">Até 2 médicos</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-green-500 mr-3 font-bold">✔</span>
                            <span className="text-sm text-gray-700">Até 2 usuários</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-green-500 mr-3 font-bold">✔</span>
                            <span className="text-sm text-gray-700">Agenda de atendimentos</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-green-500 mr-3 font-bold">✔</span>
                            <span className="text-sm text-gray-700">Cadastro de pacientes</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-green-500 mr-3 font-bold">✔</span>
                            <span className="text-sm text-gray-700">Histórico básico</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-green-500 mr-3 font-bold">✔</span>
                            <span className="text-sm text-gray-700">Suporte padrão</span>
                          </li>
                        </>
                      )}

                      {isProfessional && (
                        <>
                          <li className="flex items-start">
                            <span className="text-green-500 mr-3 font-bold">✔</span>
                            <span className="text-sm text-gray-700">Até 5 médicos</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-green-500 mr-3 font-bold">✔</span>
                            <span className="text-sm text-gray-700">Até 10 usuários</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-green-500 mr-3 font-bold">✔</span>
                            <span className="text-sm text-gray-700">Agenda inteligente</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-green-500 mr-3 font-bold">✔</span>
                            <span className="text-sm text-gray-700">Financeiro completo</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-green-500 mr-3 font-bold">✔</span>
                            <span className="text-sm text-gray-700">Contas a pagar e receber</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-green-500 mr-3 font-bold">✔</span>
                            <span className="text-sm text-gray-700">Fluxo de caixa</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-green-500 mr-3 font-bold">✔</span>
                            <span className="text-sm text-gray-700">Controle de estoque</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-green-500 mr-3 font-bold">✔</span>
                            <span className="text-sm text-gray-700">Relatórios gerenciais</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-green-500 mr-3 font-bold">✔</span>
                            <span className="text-sm text-gray-700">Branding personalizado</span>
                          </li>
                        </>
                      )}

                      {isEnterprise && (
                        <>
                          <li className="flex items-start">
                            <span className="text-green-500 mr-3 font-bold">✔</span>
                            <span className="text-sm text-gray-700">Médicos ilimitados</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-green-500 mr-3 font-bold">✔</span>
                            <span className="text-sm text-gray-700">Usuários ilimitados</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-green-500 mr-3 font-bold">✔</span>
                            <span className="text-sm text-gray-700">Multiunidades</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-green-500 mr-3 font-bold">✔</span>
                            <span className="text-sm text-gray-700">DRE por unidade</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-green-500 mr-3 font-bold">✔</span>
                            <span className="text-sm text-gray-700">Repasse médico avançado</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-green-500 mr-3 font-bold">✔</span>
                            <span className="text-sm text-gray-700">
                              Integrações personalizadas
                            </span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-green-500 mr-3 font-bold">✔</span>
                            <span className="text-sm text-gray-700">SLA e suporte dedicado</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-green-500 mr-3 font-bold">✔</span>
                            <span className="text-sm text-gray-700">Onboarding assistido</span>
                          </li>
                        </>
                      )}
                    </ul>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedPlan(plan);
                      setStep('form');
                    }}
                    className={`w-full py-3 px-4 rounded-lg font-semibold transition duration-200 transform hover:scale-105 ${
                      isEnterprise
                        ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg hover:shadow-xl'
                        : isProfessional
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg hover:shadow-xl'
                          : 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg hover:shadow-xl'
                    }`}
                  >
                    Escolher Plano
                  </button>

                  <p className="text-xs text-gray-500 mt-4 text-center">
                    ✔ Sem fidelidade • ✔ Cancele quando quiser
                  </p>
                </div>
              );
            })}
          </div>

          <div className="text-center">
            <p className="text-gray-600">
              Já tem uma conta?{' '}
              <button
                onClick={() => navigate('/login')}
                className="text-blue-600 font-semibold hover:underline"
              >
                Faça login
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'form') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Criar Conta</h1>
            <p className="text-gray-600">
              Plano: <span className="font-semibold">{selectedPlan?.name}</span>
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            {/* Clinic Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome da Clínica *
              </label>
              <input
                type="text"
                value={formData.clinicName}
                onChange={(e) => setFormData({ ...formData, clinicName: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  formErrors.clinicName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Ex: Clínica Vida"
              />
              {formErrors.clinicName && (
                <p className="text-red-500 text-sm mt-1">{formErrors.clinicName}</p>
              )}
            </div>

            {/* CNPJ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ *</label>
              <input
                type="text"
                value={formData.clinicCnpj}
                onChange={(e) => setFormData({ ...formData, clinicCnpj: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  formErrors.clinicCnpj ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="00.000.000/0000-00"
              />
              {formErrors.clinicCnpj && (
                <p className="text-red-500 text-sm mt-1">{formErrors.clinicCnpj}</p>
              )}
            </div>

            {/* Admin Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Seu Nome Completo *
              </label>
              <input
                type="text"
                value={formData.adminName}
                onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  formErrors.adminName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="João da Silva"
              />
              {formErrors.adminName && (
                <p className="text-red-500 text-sm mt-1">{formErrors.adminName}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                value={formData.adminEmail}
                onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  formErrors.adminEmail ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="seu@email.com"
              />
              {formErrors.adminEmail && (
                <p className="text-red-500 text-sm mt-1">{formErrors.adminEmail}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha *</label>
              <input
                type="password"
                value={formData.adminPassword}
                onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  formErrors.adminPassword ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Mínimo 8 caracteres"
              />
              {formErrors.adminPassword && (
                <p className="text-red-500 text-sm mt-1">{formErrors.adminPassword}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirmar Senha *
              </label>
              <input
                type="password"
                value={formData.adminPasswordConfirm}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    adminPasswordConfirm: e.target.value,
                  })
                }
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  formErrors.adminPasswordConfirm ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Confirme sua senha"
              />
              {formErrors.adminPasswordConfirm && (
                <p className="text-red-500 text-sm mt-1">{formErrors.adminPasswordConfirm}</p>
              )}
            </div>

            {/* Terms */}
            <div className="flex items-start">
              <input
                type="checkbox"
                checked={formData.agreeTerms}
                onChange={(e) => setFormData({ ...formData, agreeTerms: e.target.checked })}
                className="mt-1 mr-3"
              />
              <label className="text-sm text-gray-600">
                Concordo com os{' '}
                <button type="button" className="text-blue-600 hover:underline" onClick={() => {}}>
                  termos de uso
                </button>
                <span className="text-red-500">*</span>
              </label>
            </div>
            {formErrors.agreeTerms && (
              <p className="text-red-500 text-sm">{formErrors.agreeTerms}</p>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={step === 'loading'}
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 mt-6"
            >
              {step === 'loading' ? 'Criando conta...' : 'Criar Conta'}
            </button>

            <button
              type="button"
              onClick={() => setStep('plans')}
              className="w-full text-blue-600 py-2 font-semibold hover:underline"
            >
              Voltar para planos
            </button>
          </form>

          <div className="text-center mt-6">
            <p className="text-gray-600">
              Já tem uma conta?{' '}
              <button
                onClick={() => navigate('/login')}
                className="text-blue-600 font-semibold hover:underline"
              >
                Faça login
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
