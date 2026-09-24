import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';

export default function Checkout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [clinicName, setClinicName] = useState('');

  // Load plans on mount
  useEffect(() => {
    loadPlans();

    // Check if returning from successful payment
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      handlePaymentSuccess(sessionId);
    }

    // Pre-fill from URL params
    const urlPlanId = searchParams.get('planId');
    const urlClinicName = searchParams.get('clinicName');
    if (urlClinicName) {
      setClinicName(decodeURIComponent(urlClinicName));
    }
    if (urlPlanId) {
      // Set the selected plan after plans are loaded
      setTimeout(() => {
        const foundPlan = plans.find((p) => p.id === urlPlanId);
        if (foundPlan) {
          setSelectedPlan(foundPlan);
        }
      }, 500);
    }
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
      }

      setPlans(data);

      // Se veio de um registro, selecione o plano automaticamente
      const urlPlanId = searchParams.get('planId');
      if (urlPlanId && data.length > 0) {
        const foundPlan = data.find((p) => p.id === urlPlanId);
        if (foundPlan) {
          setSelectedPlan(foundPlan);
        }
      }
    } catch (error) {
      console.error('Error loading plans:', error);
      alert('Erro ao carregar planos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (sessionId) => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-stripe-session', {
        body: { session_id: sessionId },
      });
      if (error || !data?.paid) throw new Error('Pagamento ainda não confirmado.');
      navigate('/clinica/dashboard');
    } catch (error) {
      console.error('Error verifying payment:', error);
      alert('Pagamento em processamento. Consulte o status novamente em alguns instantes.');
    }
  };

  const handleCheckout = async (plan) => {
    if (!clinicName.trim()) {
      alert('Digite o nome da clínica');
      return;
    }

    setProcessing(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error('Entre na sua conta para continuar o pagamento.');
      const { data: result, error } = await supabase.functions.invoke('create-stripe-checkout', {
        body: { planId: plan.id, planSlug: plan.slug, billingCycle, clinicName },
      });
      if (error || !result?.checkout_url) throw new Error('Não foi possível iniciar o checkout.');
      // Redirecionar para Stripe - ao retornar, vai para payment-confirmation
      window.location.href = result.checkout_url;
    } catch (error) {
      console.error('ERRO:', error);
      alert('Erro: ' + error.message);
      setProcessing(false);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Escolha seu Plano</h1>
          <p className="text-xl text-gray-600">Comece sua jornada com Gesclinic</p>
        </div>

        {/* Clinic Name Input */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8 max-w-2xl mx-auto">
          <label className="block text-sm font-medium text-gray-700 mb-3">Nome da Clínica *</label>
          <input
            type="text"
            value={clinicName}
            onChange={(e) => setClinicName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Digite o nome de sua clínica"
          />
        </div>

        {/* Billing Cycle Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-lg shadow-md p-2 flex">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-md transition ${
                billingCycle === 'monthly'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-6 py-2 rounded-md transition ${
                billingCycle === 'annual'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Anual (20% OFF)
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {plans.map((plan) => {
            const price = billingCycle === 'monthly' ? plan.price_monthly : plan.price_annual;
            const isProfessional = plan.slug === 'professional';
            const isEnterprise = plan.slug === 'enterprise';

            return (
              <div
                key={plan.id}
                className={`rounded-lg p-8 transition-all ${
                  isProfessional
                    ? 'bg-blue-50 border-2 border-blue-600 shadow-xl scale-105'
                    : 'bg-white border border-gray-200 shadow-lg hover:shadow-xl'
                }`}
              >
                {/* Badge para mais escolhido */}
                {plan.slug === 'basic' && (
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
                <p className="text-gray-600 text-sm mb-6 h-10">{plan.description}</p>

                {/* Preço */}
                <div className="mb-6">
                  {price !== null && price !== undefined ? (
                    <>
                      <div className="flex items-baseline mb-2">
                        <span className="text-4xl font-bold text-gray-900">
                          R$ {typeof price === 'number' ? price.toFixed(2) : price}
                        </span>
                        <span className="text-gray-600 ml-2 text-lg">
                          /{billingCycle === 'monthly' ? 'mês' : 'ano'}
                        </span>
                      </div>
                      {billingCycle === 'annual' && price !== null && (
                        <p className="text-sm text-gray-500">R$ {(price / 12).toFixed(2)}/mês</p>
                      )}
                    </>
                  ) : (
                    <div className="text-lg font-semibold text-gray-900 mb-2">
                      Preço sob consulta
                    </div>
                  )}
                </div>

                {/* Features */}
                <div className="border-t border-gray-200 pt-6 mb-6">
                  <ul className="space-y-3">
                    {/* Features por plano */}
                    {plan.slug === 'basic' && (
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

                    {plan.slug === 'professional' && (
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

                    {plan.slug === 'enterprise' && (
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
                          <span className="text-sm text-gray-700">Integrações personalizadas</span>
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

                {/* Botão */}
                <button
                  onClick={() => {
                    handleCheckout(plan);
                  }}
                  disabled={processing}
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition duration-200 transform hover:scale-105 ${
                    isEnterprise
                      ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg hover:shadow-xl disabled:opacity-50 disabled:hover:scale-100'
                      : isProfessional
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg hover:shadow-xl disabled:opacity-50 disabled:hover:scale-100'
                        : 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg hover:shadow-xl disabled:opacity-50 disabled:hover:scale-100'
                  }`}
                >
                  {processing ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Processando...
                    </span>
                  ) : isEnterprise ? (
                    'Contratar agora'
                  ) : (
                    'Começar agora'
                  )}
                </button>

                {/* Microcopy */}
                <p className="text-xs text-gray-500 mt-4 text-center">
                  ✔ Sem fidelidade • ✔ Cancele quando quiser
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
