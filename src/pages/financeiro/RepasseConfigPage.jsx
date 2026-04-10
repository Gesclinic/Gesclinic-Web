import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
import {
  listarConfigRepasse,
  salvarConfigRepasse,
  obterConfigRepasse,
} from '@/lib/medicalRepasseApi';
import { listProfessionals } from '@/lib/professionalsApi';

const RepasseConfigPage = () => {
  const { user } = useAuth();
  const { clinicId } = useClinicContext();

  const [profissionais, setProfissionais] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(null);
  const [sucesso, setSucesso] = useState(null);

  // Form state
  const [formMode, setFormMode] = useState('list'); // 'list', 'edit'
  const [formData, setFormData] = useState({
    professional_id: '',
    percentual_profissional: 70,
    percentual_clinica: 30,
    aplicar_imposto: true,
    aplicar_glosa: true,
    ativo: true,
  });

  useEffect(() => {
    carregarDados();
  }, [clinicId]);

  const carregarDados = async () => {
    if (!clinicId) return;

    setLoading(true);
    setErro(null);

    try {
      // Carregar profissionais
      const profs = await listProfessionals(clinicId);
      setProfissionais(profs || []);

      // Carregar configurações existentes
      const confs = await listarConfigRepasse(clinicId);
      setConfigs(confs || []);
    } catch (err) {
      setErro(err.message || 'Erro ao carregar dados');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditarConfig = async (professionalId) => {
    try {
      const config = await obterConfigRepasse(clinicId, professionalId);
      if (config) {
        setFormData(config);
      } else {
        setFormData({
          professional_id: professionalId,
          percentual_profissional: 70,
          percentual_clinica: 30,
          aplicar_imposto: true,
          aplicar_glosa: true,
          ativo: true,
        });
      }
      setFormMode('edit');
    } catch (err) {
      setErro(err.message);
    }
  };

  const handleSalvarConfig = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErro(null);
    setSucesso(null);

    try {
      // Validar percentuais
      const pProf = parseFloat(formData.percentual_profissional || 70);
      const pClinica = parseFloat(formData.percentual_clinica || 30);
      
      if (pProf + pClinica !== 100) {
        setErro('A soma dos percentuais deve ser 100%');
        setLoading(false);
        return;
      }

      await salvarConfigRepasse(clinicId, formData.professional_id, {
        percentual_profissional: pProf,
        percentual_clinica: pClinica,
        aplicar_imposto: formData.aplicar_imposto,
        aplicar_glosa: formData.aplicar_glosa,
        ativo: formData.ativo,
      });

      setSucesso('Configuração salva com sucesso!');
      setFormMode('list');
      await carregarDados();
    } catch (err) {
      setErro(err.message || 'Erro ao salvar configuração');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatarPercentual = (valor) => {
    return `${(valor || 0).toFixed(2)}%`;
  };

  const profissionalConfig = (profId) => {
    return configs.find((c) => c.professional_id === profId);
  };

  // ============================================
  // LISTAGEM
  // ============================================
  if (formMode === 'list') {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Cabeçalho */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Configurações de Repasse</h1>
            <p className="text-gray-600 mt-2">
              Defina os percentuais de repasse para cada profissional
            </p>
          </div>

          {/* Alertas */}
          {erro && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              ❌ {erro}
            </div>
          )}
          {sucesso && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
              ✅ {sucesso}
            </div>
          )}

          {/* Grid de profissionais */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profissionais.map((prof) => {
              const config = profissionalConfig(prof.id);
              return (
                <div
                  key={prof.id}
                  className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {prof.name}
                  </h3>

                  {config ? (
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-600">Para Profissional</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {formatarPercentual(config.percentual_profissional)}
                        </p>
                      </div>
                      <div className="border-t pt-3">
                        <p className="text-sm text-gray-600">Para Clínica</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {formatarPercentual(config.percentual_clinica)}
                        </p>
                      </div>
                      <div className="flex gap-2 pt-4">
                        <button
                          onClick={() => handleEditarConfig(prof.id)}
                          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                        >
                          Editar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600">Sem configuração</p>
                      <button
                        onClick={() => handleEditarConfig(prof.id)}
                        className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                      >
                        Configurar
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // FORMULÁRIO DE EDIÇÃO
  // ============================================
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Cabeçalho */}
        <div className="mb-8">
          <button
            onClick={() => setFormMode('list')}
            className="text-blue-600 hover:text-blue-900 mb-4"
          >
            ← Voltar
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            Editar Configuração de Repasse
          </h1>
        </div>

        {/* Alertas */}
        {erro && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            ❌ {erro}
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSalvarConfig} className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* Profissional */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Profissional
            </label>
            <div className="px-4 py-2 bg-gray-100 rounded border border-gray-300">
              {profissionais.find((p) => p.id === formData.professional_id)?.name || 'Selecionar'}
            </div>
          </div>

          {/* Percentual Profissional */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Percentual para o Profissional (%)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={formData.percentual_profissional}
              onChange={(e) => {
                const valor = parseFloat(e.target.value) || 0;
                setFormData({
                  ...formData,
                  percentual_profissional: valor,
                  percentual_clinica: 100 - valor,
                });
              }}
              className="w-full border border-gray-300 rounded px-4 py-2"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              O percentual da clínica será automaticamente 100 - {formData.percentual_profissional}%
            </p>
          </div>

          {/* Percentual Clínica */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Percentual para a Clínica (%)
            </label>
            <div className="px-4 py-2 bg-gray-100 rounded border border-gray-300">
              {formData.percentual_clinica?.toFixed(2) || 30}%
            </div>
          </div>

          {/* Checkboxes */}
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.aplicar_imposto}
                onChange={(e) =>
                  setFormData({ ...formData, aplicar_imposto: e.target.checked })
                }
                className="mr-3"
              />
              <span className="text-sm text-gray-700">
                Aplicar cálculo de impostos automaticamente
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.aplicar_glosa}
                onChange={(e) =>
                  setFormData({ ...formData, aplicar_glosa: e.target.checked })
                }
                className="mr-3"
              />
              <span className="text-sm text-gray-700">
                Aplicar glosa (descontos) automaticamente
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.ativo}
                onChange={(e) =>
                  setFormData({ ...formData, ativo: e.target.checked })
                }
                className="mr-3"
              />
              <span className="text-sm text-gray-700">
                Configuração ativa
              </span>
            </label>
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-6 border-t">
            <button
              type="button"
              onClick={() => setFormMode('list')}
              className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RepasseConfigPage;
