import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Database,
  Mail,
  RefreshCw,
  Server,
  ShieldCheck,
  Webhook,
} from 'lucide-react';
import { useClinicContext } from '@/contexts/ClinicContext';
import { customSupabaseClient } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

const supabase = customSupabaseClient;

const CHECKS = [
  {
    id: 'database',
    title: 'Banco de dados',
    description: 'Conexao Supabase e contexto da clinica',
    icon: Database,
    run: async ({ clinicId }) => {
      if (!clinicId) throw new Error('Clinica nao carregada');
      const { error } = await supabase.from('clinics').select('id').eq('id', clinicId).limit(1);
      if (error) throw error;
      return 'Conexao validada';
    },
  },
  {
    id: 'send-report',
    title: 'Envio imediato',
    description: 'Edge Function send-report com CORS ativo',
    icon: Mail,
    run: async ({ supabaseUrl, anonKey }) => checkFunction(`${supabaseUrl}/functions/v1/send-report`, anonKey),
  },
  {
    id: 'schedule-report',
    title: 'Agendamento de email',
    description: 'Edge Function schedule-report com CORS ativo',
    icon: Clock,
    run: async ({ supabaseUrl, anonKey }) =>
      checkFunction(`${supabaseUrl}/functions/v1/schedule-report`, anonKey),
  },
  {
    id: 'email-schedules',
    title: 'Tabela de agendas',
    description: 'Persistencia dos relatorios agendados',
    icon: Mail,
    run: async ({ clinicId }) => {
      const { count, error } = await supabase
        .from('email_schedules')
        .select('id', { count: 'exact', head: true })
        .eq('clinic_id', clinicId);
      if (error) throw error;
      return `${count || 0} agenda(s) encontrada(s)`;
    },
  },
  {
    id: 'webhooks',
    title: 'Webhooks',
    description: 'Registro e logs de webhooks por clinica',
    icon: Webhook,
    run: async ({ clinicId }) => {
      const { count, error } = await supabase
        .from('webhooks')
        .select('id', { count: 'exact', head: true })
        .eq('clinic_id', clinicId);
      if (error) throw error;
      return `${count || 0} webhook(s) ativo(s) ou historico(s)`;
    },
  },
  {
    id: 'jobs',
    title: 'Tarefas agendadas',
    description: 'View operacional v_job_status',
    icon: Server,
    run: async () => {
      const { count, error } = await supabase
        .from('v_job_status')
        .select('id', { count: 'exact', head: true });
      if (error) throw error;
      return `${count || 0} job(s) monitorado(s)`;
    },
  },
  {
    id: 'alerts',
    title: 'Alertas financeiros',
    description: 'Configuracoes de alertas da clinica',
    icon: ShieldCheck,
    run: async ({ clinicId }) => {
      const { count, error } = await supabase
        .from('alert_configs')
        .select('id', { count: 'exact', head: true })
        .eq('clinic_id', clinicId);
      if (error) throw error;
      return `${count || 0} configuracao(oes) encontrada(s)`;
    },
  },
];

async function checkFunction(url, anonKey) {
  const response = await fetch(url, {
    method: 'OPTIONS',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return `CORS OK (${response.status})`;
}

function statusMeta(status) {
  if (status === 'success') {
    return {
      label: 'OK',
      badge: 'default',
      icon: CheckCircle2,
      iconClass: 'text-emerald-600',
      borderClass: 'border-emerald-200',
    };
  }

  if (status === 'error') {
    return {
      label: 'Falha',
      badge: 'destructive',
      icon: AlertCircle,
      iconClass: 'text-red-600',
      borderClass: 'border-red-200',
    };
  }

  if (status === 'running') {
    return {
      label: 'Verificando',
      badge: 'secondary',
      icon: RefreshCw,
      iconClass: 'text-blue-600 animate-spin',
      borderClass: 'border-blue-200',
    };
  }

  return {
    label: 'Pendente',
    badge: 'outline',
    icon: Clock,
    iconClass: 'text-slate-500',
    borderClass: 'border-slate-200',
  };
}

export default function SystemHealthPage() {
  const { clinicId, clinic, loadingClinic } = useClinicContext();
  const [results, setResults] = useState({});
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState(null);

  const context = useMemo(
    () => ({
      clinicId,
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
      anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    }),
    [clinicId],
  );

  const summary = useMemo(() => {
    const values = Object.values(results);
    const success = values.filter((item) => item.status === 'success').length;
    const errors = values.filter((item) => item.status === 'error').length;
    const completed = success + errors;
    const score = CHECKS.length ? Math.round((success / CHECKS.length) * 100) : 0;

    return { success, errors, completed, score };
  }, [results]);

  useEffect(() => {
    if (!loadingClinic && clinicId) {
      runChecks();
    }
  }, [loadingClinic, clinicId]);

  async function runChecks() {
    if (!clinicId) return;

    setRunning(true);
    setResults(
      CHECKS.reduce((acc, check) => {
        acc[check.id] = { status: 'running', message: 'Verificando...' };
        return acc;
      }, {}),
    );

    await Promise.all(
      CHECKS.map(async (check) => {
        try {
          const message = await withTimeout(check.run(context), 8000);
          setResults((prev) => ({
            ...prev,
            [check.id]: { status: 'success', message },
          }));
        } catch (error) {
          setResults((prev) => ({
            ...prev,
            [check.id]: { status: 'error', message: error.message || 'Erro desconhecido' },
          }));
        }
      }),
    );

    setLastRun(new Date());
    setRunning(false);
  }

  function withTimeout(promise, timeoutMs) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeoutMs)),
    ]);
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Activity className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-slate-900">Saude do Sistema</h1>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Monitor operacional para producao, automacoes e integracoes criticas.
          </p>
        </div>

        <Button onClick={runChecks} disabled={running || loadingClinic} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${running ? 'animate-spin' : ''}`} />
          Atualizar checks
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Clinica</CardDescription>
            <CardTitle className="text-xl">{clinic?.brand_name || clinic?.name || 'Carregando'}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Score operacional</CardDescription>
            <CardTitle className="text-xl">{summary.score}%</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={summary.score} className="h-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Checks OK</CardDescription>
            <CardTitle className="text-xl text-emerald-700">{summary.success}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Falhas</CardDescription>
            <CardTitle className="text-xl text-red-700">{summary.errors}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Checks de producao</CardTitle>
              <CardDescription>
                Validacoes leves e nao destrutivas. Ultima execucao:{' '}
                {lastRun ? lastRun.toLocaleString('pt-BR') : 'ainda nao executada'}.
              </CardDescription>
            </div>
            <Badge variant={summary.errors ? 'destructive' : 'default'}>
              {summary.errors ? 'Atencao necessaria' : 'Operacional'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {CHECKS.map((check) => {
              const result = results[check.id] || { status: 'idle', message: 'Aguardando verificacao' };
              const meta = statusMeta(result.status);
              const StatusIcon = meta.icon;
              const CheckIcon = check.icon;

              return (
                <div
                  key={check.id}
                  className={`rounded-lg border bg-white p-4 shadow-sm ${meta.borderClass}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex gap-3">
                      <div className="rounded-md bg-slate-100 p-2">
                        <CheckIcon className="h-5 w-5 text-slate-700" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{check.title}</h3>
                        <p className="text-sm text-slate-500">{check.description}</p>
                      </div>
                    </div>
                    <Badge variant={meta.badge}>{meta.label}</Badge>
                  </div>

                  <div className="mt-4 flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    <StatusIcon className={`h-4 w-4 ${meta.iconClass}`} />
                    <span>{result.message}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
