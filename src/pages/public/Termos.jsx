import React from 'react';
import { Helmet } from 'react-helmet-async';

const sections = [
  {
    title: '1. Aceitação dos Termos',
    paragraphs: [
      'Ao criar uma conta, acessar ou utilizar o Gesclinic Web, o usuário declara ter lido, compreendido e concordado integralmente com estes Termos de Uso e com a Política de Privacidade.',
      'Caso não concorde com qualquer disposição destes termos, o usuário não deverá utilizar a plataforma.',
    ],
  },
  {
    title: '2. Sobre o Gesclinic Web',
    paragraphs: [
      'O Gesclinic Web é uma plataforma em nuvem (Software as a Service - SaaS) destinada à gestão de clínicas, consultórios, hospitais e profissionais da área da saúde.',
      'Entre suas funcionalidades estão:',
    ],
    list: [
      'Agenda médica',
      'Cadastro de pacientes',
      'Prontuário eletrônico',
      'Financeiro',
      'Fluxo de caixa',
      'Contas a pagar e receber',
      'DRE',
      'Emissão de notas fiscais',
      'Faturamento de convênios',
      'Guias TISS',
      'Controle de estoque',
      'Relatórios gerenciais',
      'Gestão de usuários e permissões',
      'Integrações com serviços de terceiros',
    ],
  },
  {
    title: '3. Cadastro',
    paragraphs: [
      'Para utilizar o sistema, o usuário deverá fornecer informações verdadeiras, completas e atualizadas.',
      'O responsável pela clínica declara possuir poderes para contratar o serviço em nome da empresa cadastrada.',
      'O usuário é responsável por:',
    ],
    list: [
      'manter seus dados atualizados',
      'proteger sua senha',
      'não compartilhar credenciais de acesso',
      'comunicar imediatamente qualquer uso não autorizado',
    ],
  },
  {
    title: '4. Planos e Assinatura',
    paragraphs: [
      'O Gesclinic Web oferece planos de assinatura com funcionalidades específicas.',
      'A contratação poderá ocorrer nas modalidades:',
    ],
    list: ['mensal', 'anual', 'promocional'],
    afterList: [
      'As funcionalidades disponíveis dependerão do plano contratado.',
      'Mudanças de plano poderão ocorrer conforme regras comerciais vigentes.',
    ],
  },
  {
    title: '5. Pagamentos',
    paragraphs: [
      'Os pagamentos poderão ser realizados através dos meios disponibilizados pela plataforma.',
      'O não pagamento poderá acarretar:',
    ],
    list: [
      'suspensão temporária do acesso',
      'bloqueio de funcionalidades',
      'cancelamento da assinatura',
      'cobrança de valores pendentes',
    ],
  },
  {
    title: '6. Período de Teste',
    paragraphs: [
      'Quando disponibilizado período gratuito de avaliação, o usuário poderá utilizar o sistema durante o prazo informado no momento da contratação.',
      'Encerrado o período de testes, o acesso poderá ser suspenso até a contratação de um plano.',
    ],
  },
  {
    title: '7. Disponibilidade do Sistema',
    paragraphs: [
      'O Gesclinic Web busca manter disponibilidade contínua da plataforma.',
      'Entretanto, poderão ocorrer interrupções decorrentes de:',
    ],
    list: [
      'manutenção programada',
      'atualizações',
      'falhas de internet',
      'indisponibilidade de serviços de terceiros',
      'eventos de força maior',
    ],
    afterList: ['Não é garantida disponibilidade ininterrupta de 100%.'],
  },
  {
    title: '8. Obrigações do Usuário',
    paragraphs: ['�0 responsabilidade do usuário:'],
    list: [
      'utilizar o sistema conforme a legislação brasileira',
      'manter a veracidade das informações cadastradas',
      'respeitar a LGPD',
      'preservar a confidencialidade das informações de pacientes',
      'utilizar apenas dados cuja utilização seja autorizada',
    ],
    afterList: ['�0 proibido:'],
    secondaryList: [
      'tentar invadir o sistema',
      'copiar ou revender o software',
      'realizar engenharia reversa',
      'utilizar o sistema para atividades ilícitas',
      'compartilhar acessos de forma não autorizada',
    ],
  },
  {
    title: '9. Dados dos Pacientes',
    paragraphs: [
      'O usuário declara ser o controlador dos dados inseridos na plataforma.',
      'O Gesclinic Web atua como operador dos dados, realizando seu tratamento conforme instruções do usuário e conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).',
      'O usuário é responsável pela legitimidade da coleta, armazenamento e utilização das informações de seus pacientes.',
    ],
  },
  {
    title: '10. LGPD',
    paragraphs: [
      'O Gesclinic Web adota medidas técnicas e administrativas destinadas à proteção das informações armazenadas.',
      'Os dados poderão ser utilizados exclusivamente para:',
    ],
    list: [
      'prestação dos serviços contratados',
      'cumprimento de obrigações legais',
      'emissão de documentos fiscais',
      'integrações autorizadas pelo usuário',
      'melhoria da plataforma',
    ],
  },
  {
    title: '11. Backup e Segurança',
    paragraphs: ['São adotadas práticas de segurança compatíveis com o mercado, incluindo:'],
    list: [
      'autenticação de usuários',
      'criptografia de comunicações',
      'backups periódicos',
      'controle de permissões',
      'registros de auditoria',
    ],
    afterList: ['Apesar disso, nenhum sistema é absolutamente imune a falhas ou ataques.'],
  },
  {
    title: '12. Integrações',
    paragraphs: [
      'O sistema poderá integrar-se com serviços de terceiros, incluindo, mas não se limitando a:',
    ],
    list: [
      'Receita Federal',
      'Prefeituras',
      'Operadoras de saúde',
      'TISS',
      'SIEG',
      'Domínio Sistemas',
      'gateways de pagamento',
      'provedores de e-mail',
      'serviços de armazenamento em nuvem',
    ],
    afterList: ['A disponibilidade dessas integrações depende dos respectivos fornecedores.'],
  },
  {
    title: '13. Emissão de Documentos Fiscais',
    paragraphs: ['Quando utilizada a funcionalidade de emissão de notas fiscais, o usuário declara que:'],
    list: [
      'possui autorização para emissão',
      'mantém certificado digital válido quando necessário',
      'é responsável pelas informações fiscais transmitidas',
    ],
    afterList: ['O Gesclinic Web não se responsabiliza por informações incorretas inseridas pelo usuário.'],
  },
  {
    title: '14. Prontuário Eletrônico',
    paragraphs: [
      'O sistema disponibiliza recursos para armazenamento de prontuários eletrônicos.',
      'A responsabilidade pelo conteúdo inserido é exclusivamente do profissional de saúde responsável pelo atendimento.',
    ],
  },
  {
    title: '15. Propriedade Intelectual',
    paragraphs: ['Todo o software, incluindo:'],
    list: [
      'código-fonte',
      'identidade visual',
      'layout',
      'banco de dados',
      'documentação',
      'marca Gesclinic',
      'logotipos',
    ],
    afterList: [
      'é protegido pelas leis brasileiras de propriedade intelectual.',
      '�0 proibida qualquer reprodução sem autorização expressa.',
    ],
  },
  {
    title: '16. Limitação de Responsabilidade',
    paragraphs: ['O Gesclinic Web não será responsável por:'],
    list: [
      'perda de dados decorrente de uso inadequado',
      'interrupções causadas por terceiros',
      'falhas de internet',
      'indisponibilidade de provedores externos',
      'informações incorretamente cadastradas pelos usuários',
      'decisões clínicas tomadas com base nas informações inseridas',
    ],
  },
  {
    title: '17. Cancelamento',
    paragraphs: [
      'O usuário poderá solicitar o cancelamento da assinatura a qualquer momento.',
      'Após o cancelamento:',
    ],
    list: [
      'o acesso poderá ser encerrado',
      'os dados permanecerão armazenados pelo período necessário ao cumprimento das obrigações legais e contratuais',
      'posteriormente poderão ser excluídos conforme a legislação aplicável',
    ],
  },
  {
    title: '18. Alterações destes Termos',
    paragraphs: [
      'O Gesclinic Web poderá alterar estes Termos de Uso a qualquer momento para adequação legal, técnica ou comercial.',
      'A versão mais recente estará sempre disponível na plataforma.',
      'O uso continuado do sistema representa concordância com a versão vigente.',
    ],
  },
  {
    title: '19. Suporte',
    paragraphs: [
      'O suporte técnico será prestado conforme o plano contratado e pelos canais oficiais disponibilizados pela Gesclinic.',
    ],
  },
  {
    title: '20. Lei Aplicável e Foro',
    paragraphs: [
      'Estes Termos são regidos pelas leis da República Federativa do Brasil.',
      'Fica eleito o foro da comarca de Cascavel - Paraná, com renúncia de qualquer outro, por mais privilegiado que seja, para dirimir eventuais controvérsias decorrentes destes Termos de Uso.',
    ],
  },
];

const renderParagraphs = (paragraphs = []) =>
  paragraphs.map((paragraph) => (
    <p key={paragraph} className="mt-3 leading-7 text-slate-700">
      {paragraph}
    </p>
  ));

const renderList = (items = []) => (
  <ul className="mt-4 list-disc space-y-2 pl-6 text-slate-700">
    {items.map((item) => (
      <li key={item}>{item}</li>
    ))}
  </ul>
);

export default function TermosPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <Helmet>
        <title>Termos de Uso - Gesclinic Web</title>
        <meta
          name="description"
          content="Leia os Termos de Uso para contratação e utilização da plataforma Gesclinic Web."
        />
      </Helmet>

      <main className="mx-auto max-w-5xl px-5 py-12 sm:py-16 lg:px-8">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
          <p className="text-sm font-bold uppercase tracking-wide text-cyan-800">Gesclinic Web</p>
          <h1 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">Termos de Uso</h1>
          <p className="mt-3 text-slate-600">�altima atualização: 15 de julho de 2026</p>

          <div className="mt-10 divide-y divide-slate-200">
            {sections.map((section) => (
              <section key={section.title} className="py-8 first:pt-0 last:pb-0">
                <h2 className="text-2xl font-bold text-slate-950">{section.title}</h2>
                {renderParagraphs(section.paragraphs)}
                {section.list && renderList(section.list)}
                {renderParagraphs(section.afterList)}
                {section.secondaryList && renderList(section.secondaryList)}
              </section>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
