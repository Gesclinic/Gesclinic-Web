import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { CheckCircle2, AlertCircle, XCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useClinicContext } from '@/contexts/useClinicContext';

type IntegrationStatus = {
  id: string;
  name: string;
  status: 'connected' | 'warning' | 'error';
  isOptional: boolean;
  sourceTable: string | null;
  lastSync: string;
  lastSyncReal: string | null;
  recordCount: number;
  trend7d: number | null;
  trend30d: number | null;
  dateColumnUsed: string | null;
  qualityScore: number;
  qualityNotes: string[];
  technicalError: string | null;
  description: string;
};

type IntegrationDef = {
  id: string;
  name: string;
  table: string;
  tableCandidates?: string[];
  description: string;
  clinicScoped?: boolean;
  minRecords30d?: number;
  staleDays?: number;
  dateCandidates?: string[];
  allowZeroRecords?: boolean;
  expectedWeeklyActivity?: boolean;
};

type Props = {
  loading?: boolean;
};

const DEFAULT_DATE_CANDIDATES = [
  'updated_at',
  'created_at',
  'synced_at',
  'processed_at',
  'issued_at',
  'issue_date',
  'competence_date',
  'transaction_date',
  'date',
  'data',
];

const formatDateTime = (value: string | null) => {
  if (!value) return null;
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toLocaleString('pt-BR');
};

const formatTechnicalError = (error: any) => {
  if (!error) return null;
  const parts = [error.code, error.message, error.details].filter(Boolean);
  return parts.join(' • ') || 'Erro técnico não identificado';
};

const daysAgoIso = (days: number) => {
  const dt = new Date();
  dt.setDate(dt.getDate() - days);
  return dt.toISOString();
};

/**
 * ETAPA 20: Integrações Obrigatórias
 * Painel que mostra status de todas as integrações de dados
 */
export default function DREIntegrationStatus({ loading = false }: Props) {
  const { clinicId } = useClinicContext();
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<string>(new Date().toLocaleTimeString('pt-BR'));

  const buildBaseQuery = React.useCallback((def: IntegrationDef, tableName?: string) => {
    let query = supabase.from(tableName || def.table).select('id', { count: 'exact', head: true });
    if (def.clinicScoped !== false) {
      query = query.eq('clinic_id', clinicId);
    }
    return query;
  }, [clinicId]);

  const resolveTableName = React.useCallback(async (def: IntegrationDef) => {
    const candidates = [def.table, ...(def.tableCandidates || [])];
    const uniqueCandidates = [...new Set(candidates)].filter(Boolean);

    for (const tableName of uniqueCandidates) {
      const { error } = await buildBaseQuery(def, tableName);
      if (!error) {
        return tableName;
      }
    }

    return null;
  }, [buildBaseQuery]);

  const detectDateColumn = React.useCallback(async (def: IntegrationDef, tableName: string) => {
    const candidates = [...(def.dateCandidates || []), ...DEFAULT_DATE_CANDIDATES];
    const uniqueCandidates = [...new Set(candidates)];
    for (const column of uniqueCandidates) {
      let query = supabase.from(tableName).select(column, { count: 'exact', head: true });
      if (def.clinicScoped !== false) {
        query = query.eq('clinic_id', clinicId);
      }

      const { error } = await query;
      if (!error) {
        return column;
      }
    }

    return null;
  }, [clinicId]);

  const fetchLastSyncFromColumn = React.useCallback(async (def: IntegrationDef, tableName: string, dateColumn: string) => {
    let query = supabase
      .from(tableName)
      .select(dateColumn)
      .not(dateColumn, 'is', null)
      .order(dateColumn, { ascending: false })
      .limit(1);

    if (def.clinicScoped !== false) {
      query = query.eq('clinic_id', clinicId);
    }

    const { data, error } = await query;
    if (error) {
      return { lastSyncReal: null as string | null, error };
    }

    const value = data && data.length > 0 ? data[0]?.[dateColumn] : null;
    return { lastSyncReal: value ? String(value) : null, error: null };
  }, [clinicId]);

  const fetchTrendCount = React.useCallback(async (def: IntegrationDef, tableName: string, dateColumn: string, sinceIso: string) => {
    let query = supabase
      .from(tableName)
      .select('id', { count: 'exact', head: true })
      .gte(dateColumn, sinceIso);

    if (def.clinicScoped !== false) {
      query = query.eq('clinic_id', clinicId);
    }

    const { count, error } = await query;
    if (error) {
      return { count: null as number | null, error };
    }

    return { count: Number(count || 0), error: null };
  }, [clinicId]);

  const evaluateQuality = React.useCallback((params: {
    def: IntegrationDef;
    total: number;
    trend7d: number | null;
    trend30d: number | null;
    lastSyncReal: string | null;
    hasDateColumn: boolean;
  }) => {
    const { def, total, trend7d, trend30d, lastSyncReal, hasDateColumn } = params;

    let score = 100;
    const notes: string[] = [];

    if (total === 0) {
      if (def.allowZeroRecords) {
        score -= 5;
        notes.push('Sem registros totais (integração opcional para esta clínica).');
      } else {
        score -= 45;
        notes.push('Sem registros totais para a clínica.');
      }
    }

    if (!hasDateColumn) {
      score -= 10;
      notes.push('Sem coluna temporal detectada para tendência.');
    }

    if (trend30d !== null) {
      const min30 = def.minRecords30d || 1;
      if (min30 > 0 && trend30d < min30) {
        score -= 20;
        notes.push(`Volume 30d abaixo do mínimo esperado (${trend30d}/${min30}).`);
      }
    }

    if (
      def.expectedWeeklyActivity !== false
      && trend7d !== null
      && trend30d !== null
      && trend30d > 0
      && trend7d === 0
    ) {
      score -= 15;
      notes.push('Sem movimento nos últimos 7 dias.');
    }

    if (lastSyncReal) {
      const staleDays = def.staleDays || 3;
      const dt = new Date(lastSyncReal);
      if (!Number.isNaN(dt.getTime())) {
        const ageMs = Date.now() - dt.getTime();
        const ageDays = ageMs / (1000 * 60 * 60 * 24);
        if (ageDays > staleDays) {
          score -= 20;
          notes.push(`Último sync real acima do limite (${ageDays.toFixed(1)}d > ${staleDays}d).`);
        }
      }
    }

    if (notes.length === 0) {
      notes.push('Qualidade dentro dos parâmetros esperados.');
    }

    return { score: Math.max(0, score), notes };
  }, []);

  const loadIntegrations = React.useCallback(async () => {
    if (!clinicId) {
      setIntegrations([]);
      return;
    }

    const nowLabel = new Date().toLocaleTimeString('pt-BR');
    setLastSyncTime(nowLabel);

    const defs: IntegrationDef[] = [
      {
        id: 'plano-contas',
        name: 'Plano de Contas',
        table: 'financial_chart_of_accounts',
        description: 'Classificação contábil ERP',
        minRecords30d: 1,
        staleDays: 10,
      },
      {
        id: 'centro-custos',
        name: 'Centro de Custos',
        table: 'financial_cost_centers',
        description: 'Agregação por departamento/unidade',
        minRecords30d: 1,
        staleDays: 10,
      },
      {
        id: 'fluxo-caixa',
        name: 'Fluxo de Caixa',
        table: 'financial_transactions',
        description: 'Entradas e saídas realizadas',
        minRecords30d: 5,
        staleDays: 3,
      },
      {
        id: 'contas-receber',
        name: 'Contas a Receber',
        table: 'ar_invoices',
        description: 'Faturas e recebíveis por competência',
        minRecords30d: 3,
        staleDays: 3,
      },
      {
        id: 'contas-pagar',
        name: 'Contas a Pagar',
        table: 'ap_bills',
        description: 'Despesas e repasses',
        minRecords30d: 3,
        staleDays: 3,
      },
      {
        id: 'faturamento',
        name: 'Faturamento',
        table: 'invoices',
        description: 'Faturamento consolidado',
        minRecords30d: 3,
        staleDays: 5,
      },
      {
        id: 'guias-tiss',
        name: 'Guias TISS',
        table: 'billing_guides',
        description: 'Guias e retorno de convênios',
        minRecords30d: 0,
        staleDays: 7,
        allowZeroRecords: true,
        expectedWeeklyActivity: false,
      },
      {
        id: 'glosas',
        name: 'Glosas',
        table: 'receivable_glosas',
        description: 'Glosas e evidências de contestação',
        minRecords30d: 0,
        staleDays: 10,
        allowZeroRecords: true,
        expectedWeeklyActivity: false,
      },
      {
        id: 'repasse-medico',
        name: 'Repasse Médico',
        table: 'repasse_medico',
        tableCandidates: ['ap_bills'],
        description: 'Repasse por profissional',
        minRecords30d: 0,
        staleDays: 7,
        allowZeroRecords: true,
        expectedWeeklyActivity: false,
      },
      {
        id: 'agendamentos',
        name: 'Agendamentos',
        table: 'appointments',
        description: 'Volume assistencial e produção',
        minRecords30d: 5,
        staleDays: 3,
      },
    ];

    const rows = await Promise.all(
      defs.map(async (def): Promise<IntegrationStatus> => {
        try {
          const resolvedTable = await resolveTableName(def);
          if (!resolvedTable) {
            return {
              id: def.id,
              name: def.name,
              status: 'error',
              isOptional: Boolean(def.allowZeroRecords),
              sourceTable: null,
              lastSync: nowLabel,
              lastSyncReal: null,
              recordCount: 0,
              trend7d: null,
              trend30d: null,
              dateColumnUsed: null,
              qualityScore: 0,
              qualityNotes: ['Nenhuma tabela disponível para esta integração.'],
              technicalError: 'Tabela não encontrada no schema para esta integração.',
              description: def.description,
            };
          }

          const { count, error } = await buildBaseQuery(def, resolvedTable);
          if (error) {
            return {
              id: def.id,
              name: def.name,
              status: 'error',
              isOptional: Boolean(def.allowZeroRecords),
              sourceTable: null,
              lastSync: nowLabel,
              lastSyncReal: null,
              recordCount: 0,
              trend7d: null,
              trend30d: null,
              dateColumnUsed: null,
              qualityScore: 0,
              qualityNotes: ['Falha ao consultar contagem total.'],
              technicalError: formatTechnicalError(error),
              description: def.description,
            };
          }

          const total = Number(count || 0);
          const dateColumn = await detectDateColumn(def, resolvedTable);

          let technicalError: string | null = null;
          let lastSyncReal: string | null = null;
          let trend7d: number | null = null;
          let trend30d: number | null = null;

          if (dateColumn) {
            const [lastSyncResult, trend7Result, trend30Result] = await Promise.all([
              fetchLastSyncFromColumn(def, resolvedTable, dateColumn),
              fetchTrendCount(def, resolvedTable, dateColumn, daysAgoIso(7)),
              fetchTrendCount(def, resolvedTable, dateColumn, daysAgoIso(30)),
            ]);

            lastSyncReal = lastSyncResult.lastSyncReal;
            trend7d = trend7Result.count;
            trend30d = trend30Result.count;

            if (lastSyncResult.error) {
              technicalError = formatTechnicalError(lastSyncResult.error);
            }
            if (!technicalError && trend7Result.error) {
              technicalError = formatTechnicalError(trend7Result.error);
            }
            if (!technicalError && trend30Result.error) {
              technicalError = formatTechnicalError(trend30Result.error);
            }
          }

          const quality = evaluateQuality({
            def,
            total,
            trend7d,
            trend30d,
            lastSyncReal,
            hasDateColumn: Boolean(dateColumn),
          });

          const status: IntegrationStatus['status'] = technicalError
            ? 'error'
            : quality.score >= 70
              ? 'connected'
              : 'warning';

          return {
            id: def.id,
            name: def.name,
            status,
            isOptional: Boolean(def.allowZeroRecords),
            sourceTable: resolvedTable,
            lastSync: nowLabel,
            lastSyncReal: formatDateTime(lastSyncReal),
            recordCount: total,
            trend7d,
            trend30d,
            dateColumnUsed: dateColumn,
            qualityScore: quality.score,
            qualityNotes: quality.notes,
            technicalError,
            description: def.description,
          };
        } catch (error: any) {
          return {
            id: def.id,
            name: def.name,
            status: 'error',
            isOptional: Boolean(def.allowZeroRecords),
            sourceTable: null,
            lastSync: nowLabel,
            lastSyncReal: null,
            recordCount: 0,
            trend7d: null,
            trend30d: null,
            dateColumnUsed: null,
            qualityScore: 0,
            qualityNotes: ['Falha inesperada durante análise da integração.'],
            technicalError: formatTechnicalError(error),
            description: def.description,
          };
        }
      }),
    );

    setIntegrations(rows);
  }, [
    clinicId,
    buildBaseQuery,
    resolveTableName,
    detectDateColumn,
    evaluateQuality,
    fetchLastSyncFromColumn,
    fetchTrendCount,
  ]);

  useEffect(() => {
    loadIntegrations();
  }, [loadIntegrations]);

  const connectedCount = integrations.filter(i => i.status === 'connected').length;
  const warningCount = integrations.filter(i => i.status === 'warning').length;
  const errorCount = integrations.filter(i => i.status === 'error').length;
  const totalRecords = integrations.reduce((sum, i) => sum + i.recordCount, 0);
  const total7d = integrations.reduce((sum, i) => sum + (i.trend7d || 0), 0);
  const total30d = integrations.reduce((sum, i) => sum + (i.trend30d || 0), 0);
  const avgQuality = integrations.length > 0
    ? Math.round(integrations.reduce((sum, i) => sum + i.qualityScore, 0) / integrations.length)
    : 0;

  const optionalWithoutData = integrations.filter(
    (item) => item.isOptional && item.recordCount === 0 && !item.technicalError,
  );
  const realAttentionItems = integrations.filter(
    (item) => item.status !== 'connected' && !(item.isOptional && item.recordCount === 0 && !item.technicalError),
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return <Card className="p-6 animate-pulse h-96 bg-gray-100" />;
  }

  return (
    <div className="space-y-6">
      {/* CABEÇALHO */}
      <Card className="p-6 bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              🔗 Status de Integrações
            </h2>
            <p className="text-sm text-gray-600 mt-1">ETAPA 20 - Todas as integrações obrigatórias</p>
          </div>
          <button
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            onClick={loadIntegrations}
          >
            <RefreshCw className="w-4 h-4" />
            Sincronizar Agora
          </button>
        </div>

        {/* RESUMO */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="rounded-lg bg-white p-4 border border-green-200">
            <p className="text-xs text-gray-600 font-semibold">CONECTADAS</p>
            <p className="text-3xl font-bold text-green-900 mt-2">{connectedCount}</p>
            <p className="text-xs text-green-600 mt-1">Sync {lastSyncTime}</p>
          </div>

          <div className="rounded-lg bg-white p-4 border border-yellow-200">
            <p className="text-xs text-gray-600 font-semibold">AVISOS</p>
            <p className="text-3xl font-bold text-yellow-900 mt-2">{warningCount}</p>
            <p className="text-xs text-yellow-600 mt-1">Requer atenção</p>
          </div>

          <div className="rounded-lg bg-white p-4 border border-red-200">
            <p className="text-xs text-gray-600 font-semibold">ERROS</p>
            <p className="text-3xl font-bold text-red-900 mt-2">{errorCount}</p>
            <p className="text-xs text-red-600 mt-1">Falhas críticas</p>
          </div>

          <div className="rounded-lg bg-white p-4 border border-indigo-200">
            <p className="text-xs text-gray-600 font-semibold">REGISTROS SYNC</p>
            <p className="text-3xl font-bold text-indigo-900 mt-2">{(totalRecords / 1000).toFixed(0)}k</p>
            <p className="text-xs text-indigo-600 mt-1">Total sincronizado</p>
          </div>

          <div className="rounded-lg bg-white p-4 border border-cyan-200">
            <p className="text-xs text-gray-600 font-semibold">VOLUME 7D</p>
            <p className="text-3xl font-bold text-cyan-900 mt-2">{(total7d / 1000).toFixed(0)}k</p>
            <p className="text-xs text-cyan-600 mt-1">Movimento recente</p>
          </div>

          <div className="rounded-lg bg-white p-4 border border-purple-200">
            <p className="text-xs text-gray-600 font-semibold">QUALIDADE MÉDIA</p>
            <p className="text-3xl font-bold text-purple-900 mt-2">{avgQuality}</p>
            <p className="text-xs text-purple-600 mt-1">Score de 0 a 100</p>
          </div>
        </div>
      </Card>

      {/* LISTA DE INTEGRAÇÕES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrations.map((integration) => (
          <Card key={integration.id} className={`p-4 border-l-4 ${getStatusBgColor(integration.status)}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                {getStatusIcon(integration.status)}
                <div>
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    {integration.name}
                    <span
                      className="text-[10px] font-normal text-slate-500 border border-slate-300 rounded px-1 py-[1px]"
                      title={`Fonte técnica: ${integration.sourceTable || 'n/d'}`}
                    >
                      fonte
                    </span>
                  </h4>
                  <p className="text-xs text-gray-600 mt-1">{integration.description}</p>
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-gray-500">
                    <span>📊 {integration.recordCount.toLocaleString('pt-BR')} registros</span>
                    <span>🕐 Sync tela: {integration.lastSync}</span>
                    <span>🧭 Último sync real: {integration.lastSyncReal || 'n/d'}</span>
                    <span>📈 7d: {integration.trend7d !== null ? integration.trend7d.toLocaleString('pt-BR') : 'n/d'}</span>
                    <span>📊 30d: {integration.trend30d !== null ? integration.trend30d.toLocaleString('pt-BR') : 'n/d'}</span>
                    <span>🧪 Qualidade: {integration.qualityScore}</span>
                  </div>
                  <div className="mt-2 text-xs text-slate-600">
                    Regra: {integration.qualityNotes[0]}
                  </div>
                  {integration.technicalError ? (
                    <div className="mt-2 text-xs text-red-700 bg-red-100 border border-red-200 rounded px-2 py-1">
                      Erro técnico: {integration.technicalError}
                    </div>
                  ) : null}
                </div>
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded ${
                integration.status === 'connected'
                  ? 'bg-green-100 text-green-800'
                  : integration.status === 'warning'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {integration.status === 'connected' ? 'Ativa' : integration.status === 'warning' ? 'Aviso' : 'Erro'}
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* OPCIONAIS SEM DADOS */}
      <Card className="p-5 bg-slate-50 border-slate-200">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-slate-900">ℹ️ Integrações Opcionais Sem Dados</h3>
            <p className="text-sm text-slate-600 mt-1">
              Itens abaixo não representam falha para o perfil atual da clínica.
            </p>
          </div>
          <span className="text-xs font-semibold px-2 py-1 rounded bg-slate-200 text-slate-700">
            {optionalWithoutData.length} opcional(is)
          </span>
        </div>
        <ul className="mt-3 text-sm text-slate-700 space-y-1 list-disc list-inside">
          {optionalWithoutData.length === 0 ? (
            <li>Nenhuma integração opcional está sem dados no momento.</li>
          ) : (
            optionalWithoutData.map((item) => (
              <li key={item.id}>{item.name}</li>
            ))
          )}
        </ul>
      </Card>

      {/* RECOMENDAÇÕES */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-gray-900 mb-4">📋 Checklist de Integrações</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">✅ Integradas e Operacionais:</h4>
            <ul className="text-gray-700 space-y-1 list-disc list-inside">
              {integrations
                .filter((item) => item.status === 'connected')
                .slice(0, 8)
                .map((item) => (
                  <li key={item.id}>{item.name}</li>
                ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">⚠️ Com Avisos/Erros Reais:</h4>
            <ul className="text-gray-700 space-y-1 list-disc list-inside">
              {realAttentionItems.length === 0 ? (
                <li>Nenhum aviso crítico no momento.</li>
              ) : (
                realAttentionItems.map((item) => (
                  <li key={item.id}>{item.name} - revisar conectividade, volume ou qualidade</li>
                ))
              )}
            </ul>
            <h4 className="font-semibold text-gray-900 mt-4 mb-2">✓ Integrados Adicionais:</h4>
            <ul className="text-gray-700 space-y-1 list-disc list-inside">
              <li>Atualização on-demand com recálculo por tabela</li>
              <li>Status automático por volume de dados da clínica</li>
              <li>Monitoramento de contagem de registros por integração</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* PRÓXIMOS PASSOS */}
      <Card className="p-4 bg-purple-50 border-purple-200">
        <p className="text-sm font-semibold text-purple-900">🎯 Próximas Ações:</p>
        <ul className="text-sm text-purple-800 space-y-1 mt-2 list-disc list-inside">
          <li>Investigar cards com erro técnico detalhado</li>
          <li>Ajustar mínimos esperados por integração (regras de qualidade)</li>
          <li>Incluir alerta quando 7d ficar zerado com 30d positivo</li>
          <li>Registrar último sync real em tabela de monitoramento dedicada</li>
        </ul>
      </Card>
    </div>
  );
}
