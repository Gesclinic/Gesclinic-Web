import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import ConfirmationDialog from '@/components/clinica/ConfirmationDialog';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { PROFILES_CONFIG } from '@/lib/profilesApi';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Mail,
  Shield,
  Building,
  Users,
  Loader,
  ArrowLeft,
} from 'lucide-react';

export default function Usuarios({ embedded = false }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [usuarioToDelete, setUsuarioToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    roles: {},
  });

  useEffect(() => {
    loadUsuarios();
  }, []);

  const loadUsuarios = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name, username, cpf, birthdate, role, created_at, clinic_id')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setUsuarios(data || []);

      // Calcular estatísticas
      const roleCounts = Object.keys(PROFILES_CONFIG).reduce((accumulator, roleId) => {
        accumulator[roleId] = data?.filter((user) => user.role === roleId).length || 0;
        return accumulator;
      }, {});

      roleCounts.clinico =
        data?.filter((user) => user.role === 'medico' || user.role === 'profissional').length || 0;

      const stats = {
        total: data?.length || 0,
        roles: roleCounts,
      };
      setStats(stats);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar usuários',
        description: error.message || 'Não foi possível buscar os usuários agora.',
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (role) => {
    const colors = {
      admin: 'bg-red-100 text-red-800',
      gestor: 'bg-indigo-100 text-indigo-800',
      financeiro: 'bg-green-100 text-green-800',
      recepcao: 'bg-blue-100 text-blue-800',
      medico: 'bg-teal-100 text-teal-800',
      profissional: 'bg-purple-100 text-purple-800',
      enfermeiro: 'bg-cyan-100 text-cyan-800',
      tecnico_enfermagem: 'bg-sky-100 text-sky-800',
      multiprofissional: 'bg-violet-100 text-violet-800',
      contabilidade: 'bg-emerald-100 text-emerald-800',
      estoque: 'bg-orange-100 text-orange-800',
      faturamento: 'bg-amber-100 text-amber-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const getRoleLabel = (role) => {
    const labels = {
      admin: 'Administrador',
      gestor: 'Gestor',
      financeiro: 'Financeiro',
      recepcao: 'Recepção',
      medico: 'Médico',
      profissional: 'Profissional',
      enfermeiro: 'Enfermeiro',
      tecnico_enfermagem: 'Técnico de Enfermagem',
      multiprofissional: 'Multiprofissional',
      contabilidade: 'Contabilidade',
      estoque: 'Estoque',
      faturamento: 'Faturamento',
      clinico: 'Clínico',
    };
    return labels[role] || role;
  };

  const filteredUsuarios = usuarios.filter((user) => {
    const matchSearch =
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = !filterRole || user.role === filterRole;
    return matchSearch && matchRole;
  });

  const openDeleteDialog = (usuario) => {
    setUsuarioToDelete(usuario);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!usuarioToDelete) {
      return;
    }

    setIsDeleting(true);

    try {
      // Buscar dados do usuário antes de deletar
      const { data: userData } = await supabase
        .from('users')
        .select('email, clinic_id, role')
        .eq('id', usuarioToDelete.id)
        .single();

      // Deletar permissões primeiro
      await supabase.from('user_permissions').delete().eq('user_id', usuarioToDelete.id);

      // Depois deletar o usuário
      const { error } = await supabase.from('users').delete().eq('id', usuarioToDelete.id);

      if (error) {
        throw error;
      }

      // 🔗 Se era profissional, deletar também de professionals
      if (userData?.role === 'profissional' && userData?.email) {
        console.log('🔗 [INTEGRAÇÃO] Deletando profissional:', userData.email);
        const { error: profError } = await supabase
          .from('professionals')
          .delete()
          .eq('email', userData.email)
          .eq('clinic_id', userData.clinic_id);

        if (profError) {
          console.warn('⚠️ [INTEGRAÇÃO] Aviso ao deletar profissional:', profError.message);
        } else {
          console.log('✅ [INTEGRAÇÃO] Profissional deletado com sucesso');
        }
      }

      // Recarregar dados completos
      await loadUsuarios();
      toast({
        title: 'Usuário excluído',
        description: `${usuarioToDelete.full_name || 'O usuário selecionado'} foi removido com sucesso.`,
      });
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir usuário',
        description: error.message || 'Tente novamente em alguns instantes.',
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setUsuarioToDelete(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) {
      return '-';
    }
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <div className={embedded ? 'space-y-6' : 'min-h-screen bg-slate-50 p-6'}>
      <Helmet>
        <title>Gerenciamento de Usuários - Gesclinic</title>
        <meta name="description" content="Página para gerenciar usuários e permissões." />
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
              <h1
                className={
                  embedded
                    ? 'text-3xl font-bold tracking-tight text-slate-950'
                    : 'text-4xl font-bold tracking-tight text-slate-950'
                }
              >
                Usuários
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Gerencie acessos, perfis e vínculos de forma centralizada no mesmo padrão visual do
                restante da área administrativa.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate('/clinica/administracao/usuarios/sincronizar')}
              className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-500 px-4 py-3 font-semibold text-white transition hover:bg-amber-600"
              title="Crie registros de profissionais para usuários profissionais"
            >
              <Users className="h-5 w-5" />
              Sincronizar Profissionais
            </button>
            <button
              onClick={() => navigate('/clinica/administracao/usuarios/novo')}
              className="flex items-center gap-2 rounded-2xl bg-[hsl(var(--primary))] px-4 py-3 font-semibold text-white transition hover:opacity-95"
            >
              <Plus className="h-5 w-5" />
              Novo Usuário
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Total
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-950">{stats.total}</p>
              </div>
              <Users className="h-10 w-10 text-[hsl(var(--primary))] opacity-20" />
            </div>
          </CardContent>
        </Card>

        {Object.keys(PROFILES_CONFIG).map((roleId) => {
          const config = PROFILES_CONFIG[roleId];
          const count = stats.roles?.[roleId] ?? 0;

          return (
            <Card key={roleId} className={`rounded-3xl border-slate-200 shadow-sm ${config.bgClass || ''}`}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {config.label}
                    </p>
                    <p className={`mt-2 text-3xl font-bold ${config.colorClass || 'text-slate-900'}`}>
                      {count}
                    </p>
                  </div>
                  <span className={`${config.colorClass || 'text-slate-400'} opacity-20`}>
                    <Shield className="h-10 w-10" />
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="rounded-3xl border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/80">
          <CardTitle className="text-2xl text-slate-950">Filtrar e Buscar</CardTitle>
          <CardDescription>
            Refine a lista por nome, email ou perfil para encontrar rapidamente o usuário certo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[hsl(var(--primary))] focus:ring-4 focus:ring-[hsl(var(--primary))]/10"
                />
              </div>
            </div>

            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[hsl(var(--primary))] focus:ring-4 focus:ring-[hsl(var(--primary))]/10"
            >
              <option value="">Todos os perfis</option>
              {Object.values(PROFILES_CONFIG).map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.label}
                </option>
              ))}
            </select>

            {(searchTerm || filterRole) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterRole('');
                }}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Limpar
              </button>
            )}
          </div>
          <p className="text-sm text-slate-500">
            {filteredUsuarios.length} usuário{filteredUsuarios.length !== 1 ? 's' : ''} encontrado
            {filteredUsuarios.length !== 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-3xl border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/80">
          <CardTitle className="text-2xl text-slate-950">Usuários Cadastrados</CardTitle>
          <CardDescription>
            Lista completa com dados de acesso e atalhos de manutenção.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader className="h-8 w-8 animate-spin text-[hsl(var(--primary))]" />
            </div>
          ) : filteredUsuarios.length === 0 ? (
            <div className="text-center p-12">
              <Users className="mx-auto mb-3 h-12 w-12 text-slate-300" />
              <p className="text-slate-500">Nenhum usuário encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left">
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Nome
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Login
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      CPF
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Email
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Perfil
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Cadastro
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsuarios.map((usuario) => (
                    <tr
                      key={usuario.id}
                      className="border-b border-slate-100 transition hover:bg-slate-50/80"
                    >
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="font-semibold text-slate-900 truncate max-w-[220px]">
                            {usuario.full_name || '-'}
                          </p>
                          <p className="text-xs text-slate-500">ID: {usuario.id.slice(0, 8)}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-700">{usuario.username || '-'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-700">{usuario.cpf || '-'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Mail className="h-4 w-4" />
                          <span className="text-sm truncate max-w-[240px]">{usuario.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getRoleColor(usuario.role)}`}
                        >
                          {getRoleLabel(usuario.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {formatDate(usuario.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() =>
                              navigate(`/clinica/administracao/usuarios/editar/${usuario.id}`)
                            }
                            className="rounded-xl p-2 text-[hsl(var(--primary))] transition hover:bg-[hsl(var(--primary))]/10"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openDeleteDialog(usuario)}
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
            setUsuarioToDelete(null);
          }
        }}
        onConfirm={handleDelete}
        title="Excluir usuário"
        description={
          usuarioToDelete
            ? `Tem certeza que deseja excluir ${usuarioToDelete.full_name || 'este usuário'}?${usuarioToDelete.role === 'profissional' ? ' O profissional vinculado também será removido.' : ''} Esta ação não pode ser desfeita.`
            : 'Confirme a exclusão do usuário selecionado.'
        }
        confirmText={isDeleting ? 'Excluindo...' : 'Excluir usuário'}
        confirmVariant="destructive"
        confirmDisabled={isDeleting}
      />
    </div>
  );
}
