import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageLayout from '@/components/ui/PageLayout';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import StockItemDialog from '@/components/clinica/estoque/StockItemDialog';
import { stockItemsApi } from '@/lib/stockApi';

export default function ProdutoFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { clinicId } = useAuth();
  const { toast } = useToast();
  const [initialData, setInitialData] = useState(null);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (!isEdit || !clinicId) return;
    setLoading(true);
    stockItemsApi
      .get(id)
      .then(setInitialData)
      .catch((error) => toast({ variant: 'destructive', title: 'Erro ao carregar produto', description: error.message }))
      .finally(() => setLoading(false));
  }, [clinicId, id, isEdit, toast]);

  const breadcrumbs = useBreadcrumbs([
    { label: 'Estoque', path: '/clinica/estoque' },
    { label: 'Produtos', path: '/clinica/estoque/produtos' },
    { label: isEdit ? 'Editar' : 'Novo' },
  ]);

  const handleSubmit = async (payload) => {
    try {
      if (isEdit) {
        await stockItemsApi.update(id, { ...payload, id });
        toast({ title: 'Produto atualizado com sucesso!' });
      } else {
        await stockItemsApi.create(clinicId, payload);
        toast({ title: 'Produto criado com sucesso!' });
      }
      navigate('/clinica/estoque/produtos');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao salvar produto', description: error.message });
    }
  };

  return (
    <PageLayout breadcrumbs={breadcrumbs} title={isEdit ? 'Editar Produto' : 'Novo Produto'} subtitle="Cadastre produto, categoria, rastreabilidade e limites de estoque.">
      {loading ? (
        <div className="py-10 text-center text-gray-500">Carregando...</div>
      ) : (
        <StockItemDialog presentation="page" open onSubmit={handleSubmit} initialData={initialData} clinicId={clinicId} onCancel={() => navigate('/clinica/estoque/produtos')} />
      )}
    </PageLayout>
  );
}