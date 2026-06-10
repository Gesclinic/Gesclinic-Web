import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileText,
  History,
  Lock,
  RefreshCw,
  Save,
  ShieldCheck,
  Webhook,
} from 'lucide-react';
import { useClinicContext } from '@/contexts/ClinicContext';
import { customSupabaseClient } from '@/lib/customSupabaseClient';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

const supabase = customSupabaseClient;

const READINESS_CHECKS = [
  {
    id: 'appointments-audit',
    title: 'Auditoria de agenda',
    description: 'Trilha de alteracoes em agendamentos',
    table: 'appointment_audit_logs',
    dateColumn: 'created_at',
    icon: FileText,
  },
  {
    id: 'financial-audit',
    title: 'Auditoria financeira',
    description: 'Eventos financeiros rastreados por atendimento',
    table: 'appointment_financial_audit_logs',
    dateColumn: 'created_at',
    icon: FileText,
  },
  {
    id: 'delete-log',
    title: 'Log de exclusoes',
    description: 'Exclusoes registradas para rastreabilidade',
    table: 'audit_delete_log',
    dateColumn: 'deleted_at',
    icon: Lock,
    allowEmpty: true,
  },
  {
    id: 'audit-reports',
    title: 'Relatorios de auditoria',
    description: 'Registros consolidados de compliance',
    table: 'audit_reports',
    dateColumn: 'created_at',
    icon: ShieldCheck,
    allowEmpty: true,
  },
  {
    id: 'webhook-logs',
    title: 'Logs de webhooks',
    description: 'Entregas e falhas de integracoes externas',
    table: 'webhook_logs',
    dateColumn: 'created_at',
    icon: Webhook,
    allowEmpty: true,
  },
  {
    id: 'alert-configs',
    title: 'Configuracoes de alertas',
    description: 'Alertas financeiros e operacionais configurados',
    table: 'alert_configs',
    dateColumn: 'created_at',
    icon: AlertCircle,
  },
];

function statusMeta(status) {
  if (status === 'pass') {
    return {
      label: 'OK',
      badge: 'default',
      iconClass: 'text-emerald-600',
      borderClass: 'border-emerald-200',
      bgClass: 'bg-emerald-50',
    };
  }

  if (status === 'warning') {
    return {
      label: 'Atencao',
      badge: 'secondary',
      iconClass: 'text-amber-600',
      borderClass: 'border-amber-200',
      bgClass: 'bg-amber-50',
    };
  }

  if (status === 'fail') {
    return {
      label: 'Falha',
      badge: 'destructive',
      iconClass: 'text-red-600',
      borderClass: 'border-red-200',
      bgClass: 'bg-red-50',
    };
  }

  return {
    label: 'Verificando',
    badge: 'outline',
    iconClass: 'text-slate-500',
    borderClass: 'border-slate-200',
    bgClass: 'bg-slate-50',
  };
}

function getScore(results) {
  if (!results.length) return 0;

  const points = results.reduce((total, item) => {
    if (item.status === 'pass') return total + 1;
    if (item.status === 'warning') return total + 0.5;
    return total;
  }, 0);

  return Math.round((points / results.length) * 100);
}

function getPeriodStart(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function withTimeout(promise, timeoutMs = 10000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout na operacao')), timeoutMs)),
  ]);
}

export default function OperationalCompliancePage() {
  const { clinicId, clinic, loadingClinic } = useClinicContext();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [savingSnapshot, setSavingSnapshot] = useState(false);
  const [lastRunAt, setLastRunAt] = useState(null);
  const [periodDays, setPeriodDays] = useState(30);
  const [snapshots, setSnapshots] = useState([]);
  const [snapshotMessage, setSnapshotMessage] = useState(null);

  const score = useMemo(() => getScore(results), [results]);
  const summary = useMemo(
    () => ({
      pass: results.filter((item) => item.status === 'pass').length,
      warning: results.filter((item) => item.status === 'warning').length,
      fail: results.filter((item) => item.status === 'fail').length,
    }),
    [results],
  );

  useEffect(() => {
    if (!loadingClinic && clinicId) {
      runReadinessChecks();
      loadSnapshotHistory();
    }
  }, [clinicId, loadingClinic, periodDays]);

  async function loadSnapshotHistory() {
    if (!clinicId) return;

    setLoadingHistory(true);
    let data = null;
    let error = null;

    try {
      const response = await withTimeout(
        supabase
          .from('operational_evidence_snapshots')
          .select('id, snapshot_type, period_days, score, summary, checks, metadata, generated_at, created_at')
          .eq('clinic_id', clinicId)
          .eq('snapshot_type', 'compliance_readiness')
          .order('generated_at', { ascending: false })
          .limit(10),
      );
      data = response.data;
      error = response.error;
    } catch (err) {
      error = err;
    }

    if (error) {
      setSnapshotMessage({ type: 'error', text: `Historico indisponivel: ${error.message}` });
      setSnapshots([]);
    } else {
      setSnapshots(data || []);
    }

    setLoadingHistory(false);
  }

  async function countTableRows(check) {
    if (check.id === 'webhook-logs') {
      const { data: webhooks, error: webhooksError } = await supabase
        .from('webhooks')
        .select('id')
        .eq('clinic_id', clinicId);

      if (webhooksError) {
        throw webhooksError;
      }

      const webhookIds = (webhooks || []).map((webhook) => webhook.id);
      if (webhookIds.length === 0) {
        return 0;
      }

      let logsQuery = supabase
        .from('webhook_logs')
        .select('id', { count: 'exact', head: true })
        .in('webhook_id', webhookIds);

      if (check.dateColumn) {
        logsQuery = logsQuery.gte(check.dateColumn, getPeriodStart(periodDays).toISOString());
      }

      const { count, error } = await logsQuery;
      if (error) {
        throw error;
      }

      return count || 0;
    }

    let query = supabase
      .from(check.table)
      .select('id', { count: 'exact', head: true });

    if (clinicId) {
      query = query.eq('clinic_id', clinicId);
    }

    if (check.dateColumn) {
      query = query.gte(check.dateColumn, getPeriodStart(periodDays).toISOString());
    }

    const { count, error } = await query;
    if (error) {
      throw error;
    }

    return count || 0;
  }

  async function runReadinessChecks() {
    if (!clinicId) return;

    setLoading(true);
    const nextResults = [];

    for (const check of READINESS_CHECKS) {
      try {
        const count = await countTableRows(check);
        const status = count > 0 || check.allowEmpty ? 'pass' : 'warning';
        const message = count > 0
          ? `${count} registro(s) no periodo`
          : check.allowEmpty
            ? 'Sem ocorrencias no periodo'
            : 'Nenhum registro encontrado no periodo';

        nextResults.push({ ...check, count, status, message });
      } catch (error) {
        nextResults.push({
          ...check,
          count: 0,
          status: 'fail',
          message: error.message || 'Nao foi possivel consultar a tabela',
        });
      }
    }

    setResults(nextResults);
    setLastRunAt(new Date());
    setLoading(false);
  }

  function buildSnapshot() {
    return {
      generated_at: new Date().toISOString(),
      clinic_id: clinicId,
      clinic_name: clinic?.brand_name || clinic?.name || null,
      period_days: periodDays,
      score,
      summary,
      checks: results.map(({ id, title, table, count, status, message }) => ({
        id,
        title,
        table,
        count,
        status,
        message,
      })),
    };
  }

  async function saveSnapshot() {
    if (!clinicId || !results.length) return;

    setSavingSnapshot(true);
    setSnapshotMessage(null);

    const snapshot = buildSnapshot();
    try {
      const { error } = await withTimeout(
        supabase.from('operational_evidence_snapshots').insert({
          clinic_id: clinicId,
          snapshot_type: 'compliance_readiness',
          period_days: periodDays,
          score,
          summary,
          checks: snapshot.checks,
          metadata: {
            clinic_name: snapshot.clinic_name,
            source: 'admin_compliance_page',
            generated_at: snapshot.generated_at,
          },
        }),
      );

      if (error) {
        setSnapshotMessage({ type: 'error', text: `Nao foi possivel salvar: ${error.message}` });
      } else {
        setSnapshotMessage({ type: 'success', text: 'Evidencia salva no historico.' });
        await loadSnapshotHistory();
      }
    } catch (error) {
      setSnapshotMessage({ type: 'error', text: `Nao foi possivel salvar: ${error.message}` });
    }

    setSavingSnapshot(false);
  }

  function downloadSnapshot(snapshot = buildSnapshot()) {
    const fileDate = (snapshot.generated_at || snapshot.generated_at || new Date().toISOString()).slice(0, 10);

    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gesclinic-compliance-${fileDate}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function downloadPersistedSnapshot(snapshot) {
    downloadSnapshot({
      generated_at: snapshot.generated_at,
      clinic_id: clinicId,
      clinic_name: snapshot.metadata?.clinic_name || clinic?.brand_name || clinic?.name || null,
      period_days: snapshot.period_days,
      score: snapshot.score,
      summary: snapshot.summary,
      checks: snapshot.checks,
    });
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-slate-900">Compliance Operacional</h1>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Readiness de auditoria, rastreabilidade e evidencias operacionais da clinica.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setPeriodDays(periodDays === 30 ? 7 : 30)}>
            Periodo: {periodDays} dias
          </Button>
          <Button variant="outline" onClick={downloadSnapshot} disabled={!results.length} className="gap-2">
            <Download className="h-4 w-4" />
            Baixar snapshot
          </Button>
          <Button variant="outline" onClick={saveSnapshot} disabled={!results.length || savingSnapshot} className="gap-2">
            <Save className={`h-4 w-4 ${savingSnapshot ? 'animate-pulse' : ''}`} />
            Salvar evidencia
          </Button>
          <Button onClick={runReadinessChecks} disabled={loading || loadingClinic} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {snapshotMessage && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            snapshotMessage.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {snapshotMessage.text}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Clinica</CardDescription>
            <CardTitle className="text-xl">{clinic?.brand_name || clinic?.name || 'Carregando'}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Score de readiness</CardDescription>
            <CardTitle className="text-xl">{score}%</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={score} className="h-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Checks OK</CardDescription>
            <CardTitle className="text-xl text-emerald-700">{summary.pass}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ultima verificacao</CardDescription>
            <CardTitle className="text-xl">
              {lastRunAt ? lastRunAt.toLocaleTimeString('pt-BR') : '-'}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Evidencias de compliance</CardTitle>
              <CardDescription>
                Consultas somente leitura nas tabelas de auditoria e operacao critica.
              </CardDescription>
            </div>
            <Badge variant={summary.fail ? 'destructive' : summary.warning ? 'secondary' : 'default'}>
              {summary.fail ? 'Falhas de consulta' : summary.warning ? 'Evidencias incompletas' : 'Readiness OK'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {results.map((result) => {
              const meta = statusMeta(result.status);
              const Icon = result.icon;

              return (
                <div key={result.id} className={`rounded-lg border p-4 ${meta.borderClass} ${meta.bgClass}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex gap-3">
                      <div className="rounded-md bg-white p-2 shadow-sm">
                        <Icon className={`h-5 w-5 ${meta.iconClass}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{result.title}</h3>
                        <p className="text-sm text-slate-600">{result.description}</p>
                        <p className="mt-2 text-xs font-mono text-slate-500">{result.table}</p>
                      </div>
                    </div>
                    <Badge variant={meta.badge}>{meta.label}</Badge>
                  </div>

                  <div className="mt-4 flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
                    <CheckCircle2 className={`h-4 w-4 ${meta.iconClass}`} />
                    <span>{result.message}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Controles cobertos</CardTitle>
          <CardDescription>Resumo dos controles que esta fase deixa visiveis para administracao.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 text-sm text-slate-700 lg:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="font-semibold text-slate-900">Rastreabilidade</h3>
            <p className="mt-2">Agenda, financeiro, exclusoes e webhooks passam a ter verificacao centralizada.</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="font-semibold text-slate-900">Evidencia exportavel</h3>
            <p className="mt-2">O snapshot JSON ajuda a anexar estado operacional em auditorias internas.</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="font-semibold text-slate-900">Pronto para automacao</h3>
            <p className="mt-2">A proxima etapa pode agendar envio recorrente por email e alertar queda de score.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-blue-600" />
                Historico de evidencias
              </CardTitle>
              <CardDescription>Ultimos snapshots persistidos para a clinica atual.</CardDescription>
            </div>
            <Button variant="outline" onClick={loadSnapshotHistory} disabled={loadingHistory} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${loadingHistory ? 'animate-spin' : ''}`} />
              Recarregar historico
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {snapshots.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">
              Nenhuma evidencia persistida ainda.
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <div className="grid grid-cols-12 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <span className="col-span-4">Gerado em</span>
                <span className="col-span-2">Periodo</span>
                <span className="col-span-2">Score</span>
                <span className="col-span-2">Falhas</span>
                <span className="col-span-2 text-right">Acoes</span>
              </div>
              {snapshots.map((snapshot) => (
                <div key={snapshot.id} className="grid grid-cols-12 items-center border-t border-slate-200 px-4 py-3 text-sm">
                  <span className="col-span-4 text-slate-700">
                    {new Date(snapshot.generated_at).toLocaleString('pt-BR')}
                  </span>
                  <span className="col-span-2 text-slate-600">{snapshot.period_days} dias</span>
                  <span className="col-span-2 font-semibold text-slate-900">{snapshot.score}%</span>
                  <span className="col-span-2 text-slate-600">{snapshot.summary?.fail || 0}</span>
                  <span className="col-span-2 text-right">
                    <Button variant="ghost" size="sm" onClick={() => downloadPersistedSnapshot(snapshot)} className="gap-2">
                      <Download className="h-4 w-4" />
                      Baixar
                    </Button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
