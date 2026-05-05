/**
 * CheckinFinanceiro.jsx
 *
 * 💰 FINANCEIRO SIMPLIFICADO
 *
 * Responsabilidade: Apenas o básico
 * - Particular: registrar pagamento ou autorizar após
 * - Convênio: gerar guia, validar autorização
 *
 * NÃO faz DRE, NÃO faz financeiro pesado
 * Apenas resolve bloqueios para atendimento
 */

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, CreditCard, FileText, Clock, Info, Plus } from 'lucide-react';

export default function CheckinFinanceiro({ appointment }) {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(
    appointment?.payment_method || 'DEBITO',
  );
  const [authorizingAfter, setAuthorizingAfter] = useState(
    appointment?.payment_authorized_after || false,
  );

  // ============================================
  // TIPOS DE PAGAMENTO
  // ============================================

  const paymentMethods = [
    { value: 'DEBITO', label: 'Débito', icon: '💳' },
    { value: 'CREDITO', label: 'Crédito', icon: '💳' },
    { value: 'PIX', label: 'PIX', icon: '📱' },
    { value: 'DINHEIRO', label: 'Dinheiro', icon: '💵' },
    { value: 'CONVENIO', label: 'Convênio', icon: '🏥' },
  ];

  // ============================================
  // RENDERIZAÇÃO
  // ============================================

  return (
    <div className="space-y-6">
      {appointment?.payer_type === 'CONVENIO' || appointment?.payer_name ? (
        // CONVÊNIO
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4">Fluxo de Convênio</h3>

          {/* Informações do Convênio */}
          <div className="space-y-3 mb-6">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="text-blue-600" size={20} />
                <p className="font-semibold text-gray-900">Plano</p>
              </div>
              <p className="text-gray-700">{appointment?.payer_name || 'Convênio não informado'}</p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="text-blue-600" size={20} />
                <p className="font-semibold text-gray-900">Guia</p>
              </div>
              {appointment?.guide_number ? (
                <div className="flex items-center justify-between">
                  <p className="text-gray-700 font-mono">{appointment.guide_number}</p>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                    ✅ Gerada
                  </span>
                </div>
              ) : (
                <p className="text-gray-500">Guia não gerada</p>
              )}
            </div>

            {appointment?.authorization_number && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="text-green-600" size={20} />
                  <p className="font-semibold text-gray-900">Autorização</p>
                </div>
                <p className="text-gray-700 font-mono">{appointment.authorization_number}</p>
              </div>
            )}
          </div>

          {/* Checklist de Convênio */}
          <div className="border border-orange-200 bg-orange-50 rounded-lg p-4 space-y-2">
            <p className="font-semibold text-orange-900 flex items-center gap-2">
              <AlertTriangle size={18} /> Procedimento Convênio
            </p>
            <div className="space-y-2 mt-3 text-sm text-orange-800">
              <div className="flex items-start gap-2">
                {appointment?.guide_number ? (
                  <CheckCircle2 size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <div className="w-4 h-4 border-2 border-orange-400 rounded-full mt-0.5 flex-shrink-0" />
                )}
                <p>
                  <span className="font-semibold">Guia gerada</span>
                  {appointment?.guide_number && <span className="text-green-700 ml-1">✅</span>}
                </p>
              </div>

              <div className="flex items-start gap-2">
                {appointment?.authorization_verified ? (
                  <CheckCircle2 size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <div className="w-4 h-4 border-2 border-orange-400 rounded-full mt-0.5 flex-shrink-0" />
                )}
                <p>
                  <span className="font-semibold">Autorização validada</span>
                  {appointment?.authorization_verified && (
                    <span className="text-green-700 ml-1">✅</span>
                  )}
                </p>
              </div>

              <div className="flex items-start gap-2">
                {appointment?.payer_verified ? (
                  <CheckCircle2 size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <div className="w-4 h-4 border-2 border-orange-400 rounded-full mt-0.5 flex-shrink-0" />
                )}
                <p>
                  <span className="font-semibold">Plano validado</span>
                  {appointment?.payer_verified && <span className="text-green-700 ml-1">✅</span>}
                </p>
              </div>
            </div>
          </div>

          {/* Nota */}
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-3">
            <Info size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800">
              Se houver dúvida, solicitar autorização ao convênio ANTES de liberar.
            </p>
          </div>
        </div>
      ) : (
        // PARTICULAR
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4">Fluxo Particular</h3>

          {/* Valor do Serviço */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Valor do serviço</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {appointment?.price ? `R$ ${appointment.price.toFixed(2)}` : 'Não informado'}
                </p>
              </div>
              {appointment?.price && <CreditCard className="text-blue-600" size={40} />}
            </div>
          </div>

          {/* Forma de Pagamento */}
          <div className="mb-6">
            <p className="font-semibold text-gray-900 mb-3">Forma de Pagamento</p>
            <div className="grid grid-cols-2 gap-2">
              {paymentMethods
                .filter((m) => m.value !== 'CONVENIO')
                .map((method) => (
                  <button
                    key={method.value}
                    onClick={() => setSelectedPaymentMethod(method.value)}
                    className={`p-3 rounded-lg border-2 transition text-center ${
                      selectedPaymentMethod === method.value
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <p className="text-2xl mb-1">{method.icon}</p>
                    <p className="text-sm font-semibold text-gray-900">{method.label}</p>
                  </button>
                ))}
            </div>
          </div>

          {/* Opções de Pagamento */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <input
                type="radio"
                id="pago"
                checked={!authorizingAfter}
                onChange={() => setAuthorizingAfter(false)}
                className="mt-1"
              />
              <label htmlFor="pago" className="flex-1 cursor-pointer">
                <p className="font-semibold text-gray-900">✅ Pagamento Recebido</p>
                <p className="text-sm text-gray-600 mt-1">
                  Paciente já pagou. Pode liberar para atendimento.
                </p>
              </label>
            </div>

            <div className="border-t border-gray-200 pt-3">
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  id="apos"
                  checked={authorizingAfter}
                  onChange={() => setAuthorizingAfter(true)}
                  className="mt-1"
                />
                <label htmlFor="apos" className="flex-1 cursor-pointer">
                  <p className="font-semibold text-gray-900">⏳ Pagar Após Atendimento</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Paciente pagará DEPOIS da consulta/procedimento.
                  </p>
                </label>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="mt-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="text-green-600" size={20} />
              <p className="font-semibold text-green-900">Status Financeiro</p>
            </div>
            <p className="text-green-800">
              {authorizingAfter
                ? '💳 Autorizado para pagar após atendimento'
                : '✅ Pagamento confirmado'}
            </p>
          </div>
        </div>
      )}

      {/* Rodapé Informativo */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <Info className="text-blue-600 flex-shrink-0 mt-1" size={20} />
        <div>
          <p className="font-semibold text-blue-900">Responsabilidade da Recepção</p>
          <p className="text-sm text-blue-800 mt-1">
            Resolver bloqueios ANTES de liberar. Se houver dúvida, <strong>não libera</strong>.
            Dúvidas de valores ou cobertura: encaminhe para financeiro.
          </p>
        </div>
      </div>
    </div>
  );
}
