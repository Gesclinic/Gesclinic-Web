import React, { useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  Bell,
  Clock,
  DatabaseZap,
  LineChart,
  Play,
  RefreshCw,
  Wifi,
} from 'lucide-react';
import { useClinicContext } from '@/contexts/ClinicContext';
import RealtimeLatencyMonitor from '@/lib/RealtimeLatencyMonitor';
import RealtimeDashboard from '@/components/RealtimeDashboard';
import LatencyChartsComponent from '@/components/LatencyChartsComponent';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function formatTime(date) {
  if (!date) return '-';
  return date.toLocaleTimeString('pt-BR');
}

function getLatencyStatus(avg) {
  if (!avg) return { label: 'Sem amostras', className: 'bg-slate-100 text-slate-700' };
  if (avg < 100) return { label: 'Excelente', className: 'bg-emerald-100 text-emerald-800' };
  if (avg < 500) return { label: 'Estavel', className: 'bg-amber-100 text-amber-800' };
  return { label: 'Atencao', className: 'bg-red-100 text-red-800' };
}

export default function OperationalAnalyticsPage() {
  const { clinicId, clinic, loadingClinic } = useClinicContext();
  const [stats, setStats] = useState(() => RealtimeLatencyMonitor.getStats());
  const [lastSampleAt, setLastSampleAt] = useState(null);

  const browserSignals = useMemo(
    () => [
      {
        label: 'Conexao do navegador',
        value: navigator.onLine ? 'Online' : 'Offline',
        healthy: navigator.onLine,
        icon: Wifi,
      },
      {
        label: 'Notificacoes',
        value: 'Notification' in window ? Notification.permission : 'Nao suportado',
        healthy: !('Notification' in window) || Notification.permission !== 'denied',
        icon: Bell,
      },
      {
        label: 'Clinica resolvida',
        value: loadingClinic ? 'Carregando' : clinicId ? 'Disponivel' : 'Ausente',
        healthy: Boolean(clinicId),
        icon: DatabaseZap,
      },
    ],
    [clinicId, loadingClinic],
  );

  const latencyStatus = getLatencyStatus(stats.avg);

  function refreshStats() {
    setStats(RealtimeLatencyMonitor.getStats());
  }

  function createLocalSample() {
    const startedAt = performance.now();
    requestAnimationFrame(() => {
      const latency = performance.now() - startedAt;
      RealtimeLatencyMonitor.recordMeasurement({
        table: 'client_runtime',
        eventType: 'manual_sample',
        latency,
        recordId: `sample-${Date.now()}`,
      });
      setLastSampleAt(new Date());
      refreshStats();
    });
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-slate-900">Analytics Operacional</h1>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Acompanhamento de performance, sinais do navegador e latencia de eventos em tempo real.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={refreshStats} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
          <Button onClick={createLocalSample} className="gap-2">
            <Play className="h-4 w-4" />
            Gerar amostra local
          </Button>
        </div>
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
            <CardDescription>Amostras</CardDescription>
            <CardTitle className="text-xl">{stats.count || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Latencia media</CardDescription>
            <CardTitle className="text-xl">{Number(stats.avg || 0).toFixed(2)}ms</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={latencyStatus.className}>{latencyStatus.label}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ultima amostra</CardDescription>
            <CardTitle className="text-xl">{formatTime(lastSampleAt)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {browserSignals.map((signal) => {
          const Icon = signal.icon;
          return (
            <Card key={signal.label} className={signal.healthy ? 'border-emerald-200' : 'border-red-200'}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardDescription>{signal.label}</CardDescription>
                    <CardTitle className="text-lg">{signal.value}</CardTitle>
                  </div>
                  <Icon className={signal.healthy ? 'h-6 w-6 text-emerald-600' : 'h-6 w-6 text-red-600'} />
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="realtime" className="space-y-4">
        <TabsList>
          <TabsTrigger value="realtime" className="gap-2">
            <Activity className="h-4 w-4" />
            Tempo real
          </TabsTrigger>
          <TabsTrigger value="charts" className="gap-2">
            <LineChart className="h-4 w-4" />
            Graficos
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-2">
            <Clock className="h-4 w-4" />
            Operacao
          </TabsTrigger>
        </TabsList>

        <TabsContent value="realtime">
          <Card>
            <CardHeader>
              <CardTitle>Monitor de latencia</CardTitle>
              <CardDescription>
                Estatisticas de eventos coletadas no cliente. Use a amostra local para validar renderizacao e coleta.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RealtimeDashboard refreshInterval={2000} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="charts">
          <LatencyChartsComponent />
        </TabsContent>

        <TabsContent value="notes">
          <Card>
            <CardHeader>
              <CardTitle>Leitura operacional</CardTitle>
              <CardDescription>Como interpretar esta tela durante uso em producao.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 text-sm text-slate-700 lg:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <h3 className="font-semibold text-slate-900">Latencia</h3>
                <p className="mt-2">Acompanhe media, P95 e P99 para detectar degradacao em eventos do navegador e realtime.</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <h3 className="font-semibold text-slate-900">Sinais locais</h3>
                <p className="mt-2">Conexao, notificacoes e clinica resolvida ajudam a separar problema local de problema de backend.</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <h3 className="font-semibold text-slate-900">Proxima evolucao</h3>
                <p className="mt-2">Conectar subscriptions Supabase por tabela critica para medir latencia real de alertas e notificacoes.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
