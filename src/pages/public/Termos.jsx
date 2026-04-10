
import React from 'react';
import { Helmet } from 'react-helmet-async';

const TermosPage = () => {
  return (
    <div className="bg-background text-foreground">
      <Helmet>
        <title>Termos de Serviço - Gesclinic Web</title>
        <meta name="description" content="Leia os Termos de Serviço que regem o uso da plataforma Gesclinic Web." />
      </Helmet>

      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="prose prose-lg max-w-4xl mx-auto">
          <h1>Termos de Serviço</h1>
          <p className="lead">Última atualização: 17 de outubro de 2025</p>

          <h2>1. Termos</h2>
          <p>Ao acessar ao site Gesclinic Web, concorda em cumprir estes termos de serviço, todas as leis e regulamentos aplicáveis ​​e concorda que é responsável pelo cumprimento de todas as leis locais aplicáveis. Se você não concordar com algum desses termos, está proibido de usar ou acessar este site. Os materiais contidos neste site são protegidos pelas leis de direitos autorais e marcas comerciais aplicáveis.</p>

          <h2>2. Uso de Licença</h2>
          <p>É concedida permissão para baixar temporariamente uma cópia dos materiais (informações ou software) no site Gesclinic Web, apenas para visualização transitória pessoal e não comercial. Esta é a concessão de uma licença, não uma transferência de título e, sob esta licença, você não pode:</p>
          <ol>
            <li>modificar ou copiar os materiais;</li>
            <li>usar os materiais para qualquer finalidade comercial ou para exibição pública (comercial ou não comercial);</li>
            <li>tentar descompilar ou fazer engenharia reversa de qualquer software contido no site Gesclinic Web;</li>
            <li>remover quaisquer direitos autorais ou outras notações de propriedade dos materiais; ou</li>
            <li>transferir os materiais para outra pessoa ou 'espelhe' os materiais em qualquer outro servidor.</li>
          </ol>
          <p>Esta licença será automaticamente rescindida se você violar alguma dessas restrições e poderá ser rescindida por Gesclinic Web a qualquer momento.</p>

          <h2>3. Isenção de responsabilidade</h2>
          <p>Os materiais no site da Gesclinic Web são fornecidos 'como estão'. Gesclinic Web não oferece garantias, expressas ou implícitas, e, por este meio, isenta e nega todas as outras garantias, incluindo, sem limitação, garantias implícitas ou condições de comercialização, adequação a um fim específico ou não violação de propriedade intelectual ou outra violação de direitos.</p>

          <h2>4. Limitações</h2>
          <p>Em nenhum caso o Gesclinic Web ou seus fornecedores serão responsáveis ​​por quaisquer danos (incluindo, sem limitação, danos por perda de dados ou lucro ou devido a interrupção dos negócios) decorrentes do uso ou da incapacidade de usar os materiais em Gesclinic Web, mesmo que Gesclinic Web ou um representante autorizado da Gesclinic Web tenha sido notificado oralmente ou por escrito da possibilidade de tais danos.</p>

          <h2>5. Precisão dos materiais</h2>
          <p>Os materiais exibidos no site da Gesclinic Web podem incluir erros técnicos, tipográficos ou fotográficos. Gesclinic Web não garante que qualquer material em seu site seja preciso, completo ou atual. Gesclinic Web pode fazer alterações nos materiais contidos em seu site a qualquer momento, sem aviso prévio. No entanto, Gesclinic Web não se compromete a atualizar os materiais.</p>

          <h2>6. Links</h2>
          <p>O Gesclinic Web não analisou todos os sites vinculados ao seu site e não é responsável pelo conteúdo de nenhum site vinculado. A inclusão de qualquer link não implica endosso por Gesclinic Web do site. O uso de qualquer site vinculado é por conta e risco do usuário.</p>

          <h3>Modificações</h3>
          <p>O Gesclinic Web pode revisar estes termos de serviço do site a qualquer momento, sem aviso prévio. Ao usar este site, você concorda em ficar vinculado à versão atual desses termos de serviço.</p>

          <h3>Lei aplicável</h3>
          <p>Estes termos e condições são regidos e interpretados de acordo com as leis do Brasil e você se submete irrevogavelmente à jurisdição exclusiva dos tribunais naquele estado ou localidade.</p>
        </div>
      </div>
    </div>
  );
};

export default TermosPage;
