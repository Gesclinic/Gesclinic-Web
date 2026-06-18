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
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Eye,
  MoreVertical,
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

      if (error) {
        throw error;
      }

      setClinicas(data || []);

      // Calcular estatísticas
      const stats = {
        total: data?.length || 0,
        ativas: data?.filter((c) => c.status === 'active' || !c.status).length || 0,
        inativas: data?.filter((c) => c.status === 'inactive').length || 0,
      };
      setStats(stats);
    } catch (error) {
      console.error('Erro ao carregar clínicas:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar clínicas',
        description: error.message || 'Não foi possível buscar as clínicas agora.',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      suspended: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-green-100 text-green-800'; // Padrão: ativa
  };

  const getStatusLabel = (status) => {
    const labels = {
      active: 'Ativa',
      inactive: 'Inativa',
      suspended: 'Suspensa',
    };
    return labels[status] || 'Ativa'; // Padrão: Ativa
  };

  const filteredClinicas = clinicas.filter((clinic) => {
    const matchSearch =
      clinic.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clinic.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clinic.city?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch;
  });

  const openDeleteDialog = (clinic) => {
    setClinicaToDelete(clinic);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!clinicaToDelete) {
      return;
    }

    setIsDeleting(true);

    try {
      // Deletar clínica
      const { error } = await supabase.from('clinics').delete().eq('id', clinicaToDelete.id);

      if (error) {
        throw error;
      }

      // Recarregar lista
      await loadClinicas();
      toast({
        title: 'Clínica excluída',
        description: `${clinicaToDelete.name || 'A clínica selecionada'} foi removida com sucesso.`,
      });
    } catch (error) {
      console.error('Erro ao deletar clínica:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir clínica',
        description: error.message || 'Tente novamente em alguns instantes.',
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setClinicaToDelete(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) {
      return '-';
    }
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className={embedded ? 'space-y-6' : 'min-h-screen bg-slate-50 p-6'}>
      <Helmet>
        <title>Gerenciamento de Clínicas - Gesclinic</title>
        <meta name="description" content="Página para gerenciar clínicas do sistema." />
      </Helmet>

      <div className="flex flex-col gap-6 rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-50 p-8 shadow-sm md:flex-row md:items-center md:justify-between">
        {!embedded && (
          <button
            onClick={() => navigate('/clinica')}
            className="inline-flex items-center gap-2 w-fit rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
        )}

        <div className="flex flex-1 flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[hsl(var(--primary))]/10 to-blue-100 px-4 py-1.5">
              <span className="h-2 w-2 rounded-full bg-[hsl(var(--primary))]" />
              <span className="text-xs font-semibold uppercase tracking-widest text-[hsl(var(--primary))]">
                Gerenciamento
              </span>
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-950">Clínicas</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Administre todas as unidades da sua rede de saúde com dados fiscais, contatos e
                status em tempo real.
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/clinica/administracao/clinicas/nova')}
            className="flex w-fit items-center gap-2 rounded-xl bg-gradient-to-r from-[hsl(var(--primary))] to-blue-600 px-6 py-3 font-semibold text-white shadow-lg shadow-[hsl(var(--primary))]/30 transition hover:shadow-xl hover:shadow-[hsl(var(--primary))]/40"
          >
            <Plus className="h-5 w-5" />
            Nova Clínica
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 shadow-sm transition hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Total de Clínicas
              </p>
              <p className="mt-2 text-4xl font-bold text-slate-950">{stats.total}</p>
              <p className="mt-1 text-xs text-slate-600">Unidades cadastradas</p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100">
              <Building2 className="h-7 w-7 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-white p-6 shadow-sm transition hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-green-600">
                Clínicas Ativas
              </p>
              <p className="mt-2 text-4xl font-bold text-green-700">{stats.ativas}</p>
              <p className="mt-1 text-xs text-green-600">Operando normalmente</p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-green-100">
              <CheckCircle2 className="h-7 w-7 text-green-600" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-6 shadow-sm transition hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                Clínicas Inativas
              </p>
              <p className="mt-2 text-4xl font-bold text-amber-700">{stats.inativas}</p>
              <p className="mt-1 text-xs text-amber-600">Requer atenção</p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-amber-100">
              <AlertCircle className="h-7 w-7 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      <Card className="rounded-3xl border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/80">
          <CardTitle className="text-2xl text-slate-950">Filtrar e Buscar</CardTitle>
          <CardDescription>
            Pesquise por nome, email ou cidade para localizar rapidamente a clínica desejada.
          </CardDescription>
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
            {filteredClinicas.length} clínica{filteredClinicas.length !== 1 ? 's' : ''} encontrada
            {filteredClinicas.length !== 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-3xl border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/80">
          <CardTitle className="text-2xl text-slate-950">Clínicas Cadastradas</CardTitle>
          <CardDescription>
            Visualize, edite ou delete clínicas com interface moderna e intuitiva.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <Loader className="mx-auto mb-4 h-10 w-10 animate-spin text-[hsl(var(--primary))]" />
                <p className="text-slate-600">Carregando clínicas...</p>
              </div>
            </div>
          ) : filteredClinicas.length === 0 ? (
            <div className="text-center py-16">
              <Building2 className="mx-auto mb-4 h-16 w-16 text-slate-200" />
              <h3 className="text-lg font-semibold text-slate-900">Nenhuma clínica encontrada</h3>
              <p className="mt-1 text-slate-600">Crie uma nova clínica para começar.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredClinicas.map((clinic) => (
                <div
                  key={clinic.id}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-[hsl(var(--primary))]/40 hover:shadow-md"
                >
                  {/* Banner superior colorido */}
                  <div className="relative h-2 bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary))]/50" />

                  {/* Cabeçalho do card */}
                  <div className="flex items-start gap-4 p-5 pb-4">
                    {/* Logo */}
                    <div className="flex-shrink-0">
                      {clinic.logo_url ? (
                        <img
                          src={clinic.logo_url}
                          alt={clinic.name}
                          className="h-14 w-14 rounded-xl object-contain border border-slate-100 bg-slate-50 p-1"
                        />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[hsl(var(--primary))]/10 border border-[hsl(var(--primary))]/20">
                          <Building2 className="h-7 w-7 text-[hsl(var(--primary))]" />
                        </div>
                      )}
                    </div>

                    {/* Nome + Status */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-bold text-slate-900 leading-tight group-hover:text-[hsl(var(--primary))] line-clamp-2">
                            {clinic.name}
                          </h3>
                          {clinic.fantasy_name && clinic.fantasy_name !== clinic.name && (
                            <p className="mt-0.5 truncate text-xs text-slate-500">
                              {clinic.fantasy_name}
                            </p>
                          )}
                        </div>
                        <span
                          className={`flex-shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                            clinic.status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : clinic.status === 'inactive'
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {clinic.status === 'active' ? '● Ativa' : clinic.status === 'inactive' ? 'Inativa' : 'Suspensa'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Dados em grid compacto */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-slate-100 px-5 py-4">
                    {clinic.email && (
                      <div className="col-span-2 flex items-center gap-2 min-w-0">
                        <Mail className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                        <span className="truncate text-xs text-slate-600">{clinic.email}</span>
                      </div>
                    )}
                    {clinic.phone && (
                      <div className="flex items-center gap-2 min-w-0">
                        <Phone className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                        <span className="truncate text-xs text-slate-600">{clinic.phone}</span>
                      </div>
                    )}
                    {(clinic.city || clinic.state) && (
                      <div className="flex items-center gap-2 min-w-0">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                        <span className="truncate text-xs text-slate-600">
                          {[clinic.city, clinic.state].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}
                    {clinic.cnpj && (
                      <div className="col-span-2 flex items-center gap-2 min-w-0">
                        <Building2 className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                        <span className="truncate text-xs font-mono text-slate-600">{clinic.cnpj}</span>
                      </div>
                    )}
                  </div>

                  {/* Rodapé com ações */}
                  <div className="flex gap-2 border-t border-slate-100 px-5 py-3">
                    <button
                      onClick={() => navigate(`/clinica/administracao/clinicas/editar/${clinic.id}`)}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-[hsl(var(--primary))]/5 px-3 py-2 text-xs font-semibold text-[hsl(var(--primary))] transition hover:bg-[hsl(var(--primary))]/15 border border-[hsl(var(--primary))]/20"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      Editar
                    </button>
                    <button
                      onClick={() => openDeleteDialog(clinic)}
                      className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-red-500 transition hover:bg-red-50 border border-transparent hover:border-red-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
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
