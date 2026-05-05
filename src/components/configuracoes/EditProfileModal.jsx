import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Save, Loader } from 'lucide-react';
import { updateProfile } from '@/lib/profilesApi';

export default function EditProfileModal({ profile, config, clinicId, onClose, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    id: profile.id,
    label: config.label,
    description: config.description,
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    if (!formData.label.trim()) {
      setError('Nome do perfil é obrigatório');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await updateProfile(profile.id, formData, clinicId);
      setSuccess(true);
      setTimeout(() => {
        onSaved();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Erro ao atualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-modal-overlay">
      <Card className="app-modal-shell app-modal-shell--compact bg-white overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-white border-b">
          <CardTitle>Editar Perfil: {config.label}</CardTitle>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Mensagens */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              ✓ Perfil atualizado com sucesso!
            </div>
          )}

          {/* Campo: Nome do Perfil */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nome do Perfil *
            </label>
            <input
              type="text"
              name="label"
              value={formData.label}
              onChange={handleChange}
              placeholder="Ex: Administrador"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">Identificação do perfil</p>
          </div>

          {/* Campo: Descrição */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Descrição</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Ex: Acesso completo ao sistema"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Descrição das responsabilidades deste perfil
            </p>
          </div>

          {/* Informações de Permissões */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 text-sm mb-3">Permissões Configuradas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {config.permissions.slice(0, 10).map((perm) => (
                <div key={perm} className="text-xs text-blue-700 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                  {perm}
                </div>
              ))}
              {config.permissions.length > 10 && (
                <div className="text-xs text-blue-600 italic col-span-2">
                  + {config.permissions.length - 10} permissão(ões) adicional(is)
                </div>
              )}
            </div>
          </div>

          {/* Informações de Módulos */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-900 text-sm mb-3">Módulos Acessíveis</h3>
            <div className="flex flex-wrap gap-2">
              {config.modules.map((module) => (
                <span
                  key={module}
                  className="inline-block bg-green-200 text-green-800 text-xs px-3 py-1 rounded-full"
                >
                  {module}
                </span>
              ))}
            </div>
          </div>

          {/* Nota sobre Permissões */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-xs text-yellow-800">
              <strong>ℹ️ Nota:</strong> As permissões deste perfil estão centralizadas em{' '}
              <code className="bg-yellow-100 px-2 py-1 rounded text-xs">
                src/lib/profilesApi.js
              </code>
              . Para modificar as permissões, edite a configuração na seção{' '}
              <code className="bg-yellow-100 px-2 py-1 rounded text-xs">PROFILES_CONFIG</code>.
            </p>
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Salvar Alterações
                </>
              )}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
