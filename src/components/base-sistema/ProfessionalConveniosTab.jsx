import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { X, Edit2, Plus, Save } from 'lucide-react';

function ProfessionalConveniosTab({ profesionalId, clinicId, submitting }) {
  const [assignments, setAssignments] = useState([]);
  const [payers, setPayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPayerId, setSelectedPayerId] = useState('');
  const [addingPayer, setAddingPayer] = useState(false);
  const [editingPayerId, setEditingPayerId] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [services, setServices] = useState([]);
  const [servicePrices, setServicePrices] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [saveLoading, setSaveLoading] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState('servicos');
  const [expandedServiceId, setExpandedServiceId] = useState(null);
  const [serviceSchedules, setServiceSchedules] = useState({});
  const [basePrices, setBasePrices] = useState({});

  useEffect(() => {
    if (profesionalId && clinicId) {
      loadData();
    }
  }, [profesionalId, clinicId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: assignments, error: assignError } = await supabase
        .from('professional_payers')
        .select('*')
        .eq('professional_id', profesionalId)
        .eq('clinic_id', clinicId);

      if (assignError) {
        throw assignError;
      }
      setAssignments(assignments || []);

      const { data: payers, error: payersError } = await supabase
        .from('payers')
        .select('*')
        .eq('clinic_id', clinicId);

      if (payersError) {
        throw payersError;
      }
      setPayers(payers || []);

      const { data: services, error: servError } = await supabase
        .from('services')
        .select('*')
        .eq('clinic_id', clinicId);

      if (servError) {
        throw servError;
      }
      setServices(services || []);

      const { data: prices, error: pricesError } = await supabase
        .from('service_prices')
        .select('*')
        .eq('clinic_id', clinicId);

      if (pricesError) {
        throw pricesError;
      }
      setServicePrices(prices || []);

      const { data: schedules, error: schedError } = await supabase
        .from('professional_schedules')
        .select('*')
        .eq('professional_id', profesionalId)
        .eq('clinic_id', clinicId);

      if (schedError) {
        throw schedError;
      }
      setSchedules(schedules || []);
    } catch (err) {
      setError(err.message || 'Erro ao carregar dados');
      console.error('Erro ao carregar convênios:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPayer = async () => {
    if (!selectedPayerId) {
      setError('Selecione um convênio');
      return;
    }

    if (assignments.some((a) => a.payer_id === selectedPayerId)) {
      setError('Este convênio já está vinculado a este profissional');
      return;
    }

    try {
      setError(null);
      const { error: insertError } = await supabase.from('professional_payers').insert([
        {
          professional_id: profesionalId,
          payer_id: selectedPayerId,
          clinic_id: clinicId,
          created_at: new Date(),
        },
      ]);

      if (insertError) {
        throw insertError;
      }

      setSelectedPayerId('');
      setAddingPayer(false);
      await loadData();
    } catch (err) {
      setError(err.message || 'Erro ao adicionar convênio');
      console.error('Erro:', err);
    }
  };

  const handleRemovePayer = async (assignmentId) => {
    const payer = payers.find(
      (c) => c.id === assignments.find((a) => a.id === assignmentId)?.payer_id,
    );

    if (window.confirm(`Remover convênio ${payer?.name}?`)) {
      try {
        setError(null);
        const { error: deleteError } = await supabase
          .from('professional_payers')
          .delete()
          .eq('id', assignmentId);

        if (deleteError) {
          throw deleteError;
        }
        await loadData();
      } catch (err) {
        setError(err.message || 'Erro ao remover convênio');
        console.error('Erro:', err);
      }
    }
  };

  const handleEditPayer = (assignment) => {
    if (!assignment.payer_id) {
      setError('Convênio inválido - ID não disponível');
      return;
    }

    const payerExists = payers.some((p) => p.id === assignment.payer_id);
    if (!payerExists) {
      setError(
        `Convênio ${assignment.payer_id} não encontrado no banco de dados. ` +
          'Verifique se o convênio ainda está ativo.',
      );
      return;
    }

    setEditingPayerId(assignment.payer_id);
    const selectedPrices = servicePrices.filter((sp) => sp.payer_id === assignment.payer_id);
    setSelectedServices(selectedPrices);

    // 🆕 Carregar preços base do convênio para comparação
    loadBasePrices(assignment.payer_id);

    setActiveModalTab('servicos');
    setEditModalOpen(true);
  };

  // 🆕 Função para carregar os preços base do convênio
  const loadBasePrices = async (payerId) => {
    try {
      // Buscar o preço base para cada serviço do convênio
      const { data: baseServicePrices, error } = await supabase
        .from('service_prices')
        .select('id, service_id, price')
        .eq('payer_id', payerId)
        .eq('clinic_id', clinicId);

      if (error) {
        console.error('Erro ao carregar preços base:', error);
        return;
      }

      // Criar mapa de preços base por service_id
      const basePricesMap = {};
      if (baseServicePrices) {
        baseServicePrices.forEach((sp) => {
          basePricesMap[sp.service_id] = sp.price;
        });
      }
      setBasePrices(basePricesMap);
    } catch (err) {
      console.error('Erro ao carregar preços base:', err);
    }
  };

  const handleAddService = async (serviceId) => {
    try {
      setError(null);

      if (!editingPayerId) {
        setError('ID do convênio não encontrado');
        return;
      }

      if (!serviceId) {
        setError('Selecione um serviço válido');
        return;
      }

      if (selectedServices.some((sp) => sp.service_id === serviceId)) {
        setError('Este serviço já está adicionado para este convênio');
        return;
      }

      const newServicePrice = {
        service_id: serviceId,
        payer_id: editingPayerId,
        clinic_id: clinicId,
        price: 0,
      };

      const { data, error: insertError } = await supabase
        .from('service_prices')
        .insert([newServicePrice])
        .select();

      if (insertError) {
        console.error('Erro Supabase ao inserir service_price:', {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint,
        });
        setError(
          insertError.message || 'Erro ao adicionar serviço. Verifique se o convênio é válido.',
        );
        return;
      }

      if (data && data.length > 0) {
        setSelectedServices([...selectedServices, ...data]);
      }
    } catch (err) {
      console.error('Erro ao adicionar serviço:', err);
      setError(err.message || 'Erro ao adicionar serviço');
    }
  };

  const handleRemoveService = async (servicePriceId) => {
    try {
      setError(null);
      const { error: deleteError } = await supabase
        .from('service_prices')
        .delete()
        .eq('id', servicePriceId);

      if (deleteError) {
        throw deleteError;
      }

      setSelectedServices(selectedServices.filter((sp) => sp.id !== servicePriceId));
    } catch (err) {
      setError(err.message || 'Erro ao remover serviço');
      console.error('Erro:', err);
    }
  };

  const handleUpdateServicePrice = async (servicePriceId, newPrice) => {
    try {
      setError(null);
      const { error: updateError } = await supabase
        .from('service_prices')
        .update({ price: parseFloat(newPrice) })
        .eq('id', servicePriceId);

      if (updateError) {
        throw updateError;
      }

      setSelectedServices(
        selectedServices.map((sp) => (sp.id === servicePriceId ? { ...sp, price: newPrice } : sp)),
      );
    } catch (err) {
      setError(err.message || 'Erro ao atualizar preço');
      console.error('Erro:', err);
    }
  };

  const handleUpdateServiceSchedule = (
    servicePriceId,
    dayOfWeek,
    startTime,
    endTime,
    duration = 30,
  ) => {
    setServiceSchedules((prev) => ({
      ...prev,
      [servicePriceId]: {
        ...(prev[servicePriceId] || {}),
        [dayOfWeek]: {
          start_time: startTime,
          end_time: endTime,
          duration: duration, // duração em minutos por atendimento
        },
      },
    }));
  };

  const handleAddSchedulePeriod = (servicePriceId, dayOfWeek) => {
    setServiceSchedules((prev) => {
      const periods = prev[servicePriceId]?.[dayOfWeek]?.periods || [];
      return {
        ...prev,
        [servicePriceId]: {
          ...(prev[servicePriceId] || {}),
          [dayOfWeek]: {
            ...(prev[servicePriceId]?.[dayOfWeek] || {}),
            periods: [
              ...periods,
              {
                id: `${dayOfWeek}_${Date.now()}`,
                start_time: '08:00',
                end_time: '09:00',
                duration: 30,
              },
            ],
          },
        },
      };
    });
  };

  const handleUpdateSchedulePeriod = (servicePriceId, dayOfWeek, periodId, field, value) => {
    setServiceSchedules((prev) => {
      const periods = prev[servicePriceId]?.[dayOfWeek]?.periods || [];
      return {
        ...prev,
        [servicePriceId]: {
          ...(prev[servicePriceId] || {}),
          [dayOfWeek]: {
            ...(prev[servicePriceId]?.[dayOfWeek] || {}),
            periods: periods.map((p) => (p.id === periodId ? { ...p, [field]: value } : p)),
          },
        },
      };
    });
  };

  const handleDeleteSchedulePeriod = (servicePriceId, dayOfWeek, periodId) => {
    setServiceSchedules((prev) => {
      const periods = (prev[servicePriceId]?.[dayOfWeek]?.periods || []).filter(
        (p) => p.id !== periodId,
      );
      return {
        ...prev,
        [servicePriceId]: {
          ...(prev[servicePriceId] || {}),
          [dayOfWeek]: {
            ...prev[servicePriceId]?.[dayOfWeek],
            periods,
          },
        },
      };
    });
  };

  const handleSaveChanges = async () => {
    try {
      setSaveLoading(true);
      setError(null);

      // Salvar horários dos serviços no banco de dados
      const scheduleUpdates = Object.entries(serviceSchedules)
        .filter(([_, scheduleData]) => scheduleData && typeof scheduleData === 'object')
        .map(([servicePriceId, scheduleData]) => ({
          id: servicePriceId,
          scheduling_config: JSON.stringify(scheduleData),
        }));

      if (scheduleUpdates.length > 0) {
        for (const update of scheduleUpdates) {
          const { error: updateError } = await supabase
            .from('service_prices')
            .update({ scheduling_config: update.scheduling_config })
            .eq('id', update.id);

          if (updateError) {
            console.error('Erro ao salvar horários:', updateError);
            if (
              updateError.message.includes('column') ||
              updateError.message.includes('does not exist')
            ) {
              setError(
                'Para salvar horários, a coluna scheduling_config não existe. ' +
                  'É necessário aplicar uma migration no banco de dados. Contate o administrador.',
              );
              setSaveLoading(false);
              return;
            }
            throw updateError;
          }
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 500));

      // Recarregar dados dos service_prices para mostrar os horários salvos
      if (editingPayerId) {
        const { data: prices, error: pricesError } = await supabase
          .from('service_prices')
          .select('*')
          .eq('payer_id', editingPayerId)
          .eq('clinic_id', clinicId);

        if (pricesError) {
          console.error('Erro ao recarregar serviços:', pricesError);
        } else if (prices) {
          setSelectedServices(prices);

          // Atualizar o estado com os horários salvos
          const updatedSchedules = {};
          prices.forEach((price) => {
            if (price.scheduling_config) {
              try {
                updatedSchedules[price.id] = JSON.parse(price.scheduling_config);
              } catch (e) {
                console.error('Erro ao fazer parse de scheduling_config:', e);
              }
            }
          });
          setServiceSchedules(updatedSchedules);
        }
      }

      const schedulesCount = Object.keys(serviceSchedules).length;
      const detailsMsg =
        schedulesCount > 0
          ? `✅ Regras de atendimento salvas com sucesso!\n\n${Object.keys(serviceSchedules).length} serviço(s) com horários configurados.`
          : '✅ Regras de atendimento salvas com sucesso!';

      alert(detailsMsg);
    } catch (err) {
      setError(err.message || 'Erro ao salvar');
      console.error('Erro:', err);
    } finally {
      setSaveLoading(false);
    }
  };

  const getPayerName = (payerId) => {
    const payer = payers.find((p) => p.id === payerId);
    return payer?.name || 'Convênio não encontrado';
  };

  const calculateAppointmentCount = (startTime, endTime, durationMinutes) => {
    if (!startTime || !endTime || !durationMinutes) {
      return 0;
    }
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const startTotalMin = startHour * 60 + startMin;
    const endTotalMin = endHour * 60 + endMin;
    const rangeMin = endTotalMin - startTotalMin;

    return Math.floor(rangeMin / durationMinutes);
  };

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div className="space-y-5" style={{ flex: 1, overflowY: 'auto' }}>
        {error && (
          <div className="p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {!addingPayer ? (
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="border-b pb-3 mb-4">
              <h3 className="text-lg font-bold text-gray-900">➕ Novo Convênio</h3>
              <p className="text-sm text-gray-600 mt-1">
                Vincular um novo convênio ao profissional
              </p>
            </div>
            <Button
              onClick={() => setAddingPayer(true)}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={submitting}
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Convênio
            </Button>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-3">
            <div className="border-b pb-3 mb-4">
              <h3 className="text-lg font-bold text-gray-900">🏥 Vincular Convênio</h3>
              <p className="text-sm text-gray-600 mt-1">
                Selecione um convênio para vincular ao profissional
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selecione um Convênio
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedPayerId}
                  onChange={(e) => setSelectedPayerId(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={submitting}
                >
                  <option value="">-- Selecione um convênio --</option>
                  {payers
                    .filter((c) => !assignments.some((a) => a.payer_id === c.id))
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
                <Button
                  onClick={handleAddPayer}
                  className="bg-green-600 hover:bg-green-700"
                  disabled={submitting || !selectedPayerId}
                >
                  Vincular
                </Button>
                <Button
                  onClick={() => {
                    setAddingPayer(false);
                    setSelectedPayerId('');
                  }}
                  variant="outline"
                  disabled={submitting}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
          <div className="border-b pb-3">
            <h3 className="text-lg font-bold text-gray-900">✓ Convênios Vinculados</h3>
            <p className="text-sm text-gray-600 mt-1">Gerenciar convênios do profissional</p>
          </div>
          {assignments.length === 0 ? (
            <p className="text-gray-500 text-sm italic">
              Nenhum convênio vinculado a este profissional
            </p>
          ) : (
            <div className="space-y-2">
              {assignments.map((assignment) => {
                const payerName = getPayerName(assignment.payer_id);

                return (
                  <div
                    key={assignment.id}
                    className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900">{payerName}</h4>
                        <div className="mt-2">
                          <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded bg-green-100 text-green-700">
                            Ativo
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEditPayer(assignment)}
                          className="p-2 hover:bg-blue-100 rounded-lg text-blue-600 transition"
                          title="Configurar Regras"
                          disabled={submitting}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRemovePayer(assignment.id)}
                          className="p-2 hover:bg-red-100 rounded-lg text-red-600 transition"
                          title="Remover"
                          disabled={submitting}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {editModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b sticky top-0 bg-white z-10">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold">
                    Configurar Regras -{' '}
                    {editingPayerId
                      ? payers.find((p) => p.id === editingPayerId)?.name
                      : 'Convênio'}
                  </h3>
                  <button
                    onClick={() => setEditModalOpen(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex gap-2 border-b">
                  <button
                    onClick={() => setActiveModalTab('servicos')}
                    className={`px-4 py-2 text-sm font-medium transition ${
                      activeModalTab === 'servicos'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Serviços e Horários
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {error && (
                  <div className="p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm">
                    <p className="font-semibold mb-1">Erro:</p>
                    <p>{error}</p>
                  </div>
                )}

                {activeModalTab === 'servicos' && (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900">Serviços e Horários</h4>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Adicionar Serviço
                      </label>
                      <p className="text-xs text-gray-600">
                        Configure preço e horários disponíveis para cada serviço neste convênio
                      </p>
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAddService(e.target.value);
                            e.target.value = '';
                          }
                        }}
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={submitting}
                      >
                        <option value="">-- Selecione um serviço --</option>
                        {services
                          .filter((s) => !selectedServices.some((sp) => sp.service_id === s.id))
                          .map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      {selectedServices.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">
                          Nenhum serviço configurado para este convênio
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {selectedServices.map((servicePrice) => {
                            const service = services.find((s) => s.id === servicePrice.service_id);
                            const isExpanded = expandedServiceId === servicePrice.id;
                            const daysOfWeek = [
                              { id: 0, name: 'Domingo' },
                              { id: 1, name: 'Segunda' },
                              { id: 2, name: 'Terça' },
                              { id: 3, name: 'Quarta' },
                              { id: 4, name: 'Quinta' },
                              { id: 5, name: 'Sexta' },
                              { id: 6, name: 'Sábado' },
                            ];

                            return (
                              <div
                                key={servicePrice.id}
                                className="bg-gray-50 border rounded-lg overflow-hidden"
                              >
                                <div
                                  className="p-3 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition"
                                  onClick={() =>
                                    setExpandedServiceId(isExpanded ? null : servicePrice.id)
                                  }
                                >
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">
                                      {service?.name || 'Serviço não encontrado'}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-xs text-gray-600">Preço:</span>
                                      <input
                                        type="number"
                                        value={servicePrice.price || ''}
                                        onChange={(e) => {
                                          e.stopPropagation();
                                          handleUpdateServicePrice(servicePrice.id, e.target.value);
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        placeholder="R$ 0,00"
                                        className="w-24 px-2 py-1 border rounded text-xs"
                                        disabled={submitting}
                                        step="0.01"
                                        min="0"
                                      />
                                      {/* 🆕 Indicador de Override */}
                                      {basePrices[servicePrice.service_id] !== undefined &&
                                        basePrices[servicePrice.service_id] !==
                                          servicePrice.price && (
                                          <div className="ml-2 inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                                            <span
                                              title={`Preço base: R$ ${parseFloat(basePrices[servicePrice.service_id] || 0).toFixed(2)}`}
                                            >
                                              ✏️ Negociação
                                            </span>
                                          </div>
                                        )}
                                      {basePrices[servicePrice.service_id] === servicePrice.price &&
                                        basePrices[servicePrice.service_id] !== undefined && (
                                          <div className="ml-2 inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                                            <span title="Preço padrão do convênio">✅ Padrão</span>
                                          </div>
                                        )}
                                    </div>
                                    {/* 🆕 Mostrar comparação de preço quando há override */}
                                    {basePrices[servicePrice.service_id] !== undefined &&
                                      basePrices[servicePrice.service_id] !==
                                        servicePrice.price && (
                                        <p className="text-xs text-orange-600 mt-1">
                                          Preço base:{' '}
                                          <strong>
                                            R${' '}
                                            {parseFloat(
                                              basePrices[servicePrice.service_id] || 0,
                                            ).toFixed(2)}
                                          </strong>
                                          <span className="ml-2 text-gray-600">
                                            Diferença:{' '}
                                            <strong>
                                              {servicePrice.price -
                                                basePrices[servicePrice.service_id] >
                                              0
                                                ? '+'
                                                : ''}
                                              R${' '}
                                              {(
                                                servicePrice.price -
                                                basePrices[servicePrice.service_id]
                                              ).toFixed(2)}
                                            </strong>
                                          </span>
                                        </p>
                                      )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveService(servicePrice.id);
                                      }}
                                      className="p-1 hover:bg-red-100 rounded text-red-600"
                                      title="Remover"
                                      disabled={submitting}
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>

                                {isExpanded && (
                                  <div className="border-t bg-white p-4 space-y-3">
                                    <p className="text-xs font-medium text-gray-700">
                                      Horários de Atendimento deste Serviço
                                    </p>
                                    <div className="space-y-3">
                                      {daysOfWeek.map((day) => {
                                        const periods =
                                          serviceSchedules[servicePrice.id]?.[day.id]?.periods ||
                                          [];
                                        const isDeleted =
                                          serviceSchedules[servicePrice.id]?.[day.id] === null;

                                        return (
                                          <div
                                            key={day.id}
                                            className={`p-3 rounded border transition ${isDeleted ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}
                                          >
                                            <div className="flex items-center justify-between mb-2">
                                              <label className="font-medium text-sm text-gray-900">
                                                {day.name}
                                              </label>
                                              {isDeleted && (
                                                <button
                                                  onClick={() =>
                                                    handleAddSchedulePeriod(servicePrice.id, day.id)
                                                  }
                                                  className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition"
                                                  disabled={submitting}
                                                >
                                                  Ativar
                                                </button>
                                              )}
                                            </div>

                                            {!isDeleted && (
                                              <>
                                                {periods.length === 0 ? (
                                                  <div className="flex items-center justify-between">
                                                    <span className="text-xs text-gray-600 italic">
                                                      Sem períodos configurados
                                                    </span>
                                                    <button
                                                      onClick={() =>
                                                        handleAddSchedulePeriod(
                                                          servicePrice.id,
                                                          day.id,
                                                        )
                                                      }
                                                      className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                                                      disabled={submitting}
                                                    >
                                                      <Plus className="w-3 h-3 inline mr-1" />
                                                      Adicionar Período
                                                    </button>
                                                  </div>
                                                ) : (
                                                  <div className="space-y-2">
                                                    {periods.map((period, idx) => {
                                                      const appointmentCount =
                                                        calculateAppointmentCount(
                                                          period.start_time,
                                                          period.end_time,
                                                          period.duration,
                                                        );

                                                      return (
                                                        <div
                                                          key={period.id}
                                                          className="p-3 bg-white border border-gray-200 rounded space-y-3"
                                                        >
                                                          <div className="flex justify-between items-start">
                                                            <span className="font-semibold text-sm text-gray-900">
                                                              Período {idx + 1}
                                                            </span>
                                                            <button
                                                              onClick={() =>
                                                                handleDeleteSchedulePeriod(
                                                                  servicePrice.id,
                                                                  day.id,
                                                                  period.id,
                                                                )
                                                              }
                                                              className="p-1 hover:bg-red-100 rounded text-red-600 transition"
                                                              disabled={submitting}
                                                            >
                                                              <X className="w-4 h-4" />
                                                            </button>
                                                          </div>

                                                          <div className="grid grid-cols-2 gap-3">
                                                            <div className="col-span-2">
                                                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                                                Horário
                                                              </label>
                                                              <div className="flex items-center gap-2">
                                                                <div className="flex-1">
                                                                  <input
                                                                    type="time"
                                                                    value={period.start_time}
                                                                    onChange={(e) =>
                                                                      handleUpdateSchedulePeriod(
                                                                        servicePrice.id,
                                                                        day.id,
                                                                        period.id,
                                                                        'start_time',
                                                                        e.target.value,
                                                                      )
                                                                    }
                                                                    className="w-full px-2 py-2 border rounded text-sm font-medium"
                                                                    disabled={submitting}
                                                                  />
                                                                </div>
                                                                <span className="text-sm font-medium text-gray-600">
                                                                  até
                                                                </span>
                                                                <div className="flex-1">
                                                                  <input
                                                                    type="time"
                                                                    value={period.end_time}
                                                                    onChange={(e) =>
                                                                      handleUpdateSchedulePeriod(
                                                                        servicePrice.id,
                                                                        day.id,
                                                                        period.id,
                                                                        'end_time',
                                                                        e.target.value,
                                                                      )
                                                                    }
                                                                    className="w-full px-2 py-2 border rounded text-sm font-medium"
                                                                    disabled={submitting}
                                                                  />
                                                                </div>
                                                              </div>
                                                            </div>

                                                            <div>
                                                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                                                Duração
                                                              </label>
                                                              <select
                                                                value={period.duration}
                                                                onChange={(e) =>
                                                                  handleUpdateSchedulePeriod(
                                                                    servicePrice.id,
                                                                    day.id,
                                                                    period.id,
                                                                    'duration',
                                                                    parseInt(e.target.value),
                                                                  )
                                                                }
                                                                className="w-full px-2 py-2 border rounded text-sm"
                                                                disabled={submitting}
                                                              >
                                                                <option value={15}>15 min</option>
                                                                <option value={20}>20 min</option>
                                                                <option value={30}>30 min</option>
                                                                <option value={45}>45 min</option>
                                                                <option value={60}>60 min</option>
                                                                <option value={90}>90 min</option>
                                                              </select>
                                                            </div>

                                                            <div>
                                                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                                                Atendimentos
                                                              </label>
                                                              <div className="px-2 py-2 bg-blue-50 border border-blue-200 rounded text-sm font-semibold text-blue-900 text-center">
                                                                {appointmentCount}
                                                              </div>
                                                            </div>
                                                          </div>
                                                        </div>
                                                      );
                                                    })}
                                                    <button
                                                      onClick={() =>
                                                        handleAddSchedulePeriod(
                                                          servicePrice.id,
                                                          day.id,
                                                        )
                                                      }
                                                      className="w-full px-2 py-2 text-sm font-medium text-blue-700 border border-blue-300 rounded hover:bg-blue-50 transition"
                                                      disabled={submitting}
                                                    >
                                                      <Plus className="w-3 h-3 inline mr-1" />
                                                      Adicionar Período
                                                    </button>
                                                  </div>
                                                )}
                                                <div className="mt-2 flex gap-1">
                                                  <button
                                                    onClick={() => {
                                                      setServiceSchedules((prev) => ({
                                                        ...prev,
                                                        [servicePrice.id]: {
                                                          ...(prev[servicePrice.id] || {}),
                                                          [day.id]: null,
                                                        },
                                                      }));
                                                    }}
                                                    className="px-2 py-1 text-xs text-red-600 border border-red-300 rounded hover:bg-red-50 transition"
                                                    disabled={submitting}
                                                  >
                                                    Indisponível
                                                  </button>
                                                </div>
                                              </>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t flex gap-2 justify-end sticky bottom-0 bg-white">
                <Button
                  onClick={() => {
                    setEditModalOpen(false);
                    setError(null);
                    setEditingPayerId(null);
                    setSelectedServices([]);
                    setActiveModalTab('servicos');
                  }}
                  variant="outline"
                  disabled={submitting || saveLoading}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveChanges}
                  className="bg-green-600 hover:bg-green-700"
                  disabled={submitting || saveLoading}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saveLoading ? 'Salvando...' : 'Salvar Regras'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProfessionalConveniosTab;
