/**
 * AppointmentItemsFooter.jsx - Rodapé Financeiro
 * Mostra: Subtotal, Desconto, Acréscimos, Total Geral
 * 
 * FASE 4-5: UI Enterprise
 */

import React from 'react';

// 💰 Formatação de moeda brasileira
const formatCurrency = (value) => {
  const numValue = parseFloat(value || 0);
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(numValue);
};

/**
 * AppointmentItemsFooter - Totalizações financeiras
 * Mostra Subtotal, Desconto, Acréscimos, Total Geral
 */
function AppointmentItemsFooter({ totals = {} }) {
  const subtotal = parseFloat(totals.subtotal || 0);
  const discount = parseFloat(totals.total_discount || 0);
  const additions = parseFloat(totals.total_additions || 0);
  const grandTotal = parseFloat(totals.grand_total || 0);

  return (
    <div style={{
      backgroundColor: '#f8f9fa',
      border: '1px solid #dee2e6',
      borderRadius: '4px',
      padding: '12px 16px',
      marginBottom: '12px',
      fontSize: '13px',
    }}>
      {/* Linhas de Totalizações */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '12px',
        marginBottom: '12px',
      }}>
        {/* Subtotal */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, color: '#333' }}>📊 Subtotal:</span>
          <span style={{ fontWeight: 600, color: '#2c3e50' }}>{formatCurrency(subtotal)}</span>
        </div>

        {/* Desconto */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, color: '#e74c3c' }}>📉 Desconto:</span>
          <span style={{ fontWeight: 600, color: '#e74c3c' }}>-{formatCurrency(discount)}</span>
        </div>

        {/* Acréscimos */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, color: '#27ae60' }}>📈 Acréscimos:</span>
          <span style={{ fontWeight: 600, color: '#27ae60' }}>+{formatCurrency(additions)}</span>
        </div>
      </div>

      {/* Separador */}
      <div style={{
        borderTop: '2px solid #dee2e6',
        paddingTop: '12px',
        marginTop: '12px',
      }}>
        {/* Total Geral */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontWeight: 700,
          fontSize: '16px',
          color: '#2c3e50',
          backgroundColor: '#e8f8f5',
          padding: '12px',
          borderRadius: '3px',
          border: '1px solid #a9dfbf',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            💰 TOTAL GERAL
          </span>
          <span style={{ color: '#27ae60', fontSize: '18px' }}>
            {formatCurrency(grandTotal)}
          </span>
        </div>
      </div>

      {/* Informações Adicionais */}
      {totals.professional_total && parseFloat(totals.professional_total) > 0 && (
        <div style={{
          marginTop: '8px',
          padding: '8px',
          backgroundColor: '#fff3cd',
          borderLeft: '3px solid #ffc107',
          fontSize: '12px',
          color: '#856404',
        }}>
          👨‍⚕️ Repasse Médico: <strong>{formatCurrency(totals.professional_total)}</strong>
        </div>
      )}
    </div>
  );
}

export default AppointmentItemsFooter;
