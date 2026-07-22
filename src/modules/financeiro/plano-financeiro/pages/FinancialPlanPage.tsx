import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, Banknote, CheckCircle2, FileText, Landmark, Layers3, ListTree, Loader2, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
import {
  applyHealthcareFinancialPlanTemplate,
  FinancialPlanAccount,
  FinancialPlanTreeNode,
  getFinancialPlanTree,
} from '../services/financialPlanApi';

const financialPlanSections = [
  {
    code: '01',
    title: 'Receitas operacionais',
    description: 'Entradas por origem gerencial, separando particular, convênios e outros pagadores.',
    groups: ['Particulares', 'Convênios', 'Empresas', 'SUS e prefeituras', 'Outras receitas assistenciais'],
  },
  {
    code: '02',
    title: 'Deduções da receita',
    description: 'Redutores do faturamento e do recebimento bruto.',
    groups: ['Glosas', 'Descontos comerciais', 'Cancelamentos', 'Taxas administrativas de convênios', 'Estornos'],
  },
  {
    code: '03',
    title: 'Despesas operacionais',
    description: 'Gastos diretamente ligados à operação assistencial da clínica.',
    groups: ['Medicamentos', 'Materiais e insumos', 'Serviços de terceiros', 'Benefícios', 'Documentos fiscais', 'Manutenção assistencial'],
  },
  {
    code: '04',
    title: 'Despesas administrativas',
    description: 'Estrutura de apoio, administração, tecnologia e serviços recorrentes.',
    groups: ['Folha administrativa', 'Aluguel e condomínio', 'Tecnologia', 'Contabilidade e jurídico', 'Marketing', 'Telefonia e internet'],
  },
  {
    code: '05',
    title: 'Despesas financeiras',
    description: 'Custos bancários, juros, multas, antecipações e tarifas.',
    groups: ['Tarifas bancárias', 'Juros e multas', 'Antecipação de recebíveis', 'IOF', 'Descontos financeiros'],
  },
  {
    code: '06',
    title: 'Impostos',
    description: 'Tributos incidentes sobre operação, folha e resultado.',
    groups: ['ISS', 'PIS', 'COFINS', 'IRPJ', 'CSLL', 'INSS e FGTS'],
  },
  {
    code: '07',
    title: 'Repasses médicos',
    description: 'Produção, honorários, plantões e valores a repassar para profissionais.',
    groups: ['Produção médica', 'Honorários', 'Plantões', 'Comissões', 'Retenções de repasse'],
  },
  {
    code: '08',
    title: 'Investimentos',
    description: 'Compras e melhorias que aumentam capacidade ou patrimônio operacional.',
    groups: ['Equipamentos médicos', 'Mobiliário', 'Obras e reformas', 'Tecnologia', 'Implantações'],
  },
  {
    code: '09',
    title: 'Distribuição de resultados',
    description: 'Movimentos societários e destinação do resultado.',
    groups: ['Pró-labore', 'Distribuição de lucros', 'Retiradas de sócios', 'Reservas'],
  },
];

const comparisonRows = [
  ['Plano Contábil', 'Formal e fiscal', 'DRE, escrituração, contabilidade, natureza contábil'],
  ['Plano Financeiro', 'Gerencial e operacional', 'Fluxo de caixa, contas a pagar/receber, análise de caixa'],
  ['Contas Financeiras', 'Meios de movimentação', 'Banco, caixa, cartão, carteira digital, conciliação'],
];

function flattenPlan(nodes: FinancialPlanTreeNode[]): FinancialPlanAccount[] {
  return nodes.flatMap((node) => [node, ...flattenPlan(node.children || [])]);
}

function countEntryAccounts(nodes: FinancialPlanTreeNode[]) {
  return flattenPlan(nodes).filter((account) => account.accepts_entries).length;
}

function TreeNode({ node }: { node: FinancialPlanTreeNode }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-slate-950">{node.code} - {node.name}</p>
          {node.description ? <p className="mt-1 text-xs text-slate-500">{node.description}</p> : null}
        </div>
        <Badge variant={node.accepts_entries ? 'default' : 'outline'} className="rounded-md">
          {node.accepts_entries ? 'Aceita lançamento' : 'Grupo'}
        </Badge>
      </div>
      {node.children?.length ? (
        <div className="mt-2 space-y-2 border-l border-slate-200 pl-3">
          {node.children.map((child) => <TreeNode key={child.id} node={child} />)}
        </div>
      ) : null}
    </div>
  );
}

export const FinancialPlanPage: React.FC = () => {
  const { user } = useAuth();
  const { clinicId } = useClinicContext();
  const [tree, setTree] = useState<FinancialPlanTreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');

  const totalAccounts = useMemo(() => flattenPlan(tree).length, [tree]);
  const entryAccounts = useMemo(() => countEntryAccounts(tree), [tree]);

  const loadPlan = async () => {
    if (!clinicId) return;
    setLoading(true);
    setError('');
    try {
      setTree(await getFinancialPlanTree(clinicId));
    } catch (err: any) {
      setError(err?.message || 'Nao foi possivel carregar o plano financeiro.');
      setTree([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlan();
  }, [clinicId]);

  const applyTemplate = async () => {
    if (!clinicId || !user?.id) return;
    setApplying(true);
    setError('');
    try {
      const rows = await applyHealthcareFinancialPlanTemplate(clinicId, user.id);
      const nodes = await getFinancialPlanTree(clinicId);
      setTree(nodes);
      if (!rows.length) setError('Modelo aplicado, mas nenhuma conta retornou da consulta.');
    } catch (err: any) {
      setError(err?.message || 'Nao foi possivel aplicar o modelo de saúde.');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-blue-50 p-2 text-blue-700">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Gestão financeira para saúde</p>
                <h1 className="text-2xl font-bold text-slate-950">Plano Financeiro Gerencial</h1>
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Estrutura gerencial para classificar entradas, saídas, repasses, impostos e investimentos no fluxo de caixa da clínica. Ele não substitui o plano contábil: organiza a leitura operacional do caixa.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={applyTemplate} disabled={!clinicId || !user?.id || applying} size="sm">
              {applying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Aplicar modelo para saúde
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/clinica/financeiro/plano-contas">
                Plano Contábil
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/clinica/financeiro/contas-financeiras">
                Contas Financeiras
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {error ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div>
              <p className="font-bold">Ação necessária</p>
              <p className="mt-1 leading-6">{error}</p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid gap-3 md:grid-cols-3">
        {comparisonRows.map(([title, purpose, usage]) => (
          <div key={title} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              {title === 'Plano Contábil' ? <FileText className="h-4 w-4 text-slate-600" /> : title === 'Plano Financeiro' ? <ListTree className="h-4 w-4 text-blue-700" /> : <Landmark className="h-4 w-4 text-emerald-700" />}
              <h2 className="text-sm font-bold text-slate-950">{title}</h2>
            </div>
            <p className="text-xs font-semibold uppercase text-slate-500">{purpose}</p>
            <p className="mt-2 text-sm leading-5 text-slate-600">{usage}</p>
          </div>
        ))}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Modelo recomendado para clínicas</h2>
            <p className="text-sm text-slate-600">Use esta árvore como referência para classificar o fluxo operacional.</p>
          </div>
          <Badge variant="outline" className="rounded-md">Modelo gerencial</Badge>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          {financialPlanSections.map((section) => (
            <article key={section.code} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-900 text-xs font-bold text-white">{section.code}</span>
                <div>
                  <h3 className="text-sm font-bold text-slate-950">{section.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{section.description}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {section.groups.map((group) => (
                  <span key={group} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700">{group}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Plano aplicado na clínica</h2>
            <p className="text-sm text-slate-600">Estrutura persistida que será usada nas classificações financeiras.</p>
          </div>
          <div className="flex gap-2 text-xs font-semibold">
            <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-slate-700">{totalAccounts} contas</span>
            <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-800">{entryAccounts} aceitam lançamento</span>
          </div>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando plano financeiro...
          </div>
        ) : tree.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {tree.map((node) => <TreeNode key={node.id} node={node} />)}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
            Nenhum plano financeiro aplicado ainda. Use o botão <strong>Aplicar modelo para saúde</strong> para criar a estrutura inicial da clínica.
          </div>
        )}
      </section>

      <section className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-950">
        <div className="flex items-start gap-3">
          <Layers3 className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
          <div>
            <p className="font-bold">Regra de organização</p>
            <p className="mt-1 leading-6">
              O plano financeiro classifica o movimento. A conta financeira informa onde o dinheiro entrou ou saiu. O plano contábil mantém a leitura formal para DRE e contabilidade.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Banknote className="h-5 w-5 text-emerald-700" />
          <h2 className="text-lg font-bold text-slate-950">Aplicação prática no financeiro</h2>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="text-sm font-bold text-slate-950">Contas a Receber</p>
            <p className="mt-1 text-sm text-slate-600">Classifique por Particular, Convênios, Empresas e origem do atendimento.</p>
          </div>
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="text-sm font-bold text-slate-950">Contas a Pagar</p>
            <p className="mt-1 text-sm text-slate-600">Classifique por despesa operacional, administrativa, financeira, impostos, repasses e investimentos.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FinancialPlanPage;
