/**
 * BillingTypeSelector.jsx - Seletor de Tipo de Cobrança
 * Opções: Por Consulta, Pacote, Sessões, Aula, Valor Fixo
 * Preparação para Repasse Médico
 * 
 * FASE 4-5: UI Enterprise
 */

import React from 'react';

/**
 * BillingTypeSelector - Seletor de tipo de cobrança
 * Opções: Por Consulta, Pacote, Sessões, Aula, Valor Fixo
 */
function BillingTypeSelector({
  billingType = 'per_consultation',
  onBillingTypeChange = () => {},
  billingParams = {},
  onBillingParamsChange = () => {},
}) {
  const billingOptions = [
    { value: 'per_consultation', label: '💼 Por Consulta', icon: '📋', description: 'Cobra valor unitário por consulta.' },
    { value: 'package', label: '📦 Pacote', icon: '📦', description: 'Cobra um valor fechado dividido pela quantidade de sessões do pacote.' },
    { value: 'sessions', label: '🔄 Sessões', icon: '🔄', description: 'Cobra valor unitário multiplicado pela quantidade de sessões.' },
    { value: 'class', label: '🎓 Aula', icon: '🎓', description: 'Cobra valor unitário multiplicado pela quantidade de aulas.' },
    { value: 'fixed', label: '🔒 Valor Fixo', icon: '🔒', description: 'Cobra um valor total fixo, independente do preço do serviço.' },
  ];

  const selectedOption = billingOptions.find((option) => option.value === billingType) || billingOptions[0];
  const updateParam = (name, value) => onBillingParamsChange({ ...billingParams, [name]: value });
  const fieldStyle = {
    width: '100%',
    padding: '6px',
    fontSize: '12px',
    border: '1px solid #dee2e6',
    borderRadius: '3px',
    boxSizing: 'border-box',
  };

  return (
    <div style={{
      backgroundColor: '#f8f9fa',
      border: '1px solid #dee2e6',
      borderRadius: '4px',
      padding: '12px 16px',
      marginBottom: '12px',
    }}>
      {/* Tipo de Cobrança */}
      <div style={{
        marginBottom: '12px',
      }}>
        <label style={{
          display: 'block',
          fontWeight: 600,
          fontSize: '13px',
          color: '#333',
          marginBottom: '8px',
        }}>
          💵 Tipo de Cobrança
        </label>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '8px',
        }}>
          {billingOptions.map(option => (
            <button
              key={option.value}
              onClick={() => onBillingTypeChange(option.value)}
              style={{
                padding: '8px 12px',
                border: billingType === option.value ? '2px solid #3498db' : '1px solid #dee2e6',
                borderRadius: '4px',
                backgroundColor: billingType === option.value ? '#e8f4f8' : '#fff',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: billingType === option.value ? 600 : 400,
                color: billingType === option.value ? '#3498db' : '#666',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (billingType !== option.value) {
                  e.currentTarget.style.borderColor = '#bdc3c7';
                  e.currentTarget.style.backgroundColor = '#f8f9fa';
                }
              }}
              onMouseLeave={(e) => {
                if (billingType !== option.value) {
                  e.currentTarget.style.borderColor = '#dee2e6';
                  e.currentTarget.style.backgroundColor = '#fff';
                }
              }}
            >
              {option.icon} {option.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        marginTop: '8px',
        padding: '12px',
        backgroundColor: '#fff',
        borderRadius: '4px',
        border: '1px solid #dee2e6',
      }}>
        <div style={{ gridColumn: '1 / -1', fontSize: '12px', color: '#4b5563' }}>
          {selectedOption.description}
        </div>

        {billingType === 'per_consultation' && (
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: '#333' }}>
              Quantidade de consultas
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={billingParams.quantity ?? 1}
              onChange={(event) => updateParam('quantity', event.target.value)}
              style={fieldStyle}
            />
          </div>
        )}

        {billingType === 'package' && (
          <>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: '#333' }}>
                Sessões no pacote
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={billingParams.packageSessions ?? 10}
                onChange={(event) => updateParam('packageSessions', event.target.value)}
                style={fieldStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: '#333' }}>
                Valor fechado do pacote (R$)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={billingParams.packageValue ?? ''}
                onChange={(event) => updateParam('packageValue', event.target.value)}
                placeholder="Usa preço x sessões se vazio"
                style={fieldStyle}
              />
            </div>
          </>
        )}

        {billingType === 'sessions' && (
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: '#333' }}>
              Quantidade de sessões
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={billingParams.sessions ?? 1}
              onChange={(event) => updateParam('sessions', event.target.value)}
              style={fieldStyle}
            />
          </div>
        )}

        {billingType === 'class' && (
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: '#333' }}>
              Quantidade de aulas
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={billingParams.classCount ?? 1}
              onChange={(event) => updateParam('classCount', event.target.value)}
              style={fieldStyle}
            />
          </div>
        )}

        {billingType === 'fixed' && (
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: '#333' }}>
              Valor fixo total (R$)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={billingParams.fixedValue ?? ''}
              onChange={(event) => updateParam('fixedValue', event.target.value)}
              placeholder="Informe o total a cobrar"
              style={fieldStyle}
            />
          </div>
        )}
      </div>

      {/* Informações */}
      <div style={{
        marginTop: '8px',
        padding: '8px',
        backgroundColor: '#d5f4e6',
        borderLeft: '3px solid #27ae60',
        fontSize: '11px',
        color: '#27ae60',
        borderRadius: '2px',
      }}>
        ℹ️ O tipo de cobrança será aplicado ao faturamento. Repasse médico será calculado pelas regras do módulo de Repasse.
      </div>
    </div>
  );
}

export default BillingTypeSelector;
