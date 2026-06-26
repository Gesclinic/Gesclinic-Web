// src/components/financeiro/conciliacao/ConciliacaoLista.jsx
// Lista de movimentações do extrato

import React, { useState, useMemo, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/formatters';
import {
  CONCILIATION_STATUS_VISUAL,
  CONCILIATION_STATUS,
  TRANSACTION_TYPE,
} from '@/lib/conciliationStatus';

const ROWS_PER_PAGE_OPTIONS = [50, 100, 200, 300, 500, 1000];

export function ConciliacaoLista({
  statements,
  statementsTotal = 0,
  loading,
  onSelectStatement,
  onBulkConciliate,
  onDeleteStatement,
  onBulkDelete,
  selectedStatements = [],
  onToggleSelect,
}) {
  const [statusFilter, setStatusFilter] = useState(null);
  const [typeFilter, setTypeFilter] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    return statements.filter((stmt) => {
      if (statusFilter && stmt.status !== statusFilter) {
        return false;
      }
      if (typeFilter && stmt.transaction_type !== typeFilter) {
        return false;
      }
      return true;
    });
  }, [statements, statusFilter, typeFilter]);

  const paginatedData = useMemo(() => {
    const startIdx = (currentPage - 1) * rowsPerPage;
    return filtered.slice(startIdx, startIdx + rowsPerPage);
  }, [filtered, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(filtered.length / rowsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, typeFilter, rowsPerPage]);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      paginatedData.forEach((stmt) => {
        if (!selectedStatements.includes(stmt.id)) {
          onToggleSelect(stmt.id);
        }
      });
    } else {
      paginatedData.forEach((stmt) => {
        if (selectedStatements.includes(stmt.id)) {
          onToggleSelect(stmt.id);
        }
      });
    }
  };

  const getImportedDetail = (stmt) => {
    const metadata = stmt.metadata || {};
    const operationDescription =
      stmt.description && stmt.description !== metadata.party_name ? stmt.description : null;
    const memoDescription =
      metadata.raw_memo && metadata.raw_memo !== metadata.party_name ? metadata.raw_memo : null;

    const primary = operationDescription || memoDescription || metadata.reference_number || null;
    const secondaryParts = [
      metadata.operation_type,
      metadata.reference_number ? `Ref: ${metadata.reference_number}` : null,
      metadata.check_number ? `Cheque: ${metadata.check_number}` : null,
      stmt.linked_type === 'payable' ? 'Vinculado: Contas a Pagar' : null,
      stmt.linked_type === 'receivable' ? 'Vinculado: Contas a Receber' : null,
    ].filter(Boolean);

    return {
      primary: primary || 'Sem detalhe no extrato importado',
      secondary: secondaryParts.join(' • '),
    };
  };

  const getHistoryDetail = (stmt) => {
    const metadata = stmt.metadata || {};
    const partyName = (metadata.party_name || '').trim() || null;
    const rawMemo = (metadata.raw_memo || '').trim() || null;

    // Mostrar o nome do pagador/favorecido (paciente/convênio)
    return {
      primary: partyName || rawMemo || '—',
      secondary: null,
    };
  };

  const getDescriptionDetail = (stmt) => {
    const description = (stmt.description || '').trim() || null;

    // Mostrar o description original (VISA CRÉDITO, MASTERCARD CRÉDITO, etc)
    return description || '—';
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Carregando lançamentos...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <p className="text-sm text-blue-800">
          <strong>ℹ️ Nota:</strong> Se os nomes dos pacientes/convênios não aparecerem, <strong>reimporte o arquivo CSV</strong> para que o parser correto capture as informações. Clique em "Carregar novo extrato" na aba de Importação.
        </p>
      </div>
      
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Movimentações do Extrato ({filtered.length} de <span className="text-blue-600">{statementsTotal}</span>)
        </h3>

        {selectedStatements.length > 0 && (
          <div className="flex gap-2 items-center">
            <span className="text-sm text-gray-600 font-medium">
              {selectedStatements.length} selecionado(s)
            </span>
            <Button
              onClick={() => onBulkConciliate(selectedStatements)}
              size="sm"
              className="bg-green-600 hover:bg-green-700"
            >
              ✓ Conciliar Selecionados
            </Button>
            <Button
              onClick={async () => {
                if (selectedStatements.length === 0) {
                  alert('Nenhum lançamento selecionado');
                  return;
                }
                
                if (!confirm(`Tem certeza que deseja excluir ${selectedStatements.length} lançamento(s)? Esta ação não pode ser desfeita.`)) {
                  return;
                }
                
                setDeleting(true);
                try {
                  if (onBulkDelete) {
                    // Usar função otimizada de exclusão em lote
                    await onBulkDelete(selectedStatements);
                  } else {
                    // Fallback: deletar um por um (não recomendado)
                    console.warn('onBulkDelete não disponível, usando fallback');
                    for (const id of selectedStatements) {
                      await onDeleteStatement(id);
                    }
                  }
                } catch (err) {
                  console.error('Erro durante exclusão em lote:', err);
                  alert('Erro ao deletar: ' + err.message);
                } finally {
                  // Sempre resetar o estado, mesmo em caso de erro
                  setDeleting(false);
                }
              }}
              disabled={deleting}
              size="sm"
              className={`text-white ${deleting ? 'bg-red-400 cursor-wait' : 'bg-red-600 hover:bg-red-700'}`}
            >
              {deleting ? '⏳ Excluindo...' : '✕ Excluir Selecionados'}
            </Button>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <select
          value={statusFilter || ''}
          onChange={(e) => setStatusFilter(e.target.value || null)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos os status</option>
          {Object.entries(CONCILIATION_STATUS).map(([key, value]) => (
            <option key={value} value={value}>
              {CONCILIATION_STATUS_VISUAL[value].label}
            </option>
          ))}
        </select>

        <select
          value={typeFilter || ''}
          onChange={(e) => setTypeFilter(e.target.value || null)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos os tipos</option>
          <option value={TRANSACTION_TYPE.CREDIT}>Crédito (Entrada)</option>
          <option value={TRANSACTION_TYPE.DEBIT}>Débito (Saída)</option>
        </select>

        <select
          value={rowsPerPage}
          onChange={(e) => setRowsPerPage(Number(e.target.value))}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          title="Linhas por página"
        >
          {ROWS_PER_PAGE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option} por página
            </option>
          ))}
        </select>

        {/* Botões de seleção em lote */}
        {filtered.length > 0 && (
          <>
            <Button
              onClick={() => {
                paginatedData.forEach((stmt) => {
                  if (!selectedStatements.includes(stmt.id)) {
                    onToggleSelect(stmt.id);
                  }
                });
              }}
              size="sm"
              variant="outline"
              className="text-blue-600 border-blue-300"
              title="Selecionar todos desta página"
            >
              ☑ Sel. Página
            </Button>
            
            <Button
              onClick={() => {
                paginatedData.forEach((stmt) => {
                  if (selectedStatements.includes(stmt.id)) {
                    onToggleSelect(stmt.id);
                  }
                });
              }}
              size="sm"
              variant="outline"
              className="text-gray-600 border-gray-300"
              title="Desselecionar todos desta página"
            >
              ☐ Desel. Página
            </Button>

            <Button
              onClick={() => {
                filtered.forEach((stmt) => {
                  if (!selectedStatements.includes(stmt.id)) {
                    onToggleSelect(stmt.id);
                  }
                });
              }}
              size="sm"
              variant="outline"
              className="text-green-600 border-green-300"
              title="Selecionar todos os filtrados"
            >
              ☑ Sel. Todos ({filtered.length})
            </Button>

            <Button
              onClick={() => {
                selectedStatements.forEach((id) => onToggleSelect(id));
              }}
              size="sm"
              variant="outline"
              className="text-red-600 border-red-300"
              title="Desselecionar todos"
            >
              ☐ Limpar
            </Button>
          </>
        )}
      </div>

      {/* Tabela */}
      <div className="border border-gray-200 rounded-lg">
        <div className="max-h-[62vh] overflow-auto overscroll-contain">
          <table className="min-w-[1750px] w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left sticky top-0 bg-gray-50 z-10">
                <input
                  type="checkbox"
                  checked={
                    paginatedData.length > 0 && paginatedData.every((s) => selectedStatements.includes(s.id))
                  }
                  onChange={handleSelectAll}
                  className="rounded"
                />
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-700 sticky top-0 bg-gray-50 z-10">Data</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700 sticky top-0 bg-gray-50 z-10">Documento</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700 sticky top-0 bg-gray-50 z-10 min-w-[280px]">Histórico</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700 sticky top-0 bg-gray-50 z-10 min-w-[150px]">Descrição</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700 sticky top-0 bg-gray-50 z-10">Detalhe importado</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700 sticky top-0 bg-gray-50 z-10">Débito</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700 sticky top-0 bg-gray-50 z-10">Crédito</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700 sticky top-0 bg-gray-50 z-10">Saldo</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700 sticky top-0 bg-gray-50 z-10">Status</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700 sticky top-0 bg-gray-50 z-10">Ações</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan="11" className="px-4 py-8 text-center text-gray-500">
                  Nenhum lançamento encontrado
                </td>
              </tr>
            ) : (
              paginatedData.map((stmt) => {
                const visual = CONCILIATION_STATUS_VISUAL[stmt.status];
                const isCredit = stmt.transaction_type === TRANSACTION_TYPE.CREDIT;
                const metadata = stmt.metadata || {};
                const importedDetail = getImportedDetail(stmt);
                const historyDetail = getHistoryDetail(stmt);
                const descriptionDetail = getDescriptionDetail(stmt);

                return (
                  <tr key={stmt.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedStatements.includes(stmt.id)}
                        onChange={() => onToggleSelect(stmt.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {formatDate(stmt.statement_date)}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {metadata.check_number || metadata.reference_number || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 min-w-[280px]" title={`${historyDetail.primary}${historyDetail.secondary ? ` (${historyDetail.secondary})` : ''}`}>
                      <div className="flex flex-col gap-1 text-sm">
                        <span className="font-medium leading-5 break-words">{historyDetail.primary}</span>
                        {historyDetail.secondary && (
                          <span className="text-xs text-gray-500 leading-4 break-words">• {historyDetail.secondary}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 min-w-[150px]">
                      <span className="text-sm">{descriptionDetail}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 min-w-[320px]">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm leading-5 break-words">{importedDetail.primary}</span>
                        {importedDetail.secondary && (
                          <span className="text-xs text-gray-500 break-words">{importedDetail.secondary}</span>
                        )}
                      </div>
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${!isCredit ? 'text-red-600' : 'text-gray-400'}`}>
                      {!isCredit ? formatCurrency(stmt.amount) : '—'}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${isCredit ? 'text-green-600' : 'text-gray-400'}`}>
                      {isCredit ? formatCurrency(stmt.amount) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {metadata.end_balance ? formatCurrency(metadata.end_balance) : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${visual.className}`}>
                        {visual.icon} {visual.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex gap-1 justify-center">
                        <Button
                          onClick={() => onSelectStatement(stmt)}
                          size="sm"
                          variant="ghost"
                          className="text-blue-600 hover:text-blue-700 px-2"
                          title="Abrir detalhes"
                        >
                          Detalhes
                        </Button>
                        {onDeleteStatement && (
                          <Button
                            onClick={() => {
                              if (confirm('Tem certeza que deseja deletar este lançamento?')) {
                                onDeleteStatement(stmt.id);
                              }
                            }}
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 p-1"
                            title="Deletar lançamento"
                          >
                            ✕
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          </table>
        </div>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            Página {currentPage} de {totalPages} ({filtered.length} de {statementsTotal} itens, {rowsPerPage} por página)
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              size="sm"
              variant="outline"
            >
              ← Anterior
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return (
                <Button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  variant={currentPage === pageNum ? 'default' : 'outline'}
                  size="sm"
                >
                  {pageNum}
                </Button>
              );
            })}
            <Button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              size="sm"
              variant="outline"
            >
              Próximo →
            </Button>
            <Button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages || totalPages === 0}
              size="sm"
              variant="outline"
              title="Ir para última página"
            >
              Último ⏭️
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
