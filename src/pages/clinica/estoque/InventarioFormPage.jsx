import React from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '@/components/ui/PageLayout';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { useClinicContext } from '@/contexts/useClinicContext';
import { useToast } from '@/components/ui/use-toast';
import InventoryDialog from '@/components/clinica/estoque/InventoryDialog';

export default function InventarioFormPage() {
  const navigate = useNavigate();
  const { clinicId } = useClinicContext();
  const { toast } = useToast();
  const breadcrumbs = useBreadcrumbs([
    { label: 'Estoque', path: '/clinica/estoque' },
    { label: 'Inventário', path: '/clinica/estoque/inventario' },
    { label: 'Novo' },
  ]);

  const handleSubmit = async () => {
    toast({ title: 'Inventário iniciado' });
    navigate('/clinica/estoque/inventario');
  };

  return (
    <PageLayout breadcrumbs={breadcrumbs} title="Novo Inventário de Estoque" subtitle="Registre uma nova contagem física por local de estoque.">
      <InventoryDialog presentation="page" open onSubmit={handleSubmit} clinicId={clinicId} onCancel={() => navigate('/clinica/estoque/inventario')} />
    </PageLayout>
  );
}