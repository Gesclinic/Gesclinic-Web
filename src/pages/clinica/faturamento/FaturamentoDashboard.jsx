import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CreditCard,
  FileCheck2,
  FileText,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { loadFaturamentoOperationalData, subscribeFaturamentoRealtime } from '@/lib/faturamentoOperationalApi';

function currency(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function percent(value, total) {
  if (!total) return '0,0%';
  return `${((Number(value || 0) / Number(total || 1)) * 100).toFixed(1).replace('.', ',')}%`;
}

function percentNumber(value) {
  return `${Number(value || 0).toFixed(1).replace('.', ',')}%`;
}

function MetricCard({ label, value, hint, icon: Icon }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="mt-1 text-xl font-semibold text-foreground">{value}</p>
            {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
          </div>
          {Icon && <Icon className="h-5 w-5 text-slate-500" />}
        </div>
      </CardContent>
    </Card>
  );
}

function RankingTable({ title, rows, emptyText = 'Nenhum registro encontrado.' }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Nome</th>
                <th className="px-3 py-2 text-right font-medium">Qtd.</th>
                <th className="px-3 py-2 text-right font-medium">Valor</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan="3" className="px-3 py-6 text-center text-muted-foreground">
                    {emptyText}
                  </td>
                </tr>
              )}
              {rows.slice(0, 8).map((row) => (
                <tr key={`${row.label}-${row.value}`} className="border-t">
                  <td className="px-3 py-2">{row.label}</td>
                  <td className="px-3 py-2 text-right font-mono">{row.count}</td>
                  <td className="px-3 py-2 text-right font-mono">{currency(row.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusGrid({ rows }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((row) => (
        <Card key={row.status}>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-foreground">{row.label}</p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <p className="text-2xl font-semibold">{row.count}</p>
              <p className="text-sm font-mono text-muted-foreground">{currency(row.value)}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AuditList({ title, rows, getText }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {rows.length === 0 && <p className="text-sm text-muted-foreground">Sem pendencias.</p>}
          {rows.slice(0, 8).map((row, index) => (
            <div key={row.id || `${title}-${index}`} className="rounded-md border p-3 text-sm">
              {getText(row)}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function FaturamentoDashboard() {
  const { clinicId } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  const loadDashboard = async () => {
    if (!clinicId) return;
    setLoading(true);
    try {
      setData(await loadFaturamentoOperationalData(clinicId));
    } catch (error) {
      toast({ title: 'Erro ao carregar faturamento', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [clinicId]);

  useEffect(() => {
    if (!clinicId) return undefined;
    return subscribeFaturamentoRealtime(clinicId, () => {
      loadDashboard();
    });
  }, [clinicId]);

  const snapshot = data?.snapshot;
  const kpis = snapshot?.kpis || {};
  const audit = snapshot?.audit || {};
  const glosas = snapshot?.glosas || {};

  const auditTotal = useMemo(() => {
    return [
      audit.proceduresWithoutTuss,
      audit.invalidGuides,
      audit.doctorsWithoutRepasse,
      audit.inconsistentBilling,
      audit.divergentRevenue,
    ].reduce((sum, rows) => sum + (rows?.length || 0), 0);
  }, [audit]);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Faturamento Operacional</h1>
          <p className="text-sm text-muted-foreground">
            Produz guias, recebiveis e indicadores para o Financeiro consumir em Receber, Fluxo, DRE e Cockpit.
          </p>
        </div>
        <Button variant="outline" onClick={loadDashboard} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Receita prevista" value={currency(kpis.expectedRevenue)} hint="Guias e recebiveis" icon={BarChart3} />
        <MetricCard label="Receita faturada" value={currency(kpis.billedRevenue)} hint="ar_invoices faturadas" icon={FileText} />
        <MetricCard label="Receita recebida" value={currency(kpis.receivedRevenue)} hint={percent(kpis.receivedRevenue, kpis.expectedRevenue)} icon={FileCheck2} />
        <MetricCard label="Receita glosada" value={currency(kpis.glosaValue)} hint={percentNumber(kpis.glosaRate)} icon={AlertTriangle} />
        <MetricCard label="Receita recuperada" value={currency(kpis.recoveredValue)} hint={percentNumber(kpis.recoveryRate)} icon={RefreshCw} />
        <MetricCard label="Ticket medio" value={currency(kpis.averageTicket)} hint={`${kpis.receivables || 0} recebiveis`} icon={CreditCard} />
        <MetricCard label="Prazo medio recebimento" value={`${Number(kpis.averageReceiptDays || 0).toFixed(0)} dias`} hint="invoice_date ate recebimento" icon={FileCheck2} />
        <MetricCard label="Margem operacional" value={percentNumber(kpis.operatingMargin)} hint="recebido + recuperado - glosa" icon={BarChart3} />
        <MetricCard label="Auditorias abertas" value={auditTotal || 0} hint="TUSS, guias, repasse e divergencias" icon={AlertTriangle} />
      </div>

      <Tabs defaultValue="producao" className="space-y-4">
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="producao">Producao</TabsTrigger>
          <TabsTrigger value="faturaveis">Atendimentos</TabsTrigger>
          <TabsTrigger value="particular">Particular</TabsTrigger>
          <TabsTrigger value="convenios">Convenios</TabsTrigger>
          <TabsTrigger value="glosas">Glosas</TabsTrigger>
          <TabsTrigger value="auditoria">Auditoria</TabsTrigger>
          <TabsTrigger value="relatorios">Relatorios</TabsTrigger>
        </TabsList>

        <TabsContent value="producao" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <RankingTable title="Producao por medico" rows={snapshot?.production?.byDoctor || []} />
            <RankingTable title="Producao por especialidade" rows={snapshot?.production?.bySpecialty || []} />
            <RankingTable title="Producao por unidade" rows={snapshot?.production?.byUnit || []} />
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <RankingTable title="Ranking convenios" rows={snapshot?.production?.byPayer || []} />
            <RankingTable title="Ranking medicos" rows={snapshot?.production?.byDoctor || []} />
          </div>
        </TabsContent>

        <TabsContent value="faturaveis" className="space-y-4">
          <StatusGrid rows={snapshot?.billableStatus || []} />
        </TabsContent>

        <TabsContent value="particular" className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <MetricCard label="Particular previsto" value={currency(snapshot?.particular?.total)} icon={CreditCard} />
            <MetricCard label="Recebido" value={currency(snapshot?.particular?.received)} />
            <MetricCard label="PIX" value={snapshot?.particular?.pix || 0} />
            <MetricCard label="Cartao" value={snapshot?.particular?.card || 0} />
            <MetricCard label="Boleto/Link" value={(snapshot?.particular?.boleto || 0) + (snapshot?.particular?.link || 0)} />
          </div>
          <p className="text-sm text-muted-foreground">
            A geracao automatica de recebivel usa Contas a Receber existente via ar_invoices.
          </p>
        </TabsContent>

        <TabsContent value="convenios" className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <MetricCard label="Operadoras" value={snapshot?.convenio?.byPayer?.length || 0} icon={Building2} />
            <MetricCard label="Guias pendentes" value={snapshot?.convenio?.pendingGuides || 0} />
            <MetricCard label="Guias faturadas" value={snapshot?.convenio?.billedGuides || 0} />
            <MetricCard label="Guias recebidas" value={snapshot?.convenio?.receivedGuides || 0} />
            <MetricCard label="Guias glosadas" value={snapshot?.convenio?.glossedGuides || 0} />
          </div>
          <RankingTable title="Gestao por operadora" rows={snapshot?.convenio?.byPayer || []} />
        </TabsContent>

        <TabsContent value="glosas" className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <MetricCard label="Valor glosado" value={currency(kpis.glosaValue)} icon={AlertTriangle} />
            <MetricCard label="Tecnicas" value={glosas.technical || 0} />
            <MetricCard label="Administrativas" value={glosas.administrative || 0} />
            <MetricCard label="Financeiras" value={glosas.financial || 0} />
            <MetricCard label="Recursos/Reenvios" value={(glosas.resources || 0) + (glosas.reenvios || 0)} />
          </div>
          <RankingTable
            title="Glosas recentes"
            rows={(glosas.rows || []).map((row) => ({
              label: row.reason || row.glosa_type || 'Glosa',
              count: 1,
              value: row.glosa_amount,
            }))}
          />
        </TabsContent>

        <TabsContent value="auditoria" className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <AuditList title="Procedimentos sem TUSS" rows={audit.proceduresWithoutTuss || []} getText={(row) => row.description || row.procedure_name || row.service_description || 'Procedimento sem codigo'} />
          <AuditList title="Guias invalidas" rows={audit.invalidGuides || []} getText={(row) => `${row.numero_guia || row.id} - ${row.paciente_nome || 'Paciente nao informado'}`} />
          <AuditList title="Medicos sem repasse" rows={audit.doctorsWithoutRepasse || []} getText={(row) => row.description || row.professional_id || 'Recebivel sem regra de repasse'} />
          <AuditList title="Faturamento inconsistente" rows={audit.inconsistentBilling || []} getText={(row) => `${row.numero_guia || row.id} sem recebivel vinculado`} />
          <AuditList title="Receitas divergentes" rows={audit.divergentRevenue || []} getText={(row) => `${row.numero_guia || row.id} - ${currency(row.valor)}`} />
          <AuditList title="Alertas anti-glosa" rows={audit.antiGlosaAlerts || []} getText={(row) => `${row.code} - ${row.message}`} />
        </TabsContent>

        <TabsContent value="relatorios" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <RankingTable title="Receitas por pagador" rows={snapshot?.production?.byPayer || []} />
            <RankingTable title="Producao medica" rows={snapshot?.production?.byDoctor || []} />
          </div>
          <Card>
            <CardContent className="flex items-start gap-3 p-4 text-sm text-muted-foreground">
              <FileText className="mt-0.5 h-4 w-4" />
              Relatorios detalhados e exportacao seguem no submenu Relatorios, consumindo os mesmos recebiveis, guias, XML e glosas.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {loading && !data && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando estrutura de faturamento...
        </div>
      )}
    </div>
  );
}
