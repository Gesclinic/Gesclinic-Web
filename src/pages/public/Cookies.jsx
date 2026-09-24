import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

export default function CookiesPage() {
  return (
    <div className="bg-background text-foreground">
      <Helmet>
        <title>Cookies e armazenamento local - Gesclinic Web</title>
        <meta name="description" content="Tecnologias de sessão e armazenamento utilizadas pelo Gesclinic Web." />
      </Helmet>
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="prose prose-lg max-w-4xl mx-auto">
          <h1>Cookies e armazenamento local</h1>
          <p className="lead">Inventário técnico em revisão.</p>
          <p>O cliente de autenticação Supabase guarda os dados necessários à sessão em cookies do navegador. A duração segue a configuração de sessão do ambiente Supabase e deve ser confirmada em homologação. O aplicativo também usa armazenamento local para preferência de tema, seleção da empresa ativa e algumas preferências operacionais; esses valores não concedem acesso por si só.</p>
          <p>Na versão inspecionada, não encontramos scripts de anúncios ou analytics na página inicial. O Sentry pode enviar erros técnicos quando configurado; a gravação de sessões está desativada no código. Checkout e integrações externas podem usar tecnologias próprias quando o usuário inicia o respectivo fluxo. Fornecedores e durações exatas devem ser conferidos no navegador em homologação.</p>
          <p>Não há, nesta versão, uma categoria de cookies opcionais da landing page para aceitar ou rejeitar. Se novas ferramentas opcionais forem ativadas, esta política e os controles de escolha precisarão ser atualizados antes da ativação.</p>
          <p>Veja as <Link to="/privacidade">informações sobre privacidade</Link>.</p>
        </div>
      </div>
    </div>
  );
}
