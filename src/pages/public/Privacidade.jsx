import React from 'react';
import { Helmet } from 'react-helmet-async';

const PrivacidadePage = () => {
  return (
    <div className="bg-background text-foreground">
      <Helmet>
        <title>Política de Privacidade - Gesclinic Web</title>
        <meta
          name="description"
          content="Consulte a política de privacidade da Gesclinic Web e entenda como seus dados são tratados."
        />
      </Helmet>

      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="prose prose-lg max-w-4xl mx-auto">
          <h1>Política de Privacidade</h1>
          <p className="lead">Última atualização: 17 de outubro de 2025</p>

          <p>
            A sua privacidade é importante para nós. É política do Gesclinic Web respeitar a sua
            privacidade em relação a qualquer informação sua que possamos coletar no site Gesclinic
            Web, e outros sites que possuímos e operamos.
          </p>

          <h2>1. Informações que coletamos</h2>
          <p>
            Coletamos informações pessoais apenas quando realmente precisamos delas para lhe
            fornecer um serviço. Fazemo-lo por meios justos e legais, com o seu conhecimento e
            consentimento. Também informamos por que estamos coletando e como será usado.
          </p>

          <h2>2. Como usamos suas informações</h2>
          <p>
            Usamos as informações que coletamos para operar, manter e fornecer os recursos e a
            funcionalidade do Serviço, para analisar como o Serviço é usado, diagnosticar problemas
            técnicos ou de serviço, manter a segurança e personalizar o conteúdo.
          </p>

          <h2>3. Segurança dos dados</h2>
          <p>
            Retemos as informações coletadas pelo tempo necessário para fornecer o serviço
            solicitado. Quando armazenamos dados, protegemos dentro de meios comercialmente
            aceitáveis para evitar perdas e roubos, bem como acesso, divulgação, cópia, uso ou
            modificação não autorizados.
          </p>

          <h2>4. Links para outros sites</h2>
          <p>
            O nosso site pode ter links para sites externos que não são operados por nós. Esteja
            ciente de que não temos controle sobre o conteúdo e práticas desses sites e não podemos
            aceitar responsabilidade por suas respectivas políticas de privacidade.
          </p>

          <h2>5. Seus direitos</h2>
          <p>
            Você é livre para recusar a nossa solicitação de informações pessoais, entendendo que
            talvez não possamos fornecer alguns dos serviços desejados. O uso continuado de nosso
            site será considerado como aceitação de nossas práticas em torno de privacidade e
            informações pessoais.
          </p>

          <h2>6. Contato</h2>
          <p>
            Se você tiver alguma dúvida sobre como lidamos com dados do usuário e informações
            pessoais, entre em contato conosco através do email: suporte@gesclinicweb.com.br.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacidadePage;
