// src/pages/configuracoes/IntegracoesConfig.jsx
import React from 'react';
import PageLayout from '@/components/ui/PageLayout';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';

export default function IntegracoesConfig() {
  const breadcrumbs = useBreadcrumbs([
    { label: 'Clínica', path: '/clinica' },
    { label: 'Configurações', path: '/clinica/configuracoes' },
    { label: 'Integrações' },
  ]);

  return (
    <PageLayout
      breadcrumbs={breadcrumbs}
      title="Integrações da Clínica"
      subtitle="Gerencie conexões com APIs, serviços externos, integrações de agenda, notificações e ferramentas de automação."
    >
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border rounded-lg p-6 bg-white">
          <h2 className="text-lg font-semibold mb-2">Google Calendar</h2>
          <p className="text-sm text-gray-600 mb-4">Sincronize horários e eventos da agenda.</p>
        </div>

        <div className="border rounded-lg p-6 bg-white">
          <h2 className="text-lg font-semibold mb-2">WhatsApp API</h2>
          <p className="text-sm text-gray-600 mb-4">
            Configure envio de confirmações, lembretes e mensagens automáticas.
          </p>
        </div>

        <div className="border rounded-lg p-6 bg-white">
          <h2 className="text-lg font-semibold mb-2">E-mail SMTP</h2>
          <p className="text-sm text-gray-600 mb-4">
            Conecte um servidor SMTP para envio de notificações.
          </p>
        </div>

        <div className="border rounded-lg p-6 bg-white">
          <h2 className="text-lg font-semibold mb-2">API de Pagamento</h2>
          <p className="text-sm text-gray-600 mb-4">
            Integre cobrança e liberação automática de serviços/planos.
          </p>
        </div>
      </div>
    </PageLayout>
  );
}
