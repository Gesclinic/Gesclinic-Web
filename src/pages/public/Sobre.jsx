import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Building, Target, Users } from 'lucide-react';

const SobrePage = () => {
  return (
    <div className="bg-background text-foreground">
      <Helmet>
        <title>Sobre Nós - Gesclinic Web</title>
        <meta
          name="description"
          content="Conheça a missão, visão e os valores da Gesclinic Web, a plataforma de gestão para clínicas modernas."
        />
      </Helmet>

      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter mb-4">
            Nossa História
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground">
            Nascemos da necessidade de simplificar a gestão na área da saúde, combinando tecnologia
            de ponta com uma interface amigável para transformar o dia a dia de clínicas e
            consultórios.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 text-center">
          <div className="p-8 border rounded-lg shadow-sm">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-primary/10 rounded-full">
                <Target className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2">Nossa Missão</h2>
            <p className="text-muted-foreground">
              Empoderar profissionais de saúde com ferramentas inteligentes que otimizam a gestão,
              melhoram a experiência do paciente e impulsionam o crescimento sustentável de suas
              clínicas.
            </p>
          </div>

          <div className="p-8 border rounded-lg shadow-sm">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-primary/10 rounded-full">
                <Building className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2">Nossa Visão</h2>
            <p className="text-muted-foreground">
              Ser a plataforma de gestão clínica líder em inovação e confiança no Brasil,
              reconhecida por sua excelência em usabilidade, segurança e suporte ao cliente.
            </p>
          </div>

          <div className="p-8 border rounded-lg shadow-sm">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-primary/10 rounded-full">
                <Users className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2">Nossos Valores</h2>
            <ul className="text-muted-foreground space-y-1">
              <li>Inovação Contínua</li>
              <li>Foco no Cliente</li>
              <li>Segurança e Privacidade</li>
              <li>Simplicidade e Eficiência</li>
              <li>Transparência e Ética</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SobrePage;
