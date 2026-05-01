import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
import { supabase } from '@/lib/customSupabaseClient';
import { enrichAppointmentsWithPrices } from '@/lib/servicePricesApi';
import { useToast } from '@/hooks/useToast';
import PageLayout from '@/components/ui/PageLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

export default function AutorizacaoDescontos() {
  const { user, clinicId } = useAuth();
  const { clinic } = useClinicContext();
  const { toast } = useToast();
  
  const [descontos, setDescontos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('pendentes'); // pendentes, autorizados, rejeitados
  const [expandedId, setExpandedId] = useState(null);

  // Carregar descontos pendentes e autorizados
  useEffect(() => {
    if (!clinicId) return;
    loadDescontos();
  }, [clinicId, filterStatus]);

  const loadDescontos = async () => {
    setLoading(true);
    try {
      console.log('🚀 [LOAD] Iniciando busca de descontos para clinicId:', clinicId);
      
      let query = supabase
        .from('appointments')
        .select(`
          id,
          scheduled_date,
          scheduled_time,
          value,
          discount,
          discount_reason,
          discount_observation,
          discount_requested_at,
          discount_requested_by,
          discount_requested_by_name,
          discount_authorized_by,
          discount_authorized_at,
          discount_rejected_by,
          discount_rejected_at,
          patient_name,
          professional_id,
          service_id,
          payer_id,
          professionals!professional_id (id, name),
          services (name),
          payers (name)
        `)
        .eq('clinic_id', clinicId);

      // Aplicar filtro baseado no status
      if (filterStatus === 'pendentes') {
        // Pendentes: tem desconto > 0, mas não foi autorizado nem rejeitado
        query = query.gt('discount', 0).is('discount_authorized_by', null).is('discount_rejected_at', null);
      } else if (filterStatus === 'autorizados') {
        // Autorizados: tem desconto autorizado
        query = query.not('discount_authorized_by', 'is', null);
      } else if (filterStatus === 'rejeitados') {
        // Rejeitados: foram rejeitados (tem data de rejeição)
        query = query.not('discount_rejected_at', 'is', null);
      }

      const { data, error } = await query.order('scheduled_date', { ascending: false });
      
      if (error) {
        console.error('❌ [AutorizacaoDescontos] ERRO NA QUERY:', {
          message: error.message,
          code: error.code,
          status: error.status,
          details: error.details
        });
        throw error;
      }

      console.log('✅ [AutorizacaoDescontos] Query retornou:', data?.length || 0, 'registros');
      console.log('📋 [CAMPOS RETORNADOS] Primeiro item:', {
        id: data?.[0]?.id,
        patient_name: data?.[0]?.patient_name,
        value: data?.[0]?.value,
        value_tipo: typeof data?.[0]?.value,
        discount: data?.[0]?.discount,
        discount_reason: data?.[0]?.discount_reason,
        discount_requested_at: data?.[0]?.discount_requested_at,
        discount_authorized_by: data?.[0]?.discount_authorized_by,
        scheduled_date: data?.[0]?.scheduled_date,
        scheduled_time: data?.[0]?.scheduled_time
      });
      
      console.log('📊 [RAW] Dados completos:', JSON.stringify(data?.[0], null, 2));
      if (data?.[0]) {
        console.log('💰 [AutorizacaoDescontos] Valores:', {
          value: data[0].value,
          discount: data[0].discount,
          type_value: typeof data[0].value,
          type_discount: typeof data[0].discount,
          value_as_number: parseFloat(data[0].value || 0),
          discount_as_number: parseFloat(data[0].discount || 0)
        });
      }
      
      // 🔧 WORKAROUND: Filtrar no frontend
      const filteredData = (data || []).filter(item => {
        return item.discount_authorized_by || parseFloat(item.discount || 0) > 0;
      });
      
      console.log('📊 [AutorizacaoDescontos] Após filtro:', filteredData.length, 'descontos');
      
      // Enriquecer dados com preços de service_prices
      const enrichedData = await enrichAppointmentsWithPrices(filteredData);
      console.log('💰 [AutorizacaoDescontos] Dados enriquecidos com preços');
      
      setDescontos(enrichedData || []);
    } catch (error) {
      console.error('❌ Erro ao carregar descontos:', error);
      setDescontos([]); // Mostrar lista vazia em caso de erro
      toast({ 
        title: 'Erro', 
        description: `Falha ao carregar descontos: ${error.message}`, 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  const autorizarDesconto = async (appointmentId, desconto) => {
    try {
      const now = new Date().toISOString();
      
      const { error } = await supabase
        .from('appointments')
        .update({
          discount_authorized_by: user.id,
          discount_authorized_at: now
        })
        .eq('id', appointmentId)
        .eq('clinic_id', clinicId);

      if (error) throw error;

      toast({
        title: 'Desconto Autorizado',
        description: `Desconto de R$ ${desconto.toFixed(2)} foi autorizado com sucesso`,
        variant: 'success'
      });

      loadDescontos();
    } catch (error) {
      console.error('Erro ao autorizar desconto:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao autorizar desconto',
        variant: 'destructive'
      });
    }
  };

  const rejeitarDesconto = async (appointmentId, desconto) => {
    try {
      const now = new Date().toISOString();
      
      const { error } = await supabase
        .from('appointments')
        .update({
          discount: 0,
          discount_reason: null,
          discount_observation: null,
          discount_authorized_by: null,
          discount_rejected_by: user.id,
          discount_rejected_at: now
        })
        .eq('id', appointmentId)
        .eq('clinic_id', clinicId);

      if (error) throw error;

      toast({
        title: 'Desconto Rejeitado',
        description: `Desconto de R$ ${desconto.toFixed(2)} foi rejeitado`,
        variant: 'success'
      });

      loadDescontos();
    } catch (error) {
      console.error('Erro ao rejeitar desconto:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao rejeitar desconto',
        variant: 'destructive'
      });
    }
  };

  const getMotivo = (reason) => {
    const motivos = {
      'promocao': '🎯 Promoção',
      'cortesia': '🎁 Cortesia',
      'fidelidade': '⭐ Fidelidade',
      'erro_calculo': '⚠️ Erro de Cálculo',
      'dificuldade_financeira': '💔 Dificuldade Financeira',
      'erro_sistema': '🔧 Erro de Sistema',
      'outro': '📝 Outro'
    };
    return motivos[reason] || reason;
  };

  return (
    <PageLayout title="⚙️ Autorização de Descontos" breadcrumbs={[
      { label: 'Financeiro', path: '/clinica/financeiro' },
      { label: 'Autorização de Descontos' }
    ]}>
      <div className="space-y-4">
        {/* Filtros */}
        <Card className="p-4">
          <div className="flex gap-2 justify-between items-center">
            <div className="flex gap-2">
              <Button
                variant={filterStatus === 'pendentes' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('pendentes')}
                className="gap-2"
              >
                <span>⏳</span>
                Pendentes
                {descontos.filter(d => !d.discount_authorized_by).length > 0 && (
                  <Badge variant="destructive">
                    {descontos.filter(d => !d.discount_authorized_by).length}
                  </Badge>
                )}
              </Button>
              <Button
                variant={filterStatus === 'autorizados' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('autorizados')}
                className="gap-2"
              >
                <span>✅</span>
                Autorizados
              </Button>
              <Button
                variant={filterStatus === 'rejeitados' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('rejeitados')}
                className="gap-2"
              >
                <span>❌</span>
                Rejeitados
              </Button>
            </div>
            <Button
              onClick={() => {
                console.log('🔄 Recarregando descontos...');
                loadDescontos();
              }}
              variant="outline"
              className="gap-2"
            >
              <span>🔄</span>
              Recarregar
            </Button>
          </div>
        </Card>

        {/* Lista de Descontos */}
        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Carregando...</p>
          </div>
        ) : descontos.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gray-500 text-lg">
              {filterStatus === 'pendentes' ? 'Nenhum desconto pendente de autorização' : 'Nenhum desconto nesta categoria'}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {descontos.map((desconto) => (
              <Card
                key={desconto.id}
                className="p-4 hover:shadow-md transition cursor-pointer"
                onClick={() => setExpandedId(expandedId === desconto.id ? null : desconto.id)}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-900">{desconto.patient_name}</p>
                      <Badge variant={desconto.discount_authorized_by ? 'success' : 'warning'}>
                        {desconto.discount_authorized_by ? '✅ Autorizado' : '⏳ Pendente'}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-gray-600">
                      📅 {new Date(desconto.scheduled_date).toLocaleDateString('pt-BR')} às {desconto.scheduled_time}
                    </p>
                    
                    <p className="text-sm text-gray-600 mt-1">
                      🏥 {desconto.services?.name || 'Serviço não informado'}
                    </p>

                    <p className="text-sm text-gray-600">
                      👤 {desconto.professionals?.name || 'Profissional não informado'} | {desconto.payers?.name || 'Particular'}
                    </p>

                    <div className="flex gap-4 mt-2 text-sm font-semibold">
                      <span className="text-gray-700">
                        💰 Valor: <span className="text-green-700">R$ {(desconto.value ? parseFloat(desconto.value).toFixed(2) : '0.00')}</span>
                      </span>
                      <span className="text-yellow-700">
                        🔖 Desconto: <span className="text-yellow-900">R$ {(desconto.discount ? parseFloat(desconto.discount).toFixed(2) : '0.00')}</span>
                      </span>
                      <span className="text-blue-700">
                        💵 A Receber: <span className="text-blue-900">R$ {((parseFloat(desconto.value || 0) - parseFloat(desconto.discount || 0)).toFixed(2))}</span>
                      </span>
                    </div>
                  </div>

                  <div className="text-2xl">
                    {expandedId === desconto.id ? '▼' : '▶'}
                  </div>
                </div>

                {/* Detalhes expandidos */}
                {expandedId === desconto.id && (
                  <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Motivo do Desconto</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {getMotivo(desconto.discount_reason)}
                      </p>
                    </div>

                    {desconto.discount_requested_at && (
                      <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
                        <p className="text-xs font-semibold text-gray-600 uppercase mb-2">📋 Solicitado por</p>
                        <div className="space-y-1">
                          <p className="text-sm text-gray-900">
                            <span className="font-semibold">
                              {/* ✅ NOVO: Mostrar discount_requested_by_name se existir (após migração) */}
                              {desconto.discount_requested_by_name || '(Sem informação de quem solicitou)'}
                            </span>
                          </p>
                          <p className="text-sm text-gray-600">
                            📅 {new Date(desconto.discount_requested_at).toLocaleDateString('pt-BR', { 
                              weekday: 'short', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </p>
                          <p className="text-sm text-gray-600">
                            🕐 {new Date(desconto.discount_requested_at).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    )}

                    {desconto.discount_observation && (
                      <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Observações</p>
                        <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                          {desconto.discount_observation}
                        </p>
                      </div>
                    )}

                    {desconto.discount_authorized_at && (
                      <div className="bg-green-50 border-l-4 border-green-400 p-3 rounded">
                        <p className="text-xs font-semibold text-gray-600 uppercase mb-2">✅ Autorizado em</p>
                        <p className="text-sm text-gray-900">
                          📅 {new Date(desconto.discount_authorized_at).toLocaleDateString('pt-BR', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          🕐 {new Date(desconto.discount_authorized_at).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </p>
                      </div>
                    )}

                    {/* Ações (apenas se pendente) */}
                    {!desconto.discount_authorized_by && (
                      <div className="flex gap-2 pt-3 border-t border-gray-200">
                        <Button
                          onClick={() => autorizarDesconto(desconto.id, parseFloat(desconto.discount || 0))}
                          className="flex-1 gap-2"
                          variant="default"
                        >
                          <span>✅</span>
                          Autorizar Desconto
                        </Button>
                        <Button
                          onClick={() => rejeitarDesconto(desconto.id, parseFloat(desconto.discount || 0))}
                          className="flex-1 gap-2"
                          variant="outline"
                        >
                          <span>❌</span>
                          Rejeitar
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
