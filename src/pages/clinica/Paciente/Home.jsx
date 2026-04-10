import React from 'react';
    import { Link } from 'react-router-dom';
    import { motion } from 'framer-motion';
    import { CalendarCheck2, Stethoscope, Users, Coins as HandCoins, CreditCard, FileSpreadsheet, Pill, Settings, ShieldCheck, ArrowRight, Activity, BarChart, TestTube, FileHeart, Bot } from 'lucide-react';
    import { Button } from '@/components/ui/button';
    import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
    import { useAuth } from '@/contexts/SupabaseAuthContext.jsx';
    import { Helmet } from "react-helmet-async";

    const features = [
      { icon: Stethoscope,     title: 'Prontuário Completo',   to: '/clinica/prontuario',          desc: 'Registro digital com histórico do paciente, exames e anotações.' },
      { icon: Users,           title: 'Portal do Paciente',     to: '/clinica/pacientes',           desc: 'Acesso a informações pessoais, histórico e auto-agendamento.' },
      { icon: FileHeart,       title: 'Receita',    to: '/clinica/prontuario',          desc: 'Emissão de receitas seguras e rápidas.' },
      { icon: TestTube,        title: 'Módulo de Laudos',       to: '/clinica/laudos',              desc: 'Gerenciamento de laudos com ditado inteligente e editor de texto.' },
      { icon: HandCoins,       title: 'Financeiro',             to: '/clinica/financeiro/receber',  desc: 'Controle de contas a pagar e receber, com relatórios completos.' },
      { icon: FileSpreadsheet, title: 'Relatórios',             to: '/clinica/relatorios',          desc: 'Relatórios detalhados sobre agendas, atendimentos e finanças.' },
      { icon: BarChart,        title: 'BI (Business Intel.)',   to: '/clinica/relatorios',          desc: 'Visualize todas as métricas do seu negócio em tempo real.' },
      { icon: Activity,        title: 'Integração',             to: '/clinica/configuracoes',       desc: 'Integração com aparelhos de ultrassom, raio-x e PACS.' },
      { icon: ShieldCheck,     title: 'Gestão de Acessos',      to: '/clinica/usuarios',            desc: 'Permissões parametrizadas de acordo com a função do usuário.' },
      { icon: Bot,             title: 'Assinatura Eletrônica',  to: '/clinica/configuracoes',       desc: 'Assinatura de termos de forma ágil, com validade jurídica.' },
      { icon: CalendarCheck2,  title: 'Agenda Inteligente',     to: '/clinica/agenda',              desc: 'Sistema de agendamento online com notificações automáticas.' },
      { icon: Pill,            title: 'Atendimento Médico',     to: '/clinica/prontuario',          desc: 'Gestão de dados dos pacientes, históricos e diagnósticos.' },
    ];

    export default function Home() {
      const { user } = useAuth();

      const FeatureCard = ({ icon: Icon, title, desc, to, index }) => (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: index * 0.05 }}
        >
          <Link to={user ? to : '/login'}>
            <Card className="h-full text-center hover:bg-primary/5 hover:border-primary/50 transition-all duration-300 group">
              <CardHeader className="items-center">
                <div className="bg-primary/10 text-primary p-4 rounded-full group-hover:bg-primary group-hover:text-white transition-colors">
                  <Icon size={28} />
                </div>
                <CardTitle className="text-lg font-semibold pt-2">{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </CardContent>
            </Card>
          </Link>
        </motion.div>
      );

      return (
        <div className="bg-background text-foreground">
           <Helmet>
            <title>Gesclinic Web - Transforme a Gestão da Sua Clínica</title>
            <meta name="description" content="Desenvolvido para médicos, clínicas e consultórios que buscam eficiência, segurança e inovação. Otimize o atendimento, melhore a experiência do paciente e aumente a eficiência operacional." />
          </Helmet>
          
          {/* Hero Section */}
          <section className="relative bg-white pt-16 pb-20 lg:pt-24 lg:pb-28 overflow-hidden">
            <div className="absolute inset-0">
              <img
                alt="Medical professionals in a modern clinic"
                className="w-full h-full object-cover opacity-10" src="https://images.unsplash.com/photo-1675270714610-11a5cadcc7b3" />
              <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent"></div>
            </div>
            <div className="container mx-auto px-4 relative z-10 text-center">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-4xl lg:text-6xl font-extrabold text-primary tracking-tight"
              >
                Transforme a Gestão da Sua Clínica com o <span className="text-secondary">Gesclinic Web</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="mt-4 w-full mx-auto text-lg lg:text-xl text-muted-foreground"
              >
                Desenvolvido para médicos, clínicas e consultórios que buscam eficiência, segurança e inovação.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="mt-8 flex justify-center gap-4"
              >
                <Button asChild size="lg" className="text-lg py-7 px-8">
                  <Link to="/register">Comece Agora a Revolucionar</Link>
                </Button>
              </motion.div>
            </div>
          </section>

          {/* Why Choose Us Section */}
          <section className="py-16 lg:py-24 bg-gray-50">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="text-3xl lg:text-4xl font-bold text-primary">Por que escolher o Gesclinic Web?</h2>
                <p className="mt-3 text-lg text-muted-foreground w-full mx-auto">Nossa plataforma resolve os maiores desafios da gestão de clínicas, permitindo que você foque no mais importante: o cuidado com o paciente.</p>
              </div>
              <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
                <motion.div
                  initial={{ opacity: 0, x: -50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7 }}
                >
                  <img
                    alt="Smiling doctor looking at the camera"
                    className="rounded-lg shadow-2xl" src="https://images.unsplash.com/photo-1659353885824-1199aeeebfc6" />
                </motion.div>
                <div className="space-y-6">
                  {[
                    { title: 'Gestão Manual e Processos Desconectados', desc: 'Acabe com planilhas e sistemas isolados que limitam sua produtividade e geram erros.' },
                    { title: 'Falta de Controle FinancFiro', desc: 'Não perca o financeiro da sua clínica de vista. Tenha um panorama completo e seguro.' },
                    { title: 'Mais Organização e Mais Tempo para o Paciente', desc: 'Com a gestão centralizada, você melhora a experiência do paciente e foca no que realmente importa.' },
                    { title: 'Solução Completa e Integrada', desc: 'O Gesclinic Web conecta todos os processos da sua clínica em um só ambiente, proporcionando maior eficiência e controle.' }
                  ].map((item, i) => (
                     <motion.div
                      key={item.title}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: i * 0.1 }}
                    >
                      <h3 className="text-xl font-semibold text-primary">{item.title}</h3>
                      <p className="mt-1 text-muted-foreground">{item.desc}</p>
                     </motion.div>
                  ))}
                  <motion.div
                    className="mt-6 p-6 rounded-lg bg-primary text-primary-foreground"
                     initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.4 }}
                  >
                    <h3 className="text-xl font-semibold">Mais produtividade</h3>
                    <p className="mt-1 opacity-90">Otimize a qualificação de seus colaboradores e o fluxo de trabalho, para mais tempo focado no que importa: o cuidado com seu paciente.</p>
                  </motion.div>
                </div>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section className="py-16 lg:py-24 bg-white">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="text-3xl lg:text-4xl font-bold text-primary">Experiência Completa para Médicos e Pacientes</h2>
                <p className="mt-3 text-lg text-muted-foreground w-full mx-auto">Confira as principais funcionalidades que vão transformar a gestão do seu consultório ou clínica:</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {features.slice(0, 4).map((feature, index) => (
                  <FeatureCard key={feature.title} {...feature} index={index} />
                ))}
              </div>
              <div className="text-center mt-12">
                <Button asChild size="lg" variant="outline">
                  <Link to="/register">
                    Garanta uma gestão eficiente e segura <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </section>

          {/* More Features Section */}
          <section className="py-16 lg:py-24 bg-gray-50">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="text-3xl lg:text-4xl font-bold text-primary">Gestão Integrada da Clínica</h2>
                <p className="mt-3 text-lg text-muted-foreground w-full mx-auto">Do financeiro ao atendimento, tudo centralizado para sua comodidade.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {features.slice(4).map((feature, index) => (
                  <FeatureCard key={feature.title} {...feature} index={index} />
                ))}
              </div>
              <div className="text-center mt-12">
                <Button asChild size="lg" className="bg-secondary hover:bg-secondary/90">
                  <Link to="/register">
                    Iniciar a gestão integrada <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </section>
          
          {/* Footer */}
          <footer className="bg-primary text-primary-foreground">
            <div className="container mx-auto px-4 py-8 text-center">
                <p className="text-sm">&copy; {new Date().getFullYear()} Gesclinic Web. Todos os direitos reservados.</p>
                <div className="flex justify-center gap-4 mt-4">
                  <Link to="/login" className="text-sm hover:underline">Login</Link>
                  <Link to="/register" className="text-sm hover:underline">Registrar</Link>
                </div>
            </div>
          </footer>
        </div>
      );
    }

