/**
 * ServiceAddRow.jsx - Linha Compacta de Adição de Serviços
 *
 * Layout:
 * CÓDIGO | SERVIÇO | CONVENIO | VALOR | [+ ADICIONAR]
 *
 * Integrado com AppointmentItemsManager para uma experiência única
 */

import React, { useState, useEffect } from 'react';
import { getServicePrice } from '@/lib/getServicePrice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';

const formatCurrency = (value) => {
  const numValue = parseFloat(value || 0);
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(numValue);
};

export default function ServiceAddRow({
  services = [],
  payers = [],
  payerName = '',
  payerId = null,
  onAddService = () => {},
  onError = () => {},
  professionalId = null,
  clinicId = null,
  lastAddedService = null, // 🆕 Serviço/payer do último item adicionado
}) {
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedServiceCode, setSelectedServiceCode] = useState('');
  const [selectedPayerId, setSelectedPayerId] = useState(payerId || '');
  const [selectedValue, setSelectedValue] = useState('');
  const [loading, setLoading] = useState(false);

  // 🆕 Sincronizar com o último serviço adicionado (para pré-popular dropdowns)
  useEffect(() => {
    if (lastAddedService?.service_id) {
      console.log('🔄 [ServiceAddRow] Pré-populando com último serviço adicionado:', {
        service_id: lastAddedService.service_id,
        payer_id: lastAddedService.payer_id,
      });
      setSelectedServiceId(lastAddedService.service_id);
      if (lastAddedService.payer_id) {
        setSelectedPayerId(lastAddedService.payer_id);
      }
    }
  }, [lastAddedService?.service_id]);

  // 💰 Buscar valor do serviço (considera profissional, convênio e tabela geral)
  const fetchServicePrice = async (serviceId, paiderId = null) => {
    if (!serviceId || !clinicId) return null;
    try {
      console.log('💰 [ServiceAddRow] Buscando preço:', {
        serviceId,
        professionalId,
        payerId: paiderId,
        clinicId,
      });
      const price = await getServicePrice({
        serviceId,
        professionalId: professionalId || undefined,
        payerId: paiderId || undefined,
        clinicId,
      });
      console.log('💰 [ServiceAddRow] Preço encontrado:', price);
      return price || 0;
    } catch (err) {
      console.error('❌ [ServiceAddRow] Erro ao buscar preço:', err);
      return 0;
    }
  };

  // ⚠️ SINCRONIZAR selectedPayerId quando prop payerId muda (ex: ao abrir novo modal)
  useEffect(() => {
    console.log('🔄 [ServiceAddRow] SINCRONIZAR payerId: prop=', payerId, 'atual=', selectedPayerId);
    if (payerId !== undefined && payerId !== null) {
      setSelectedPayerId(payerId || '');
    }
  }, [payerId]);

  // Quando muda serviço selecionado, buscar preço
  useEffect(() => {
    if (selectedServiceId) {
      const service = services.find((s) => s.id === selectedServiceId);
      setSelectedServiceCode(service?.tuss_code || service?.code || '');

      // Buscar com o convênio atual
      console.log('🔄 [ServiceAddRow] useEffect DISPARO: serviceId=', selectedServiceId, 'payerId=', selectedPayerId);
      fetchServicePrice(selectedServiceId, selectedPayerId).then((price) => {
        console.log('📊 [ServiceAddRow] Preço fetched:', price, 'para serviceId=', selectedServiceId, 'payerId=', selectedPayerId);
        setSelectedValue(price || '');
      });
    }
  }, [selectedServiceId, selectedPayerId]);

  // Adicionar serviço
  const handleAddService = async (e) => {
    e.preventDefault();

    if (!selectedServiceId) {
      onError('Selecione um serviço');
      return;
    }

    setLoading(true);

    const serviceInfo = services.find((s) => s.id === selectedServiceId);
    let serviceValue = parseFloat(selectedValue || 0);

    // ✅ PERMITIR VALOR 0 - Deixar o usuário preencher manualmente se necessário
    if (serviceValue <= 0) {
      // Tentar buscar preço com o convênio selecionado
      const fetchedPrice = await fetchServicePrice(selectedServiceId, selectedPayerId);
      if (fetchedPrice && fetchedPrice > 0) {
        serviceValue = fetchedPrice;
        console.log('💰 [ServiceAddRow] Preço encontrado automaticamente:', fetchedPrice);
      } else {
        // Se não encontrar preço, permitir adicionar com valor 0 (usuário pode preencher depois)
        serviceValue = 0;
        console.log('⚠️ [ServiceAddRow] Nenhum preço encontrado. Adicionando com valor 0 - usuário pode ajustar depois');
      }
    }

    console.log('✅ [ServiceAddRow] Adicionando serviço:', {
      service_id: selectedServiceId,
      service_code: selectedServiceCode,
      service_name: serviceInfo?.name || '',
      value: parseFloat(serviceValue),
      payer_id: selectedPayerId || null,
    });

    // Chamar callback para adicionar
    onAddService({
      service_id: selectedServiceId,
      service_code: selectedServiceCode,
      service_name: serviceInfo?.name || '',
      value: parseFloat(serviceValue),
      quantity: 1,
      discount: 0,
      payer_id: selectedPayerId || null,
    });

    // Limpar campos
    setSelectedServiceId('');
    setSelectedServiceCode('');
    setSelectedValue('');
    setSelectedPayerId('');
    setLoading(false);
  };

  return (
    <form onSubmit={handleAddService} style={{ marginBottom: 16 }}>
      {/* Linha única compacta */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '80px 2fr 1.2fr 1fr auto',
          gap: 8,
          alignItems: 'center',
          padding: '12px',
          background: '#f5f5f5',
          border: '2px solid #1976d2',
          borderRadius: 6,
        }}
      >
        {/* CÓDIGO (readonly - mostra automaticamente) */}
        <div style={{ fontSize: 12, fontWeight: 600, color: '#666' }}>
          <span style={{ color: '#999' }}>
            {selectedServiceCode || '-'}
          </span>
        </div>

        {/* SERVIÇO (dropdown Radix) */}
        <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
          <SelectTrigger
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 4,
              fontSize: 13,
              background: '#fff',
            }}
          >
            <SelectValue placeholder="👉 Selecione serviço..." />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {services.length > 0 ? (
                services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))
              ) : (
                <div style={{ padding: '8px', color: '#999', fontSize: 12 }}>
                  Nenhum serviço disponível
                </div>
              )}
            </SelectGroup>
          </SelectContent>
        </Select>

        {/* CONVENIO (dropdown Radix) */}
        <Select value={selectedPayerId || undefined} onValueChange={setSelectedPayerId}>
          <SelectTrigger
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 4,
              fontSize: 13,
              background: '#fff',
            }}
          >
            <SelectValue placeholder="👉 Selecione convênio..." />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {payers.length > 0 ? (
                payers.map((payer) => (
                  <SelectItem key={payer.id} value={payer.id}>
                    {payer.name}
                  </SelectItem>
                ))
              ) : (
                <div style={{ padding: '8px', color: '#999', fontSize: 12 }}>
                  Nenhum convênio disponível
                </div>
              )}
            </SelectGroup>
          </SelectContent>
        </Select>

        {/* VALOR (input) */}
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
            fontFamily: 'monospace',
            textAlign: 'right',
          }}
        />

        {/* BOTÃO ADICIONAR */}
        <button
          type="submit"
          disabled={loading || !selectedServiceId}
          style={{
            padding: '8px 16px',
            background: selectedServiceId ? '#4caf50' : '#ccc',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            fontWeight: 600,
            fontSize: 12,
            cursor: selectedServiceId && !loading ? 'pointer' : 'not-allowed',
            opacity: loading ? 0.7 : 1,
            whiteSpace: 'nowrap',
          }}
          title={selectedServiceId ? 'Adicionar serviço' : 'Selecione um serviço'}
        >
          {loading ? '⏳' : '✅ Add'}
        </button>
      </div>

      {/* Aviso se nenhum serviço */}
      {services.length === 0 && (
        <p style={{ fontSize: 11, color: '#d32f2f', marginTop: 6, marginBottom: 0 }}>
          ⚠️ Selecione um profissional para carregar serviços
        </p>
      )}
    </form>
  );
}
