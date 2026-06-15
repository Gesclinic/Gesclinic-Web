import React from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '@/components/ui/PageLayout';
import { Card } from '@/components/ui/card';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { useClinicContext } from '@/contexts/ClinicContext';
import { CreateEditPayableModal } from '../components/modals/CreateEditPayableModal';

export default function NovaContaPagarPage() {
  const navigate = useNavigate();
  const { clinicId, loadingClinic } = useClinicContext();
  const breadcrumbs = useBreadcrumbs([
    { label: 'Financeiro', path: '/clinica/financeiro' },
    { label: 'Contas a Pagar', path: '/clinica/financeiro/contas-pagar' },
    { label: 'Nova' },
  ]);

  const goBack = () => navigate('/clinica/financeiro/contas-pagar');

  return (
    <PageLayout
      breadcrumbs={breadcrumbs}
      title="Nova Conta a Pagar"
      subtitle="Cadastre uma despesa com dados financeiros, contabeis, recorrencia e anexos fiscais."
    >
      <div className="w-full mx-auto space-y-4">
        <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
          {loadingClinic ? (
            <div className="py-10 text-center text-sm text-slate-500">Carregando clinica...</div>
          ) : clinicId ? (
            <CreateEditPayableModal
              open
              onOpenChange={(open) => {
                if (!open) goBack();
              }}
              clinicId={clinicId}
              presentation="page"
              onSuccess={goBack}
            />
          ) : (
            <div className="py-10 text-center text-sm text-red-600">Sem clinica ativa.</div>
          )}
        </Card>
      </div>
    </PageLayout>
  );
}
