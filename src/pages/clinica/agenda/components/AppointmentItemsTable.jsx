/**
 * AppointmentItemsTable.jsx - Tabela Enterprise de Serviços
 * Renderiza serviços em tabela com colunas: Código, Nome, Qtd, Unitário, Desconto, Total
 * 
 * FASE 4-5: UI Enterprise
 */

import React from 'react';
import { Copy, Edit2, Trash2 } from 'lucide-react';

// 💰 Formatação de moeda brasileira
const formatCurrency = (value) => {
  const numValue = parseFloat(value || 0);
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(numValue);
};

/**
 * AppointmentItemsTable - Renderização em tabela dos serviços
 * Mostra código, nome, quantidade, valor unitário, desconto e total
 */
function AppointmentItemsTable({
  items = [],
  loading = false,
  onUpdateItem = () => {},
  onRemoveItem = () => {},
  onEditItem = () => {},
  onDuplicateItem = () => {},
}) {
  const getUnitValue = (item) => Number(item.value ?? item.unit_price ?? item.price ?? 0) || 0;
  const getQuantity = (item) => Number(item.quantity || 1) || 1;
  const getBillableQuantity = (item) => {
    if (item.package_billable_quantity !== undefined && item.package_billable_quantity !== null) {
      return Math.max(0, Number(item.package_billable_quantity) || 0);
    }
    return getQuantity(item);
  };
  const getDiscount = (item) => Number(item.discount || 0) || 0;
  const getBillingLabel = (item) => ({
    per_consultation: 'Por Consulta',
    package: 'Pacote',
    sessions: 'Sessões',
    class: 'Aula',
    fixed: 'Valor Fixo',
  }[item.billing_type] || 'Por Consulta');
  const getBillingDetails = (item) => {
    const quantity = getQuantity(item);
    if (item.billing_type === 'package') return `${quantity} sessões incluídas`;
    if (item.billing_type === 'sessions') return `${quantity} sessão${quantity > 1 ? 'ões' : ''}`;
    if (item.billing_type === 'class') return `${quantity} aula${quantity > 1 ? 's' : ''}`;
    if (item.billing_type === 'fixed') return 'Total fixo';
    return `${quantity} consulta${quantity > 1 ? 's' : ''}`;
  };
  const getPackageBalanceText = (item) => {
    const balance = item.package_balance;
    if (!balance) return '';

    const used = Number(balance.used_sessions || 0) || 0;
    const total = Number(balance.total_sessions || 0) || 0;
    const remaining = Math.max(0, total - used);

    if (total <= 0) return '';
    return `${used} de ${total} usado${used === 1 ? '' : 's'} (${remaining} restante${remaining === 1 ? '' : 's'})`;
  };

  return (
    <div style={{ width: '100%', marginBottom: '12px' }}>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '13px',
        backgroundColor: '#f8f9fa',
        border: '1px solid #dee2e6',
        borderRadius: '4px',
        overflow: 'hidden',
      }}>
        <thead>
          <tr style={{ backgroundColor: '#f1f3f5', fontWeight: 600 }}>
            <th style={{ 
              padding: '8px', 
              textAlign: 'left', 
              borderBottom: '2px solid #dee2e6',
              width: '8%',
              color: '#333'
            }}>Código</th>
            <th style={{ 
              padding: '8px', 
              textAlign: 'left', 
              borderBottom: '2px solid #dee2e6',
              width: '40%',
              color: '#333'
            }}>Serviço</th>
            <th style={{ 
              padding: '8px', 
              textAlign: 'center', 
              borderBottom: '2px solid #dee2e6',
              width: '8%',
              color: '#333'
            }}>Qtd</th>
            <th style={{ 
              padding: '8px', 
              textAlign: 'right', 
              borderBottom: '2px solid #dee2e6',
              width: '12%',
              color: '#333'
            }}>Unitário</th>
            <th style={{ 
              padding: '8px', 
              textAlign: 'right', 
              borderBottom: '2px solid #dee2e6',
              width: '12%',
              color: '#333'
            }}>Desconto</th>
            <th style={{ 
              padding: '8px', 
              textAlign: 'right', 
              borderBottom: '2px solid #dee2e6',
              width: '12%',
              color: '#333'
            }}>Total</th>
            <th style={{ 
              padding: '8px', 
              textAlign: 'center', 
              borderBottom: '2px solid #dee2e6',
              width: '18%',
              color: '#333'
            }}>Cobrança</th>
            <th style={{ 
              padding: '8px', 
              textAlign: 'center', 
              borderBottom: '2px solid #dee2e6',
              width: '10%',
              color: '#333'
            }}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {items && items.length > 0 ? (
            items.map((item, index) => (
              <tr 
                key={item.id || index}
                style={{
                  borderBottom: '1px solid #dee2e6',
                  backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f1f3f5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#fff' : '#f8f9fa';
                }}
              >
                <td style={{ padding: '8px', color: '#666' }}>
                  {item.service_code || '-'}
                </td>
                <td style={{ padding: '8px', color: '#333', fontWeight: 500 }}>
                  {item.service_name || item.name || ''}
                </td>
                <td style={{ padding: '8px', textAlign: 'center', color: '#666' }}>
                  {item.quantity || 1}
                </td>
                <td style={{ padding: '8px', textAlign: 'right', color: '#333' }}>
                  {formatCurrency(getUnitValue(item))}
                </td>
                <td style={{ padding: '8px', textAlign: 'right', color: '#e74c3c', fontWeight: 600 }}>
                  -{formatCurrency(getDiscount(item))}
                </td>
                <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: '#27ae60' }}>
                  {formatCurrency(Math.max(0, getUnitValue(item) * getBillableQuantity(item) - getDiscount(item)))}
                  {Number(item.package_covered_value || 0) > 0 && (
                    <div style={{ fontSize: '11px', color: '#047857', fontWeight: 600 }}>
                      Coberto: {formatCurrency(item.package_covered_value)}
                    </div>
                  )}
                </td>
                <td style={{ padding: '8px', textAlign: 'center', color: '#4b5563', fontWeight: 600 }}>
                  <div>{getBillingLabel(item)}</div>
                  <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 400 }}>
                    {getBillingDetails(item)}
                  </div>
                  {getPackageBalanceText(item) && (
                    <div style={{
                      display: 'inline-block',
                      marginTop: '4px',
                      padding: '2px 6px',
                      borderRadius: '999px',
                      backgroundColor: '#ecfdf5',
                      color: '#047857',
                      border: '1px solid #a7f3d0',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}>
                      Pacote: {getPackageBalanceText(item)}
                    </div>
                  )}
                  {Number(item.package_consumed_sessions || 0) > 0 && (
                    <div style={{ fontSize: '11px', color: '#047857', fontWeight: 700, marginTop: '3px' }}>
                      Este atendimento consumiu {item.package_consumed_sessions} sessão{Number(item.package_consumed_sessions) === 1 ? '' : 'ões'} do pacote
                    </div>
                  )}
                </td>
                <td style={{ padding: '8px', textAlign: 'center' }}>
                  <button 
                    onClick={() => onEditItem(item.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#3498db',
                      marginRight: '8px',
                      fontSize: '16px',
                      padding: '2px 4px',
                      transition: 'color 0.2s',
                    }}
                    onMouseEnter={(e) => e.target.style.color = '#2980b9'}
                    onMouseLeave={(e) => e.target.style.color = '#3498db'}
                    title="Editar serviço"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    onClick={() => onDuplicateItem(item.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#7c3aed',
                      marginRight: '8px',
                      padding: '2px 4px',
                      transition: 'color 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#5b21b6'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#7c3aed'}
                    title="Duplicar serviço"
                  >
                    <Copy size={14} />
                  </button>
                  <button 
                    onClick={() => {
                      if (window.confirm('Deseja remover este serviço?')) {
                        onRemoveItem(item.id);
                      }
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#e74c3c',
                      fontSize: '16px',
                      padding: '2px 4px',
                      transition: 'color 0.2s',
                    }}
                    onMouseEnter={(e) => e.target.style.color = '#c0392b'}
                    onMouseLeave={(e) => e.target.style.color = '#e74c3c'}
                    title="Remover serviço"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="8" style={{
                padding: '24px',
                textAlign: 'center',
                color: '#999',
                fontStyle: 'italic'
              }}>
                📋 Nenhum serviço adicionado. Use o campo abaixo para adicionar serviços.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default AppointmentItemsTable;
