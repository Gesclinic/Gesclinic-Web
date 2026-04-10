import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { AlertCircle, Edit2, Trash2, Plus } from 'lucide-react';
import { listRevenueRules } from '@/lib/revenueRulesApi';
import { listProfessionals } from '@/lib/professionalsApi';
import { listServices } from '@/lib/servicesApi';
import { RefreshCw } from 'lucide-react';
import { customSupabaseClient as supabase } from '@/lib/customSupabaseClient';

export default function RepasseRegrasPage() {
  const { user } = useAuth();
  const { clinicId } = useClinicContext();
  const navigate = useNavigate();

  const [regras, setRegras] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Carrega regras e profissionais
  useEffect(() => {
    carregarDados();
  }, [clinicId]);

  // Recarrega dados quando a página volta ao foco (ao retornar de salvar)
  useEffect(() => {
    const handleFocus = () => {
      console.log('Página em foco, recarregando dados...');
      carregarDados();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      
      // Carregar de ambas as tabelas
      const [revenueRes, repasseRes, profsList, svcosList] = await Promise.all([
        supabase
          .from("revenue_rules")
          .select("*")
          .eq("clinic_id", clinicId),
        supabase
          .from("repasse_config")
          .select("*")
          .eq("clinic_id", clinicId),
        listProfessionals(clinicId),
        listServices(clinicId)
      ]);

      // Combinar regras de ambas as tabelas
      const revenueRules = revenueRes.data || [];
      const repasseRules = (repasseRes.data || []).map(rule => ({
        ...rule,
        id: rule.id || `repasse_${Date.now()}`,
        percentage: rule.percentual,
        fixed_amount: rule.fixed_value,
        repasse_type: rule.tipo_base === 'BRUTO' ? 'percentage' : 'percentage',
        active: rule.ativo !== false
      }));

      // Mesclar arrays (evitar duplicatas)
      const combinedRules = [
        ...revenueRules,
        ...repasseRules.filter(r => !revenueRules.find(rv => rv.id === r.id))
      ];
      
      console.log('Regras revenue_rules:', revenueRules);
      console.log('Regras repasse_config:', repasseRules);
      console.log('Regras combinadas:', combinedRules);
      console.log('Profissionais carregados:', profsList);
      console.log('Serviços carregados:', svcosList);
      
      setRegras(combinedRules || []);
      setProfissionais(profsList || []);
      setServicos(svcosList || []);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAbrirEditar = (regra) => {
    // Redireciona para a página de configurações de repasses
    navigate(`/clinica/configuracoes/conta/repasses?edit=${regra.id}`);
  };

  const handleToggleRegra = async (regraId, ativo) => {
    try {
      console.log('Toggling regra:', regraId, 'de ativo:', ativo);
      
      // Tenta atualizar em ambas as tabelas em paralelo
      const [resRevenue, resRepasse] = await Promise.all([
        supabase
          .from("revenue_rules")
          .update({ active: !ativo })
          .eq("id", regraId),
        supabase
          .from("repasse_config")
          .update({ ativo: !ativo })
          .eq("id", regraId)
      ]);

      // Verifica se pelo menos uma atualizou
      const atualizouRevenue = !resRevenue.error;
      const atualizouRepasse = !resRepasse.error;

      if (!atualizouRevenue && !atualizouRepasse) {
        console.error('Erros em ambas tabelas:', { resRevenue, resRepasse });
        throw new Error('Falha ao atualizar regra em ambas as tabelas');
      }

      console.log('Regra atualizada com sucesso');
      setSuccess(ativo ? 'Regra desativada!' : 'Regra ativada!');
      setTimeout(() => {
        setSuccess(null);
        carregarDados();
      }, 2000);
    } catch (err) {
      console.error('Erro ao ativar/desativar regra:', err);
      setError('Erro ao atualizar regra: ' + err.message);
    }
  };

  const handleDeletarRegra = async (regraId) => {
    if (!window.confirm('Tem certeza que deseja remover esta regra?')) return;
    
    try {
      console.log('Deletando regra:', regraId);
      
      // Tenta deletar de ambas as tabelas em paralelo
      const [resRevenue, resRepasse] = await Promise.all([
        supabase
          .from("revenue_rules")
          .delete()
          .eq("id", regraId),
        supabase
          .from("repasse_config")
          .delete()
          .eq("id", regraId)
      ]);

      // Verifica se pelo menos uma deletou
      const deletouRevenue = !resRevenue.error;
      const deletouRepasse = !resRepasse.error;

      if (!deletouRevenue && !deletouRepasse) {
        console.error('Erros em ambas tabelas:', { resRevenue, resRepasse });
        throw new Error('Falha ao deletar regra de ambas as tabelas');
      }

      console.log('Regra deletada com sucesso');
      setSuccess('Regra removida!');
      setTimeout(() => {
        setSuccess(null);
        carregarDados();
      }, 2000);
    } catch (err) {
      console.error('Erro ao deletar regra:', err);
      setError('Erro ao remover regra: ' + err.message);
    }
  };

  const getNomeProf = (profId) => {
    if (!profId) return 'Grupo/Sem profissional';
    const prof = profissionais.find(p => p.id === profId);
    return prof ? (prof.full_name || prof.name) : `Profissional ${profId.substring(0, 8)}...`;
  };

  const getTipoRegra = (serviceId) => {
    if (serviceId) return '📋 Serviço Individual';
    return '📚 Grupo de Serviços';
  };

  const getNomeServico = (serviceId) => {
    // Se tem serviço individual
    if (serviceId) {
      const servico = servicos.find(s => s.id === serviceId);
      return servico ? servico.name : `Serviço ${serviceId.substring(0, 8)}...`;
    }
    // Se é grupo
    return 'Grupo';
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
          <div className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0">✓</div>
          <p className="text-green-800">{success}</p>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Regras de Repasse Configuradas</h3>
        <p className="text-sm text-blue-800">
          Abaixo estão todas as regras de repasse cadastradas. Você pode editar ou remover cada regra.
          Para criar novas regras, clique em <strong>Nova Regra</strong> abaixo.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-600">Carregando regras...</p>
        </div>
      ) : regras.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-gray-600">
              <p className="mb-2">Nenhuma regra de repasse configurada</p>
              <p className="text-sm">Clique em "Nova Regra" para criar a primeira</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>📋 Todas as Regras ({regras.length})</CardTitle>
            <CardDescription>
              Gerenciamento de regras de repasse para profissionais
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Profissional</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Tipo de Regra</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Serviço/Grupo</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Tipo</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Valor/Percentual</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {regras.map((regra) => (
                    <tr key={regra.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900">
                          {regra.professional_id ? getNomeProf(regra.professional_id) : 'Grupo'}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-700">
                          {getTipoRegra(regra.service_id)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-900 font-medium">
                          {getNomeServico(regra.service_id)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          {regra.rule_type || regra.repasse_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-gray-900">
                        {regra.rule_type === 'percentage' || regra.repasse_type === 'percentage'
                          ? `${regra.percentage}%`
                          : `R$ ${(regra.fixed_value || regra.fixed_amount || 0).toFixed(2).replace('.', ',')}`
                        }
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 text-xs rounded cursor-pointer transition-all hover:opacity-75 ${
                          regra.active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}
                        onClick={() => handleToggleRegra(regra.id, regra.active)}>
                          {regra.active ? '✓ Ativa' : '✗ Inativa'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleAbrirEditar(regra)}
                            className="p-1 hover:bg-blue-100 rounded transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4 text-blue-600" />
                          </button>
                          <button
                            onClick={() => handleDeletarRegra(regra.id)}
                            className="p-1 hover:bg-red-100 rounded transition-colors"
                            title="Remover"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-3">
        <Button 
          onClick={() => carregarDados()}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
        <Button 
          onClick={() => navigate('/clinica/configuracoes/conta/repasses')}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Nova Regra
        </Button>
      </div>
    </div>
  );
}
