import React, { useState, useEffect } from 'react';
import { useClinicContext } from '@/contexts/ClinicContext';
import PageLayout from "@/components/ui/PageLayout";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PROFILES_CONFIG, listProfiles, countUsersByProfile, listUsersByProfile } from '@/lib/profilesApi';
import EditProfileModal from '@/components/configuracoes/EditProfileModal';
import { 
  Users, 
  Shield, 
  Lock, 
  CheckCircle2, 
  Eye, 
  Settings,
  ChevronRight,
  AlertCircle
} from 'lucide-react';

export default function PerfisUsuarioConfig() {
  const breadcrumbs = useBreadcrumbs([
    { label: "Clínica", path: "/clinica" },
    { label: "Configurações" },
    { label: "Perfis de Usuário" }
  ]);

  const { clinicId } = useClinicContext();
  const [profiles, setProfiles] = useState([]);
  const [userCounts, setUserCounts] = useState({});
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [profileUsers, setProfileUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState(null);

  useEffect(() => {
    loadProfiles();
  }, [clinicId]);

  useEffect(() => {
    if (selectedProfile) {
      loadProfileUsers(selectedProfile.id);
    }
  }, [selectedProfile]);

  const loadProfiles = async () => {
    if (!clinicId) return;
    setLoading(true);
    try {
      const data = await listProfiles(clinicId);
      setProfiles(data.length > 0 ? data : []);
      
      // Contar usuários por perfil
      const counts = {};
      for (const role of Object.keys(PROFILES_CONFIG)) {
        counts[role] = await countUsersByProfile(role, clinicId);
      }
      setUserCounts(counts);
    } catch (error) {
      console.error('Erro ao carregar perfis:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProfileUsers = async (roleId) => {
    if (!clinicId) return;
    try {
      const data = await listUsersByProfile(roleId, clinicId);
      setProfileUsers(data);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  };

  const ProfileCard = ({ profile, config }) => (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-lg ${
        selectedProfile?.id === profile.id ? 'ring-2 ring-blue-500' : ''
      }`}
      onClick={() => setSelectedProfile(profile)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{config.label}</CardTitle>
            <p className="text-sm text-gray-500 mt-1">{config.description}</p>
          </div>
          <Shield className={`w-6 h-6 ${config.color}`} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <Users className="w-4 h-4 text-gray-500" />
          <span className="font-medium">{userCounts[profile.id] || 0} usuário(s)</span>
        </div>
        
        <div className="bg-gray-50 rounded p-3 space-y-2">
          <div className="font-semibold text-sm text-gray-700">Módulos Acessíveis:</div>
          <div className="flex flex-wrap gap-1">
            {config.modules.map((module) => (
              <span key={module} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                {module}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-blue-50 rounded p-3">
          <div className="font-semibold text-sm text-blue-900 mb-2 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Permissões Ativas
          </div>
          <div className="text-xs text-blue-700">
            {config.permissions.length} permissão(ões) configurada(s)
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const PermissionCategory = ({ title, permissions, allPermissions }) => {
    const categoryPermissions = allPermissions.filter(p => p.startsWith(title.toLowerCase().replace(/\s/g, '_') + '.'));
    return (
      <div className="space-y-2">
        <h4 className="font-semibold text-sm text-gray-700">{title}</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {categoryPermissions.map((perm) => (
            <div key={perm} className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-gray-600">{perm.split('.')[1]?.replace(/_/g, ' ') || perm}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <PageLayout
      title="Configuração de Perfis de Usuário"
      subtitle="Gerencie os perfis, papéis e permissões dos usuários do sistema"
      breadcrumbs={breadcrumbs}
    >
      {/* Informações Gerais */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-900">
          <p className="font-semibold mb-1">Sobre Perfis e Permissões</p>
          <p>Os perfis determinam quais módulos e funcionalidades cada usuário pode acessar no sistema. Cada perfil possui um conjunto de permissões específicas que controlam as ações disponíveis.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Perfis */}
        <div className="lg:col-span-2">
          <div className="space-y-4">
            {loading ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="text-gray-500 mt-3">Carregando perfis...</p>
                </CardContent>
              </Card>
            ) : (
              Object.entries(PROFILES_CONFIG).map(([key, config]) => (
                <ProfileCard 
                  key={key} 
                  profile={{ id: key }} 
                  config={config}
                />
              ))
            )}
          </div>
        </div>

        {/* Detalhes do Perfil Selecionado */}
        <div className="lg:col-span-1">
          {selectedProfile ? (
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="text-base">
                  {PROFILES_CONFIG[selectedProfile.id]?.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Estatísticas */}
                <div className="space-y-2">
                  <div className="text-sm">
                    <p className="text-gray-600">Usuários Ativos</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {userCounts[selectedProfile.id] || 0}
                    </p>
                  </div>
                </div>

                {/* Descrição */}
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-1">Descrição</p>
                  <p className="text-sm text-gray-600">
                    {PROFILES_CONFIG[selectedProfile.id]?.description}
                  </p>
                </div>

                {/* Usuários do Perfil */}
                {profileUsers.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-700 mb-2">Usuários ({profileUsers.length})</p>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {profileUsers.map((user) => (
                        <div key={user.id} className="text-xs p-1 bg-gray-50 rounded">
                          <p className="font-medium text-gray-800">{user.full_name || user.email}</p>
                          <p className="text-gray-500">{user.email}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Módulos */}
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-2">Módulos Acessíveis</p>
                  <div className="flex flex-wrap gap-1">
                    {PROFILES_CONFIG[selectedProfile.id]?.modules.map((module) => (
                      <span key={module} className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                        {module}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Ações */}
                <div className="pt-2 border-t space-y-2">
                  <button className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm font-medium transition">
                    <Eye className="w-4 h-4" />
                    Ver Permissões
                  </button>
                  <button
                    onClick={() => setEditingProfile(selectedProfile.id)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium transition"
                  >
                    <Settings className="w-4 h-4" />
                    Editar Perfil
                  </button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Selecione um perfil para ver os detalhes</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Seção de Permissões Detalhadas */}
      {selectedProfile && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Permissões de {PROFILES_CONFIG[selectedProfile.id]?.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <PermissionCategory 
                title="Dashboard" 
                permissions={['visualizar']}
                allPermissions={PROFILES_CONFIG[selectedProfile.id]?.permissions || []}
              />
              <PermissionCategory 
                title="Agenda" 
                permissions={['visualizar', 'criar', 'editar', 'deletar', 'confirmacao', 'lista_espera', 'relatorios', 'notificacoes']}
                allPermissions={PROFILES_CONFIG[selectedProfile.id]?.permissions || []}
              />
              <PermissionCategory 
                title="Pacientes" 
                permissions={['visualizar', 'criar', 'editar', 'deletar', 'documentos', 'historico']}
                allPermissions={PROFILES_CONFIG[selectedProfile.id]?.permissions || []}
              />
              <PermissionCategory 
                title="Profissionais" 
                permissions={['visualizar', 'criar', 'editar', 'deletar']}
                allPermissions={PROFILES_CONFIG[selectedProfile.id]?.permissions || []}
              />
              <PermissionCategory 
                title="Financeiro" 
                permissions={['dashboard', 'contas_pagar', 'contas_receber', 'fluxo_caixa', 'plano_contas', 'centro_custos', 'conciliacao', 'automacao', 'repasse_medico']}
                allPermissions={PROFILES_CONFIG[selectedProfile.id]?.permissions || []}
              />
              <PermissionCategory 
                title="Estoque" 
                permissions={['dashboard', 'produtos', 'categorias', 'fornecedores', 'movimentacoes', 'transferencias', 'requisicoes', 'inventario', 'relatorios']}
                allPermissions={PROFILES_CONFIG[selectedProfile.id]?.permissions || []}
              />
              <PermissionCategory 
                title="Faturamento" 
                permissions={['visualizar', 'criar', 'editar']}
                allPermissions={PROFILES_CONFIG[selectedProfile.id]?.permissions || []}
              />
              <PermissionCategory 
                title="Atendimento" 
                permissions={['visualizar', 'criar', 'editar']}
                allPermissions={PROFILES_CONFIG[selectedProfile.id]?.permissions || []}
              />
              <PermissionCategory 
                title="Configurações" 
                permissions={['gerais', 'perfis', 'permissoes', 'agenda', 'conta', 'faturamento', 'estoque']}
                allPermissions={PROFILES_CONFIG[selectedProfile.id]?.permissions || []}
              />
              <PermissionCategory 
                title="Administração" 
                permissions={['usuarios', 'clinicas']}
                allPermissions={PROFILES_CONFIG[selectedProfile.id]?.permissions || []}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabela Resumida de Permissões */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Resumo de Acesso por Perfil</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-semibold text-gray-700">Módulo</th>
                  {/* Ordem fixa dos perfis para garantir consistência */}
                  {['admin', 'financeiro', 'recepcao', 'profissional', 'estoque', 'faturamento'].map((key) => {
                    const config = PROFILES_CONFIG[key];
                    return config ? (
                      <th key={key} className="text-center py-2 px-3 font-semibold text-gray-700">
                        {config.label}
                      </th>
                    ) : null;
                  })}
                </tr>
              </thead>
              <tbody>
                {[
                  { module: 'Dashboard', key: 'dashboard' },
                  { module: 'Agenda', key: 'agenda' },
                  { module: 'Pacientes', key: 'pacientes' },
                  { module: 'Profissionais', key: 'profissionais' },
                  { module: 'Financeiro', key: 'financeiro' },
                  { module: 'Estoque', key: 'estoque' },
                  { module: 'Faturamento', key: 'faturamento' },
                  { module: 'Configurações', key: 'configuracoes' },
                  { module: 'Administração', key: 'administracao' },
                  { module: 'Atendimento', key: 'atendimento' }
                ].map((item) => (
                  <tr key={item.key} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-3 font-medium text-gray-700">{item.module}</td>
                    {/* Ordem fixa dos perfis */}
                    {['admin', 'financeiro', 'recepcao', 'profissional', 'estoque', 'faturamento'].map((key) => {
                      const config = PROFILES_CONFIG[key];
                      return config ? (
                        <td key={key} className="text-center py-2 px-3">
                          {config.modules.includes(item.module) ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-gray-300 mx-auto"></div>
                          )}
                        </td>
                      ) : null;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Edição */}
      {editingProfile && (
        <EditProfileModal
          profile={{ id: editingProfile }}
          config={PROFILES_CONFIG[editingProfile]}
          clinicId={clinicId}
          onClose={() => setEditingProfile(null)}
          onSaved={loadProfiles}
        />
      )}
    </PageLayout>
  );
}

