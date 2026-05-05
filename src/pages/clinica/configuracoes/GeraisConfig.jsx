import React from 'react';
import PageLayout from '@/components/ui/PageLayout';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function GeraisConfig() {
  const breadcrumbs = useBreadcrumbs([
    { label: 'Clínica', path: '/clinica' },
    { label: 'Configurações', path: '/clinica/configuracoes' },
    { label: 'Gerais' },
  ]);

  return (
    <PageLayout
      breadcrumbs={breadcrumbs}
      title="Configurações Gerais"
      subtitle="Gerencie informações institucionais, personalização, parâmetros e integrações da clínica."
    >
      <Tabs defaultValue="dados" className="mt-4">
        <TabsList>
          <TabsTrigger value="dados">Dados da Clínica</TabsTrigger>
          <TabsTrigger value="personalizacao">Personalização</TabsTrigger>
          <TabsTrigger value="parametros">Parâmetros Gerais</TabsTrigger>
          <TabsTrigger value="integracoes">Integrações</TabsTrigger>
        </TabsList>

        <TabsContent value="dados">
          <div className="p-6 border rounded-lg mt-4 bg-white">
            <h2 className="text-lg font-semibold mb-2">Dados da Clínica</h2>
            <p className="text-sm text-gray-600 mb-4">
              Informações básicas da unidade, responsáveis e contatos.
            </p>
            {/* form aqui */}
          </div>
        </TabsContent>

        <TabsContent value="personalizacao">
          <div className="p-6 border rounded-lg mt-4 bg-white">
            <h2 className="text-lg font-semibold mb-2">Personalização</h2>
            <p className="text-sm text-gray-600 mb-4">
              Ajuste cores, logotipo e identidade visual da plataforma.
            </p>
            {/* form aqui */}
          </div>
        </TabsContent>

        <TabsContent value="parametros">
          <div className="p-6 border rounded-lg mt-4 bg-white">
            <h2 className="text-lg font-semibold mb-2">Parâmetros Gerais</h2>
            <p className="text-sm text-gray-600 mb-4">
              Configure opções globais que afetam o funcionamento da clínica.
            </p>
            {/* form aqui */}
          </div>
        </TabsContent>

        <TabsContent value="integracoes">
          <div className="p-6 border rounded-lg mt-4 bg-white">
            <h2 className="text-lg font-semibold mb-2">Integrações</h2>
            <p className="text-sm text-gray-600 mb-4">
              Configure integrações externas como e-mail, WhatsApp, APIs e sistemas parceiros.
            </p>
            {/* form aqui */}
          </div>
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}
