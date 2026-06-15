import React from 'react';
import RepassesRulesManager from '@/pages/clinica/configuracoes/RepassesRulesManager';

/**
 * RepasseRegrasPage
 *
 * Wrapper que renderiza o gerenciador centralizado de regras de repasse.
 *
 * Integrado em 2 locais:
 * 1. /clinica/financeiro/repasse/?tab=regras-avancadas (via RepasseMedicoLayout)
 * 2. RepasseMedicoLayout > Aba "Regras Avançadas" > Sub-aba "Regras de Repasse"
 *
 * O gerenciador centralizado RepassesRulesManager está em:
 * @/pages/clinica/configuracoes/RepassesRulesManager
 */
export default function RepasseRegrasPage() {
  return <RepassesRulesManager />;
}
