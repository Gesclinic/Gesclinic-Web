import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import ConfirmationDialog from '@/components/clinica/ConfirmationDialog';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Building2,
  Mail,
  Phone,
  MapPin,
  Loader,
  ArrowLeft
} from 'lucide-react';

export default function Clinicas({ embedded = false }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [clinicas, setClinicas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clinicaToDelete, setClinicaToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    ativas: 0,
    inativas: 0,
  });

  useEffect(() => {
    loadClinicas();
  }, []);

  const loadClinicas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clinics')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setClinicas(data || []);
      
      // Calcular estatísticas
      const stats = {
        total: data?.length || 0,
        ativas: data?.filter(c => c.status === 'active' || !c.status).length || 0,
        inativas: data?.filter(c => c.status === 'inactive').length || 0,
      };
      setStats(stats);
    } catch (error) {
      console.error('Erro ao carregar clínicas:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar clínicas',
        description: error.message || 'Não foi possível buscar as clínicas agora.'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      suspended: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-green-100 text-green-800'; // Padrão: ativa
  };

  const getStatusLabel = (status) => {
    const labels = {
      active: 'Ativa',
      inactive: 'Inativa',
      suspended: 'Suspensa'
    };
    return labels[status] || 'Ativa'; // Padrão: Ativa
  };

  const filteredClinicas = clinicas.filter(clinic => {
    const matchSearch = clinic.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       clinic.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       clinic.city?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch;
  });

  const openDeleteDialog = (clinic) => {
    setClinicaToDelete(clinic);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!clinicaToDelete) return;

    setIsDeleting(true);

    try {
      // Deletar clínica
      const { error } = await supabase
        .from('clinics')
        .delete()
        .eq('id', clinicaToDelete.id);

      if (error) throw error;

      // Recarregar lista
      await loadClinicas();
      toast({
        title: 'Clínica excluída',
        description: `${clinicaToDelete.name || 'A clínica selecionada'} foi removida com sucesso.`
      });
    } catch (error) {
      console.error('Erro ao deletar clínica:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir clínica',
        description: error.message || 'Tente novamente em alguns instantes.'
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setClinicaToDelete(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className={embedded ? 'space-y-6' : 'min-h-screen bg-slate-50 p-6'}>
      <Helmet>
        <title>Gerenciamento de Clínicas - Gesclinic</title>
        <meta name="description" content="Página para gerenciar clínicas do sistema." />
      </Helmet>

      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-white to-slate-50 p-6 shadow-sm md:flex-row md:items-start md:justify-between">
        {!embedded && (
          <button
            onClick={() => navigate('/clinica')}
            className="inline-flex items-center gap-2 self-start rounded-2xl border border-slate-200 bg-white px-4 py-3 font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <ArrowLeft className="h-5 w-5" />
            Voltar
          </button>
        )}
        <div className="flex flex-1 flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center rounded-full bg-[hsl(var(--primary))]/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[hsl(var(--primary))]">
              Administração
            </span>
            <div>
              <h1 className={embedded ? 'text-3xl font-bold tracking-tight text-slate-950' : 'text-4xl font-bold tracking-tight text-slate-950'}>Clínicas</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">Gerencie as clínicas do sistema com o mesmo padrão visual usado nos formulários e telas internas da administração.</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/clinica/administracao/clinicas/nova')}
            className="flex items-center gap-2 self-start rounded-2xl bg-[hsl(var(--primary))] px-4 py-3 font-semibold text-white transition hover:opacity-95"
          >
            <Plus className="h-5 w-5" />
            Nova Clínica
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total</p>
                <p className="mt-2 text-3xl font-bold text-slate-950">{stats.total}</p>
              </div>
              <Building2 className="h-10 w-10 text-[hsl(var(--primary))] opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ativas</p>
                <p className="mt-2 text-3xl font-bold text-green-600">{stats.ativas}</p>
              </div>
              <Building2 className="h-10 w-10 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Inativas</p>
                <p className="mt-2 text-3xl font-bold text-slate-600">{stats.inativas}</p>
              </div>
              <Building2 className="h-10 w-10 text-slate-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/80">
          <CardTitle className="text-2xl text-slate-950">Filtrar e Buscar</CardTitle>
          <CardDescription>Pesquise por nome, email ou cidade para localizar rapidamente a clínica desejada.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por nome, email ou cidade..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[hsl(var(--primary))] focus:ring-4 focus:ring-[hsl(var(--primary))]/10"
                />
              </div>
            </div>

            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Limpar
              </button>
            )}
          </div>
          <p className="text-sm text-slate-500">
            {filteredClinicas.length} clínica{filteredClinicas.length !== 1 ? 's' : ''} encontrada{filteredClinicas.length !== 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-3xl border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/80">
          <CardTitle className="text-2xl text-slate-950">Clínicas Cadastradas</CardTitle>
          <CardDescription>Visão central da rede com dados fiscais, localização e status de cada unidade.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader className="h-8 w-8 animate-spin text-[hsl(var(--primary))]" />
            </div>
          ) : filteredClinicas.length === 0 ? (
            <div className="text-center p-12">
              <Building2 className="mx-auto mb-3 h-12 w-12 text-slate-300" />
              <p className="text-slate-500">Nenhuma clínica encontrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left">
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Nome</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">CNPJ</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Email</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Telefone</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Localização</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Cadastro</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClinicas.map((clinic) => (
                    <tr key={clinic.id} className="border-b border-slate-100 transition hover:bg-slate-50/80">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {clinic.logo_url ? (
                            <img 
                              src={clinic.logo_url} 
                              alt={clinic.name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <Building2 className="h-8 w-8 text-slate-300" />
                          )}
                          <div className="space-y-1">
                            <p className="font-semibold text-slate-900">{clinic.name}</p>
                            <p className="text-xs text-slate-500">{clinic.fantasy_name || 'Sem nome fantasia'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-700">{clinic.cnpj || '-'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Mail className="h-4 w-4" />
                          <span className="text-sm">{clinic.email || '-'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Phone className="h-4 w-4" />
                          <span className="text-sm">{clinic.phone || '-'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-slate-600">
                          <MapPin className="h-4 w-4" />
                          <span className="text-sm">{clinic.city}, {clinic.state || '-'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(clinic.status)}`}>
                          {getStatusLabel(clinic.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {formatDate(clinic.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigate(`/clinica/administracao/clinicas/editar/${clinic.id}`)}
                            className="rounded-xl p-2 text-[hsl(var(--primary))] transition hover:bg-[hsl(var(--primary))]/10"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openDeleteDialog(clinic)}
                            className="rounded-xl p-2 text-red-600 transition hover:bg-red-50"
                            title="Deletar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open && !isDeleting) {
            setClinicaToDelete(null);
          }
        }}
        onConfirm={handleDelete}
        title="Excluir clínica"
        description={
          clinicaToDelete
            ? `Tem certeza que deseja excluir ${clinicaToDelete.name || 'esta clínica'}? Esta ação é irreversível e não pode ser desfeita.`
            : 'Confirme a exclusão da clínica selecionada.'
        }
        confirmText={isDeleting ? 'Excluindo...' : 'Excluir clínica'}
        confirmVariant="destructive"
        confirmDisabled={isDeleting}
      />
    </div>
  );
}
