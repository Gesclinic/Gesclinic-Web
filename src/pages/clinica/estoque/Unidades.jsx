import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, PlusCircle, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function Unidades() {
  const { clinicId } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUnits = useCallback(async () => {
    if (!clinicId) {
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('stock_units')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('name', { ascending: true });

    if (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao carregar unidades.',
        variant: 'destructive',
      });
      console.error('Erro ao carregar unidades:', error);
    } else {
      setUnits(data);
    }
    setLoading(false);
  }, [clinicId, toast]);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  const handleDeleteUnit = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta unidade?')) {
      return;
    }
    const { error } = await supabase.from('stock_units').delete().eq('id', id);

    if (error) {
      toast({
        title: 'Erro',
        description: `Falha ao excluir unidade: ${error.message}`,
        variant: 'destructive',
      });
      console.error('Erro ao excluir unidade:', error);
    } else {
      toast({
        title: 'Sucesso',
        description: 'Unidade excluída com sucesso!',
      });
      fetchUnits();
    }
  };

  return (
    <>
      <Helmet>
        <title>Unidades de Medida - Gestão de Estoque - Gesclinic Web</title>
        <meta
          name="description"
          content="Gerencie as unidades de medida dos seus itens de estoque na Gesclinic Web."
        />
      </Helmet>

      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-[#0B63F6] flex items-center gap-2">
            <img
              alt="Icone de unidades de medida"
              src="https://images.unsplash.com/photo-1627898791127-fe32965ac37c"
            />
            Unidades de Medida
          </h1>
          <Button onClick={() => navigate('/clinica/estoque/unidades/nova')}>
            <PlusCircle className="mr-2 h-4 w-4" /> Nova Unidade
          </Button>
        </div>

        <Card className="shadow-sm border border-gray-200">
          <CardHeader>
            <CardTitle>Lista de Unidades</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-[#0B63F6]" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Símbolo</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {units.map((unit) => (
                    <TableRow key={unit.id}>
                      <TableCell className="font-medium">{unit.name}</TableCell>
                      <TableCell>{unit.symbol}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/clinica/estoque/unidades/editar/${unit.id}`)}>
                          <Edit className="h-4 w-4 text-blue-500" />
                          <span className="sr-only">Editar</span>
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteUnit(unit.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                          <span className="sr-only">Excluir</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
