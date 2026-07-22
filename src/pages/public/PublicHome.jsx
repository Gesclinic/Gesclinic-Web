import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  ClipboardCheck,
  CreditCard,
  FileText,
  LayoutDashboard,
  ShieldCheck,
  Stethoscope,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import logoGesclinic from '@/assets/logo_gesclinic_g.png';

const modules = [
  {
    icon: CalendarDays,
    title: 'Agenda e atendimento',
    text: 'Controle de horários, pacientes, salas, profissionais e status do atendimento em uma rotina única.',
  },
  {
    icon: Stethoscope,
    title: 'Prontuário e evolução',
    text: 'Histórico clínico, anexos, prescrições e registros de atendimento organizados por paciente.',
  },
  {
    icon: FileText,
    title: 'Faturamento TISS',
    text: 'Guias, XML ANS, convênios, autorizações e conferência para reduzir retrabalho no faturamento.',
  },
  {
    icon: CreditCard,
    title: 'Financeiro operacional',
    text: 'Contas a pagar, receber, caixa, fluxo projetado, repasses e visão gerencial por competência ou caixa.',
  },
  {
    icon: BarChart3,
    title: 'Gestão e indicadores',
    text: 'Painéis para acompanhar receita, despesas, margem, produção médica e performance da operação.',
  },
  {
    icon: ShieldCheck,
    title: 'Controle e segurança',
    text: 'Perfis, auditoria, rastreabilidade e organização por clínica para equipes com múltiplos acessos.',
  },
];

const workflow = [
  'Paciente agenda ou confirma atendimento',
  'Equipe executa atendimento com prontuário e anexos',
  'Faturamento e financeiro recebem os dados sem redigitação',
  'Gestores acompanham caixa, repasses e indicadores',
];

const plans = [
  {
    slug: 'basic',
    name: 'Básico',
    badge: 'Para iniciar',
    monthly: '99,00',
    annual: '990,00',
    description: 'Agenda Essencial para clínicas em fase inicial.',
    tone: 'emerald',
    features: ['Até 2 médicos', 'Até 2 usuários', 'Agenda de atendimentos', 'Cadastro de pacientes', 'Histórico básico', 'Suporte padrão'],
  },
  {
    slug: 'professional',
    name: 'Profissional',
    badge: 'Mais escolhido',
    monthly: '249,00',
    annual: '2.490,00',
    description: 'Gestão completa para clínicas que precisam controlar operação, caixa e faturamento.',
    tone: 'blue',
    featured: true,
    features: ['Até 5 médicos', 'Até 10 usuários', 'Agenda inteligente', 'Financeiro completo', 'Fluxo de caixa', 'Controle de estoque', 'Relatórios gerenciais'],
  },
  {
    slug: 'enterprise',
    name: 'Enterprise',
    badge: 'Grandes operações',
    monthly: '489,00',
    annual: '4.890,00',
    description: 'Para redes, grupos e operações complexas com múltiplas unidades.',
    tone: 'slate',
    features: ['Médicos ilimitados', 'Usuários ilimitados', 'Multiunidades', 'DRE por unidade', 'Repasse médico avançado', 'SLA e suporte dedicado'],
  },
];

const toneClasses = {
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  blue: 'border-blue-200 bg-blue-50 text-blue-700',
  slate: 'border-slate-200 bg-slate-50 text-slate-700',
};

const getRegisterPath = (planSlug, billingCycle) => `/register?plan=${planSlug}&billing=${billingCycle}`;

export default function PublicHome() {
  const [billingCycle, setBillingCycle] = useState('monthly');

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };
  const itemVariants = { hidden: { y: 18, opacity: 0 }, visible: { y: 0, opacity: 1 } };

  return (
    <>
      <Helmet>
        <title>Gesclinic Web - Sistema Completo de Gestão para Clínicas</title>
        <meta
          name="description"
          content="Transforme a gestão da sua clínica com o Gesclinic Web. Agenda inteligente, prontuário eletrônico, faturamento TISS e controle financeiro em um só lugar."
        />
      </Helmet>

      <div className="min-h-screen bg-slate-50 text-slate-950">
        <header className="sticky top-0 z-40 border-b border-white/20 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 lg:px-8">
            <Link to="/" className="flex items-center gap-2 font-bold text-slate-900">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-slate-200">
                <img src={logoGesclinic} alt="Gesclinic" className="h-8 w-8 object-contain" />
              </span>
              <span>Gesclinic Web</span>
            </Link>
            <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-600 md:flex">
              <a href="#recursos" className="hover:text-blue-700">Recursos</a>
              <a href="#fluxo" className="hover:text-blue-700">Fluxo</a>
              <a href="#planos" className="hover:text-blue-700">Planos</a>
            </nav>
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="outline" size="sm">Acessar conta</Button>
              </Link>
              <a href="#planos" className="hidden sm:block">
                <Button size="sm" className="bg-blue-700 hover:bg-blue-800">Começar</Button>
              </a>
            </div>
          </div>
        </header>

        <main>
          <motion.section
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="relative overflow-hidden bg-slate-950 text-white"
          >
            <div
              className="absolute inset-0 bg-cover bg-center opacity-35"
              style={{ backgroundImage: "url('https://images.unsplash.com/photo-1586448354773-30706da80a04?auto=format&fit=crop&w=1800&q=80')" }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-emerald-700/65" />

            <div className="relative mx-auto grid min-h-[680px] max-w-7xl content-center gap-10 px-5 py-20 lg:px-8">
              <motion.div variants={itemVariants} className="max-w-3xl">
                <div className="mb-6 flex items-center gap-3">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-xl ring-1 ring-white/30">
                    <img src={logoGesclinic} alt="Gesclinic" className="h-11 w-11 object-contain" />
                  </span>
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wide text-blue-100">Gesclinic Web</p>
                    <p className="text-xs text-slate-300">Sistema de gestão para clínicas</p>
                  </div>
                </div>
                <p className="mb-4 inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-100">
                  Plataforma integrada para clínicas
                </p>
                <h1 className="text-4xl font-black leading-tight tracking-normal sm:text-5xl lg:text-6xl">
                  Gestão clínica, faturamento e financeiro em um só lugar.
                </h1>
                <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-200">
                  O Gesclinic Web conecta agenda, prontuário, TISS, estoque, caixa, repasses e indicadores para reduzir retrabalho e dar clareza à operação.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <a href="#planos">
                    <Button size="lg" className="w-full bg-white font-bold text-blue-800 hover:bg-blue-50 sm:w-auto">
                      Comece agora <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </a>
                  <Link to="/login">
                    <Button size="lg" variant="outline" className="w-full border-white/60 bg-white/10 font-bold text-white hover:bg-white hover:text-blue-800 sm:w-auto">
                      Acessar conta
                    </Button>
                  </Link>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="grid gap-3 sm:grid-cols-3">
                {[
                  ['Agenda + Prontuário', 'Atendimento sem perda de contexto'],
                  ['TISS + Financeiro', 'Dados fluem do atendimento ao caixa'],
                  ['Indicadores', 'Decisão com visão de operação'],
                ].map(([title, text]) => (
                  <div key={title} className="rounded-lg border border-white/15 bg-white/10 p-4 backdrop-blur">
                    <p className="text-sm font-bold text-white">{title}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-200">{text}</p>
                  </div>
                ))}
              </motion.div>
            </div>
          </motion.section>

          <section className="border-b border-slate-200 bg-white">
            <div className="mx-auto grid max-w-7xl gap-4 px-5 py-6 text-sm text-slate-600 sm:grid-cols-3 lg:px-8">
              <div className="flex items-center gap-3"><LayoutDashboard className="h-5 w-5 text-blue-700" /> Rotina administrativa centralizada</div>
              <div className="flex items-center gap-3"><ClipboardCheck className="h-5 w-5 text-blue-700" /> Dados clínicos e financeiros conectados</div>
              <div className="flex items-center gap-3"><Users className="h-5 w-5 text-blue-700" /> Operação preparada para equipe e multiunidades</div>
            </div>
          </section>

          <motion.section
            id="recursos"
            className="mx-auto max-w-7xl px-5 py-20 lg:px-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={containerVariants}
          >
            <motion.div variants={itemVariants} className="max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-wide text-blue-700">Recursos</p>
              <h2 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">Tudo o que sustenta a rotina da clínica</h2>
              <p className="mt-3 text-slate-600">Módulos organizados para o fluxo real da operação, do agendamento ao resultado financeiro.</p>
            </motion.div>

            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {modules.map((module) => {
                const Icon = module.icon;
                return (
                  <motion.div key={module.title} variants={itemVariants} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                    <Icon className="h-6 w-6 text-blue-700" />
                    <h3 className="mt-4 text-lg font-bold text-slate-950">{module.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{module.text}</p>
                  </motion.div>
                );
              })}
            </div>
          </motion.section>

          <section id="fluxo" className="bg-white py-20">
            <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-blue-700">Fluxo de trabalho</p>
                <h2 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">Menos redigitação, mais controle entre áreas</h2>
                <p className="mt-4 text-slate-600">A página principal agora destaca a continuidade entre atendimento, faturamento e caixa, onde a clínica mais perde tempo quando usa ferramentas separadas.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                {workflow.map((step, index) => (
                  <div key={step} className="flex gap-4 border-b border-slate-200 py-4 last:border-0">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-700 text-sm font-bold text-white">{index + 1}</span>
                    <div>
                      <p className="font-bold text-slate-900">{step}</p>
                      <p className="mt-1 text-sm text-slate-600">Informação reaproveitada no próximo passo do processo.</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <motion.section
            id="planos"
            className="mx-auto max-w-7xl px-5 py-20 lg:px-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={containerVariants}
          >
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-blue-700">Planos</p>
                <h2 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">Escolha o tamanho da operação</h2>
                <p className="mt-3 max-w-2xl text-slate-600">Planos simples, com upgrade conforme a clínica cresce.</p>
              </div>
              <div className="inline-flex w-fit rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  className={`rounded-md px-4 py-2 text-sm font-bold transition ${billingCycle === 'monthly' ? 'bg-blue-700 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  Mensal
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('annual')}
                  className={`rounded-md px-4 py-2 text-sm font-bold transition ${billingCycle === 'annual' ? 'bg-blue-700 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  Anual -20%
                </button>
              </div>
            </div>

            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {plans.map((plan) => (
                <motion.div
                  key={plan.name}
                  variants={itemVariants}
                  className={`rounded-xl border bg-white p-6 shadow-sm ${plan.featured ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200'}`}
                >
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase ${toneClasses[plan.tone]}`}>
                    {plan.badge}
                  </span>
                  <h3 className="mt-5 text-2xl font-black text-slate-950">{plan.name}</h3>
                  <p className="mt-2 min-h-[48px] text-sm leading-6 text-slate-600">{plan.description}</p>
                  <div className="mt-6 flex items-end gap-2">
                    <span className="text-4xl font-black text-slate-950">R$ {billingCycle === 'monthly' ? plan.monthly : plan.annual}</span>
                    <span className="pb-1 text-sm font-semibold text-slate-500">/{billingCycle === 'monthly' ? 'mês' : 'ano'}</span>
                  </div>
                  <ul className="mt-6 space-y-3 border-t border-slate-100 pt-6">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-2 text-sm text-slate-700">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link to={getRegisterPath(plan.slug, billingCycle)} className="mt-6 block">
                    <Button className={`w-full font-bold text-white hover:text-white ${plan.featured ? 'bg-blue-700 hover:bg-blue-800' : 'bg-slate-900 hover:bg-slate-800'}`}>
                      Começar agora
                    </Button>
                  </Link>
                  <p className="mt-3 text-center text-xs text-slate-500">Sem fidelidade. Cancele quando quiser.</p>
                </motion.div>
              ))}
            </div>
          </motion.section>

          <section className="bg-slate-950 px-5 py-16 text-white lg:px-8">
            <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-blue-200">Pronto para organizar a clínica?</p>
                <h2 className="mt-2 text-3xl font-black">Comece pelo fluxo que mais consome tempo hoje.</h2>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <a href="#planos"><Button size="lg" className="w-full bg-white font-bold text-blue-800 hover:bg-blue-50 sm:w-auto">Escolher plano</Button></a>
                <Link to="/login"><Button size="lg" variant="outline" className="w-full border-white/50 bg-transparent font-bold text-white hover:bg-white hover:text-blue-800 sm:w-auto">Entrar</Button></Link>
              </div>
            </div>
          </section>
        </main>

        <footer className="border-t border-slate-200 bg-white py-8 text-center text-sm text-slate-500">
          <p>© {new Date().getFullYear()} Gesclinic Web. Todos os direitos reservados.</p>
          <div className="mt-4 flex justify-center gap-4">
            <Link to="/login" className="font-semibold hover:text-blue-700">Login</Link>
            <Link to="/register" className="font-semibold hover:text-blue-700">Cadastro</Link>
          </div>
        </footer>
      </div>
    </>
  );
}
