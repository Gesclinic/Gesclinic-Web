import React from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '@/components/ui/PageLayout';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { useClinicContext } from '@/contexts/useClinicContext';
import { useToast } from '@/components/ui/use-toast';
import StockRequestDialog from '@/components/clinica/estoque/StockRequestDialog';
import { stockRequestsApi } from '@/lib/stockApi';

export default function RequisicaoFormPage() {
  const navigate = useNavigate();
  const { clinicId } = useClinicContext();
  const { toast } = useToast();
  const breadcrumbs = useBreadcrumbs([
    { label: 'Estoque', path: '/clinica/estoque' },
    { label: 'Requisições', path: '/clinica/estoque/requisicoes' },
    { label: 'Nova' },
  ]);

  const handleSubmit = async (form) => {
    try {
      await stockRequestsApi.create(clinicId, form);
      toast({ title: 'Requisição criada' });
      navigate('/clinica/estoque/requisicoes');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao criar requisição', description: error.message });
    }
  };

  return (
    <PageLayout breadcrumbs={breadcrumbs} title="Nova Requisição de Materiais" subtitle="Solicite materiais e insumos para aprovação e atendimento.">
      <StockRequestDialog presentation="page" open onSubmit={handleSubmit} clinicId={clinicId} onCancel={() => navigate('/clinica/estoque/requisicoes')} />
    </PageLayout>
  );
}