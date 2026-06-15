/**
 * Component: ChartOfAccountsTable
 * Table view for chart of accounts
 */

import React from 'react';
import { ChartOfAccount } from '../types';
import { Trash2, Edit2, ToggleLeft, ToggleRight } from 'lucide-react';
import AccountTypeBadge from './AccountTypeBadge';

interface ChartOfAccountsTableProps {
  accounts: ChartOfAccount[];
  loading?: boolean;
  onEdit?: (account: ChartOfAccount) => void;
  onDelete?: (account: ChartOfAccount) => void;
  onToggleStatus?: (account: ChartOfAccount) => void;
}

export const ChartOfAccountsTable: React.FC<ChartOfAccountsTableProps> = ({
  accounts,
  loading = false,
  onEdit,
  onDelete,
  onToggleStatus,
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border border-transparent border-t-blue-600" />
          <p className="text-gray-600 text-sm">Carregando contas...</p>
        </div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Nenhuma conta encontrada</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Código
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Nome
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Tipo
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Natureza
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Lançamentos
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {accounts.map((account) => (
              <tr key={account.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <span className="font-mono text-sm font-semibold text-blue-600">
                    {account.code}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{account.name}</p>
                    {account.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {account.description}
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <AccountTypeBadge type={account.type} size="sm" />
                </td>
                <td className="px-6 py-4">
                  <AccountTypeBadge
                    type={account.type}
                    nature={account.nature}
                    variant="nature"
                    size="sm"
                  />
                </td>
                <td className="px-6 py-4">
                  {account.is_active ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Ativa
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Inativa
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {account.accepts_entries ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Sim
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Não
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    {onToggleStatus && (
                      <button
                        onClick={() => onToggleStatus(account)}
                        title={account.is_active ? 'Desativar' : 'Ativar'}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        {account.is_active ? (
                          <ToggleRight className="w-4 h-4" />
                        ) : (
                          <ToggleLeft className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    {onEdit && (
                      <button
                        onClick={() => onEdit(account)}
                        title="Editar"
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(account)}
                        title="Excluir"
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ChartOfAccountsTable;
