import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PageLayout from '@/components/ui/PageLayout';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';

export default function AdminConfig() {
  const breadcrumbs = useBreadcrumbs([
    { label: 'Clínica', path: '/clinica' },
    { label: 'Configurações' },
    { label: 'Administração' },
  ]);

  return (
    <PageLayout
      title="Administração do Sistema"
      subtitle="Gerencie usuários, permissões e logs."
      breadcrumbs={breadcrumbs}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>6.1 Usuários e Permissões</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>• Papéis</p>
            <p>• Acesso por módulo</p>
            <p>• Restrição de clínica</p>
            <p>• Log de auditoria</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>6.2 Log de Atividades</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>• Histórico de ações</p>
            <p>• Rastreabilidade completa</p>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
