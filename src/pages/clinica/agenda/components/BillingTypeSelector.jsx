/**
 * BillingTypeSelector.jsx - Seletor de Tipo de Cobrança
 * Opções: Por Consulta, Pacote, Sessões, Aula, Valor Fixo
 * Preparação para Repasse Médico
 * 
 * FASE 4-5: UI Enterprise
 */

import React, { useState } from 'react';

/**
 * BillingTypeSelector - Seletor de tipo de cobrança
 * Opções: Por Consulta, Pacote, Sessões, Aula, Valor Fixo
 */
function BillingTypeSelector({
  billingType = 'per_consultation',
  onBillingTypeChange = () => {},
  repayPercentage = 0,
  repayType = 'discount', // 'discount' ou 'percentage'
  onRepayChange = () => {},
}) {
  const [showRepayOptions, setShowRepayOptions] = useState(false);

  const billingOptions = [
    { value: 'per_consultation', label: '💼 Por Consulta', icon: '📋' },
    { value: 'package', label: '📦 Pacote', icon: '📦' },
    { value: 'sessions', label: '🔄 Sessões', icon: '🔄' },
    { value: 'class', label: '🎓 Aula', icon: '🎓' },
    { value: 'fixed', label: '🔒 Valor Fixo', icon: '🔒' },
  ];

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

      {/* Opções de Repasse Médico */}
      <div style={{
        borderTop: '1px solid #dee2e6',
        paddingTop: '12px',
      }}>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: '13px',
          color: '#333',
          marginBottom: '8px',
          userSelect: 'none',
        }}>
          <input
            type="checkbox"
            checked={showRepayOptions}
            onChange={(e) => setShowRepayOptions(e.target.checked)}
            style={{ 
              marginRight: '8px', 
              cursor: 'pointer',
              width: '16px',
              height: '16px',
            }}
          />
          📊 Configurar Repasse Médico
        </label>

        {showRepayOptions && (
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
            {/* Tipo de Repasse */}
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '11px', 
                fontWeight: 600, 
                marginBottom: '4px',
                color: '#333'
              }}>
                📌 Tipo de Repasse
              </label>
              <select
                value={repayType}
                onChange={(e) => onRepayChange({ repayType: e.target.value })}
                style={{
                  width: '100%',
                  padding: '6px',
                  fontSize: '12px',
                  border: '1px solid #dee2e6',
                  borderRadius: '3px',
                  backgroundColor: '#fff',
                  cursor: 'pointer',
                }}
              >
                <option value="discount">💰 Desconto Fixo (R$)</option>
                <option value="percentage">📊 Percentual (%)</option>
              </select>
            </div>

            {/* Valor/Percentual */}
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '11px', 
                fontWeight: 600, 
                marginBottom: '4px',
                color: '#333'
              }}>
                💵 Valor / Percentual
              </label>
              <input
                type="number"
                value={repayPercentage}
                onChange={(e) => onRepayChange({ repayPercentage: e.target.value })}
                placeholder={repayType === 'percentage' ? '0.00' : '0.00'}
                step={repayType === 'percentage' ? '0.01' : '0.01'}
                min="0"
                style={{
                  width: '100%',
                  padding: '6px',
                  fontSize: '12px',
                  border: '1px solid #dee2e6',
                  borderRadius: '3px',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{
                fontSize: '10px',
                color: '#999',
                marginTop: '2px',
              }}>
                {repayType === 'percentage' ? 'Usar valores 0-100' : 'Digite o valor em R$'}
              </div>
            </div>
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
        ℹ️ Essas configurações serão aplicadas ao faturamento. Repasse médico será calculado automaticamente.
      </div>
    </div>
  );
}

export default BillingTypeSelector;
