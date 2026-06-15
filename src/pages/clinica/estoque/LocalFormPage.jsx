import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageLayout from '@/components/ui/PageLayout';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { stockLocationsApi } from '@/lib/stockApi';

export default function LocalFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { clinicId } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit || !clinicId) return;
    setLoading(true);
    stockLocationsApi
      .list(clinicId)
      .then((rows) => setName((rows || []).find((row) => row.id === id)?.name || ''))
      .catch((error) => toast({ variant: 'destructive', title: 'Erro ao carregar local', description: error.message }))
      .finally(() => setLoading(false));
  }, [clinicId, id, isEdit, toast]);

  const breadcrumbs = useBreadcrumbs([
    { label: 'Estoque', path: '/clinica/estoque' },
    { label: 'Locais', path: '/clinica/estoque/locais' },
    { label: isEdit ? 'Editar' : 'Novo' },
  ]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        await stockLocationsApi.update(id, { name });
        toast({ title: 'Local atualizado com sucesso!' });
      } else {
        await stockLocationsApi.create(clinicId, { name });
        toast({ title: 'Local criado com sucesso!' });
      }
      navigate('/clinica/estoque/locais');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao salvar local', description: error.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout breadcrumbs={breadcrumbs} title={isEdit ? 'Editar Local de Estoque' : 'Novo Local de Estoque'} subtitle="Cadastre locais físicos usados em saldos, transferências e movimentações.">
      <Card>
        <CardContent className="p-6">
          {loading ? (
            <div className="py-10 text-center text-gray-500">Carregando...</div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">Nome do local *</label>
                <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex: Almoxarifado Central" required />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => navigate('/clinica/estoque/locais')}>Cancelar</Button>
                <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar local'}</Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </PageLayout>
  );
}