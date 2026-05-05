import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Edit3, Search, PlusCircle } from 'lucide-react';
import ProfessionalForm from './ProfessionalForm';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/SupabaseAuthContext';

/* --------------------------------------------
 * LISTAGEM DE PROFISSIONAIS (compatível com RPC)
 * -------------------------------------------- */
export default function ProfessionalList() {
  const { clinicId } = useAuth();
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedProfessional, setSelectedProfessional] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();

  /* --------------------------------------------
   * BUSCA PROFISSIONAIS (apenas campos reais)
   * -------------------------------------------- */
  const fetchProfessionals = useCallback(async () => {
    if (!clinicId) {
      return;
    }
    setLoading(true);

    const { data, error } = await supabase
      .from('professionals')
      .select('id, name, specialty, crm, city, active, clinic_id')
      .eq('clinic_id', clinicId)
      .order('name', { ascending: true });

    if (error) {
      console.error('Erro ao listar profissionais:', error);
      toast({
        title: 'Erro ao carregar profissionais',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setProfessionals(data || []);
    }

    setLoading(false);
  }, [clinicId, toast]);

  useEffect(() => {
    fetchProfessionals();
  }, [clinicId, fetchProfessionals]);

  /* --------------------------------------------
   * FILTRO DE PESQUISA LOCAL
   * -------------------------------------------- */
  const filtered = professionals.filter((p) => {
    const term = search.toLowerCase();
    return (
      p.name?.toLowerCase().includes(term) ||
      p.city?.toLowerCase().includes(term) ||
      p.specialty?.toLowerCase().includes(term) ||
      p.crm?.toLowerCase().includes(term)
    );
  });

  /* --------------------------------------------
   * CALLBACK DE SALVAMENTO
   * -------------------------------------------- */
  const handleSaved = useCallback(() => {
    setShowForm(false);
    setSelectedProfessional(null);
    fetchProfessionals();
  }, [fetchProfessionals]);

  /* --------------------------------------------
   * INTERFACE
   * -------------------------------------------- */
  return (
    <Card className="w-full max-w-5xl mx-auto mt-6">
      <CardHeader className="flex justify-between items-center flex-col sm:flex-row gap-3">
        <CardTitle className="flex items-center gap-2">
          Profissionais
          <Badge variant="outline">{professionals.length}</Badge>
        </CardTitle>
        <div className="flex gap-2 items-center w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nome, CRM ou cidade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button
            onClick={() => {
              setSelectedProfessional(null);
              setShowForm(true);
            }}
          >
            <PlusCircle className="h-4 w-4 mr-1" />
            Novo
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Carregando profissionais...
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum profissional encontrado.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 px-2">Nome</th>
                  <th className="py-2 px-2">Especialidade</th>
                  <th className="py-2 px-2">CRM</th>
                  <th className="py-2 px-2">Cidade</th>
                  <th className="py-2 px-2">Status</th>
                  <th className="py-2 px-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="py-2 px-2 font-medium text-gray-900">{p.name || '—'}</td>
                    <td className="py-2 px-2">{p.specialty || '—'}</td>
                    <td className="py-2 px-2">{p.crm || '—'}</td>
                    <td className="py-2 px-2">{p.city || '—'}</td>
                    <td className="py-2 px-2">
                      {p.active ? (
                        <Badge className="bg-green-100 text-green-800 border border-green-300">
                          Ativo
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-200 text-gray-600 border border-gray-300">
                          Inativo
                        </Badge>
                      )}
                    </td>
                    <td className="py-2 px-2 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedProfessional(p.id);
                          setShowForm(true);
                        }}
                      >
                        <Edit3 className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      {/* Modal de formulário */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="app-dialog-shell app-dialog-shell--content app-dialog-shell--compact">
          <DialogTitle className="sr-only">
            {selectedProfessional ? 'Editar Profissional' : 'Novo Profissional'}
          </DialogTitle>
          <ProfessionalForm
            professionalId={selectedProfessional}
            clinicId={clinicId}
            onSave={handleSaved}
            onClose={() => setShowForm(false)}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
}
