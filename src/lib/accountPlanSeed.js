import { supabase } from '@/lib/customSupabaseClient';

/**
 * Apply the standard hierarchical Chart of Accounts for a clinic.
 * Level 1: Parent (organizational)
 * Level 2: Operational (launchable)
 */
export async function applyDefaultAccountPlan(clinicId) {
  if (!clinicId) throw new Error('Clinic ID obrigatório');

  const parents = [
    { name: 'Receitas', type: 'receita' },
    { name: 'Custos', type: 'despesa' },
    { name: 'Despesas Operacionais', type: 'despesa' },
    { name: 'Despesas Financeiras', type: 'despesa' },
    { name: 'Impostos e Tributos', type: 'despesa' },
    { name: 'Investimentos', type: 'despesa' },
    { name: 'Contas de Resultado / Ajustes', type: 'despesa' },
  ];

  const children = {
    'Receitas': [
      'Consultas',
      'Exames',
      'Procedimentos',
      'Neuromodulação',
      'Fisioterapia',
      'Psicologia',
      'Outros Serviços Médicos',
      'Unimed',
      'Particular Convênios',
      'SUS',
      'Outros Convênios',
      'Aluguel de Equipamentos',
      'Parcerias / Comissões',
      'Receitas Financeiras',
    ],
    'Custos': [
      'Repasse Médico',
      'Repasse Profissionais Terceiros',
      'Plantões',
      'Honorários Variáveis',
      'Materiais Médicos',
      'Medicamentos',
      'Insumos de Exames',
      'Equipamentos (uso direto)',
    ],
    'Despesas Operacionais': [
      'Salários Administrativos',
      'Pró-labore',
      'Contabilidade',
      'Assessoria Jurídica',
      'Consultorias',
      'Aluguel',
      'Condomínio',
      'Energia Elétrica',
      'Água',
      'Internet e Telefonia',
      'Limpeza',
      'Manutenção',
      'Sistemas / Softwares',
      'Licenças',
      'Infraestrutura TI',
      'Tráfego Pago',
      'Redes Sociais',
      'Design / Agência',
      'Publicidade Geral',
    ],
    'Despesas Financeiras': [
      'Taxas Bancárias',
      'Tarifas de Cartão',
      'Juros e Multas',
      'Antecipação de Recebíveis',
    ],
    'Impostos e Tributos': [
      'Simples Nacional',
      'ISS',
      'IRPJ',
      'CSLL',
      'INSS Patronal',
      'FGTS',
    ],
    'Investimentos': [
      'Compra de Equipamentos',
      'Obras e Reformas',
      'Tecnologia e Expansão',
    ],
    'Contas de Resultado / Ajustes': [
      'Depreciação',
      'Amortização',
      'Provisões',
      'Ajustes Contábeis',
    ],
  };

  // Ensure a parent exists and return its id
  const ensureParent = async (name, type) => {
    const { data: found, error: findErr } = await supabase
      .from('account_plans')
      .select('id')
      .eq('clinic_id', clinicId)
      .eq('name', name)
      .limit(1)
      .maybeSingle();
    if (findErr) throw findErr;
    if (found?.id) return found.id;
    const { data: created, error: insErr } = await supabase
      .from('account_plans')
      .insert({ clinic_id: clinicId, name, type, parent_id: null })
      .select('id')
      .single();
    if (insErr) throw insErr;
    return created.id;
  };

  // Ensure a child exists under a parent
  const ensureChild = async (parentId, parentType, childName) => {
    const { data: found, error: findErr } = await supabase
      .from('account_plans')
      .select('id')
      .eq('clinic_id', clinicId)
      .eq('parent_id', parentId)
      .eq('name', childName)
      .limit(1)
      .maybeSingle();
    if (findErr) throw findErr;
    if (found?.id) return found.id;
    const { data: created, error: insErr } = await supabase
      .from('account_plans')
      .insert({ clinic_id: clinicId, name: childName, type: parentType === 'receita' ? 'receita' : 'despesa', parent_id: parentId })
      .select('id')
      .single();
    if (insErr) throw insErr;
    return created.id;
  };

  // Create parents and children
  for (const p of parents) {
    const pid = await ensureParent(p.name, p.type);
    const kids = children[p.name] || [];
    for (const childName of kids) {
      await ensureChild(pid, p.type, childName);
    }
  }

  return { ok: true };
}

/** Returns only launchable accounts (level 2, have parent). */
export function selectLaunchable(plans) {
  return (Array.isArray(plans) ? plans : []).filter(p => !!p.parent_id);
}

/**
 * Reset the account plan for a clinic:
 * - Clears `category_id` on AP bills to avoid FK constraints
 * - Deletes all `account_plans` for the clinic
 * - Re-applies the default hierarchical structure
 */
export async function resetAccountPlan(clinicId) {
  if (!clinicId) throw new Error('Clinic ID obrigatório');
  try {
    // Clear categories on AP bills for this clinic
    await supabase.from('ap_bills').update({ category_id: null }).eq('clinic_id', clinicId);
  } catch (e) {
    // Non-fatal; proceed to delete
    console.warn('resetAccountPlan: clear ap_bills categories warning:', e?.message || e);
  }
  // Delete existing plan
  const del = await supabase.from('account_plans').delete().eq('clinic_id', clinicId);
  if (del.error) throw del.error;
  // Re-seed
  await applyDefaultAccountPlan(clinicId);
  return { ok: true };
}
