import React from 'react';
import PageLayout from '@/components/ui/PageLayout';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import LaudoTemplatesManager from '@/components/configuracoes/LaudoTemplatesManager';

export default function DocumentosConfig() {
  const breadcrumbs = useBreadcrumbs([
    { label: 'Clínica', path: '/clinica' },
    { label: 'Configurações', path: '/clinica/configuracoes' },
    { label: 'Documentos e Modelos' },
  ]);

  return (
    <PageLayout
      breadcrumbs={breadcrumbs}
      title="Documentos e Modelos"
      subtitle="Gerencie modelos de laudos, orçamentos, recibos, termos, declarações e templates de e-mail."
    >
      <Tabs defaultValue="laudos" className="mt-4">
        <TabsList>
          <TabsTrigger value="laudos">Laudos</TabsTrigger>
          <TabsTrigger value="orcamentos">Orçamentos</TabsTrigger>
          <TabsTrigger value="recibos">Recibos</TabsTrigger>
          <TabsTrigger value="termos">Termos</TabsTrigger>
          <TabsTrigger value="emails">E-mails</TabsTrigger>
        </TabsList>

        <TabsContent value="laudos">
          <div className="mt-4">
            <LaudoTemplatesManager />
          </div>
        </TabsContent>

        <TabsContent value="orcamentos">
          <div className="p-6 border rounded-lg mt-4 bg-white">
            <h2 className="text-lg font-semibold mb-2">Modelos de Orçamento</h2>
            <p className="text-sm text-gray-600 mb-4">
              Defina layouts e predefinições para geração de orçamentos.
            </p>
            {/* editor */}
          </div>
        </TabsContent>

        <TabsContent value="recibos">
          <div className="p-6 border rounded-lg mt-4 bg-white">
            <h2 className="text-lg font-semibold mb-2">Recibos</h2>
            <p className="text-sm text-gray-600 mb-4">
              Configure modelos de recibo para emissão rápida.
            </p>
            {/* editor */}
          </div>
        </TabsContent>

        <TabsContent value="termos">
          <div className="p-6 border rounded-lg mt-4 bg-white">
            <h2 className="text-lg font-semibold mb-2">Termos e Declarações</h2>
            <p className="text-sm text-gray-600 mb-4">
              Gerencie termos de consentimento e declarações diversas.
            </p>
            {/* editor */}
          </div>
        </TabsContent>

        <TabsContent value="emails">
          <div className="p-6 border rounded-lg mt-4 bg-white">
            <h2 className="text-lg font-semibold mb-2">Templates de E-mail</h2>
            <p className="text-sm text-gray-600 mb-4">
              Modelos utilizados em notificações enviadas pelos módulos da clínica.
            </p>
            {/* editor */}
          </div>
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}
