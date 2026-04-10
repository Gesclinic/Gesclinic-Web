
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const PlanCard = ({ plan, price, features, popular = false, description }) => (
  <div className={`border rounded-xl p-8 flex flex-col h-full ${popular ? 'border-primary shadow-2xl' : 'border-border'}`}>
    {popular && <div className="text-center mb-4"><span className="bg-primary text-primary-foreground px-3 py-1 text-sm font-semibold rounded-full">Mais Popular</span></div>}
    <h3 className="text-2xl font-bold text-center mb-2">{plan}</h3>
    <p className="text-muted-foreground text-center mb-4 h-12">{description}</p>
    <p className="text-4xl font-extrabold text-center mb-4">{price}<span className="text-base font-normal text-muted-foreground">/mês</span></p>
    <ul className="space-y-3 mb-8 flex-grow">
      {features.map((feature, index) => (
        <li key={index} className="flex items-start">
          <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-1 flex-shrink-0" />
          <span className="text-muted-foreground">{feature}</span>
        </li>
      ))}
    </ul>
    <Link to="/register" className="w-full mt-auto">
      <Button className="w-full" variant={popular ? 'default' : 'outline'}>Começar Agora</Button>
    </Link>
  </div>
);

const PlanosPage = () => {
  return (
    <div className="bg-background text-foreground">
      <Helmet>
        <title>Planos e Preços - Gesclinic Web</title>
        <meta name="description" content="Escolha o plano ideal para sua clínica. Planos flexíveis para todos os tamanhos de negócio, do Essencial ao Enterprise." />
      </Helmet>

      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter mb-4">Planos que se adaptam a você</h1>
          <p className="text-lg md:text-xl text-muted-foreground">
            Sem contratos de longo prazo, sem taxas de instalação. Cancele quando quiser.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mt-16">
          <PlanCard 
            plan="Essencial"
            price="R$ 99"
            description="Perfeito para consultórios individuais e pequenas clínicas."
            features={[
              "Até 3 usuários",
              "Agenda Inteligente",
              "Prontuário Eletrônico",
              "Cadastro de Pacientes e Profissionais",
              "Suporte via Email"
            ]}
          />
          <PlanCard 
            plan="Profissional"
            price="R$ 199"
            description="A solução completa para clínicas em crescimento."
            features={[
              "Até 10 usuários",
              "Todos os recursos do plano Essencial",
              "Faturamento TISS completo",
              "Relatórios Financeiros e de Gestão",
              "Controle de Convênios e Planos",
              "Suporte Prioritário via Chat e Email"
            ]}
            popular={true}
          />
          <PlanCard 
            plan="Enterprise"
            price="Custom"
            description="Para grandes clínicas e redes que precisam de mais."
            features={[
              "Usuários e profissionais ilimitados",
              "Todos os recursos do plano Profissional",
              "Módulo de Estoque Avançado",
              "Inteligência Artificial Preditiva",
              "Gerente de Contas Dedicado",
              "Integrações e API"
            ]}
          />
        </div>
      </div>
    </div>
  );
};

export default PlanosPage;
