import React from 'react';
import { Activity, CheckCircle2, Clock3, FileArchive, Landmark, PlugZap, RefreshCcw, ShieldCheck, UploadCloud } from 'lucide-react';
import PageLayout from '@/components/ui/PageLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';

const integrations = [
  {
    title: 'Prefeitura / NFS-e Municipal',
    description: 'Transmissao, consulta, cancelamento e retorno de protocolo municipal.',
    status: 'Configuracao fiscal ativa',
    icon: Landmark,
    tone: 'emerald',
  },
  {
    title: 'NF Nacional',
    description: 'Preparacao para emissao nacional, ambientes de homologacao/producao e padroes federais.',
    status: 'Preparado para credenciais',
    icon: ShieldCheck,
    tone: 'blue',
  },
  {
    title: 'XML/PDF/DANFSE',
    description: 'Geracao, armazenamento, download e reenvio dos documentos fiscais.',
    status: 'Operacional no Centro Fiscal',
    icon: FileArchive,
    tone: 'amber',
  },
  {
    title: 'Contabilidade / SPED / SIEG',
    description: 'Fila de envio contabil, exportacoes e integracao com escritorio contabil.',
    status: 'Fila fiscal estruturada',
    icon: UploadCloud,
    tone: 'slate',
  },
];

const checks = [
  'Certificado digital da clinica',
  'Inscricao municipal e regime tributario',
  'Codigo municipal de servico e NBS',
  'Ambiente fiscal homologacao/producao',
  'Webhook de retorno da prefeitura',
  'Fila de reprocessamento e auditoria',
];

const fiscalParameters = [
  { label: 'Ambiente fiscal', value: 'Homologacao', source: 'Centro Fiscal' },
  { label: 'Provedor municipal', value: 'ABRASF / Prefeitura', source: 'Integracao NFS-e' },
  { label: 'Serie RPS', value: 'Padrao da clinica', source: 'Configuracao fiscal' },
  { label: 'ISS retido', value: 'Conforme servico/tomador', source: 'Motor tributario' },
  { label: 'Exportacao contabil', value: 'XML, PDF, SPED e SIEG', source: 'Fila contabil' },
  { label: 'Reprocessamento', value: 'Auditoria e logs ativos', source: 'Centro Fiscal' },
];

const toneClasses = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  slate: 'bg-slate-50 text-slate-700 border-slate-200',
};

export default function IntegracoesFiscais() {
  const breadcrumbs = useBreadcrumbs([
    { label: 'Clínica', path: '/clinica' },
    { label: 'Faturamento', path: '/clinica/faturamento' },
    { label: 'Integrações Fiscais' },
  ]);

  return (
    <PageLayout
      title="Integrações Fiscais"
      subtitle="Monitore provedores fiscais, documentos, protocolos e filas de envio do Centro Fiscal."
      breadcrumbs={breadcrumbs}
      actions={
        <div className="flex gap-2">
          <Button
            variant="outline"
            type="button"
            onClick={() => document.getElementById('parametros-fiscais')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            <PlugZap className="mr-2 h-4 w-4" />
            Configurar parametros
          </Button>
          <Button variant="outline">
            <RefreshCcw className="mr-2 h-4 w-4" />
            Sincronizar
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Card className="border-blue-100 bg-blue-50/50">
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-blue-700">Painel operacional fiscal</p>
                <CardTitle className="mt-1">Integracoes conectadas ao Centro Fiscal</CardTitle>
              </div>
              <Badge variant="outline" className="w-fit border-emerald-200 bg-emerald-50 text-emerald-700">
                <Activity className="mr-1 h-3 w-3" />
                Monitoramento ativo
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border bg-white p-4">
              <p className="text-sm text-slate-500">Ambiente</p>
              <p className="mt-1 text-xl font-semibold">Homologacao</p>
            </div>
            <div className="rounded-lg border bg-white p-4">
              <p className="text-sm text-slate-500">Fila fiscal</p>
              <p className="mt-1 text-xl font-semibold">Sem pendencias criticas</p>
            </div>
            <div className="rounded-lg border bg-white p-4">
              <p className="text-sm text-slate-500">Ultima sincronizacao</p>
              <p className="mt-1 text-xl font-semibold">Aguardando provedor</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          {integrations.map((integration) => {
            const Icon = integration.icon;
            return (
              <Card key={integration.title}>
                <CardHeader className="flex-row items-start gap-3 space-y-0">
                  <div className={`rounded-lg border p-2 ${toneClasses[integration.tone]}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base">{integration.title}</CardTitle>
                    <p className="mt-1 text-sm text-slate-500">{integration.description}</p>
                  </div>
                  <Badge variant="outline" className={toneClasses[integration.tone]}>{integration.status}</Badge>
                </CardHeader>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle>Checklist de Integracao</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {checks.map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-lg border p-3 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fila de Eventos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex gap-3 rounded-lg border p-3">
                <Clock3 className="mt-0.5 h-4 w-4 text-slate-500" />
                <div>
                  <p className="font-medium">Aguardando emissao fiscal</p>
                  <p className="text-slate-500">Eventos serao registrados apos transmissao, cancelamento ou consulta.</p>
                </div>
              </div>
              <div className="flex gap-3 rounded-lg border p-3">
                <UploadCloud className="mt-0.5 h-4 w-4 text-slate-500" />
                <div>
                  <p className="font-medium">Contabilidade preparada</p>
                  <p className="text-slate-500">XML/PDF/SPED/SIEG saem desta area operacional, nao das configuracoes gerais.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card id="parametros-fiscais">
          <CardHeader>
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-blue-700">Parametros fiscais</p>
                <CardTitle>Configuracao operacional das integracoes</CardTitle>
              </div>
              <Badge variant="outline" className="w-fit border-blue-200 bg-blue-50 text-blue-700">
                Dentro de Faturamento
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {fiscalParameters.map((parameter) => (
              <div key={parameter.label} className="rounded-lg border p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">{parameter.label}</p>
                <p className="mt-2 font-semibold text-slate-900">{parameter.value}</p>
                <p className="mt-1 text-xs text-slate-500">Origem: {parameter.source}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
