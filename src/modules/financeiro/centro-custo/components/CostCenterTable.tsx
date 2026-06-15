// src/modules/financeiro/centro-custo/components/CostCenterTable.tsx

import React from 'react';
import { Edit, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CostCenterBadge } from './CostCenterBadge';
import type { CostCenter } from '../types';

interface CostCenterTableProps {
  centers: CostCenter[];
  onEdit: (center: CostCenter) => void;
  onDelete: (center: CostCenter) => void;
  onToggleStatus: (id: string, isActive: boolean) => void;
  loading: boolean;
}

export const CostCenterTable: React.FC<CostCenterTableProps> = ({
  centers,
  onEdit,
  onDelete,
  onToggleStatus,
  loading,
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin mr-3">⏳</div>
        <p className="text-slate-600 dark:text-slate-400">Carregando centros de custo...</p>
      </div>
    );
  }

  if (centers.length === 0) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-500 dark:text-slate-400">
        Nenhum centro de custo encontrado
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-white dark:bg-slate-950">
      <table className="w-full text-sm">
        <thead className="border-b bg-slate-50 dark:bg-slate-900">
          <tr>
            <th className="text-left p-3 font-semibold text-slate-700 dark:text-slate-300">
              Código
            </th>
            <th className="text-left p-3 font-semibold text-slate-700 dark:text-slate-300">
              Nome
            </th>
            <th className="text-left p-3 font-semibold text-slate-700 dark:text-slate-300">
              Descrição
            </th>
            <th className="text-center p-3 font-semibold text-slate-700 dark:text-slate-300">
              Status
            </th>
            <th className="text-center p-3 font-semibold text-slate-700 dark:text-slate-300">
              Ações
            </th>
          </tr>
        </thead>
        <tbody>
          {centers.map((center) => (
            <tr
              key={center.id}
              className="border-b hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
            >
              {/* Code */}
              <td className="p-3">
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                  {center.code}
                </span>
              </td>

              {/* Name */}
              <td className="p-3 text-slate-900 dark:text-slate-100">{center.name}</td>

              {/* Description */}
              <td className="p-3 text-slate-600 dark:text-slate-400 truncate max-w-xs">
                {center.description || '—'}
              </td>

              {/* Status */}
              <td className="p-3 text-center">
                <CostCenterBadge isActive={center.is_active} />
              </td>

              {/* Actions */}
              <td className="p-3 text-center">
                <div className="flex justify-center gap-1">
                  {/* Toggle Status */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onToggleStatus(center.id, !center.is_active)}
                    title={center.is_active ? 'Inativar' : 'Ativar'}
                  >
                    {center.is_active ? (
                      <ToggleRight className="w-4 h-4 text-green-600" />
                    ) : (
                      <ToggleLeft className="w-4 h-4 text-gray-400" />
                    )}
                  </Button>

                  {/* Edit */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onEdit(center)}
                    title="Editar"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>

                  {/* Delete */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 hover:bg-red-50 dark:hover:bg-red-900/20"
                    onClick={() => onDelete(center)}
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CostCenterTable;
