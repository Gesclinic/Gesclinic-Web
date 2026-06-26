import { supabase } from '@/lib/customSupabaseClient';

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function flattenTree(nodes = [], parentName = '') {
  return nodes.flatMap((node) => {
    const { children = [], ...rest } = node || {};
    return [{ ...rest, parentName }, ...flattenTree(children, rest.name || parentName)];
  });
}

async function listEnterpriseAccounts(clinicId) {
  if (!clinicId) return [];

  try {
    const { data, error } = await supabase.rpc('get_chart_of_accounts_tree', {
      p_clinic_id: clinicId,
    });

    if (!error && Array.isArray(data) && data.length > 0) {
      return flattenTree(data);
    }
  } catch (error) {
    console.warn('listEnterpriseAccounts rpc fallback:', error?.message || error);
  }

  try {
    const { data, error } = await supabase
      .from('financial_chart_of_accounts')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('code', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.warn('listEnterpriseAccounts fallback failed:', error?.message || error);
    return [];
  }
}

function resolveByCodePrefix(accounts, codePrefix) {
  const normalizedPrefix = String(codePrefix || '').trim();
  if (!normalizedPrefix) return null;

  const exact = accounts.find((account) => String(account.code || '') === normalizedPrefix);
  if (exact) return exact;

  const startsWith = accounts
    .filter((account) => String(account.code || '').startsWith(`${normalizedPrefix}.`))
    .sort((a, b) => String(a.code || '').localeCompare(String(b.code || '')));

  return startsWith[0] || null;
}

function resolveByName(accounts, targetName) {
  const key = normalizeText(targetName);
  return accounts.find((account) => normalizeText(account.name) === key) || null;
}

function isLaunchable(account) {
  if (!account) return false;
  if (account.is_active === false) return false;

  if (typeof account.accepts_entries === 'boolean') {
    return account.accepts_entries;
  }

  if (typeof account.allows_posting === 'boolean') {
    return account.allows_posting;
  }

  return !!account.parent_id;
}

function selectBestCandidate(accounts, codeCandidates = [], nameCandidates = []) {
  for (const code of codeCandidates) {
    const found = resolveByCodePrefix(accounts, code);
    if (found && isLaunchable(found)) return found;
  }

  for (const name of nameCandidates) {
    const found = resolveByName(accounts, name);
    if (found && isLaunchable(found)) return found;
  }

  return null;
}

function detectReceivableTargets(payload) {
  const description = normalizeText(payload.description || payload.service_description);
  const payerName = normalizeText(payload.payer_name || payload.patient_name);
  const convenioName = normalizeText(payload.convenio_name || payload.insurance_name || payload.payer_display);
  const payerType = normalizeText(payload.payer_type);
  const specialty = normalizeText(payload.specialty_name);

  const text = [description, payerName, convenioName, specialty].filter(Boolean).join(' ');

  if (text.includes('unimed')) return { codes: ['1.2.1'], names: ['Unimed'] };
  if (text.includes('bradesco')) return { codes: ['1.2.2'], names: ['Bradesco'] };
  if (text.includes('amil')) return { codes: ['1.2.3'], names: ['Amil'] };
  if (text.includes('sulamerica') || text.includes('sul am')) return { codes: ['1.2.4'], names: ['SulAmerica'] };
  if (text.includes('hapvida')) return { codes: ['1.2.5'], names: ['Hapvida'] };

  if (text.includes('telemedicina') || text.includes('teleconsulta')) {
    return { codes: ['1.8'], names: ['Telemedicina'] };
  }

  if (text.includes('ocupacional') || text.includes('aso') || text.includes('pcmso')) {
    return { codes: ['1.9'], names: ['Medicina Ocupacional'] };
  }

  if (text.includes('interna')) return { codes: ['1.7'], names: ['Internacoes'] };
  if (text.includes('cirurg')) return { codes: ['1.6'], names: ['Cirurgias'] };
  if (text.includes('proced')) return { codes: ['1.5'], names: ['Procedimentos'] };
  if (text.includes('eeg') || text.includes('exame') || text.includes('laborat')) {
    return { codes: ['1.4'], names: ['Exames'] };
  }

  if (payerType === 'company' || text.includes('empresa') || text.includes('corporativo')) {
    return { codes: ['1.3'], names: ['Empresas'] };
  }

  if (payerType === 'insurance' || text.includes('convenio') || text.includes('plano')) {
    return { codes: ['1.2'], names: ['Convenios'] };
  }

  return { codes: ['1.1'], names: ['Particular'] };
}

function detectPayableTargets(payload) {
  const description = normalizeText(payload.description);
  const vendor = normalizeText(payload.vendor_name);
  const service = normalizeText(payload.linked_service);
  const text = [description, vendor, service].filter(Boolean).join(' ');

  if (text.includes('iss')) return { codes: ['2.2'], names: ['ISS'] };
  if (text.includes('pis')) return { codes: ['2.3'], names: ['PIS'] };
  if (text.includes('cofins')) return { codes: ['2.4'], names: ['COFINS'] };
  if (text.includes('csll')) return { codes: ['2.5'], names: ['CSLL'] };
  if (text.includes('irrf') || text.includes('imposto de renda')) return { codes: ['2.6'], names: ['IRRF'] };

  if (text.includes('salario') || text.includes('folha')) return { codes: ['5.1'], names: ['Salarios'] };
  if (text.includes('pro labore') || text.includes('pro-labore')) return { codes: ['5.2'], names: ['Pro-Labore'] };
  if (text.includes('fgts')) return { codes: ['5.3'], names: ['FGTS'] };
  if (text.includes('inss')) return { codes: ['5.4'], names: ['INSS'] };

  if (text.includes('repasse') || text.includes('honor')) return { codes: ['4.2'], names: ['Repasses'] };
  if (text.includes('plantao')) return { codes: ['4.3'], names: ['Plantoes'] };
  if (text.includes('cooperativa')) return { codes: ['4.4'], names: ['Cooperativas'] };
  if (text.includes('terceiro')) return { codes: ['4.5'], names: ['Terceiros'] };

  if (text.includes('medic')) return { codes: ['3.2'], names: ['Medicamentos'] };
  if (text.includes('opme')) return { codes: ['3.3'], names: ['OPME'] };
  if (text.includes('laborat')) return { codes: ['3.4'], names: ['Laboratorio'] };
  if (text.includes('diagnost')) return { codes: ['3.5'], names: ['Diagnostico'] };

  if (text.includes('energia')) return { codes: ['6.6'], names: ['Energia'] };
  if (text.includes('agua')) return { codes: ['6.5'], names: ['Agua'] };
  if (text.includes('internet')) return { codes: ['6.4'], names: ['Internet'] };
  if (text.includes('telefone') || text.includes('telefonia')) return { codes: ['6.3'], names: ['Telefonia'] };
  if (text.includes('ti') || text.includes('software') || text.includes('sistema')) return { codes: ['6.2'], names: ['TI'] };
  if (text.includes('marketing')) return { codes: ['6.1'], names: ['Marketing'] };

  if (text.includes('juros')) return { codes: ['7.2'], names: ['Juros'] };
  if (text.includes('iof')) return { codes: ['7.3'], names: ['IOF'] };
  if (text.includes('tarifa bancaria')) return { codes: ['7.1'], names: ['Tarifas Bancarias'] };

  return { codes: ['6.10', '6.9', '6.8', '6.7'], names: ['Juridico', 'Contabilidade', 'Seguranca', 'Limpeza'] };
}

async function resolveCostCenterId(clinicId) {
  try {
    const { data, error } = await supabase
      .from('financial_cost_centers')
      .select('id')
      .eq('clinic_id', clinicId)
      .eq('is_active', true)
      .order('code', { ascending: true })
      .limit(1);

    if (error) throw error;
    return data?.[0]?.id || null;
  } catch {
    return null;
  }
}

export async function classifyReceivableForEnterprise(clinicId, payload = {}, options = {}) {
  const { strict = false } = options;
  const accounts = await listEnterpriseAccounts(clinicId);

  if (!accounts.length) {
    if (strict) throw new Error('Plano de contas não encontrado. Aplique o template hospitalar antes de lançar receitas.');
    return { chartAccountId: null, costCenterId: null, rule: 'no_accounts' };
  }

  const direct = payload.chart_account_id || payload.plano_contas_id || null;
  if (direct) {
    return {
      chartAccountId: direct,
      costCenterId: payload.centro_custo_id || payload.cost_center_id || null,
      rule: 'manual',
    };
  }

  const target = detectReceivableTargets(payload);
  const account = selectBestCandidate(accounts, target.codes, target.names);
  const costCenterId = payload.centro_custo_id || payload.cost_center_id || (await resolveCostCenterId(clinicId));

  if (!account?.id && strict) {
    throw new Error('Receita sem classificação contábil. Ajuste descrição/convênio ou configure o plano de contas ERP.');
  }

  return {
    chartAccountId: account?.id || null,
    costCenterId: costCenterId || null,
    rule: account?.code || target.codes[0] || 'fallback',
  };
}

export async function classifyPayableForEnterprise(clinicId, payload = {}, options = {}) {
  const { strict = false } = options;
  const accounts = await listEnterpriseAccounts(clinicId);

  if (!accounts.length) {
    if (strict) throw new Error('Plano de contas não encontrado. Aplique o template hospitalar antes de lançar despesas.');
    return { categoryId: null, costCenterId: null, rule: 'no_accounts' };
  }

  const direct = payload.category_id || payload.chart_account_id || payload.plano_contas_id || null;
  if (direct) {
    return {
      categoryId: direct,
      costCenterId: payload.cost_center_id || payload.centro_custo_id || null,
      rule: 'manual',
    };
  }

  const target = detectPayableTargets(payload);
  const account = selectBestCandidate(accounts, target.codes, target.names);
  const costCenterId = payload.cost_center_id || payload.centro_custo_id || (await resolveCostCenterId(clinicId));

  if (!account?.id && strict) {
    throw new Error('Despesa sem classificação contábil. Informe conta contábil ou configure regras do plano ERP.');
  }

  return {
    categoryId: account?.id || null,
    costCenterId: costCenterId || null,
    rule: account?.code || target.codes[0] || 'fallback',
  };
}
