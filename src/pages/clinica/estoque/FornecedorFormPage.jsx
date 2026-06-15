import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageLayout from '@/components/ui/PageLayout';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import StockSupplierDialog from '@/components/clinica/estoque/StockSupplierDialog';
import { stockSuppliersApi } from '@/lib/stockApi';

export default function FornecedorFormPage() {
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
    stockSuppliersApi
      .get(id)
      .then(setInitialData)
      .catch((error) => toast({ variant: 'destructive', title: 'Erro ao carregar fornecedor', description: error.message }))
      .finally(() => setLoading(false));
  }, [clinicId, id, isEdit, toast]);

  const breadcrumbs = useBreadcrumbs([
    { label: 'Estoque', path: '/clinica/estoque' },
    { label: 'Fornecedores', path: '/clinica/estoque/fornecedores' },
    { label: isEdit ? 'Editar' : 'Novo' },
  ]);

  const handleSubmit = async (payload) => {
    try {
      if (isEdit) {
        await stockSuppliersApi.update(id, { ...payload, id });
        toast({ title: 'Fornecedor atualizado com sucesso!' });
      } else {
        await stockSuppliersApi.create(clinicId, payload);
        toast({ title: 'Fornecedor criado com sucesso!' });
      }
      navigate('/clinica/estoque/fornecedores');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao salvar fornecedor', description: error.message });
    }
  };

  return (
    <PageLayout breadcrumbs={breadcrumbs} title={isEdit ? 'Editar Fornecedor' : 'Novo Fornecedor'} subtitle="Cadastre dados fiscais, contato, endereço e documentos do fornecedor.">
      {loading ? <div className="py-10 text-center text-gray-500">Carregando...</div> : <StockSupplierDialog presentation="page" open onSubmit={handleSubmit} initialData={initialData} onCancel={() => navigate('/clinica/estoque/fornecedores')} />}
    </PageLayout>
  );
}