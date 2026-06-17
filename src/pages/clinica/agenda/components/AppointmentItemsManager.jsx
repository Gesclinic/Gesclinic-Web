/**
 * AppointmentItemsManager.jsx
 * 
 * Gerenciador de múltiplos itens de atendimento
 * 
 * Layout compacto:
 * - Linha de entrada: CÓDIGO | SERVIÇO | CONVENIO | VALOR | [+ ADICIONAR]
 * - Grid de itens: mostra itens adicionados
 * - Rodapé: totalizações
 * 
 * Features:
 * - Linha compacta sem modal
 * - Edição inline
 * - Remover itens
 * - Cálculos automáticos
 * - Rodapé financeiro
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  getAppointmentServices,
  syncAppointmentServices,
} from '@/lib/appointmentsApi';
import { calculateAppointmentItemsTotals } from '@/lib/appointmentItemsApi';
import ServiceAddRow from './ServiceAddRow';
import AppointmentItemsTable from './AppointmentItemsTable';         // ✨ FASE 4-5
import AppointmentItemsFooter from './AppointmentItemsFooter';       // ✨ FASE 4-5
import BillingTypeSelector from './BillingTypeSelector';             // ✨ FASE 4-5

// Utilitários
const formatCurrency = (value) => {
  const numValue = parseFloat(value || 0);
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(numValue);
};

const createTemporaryId = () => `temp-${Date.now()}-${Math.random()}`;

const calculateTotals = (items = []) => calculateAppointmentItemsTotals(items);

const normalizeItemForSync = (item = {}) => ({
  service_id: item.service_id,
  service_name: item.service_name || item.name || '',
  service_code: item.service_code || item.code || '',
  value: item.value ?? item.unit_price ?? item.final_value ?? item.price ?? 0,
  unit_price: item.value ?? item.unit_price ?? item.final_value ?? item.price ?? 0,
  discount: item.discount || 0,
  quantity: item.quantity || 1,
  billing_type: item.billing_type || 'per_consultation',
  sessions_completed: item.sessions_completed || 0,
  status: item.status || 'pending',
  professional_percentage: item.professional_percentage || 0,
  professional_discount: item.professional_discount || item.professional_value || 0,
  professional_repay_type: item.professional_repay_type || item.repay_type || 'percentage',
});

function AppointmentItemsManager({
  appointmentId,
  services = [],
  payers = [],
  clinicId,
  professionalId,
  payerId,
  payerName,
  onPayerChange = () => {},
  savedServices = [], // ✨ NEW: Serviços salvos no state do pai para restaurar após remontagem
  onItemsChange = () => {},
  onTotalsUpdate = () => {},
  onError = () => {},
}) {
  // 🔍 LOG: Rastrear appointmentId
  useEffect(() => {
    console.log('📋 [AppointmentItemsManager] Recebido appointmentId:', appointmentId);
    console.log('   → Tipo:', typeof appointmentId);
    console.log('   → Vazio?:', !appointmentId);
    console.log('   → isDraft será:', !appointmentId);
  }, [appointmentId]);

  // ✨ NEW: Restaurar savedServices quando componente remonta após mudança de aba
  useEffect(() => {
    if (savedServices && savedServices.length > 0 && items.length === 0) {
      console.log('✨ [RESTORE] Restaurando savedServices após remontagem:', {
        count: savedServices.length,
        services: savedServices.map(s => ({ id: s.id, service_name: s.service_name })),
      });
      
      const totalsData = calculateTotals(savedServices);
      
      // Restaurar itens e totalizações
      setItems(savedServices);
      setTotals(totalsData);
      
      // Notificar pai que estado foi restaurado
      onItemsChange(savedServices);
    }
  }, [savedServices]);
  
  // ✨ CRITICAL: Ref para rastrear se há itens em rascunho local
  // Isso evita perder dados quando appointmentId muda enquanto em draft mode
  const hasLocalDraftItemsRef = useRef(false);
  
  // Estado
  const [items, setItems] = useState([]);
  const [totals, setTotals] = useState({
    subtotal: 0,
    total_discount: 0,
    total_additions: 0,
    grand_total: 0,
    professional_total: 0,
  });
  const [loading, setLoading] = useState(!!appointmentId); // Apenas carrega se há appointmentId
  const [editingItemId, setEditingItemId] = useState(null);
  const [isDraft, setIsDraft] = useState(!appointmentId); // Flag para modo rascunho
  
  // ✨ FASE 4-5: Estados para Tipo de Cobrança e Repasse Médico
  const [billingType, setBillingType] = useState('per_consultation');
  const [repayPercentage, setRepayPercentage] = useState(0);
  const [repayType, setRepayType] = useState('discount');
  
  // 🔴 DEBUG
  useEffect(() => {
    console.log('🔴 [DEBUG] isDraft state changed:', isDraft);
  }, [isDraft]);

  // Carregar itens ao montar ou quando appointmentId muda
  useEffect(() => {
    console.log('🔄 [AppointmentItemsManager] useEffect triggerado com appointmentId:', appointmentId);
    if (appointmentId) {
      console.log('   → Modo SAVED: carregando itens existentes');
      // 🔔 Se há itens em rascunho e appointmentId foi atribuído, persistir primeiro
      const draftItemsToSave = items.filter(item => item.is_temporary);
      if (draftItemsToSave.length > 0) {
        console.log('🔔 Há', draftItemsToSave.length, 'itens em rascunho. Persistindo antes de carregar itens do DB...');
        persistDraftItems(appointmentId).then(() => {
          console.log('✅ Itens em rascunho foram persistidos');
          setIsDraft(false);
          loadItems();
        }).catch(err => {
          console.error('❌ Erro ao persistir itens:', err);
          setIsDraft(false);
          loadItems(); // Tentar carregar mesmo com erro
        });
      } else {
        // ✨ CRITICAL FIX: Se há itens locais em rascunho (NÃO marcados com is_temporary)
        // não tentar carregar do banco. Manter estado local.
        if (hasLocalDraftItemsRef.current) {
          console.log('✨ [CRITICAL FIX] Detectado itens locais em rascunho. Mantendo no estado local!');
          setIsDraft(true); // Manter em draft mode
          setLoading(false);
          return;
        }
        
        setIsDraft(false);
        loadItems();
      }
    } else {
      console.log('   → Modo DRAFT: aguardando novos itens');
      setIsDraft(true);
      setLoading(false);
    }
  }, [appointmentId]);

  // Carregar itens e totalizações
  const loadItems = async () => {
    try {
      setLoading(true);
      // ✅ FIX: Usar getAppointmentServices ao invés de getAppointmentItems
      // appointment_services é a tabela correta que está populada
      const servicesData = await getAppointmentServices(appointmentId);

      // Mapear dados de appointment_services para o formato esperado
      const formattedItems = (servicesData || []).map(service => ({
        id: service.id,
        service_id: service.service_id,
        service_name: service.service_name || service.services?.name || '',
        service_code: service.service_code || service.services?.code || '',
        value: service.value || 0,
        discount: service.discount || 0,
        quantity: service.quantity || 1,
        billing_type: service.billing_type || 'per_consultation',
        sessions_completed: service.sessions_completed || 0,
        status: service.status || 'pending',
      }));

      const totalsData = calculateTotals(formattedItems);

      console.log('📋 [loadItems] Itens carregados de appointment_services:', {
        count: formattedItems.length,
        items: formattedItems.map(item => ({
          id: item.id,
          service_id: item.service_id,
          service_name: item.service_name,
          value: item.value,
        })),
        totals: totalsData,
      });
      
      // ✨ CRITICAL: Resetar flag porque agora temos dados do banco
      hasLocalDraftItemsRef.current = false;
      
      setItems(formattedItems);
      setTotals(totalsData);
      
      // ✅ CRÍTICO: Chamar onItemsChange com items carregados
      console.log('📢 [loadItems] Chamando onItemsChange com', formattedItems.length, 'itens');
      onItemsChange(formattedItems);
    } catch (err) {
      console.error('❌ Erro ao carregar itens:', err);
      onError('Erro ao carregar itens do atendimento');
    } finally {
      setLoading(false);
    }
  };

  // Adicionar novo item
  const handleAddItem = async (itemData) => {
    try {
      console.log('📝 [handleAddItem] Adicionando item:', {
        itemData,
        isDraft,
        appointmentId,
      });
      
      if (isDraft) {
        // 📝 MODO RASCUNHO: Adicionar localmente sem salvar no DB
        console.log('📝 [DRAFT] Modo RASCUNHO - Adicionando item temporário:', itemData);
        
        // ✨ CRITICAL: Marcar que há itens em rascunho local
        hasLocalDraftItemsRef.current = true;
        
        // Gerar ID temporário
        const tempId = createTemporaryId();
        const tempItem = {
          id: tempId,
          ...itemData,
          is_temporary: true,
        };
        
        const updatedItems = [...items, tempItem];
        setItems(updatedItems);
        
        // 🔴 CRITICAL LOG
        console.log('🔴 [DRAFT MODE] onItemsChange SERÁ CHAMADO com:', {
          length: updatedItems.length,
          items: updatedItems.map(i => ({ id: i.id, service_name: i.service_name })),
        });
        
        onItemsChange?.(updatedItems);
        
        // 🔴 VERIFY CALLBACK WAS CALLED
        console.log('🔴 [DRAFT MODE] onItemsChange FOI CHAMADO. Se não vê este log depois, callback não funciona!');
        
        const newTotals = calculateTotals(updatedItems);
        setTotals(newTotals);
        onTotalsUpdate?.(newTotals);
        
        console.log('✅ [DRAFT] Item adicionado em modo RASCUNHO. Será persistido quando o agendamento for criado.');
        return;
      }

      // 💾 MODO SALVO: Salvar no DB
      console.log('💾 [SAVED] Modo SALVO - Salvando item no banco de dados com appointmentId:', appointmentId);
      setLoading(true);
      
      // ✅ FIX: Usar syncAppointmentServices ao invés de createAppointmentItem
      // syncAppointmentServices sincroniza TODOS os serviços
      const formattedItem = normalizeItemForSync(itemData);
      
      const updatedItems = [...items, formattedItem];
      
      // Chamar syncAppointmentServices com todos os itens
      await syncAppointmentServices(appointmentId, updatedItems);
      
      setItems(updatedItems);
      
      console.log('🔴 [SAVED MODE] onItemsChange SERÁ CHAMADO com:', {
        length: updatedItems.length,
        items: updatedItems.map(i => ({ id: i.id, service_name: i.service_name })),
      });
      
      onItemsChange?.(updatedItems);
      
      console.log('🔴 [SAVED MODE] onItemsChange FOI CHAMADO');

      const newTotals = calculateTotals(updatedItems);
      setTotals(newTotals);
      onTotalsUpdate?.(newTotals);
      console.log('✅ [SAVED] Item salvo no banco de dados com sucesso!');
    } catch (err) {
      console.error('❌ Erro ao adicionar item:', err);
      onError?.('Erro ao adicionar item');
    } finally {
      setLoading(false);
    }
  };

  // Atualizar item
  const handleUpdateItem = async (itemId, updates) => {
    try {
      setLoading(true);
      
      // ✅ FIX: Reconstruir array completo e fazer re-sync
      const updatedItems = items.map(item =>
        item.id === itemId ? { ...item, ...updates } : item
      );
      setItems(updatedItems);
      
      // Sincronizar todos os itens
      if (!itemId.toString().startsWith('temp-')) {
        await syncAppointmentServices(appointmentId, updatedItems);
      }
      
      onItemsChange(updatedItems);

      const newTotals = calculateTotals(updatedItems);
      setTotals(newTotals);
      onTotalsUpdate?.(newTotals);
      
      setEditingItemId(null);
    } catch (err) {
      console.error('❌ Erro ao atualizar item:', err);
      onError('Erro ao atualizar item');
    } finally {
      setLoading(false);
    }
  };

  // Remover item
  const handleRemoveItem = async (itemId) => {
    if (!window.confirm('Tem certeza que deseja remover este item?')) {
      return;
    }

    try {
      setLoading(true);
      
      const updatedItems = items.filter(item => item.id !== itemId);
      setItems(updatedItems);
      onItemsChange?.(updatedItems);

      // Se for item real, sincronizar remocão
      if (!itemId.toString().startsWith('temp-')) {
        await syncAppointmentServices(appointmentId, updatedItems);
      }

      const newTotals = calculateTotals(updatedItems);
      setTotals(newTotals);
      onTotalsUpdate?.(newTotals);
    } catch (err) {
      console.error('❌ Erro ao remover item:', err);
      onError?.('Erro ao remover item');
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicateItem = async (itemId) => {
    try {
      setLoading(true);
      const originalItem = items.find(item => item.id === itemId);
      if (!originalItem) return;

      const duplicatedItem = {
        ...normalizeItemForSync(originalItem),
        id: isDraft ? createTemporaryId() : undefined,
        is_temporary: isDraft,
        service_name: `${originalItem.service_name || originalItem.name || 'Servico'} (copia)`,
      };

      const updatedItems = [...items, duplicatedItem];
      setItems(updatedItems);
      onItemsChange?.(updatedItems);

      if (!isDraft && appointmentId) {
        await syncAppointmentServices(appointmentId, updatedItems);
      } else {
        hasLocalDraftItemsRef.current = true;
      }

      const newTotals = calculateTotals(updatedItems);
      setTotals(newTotals);
      onTotalsUpdate?.(newTotals);
    } catch (err) {
      console.error('❌ Erro ao duplicar item:', err);
      onError?.('Erro ao duplicar item');
    } finally {
      setLoading(false);
    }
  };

  // 💾 PERSISTIR ITENS EM RASCUNHO QUANDO APPOINTMENT FOR CRIADO
  const persistDraftItems = async (newAppointmentId) => {
    const draftItems = items.filter(item => item.is_temporary);
    
    if (draftItems.length === 0) {
      console.log('ℹ️ Nenhum item em rascunho para persistir');
      return [];
    }

    console.log('💾 [PERSIST] Salvando', draftItems.length, 'itens em rascunho para appointment:', newAppointmentId);
    
    try {
      // Preparar dados para salvar - remover flag is_temporary
      const itemsToSave = draftItems.map(normalizeItemForSync);
      
      // ✅ FIX: Usar syncAppointmentServices ao invés de createAppointmentItem em loop
      const savedItems = await syncAppointmentServices(newAppointmentId, itemsToSave);
      console.log('✅', itemsToSave.length, 'itens em rascunho persistidos com sucesso');
      return savedItems || [];
    } catch (err) {
      console.error('❌ Erro ao persistir itens em rascunho:', err);
      throw err;
    }
  };

  // 🔔 Quando appointmentId mudar de null para real, persistir items
  useEffect(() => {
    if (appointmentId && isDraft) {
      console.log('🔔 AppointmentID foi atribuído! Persistindo itens em rascunho...');
      persistDraftItems(appointmentId)
        .then(() => {
          console.log('✅ Itens em rascunho foram persistidos');
          setIsDraft(false);
        })
        .catch(err => {
          console.error('❌ Erro ao persistir itens:', err);
          setIsDraft(false);
        });
    }
  }, [appointmentId, isDraft]);

  return (
    <div style={{ padding: '0', background: 'transparent' }}>
      {/* 📋 SERVIÇOS DO ATENDIMENTO - Seção única consolidada */}
      <div style={{
        background: '#f0f7ff',
        border: '2px solid #1976d2',
        borderRadius: '6px',
        padding: '16px',
        marginBottom: '16px',
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px 0', color: '#1565c0' }}>
          📋 SERVIÇOS DO ATENDIMENTO
        </h3>

        {/* ✨ LINHA COMPACTA DE ADIÇÃO */}
        <ServiceAddRow
          services={services}
          payers={payers}
          payerName={payerName || ''}
          onAddService={handleAddItem}
          onError={onError}
          professionalId={professionalId}
          payerId={payerId}
          onPayerChange={onPayerChange}
          clinicId={clinicId}
          lastAddedService={items.length > 0 ? items[0] : null}
        />

        {/* ✨ FASE 4-5: Tabela de Itens */}
        <AppointmentItemsTable
          items={items}
          loading={loading}
          onUpdateItem={handleUpdateItem}
          onRemoveItem={handleRemoveItem}
          onEditItem={(id) => setEditingItemId(id)}
          onDuplicateItem={handleDuplicateItem}
        />

        {/* ✨ Totalizações - Integrada na mesma seção */}
        <AppointmentItemsFooter totals={totals} />

        {/* 🔧 MODAL DE EDIÇÃO DE ITEM */}
        {editingItemId && (() => {
          const itemToEdit = items.find(item => item.id === editingItemId);
          if (!itemToEdit) return null;

          return (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}>
              <div style={{
                background: '#fff',
                border: '2px solid #1976d2',
                borderRadius: '8px',
                padding: '24px',
                maxWidth: '500px',
                width: '90%',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px',
                  paddingBottom: '12px',
                  borderBottom: '2px solid #e0e0e0',
                }}>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#333' }}>
                    ✏️ Editar Serviço
                  </h3>
                  <button
                    onClick={() => setEditingItemId(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '24px',
                      cursor: 'pointer',
                      color: '#999',
                      padding: 0,
                    }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#666' }}>
                    📋 Serviço
                  </label>
                  <input
                    type="text"
                    value={itemToEdit.service_name || ''}
                    readOnly
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: 4,
                      fontSize: 13,
                      background: '#f5f5f5',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#666' }}>
                    📊 Quantidade
                  </label>
                  <input
                    type="number"
                    value={itemToEdit.quantity || 1}
                    onChange={(e) => {
                      const updatedItems = items.map(item =>
                        item.id === editingItemId ? { ...item, quantity: parseFloat(e.target.value) || 1 } : item
                      );
                      setItems(updatedItems);
                    }}
                    min="1"
                    step="0.5"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: 4,
                      fontSize: 13,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#666' }}>
                    💰 Valor Unitário (R$)
                  </label>
                  <input
                    type="number"
                    value={itemToEdit.value || 0}
                    onChange={(e) => {
                      const updatedItems = items.map(item =>
                        item.id === editingItemId ? { ...item, value: parseFloat(e.target.value) || 0 } : item
                      );
                      setItems(updatedItems);
                    }}
                    min="0"
                    step="0.01"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: 4,
                      fontSize: 13,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#666' }}>
                    🏷️ Desconto (R$)
                  </label>
                  <input
                    type="number"
                    value={itemToEdit.discount || 0}
                    onChange={(e) => {
                      const updatedItems = items.map(item =>
                        item.id === editingItemId ? { ...item, discount: parseFloat(e.target.value) || 0 } : item
                      );
                      setItems(updatedItems);
                    }}
                    min="0"
                    step="0.01"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: 4,
                      fontSize: 13,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{
                  background: '#f0f7ff',
                  border: '1px solid #b3d9ff',
                  borderRadius: 4,
                  padding: '12px',
                  marginBottom: '16px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#1565c0',
                }}>
                  💵 Total: {formatCurrency((itemToEdit.value || 0) * (itemToEdit.quantity || 1) - (itemToEdit.discount || 0))}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => {
                      handleUpdateItem(editingItemId, {
                        quantity: items.find(i => i.id === editingItemId)?.quantity || 1,
                        value: items.find(i => i.id === editingItemId)?.value || 0,
                        discount: items.find(i => i.id === editingItemId)?.discount || 0,
                      });
                    }}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      background: '#1976d2',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 4,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: 13,
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => e.target.style.background = '#1565c0'}
                    onMouseLeave={(e) => e.target.style.background = '#1976d2'}
                  >
                    ✓ Salvar
                  </button>
                  <button
                    onClick={() => setEditingItemId(null)}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      background: '#e0e0e0',
                      color: '#333',
                      border: 'none',
                      borderRadius: 4,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: 13,
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => e.target.style.background = '#d0d0d0'}
                    onMouseLeave={(e) => e.target.style.background = '#e0e0e0'}
                  >
                    ✕ Cancelar
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      <BillingTypeSelector
        billingType={billingType}
        onBillingTypeChange={setBillingType}
        repayPercentage={repayPercentage}
        repayType={repayType}
        onRepayChange={(changes) => {
          if (changes.repayType) setRepayType(changes.repayType);
          if (changes.repayPercentage !== undefined) setRepayPercentage(changes.repayPercentage);
        }}
      />
      
      {isDraft && items.length > 0 && (
        <div style={{
          padding: '12px',
          background: '#e8f5e9',
          border: '1px solid #81c784',
          borderRadius: 4,
          fontSize: 12,
          color: '#2e7d32',
          marginBottom: 16,
          marginTop: 8,
        }}>
          ℹ️ Itens em rascunho. Serão salvos quando você salvar o agendamento.
        </div>
      )}
    </div>
  );
}

// ====================================================
// COMPONENTE: Rodapé Financeiro - REMOVIDO (usando AppointmentItemsFooter)
// ====================================================

export default AppointmentItemsManager;
