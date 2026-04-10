/**
 * AgendaSuggestions - Extended with Financial Priority
 * 
 * Componente integrado que combina:
 * 1. Sugestões inteligentes de encaixe (SLOT_LIVRE, NO_SHOW, etc)
 * 2. Sugestões de prioridade financeira (score-based)
 * 
 * Mostra ambos os tipos de sugestão lado-a-lado ou em abas
 */

import React, { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import AgendaSuggestions from './AgendaSuggestions';
import FinancialPrioritySuggestions from './FinancialPrioritySuggestions';
import { AlertCircle, TrendingUp } from 'lucide-react';

/**
 * Wrapper que integra sugestões normais + financeiras
 */
export function CombinedAgendaSuggestions({
  clinicId,
  date,
  normalSuggestions = [],
  financialSuggestions = [],
  loadingNormal = false,
  loadingFinancial = false,
  errorNormal = null,
  errorFinancial = null,
  onNormalSuggestionAction,
  onFinancialSuggestionAction,
  onFinancialIgnore,
  userRole = 'recepcion',
  layout = 'tabs', // 'tabs' ou 'combined'
}) {
  const [activeTab, setActiveTab] = useState('financial'); // Mostrar financeiro por padrão

  // Stats financeiros
  const financialStats = useMemo(() => {
    if (!financialSuggestions.length) return null;

    return {
      total: financialSuggestions.length,
      totalValue: financialSuggestions.reduce((sum, s) => sum + (s.valor_estimado || 0), 0),
      averageScore: Math.round(
        financialSuggestions.reduce((sum, s) => sum + s.score_financeiro, 0) / 
        financialSuggestions.length
      ),
      topScore: Math.max(...financialSuggestions.map(s => s.score_financeiro || 0)),
    };
  }, [financialSuggestions]);

  // Layout em abas
  if (layout === 'tabs') {
    return (
      <div className="w-full">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="financial" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Prioridade Financeira
              {financialSuggestions.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-800 text-xs font-bold rounded">
                  {financialSuggestions.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="normal" className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Encaixe Inteligente
              {normalSuggestions.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded">
                  {normalSuggestions.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Aba: Prioridade Financeira */}
          <TabsContent value="financial" className="mt-4">
            {financialStats && (
              <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <p className="text-xs text-gray-600">Total</p>
                    <p className="text-lg font-bold text-blue-700">{financialStats.total}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Valor Total</p>
                    <p className="text-lg font-bold text-green-700">
                      R$ {financialStats.totalValue.toFixed(0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Score Médio</p>
                    <p className="text-lg font-bold text-yellow-700">{financialStats.averageScore}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Melhor Score</p>
                    <p className="text-lg font-bold text-red-700">{financialStats.topScore}</p>
                  </div>
                </div>
              </div>
            )}

            <FinancialPrioritySuggestions
              suggestions={financialSuggestions}
              loading={loadingFinancial}
              error={errorFinancial}
              onCreateAppointment={onFinancialSuggestionAction}
              onIgnore={onFinancialIgnore}
              userRole={userRole}
            />
          </TabsContent>

          {/* Aba: Encaixe Inteligente */}
          <TabsContent value="normal" className="mt-4">
            <AgendaSuggestions
              clinicId={clinicId}
              date={date}
              suggestions={normalSuggestions}
              loading={loadingNormal}
              error={errorNormal}
              onSuggestionAction={onNormalSuggestionAction}
              userRole={userRole}
            />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Layout combinado (ambos visíveis)
  return (
    <div className="w-full space-y-8">
      {/* Seção: Prioridade Financeira */}
      <div>
        {financialStats && (
          <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
            <h3 className="font-bold text-gray-900 mb-3">📊 Resumo Financeiro</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <p className="text-xs text-gray-600">Oportunidades</p>
                <p className="text-2xl font-bold text-blue-700">{financialStats.total}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Valor Total</p>
                <p className="text-2xl font-bold text-green-700">
                  R$ {(financialStats.totalValue / 1000).toFixed(1)}k
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Score Médio</p>
                <p className="text-2xl font-bold text-yellow-700">{financialStats.averageScore}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Melhor</p>
                <p className="text-2xl font-bold text-red-700">{financialStats.topScore}/100</p>
              </div>
            </div>
          </div>
        )}

        <FinancialPrioritySuggestions
          suggestions={financialSuggestions}
          loading={loadingFinancial}
          error={errorFinancial}
          onCreateAppointment={onFinancialSuggestionAction}
          onIgnore={onFinancialIgnore}
          userRole={userRole}
        />
      </div>

      {/* Divisor */}
      <hr className="border-gray-200" />

      {/* Seção: Encaixe Inteligente */}
      <div>
        <AgendaSuggestions
          clinicId={clinicId}
          date={date}
          suggestions={normalSuggestions}
          loading={loadingNormal}
          error={errorNormal}
          onSuggestionAction={onNormalSuggestionAction}
          userRole={userRole}
        />
      </div>
    </div>
  );
}

export default CombinedAgendaSuggestions;

