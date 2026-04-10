// Funções de sugestão automática para conciliação bancária

/**
 * Sugere plano de contas, tipo de lançamento, etc, com base na descrição e tipo do extrato.
 * Retorna um objeto com sugestões para uso na UI.
 */
export function suggestForStatement({ description, type }) {
  const desc = (description || '').toUpperCase();
  // Plano de contas (mock)
  let planoContas = '';
  if (desc.includes('TARIFA')) planoContas = 'Tarifas Bancárias';
  else if (desc.includes('PIX')) planoContas = type === 'credit' ? 'Receita Operacional' : 'Transferências';
  else if (desc.includes('TED')) planoContas = type === 'debit' ? 'Contas a Pagar' : 'Transferências';
  else if (desc.includes('SALDO INICIAL')) planoContas = 'Ajustes/Saldo Inicial';
  // Tipo de lançamento
  let tipoLancamento = '';
  if (type === 'credit') tipoLancamento = 'Receber';
  else if (type === 'debit') tipoLancamento = 'Pagar';
  // Categoria extra
  let categoria = '';
  if (desc.includes('UNIMED')) categoria = 'Convênios';
  // Sugerir ignorar
  let sugerirIgnorar = false;
  if (desc.includes('SALDO INICIAL') || desc.includes('TRANSFERÊNCIA INTERNA')) sugerirIgnorar = true;
  return {
    planoContas,
    tipoLancamento,
    categoria,
    sugerirIgnorar
  };
}
