import React from 'react';
import { Card } from '@/components/ui/card';
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import type { DRELineItem, DrillDownCriteria } from '@/lib/dreEnterpriseEngine';

const DRE_TABLE_STATE_KEY = 'finance_dre_table_state_v1';

type Props = {
  lines: DRELineItem[];
  loading?: boolean;
  drillDowns?: Map<string, DRELineItem[]>;
  loadingDrillDown?: boolean;
  onDrillDown?: (by: DrillDownCriteria, context?: Record<string, any>) => Promise<void> | void;
  projectedScenarioLabel?: string;
};

const formatMoney = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const levelPadding = (level: number) => {
  if (level <= 1) return 'pl-1';
  if (level === 2) return 'pl-6';
  if (level === 3) return 'pl-10';
  if (level === 4) return 'pl-14';
  return 'pl-16';
};

const getDrillAction = (line: DRELineItem): DrillDownCriteria | null => {
  if (line.id === 'receita_bruta') return null;
  if (line.id.startsWith('convenio_')) return 'guia';
  if (line.id.startsWith('servico_')) return 'servico';
  if (line.id.startsWith('profissional_')) return 'profissional';
  if (line.id.startsWith('guia_')) return 'paciente';
  if (line.id.startsWith('titulo_')) return 'atendimento';
  if (line.id.startsWith('receita_')) return 'guia';
  if (line.id.startsWith('deducao_')) return 'paciente';
  return null;
};

const getDrillKey = (drillBy: DrillDownCriteria, line: DRELineItem) => {
  const context = { ...(line.metadata || {}), sourceLineId: line.id };
  return `v11:${drillBy}:${JSON.stringify(context)}`;
};

const getDetailContext = (line: DRELineItem) => ({ ...(line.metadata || {}), sourceLineId: line.id });

const readStoredTableState = () => {
  if (typeof window === 'undefined') return { collapsedAccounts: {}, expandedDetailKeys: {} };
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(DRE_TABLE_STATE_KEY) || '{}');
    return {
      collapsedAccounts: parsed.collapsedAccounts && typeof parsed.collapsedAccounts === 'object' ? parsed.collapsedAccounts : {},
      expandedDetailKeys: parsed.expandedDetailKeys && typeof parsed.expandedDetailKeys === 'object' ? parsed.expandedDetailKeys : {},
    };
  } catch {
    return { collapsedAccounts: {}, expandedDetailKeys: {} };
  }
};

const getRowAnchorId = (lineId: string) => `dre-line-${encodeURIComponent(lineId)}`;

export default function DRETable({
  lines,
  loading = false,
  drillDowns = new Map(),
  loadingDrillDown = false,
  onDrillDown,
  projectedScenarioLabel,
}: Props) {
  const initialTableState = React.useMemo(readStoredTableState, []);
  const [collapsedAccounts, setCollapsedAccounts] = React.useState<Record<string, boolean>>(initialTableState.collapsedAccounts);
  const [expandedDetailKeys, setExpandedDetailKeys] = React.useState<Record<string, boolean>>(initialTableState.expandedDetailKeys);
  const [activeDetailKey, setActiveDetailKey] = React.useState<string | null>(null);
  const requestedRestoreKeys = React.useRef(new Set<string>());
  const title = projectedScenarioLabel
    ? `Demonstracao de Resultado (Enterprise) - Projetada (${projectedScenarioLabel})`
    : 'Demonstracao de Resultado (Enterprise)';

  const parentAccountIds = React.useMemo(() => {
    const ids = new Set<string>();
    lines.forEach((line, index) => {
      const nextLine = lines[index + 1];
      if (line.level === 1 && nextLine && nextLine.level > line.level) {
        ids.add(line.id);
      }
    });
    return ids;
  }, [lines]);

  const hasAccountGroups = parentAccountIds.size > 0;

  const visibleLines = React.useMemo(() => {
    let currentParentId: string | null = null;
    const rows: Array<DRELineItem & { isDetailPlaceholder?: boolean }> = [];

    const appendLineWithDetails = (line: DRELineItem) => {
      rows.push(line);

      const drillAction = getDrillAction(line);
      if (!drillAction) return;

      const drillKey = getDrillKey(drillAction, line);
      if (!expandedDetailKeys[drillKey]) return;

      const detailRows = drillDowns.get(drillKey) || [];
      if (detailRows.length === 0) {
        rows.push({
          id: `${drillKey}:empty`,
          name: activeDetailKey === drillKey && loadingDrillDown ? 'Carregando detalhes...' : 'Sem detalhes para esta conta no período.',
          level: Math.min(5, line.level + 1) as DRELineItem['level'],
          value: 0,
          percentOfRevenue: undefined,
          drillAvailable: false,
          isDetailPlaceholder: true,
        });
        return;
      }

      detailRows.forEach((detail) => appendLineWithDetails(detail));
    };

    lines.forEach((line) => {
      if (line.level === 1) {
        currentParentId = line.id;
        appendLineWithDetails(line);
      } else if (!currentParentId || !collapsedAccounts[currentParentId]) {
        appendLineWithDetails(line);
      }
    });

    return rows;
  }, [activeDetailKey, collapsedAccounts, drillDowns, expandedDetailKeys, lines, loadingDrillDown]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(DRE_TABLE_STATE_KEY, JSON.stringify({ collapsedAccounts, expandedDetailKeys }));
  }, [collapsedAccounts, expandedDetailKeys]);

  React.useEffect(() => {
    if (!onDrillDown) return;

    visibleLines.forEach((line) => {
      const drillAction = getDrillAction(line);
      if (!drillAction) return;

      const drillKey = getDrillKey(drillAction, line);
      if (!expandedDetailKeys[drillKey] || drillDowns.has(drillKey) || requestedRestoreKeys.current.has(drillKey)) return;

      requestedRestoreKeys.current.add(drillKey);
      void onDrillDown(drillAction, getDetailContext(line));
    });
  }, [drillDowns, expandedDetailKeys, onDrillDown, visibleLines]);

  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.location.hash.startsWith('#dre-line-')) return;
    const anchorId = window.location.hash.slice(1);
    const element = document.getElementById(anchorId);
    if (!element) return;

    element.scrollIntoView({ block: 'center', behavior: 'smooth' });
    element.classList.add('ring-2', 'ring-blue-300', 'ring-offset-1');
    const timeoutId = window.setTimeout(() => {
      element.classList.remove('ring-2', 'ring-blue-300', 'ring-offset-1');
    }, 1800);

    return () => window.clearTimeout(timeoutId);
  }, [visibleLines]);

  const toggleAccount = (accountId: string) => {
    setCollapsedAccounts((current) => ({
      ...current,
      [accountId]: !current[accountId],
    }));
  };

  const expandAllAccounts = () => {
    setCollapsedAccounts({});
  };

  const collapseAllAccounts = () => {
    setCollapsedAccounts(
      Array.from(parentAccountIds).reduce<Record<string, boolean>>((acc, accountId) => {
        acc[accountId] = true;
        return acc;
      }, {}),
    );
  };

  const toggleDetail = async (line: DRELineItem, drillAction: DrillDownCriteria) => {
    if (!onDrillDown) return;

    const drillKey = getDrillKey(drillAction, line);
    if (expandedDetailKeys[drillKey]) {
      setExpandedDetailKeys((current) => ({ ...current, [drillKey]: false }));
      return;
    }

    setExpandedDetailKeys((current) => ({ ...current, [drillKey]: true }));
    if (!drillDowns.has(drillKey)) {
      setActiveDetailKey(drillKey);
      await onDrillDown(drillAction, getDetailContext(line));
      setActiveDetailKey(null);
    }
  };

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>

      {hasAccountGroups ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 p-2">
          <div className="text-xs font-semibold text-slate-600">
            Visualização das contas financeiras
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={expandAllAccounts}
              className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              <ChevronDown className="h-3.5 w-3.5" />
              Expandir tudo
            </button>
            <button
              type="button"
              onClick={collapseAllAccounts}
              className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              <ChevronRight className="h-3.5 w-3.5" />
              Recolher tudo
            </button>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="text-sm text-gray-500 py-8 text-center">Carregando DRE...</div>
      ) : lines.length === 0 ? (
        <div className="text-sm text-gray-500 py-8 text-center">Nenhuma linha de DRE para o periodo selecionado.</div>
      ) : (
        <div className="overflow-auto rounded-md border border-slate-200">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead className="bg-slate-900 text-white">
              <tr className="border-b">
                <th className="px-3 py-2 text-left font-bold">Conta</th>
                <th className="px-3 py-2 text-right font-bold">Valor</th>
                <th className="px-3 py-2 text-right font-bold">% Receita</th>
                <th className="px-3 py-2 text-right font-bold">Acao</th>
              </tr>
            </thead>
            <tbody>
              {visibleLines.map((line) => {
                const drillAction = getDrillAction(line);
                const hasChildren = parentAccountIds.has(line.id);
                const isCollapsed = Boolean(collapsedAccounts[line.id]);
                const drillKey = drillAction ? getDrillKey(drillAction, line) : null;
                const isDetailExpanded = drillKey ? Boolean(expandedDetailKeys[drillKey]) : false;
                const canDrill = Boolean(line.drillAvailable && drillAction && onDrillDown);
                const showTreeToggle = hasChildren || canDrill;
                const actionPath = line.metadata?.actionPath ? String(line.metadata.actionPath) : null;
                return (
                  <tr id={getRowAnchorId(line.id)} key={line.id} className={`border-b border-slate-100 last:border-0 ${line.level === 1 ? 'bg-slate-50' : line.isDetailPlaceholder ? 'bg-amber-50/40' : 'bg-white'}`}>
                    <td className={`px-3 py-2 ${levelPadding(line.level)} ${line.level === 1 ? 'font-semibold text-slate-900' : line.isDetailPlaceholder ? 'italic text-slate-500' : 'text-gray-700'}`}>
                      <span className="inline-flex items-start gap-2">
                        {showTreeToggle ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (hasChildren) {
                                toggleAccount(line.id);
                              } else if (canDrill && drillAction) {
                                void toggleDetail(line, drillAction);
                              }
                            }}
                            className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
                            aria-label={(hasChildren ? isCollapsed : !isDetailExpanded) ? `Expandir ${line.name}` : `Recolher ${line.name}`}
                          >
                            {(hasChildren ? isCollapsed : !isDetailExpanded) ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </button>
                        ) : line.level > 1 ? (
                          <span className="h-5 w-5 shrink-0" />
                        ) : null}
                        <span>
                          {line.name}
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-medium">{formatMoney(line.value || 0)}</td>
                    <td className="px-3 py-2 text-right font-mono text-gray-600">
                      {line.percentOfRevenue !== undefined ? `${line.percentOfRevenue.toFixed(2)}%` : '-'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {actionPath ? (
                        <div className="flex flex-wrap justify-end gap-2">
                          <a
                            href={actionPath}
                            className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            {line.metadata?.actionLabel ? String(line.metadata.actionLabel) : 'Abrir conta'}
                          </a>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
