/**
 * ServiceListItem.jsx
 * Componente para gerenciar múltiplos serviços em um agendamento
 * Com ESTILOS INLINE para compatibilidade com modais
 */

import React, { useState, useEffect } from 'react';
import { getServicePrice } from '@/lib/getServicePrice';

// 💰 Formatação de moeda brasileira
const formatCurrency = (value) => {
  const numValue = parseFloat(value || 0);
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(numValue);
};

const BILLING_TYPES = {
  per_consultation: { label: 'Por Consulta', icon: '📋' },
  per_hour: { label: 'Por Hora', icon: '⏰' },
  per_session: { label: 'Por Sessão', icon: '📅' },
  per_package: { label: 'Por Pacote', icon: '📦' },
  per_unit: { label: 'Por Unidade', icon: '🔢' },
};

function ServiceListItem({
  services = [], // Lista de serviços disponíveis
  appointmentServices = [], // Serviços já adicionados
  onServicesChange = () => {},
  onError = () => {},
  professionalId = null, // ID do profissional (para buscar valores)
  payerId = null, // ID do convênio (para buscar valores)
  clinicId = null, // ID da clínica
}) {
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newService, setNewService] = useState({
    service_id: '',
    value: 0,
    discount: 0,
    billing_type: 'per_consultation',
    quantity: 1,
  });
  const [totalValue, setTotalValue] = useState(0);

  // Calcular valor total
  useEffect(() => {
    const total = appointmentServices.reduce((sum, item) => {
      const value = parseFloat(item.value || 0);
      const discount = parseFloat(item.discount || 0);
      const qty = parseInt(item.quantity || 1);
      return sum + (value * qty - discount * qty);
    }, 0);
    setTotalValue(total);
  }, [appointmentServices]);

  // 💰 Buscar valor do serviço: Profissional → Convênio → Padrão
  const fetchServicePrice = async (serviceId) => {
    if (!serviceId || !clinicId) {
      return null;
    }

    try {
      console.log(
        '💰 [ServiceListItem] Buscando preço - serviceId:',
        serviceId,
        'profissionalId:',
        professionalId,
        'payerId:',
        payerId,
      );

      const price = await getServicePrice({
        serviceId,
        professionalId: professionalId || undefined,
        payerId: payerId || undefined,
        clinicId,
      });

      console.log('💰 [ServiceListItem] Preço encontrado:', price);
      return price || 0;
    } catch (err) {
      console.error('❌ [ServiceListItem] Erro ao buscar preço:', err);
      return 0;
    }
  };

  // Adicionar serviço
  const handleAddService = async () => {
    if (!newService.service_id) {
      onError('Selecione um serviço');
      return;
    }

    const serviceInfo = services.find((s) => s.id === newService.service_id);

    // 💰 Se valor não foi definido manualmente, buscar automaticamente
    let serviceValue = newService.value;
    if (serviceValue <= 0) {
      console.log('💰 [ServiceListItem] Valor não definido, buscando automaticamente...');
      serviceValue = await fetchServicePrice(newService.service_id);

      if (serviceValue <= 0) {
        onError('Não foi possível definir o valor do serviço. Preencha manualmente.');
        return;
      }
    }

    const serviceItem = {
      id: `new-${Date.now()}`, // Temp ID
      service_id: newService.service_id,
      service_name: serviceInfo?.name || '',
      value: parseFloat(serviceValue),
      discount: parseFloat(newService.discount || 0),
      billing_type: newService.billing_type,
      quantity: parseInt(newService.quantity) || 1,
      sessions_completed: 0,
      status: 'pending',
      sequence_order: appointmentServices.length,
    };

    const updatedArray = [...appointmentServices, serviceItem];
    console.log('✅ [ServiceListItem] Serviço adicionado!', {
      serviceItem,
      totalServices: updatedArray.length,
      allServices: updatedArray,
    });

    onServicesChange(updatedArray);
    setNewService({
      service_id: '',
      value: 0,
      discount: 0,
      billing_type: 'per_consultation',
      quantity: 1,
    });
    setShowAddForm(false);
  };

  // Remover serviço
  const handleRemoveService = (index) => {
    const updated = appointmentServices.filter((_, i) => i !== index);
    onServicesChange(updated);
  };

  // Atualizar serviço
  const handleUpdateService = (index, field, value) => {
    const updated = [...appointmentServices];
    updated[index] = {
      ...updated[index],
      [field]: field === 'value' || field === 'discount' ? parseFloat(value) : value,
    };
    onServicesChange(updated);
  };

  // Renderizar campos específicos por tipo de cobrança
  const renderBillingTypeFields = (service, index) => {
    const labelStyle = {
      fontSize: 12,
      fontWeight: 600,
      marginBottom: 6,
      display: 'block',
      color: '#333',
    };

    const inputStyle = {
      width: '100%',
      padding: '8px 12px',
      border: '1px solid #ddd',
      borderRadius: 4,
      fontSize: 13,
      fontFamily: 'inherit',
    };

    const type = service.billing_type;

    switch (type) {
      case 'per_hour':
      case 'per_session':
      case 'per_package':
      case 'per_unit':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
            <div>
              <label style={labelStyle}>Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                value={service.value}
                onChange={(e) => handleUpdateService(index, 'value', e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Quantidade</label>
              <input
                type="number"
                min="1"
                value={service.quantity}
                onChange={(e) => handleUpdateService(index, 'quantity', e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>
        );

      default: // per_consultation
        return (
          <div style={{ marginTop: 12 }}>
            <label style={labelStyle}>Valor (R$)</label>
            <input
              type="number"
              step="0.01"
              value={service.value}
              onChange={(e) => handleUpdateService(index, 'value', e.target.value)}
              style={inputStyle}
            />
          </div>
        );
    }
  };

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 6, padding: 16, background: '#fafafa' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 16,
        }}
      >
        <div>
          <h3 style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>📋 Múltiplos Serviços</h3>
          <p style={{ fontSize: 12, color: '#666' }}>
            {appointmentServices.length} serviço(s) adicionado(s)
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Valor Total</p>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#2e7d32' }}>
            {formatCurrency(totalValue)}
          </p>
        </div>
      </div>

      {/* 📅 Guia de Sessões e Pacotes */}
      {appointmentServices.some((s) => ['per_session', 'per_package'].includes(s.billing_type)) && (
        <div
          style={{
            padding: 12,
            background: '#fff8e1',
            border: '1px solid #fbc02d',
            borderRadius: 4,
            marginBottom: 12,
            fontSize: 12,
            color: '#856404',
          }}
        >
          <p style={{ fontWeight: 600, marginBottom: 6 }}>💡 Rastreamento de Sessões/Pacotes:</p>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>
              Cada vez que o paciente comparece, clique em <strong>➕ Adicionar</strong> para marcar
              uma sessão realizada
            </li>
            <li>
              Exemplo: Pacote com 10 sessões → Após 1ª consulta: <strong>1 de 10</strong> → Após 2ª:{' '}
              <strong>2 de 10</strong>
            </li>
            <li>
              Quando atingir o total, o sistema marca como <strong>✅ Completo</strong>
            </li>
            <li>
              Use <strong>➖ Remover</strong> para corrigir erros de marcação
            </li>
          </ul>
        </div>
      )}

      {/* Aviso se não há serviços disponíveis */}
      {services.length === 0 && (
        <div
          style={{
            padding: 12,
            background: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: 4,
            marginBottom: 12,
            fontSize: 12,
            color: '#856404',
          }}
        >
          ⚠️ Nenhum serviço disponível. Selecione um profissional acima para carregar serviços.
        </div>
      )}

      {/* Lista de Serviços */}
      <div style={{ marginBottom: 12 }}>
        {appointmentServices.map((service, index) => (
          <div
            key={service.id}
            style={{
              background: '#fff',
              border: '1px solid #e0e0e0',
              borderRadius: 4,
              marginBottom: 8,
              overflow: 'hidden',
            }}
          >
            {/* Item Header */}
            <button
              type="button"
              onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 12,
                background: '#fff',
                border: 'none',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => (e.target.style.background = '#f5f5f5')}
              onMouseLeave={(e) => (e.target.style.background = '#fff')}
            >
              <div style={{ display: 'flex', alignItems: 'center', flex: 1, gap: 12 }}>
                <span style={{ fontSize: 18 }}>{BILLING_TYPES[service.billing_type]?.icon}</span>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ fontWeight: 600, fontSize: 13 }}>{service.service_name}</p>
                  <p style={{ fontSize: 11, color: '#666' }}>
                    {BILLING_TYPES[service.billing_type]?.label}
                    {service.quantity > 1 && ` • Qtd: ${service.quantity}`}
                    {['per_session', 'per_package'].includes(service.billing_type) &&
                      ` • 📅 ${service.sessions_completed || 0}/${service.quantity}`}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontWeight: 700, fontSize: 13 }}>
                    {formatCurrency(
                      service.value * service.quantity - service.discount * service.quantity,
                    )}
                  </p>
                  {service.discount > 0 && (
                    <p style={{ fontSize: 11, color: '#d32f2f' }}>
                      -{formatCurrency(service.discount * service.quantity)}
                    </p>
                  )}
                </div>
                <span
                  style={{
                    fontSize: 18,
                    color: '#999',
                    transition: 'transform 0.2s',
                    transform: expandedIndex === index ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                >
                  ▼
                </span>
              </div>
            </button>

            {/* Detalhes Expandidos */}
            {expandedIndex === index && (
              <div style={{ borderTop: '1px solid #e0e0e0', padding: 12, background: '#fafafa' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 12,
                    marginBottom: 12,
                  }}
                >
                  {/* Tipo de Cobrança */}
                  <div>
                    <label
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        marginBottom: 6,
                        display: 'block',
                        color: '#333',
                      }}
                    >
                      Tipo de Cobrança
                    </label>
                    <select
                      value={service.billing_type}
                      onChange={(e) => handleUpdateService(index, 'billing_type', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: 4,
                        fontSize: 13,
                        fontFamily: 'inherit',
                      }}
                    >
                      {Object.entries(BILLING_TYPES).map(([key, { label }]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Campos específicos por tipo */}
                {renderBillingTypeFields(service, index)}

                {/* Desconto */}
                <div style={{ marginTop: 12 }}>
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      marginBottom: 6,
                      display: 'block',
                      color: '#333',
                    }}
                  >
                    Desconto (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={service.discount}
                    onChange={(e) => handleUpdateService(index, 'discount', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: 4,
                      fontSize: 13,
                      fontFamily: 'inherit',
                    }}
                  />
                </div>

                {/* Valor Líquido */}
                <div style={{ paddingTop: 12, marginTop: 12, borderTop: '1px solid #e0e0e0' }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#1976d2' }}>
                    Valor Líquido:{' '}
                    {formatCurrency(
                      service.value * service.quantity - service.discount * service.quantity,
                    )}
                  </p>
                </div>

                {/* 📅 RASTREAMENTO DE SESSÕES - Para pacotes e sessões */}
                {['per_session', 'per_package'].includes(service.billing_type) && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: 12,
                      background: '#f0f7ff',
                      border: '1px solid #90caf9',
                      borderRadius: 4,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 12,
                      }}
                    >
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#1565c0' }}>
                        📅 Progresso de Sessões
                      </label>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#1565c0' }}>
                        {service.sessions_completed || 0} de {service.quantity}
                      </span>
                    </div>

                    {/* Barra de Progresso */}
                    <div
                      style={{
                        width: '100%',
                        height: 24,
                        background: '#e3f2fd',
                        border: '1px solid #90caf9',
                        borderRadius: 4,
                        overflow: 'hidden',
                        marginBottom: 12,
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          background: 'linear-gradient(90deg, #64b5f6, #1976d2)',
                          width: `${service.quantity > 0 ? ((service.sessions_completed || 0) / service.quantity) * 100 : 0}%`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: 11,
                          fontWeight: 600,
                          transition: 'width 0.3s ease',
                        }}
                      >
                        {service.quantity > 0 &&
                          `${Math.round(((service.sessions_completed || 0) / service.quantity) * 100)}%`}
                      </div>
                    </div>

                    {/* Botões de Controle */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => {
                          const current = service.sessions_completed || 0;
                          if (current > 0) {
                            handleUpdateService(index, 'sessions_completed', current - 1);
                          }
                        }}
                        disabled={(service.sessions_completed || 0) <= 0}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          background:
                            (service.sessions_completed || 0) <= 0 ? '#e0e0e0' : '#ef5350',
                          color: 'white',
                          border: 'none',
                          borderRadius: 4,
                          fontWeight: 600,
                          fontSize: 12,
                          cursor:
                            (service.sessions_completed || 0) <= 0 ? 'not-allowed' : 'pointer',
                          opacity: (service.sessions_completed || 0) <= 0 ? 0.5 : 1,
                        }}
                      >
                        ➖ Remover
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const current = service.sessions_completed || 0;
                          if (current < service.quantity) {
                            handleUpdateService(index, 'sessions_completed', current + 1);
                          }
                        }}
                        disabled={(service.sessions_completed || 0) >= service.quantity}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          background:
                            (service.sessions_completed || 0) >= service.quantity
                              ? '#e0e0e0'
                              : '#66bb6a',
                          color: 'white',
                          border: 'none',
                          borderRadius: 4,
                          fontWeight: 600,
                          fontSize: 12,
                          cursor:
                            (service.sessions_completed || 0) >= service.quantity
                              ? 'not-allowed'
                              : 'pointer',
                          opacity: (service.sessions_completed || 0) >= service.quantity ? 0.5 : 1,
                        }}
                      >
                        ➕ Adicionar
                      </button>
                    </div>

                    {(service.sessions_completed || 0) >= service.quantity && (
                      <div
                        style={{
                          marginTop: 8,
                          padding: 8,
                          background: '#c8e6c9',
                          border: '1px solid #81c784',
                          borderRadius: 4,
                          fontSize: 12,
                          color: '#2e7d32',
                          fontWeight: 600,
                          textAlign: 'center',
                        }}
                      >
                        ✅ Todas as sessões foram completadas!
                      </div>
                    )}
                  </div>
                )}

                {/* Remover */}
                <button
                  type="button"
                  onClick={() => handleRemoveService(index)}
                  style={{
                    width: '100%',
                    marginTop: 12,
                    padding: '8px 12px',
                    background: '#d32f2f',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  🗑️ Remover Serviço
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Formulário de Adição */}
      {showAddForm ? (
        <div
          style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 4, padding: 12 }}
        >
          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 6,
                display: 'block',
                color: '#333',
              }}
            >
              Serviço *
            </label>
            <select
              value={newService.service_id}
              onChange={(e) => {
                const serviceId = e.target.value;
                setNewService({ ...newService, service_id: serviceId });

                // 💰 Auto-buscar preço quando serviço é selecionado
                if (serviceId) {
                  fetchServicePrice(serviceId).then((price) => {
                    console.log('💰 [Formulário] Preço auto-buscado:', price);
                    setNewService((prev) => ({
                      ...prev,
                      service_id: serviceId,
                      value: price || 0, // Pre-preencher com o preço encontrado
                    }));
                  });
                }
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: 4,
                fontSize: 13,
                fontFamily: 'inherit',
              }}
            >
              <option value="">Selecione um serviço</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.duration ? `(${s.duration} min)` : ''}
                </option>
              ))}
            </select>
          </div>

          <div
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}
          >
            <div>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 6,
                  display: 'block',
                  color: '#333',
                }}
              >
                Tipo de Cobrança
              </label>
              <select
                value={newService.billing_type}
                onChange={(e) => setNewService({ ...newService, billing_type: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: 4,
                  fontSize: 13,
                  fontFamily: 'inherit',
                }}
              >
                {Object.entries(BILLING_TYPES).map(([key, { label }]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 6,
                  display: 'block',
                  color: '#333',
                }}
              >
                Valor (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={newService.value}
                onChange={(e) => setNewService({ ...newService, value: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: 4,
                  fontSize: 13,
                  fontFamily: 'inherit',
                }}
              />
            </div>
          </div>

          <div
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}
          >
            <div>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 6,
                  display: 'block',
                  color: '#333',
                }}
              >
                Quantidade
              </label>
              <input
                type="number"
                min="1"
                value={newService.quantity}
                onChange={(e) => setNewService({ ...newService, quantity: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: 4,
                  fontSize: 13,
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <div>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 6,
                  display: 'block',
                  color: '#333',
                }}
              >
                Desconto (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={newService.discount}
                onChange={(e) => setNewService({ ...newService, discount: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: 4,
                  fontSize: 13,
                  fontFamily: 'inherit',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setNewService({
                  service_id: '',
                  value: 0,
                  discount: 0,
                  billing_type: 'per_consultation',
                  quantity: 1,
                });
              }}
              style={{
                flex: 1,
                padding: '8px 12px',
                background: '#e0e0e0',
                border: 'none',
                borderRadius: 4,
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleAddService}
              style={{
                flex: 1,
                padding: '8px 12px',
                background: '#1976d2',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              ✅ Adicionar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          style={{
            width: '100%',
            padding: '12px',
            background: '#1976d2',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          ➕ Adicionar Serviço
        </button>
      )}
    </div>
  );
}

export default ServiceListItem;
