import React from 'react';

export default function FinanceiroAtendimentoTab({
  financeiro,
  isConvenio,
  bloqueado,
  onGerarCobranca,
  onGerarFaturamento,
}) {
  if (bloqueado) {
    return (
      <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
        <b>Faturamento bloqueado:</b> Informe número da guia e senha válidos para liberar o
        faturamento do convênio.
      </div>
    );
  }
  if (!financeiro) {
    return (
      <div className="space-y-2 max-w-md">
        <div>Sem dados financeiros.</div>
        <div className="flex gap-2 mt-4">
          {!isConvenio && (
            <button className="btn btn-primary" onClick={onGerarCobranca}>
              Gerar Cobrança
            </button>
          )}
          {isConvenio && (
            <button className="btn btn-secondary" onClick={onGerarFaturamento}>
              Gerar Faturamento
            </button>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-2 max-w-md">
      <div>
        <b>Tipo:</b> {financeiro.type}
      </div>
      <div>
        <b>Valor Bruto:</b> R$ {financeiro.amount?.toFixed(2)}
      </div>
      <div>
        <b>Desconto:</b> R$ {financeiro.discount?.toFixed(2) || '0,00'}
      </div>
      <div>
        <b>Valor Líquido:</b> R$ {financeiro.net_amount?.toFixed(2) || '0,00'}
      </div>
      <div>
        <b>Forma Pgto:</b> {financeiro.payment_method || '-'}
      </div>
      <div>
        <b>Status:</b> {financeiro.status}
      </div>
    </div>
  );
}
