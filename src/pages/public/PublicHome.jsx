import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, Stethoscope, DollarSign, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PublicHome() {
  const [billingCycle, setBillingCycle] = useState('monthly');
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.2 } },
  };
  const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };

  return (
    <>
      <Helmet>
        <title>Gesclinic Web - Sistema Completo de Gestão para Clínicas</title>
        <meta
          name="description"
          content="Transforme a gestão da sua clínica com o Gesclinic Web. Agenda inteligente, prontuário eletrônico, faturamento TISS e controle financeiro em um só lugar."
        />
      </Helmet>
      <div className="min-h-screen flex flex-col bg-white font-sans">
        {/* Hero */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col md:flex-row items-center justify-between px-8 md:px-24 py-20 bg-gradient-to-r from-primary to-secondary text-white overflow-hidden"
        >
          <motion.div variants={itemVariants} className="max-w-xl space-y-6 text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              Transforme a gestão da sua clínica com o{" "}
              <span className="text-yellow-300">Gesclinic Web</span>
            </h1>
            <p className="text-lg text-white/90">
              Sistema completo de gestão em saúde — agenda inteligente, faturamento TISS, prontuário eletrônico e
              controle financeiro.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <Link to="/register">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-white text-primary font-semibold hover:bg-yellow-100 shadow-lg transform hover:scale-105 transition-transform duration-300"
                >
                  Comece Agora <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto border-white text-white hover:bg-white/20 hover:text-white"
                >
                  Acessar Conta
                </Button>
              </Link>
            </div>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="hidden md:block mt-10 md:mt-0"
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <img
              alt="Painel Gesclinic"
              className="rounded-2xl shadow-2xl w-[480px] object-cover ring-4 ring-white/20"
              src="https://images.unsplash.com/photo-1586448354773-30706da80a04"
            />
          </motion.div>
        </motion.section>

        {/* Benefícios */}
        <motion.section
          className="py-20 bg-gray-50"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={containerVariants}
        >
          <div className="text-center mb-12 px-4">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Tudo o que sua clínica precisa</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">Recursos integrados para gestão completa.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-10 max-w-6xl mx-auto px-6">
            <motion.div
              variants={itemVariants}
              className="p-8 bg-white shadow-lg rounded-xl text-center space-y-4 border-t-4 border-primary"
            >
              <CalendarDays className="mx-auto text-primary h-12 w-12 mb-4" />
              <h3 className="text-xl font-semibold">Agenda Inteligente</h3>
              <p className="text-gray-500">Confirmações automáticas e integração com prontuário e faturamento.</p>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="p-8 bg-white shadow-lg rounded-xl text-center space-y-4 border-t-4 border-primary"
            >
              <Stethoscope className="mx-auto text-primary h-12 w-12 mb-4" />
              <h3 className="text-xl font-semibold">Prontuário Completo</h3>
              <p className="text-gray-500">Registro clínico seguro, anexos de exames e histórico de atendimento.</p>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="p-8 bg-white shadow-lg rounded-xl text-center space-y-4 border-t-4 border-primary"
            >
              <DollarSign className="mx-auto text-primary h-12 w-12 mb-4" />
              <h3 className="text-xl font-semibold">Financeiro e Faturamento</h3>
              <p className="text-gray-500">Faturamento TISS, geração de XML ANS, repasse médico e contas.</p>
            </motion.div>
          </div>
        </motion.section>

        {/* Planos */}
        <motion.section
          className="py-24 bg-white"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={containerVariants}
        >
          <div className="text-center mb-12 px-4">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Escolha o plano ideal</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">Planos simples e transparentes.</p>
          </div>

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

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto px-6">
            {/* Plano Básico */}
            <motion.div
              variants={itemVariants}
              className="rounded-lg p-8 bg-white border border-gray-200 shadow-lg hover:shadow-xl transition-all"
            >
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

              <Link to="/register" className="block">
                <button className="w-full py-3 px-4 rounded-lg font-semibold transition duration-200 transform hover:scale-105 bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg hover:shadow-xl">
                  Começar agora
                </button>
              </Link>

              <p className="text-xs text-gray-500 mt-4 text-center">
                ✔ Sem fidelidade • ✔ Cancele quando quiser
              </p>
            </motion.div>

            {/* Plano Profissional */}
            <motion.div
              variants={itemVariants}
              className="rounded-lg p-8 bg-blue-50 border-2 border-blue-600 shadow-xl scale-105 transition-all"
            >
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

              <Link to="/register" className="block">
                <button className="w-full py-3 px-4 rounded-lg font-semibold transition duration-200 transform hover:scale-105 bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg hover:shadow-xl">
                  Começar agora
                </button>
              </Link>

              <p className="text-xs text-gray-500 mt-4 text-center">
                ✔ Sem fidelidade • ✔ Cancele quando quiser
              </p>
            </motion.div>

            {/* Plano Enterprise */}
            <motion.div
              variants={itemVariants}
              className="rounded-lg p-8 bg-white border border-gray-200 shadow-lg hover:shadow-xl transition-all"
            >
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

              <Link to="/register" className="block">
                <button className="w-full py-3 px-4 rounded-lg font-semibold transition duration-200 transform hover:scale-105 bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg hover:shadow-xl">
                  Contratar agora
                </button>
              </Link>

              <p className="text-xs text-gray-500 mt-4 text-center">
                ✔ Sem fidelidade • ✔ Cancele quando quiser
              </p>
            </motion.div>
          </div>
        </motion.section>

        {/* Rodapé */}
        <footer className="bg-gray-800 border-t py-8 text-center text-gray-400 text-sm">
          <p>© {new Date().getFullYear()} Gesclinic Web — Todos os direitos reservados.</p>
          <div className="mt-4">
            <Link to="/login" className="hover:text-white">
              Login
            </Link>
            <span className="mx-2">·</span>
            <Link to="/register" className="hover:text-white">
              Cadastro
            </Link>
          </div>
        </footer>
      </div>
    </>
  );
}