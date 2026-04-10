
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { CheckCircle, BarChart, Users, Calendar, Bot } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

const FeatureCard = ({ icon, title, description }) => (
  <div className="flex flex-col items-center text-center p-6 bg-card rounded-xl shadow-sm hover:shadow-lg transition-shadow duration-300">
    <div className="p-3 bg-primary/10 rounded-full mb-4">
      {React.cloneElement(icon, { className: "h-8 w-8 text-primary" })}
    </div>
    <h3 className="text-lg font-semibold mb-2 text-card-foreground">{title}</h3>
    <p className="text-muted-foreground text-sm">{description}</p>
  </div>
);

const Home = () => {
  const [billingCycle, setBillingCycle] = useState('monthly');

  return (
    <div className="bg-background text-foreground">
      <Helmet>
        <title>Gesclinic Web - Gestão Inteligente para Clínicas</title>
        <meta name="description" content="Otimize a gestão da sua clínica com agenda, prontuário eletrônico, faturamento TISS e mais. Comece gratuitamente." />
      </Helmet>
      
      {/* Hero Section */}
      <section className="py-20 md:py-32 text-center bg-secondary">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter mb-4">
              Gestão Inteligente para Clínicas que <span className="text-primary">Evoluem</span>.
            </h1>
            <p className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground mb-8">
              Tecnologia, controle e performance em um só sistema. Agenda, prontuário eletrônico, faturamento TISS e muito mais.
            </p>
            <div className="flex justify-center gap-4">
              <Link to="/register">
                <Button size="lg" className="text-lg px-8 py-6">Comece Grátis</Button>
              </Link>
              <a href="#features">
                <Button size="lg" variant="outline" className="text-lg px-8 py-6">Ver Recursos</Button>
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Tudo que sua clínica precisa.</h2>
          <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-12">
            Ferramentas poderosas e intuitivas para simplificar o dia a dia e impulsionar o crescimento do seu negócio.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard icon={<Calendar />} title="Agenda Inteligente" description="Gerencie múltiplos profissionais, salas e convênios com uma interface visual e fácil de usar." />
            <FeatureCard icon={<Users />} title="Prontuário Eletrônico" description="Acesse o histórico completo do paciente, evoluções, exames e documentos em um só lugar." />
            <FeatureCard icon={<BarChart />} title="Faturamento TISS" description="Gere lotes XML, controle guias, e gerencie glosas de forma eficiente e automatizada." />
            <FeatureCard icon={<Bot />} title="Inteligência Artificial" description="Receba insights e previsões para otimizar a gestão e tomar decisões baseadas em dados." />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 md:py-28 bg-secondary">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Escolha o plano ideal</h2>
          <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-12">
            Planos simples e transparentes.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="flex justify-center gap-2 mb-8">
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

          {/* Plans Grid */}
          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {/* Plano Básico */}
            <div className="rounded-lg p-8 bg-white border border-gray-200 shadow-lg hover:shadow-xl transition-all">
              <div className="mb-4">
                <span className="bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                  ✨ PERFEITO PARA INICIAR
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">Plano Básico</h3>
              <p className="text-gray-600 text-sm mb-6 h-10">
                Agenda Essencial — Para clínicas que estão começando
              </p>

              <div className="mb-6">
                <div className="flex items-baseline mb-2">
                  <span className="text-4xl font-bold text-gray-900">
                    R$ {billingCycle === 'monthly' ? '99.00' : '990.00'}
                  </span>
                  <span className="text-gray-600 ml-2 text-lg">
                    /{billingCycle === 'monthly' ? 'mês' : 'ano'}
                  </span>
                </div>
                {billingCycle === 'annual' && (
                  <p className="text-sm text-gray-500">R$ 82.50/mês</p>
                )}
              </div>

              <div className="border-t border-gray-200 pt-6 mb-6">
                <ul className="space-y-3">
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
                </ul>
              </div>

              <Link to="/checkout" className="block">
                <button className="w-full py-3 px-4 rounded-lg font-semibold transition duration-200 transform hover:scale-105 bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg hover:shadow-xl">
                  Começar agora
                </button>
              </Link>

              <p className="text-xs text-gray-500 mt-4 text-center">
                ✔ Sem fidelidade • ✔ Cancele quando quiser
              </p>
            </div>

            {/* Plano Profissional */}
            <div className="rounded-lg p-8 bg-blue-50 border-2 border-blue-600 shadow-xl scale-105 transition-all">
              <div className="mb-4">
                <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                  ⭐ MAIS ESCOLHIDO
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">Plano Profissional</h3>
              <p className="text-gray-600 text-sm mb-6 h-10">
                Gestão Completa — Para clínicas que querem controle e lucro
              </p>

              <div className="mb-6">
                <div className="flex items-baseline mb-2">
                  <span className="text-4xl font-bold text-gray-900">
                    R$ {billingCycle === 'monthly' ? '249.00' : '2490.00'}
                  </span>
                  <span className="text-gray-600 ml-2 text-lg">
                    /{billingCycle === 'monthly' ? 'mês' : 'ano'}
                  </span>
                </div>
                {billingCycle === 'annual' && (
                  <p className="text-sm text-gray-500">R$ 207.50/mês</p>
                )}
              </div>

              <div className="border-t border-gray-200 pt-6 mb-6">
                <ul className="space-y-3">
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
                </ul>
              </div>

              <Link to="/checkout" className="block">
                <button className="w-full py-3 px-4 rounded-lg font-semibold transition duration-200 transform hover:scale-105 bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg hover:shadow-xl">
                  Começar agora
                </button>
              </Link>

              <p className="text-xs text-gray-500 mt-4 text-center">
                ✔ Sem fidelidade • ✔ Cancele quando quiser
              </p>
            </div>

            {/* Plano Enterprise */}
            <div className="rounded-lg p-8 bg-white border border-gray-200 shadow-lg hover:shadow-xl transition-all">
              <div className="mb-4">
                <span className="bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                  🚀 PARA GRANDES REDES
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">Plano Enterprise</h3>
              <p className="text-gray-600 text-sm mb-6 h-10">
                Escalas & Performance — para redes, grupos e operações complexas
              </p>

              <div className="mb-6">
                <div className="flex items-baseline mb-2">
                  <span className="text-4xl font-bold text-gray-900">
                    R$ {billingCycle === 'monthly' ? '489.00' : '4890.00'}
                  </span>
                  <span className="text-gray-600 ml-2 text-lg">
                    /{billingCycle === 'monthly' ? 'mês' : 'ano'}
                  </span>
                </div>
                {billingCycle === 'annual' && (
                  <p className="text-sm text-gray-500">R$ 407.50/mês</p>
                )}
              </div>

              <div className="border-t border-gray-200 pt-6 mb-6">
                <ul className="space-y-3">
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
                </ul>
              </div>

              <Link to="/checkout" className="block">
                <button className="w-full py-3 px-4 rounded-lg font-semibold transition duration-200 transform hover:scale-105 bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg hover:shadow-xl">
                  Contratar agora
                </button>
              </Link>

              <p className="text-xs text-gray-500 mt-4 text-center">
                ✔ Sem fidelidade • ✔ Cancele quando quiser
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 md:py-28">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Pronto para transformar sua clínica?</h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8">
            Fale com um de nossos especialistas e descubra como a Gesclinic Web pode ajudar seu negócio a crescer.
          </p>
          <Link to="/contato">
            <Button size="lg" className="text-lg px-8 py-6">Fale Conosco</Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
