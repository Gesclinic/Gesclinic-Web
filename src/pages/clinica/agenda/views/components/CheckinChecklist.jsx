/**
 * CheckinChecklist.jsx
 *
 * ✅ CHECKLIST INTELIGENTE
 *
 * Lógica:
 * - Itens base SEMPRE obrigatórios
 * - Itens extras conforme tipo de serviço e convênio
 * - Checklist incompleto = botão liberar desabilitado
 * - Cada item tem tooltip explicativo
 */

import React, { useMemo, useEffect, useState } from 'react';
import { CheckCircle2, Circle, AlertCircle, Info, Edit2 } from 'lucide-react';

export default function CheckinChecklist({ appointment, onStatusChange, onEditItem }) {
  const [editingItemId, setEditingItemId] = useState(null);
  // ============================================
  // DEFINIÇÃO DE ITENS DO CHECKLIST
  // ============================================

  const checklistItems = useMemo(() => {
    const items = [];

    // SEMPRE OBRIGATÓRIO
    items.push({
      id: 'dados_cadastrais',
      label: 'Dados cadastrais conferidos',
      description: 'Nome, data de nascimento, CPF, endereço atualizados',
      required: true,
      status: appointment?.patient_verified || false,
    });

    items.push({
      id: 'servico',
      label: 'Serviço correto',
      description: 'Validar tipo de consulta/procedimento agendado',
      required: true,
      status: !!appointment?.service_name,
    });

    items.push({
      id: 'profissional',
      label: 'Profissional correto',
      description: 'Confirmar que o profissional é aquele esperado',
      required: true,
      status: !!appointment?.professional_name,
    });

    // SE CONVÊNIO
    if (appointment?.payer_type === 'CONVENIO' || appointment?.payer_name) {
      items.push({
        id: 'convenio_valido',
        label: 'Convênio válido',
        description: 'Verificar se o plano está ativo e sem restrições',
        required: true,
        status: appointment?.payer_verified || false,
      });

      items.push({
        id: 'carteira',
        label: 'Carteirinha conferida',
        description: 'Copiar/anexar carteira ou validar número',
        required: true,
        status: appointment?.card_verified || false,
      });

      items.push({
        id: 'autorizacao',
        label: 'Autorização válida',
        description: 'Solicitar autorização ao convênio se necessário',
        required: true,
        status: appointment?.authorization_verified || false,
      });

      items.push({
        id: 'guia',
        label: 'Guia gerada',
        description: 'Gerar guia (manual ou automática) antes de liberar',
        required: true,
        status: !!appointment?.guide_number,
      });
    }

    // SE PARTICULAR
    if (appointment?.payer_type === 'PARTICULAR' || !appointment?.payer_name) {
      items.push({
        id: 'pagamento_definido',
        label: 'Forma de pagamento definida',
        description: 'Débito, crédito, PIX, dinheiro ou conforme convênio',
        required: true,
        status: !!appointment?.payment_method,
      });

      items.push({
        id: 'pagamento_status',
        label: 'Pagamento OK',
        description: 'Recebido ANTES ou APÓS atendimento (esclarecer)',
        required: true,
        status: !!appointment?.payment_received || appointment?.payment_authorized_after,
      });
    }

    return items;
  }, [appointment]);

  // ============================================
  // STATUS DO CHECKLIST
  // ============================================

  const isChecklistComplete = useMemo(() => {
    return checklistItems.every((item) => item.status === true);
  }, [checklistItems]);

  const completedCount = useMemo(
    () => checklistItems.filter((item) => item.status).length,
    [checklistItems],
  );

  // ============================================
  // RENDERIZAÇÃO
  // ============================================

  // Itens pendentes para navegação rápida
  const pendingItems = useMemo(
    () => checklistItems.filter((item) => !item.status),
    [checklistItems],
  );

  // Notificar quando status mudar
  useEffect(() => {
    if (onStatusChange) {
      onStatusChange(isChecklistComplete);
    }
  }, [isChecklistComplete, onStatusChange]);

  return (
    <div className="space-y-6">
      {/* Alerta de Itens Pendentes - Destaque em topo */}
      {pendingItems.length > 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={24} />
            <div className="flex-1">
              <p className="font-bold text-red-900 text-lg">
                ⚠️ {pendingItems.length} Itens Pendentes
              </p>
              <p className="text-sm text-red-700 mt-1">
                Complete os itens abaixo antes de liberar para atendimento
              </p>
              {/* Links rápidos para itens pendentes */}
              <div className="mt-3 space-y-2">
                {pendingItems.map((item) => (
                  <div
                    key={item.id}
                    className="text-sm bg-white border border-red-200 rounded px-3 py-2 flex items-center justify-between hover:bg-red-50 transition"
                  >
                    <span className="text-red-900 font-medium">{item.label}</span>
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                      Obrigatório
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Barra de Progresso */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="font-semibold text-gray-900">Progresso do Checklist</p>
          <span
            className={`text-lg font-bold ${
              isChecklistComplete ? 'text-green-600' : 'text-orange-600'
            }`}
          >
            {completedCount}/{checklistItems.length}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              isChecklistComplete ? 'bg-green-500' : 'bg-orange-500'
            }`}
            style={{
              width: `${(completedCount / checklistItems.length) * 100}%`,
            }}
          ></div>
        </div>
        {isChecklistComplete && (
          <p className="text-sm text-green-700 mt-3 flex items-center gap-2">
            <CheckCircle2 size={16} /> ✅ Checklist completo! Pronto para liberar
          </p>
        )}
        {!isChecklistComplete && (
          <p className="text-sm text-orange-700 mt-3 flex items-center gap-2">
            <AlertCircle size={16} /> ⚠️ {checklistItems.filter((i) => !i.status).length} itens
            pendentes
          </p>
        )}
      </div>

      {/* Itens do Checklist */}
      <div className="space-y-3">
        {checklistItems.map((item) => (
          <div
            key={item.id}
            className={`border rounded-lg p-4 transition ${
              item.status
                ? 'border-gray-200 hover:border-gray-300 bg-gray-50'
                : 'border-orange-300 hover:border-orange-400 bg-orange-50'
            }`}
          >
            <div className="flex items-start gap-3">
              {item.status ? (
                <CheckCircle2 className="text-green-600 flex-shrink-0 mt-1" size={24} />
              ) : (
                <Circle className="text-orange-400 flex-shrink-0 mt-1" size={24} />
              )}

              <div className="flex-1">
                <p className={`font-semibold ${item.status ? 'text-gray-900' : 'text-orange-900'}`}>
                  {item.label}
                </p>
                <p className="text-sm text-gray-600 mt-1">{item.description}</p>

                {item.required && !item.status && (
                  <p className="text-xs text-rose-600 mt-2 font-semibold">⚠️ OBRIGATÓRIO</p>
                )}

                {/* Botão Editar para itens pendentes */}
                {!item.status && (
                  <button
                    onClick={() => {
                      setEditingItemId(item.id);
                      onEditItem?.(item.id);
                    }}
                    className="mt-3 inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition"
                  >
                    <Edit2 size={14} />
                    Editar
                  </button>
                )}
              </div>

              {/* Status Badge */}
              <div className="flex-shrink-0">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    item.status ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                  }`}
                >
                  {item.status ? '✅ OK' : '⏳ Pendente'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Nota Importante */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <Info className="text-blue-600 flex-shrink-0 mt-1" size={20} />
        <div>
          <p className="font-semibold text-blue-900">Como funciona</p>
          <ul className="text-sm text-blue-800 mt-2 space-y-1">
            <li>✅ Marque cada item conforme valida em tempo real</li>
            <li>🚫 Não é possível liberar com itens pendentes</li>
            <li>⚙️ Itens adicionais aparecem conforme tipo de convênio</li>
            <li>💾 Sistema registra automaticamente quando libera</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
