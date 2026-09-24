import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

export default function PrivacidadePage() {
  return (
    <div className="bg-background text-foreground">
      <Helmet>
        <title>Privacidade - Gesclinic Web</title>
        <meta name="description" content="Informações sobre o tratamento de dados no Gesclinic Web." />
      </Helmet>
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="prose prose-lg max-w-4xl mx-auto">
          <h1>Privacidade</h1>
          <p className="lead">Informações em revisão jurídica e administrativa.</p>
          <p>O Gesclinic Web oferece recursos de gestão de clínicas. A plataforma trata dados de contas, clínicas, profissionais, pacientes, agendamentos, atendimentos, documentos e informações financeiras conforme os recursos utilizados. Dados de saúde exigem proteção especial.</p>
          <h2>Responsabilidades</h2>
          <p>A clínica que cadastra e utiliza dados de pacientes define as finalidades do atendimento e deve orientar os titulares sobre seus canais e procedimentos. O papel jurídico da empresa responsável pela plataforma, de cada clínica e dos fornecedores ainda precisa ser validado contratualmente. A identificação formal dos responsáveis e do canal de privacidade será publicada após essa validação.</p>
          <h2>Operações e compartilhamento</h2>
          <p>Os dados podem ser usados para autenticação, gestão de acesso, atendimento clínico, agenda, faturamento, documentos, comunicação solicitada pelo usuário e proteção da operação. A aplicação usa Supabase para autenticação, banco e arquivos; Stripe para checkout; serviços de e-mail quando configurados; e Sentry para diagnóstico de erros quando configurado. Integrações adicionais dependem da configuração da clínica. O inventário completo de fornecedores, bases legais e possíveis transferências internacionais está em revisão.</p>
          <h2>Proteção, conservação e direitos</h2>
          <p>O acesso deve ser limitado a usuários autorizados da clínica. Prazos de conservação e critérios de eliminação, inclusive para prontuários e documentos sujeitos a obrigações legais, precisam de validação jurídica e operacional. Solicitações de acesso, correção, portabilidade ou eliminação devem ser encaminhadas inicialmente à clínica responsável pelo atendimento. O canal próprio da plataforma será informado após sua confirmação oficial.</p>
          <p>Esta página será atualizada após a revisão jurídica. Consulte também a <Link to="/politica-de-cookies">política de cookies e armazenamento local</Link>.</p>
        </div>
      </div>
    </div>
  );
}
