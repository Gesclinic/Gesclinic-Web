
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
import { listarRepassesPeriodo } from '@/lib/medicalRepasseApi';
import { listProfessionals } from '@/lib/professionalsApi';

const RepasseAjustePage = () => {
  const { user } = useAuth();
  const { clinicId } = useClinicContext();

  const [ajustes, setAjustes] = useState([]);
  const [repasses, setRepasses] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  
  const [formData, setFormData] = useState({
    repasse_id: '',
    valor_ajuste: '',
    motivo: '',
  });
  
  const [erro, setErro] = useState(null);
  const [sucesso, setSucesso] = useState(null);
  const [loading, setLoading] = useState(false);

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

      // Carregar repasses do último ano
      const dataInicio = new Date();
      dataInicio.setFullYear(dataInicio.getFullYear() - 1);
      const dataInicioStr = dataInicio.toISOString().split('T')[0];
      const dataFimStr = new Date().toISOString().split('T')[0];

      const reps = await listarRepassesPeriodo(clinicId, dataInicioStr, dataFimStr);
      setRepasses(reps || []);

      // Carregar ajustes
      const { data: ajustesData, error: ajustesError } = await supabase
        .from('repasse_ajuste')
        .select('*')
        .order('created_at', { ascending: false });

      if (!ajustesError) {
        setAjustes(ajustesData || []);
      }
    } catch (err) {
      setErro(err.message || 'Erro ao carregar dados');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAjuste = async (e) => {
    e.preventDefault();
    setErro(null);
    setSucesso(null);
    setLoading(true);

    try {
      if (!formData.repasse_id || !formData.valor_ajuste || !formData.motivo) {
        throw new Error('Preencha todos os campos obrigatórios');
      }

      const { error: insertError } = await supabase
        .from('repasse_ajuste')
        .insert([
          {
            repasse_id: formData.repasse_id,
            valor_ajuste: parseFloat(formData.valor_ajuste),
            motivo: formData.motivo,
            usuario_id: user?.id,
          },
        ]);

      if (insertError) throw insertError;

      setSucesso('Ajuste registrado com sucesso!');
      setFormData({ repasse_id: '', valor_ajuste: '', motivo: '' });
      
      // Recarregar dados
      await carregarDados();
    } catch (err) {
      setErro(err.message || 'Erro ao registrar ajuste');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor || 0);
  };

  const getProfissionalNome = (profId) => {
    return profissionais.find((p) => p.id === profId)?.name || 'N/A';
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Cabeçalho */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Ajustes de Repasse</h1>
          <p className="text-gray-600 mt-2">
            Registro de ajustes, correções e adaptações em repassos
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulário */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-6">Novo Ajuste</h2>

              <form onSubmit={handleAjuste} className="space-y-4">
                {/* Seleção de Repasse */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Repasse *
                  </label>
                  <select
                    value={formData.repasse_id}
                    onChange={(e) =>
                      setFormData({ ...formData, repasse_id: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    required
                  >
                    <option value="">Selecione um repasse</option>
                    {repasses.map((rep) => (
                      <option key={rep.id} value={rep.id}>
                        {getProfissionalNome(rep.professional_id)} - {rep.periodo_inicio} a{' '}
                        {rep.periodo_fim} ({formatarMoeda(rep.valor_profissional)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Valor do Ajuste */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valor do Ajuste (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.valor_ajuste}
                    onChange={(e) =>
                      setFormData({ ...formData, valor_ajuste: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="0.00"
                    required
                  />
                </div>

                {/* Motivo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Motivo do Ajuste *
                  </label>
                  <textarea
                    value={formData.motivo}
                    onChange={(e) =>
                      setFormData({ ...formData, motivo: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    rows="4"
                    placeholder="Descreva o motivo do ajuste..."
                    required
                  />
                </div>

                {/* Botões */}
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Registrando...' : 'Registrar Ajuste'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Histórico de Ajustes */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold">Histórico de Ajustes</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                        Data
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                        Profissional
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">
                        Valor
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                        Motivo
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ajustes.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-4 text-gray-600 px-6">
                          Nenhum ajuste registrado
                        </td>
                      </tr>
                    ) : (
                      ajustes.map((ajuste) => {
                        const repasse = repasses.find((r) => r.id === ajuste.repasse_id);
                        return (
                          <tr key={ajuste.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {new Date(ajuste.created_at).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {repasse
                                ? getProfissionalNome(repasse.professional_id)
                                : 'N/A'}
                            </td>
                            <td className="px-6 py-4 text-right text-sm font-semibold text-blue-600">
                              {formatarMoeda(ajuste.valor_ajuste)}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {ajuste.motivo}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RepasseAjustePage;
