import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageLayout from '@/components/ui/PageLayout';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/customSupabaseClient';

export default function UnidadeFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { clinicId } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    supabase
      .from('stock_units')
      .select('id, name, symbol')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error) throw error;
        setName(data?.name || '');
        setSymbol(data?.symbol || '');
      })
      .catch((error) => toast({ variant: 'destructive', title: 'Erro ao carregar unidade', description: error.message }))
      .finally(() => setLoading(false));
  }, [id, isEdit, toast]);

  const breadcrumbs = useBreadcrumbs([
    { label: 'Estoque', path: '/clinica/estoque' },
    { label: 'Unidades', path: '/clinica/estoque/unidades' },
    { label: isEdit ? 'Editar' : 'Nova' },
  ]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = { name, symbol };
      const result = isEdit
        ? await supabase.from('stock_units').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', id)
        : await supabase.from('stock_units').insert({ ...payload, clinic_id: clinicId, is_active: true });
      if (result.error) throw result.error;
      toast({ title: isEdit ? 'Unidade atualizada com sucesso!' : 'Unidade criada com sucesso!' });
      navigate('/clinica/estoque/unidades');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao salvar unidade', description: error.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout breadcrumbs={breadcrumbs} title={isEdit ? 'Editar Unidade de Medida' : 'Nova Unidade de Medida'} subtitle="Cadastre unidades usadas em produtos, compras e saldos.">
      <Card>
        <CardContent className="p-6">
          {loading ? (
            <div className="py-10 text-center text-gray-500">Carregando...</div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">Nome *</label>
                <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex: Unidade" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">Símbolo *</label>
                <Input value={symbol} onChange={(event) => setSymbol(event.target.value)} placeholder="Ex: un" required />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => navigate('/clinica/estoque/unidades')}>Cancelar</Button>
                <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar unidade'}</Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </PageLayout>
  );
}