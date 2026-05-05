/**
 * RetencaoDisplay.jsx
 *
 * Componente reutilizável para exibir retenções de impostos
 * Usado no InvoiceEmissionModal e outros módulos financeiros
 */

import React from 'react';

export function RetencaoDisplay({ retencoes, minimal = false }) {
  if (!retencoes || !retencoes.retencoes) {
    return null;
  }

  // Modo compacto (apenas valores)
  if (minimal) {
    return (
      <div className="space-y-0.5 text-xs">
        <div className="flex justify-between">
          <span>ISS:</span>
          <span className="font-semibold">R$ {retencoes.retencoes.iss.value.toFixed(2)}</span>
        </div>
        {retencoes.retencoes.pis.value > 0 && (
          <div className="flex justify-between">
            <span>PIS:</span>
            <span className="font-semibold">R$ {retencoes.retencoes.pis.value.toFixed(2)}</span>
          </div>
        )}
        {retencoes.retencoes.cofins.value > 0 && (
          <div className="flex justify-between">
            <span>COFINS:</span>
            <span className="font-semibold">R$ {retencoes.retencoes.cofins.value.toFixed(2)}</span>
          </div>
        )}
        {retencoes.retencoes.csll.value > 0 && (
          <div className="flex justify-between">
            <span>CSLL:</span>
            <span className="font-semibold">R$ {retencoes.retencoes.csll.value.toFixed(2)}</span>
          </div>
        )}
      </div>
    );
  }

  // Modo completo
  return (
    <div className="bg-red-50 p-3 rounded border border-red-200">
      <h3 className="text-xs font-bold text-red-700 mb-2">🚨 IMPOSTOS & RETENÇÕES</h3>

      <div className="space-y-1 text-xs">
        {/* ISS (Sempre) */}
        <div className="flex justify-between items-center">
          <span className="text-red-900 font-semibold">
            ISS {(retencoes.retencoes.iss.rate * 100).toFixed(2)}%
          </span>
          <span className="text-red-600 font-bold">
            R$ {retencoes.retencoes.iss.value.toFixed(2)}
          </span>
        </div>

        {/* PIS - Se valor > 0 */}
        {retencoes.retencoes.pis.value > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-red-900 font-semibold">
              PIS {(retencoes.retencoes.pis.rate * 100).toFixed(2)}%
            </span>
            <span className="text-red-600 font-bold">
              R$ {retencoes.retencoes.pis.value.toFixed(2)}
            </span>
          </div>
        )}

        {/* COFINS - Se valor > 0 */}
        {retencoes.retencoes.cofins.value > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-red-900 font-semibold">
              COFINS {(retencoes.retencoes.cofins.rate * 100).toFixed(2)}%
            </span>
            <span className="text-red-600 font-bold">
              R$ {retencoes.retencoes.cofins.value.toFixed(2)}
            </span>
          </div>
        )}

        {/* CSLL - Se valor > 0 */}
        {retencoes.retencoes.csll.value > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-red-900 font-semibold">
              CSLL {(retencoes.retencoes.csll.rate * 100).toFixed(2)}%
            </span>
            <span className="text-red-600 font-bold">
              R$ {retencoes.retencoes.csll.value.toFixed(2)}
            </span>
          </div>
        )}

        {/* IRRF - Se valor > 0 */}
        {retencoes.retencoes.irrf.value > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-red-900 font-semibold">
              IRRF {(retencoes.retencoes.irrf.rate * 100).toFixed(2)}%
            </span>
            <span className="text-red-600 font-bold">
              R$ {retencoes.retencoes.irrf.value.toFixed(2)}
            </span>
          </div>
        )}

        {/* Total de Retenções */}
        <div className="border-t border-red-300 pt-1 mt-1 flex justify-between items-center">
          <span className="text-red-900 font-bold">TOTAL</span>
          <span className="text-red-700 font-bold bg-red-100 px-2 py-0.5 rounded">
            R$ {retencoes.totalValue.toFixed(2)}
          </span>
        </div>

        {/* Info: Tipo de pagador */}
        <p className="text-xs text-red-600 italic mt-2">
          Retenções para:{' '}
          {retencoes.payerType === 'patient'
            ? '👤 Particular (apenas ISS)'
            : retencoes.payerType === 'insurance'
              ? '🏥 Convênio/Seguro (ISS + PIS + COFINS)'
              : '🏢 Empresa (ISS + PIS + COFINS + CSLL)'}
        </p>
      </div>
    </div>
  );
}

export default RetencaoDisplay;
