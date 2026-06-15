/**
 * Component: ChartOfAccountsTree
 * Hierarchical tree view for chart of accounts
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  ChartOfAccountTreeNode,
  ChartOfAccount,
} from '../types';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import AccountTypeBadge from './AccountTypeBadge';

interface ChartOfAccountsTreeProps {
  accounts: ChartOfAccountTreeNode[];
  loading?: boolean;
  onSelect?: (account: ChartOfAccountTreeNode) => void;
  onAddChild?: (parentAccount: ChartOfAccountTreeNode) => void;
  onEdit?: (account: ChartOfAccountTreeNode) => void;
  onDelete?: (account: ChartOfAccountTreeNode) => void;
  onToggleStatus?: (account: ChartOfAccountTreeNode) => void;
  selectedAccountId?: string;
}

interface TreeNodeProps {
  node: ChartOfAccountTreeNode;
  level: number;
  onSelect?: (account: ChartOfAccountTreeNode) => void;
  onAddChild?: (parentAccount: ChartOfAccountTreeNode) => void;
  onEdit?: (account: ChartOfAccountTreeNode) => void;
  onDelete?: (account: ChartOfAccountTreeNode) => void;
  onToggleStatus?: (account: ChartOfAccountTreeNode) => void;
  selectedAccountId?: string;
  onExpandToggle: (nodeId: string) => void;
  expandedNodes: Set<string>;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  level,
  onSelect,
  onAddChild,
  onEdit,
  onDelete,
  onToggleStatus,
  selectedAccountId,
  onExpandToggle,
  expandedNodes,
}) => {
  const isExpanded = expandedNodes.has(node.id);
  const hasChildren = (node.children && node.children.length > 0) || (node.child_count ?? 0) > 0;
  const isSelected = selectedAccountId === node.id;

  const handleNodeClick = () => {
    if (hasChildren) {
      onExpandToggle(node.id);
    }
    onSelect?.(node);
  };

  const indentClasses = [
    'pl-4',
    'pl-8',
    'pl-12',
    'pl-16',
    'pl-20',
    'pl-24',
    'pl-28',
    'pl-32',
  ];
  const indentClass = indentClasses[Math.min(level, indentClasses.length - 1)];

  return (
    <div className="select-none">
      {/* Node Row */}
      <div
        onClick={handleNodeClick}
        className={`flex items-center gap-2 pr-4 py-2.5 hover:bg-gray-50 transition-colors cursor-pointer group ${indentClass} ${
          isSelected ? 'bg-blue-50 border-l-4 border-blue-600' : ''
        }`}
      >
        {/* Expand/Collapse Icon */}
        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-600" />
            )
          ) : (
            <div className="w-4 h-4" />
          )}
        </div>

        {/* Code and Name */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-blue-600 flex-shrink-0">
              {node.code}
            </span>
            <span className="text-sm font-medium text-gray-900 truncate">
              {node.name}
            </span>
            {!node.is_active && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 flex-shrink-0">
                Inativa
              </span>
            )}
          </div>
        </div>

        {/* Type Badge */}
        <div className="flex-shrink-0">
          <AccountTypeBadge type={node.type} size="sm" />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          {onAddChild && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddChild(node);
              }}
              title="Adicionar subconta"
              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}

          {onToggleStatus && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleStatus(node);
              }}
              title={node.is_active ? 'Desativar' : 'Ativar'}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
            >
              {node.is_active ? (
                <ToggleRight className="w-3.5 h-3.5" />
              ) : (
                <ToggleLeft className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(node);
              }}
              title="Editar"
              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}

          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(node);
              }}
              title="Excluir"
              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Child Nodes */}
      {isExpanded && node.children && node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              onSelect={onSelect}
              onAddChild={onAddChild}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleStatus={onToggleStatus}
              selectedAccountId={selectedAccountId}
              onExpandToggle={onExpandToggle}
              expandedNodes={expandedNodes}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const ChartOfAccountsTree: React.FC<ChartOfAccountsTreeProps> = ({
  accounts,
  loading = false,
  onSelect,
  onAddChild,
  onEdit,
  onDelete,
  onToggleStatus,
  selectedAccountId,
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(
    new Set(accounts.map((a) => a.id))
  );

  const handleExpandToggle = useCallback((nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const handleExpandAll = useCallback(() => {
    const allIds = new Set<string>();
    const collectIds = (nodes: ChartOfAccountTreeNode[]) => {
      nodes.forEach((node) => {
        allIds.add(node.id);
        if (node.children) {
          collectIds(node.children);
        }
      });
    };
    collectIds(accounts);
    setExpandedNodes(allIds);
  }, [accounts]);

  const handleCollapseAll = useCallback(() => {
    setExpandedNodes(new Set());
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border border-transparent border-t-blue-600" />
          <p className="text-gray-600 text-sm">Carregando plano de contas...</p>
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
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">
          Plano de Contas ({accounts.length} contas)
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExpandAll}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            Expandir Tudo
          </button>
          <button
            onClick={handleCollapseAll}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            Recolher Tudo
          </button>
        </div>
      </div>

      {/* Tree */}
      <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
        {accounts.map((node) => (
          <TreeNode
            key={node.id}
            node={node}
            level={0}
            onSelect={onSelect}
            onAddChild={onAddChild}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleStatus={onToggleStatus}
            selectedAccountId={selectedAccountId}
            onExpandToggle={handleExpandToggle}
            expandedNodes={expandedNodes}
          />
        ))}
      </div>
    </div>
  );
};

export default ChartOfAccountsTree;
