import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { HelpCircle, X } from 'lucide-react';

/**
 * 📚 Modal de Ajuda - Termos Financeiros
 * 
 * Explica conceitos financeiros em linguagem acessível para gestores
 * Não requer conhecimento técnico de contabilidade
 */
export default function HelpTermsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('entradas');

  const terms = {
    entradas: {
      title: 'Entradas',
      icon: '📥',
      description: 'Dinheiro que entrou no caixa da clínica',
      details: [
        'Inclui recebimentos de pacientes',
        'Recebimentos de convênios',
        'Transferências bancárias',
        'Depósitos em dinheiro',
        'Qualquer outro recebimento',
      ],
    },
    saidas: {
      title: 'Saídas',
      icon: '📤',
      description: 'Dinheiro que saiu do caixa',
      details: [
        'Pagamentos de fornecedores',
        'Repasses a profissionais',
        'Despesas operacionais',
        'Custos de estrutura',
        'Impostos e taxas',
      ],
    },
    saldo: {
      title: 'Saldo',
      icon: '💰',
      description: 'Diferença entre entradas e saídas',
      details: [
        'Fórmula: Saldo = Entradas - Saídas',
        'Se positivo: clínica tem dinheiro em caixa',
        'Se negativo: clínica está em débito',
        'Mostra a saúde financeira no momento',
      ],
    },
    liquidez: {
      title: 'Liquidez',
      icon: '⚡',
      description: 'Capacidade de pagar dívidas com dinheiro disponível',
      details: [
        'Fórmula: Dinheiro em Caixa / Dívidas a Curto Prazo',
        'Se > 1: Saudável (mais dinheiro que dívidas)',
        'Se < 1: Atenção (mais dívidas que dinheiro)',
        'Mostra a segurança financeira da clínica',
      ],
    },
    saldoProjetado: {
      title: 'Saldo Projetado',
      icon: '🎯',
      description: 'Estimativa de saldo daqui 30 dias',
      details: [
        'Baseado em contas a receber e a pagar',
        'Fórmula: Saldo Atual + A Receber (30d) - A Pagar (30d)',
        'Ajuda a planejar fluxo futuro',
        'Não é garantido (dependente de recebimentos)',
      ],
    },
    vencidas: {
      title: 'Contas Vencidas',
      icon: '⚠️',
      description: 'Contas que já passaram da data de vencimento',
      details: [
        'Devem ser cobradas ou negociadas',
        'Afetam a liquidez da clínica',
        'Cada dia de atraso reduz a segurança',
        'Prioridade: cobrar o máximo possível',
      ],
    },
    fluxoReal: {
      title: 'Fluxo Real vs Previsto',
      icon: '📊',
      description: 'Comparação entre o que planejou e o que realmente aconteceu',
      details: [
        'Real: dinheiro que de fato entrou/saiu',
        'Previsto: baseado em contas a receber/pagar',
        'Ajuda a identificar falhas de previsão',
        'Melhora o planejamento futuro',
      ],
    },
    diasCobertura: {
      title: 'Dias de Cobertura',
      icon: '📅',
      description: 'Quantos dias o caixa atual consegue cobrir as despesas',
      details: [
        'Fórmula: Saldo / (Despesas Diárias Médias)',
        'Se 30 dias: caixa cobre 1 mês de despesas',
        'Se 7 dias: falta segurança, aumento de risco',
        'Ideal: manter 30-60 dias de cobertura',
      ],
    },
  };

  const tabOrder = ['entradas', 'saidas', 'saldo', 'liquidez', 'saldoProjetado', 'vencidas', 'fluxoReal', 'diasCobertura'];

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 rounded-full shadow-lg gap-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
        size="lg"
      >
        <HelpCircle className="w-5 h-5" />
        Ajuda
      </Button>
    );
  }

  const currentTerm = terms[activeTab];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-800 dark:to-blue-900 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{currentTerm?.icon}</span>
            <h2 className="text-2xl font-bold text-white">{currentTerm?.title}</h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-white hover:bg-blue-800 dark:hover:bg-blue-700 rounded-full p-2 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6">
          <p className="text-lg text-gray-700 dark:text-gray-300 mb-4 font-semibold">{currentTerm?.description}</p>

          <div className="space-y-2 mb-6">
            {currentTerm?.details.map((detail, idx) => (
              <div key={idx} className="flex gap-3 items-start">
                <span className="text-blue-600 dark:text-blue-400 font-bold mt-1">•</span>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{detail}</p>
              </div>
            ))}
          </div>

          {activeTab === 'saldo' && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4">
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">💡 Exemplo:</p>
              <p className="text-sm text-blue-800 dark:text-blue-300">
                Se a clínica recebeu R$ 50.000 e gastou R$ 35.000, o saldo é R$ 15.000. Esse é o dinheiro disponível em caixa.
              </p>
            </div>
          )}

          {activeTab === 'liquidez' && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mt-4">
              <p className="text-sm font-semibold text-green-900 dark:text-green-300 mb-2">💡 Exemplo:</p>
              <p className="text-sm text-green-800 dark:text-green-300">
                A clínica tem R$ 30.000 em caixa e R$ 20.000 em contas a pagar. Liquidez = 30.000 / 20.000 = 1.5. Saudável!
              </p>
            </div>
          )}

          {activeTab === 'diasCobertura' && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mt-4">
              <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-300 mb-2">💡 Exemplo:</p>
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                Saldo = R$ 30.000, Despesas Diárias Médias = R$ 1.000. Cobertura = 30.000 / 1.000 = 30 dias.
              </p>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="bg-gray-50 dark:bg-gray-700 border-t dark:border-gray-600 overflow-x-auto">
          <div className="flex">
            {tabOrder.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 bg-white dark:bg-gray-800'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                {terms[tab].title}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white border-t p-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
