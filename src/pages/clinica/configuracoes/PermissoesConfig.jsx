import React, { useState, useEffect } from 'react';
import { useClinicContext } from '@/contexts/ClinicContext';
import PageLayout from "@/components/ui/PageLayout";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PERMISSIONS_BY_MODULE, listUserPermissions, grantPermission, revokePermission } from '@/lib/permissionsApi';
import { 
  CheckCircle2,
  XCircle,
  Lock,
  Unlock,
  AlertCircle,
  Search,
  Filter,
  Copy,
  Trash2,
  X
} from 'lucide-react';

export default function PermissoesConfig() {
  const breadcrumbs = useBreadcrumbs([
    { label: "Clínica", path: "/clinica" },
    { label: "Configurações" },
    { label: "Permissões" }
  ]);

  const { clinicId } = useClinicContext();
  const [selectedModule, setSelectedModule] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  // Estados para seleção de permissões
  const [selectedPermissions, setSelectedPermissions] = useState([]);

  const modules = Object.entries(PERMISSIONS_BY_MODULE);

  const handlePermissionToggle = (permissionId) => {
    setSelectedPermissions(prev => {
      if (prev.includes(permissionId)) {
        return prev.filter(id => id !== permissionId);
      } else {
        return [...prev, permissionId];
      }
    });
  };

  const handleSelectModule = (moduleName) => {
    const module = PERMISSIONS_BY_MODULE[moduleName];
    const allPermissions = module.permissions.map(p => p.id);
    setSelectedPermissions(allPermissions);
  };

  const handleDeselectModule = (moduleName) => {
    const module = PERMISSIONS_BY_MODULE[moduleName];
    const modulePermissions = module.permissions.map(p => p.id);
    setSelectedPermissions(prev => prev.filter(p => !modulePermissions.includes(p)));
  };

  const clearAllPermissions = () => {
    setSelectedPermissions([]);
  };

  const copyToClipboard = () => {
    const permissionsList = selectedPermissions.join('\n');
    navigator.clipboard.writeText(permissionsList);
  };

  // Filtrar módulos baseado no termo de busca
  const filteredModules = modules.filter(([key, module]) =>
    module.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    module.permissions.some(p => 
      p.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const PermissionItem = ({ permission, isSelected, onToggle }) => (
    <div 
      onClick={() => onToggle(permission.id)}
      className={`p-3 rounded-lg border cursor-pointer transition ${
        isSelected 
          ? 'bg-green-50 border-green-300' 
          : 'bg-gray-50 border-gray-200 hover:border-blue-300'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-1">
          {isSelected ? (
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
          ) : (
            <div className="w-5 h-5 rounded border border-gray-300"></div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 text-sm">{permission.label}</p>
          <p className="text-xs text-gray-500 mt-1">{permission.description}</p>
          <code className="inline-block mt-2 bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded">
            {permission.id}
          </code>
        </div>
      </div>
    </div>
  );

  return (
    <PageLayout
      title="Configurações de Permissões"
      subtitle="Gerencie permissões e acessos dos usuários por módulo"
      breadcrumbs={breadcrumbs}
    >
      {/* Informações */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-900">
          <p className="font-semibold mb-1">Sistema de Permissões</p>
          <p>As permissões são organizadas por módulo e controlam quais ações cada usuário pode executar. Selecione as permissões desejadas e atribua-as aos usuários conforme necessário.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Painel de Seleção */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="text-base">Seleção de Permissões</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Estatísticas */}
              <div className="space-y-2">
                <div className="text-sm">
                  <p className="text-gray-600 text-xs font-semibold">SELECIONADAS</p>
                  <p className="text-3xl font-bold text-blue-600">{selectedPermissions.length}</p>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="space-y-2 pt-3 border-t">
                <button
                  onClick={copyToClipboard}
                  disabled={selectedPermissions.length === 0}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Copy className="w-4 h-4" />
                  Copiar IDs
                </button>
                <button
                  onClick={clearAllPermissions}
                  disabled={selectedPermissions.length === 0}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <XCircle className="w-4 h-4" />
                  Limpar
                </button>
              </div>

              {/* Lista de Selecionadas */}
              {selectedPermissions.length > 0 && (
                <div className="pt-3 border-t">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Permissões Selecionadas:</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {selectedPermissions.map((perm) => (
                      <div key={perm} className="text-xs p-1 bg-green-50 rounded flex items-center justify-between">
                        <span className="text-green-700 font-medium truncate">{perm}</span>
                        <button
                          onClick={() => handlePermissionToggle(perm)}
                          className="text-green-600 hover:text-green-800 ml-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Lista de Módulos e Permissões */}
        <div className="lg:col-span-3">
          {/* Barra de Busca */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar módulo ou permissão..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Módulos */}
          <div className="space-y-6">
            {filteredModules.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Filter className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Nenhum módulo encontrado</p>
                </CardContent>
              </Card>
            ) : (
              filteredModules.map(([moduleName, module]) => {
                const modulePermissions = module.permissions.map(p => p.id);
                const allModuleSelected = modulePermissions.every(p => selectedPermissions.includes(p));
                const someModuleSelected = modulePermissions.some(p => selectedPermissions.includes(p));

                return (
                  <Card key={moduleName}>
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="text-blue-600">
                          {/* Icon placeholder */}
                          <Lock className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-lg">{module.label}</CardTitle>
                          <p className="text-xs text-gray-500 mt-1">
                            {module.permissions.length} permissão(ões)
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {someModuleSelected && (
                          <button
                            onClick={() => handleDeselectModule(moduleName)}
                            className="px-3 py-1 text-xs font-medium text-orange-700 bg-orange-100 rounded hover:bg-orange-200 transition"
                          >
                            Desselecionar
                          </button>
                        )}
                        {!allModuleSelected && (
                          <button
                            onClick={() => handleSelectModule(moduleName)}
                            className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded hover:bg-blue-200 transition"
                          >
                            Selecionar Todas
                          </button>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {module.permissions.map((permission) => (
                          <PermissionItem
                            key={permission.id}
                            permission={permission}
                            isSelected={selectedPermissions.includes(permission.id)}
                            onToggle={handlePermissionToggle}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Resumo */}
      {selectedPermissions.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Resumo de Permissões Selecionadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {modules.map(([moduleName, module]) => {
                const modulePermissions = module.permissions.map(p => p.id);
                const selectedCount = modulePermissions.filter(p => selectedPermissions.includes(p)).length;

                if (selectedCount === 0) return null;

                return (
                  <div key={moduleName} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="font-semibold text-green-900 text-sm mb-2">{module.label}</p>
                    <p className="text-xs text-green-700">
                      {selectedCount} de {module.permissions.length} permissão(ões) selecionada(s)
                    </p>
                    <div className="mt-2 w-full bg-green-200 rounded-full h-1.5">
                      <div
                        className="bg-green-600 h-1.5 rounded-full transition-all"
                        style={{ width: `${(selectedCount / module.permissions.length) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </PageLayout>
  );
}

