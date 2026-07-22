import { supabase } from '@/lib/customSupabaseClient';

export type FinancialPlanAccountType =
  | 'REVENUE'
  | 'DEDUCTION'
  | 'EXPENSE'
  | 'FINANCIAL_EXPENSE'
  | 'TAX'
  | 'MEDICAL_TRANSFER'
  | 'INVESTMENT'
  | 'DISTRIBUTION';

export type FinancialPlanAccountNature = 'INFLOW' | 'OUTFLOW';

export interface FinancialPlanAccount {
  id: string;
  clinic_id: string;
  parent_id: string | null;
  chart_account_id: string | null;
  code: string;
  name: string;
  description: string | null;
  section_key: string;
  type: FinancialPlanAccountType;
  nature: FinancialPlanAccountNature;
  level: number;
  sort_order: number;
  accepts_entries: boolean;
  is_active: boolean;
  is_system_template: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinancialPlanTreeNode extends FinancialPlanAccount {
  children: FinancialPlanTreeNode[];
}

interface FinancialPlanTemplateRow {
  code: string;
  name: string;
  description: string;
  section_key: string;
  type: FinancialPlanAccountType;
  nature: FinancialPlanAccountNature;
  accepts_entries: boolean;
}

export const HEALTHCARE_FINANCIAL_PLAN_TEMPLATE: FinancialPlanTemplateRow[] = [
  { code: '01', name: 'Receitas operacionais', description: 'Entradas por origem gerencial de receita.', section_key: 'revenue', type: 'REVENUE', nature: 'INFLOW', accepts_entries: false },
  { code: '01.01', name: 'Particulares', description: 'Receitas de pacientes particulares.', section_key: 'revenue', type: 'REVENUE', nature: 'INFLOW', accepts_entries: false },
  { code: '01.01.01', name: 'Consultas particulares', description: 'Consultas pagas diretamente pelo paciente.', section_key: 'revenue', type: 'REVENUE', nature: 'INFLOW', accepts_entries: true },
  { code: '01.01.02', name: 'Exames particulares', description: 'Exames pagos diretamente pelo paciente.', section_key: 'revenue', type: 'REVENUE', nature: 'INFLOW', accepts_entries: true },
  { code: '01.01.03', name: 'Procedimentos particulares', description: 'Procedimentos pagos diretamente pelo paciente.', section_key: 'revenue', type: 'REVENUE', nature: 'INFLOW', accepts_entries: true },
  { code: '01.02', name: 'Convênios', description: 'Receitas faturadas para operadoras e convênios.', section_key: 'revenue', type: 'REVENUE', nature: 'INFLOW', accepts_entries: false },
  { code: '01.02.01', name: 'Guias de consultas', description: 'Receitas de consultas por convênio.', section_key: 'revenue', type: 'REVENUE', nature: 'INFLOW', accepts_entries: true },
  { code: '01.02.02', name: 'Guias de exames', description: 'Receitas de exames por convênio.', section_key: 'revenue', type: 'REVENUE', nature: 'INFLOW', accepts_entries: true },
  { code: '01.02.03', name: 'Guias de procedimentos', description: 'Receitas de procedimentos por convênio.', section_key: 'revenue', type: 'REVENUE', nature: 'INFLOW', accepts_entries: true },
  { code: '01.03', name: 'Empresas', description: 'Receitas corporativas, ocupacionais e contratos.', section_key: 'revenue', type: 'REVENUE', nature: 'INFLOW', accepts_entries: true },
  { code: '01.04', name: 'SUS e prefeituras', description: 'Receitas públicas e municipais.', section_key: 'revenue', type: 'REVENUE', nature: 'INFLOW', accepts_entries: true },
  { code: '02', name: 'Deduções da receita', description: 'Redutores do faturamento e recebimento bruto.', section_key: 'deductions', type: 'DEDUCTION', nature: 'OUTFLOW', accepts_entries: false },
  { code: '02.01', name: 'Glosas', description: 'Glosas aceitas ou em recuperação.', section_key: 'deductions', type: 'DEDUCTION', nature: 'OUTFLOW', accepts_entries: true },
  { code: '02.02', name: 'Descontos comerciais', description: 'Descontos concedidos em atendimentos ou contratos.', section_key: 'deductions', type: 'DEDUCTION', nature: 'OUTFLOW', accepts_entries: true },
  { code: '02.03', name: 'Cancelamentos e estornos', description: 'Cancelamentos, devoluções e estornos de receita.', section_key: 'deductions', type: 'DEDUCTION', nature: 'OUTFLOW', accepts_entries: true },
  { code: '03', name: 'Despesas operacionais', description: 'Gastos diretamente ligados à rotina assistencial.', section_key: 'operational-expenses', type: 'EXPENSE', nature: 'OUTFLOW', accepts_entries: false },
  { code: '03.01', name: 'Medicamentos', description: 'Compra de medicamentos e fármacos.', section_key: 'operational-expenses', type: 'EXPENSE', nature: 'OUTFLOW', accepts_entries: true },
  { code: '03.02', name: 'Materiais e insumos', description: 'Materiais assistenciais, descartáveis e insumos.', section_key: 'operational-expenses', type: 'EXPENSE', nature: 'OUTFLOW', accepts_entries: true },
  { code: '03.03', name: 'Serviços de terceiros', description: 'Serviços assistenciais terceirizados e apoio operacional.', section_key: 'operational-expenses', type: 'EXPENSE', nature: 'OUTFLOW', accepts_entries: true },
  { code: '03.04', name: 'Benefícios', description: 'Benefícios operacionais vinculados à equipe.', section_key: 'operational-expenses', type: 'EXPENSE', nature: 'OUTFLOW', accepts_entries: true },
  { code: '03.05', name: 'Manutenção assistencial', description: 'Manutenção de equipamentos e estrutura assistencial.', section_key: 'operational-expenses', type: 'EXPENSE', nature: 'OUTFLOW', accepts_entries: true },
  { code: '03.06', name: 'Documentos fiscais', description: 'Notas, documentos fiscais e custos operacionais de emissão ou regularização.', section_key: 'operational-expenses', type: 'EXPENSE', nature: 'OUTFLOW', accepts_entries: true },
  { code: '04', name: 'Despesas administrativas', description: 'Estrutura administrativa e suporte.', section_key: 'administrative-expenses', type: 'EXPENSE', nature: 'OUTFLOW', accepts_entries: false },
  { code: '04.01', name: 'Folha administrativa', description: 'Salários, encargos e benefícios administrativos.', section_key: 'administrative-expenses', type: 'EXPENSE', nature: 'OUTFLOW', accepts_entries: true },
  { code: '04.02', name: 'Aluguel e condomínio', description: 'Ocupação, aluguel, condomínio e IPTU.', section_key: 'administrative-expenses', type: 'EXPENSE', nature: 'OUTFLOW', accepts_entries: true },
  { code: '04.03', name: 'Tecnologia', description: 'Sistemas, internet, licenças e suporte técnico.', section_key: 'administrative-expenses', type: 'EXPENSE', nature: 'OUTFLOW', accepts_entries: true },
  { code: '04.04', name: 'Contabilidade e jurídico', description: 'Serviços contábeis, fiscais e jurídicos.', section_key: 'administrative-expenses', type: 'EXPENSE', nature: 'OUTFLOW', accepts_entries: true },
  { code: '04.05', name: 'Marketing', description: 'Marketing, comunicação e captação.', section_key: 'administrative-expenses', type: 'EXPENSE', nature: 'OUTFLOW', accepts_entries: true },
  { code: '04.06', name: 'Consultorias', description: 'Consultorias administrativas, gestão, processos e assessorias.', section_key: 'administrative-expenses', type: 'EXPENSE', nature: 'OUTFLOW', accepts_entries: true },
  { code: '05', name: 'Despesas financeiras', description: 'Custos financeiros e bancários.', section_key: 'financial-expenses', type: 'FINANCIAL_EXPENSE', nature: 'OUTFLOW', accepts_entries: false },
  { code: '05.01', name: 'Tarifas bancárias', description: 'Tarifas de conta, TED, PIX, boletos e serviços bancários.', section_key: 'financial-expenses', type: 'FINANCIAL_EXPENSE', nature: 'OUTFLOW', accepts_entries: true },
  { code: '05.02', name: 'Juros e multas', description: 'Juros, multas e encargos por atraso.', section_key: 'financial-expenses', type: 'FINANCIAL_EXPENSE', nature: 'OUTFLOW', accepts_entries: true },
  { code: '05.03', name: 'Antecipação de recebíveis', description: 'Custos de antecipação de cartão ou recebíveis.', section_key: 'financial-expenses', type: 'FINANCIAL_EXPENSE', nature: 'OUTFLOW', accepts_entries: true },
  { code: '05.04', name: 'IOF', description: 'Imposto sobre operações financeiras.', section_key: 'financial-expenses', type: 'FINANCIAL_EXPENSE', nature: 'OUTFLOW', accepts_entries: true },
  { code: '05.05', name: 'Descontos financeiros', description: 'Descontos financeiros, abatimentos e ajustes bancários.', section_key: 'financial-expenses', type: 'FINANCIAL_EXPENSE', nature: 'OUTFLOW', accepts_entries: true },
  { code: '06', name: 'Impostos', description: 'Tributos incidentes sobre operação, folha e resultado.', section_key: 'taxes', type: 'TAX', nature: 'OUTFLOW', accepts_entries: false },
  { code: '06.01', name: 'ISS', description: 'Imposto sobre serviços.', section_key: 'taxes', type: 'TAX', nature: 'OUTFLOW', accepts_entries: true },
  { code: '06.02', name: 'PIS/COFINS', description: 'Contribuições sobre faturamento.', section_key: 'taxes', type: 'TAX', nature: 'OUTFLOW', accepts_entries: true },
  { code: '06.03', name: 'IRPJ/CSLL', description: 'Tributos sobre resultado.', section_key: 'taxes', type: 'TAX', nature: 'OUTFLOW', accepts_entries: true },
  { code: '06.04', name: 'INSS e FGTS', description: 'Encargos sociais e folha.', section_key: 'taxes', type: 'TAX', nature: 'OUTFLOW', accepts_entries: true },
  { code: '07', name: 'Repasses médicos', description: 'Produção, honorários e repasses a profissionais.', section_key: 'medical-transfers', type: 'MEDICAL_TRANSFER', nature: 'OUTFLOW', accepts_entries: false },
  { code: '07.01', name: 'Produção médica', description: 'Repasses vinculados à produção assistencial.', section_key: 'medical-transfers', type: 'MEDICAL_TRANSFER', nature: 'OUTFLOW', accepts_entries: true },
  { code: '07.02', name: 'Honorários', description: 'Honorários fixos ou variáveis.', section_key: 'medical-transfers', type: 'MEDICAL_TRANSFER', nature: 'OUTFLOW', accepts_entries: true },
  { code: '07.03', name: 'Plantões', description: 'Plantões médicos e assistenciais.', section_key: 'medical-transfers', type: 'MEDICAL_TRANSFER', nature: 'OUTFLOW', accepts_entries: true },
  { code: '08', name: 'Investimentos', description: 'Compras e melhorias de longo prazo.', section_key: 'investments', type: 'INVESTMENT', nature: 'OUTFLOW', accepts_entries: false },
  { code: '08.01', name: 'Equipamentos médicos', description: 'Equipamentos assistenciais e diagnósticos.', section_key: 'investments', type: 'INVESTMENT', nature: 'OUTFLOW', accepts_entries: true },
  { code: '08.02', name: 'Obras e reformas', description: 'Adequações estruturais e obras.', section_key: 'investments', type: 'INVESTMENT', nature: 'OUTFLOW', accepts_entries: true },
  { code: '08.03', name: 'Tecnologia e implantação', description: 'Projetos, implantação e infraestrutura tecnológica.', section_key: 'investments', type: 'INVESTMENT', nature: 'OUTFLOW', accepts_entries: true },
  { code: '09', name: 'Distribuição de resultados', description: 'Movimentos societários e destinação de resultado.', section_key: 'distribution', type: 'DISTRIBUTION', nature: 'OUTFLOW', accepts_entries: false },
  { code: '09.01', name: 'Pró-labore', description: 'Pró-labore de sócios.', section_key: 'distribution', type: 'DISTRIBUTION', nature: 'OUTFLOW', accepts_entries: true },
  { code: '09.02', name: 'Distribuição de lucros', description: 'Distribuição de resultados aos sócios.', section_key: 'distribution', type: 'DISTRIBUTION', nature: 'OUTFLOW', accepts_entries: true },
];

function getParentCode(code: string) {
  const parts = code.split('.');
  if (parts.length <= 1) return null;
  return parts.slice(0, -1).join('.');
}

function buildTree(rows: FinancialPlanAccount[]): FinancialPlanTreeNode[] {
  const nodeMap = new Map<string, FinancialPlanTreeNode>();
  const roots: FinancialPlanTreeNode[] = [];

  rows.forEach((row) => {
    nodeMap.set(row.id, { ...row, children: [] });
  });

  nodeMap.forEach((node) => {
    if (node.parent_id && nodeMap.has(node.parent_id)) {
      nodeMap.get(node.parent_id)?.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortNodes = (nodes: FinancialPlanTreeNode[]) => {
    nodes.sort((left, right) => left.code.localeCompare(right.code, 'pt-BR', { numeric: true }));
    nodes.forEach((node) => sortNodes(node.children));
  };

  sortNodes(roots);
  return roots;
}

function formatFinancialPlanError(error: any) {
  const text = String(error?.message || error?.details || '');
  if (error?.code === '42P01' || /financial_plan_accounts/i.test(text) && /does not exist|schema cache|could not find/i.test(text)) {
    return new Error('A estrutura do Plano Financeiro ainda não foi criada no banco. Execute a migration 20260720_create_financial_plan_accounts.sql.');
  }
  if (/row-level security|violates row-level security/i.test(text)) {
    return new Error('A permissão do Plano Financeiro foi bloqueada pelo RLS. Execute a migration 20260720_fix_financial_plan_accounts_rls.sql e tente aplicar o modelo novamente.');
  }
  return error instanceof Error ? error : new Error(text || 'Erro no plano financeiro');
}

export async function listFinancialPlanAccounts(clinicId: string): Promise<FinancialPlanAccount[]> {
  const { data, error } = await supabase
    .from('financial_plan_accounts')
    .select('*')
    .eq('clinic_id', clinicId)
    .order('code', { ascending: true });

  if (error) throw formatFinancialPlanError(error);
  return (data || []) as FinancialPlanAccount[];
}

export async function getFinancialPlanTree(clinicId: string): Promise<FinancialPlanTreeNode[]> {
  return buildTree(await listFinancialPlanAccounts(clinicId));
}

export async function applyHealthcareFinancialPlanTemplate(clinicId: string, userId: string): Promise<FinancialPlanAccount[]> {
  const existing = await listFinancialPlanAccounts(clinicId).catch((error) => {
    throw formatFinancialPlanError(error);
  });
  const byCode = new Map(existing.map((account) => [account.code, account]));

  for (const row of HEALTHCARE_FINANCIAL_PLAN_TEMPLATE) {
    const parentCode = getParentCode(row.code);
    const parent = parentCode ? byCode.get(parentCode) : null;
    const payload = {
      clinic_id: clinicId,
      parent_id: parent?.id || null,
      code: row.code,
      name: row.name,
      description: row.description,
      section_key: row.section_key,
      type: row.type,
      nature: row.nature,
      level: row.code.split('.').length,
      sort_order: Number(row.code.replace(/\./g, '').padEnd(4, '0')) || 0,
      accepts_entries: row.accepts_entries,
      is_active: true,
      is_system_template: true,
      created_by: userId,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('financial_plan_accounts')
      .upsert(payload, { onConflict: 'clinic_id,code' })
      .select('*')
      .single();

    if (error) throw formatFinancialPlanError(error);
    byCode.set(row.code, data as FinancialPlanAccount);
  }

  return listFinancialPlanAccounts(clinicId);
}
