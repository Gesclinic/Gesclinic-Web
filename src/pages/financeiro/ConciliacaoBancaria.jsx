import React, { useState, useEffect, useMemo } from 'react';
import { importBankStatement, listBankStatements, reconcileStatement, markAsDivergent, ignoreStatement } from '@/lib/conciliationApi';
import { suggestForStatement } from '@/lib/conciliationSuggest';
  const [selectedStatement, setSelectedStatement] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const allPendingIds = useMemo(() => statements.filter(st => st.status === 'pending').map(st => st.id), [statements]);

// Estrutura inicial da página de Conciliação Bancária
export default function ConciliacaoBancaria() {
  // Estado para formulário de importação
  const [bankAccountId, setBankAccountId] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState('');
  const [statements, setStatements] = useState([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  // Carregar movimentações ao importar ou ao trocar filtros
  useEffect(() => {
    if (!bankAccountId) return;
    async function fetchStatements() {
      try {
        const data = await listBankStatements({
          bankAccountId,
          status: filterStatus || undefined,
          type: filterType || undefined,
          start: periodStart || undefined,
          end: periodEnd || undefined,
        });
        setStatements(data);
      } catch (err) {
        setError('Erro ao buscar movimentações.');
      }
    }
    fetchStatements();
  }, [bankAccountId, filterStatus, filterType, periodStart, periodEnd, importResult]);

  // TODO: Buscar contas bancárias reais da API
  const fakeAccounts = [
    { id: '1', name: 'Conta Banco XPTO' },
    { id: '2', name: 'Conta Banco Saúde' },
  ];

  async function handleImport(e) {
    e.preventDefault();
    setImporting(true);
    setError('');
    setImportResult(null);
    try {
      // Simulação: parseia CSV simples (data,descricao,valor,tipo)
      if (!file) throw new Error('Selecione um arquivo.');
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      const items = lines.map(line => {
        const [date, description, amount, type] = line.split(',');
        return { date, description, amount: parseFloat(amount), type };
      });
      const result = await importBankStatement({ bankAccountId, items });
      setImportResult(result);
    } catch (err) {
      setError(err.message || 'Erro ao importar.');
    } finally {
      setImporting(false);
    }
  }

  // Indicadores calculados
  const indicators = useMemo(() => {
    let pendentes = 0, conciliado = 0, divergentes = 0, saldoBanco = 0;
    statements.forEach(st => {
      if (st.status === 'pending') pendentes += st.amount;
      if (st.status === 'reconciled' || st.status === 'adjusted') conciliado += st.amount;
      if (st.status === 'divergent') divergentes++;
      saldoBanco += st.amount;
    });
    // Mock: saldo sistema (deveria vir do financeiro real)
    const saldoSistema = saldoBanco - 280; // Exemplo: diferença mockada
    const diferenca = saldoBanco - saldoSistema;
    return {
      pendentes,
      conciliado,
      divergentes,
      saldoBanco,
      saldoSistema,
      diferenca
    };
  }, [statements]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Conciliação Bancária e Projeções</h1>
      {/* Indicadores no topo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded shadow p-4">🔴 Pendentes: {indicators.pendentes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
        <div className="bg-white rounded shadow p-4">🟢 Conciliado: {indicators.conciliado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
        <div className="bg-white rounded shadow p-4">⚠ Divergências: {indicators.divergentes} itens</div>
        <div className="bg-white rounded shadow p-4">💰 Saldo Banco: {indicators.saldoBanco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
        <div className="bg-white rounded shadow p-4">📊 Saldo Sistema: {indicators.saldoSistema.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
        <div className="bg-white rounded shadow p-4">❗ Diferença: {indicators.diferenca.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Bloco 1: Importação de Extrato */}
        <div className="md:col-span-1 bg-white rounded shadow p-4 mb-6 md:mb-0">
          <h2 className="font-semibold mb-2">Importação de Extrato</h2>
          <form onSubmit={handleImport} className="space-y-3">
            <div>
              <label className="block text-sm font-medium">Conta bancária</label>
              <select value={bankAccountId} onChange={e => setBankAccountId(e.target.value)} className="w-full border rounded p-2">
                <option value="">Selecione</option>
                {fakeAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <div className="mb-2 flex gap-2 items-center">
                <button
                  className="bg-primary text-white px-3 py-1 rounded disabled:opacity-50"
                  disabled={selectedIds.length === 0 || actionLoading}
                  onClick={async () => {
                    setActionLoading(true); setActionMessage('');
                    try {
                      // Mock: concilia todos com financialId='1'
                      for (const id of selectedIds) {
                        await reconcileStatement({ statementId: id, financialId: '1' });
                      }
                      setActionMessage(`Conciliados ${selectedIds.length} itens!`);
                      setSelectedIds([]);
                    } catch (e) { setActionMessage('Erro ao conciliar em lote.'); }
                    setActionLoading(false);
                  }}
                >Conciliar Selecionados</button>
                <button
                  className="text-xs underline"
                  onClick={() => setSelectedIds(allPendingIds)}
                  disabled={allPendingIds.length === 0}
                >Selecionar todos pendentes</button>
                <button
                  className="text-xs underline"
                  onClick={() => setSelectedIds([])}
                  disabled={selectedIds.length === 0}
                >Limpar seleção</button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="p-2 w-8"></th>
                      <th className="p-2">Data</th>
                      <th className="p-2">Descrição</th>
                      <th className="p-2">Valor</th>
                      <th className="p-2">Tipo</th>
                      <th className="p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statements.length === 0 && (
                      <tr><td colSpan={6} className="text-center text-gray-400 p-4">Nenhum extrato importado ainda.</td></tr>
                    )}
                    {statements.map(st => (
                      <tr key={st.id} className="border-b hover:bg-gray-50">
                        <td className="p-2 text-center">
                          <input
                            type="checkbox"
                            disabled={st.status !== 'pending'}
                            checked={selectedIds.includes(st.id)}
                            onChange={e => {
                              if (e.target.checked) setSelectedIds(ids => [...ids, st.id]);
                              else setSelectedIds(ids => ids.filter(id => id !== st.id));
                            }}
                          />
                        </td>
                        <td className="p-2 whitespace-nowrap cursor-pointer" onClick={() => setSelectedStatement(st)}>{st.date}</td>
                        <td className="p-2 cursor-pointer" onClick={() => setSelectedStatement(st)}>{st.description}</td>
                        <td className="p-2 text-right cursor-pointer" onClick={() => setSelectedStatement(st)}>{Number(st.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                        <td className="p-2 cursor-pointer" onClick={() => setSelectedStatement(st)}>{st.type === 'credit' ? 'Crédito' : 'Débito'}</td>
                        <td className="p-2 cursor-pointer" onClick={() => setSelectedStatement(st)}>
                          {st.status === 'pending' && <span className="text-yellow-600">🟡 Pendente</span>}
                          {st.status === 'reconciled' && <span className="text-green-600">🟢 Conciliado</span>}
                          {st.status === 'adjusted' && <span className="text-blue-600">🔵 Ajustado</span>}
                          {st.status === 'divergent' && <span className="text-red-600">🔴 Divergente</span>}
                          {st.status === 'ignored' && <span className="text-gray-500">⚠ Ignorado</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <option value="">Créditos e Débitos</option>
              <option value="credit">Créditos</option>
              <option value="debit">Débitos</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2">Data</th>
                  <th className="p-2">Descrição</th>
                  <th className="p-2">Valor</th>
                  <th className="p-2">Tipo</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {statements.length === 0 && (
                  <tr><td colSpan={5} className="text-center text-gray-400 p-4">Nenhum extrato importado ainda.</td></tr>
                )}
                {statements.map(st => (
                  <tr key={st.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedStatement(st)}>
                    <td className="p-2 whitespace-nowrap">{st.date}</td>
                    <td className="p-2">{st.description}</td>
                    <td className="p-2 text-right">{Number(st.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                    <td className="p-2">{st.type === 'credit' ? 'Crédito' : 'Débito'}</td>
                    <td className="p-2">
                      {st.status === 'pending' && <span className="text-yellow-600">🟡 Pendente</span>}
                      {st.status === 'reconciled' && <span className="text-green-600">🟢 Conciliado</span>}
                      {st.status === 'adjusted' && <span className="text-blue-600">🔵 Ajustado</span>}
                      {st.status === 'divergent' && <span className="text-red-600">🔴 Divergente</span>}
                      {st.status === 'ignored' && <span className="text-gray-500">⚠ Ignorado</span>}
                    </td>
                  </tr>
                ))}
                    {/* Painel de Conciliação (Modal) */}
                    {selectedStatement && (
                      <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                        <div className="bg-white rounded shadow-lg p-6 w-full max-w-lg relative">
                          <button className="absolute top-2 right-2 text-gray-500 hover:text-black" onClick={() => { setSelectedStatement(null); setActionMessage(''); }}>×</button>
                          <h3 className="text-lg font-bold mb-2">Conciliação de Extrato</h3>
                          <div className="mb-2">
                            <div><b>Data:</b> {selectedStatement.date}</div>
                            <div><b>Descrição:</b> {selectedStatement.description}</div>
                            <div><b>Valor:</b> {Number(selectedStatement.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                            <div><b>Tipo:</b> {selectedStatement.type === 'credit' ? 'Crédito' : 'Débito'}</div>
                            <div><b>Status:</b> {selectedStatement.status}</div>
                          </div>
                          {/* Sugestões automáticas */}
                          <div className="mb-3">
                            <div className="font-semibold mb-1">Sugestões automáticas</div>
                            {(() => {
                              const sug = suggestForStatement(selectedStatement);
                              return (
                                <div className="bg-gray-50 p-2 rounded text-gray-700 text-sm">
                                  <div><b>Plano de Contas:</b> {sug.planoContas || <span className="text-gray-400">(nenhum)</span>}</div>
                                  <div><b>Tipo de Lançamento:</b> {sug.tipoLancamento || <span className="text-gray-400">(nenhum)</span>}</div>
                                  {sug.categoria && <div><b>Categoria:</b> {sug.categoria}</div>}
                                  {sug.sugerirIgnorar && <div className="text-orange-600 font-semibold">Sugestão: Ignorar movimentação</div>}
                                </div>
                              );
                            })()}
                          </div>
                          {/* Ações */}
                          <div className="flex flex-col gap-2">
                            <button disabled={actionLoading || selectedStatement.status !== 'pending'}
                              className="bg-green-600 text-white px-3 py-2 rounded disabled:opacity-50"
                              onClick={async () => {
                                setActionLoading(true); setActionMessage('');
                                try {
                                  // Aqui normalmente pediria para escolher lançamento, mas mocka vínculo id=1
                                  await reconcileStatement({ statementId: selectedStatement.id, financialId: '1' });
                                  setActionMessage('Conciliado com sucesso!');
                                } catch (e) { setActionMessage('Erro ao conciliar.'); }
                                setActionLoading(false);
                              }}>
                              Conciliar com lançamento existente
                            </button>
                            <button disabled className="bg-blue-600 text-white px-3 py-2 rounded opacity-50">
                              ➕ Criar lançamento (em breve)
                            </button>
                            <button disabled={actionLoading || selectedStatement.status !== 'pending'}
                              className="bg-red-600 text-white px-3 py-2 rounded disabled:opacity-50"
                              onClick={async () => {
                                setActionLoading(true); setActionMessage('');
                                try {
                                  await markAsDivergent({ statementId: selectedStatement.id });
                                  setActionMessage('Marcado como divergente.');
                                } catch (e) { setActionMessage('Erro ao marcar divergente.'); }
                                setActionLoading(false);
                              }}>
                              ⚠ Marcar como divergente
                            </button>
                            <button disabled={actionLoading || selectedStatement.status !== 'pending'}
                              className="bg-gray-500 text-white px-3 py-2 rounded disabled:opacity-50"
                              onClick={async () => {
                                setActionLoading(true); setActionMessage('');
                                try {
                                  await ignoreStatement({ statementId: selectedStatement.id });
                                  setActionMessage('Movimentação ignorada.');
                                } catch (e) { setActionMessage('Erro ao ignorar.'); }
                                setActionLoading(false);
                              }}>
                              🚫 Ignorar
                            </button>
                            {actionMessage && <div className="text-center text-sm mt-2">{actionMessage}</div>}
                          </div>
                        </div>
                      </div>
                    )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {/* Bloco 3: Painel de Conciliação (modal ou drawer ao clicar em item) */}
      {/* TODO: Implementar painel de conciliação e ações */}
    </div>
  );
}
