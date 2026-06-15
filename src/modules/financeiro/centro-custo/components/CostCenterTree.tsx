// src/modules/financeiro/centro-custo/components/CostCenterTree.tsx

import React, { useState, useMemo } from 'react';
import { ChevronDown, Edit, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CostCenterBadge } from './CostCenterBadge';
import type { CostCenterNode, CostCenter } from '../types';

interface CostCenterTreeProps {
  tree: CostCenterNode[];
  onEdit: (center: CostCenter) => void;
  onDelete: (center: CostCenter) => void;
  onToggleStatus: (id: string, isActive: boolean) => void;
  loading: boolean;
}

export const CostCenterTree: React.FC<CostCenterTreeProps> = ({
  tree,
  onEdit,
  onDelete,
  onToggleStatus,
  loading,
}) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const expandAll = () => {
    const newExpanded: Record<string, boolean> = {};
    const markAllExpanded = (nodes: CostCenterNode[]) => {
      nodes.forEach((node) => {
        if (node.child_count > 0) {
          newExpanded[node.id] = true;
          if (node.children) {
            markAllExpanded(node.children);
          }
        }
      });
    };
    markAllExpanded(tree);
    setExpanded(newExpanded);
  };

  const collapseAll = () => {
    setExpanded({});
  };

  const renderNode = (node: CostCenterNode, level: number = 0): React.ReactNode => {
    const hasChildren = node.child_count > 0 && node.children && node.children.length > 0;
    const isExpanded = expanded[node.id];
    const paddingLeft = level * 24;

    return (
      <div key={node.id} className="space-y-0">
        {/* Node Row */}
        <div
          className="flex items-center gap-2 p-3 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all group"
          style={{ paddingLeft: `${paddingLeft}px` } as React.CSSProperties}
        >
          {/* Expand Button */}
          {hasChildren ? (
            <button
              onClick={() => toggleExpanded(node.id)}
              className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 transition flex-shrink-0 p-1"
              title="Expandir/Recolher centro de custo"
            >
              <ChevronDown
                className={`w-4 h-4 transition-transform ${isExpanded ? '' : '-rotate-90'}`}
              />
            </button>
          ) : (
            <div className="w-6" />
          )}

          {/* Code */}
          <span className="font-mono font-bold text-sm text-slate-700 dark:text-slate-300 min-w-fit">
            {node.code}
          </span>

          {/* Name */}
          <span className="flex-1 text-slate-900 dark:text-slate-100 font-medium truncate">
            {node.name}
          </span>

          {/* Badge */}
          <div className="flex-shrink-0">
            <CostCenterBadge isActive={node.is_active} />
          </div>

          {/* Actions - Hidden until hover */}
          <div className="flex-shrink-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Toggle Status */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onToggleStatus(node.id, !node.is_active)}
              title={node.is_active ? 'Inativar' : 'Ativar'}
            >
              {node.is_active ? (
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
              onClick={() => onEdit(node as CostCenter)}
              title="Editar"
            >
              <Edit className="w-4 h-4" />
            </Button>

            {/* Delete */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-red-50 dark:hover:bg-red-900/20"
              onClick={() => onDelete(node as CostCenter)}
              title="Excluir"
            >
              <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
            </Button>
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="space-y-0">
            {node.children!.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin mr-3">⏳</div>
        <p className="text-slate-600 dark:text-slate-400">Carregando centros de custo...</p>
      </div>
    );
  }

  if (tree.length === 0) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-500 dark:text-slate-400">
        Nenhum centro de custo encontrado
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={expandAll}
          className="text-sm"
        >
          Expandir Todos
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={collapseAll}
          className="text-sm"
        >
          Recolher Todos
        </Button>
      </div>

      {/* Tree */}
      <div className="space-y-0 border rounded-lg p-4 bg-white dark:bg-slate-950">
        {tree.map((node) => renderNode(node))}
      </div>
    </div>
  );
};

export default CostCenterTree;
