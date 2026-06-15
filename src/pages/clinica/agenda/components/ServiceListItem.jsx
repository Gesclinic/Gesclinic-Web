/**
 * ServiceListItem.jsx - Versão Simplificada
 * Campo único e integrado para inclusão de serviços
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

function ServiceListItem({
  services = [],
  appointmentServices = [],
  onServicesChange = () => {},
  onError = () => {},
  professionalId = null,
  payerId = null,
  payerName = null,
  clinicId = null,
}) {
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedValue, setSelectedValue] = useState('');
  const [totalValue, setTotalValue] = useState(0);
  const [loading, setLoading] = useState(false);

  // Calcular valor total
  useEffect(() => {
    const total = appointmentServices.reduce((sum, item) => {
      const value = parseFloat(item.value || 0);
      const discount = parseFloat(item.discount || 0);
      return sum + (value - discount);
    }, 0);
    setTotalValue(total);
  }, [appointmentServices]);

  // 💰 Buscar valor do serviço
  const fetchServicePrice = async (serviceId) => {
    if (!serviceId || !clinicId) {
      return null;
    }

    try {
      const price = await getServicePrice({
        serviceId,
        professionalId: professionalId || undefined,
        payerId: payerId || undefined,
        clinicId,
      });
      return price || 0;
    } catch (err) {
      console.error('❌ [ServiceListItem] Erro ao buscar preço:', err);
      return 0;
    }
  };

  // Adicionar serviço
  const handleAddService = async () => {
    if (!selectedServiceId) {
      onError('Selecione um serviço');
      return;
    }

    setLoading(true);

    const serviceInfo = services.find((s) => s.id === selectedServiceId);

    let serviceValue = parseFloat(selectedValue || 0);
    if (serviceValue <= 0) {
      serviceValue = await fetchServicePrice(selectedServiceId);

      if (serviceValue <= 0) {
        onError('Não foi possível definir o valor do serviço. Preencha manualmente.');
        setLoading(false);
        return;
      }
    }

    const serviceItem = {
      id: `new-${Date.now()}`,
      service_id: selectedServiceId,
      service_code: serviceInfo?.tuss_code || serviceInfo?.code || '',
      service_name: serviceInfo?.name || '',
      value: parseFloat(serviceValue),
      discount: 0,
      quantity: 1,
      status: 'pending',
    };

    const updatedArray = [...appointmentServices, serviceItem];
    onServicesChange(updatedArray);
    setSelectedServiceId('');
    setSelectedValue('');
    setLoading(false);
  };

  // Remover serviço
  const handleRemoveService = (index) => {
    const updated = appointmentServices.filter((_, i) => i !== index);
    onServicesChange(updated);
  };

  // Atualizar valor
  const handleUpdateValue = (index, newValue) => {
    const updated = [...appointmentServices];
    updated[index] = { ...updated[index], value: parseFloat(newValue) };
    onServicesChange(updated);
  };

  // Atualizar desconto
  const handleUpdateDiscount = (index, newDiscount) => {
    const updated = [...appointmentServices];
    updated[index] = { ...updated[index], discount: parseFloat(newDiscount) };
    onServicesChange(updated);
  };

  return (
    <div style={{ padding: 0, background: 'transparent' }}>
      {/* 🎯 Campo Único de Inclusão */}
      <div style={{ marginBottom: 16 }}>
        <label
          style={{
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 8,
            display: 'block',
            color: '#333',
          }}
        >
          🔧 Serviço
        </label>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr auto',
            gap: 8,
            alignItems: 'flex-end',
          }}
        >
          {/* Seleção de Serviço */}
          <select
            value={selectedServiceId}
            onChange={(e) => {
              const serviceId = e.target.value;
              setSelectedServiceId(serviceId);

              if (serviceId) {
                fetchServicePrice(serviceId).then((price) => {
                  setSelectedValue(price || '');
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
              background: '#fff',
            }}
          >
            <option value="">+ Adicionar serviço</option>
            {services.length === 0 ? (
              <option disabled>Nenhum serviço disponível</option>
            ) : (
              services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.duration ? `(${s.duration} min)` : ''}
                </option>
              ))
            )}
          </select>

          {/* Valor */}
          {selectedServiceId && (
            <input
              type="number"
              step="0.01"
              value={selectedValue}
              onChange={(e) => setSelectedValue(e.target.value)}
              placeholder="R$ 0,00"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: 4,
                fontSize: 13,
                fontFamily: 'inherit',
              }}
            />
          )}

          {/* Botão Adicionar */}
          {selectedServiceId && (
            <button
              type="button"
              onClick={handleAddService}
              disabled={loading}
              style={{
                padding: '8px 16px',
                background: '#1976d2',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                fontWeight: 600,
                fontSize: 12,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              {loading ? '⏳...' : '✅ Adicionar'}
            </button>
          )}
        </div>

        {/* Aviso */}
        {services.length === 0 && (
          <p style={{ fontSize: 12, color: '#d32f2f', marginTop: 6 }}>
            ⚠️ Selecione um profissional para carregar serviços
          </p>
        )}
      </div>

      {/* 📋 Lista de Serviços Adicionados */}
      {appointmentServices.length > 0 && (
        <div>
          {/* Cabeçalho */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '100px 2fr 1.2fr 1fr 60px',
              gap: 12,
              alignItems: 'center',
              marginBottom: 12,
              paddingBottom: 12,
              paddingTop: 4,
              borderBottom: '3px solid #1976d2',
            }}
          >
            <h4 style={{ fontSize: 12, fontWeight: 700, color: '#1976d2', margin: 0 }}>
              Código
            </h4>
            <h4 style={{ fontSize: 12, fontWeight: 700, color: '#1976d2', margin: 0 }}>
              Serviço
            </h4>
            <h4 style={{ fontSize: 12, fontWeight: 700, color: '#1976d2', margin: 0 }}>
              Convênio
            </h4>
            <h4 style={{ fontSize: 12, fontWeight: 700, color: '#1976d2', margin: 0 }}>
              Valor
            </h4>
            <h4 style={{ fontSize: 12, fontWeight: 700, color: '#1976d2', margin: 0 }}></h4>
          </div>

          {/* Lista de Serviços - Uma linha por serviço */}
          <div style={{ marginBottom: 16 }}>
            {appointmentServices.map((service, index) => (
              <div
                key={service.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '100px 2fr 1.2fr 1fr 60px',
                  gap: 12,
                  alignItems: 'center',
                  padding: '10px 12px',
                  background: index % 2 === 0 ? '#f8f9fa' : '#fff',
                  border: '1px solid #e0e0e0',
                  borderRadius: 4,
                  marginBottom: 6,
                }}
              >
                {/* Código do Serviço */}
                <p
                  style={{
                    fontWeight: 600,
                    fontSize: 12,
                    margin: 0,
                    color: '#666',
                    fontFamily: 'monospace',
                  }}
                >
                  {service.service_code || service.service_id || '-'}
                </p>

                {/* Serviço */}
                <p
                  style={{
                    fontWeight: 500,
                    fontSize: 13,
                    margin: 0,
                    color: '#333',
                  }}
                >
                  {service.service_name}
                </p>

                {/* Convênio */}
                <p
                  style={{
                    fontWeight: 500,
                    fontSize: 13,
                    margin: 0,
                    color: payerName ? '#333' : '#999',
                  }}
                  title={payerName || 'Sem convênio selecionado'}
                >
                  {payerName || '-'}
                </p>

                {/* Valor */}
                <input
                  type="number"
                  step="0.01"
                  value={service.value}
                  onChange={(e) => handleUpdateValue(index, e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    border: '1px solid #ddd',
                    borderRadius: 3,
                    fontSize: 12,
                    fontWeight: 600,
                    background: '#fff',
                  }}
                />

                {/* Remover */}
                <button
                  type="button"
                  onClick={() => handleRemoveService(index)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#d32f2f',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                    padding: 0,
                    textAlign: 'center',
                  }}
                  title="Remover serviço"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>

          {/* VALOR TOTAL */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              padding: '12px 16px',
              background: '#e3f2fd',
              border: '2px solid #1976d2',
              borderRadius: 4,
              marginTop: 4,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: '#555', marginRight: 20 }}>
              Valor Total:
            </span>
            <span
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: '#1976d2',
              }}
            >
              {formatCurrency(totalValue)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default ServiceListItem;
