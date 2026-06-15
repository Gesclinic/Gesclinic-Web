import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageLayout from '@/components/ui/PageLayout';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import CategoryDialog from '@/components/clinica/estoque/CategoryDialog';
import { stockCategoriesApi } from '@/lib/stockApi';

export default function CategoriaFormPage() {
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
    stockCategoriesApi
      .list(clinicId)
      .then((rows) => setInitialData((rows || []).find((row) => row.id === id) || null))
      .catch((error) => toast({ variant: 'destructive', title: 'Erro ao carregar categoria', description: error.message }))
      .finally(() => setLoading(false));
  }, [clinicId, id, isEdit, toast]);

  const breadcrumbs = useBreadcrumbs([
    { label: 'Estoque', path: '/clinica/estoque' },
    { label: 'Categorias', path: '/clinica/estoque/categorias' },
    { label: isEdit ? 'Editar' : 'Nova' },
  ]);

  const handleSubmit = async (payload) => {
    try {
      if (isEdit) {
        await stockCategoriesApi.update(id, { ...payload, id });
        toast({ title: 'Categoria atualizada com sucesso!' });
      } else {
        await stockCategoriesApi.create(clinicId, payload);
        toast({ title: 'Categoria criada com sucesso!' });
      }
      navigate('/clinica/estoque/categorias');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao salvar categoria', description: error.message });
    }
  };

  return (
    <PageLayout breadcrumbs={breadcrumbs} title={isEdit ? 'Editar Categoria' : 'Nova Categoria'} subtitle="Organize os produtos do estoque por classificação operacional.">
      {loading ? <div className="py-10 text-center text-gray-500">Carregando...</div> : <CategoryDialog presentation="page" open onSubmit={handleSubmit} initialData={initialData} onCancel={() => navigate('/clinica/estoque/categorias')} />}
    </PageLayout>
  );
}