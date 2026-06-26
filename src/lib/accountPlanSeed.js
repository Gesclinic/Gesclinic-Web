import { supabase } from '@/lib/customSupabaseClient';

const ENTERPRISE_TEMPLATE = [
  { code: '1', parent_code: null, name: 'RECEITAS', type: 'RECEITA', nature: 'CREDORA', allows_posting: false, requires_cost_center: false, color: '#0f766e', icon: 'banknote', category: 'RECEITAS', subcategory: 'ROOT', group_name: 'RECEITAS' },
  { code: '1.1', parent_code: '1', name: 'Particular', type: 'RECEITA', nature: 'CREDORA', allows_posting: true, requires_cost_center: true, color: '#0f766e', icon: 'user-round', category: 'RECEITAS', subcategory: 'PARTICULAR', group_name: 'RECEITAS' },
  { code: '1.2', parent_code: '1', name: 'Convenios', type: 'RECEITA', nature: 'CREDORA', allows_posting: false, requires_cost_center: true, color: '#0f766e', icon: 'shield-check', category: 'RECEITAS', subcategory: 'CONVENIOS', group_name: 'RECEITAS' },
  { code: '1.2.1', parent_code: '1.2', name: 'Unimed', type: 'RECEITA', nature: 'CREDORA', allows_posting: true, requires_cost_center: true, color: '#0f766e', icon: 'heart-pulse', category: 'RECEITAS', subcategory: 'CONVENIOS', group_name: 'CONVENIOS' },
  { code: '1.2.2', parent_code: '1.2', name: 'Bradesco', type: 'RECEITA', nature: 'CREDORA', allows_posting: true, requires_cost_center: true, color: '#0f766e', icon: 'heart-pulse', category: 'RECEITAS', subcategory: 'CONVENIOS', group_name: 'CONVENIOS' },
  { code: '1.2.3', parent_code: '1.2', name: 'Amil', type: 'RECEITA', nature: 'CREDORA', allows_posting: true, requires_cost_center: true, color: '#0f766e', icon: 'heart-pulse', category: 'RECEITAS', subcategory: 'CONVENIOS', group_name: 'CONVENIOS' },
  { code: '1.2.4', parent_code: '1.2', name: 'SulAmerica', type: 'RECEITA', nature: 'CREDORA', allows_posting: true, requires_cost_center: true, color: '#0f766e', icon: 'heart-pulse', category: 'RECEITAS', subcategory: 'CONVENIOS', group_name: 'CONVENIOS' },
  { code: '1.2.5', parent_code: '1.2', name: 'Hapvida', type: 'RECEITA', nature: 'CREDORA', allows_posting: true, requires_cost_center: true, color: '#0f766e', icon: 'heart-pulse', category: 'RECEITAS', subcategory: 'CONVENIOS', group_name: 'CONVENIOS' },
  { code: '1.3', parent_code: '1', name: 'Empresas', type: 'RECEITA', nature: 'CREDORA', allows_posting: true, requires_cost_center: true, color: '#0f766e', icon: 'building-2', category: 'RECEITAS', subcategory: 'EMPRESAS', group_name: 'RECEITAS' },
  { code: '1.4', parent_code: '1', name: 'Exames', type: 'RECEITA', nature: 'CREDORA', allows_posting: true, requires_cost_center: true, color: '#0f766e', icon: 'flask-conical', category: 'RECEITAS', subcategory: 'EXAMES', group_name: 'RECEITAS' },
  { code: '1.5', parent_code: '1', name: 'Procedimentos', type: 'RECEITA', nature: 'CREDORA', allows_posting: true, requires_cost_center: true, color: '#0f766e', icon: 'stethoscope', category: 'RECEITAS', subcategory: 'PROCEDIMENTOS', group_name: 'RECEITAS' },
  { code: '1.6', parent_code: '1', name: 'Cirurgias', type: 'RECEITA', nature: 'CREDORA', allows_posting: true, requires_cost_center: true, color: '#0f766e', icon: 'scissors', category: 'RECEITAS', subcategory: 'CIRURGIAS', group_name: 'RECEITAS' },
  { code: '1.7', parent_code: '1', name: 'Internacoes', type: 'RECEITA', nature: 'CREDORA', allows_posting: true, requires_cost_center: true, color: '#0f766e', icon: 'bed-double', category: 'RECEITAS', subcategory: 'INTERNACOES', group_name: 'RECEITAS' },
  { code: '1.8', parent_code: '1', name: 'Telemedicina', type: 'RECEITA', nature: 'CREDORA', allows_posting: true, requires_cost_center: true, color: '#0f766e', icon: 'monitor-smartphone', category: 'RECEITAS', subcategory: 'TELEMEDICINA', group_name: 'RECEITAS' },
  { code: '1.9', parent_code: '1', name: 'Medicina Ocupacional', type: 'RECEITA', nature: 'CREDORA', allows_posting: true, requires_cost_center: true, color: '#0f766e', icon: 'briefcase-medical', category: 'RECEITAS', subcategory: 'OCUPACIONAL', group_name: 'RECEITAS' },

  { code: '2', parent_code: null, name: 'DEDUCOES', type: 'DEDUCAO', nature: 'DEVEDORA', allows_posting: false, requires_cost_center: false, color: '#b91c1c', icon: 'minus-circle', category: 'DEDUCOES', subcategory: 'ROOT', group_name: 'DEDUCOES' },
  { code: '2.1', parent_code: '2', name: 'Glosas', type: 'DEDUCAO', nature: 'DEVEDORA', allows_posting: true, requires_cost_center: true, color: '#b91c1c', icon: 'shield-x', category: 'DEDUCOES', subcategory: 'GLOSAS', group_name: 'DEDUCOES' },
  { code: '2.2', parent_code: '2', name: 'ISS', type: 'DEDUCAO', nature: 'DEVEDORA', allows_posting: true, requires_cost_center: true, color: '#b91c1c', icon: 'receipt', category: 'DEDUCOES', subcategory: 'TRIBUTOS', group_name: 'DEDUCOES' },
  { code: '2.3', parent_code: '2', name: 'PIS', type: 'DEDUCAO', nature: 'DEVEDORA', allows_posting: true, requires_cost_center: true, color: '#b91c1c', icon: 'receipt', category: 'DEDUCOES', subcategory: 'TRIBUTOS', group_name: 'DEDUCOES' },
  { code: '2.4', parent_code: '2', name: 'COFINS', type: 'DEDUCAO', nature: 'DEVEDORA', allows_posting: true, requires_cost_center: true, color: '#b91c1c', icon: 'receipt', category: 'DEDUCOES', subcategory: 'TRIBUTOS', group_name: 'DEDUCOES' },
  { code: '2.5', parent_code: '2', name: 'CSLL', type: 'DEDUCAO', nature: 'DEVEDORA', allows_posting: true, requires_cost_center: true, color: '#b91c1c', icon: 'receipt', category: 'DEDUCOES', subcategory: 'TRIBUTOS', group_name: 'DEDUCOES' },
  { code: '2.6', parent_code: '2', name: 'IRRF', type: 'DEDUCAO', nature: 'DEVEDORA', allows_posting: true, requires_cost_center: true, color: '#b91c1c', icon: 'receipt', category: 'DEDUCOES', subcategory: 'TRIBUTOS', group_name: 'DEDUCOES' },
  { code: '2.7', parent_code: '2', name: 'Estornos', type: 'DEDUCAO', nature: 'DEVEDORA', allows_posting: true, requires_cost_center: true, color: '#b91c1c', icon: 'rotate-ccw', category: 'DEDUCOES', subcategory: 'ESTORNOS', group_name: 'DEDUCOES' },

  { code: '3', parent_code: null, name: 'CUSTOS ASSISTENCIAIS', type: 'CUSTO', nature: 'DEVEDORA', allows_posting: false, requires_cost_center: false, color: '#9a3412', icon: 'activity', category: 'CUSTOS', subcategory: 'ROOT', group_name: 'CUSTOS' },
  { code: '3.1', parent_code: '3', name: 'Materiais', type: 'CUSTO', nature: 'DEVEDORA', allows_posting: true, requires_cost_center: true, color: '#9a3412', icon: 'package', category: 'CUSTOS', subcategory: 'MATERIAIS', group_name: 'CUSTOS' },
  { code: '3.2', parent_code: '3', name: 'Medicamentos', type: 'CUSTO', nature: 'DEVEDORA', allows_posting: true, requires_cost_center: true, color: '#9a3412', icon: 'pill', category: 'CUSTOS', subcategory: 'MEDICAMENTOS', group_name: 'CUSTOS' },
  { code: '3.3', parent_code: '3', name: 'OPME', type: 'CUSTO', nature: 'DEVEDORA', allows_posting: true, requires_cost_center: true, color: '#9a3412', icon: 'syringe', category: 'CUSTOS', subcategory: 'OPME', group_name: 'CUSTOS' },
  { code: '3.4', parent_code: '3', name: 'Laboratorio', type: 'CUSTO', nature: 'DEVEDORA', allows_posting: true, requires_cost_center: true, color: '#9a3412', icon: 'test-tube', category: 'CUSTOS', subcategory: 'LABORATORIO', group_name: 'CUSTOS' },
  { code: '3.5', parent_code: '3', name: 'Diagnostico', type: 'CUSTO', nature: 'DEVEDORA', allows_posting: true, requires_cost_center: true, color: '#9a3412', icon: 'scan-search', category: 'CUSTOS', subcategory: 'DIAGNOSTICO', group_name: 'CUSTOS' },
  { code: '3.6', parent_code: '3', name: 'Centro Cirurgico', type: 'CUSTO', nature: 'DEVEDORA', allows_posting: true, requires_cost_center: true, color: '#9a3412', icon: 'scissors', category: 'CUSTOS', subcategory: 'CIRURGICO', group_name: 'CUSTOS' },
  { code: '3.7', parent_code: '3', name: 'Exames', type: 'CUSTO', nature: 'DEVEDORA', allows_posting: true, requires_cost_center: true, color: '#9a3412', icon: 'microscope', category: 'CUSTOS', subcategory: 'EXAMES', group_name: 'CUSTOS' },
  { code: '3.8', parent_code: '3', name: 'Custos Hospitalares', type: 'CUSTO', nature: 'DEVEDORA', allows_posting: true, requires_cost_center: true, color: '#9a3412', icon: 'hospital', category: 'CUSTOS', subcategory: 'HOSPITALARES', group_name: 'CUSTOS' },

  { code: '4', parent_code: null, name: 'HONORARIOS MEDICOS', type: 'HONORARIO', nature: 'DEVEDORA', allows_posting: false, requires_cost_center: false, color: '#7c3aed', icon: 'stethoscope', category: 'HONORARIOS', subcategory: 'ROOT', group_name: 'HONORARIOS' },
  { code: '4.1', parent_code: '4', name: 'Producao', type: 'HONORARIO', nature: 'DEVEDORA', allows_posting: true, requires_cost_center: true, color: '#7c3aed', icon: 'line-chart', category: 'HONORARIOS', subcategory: 'PRODUCAO', group_name: 'HONORARIOS' },
  { code: '4.2', parent_code: '4', name: 'Repasses', type: 'HONORARIO', nature: 'DEVEDORA', allows_posting: true, requires_cost_center: true, color: '#7c3aed', icon: 'hand-coins', category: 'HONORARIOS', subcategory: 'REPASSES', group_name: 'HONORARIOS' },
  { code: '4.3', parent_code: '4', name: 'Plantoes', type: 'HONORARIO', nature: 'DEVEDORA', allows_posting: true, requires_cost_center: true, color: '#7c3aed', icon: 'clock-3', category: 'HONORARIOS', subcategory: 'PLANTOES', group_name: 'HONORARIOS' },
  { code: '4.4', parent_code: '4', name: 'Cooperativas', type: 'HONORARIO', nature: 'DEVEDORA', allows_posting: true, requires_cost_center: true, color: '#7c3aed', icon: 'users', category: 'HONORARIOS', subcategory: 'COOPERATIVAS', group_name: 'HONORARIOS' },
  { code: '4.5', parent_code: '4', name: 'Terceiros', type: 'HONORARIO', nature: 'DEVEDORA', allows_posting: true, requires_cost_center: true, color: '#7c3aed', icon: 'user-cog', category: 'HONORARIOS', subcategory: 'TERCEIROS', group_name: 'HONORARIOS' },

  { code: '5', parent_code: null, name: 'PESSOAL', type: 'DESPESA', nature: 'DEVEDORA', allows_posting: false, requires_cost_center: false, color: '#1d4ed8', icon: 'users-round', category: 'DESPESAS', subcategory: 'PESSOAL', group_name: 'DESPESAS' },
  { code: '5.1', parent_code: '5', name: 'Salarios', type: 'DESPESA', nature: 'DEVEDORA', allows_posting: true, requires_cost_center: true, color: '#1d4ed8', icon: 'wallet', category: 'DESPESAS', subcategory: 'PESSOAL', group_name: 'PESSOAL' },
  { code: '5.2', parent_code: '5', name: 'Pro-Labore', type: 'DESPESA', nature: 'DEVEDORA', allows_posting: true, requires_cost_center: true, color: '#1d4ed8', icon: 'wallet-cards', category: 'DESPESAS', subcategory: 'PESSOAL', group_name: 'PESSOAL' },
  { code: '5.3', parent_code: '5', name: 'FGTS', type: 'DESPESA', nature: 'DEVEDORA', allows_posting: true, requires_cost_center: true, color: '#1d4ed8', icon: 'landmark', category: 'DESPESAS', subcategory: 'PESSOAL', group_name: 'PESSOAL' },
  { code: '5.4', parent_code: '5', name: 'INSS', type: 'DESPESA', nature: 'DEVEDORA', allows_posting: true, requires_cost_center: true, color: '#1d4ed8', icon: 'landmark', category: 'DESPESAS', subcategory: 'PESSOAL', group_name: 'PESSOAL' },
  { code: '5.5', parent_code: '5', name: 'Beneficios', type: 'DESPESA', nature: 'DEVEDORA', allows_posting: true, requires_cost_center: true, color: '#1d4ed8', icon: 'heart-handshake', category: 'DESPESAS', subcategory: 'PESSOAL', group_name: 'PESSOAL' },
  { code: '5.6', parent_code: '5', name: 'Ferias', type: 'DESPESA', nature: 'DEVEDORA', allows_posting: true, requires_cost_center: true, color: '#1d4ed8', icon: 'sun', category: 'DESPESAS', subcategory: 'PESSOAL', group_name: 'PESSOAL' },
  { code: '5.7', parent_code: '5', name: '13 Salario', type: 'DESPESA', nature: 'DEVEDORA', allows_posting: true, requires_cost_center: true, color: '#1d4ed8', icon: 'calendar', category: 'DESPESAS', subcategory: 'PESSOAL', group_name: 'PESSOAL' },

  { code: '6', parent_code: null, name: 'DESPESAS ADMINISTRATIVAS', type: 'DESPESA', nature: 'DEVEDORA', allows_posting: false, requires_cost_center: false, color: '#334155', icon: 'briefcase', category: 'DESPESAS', subcategory: 'ADMINISTRATIVAS', group_name: 'DESPESAS' },
  { code: '6.1', parent_code: '6', name: 'Marketing', type: 'DESPESA', nature: 'DEVEDORA', allows_posting: true, requires_cost_center: true, color: '#334155', icon: 'megaphone', category: 'DESPESAS', subcategory: 'ADMINISTRATIVAS', group_name: 'ADMIN' },
  { code: '6.2', parent_code: '6', name: 'TI', type: 'DESPESA', nature: 'DEVEDORA', allows_posting: true, requires_cost_center: true, color: '#334155', icon: 'cpu', category: 'DESPESAS', subcategory: 'ADMINISTRATIVAS', group_name: 'ADMIN' },
  { code: '6.3', parent_code: '6', name: 'Telefonia', type: 'DESPESA', nature: 'DEVEDORA', allows_posting: true, requires_cost_center: true, color: '#334155', icon: 'phone', category: 'DESPESAS', subcategory: 'ADMINISTRATIVAS', group_name: 'ADMIN' },
  { code: '6.4', parent_code: '6', name: 'Internet', type: 'DESPESA', nature: 'DEVEDORA', allows_posting: true, requires_cost_center: true, color: '#334155', icon: 'wifi', category: 'DESPESAS', subcategory: 'ADMINISTRATIVAS', group_name: 'ADMIN' },
  { code: '6.5', parent_code: '6', name: 'Agua', type: 'DESPESA', nature: 'DEVEDORA', allows_posting: true, requires_cost_center: true, color: '#334155', icon: 'droplets', category: 'DESPESAS', subcategory: 'ADMINISTRATIVAS', group_name: 'ADMIN' },
  { code: '6.6', parent_code: '6', name: 'Energia', type: 'DESPESA', nature: 'DEVEDORA', allows_posting: true, requires_cost_center: true, color: '#334155', icon: 'zap', category: 'DESPESAS', subcategory: 'ADMINISTRATIVAS', group_name: 'ADMIN' },
  { code: '6.7', parent_code: '6', name: 'Limpeza', type: 'DESPESA', nature: 'DEVEDORA', allows_posting: true, requires_cost_center: true, color: '#334155', icon: 'spray-can', category: 'DESPESAS', subcategory: 'ADMINISTRATIVAS', group_name: 'ADMIN' },
  { code: '6.8', parent_code: '6', name: 'Seguranca', type: 'DESPESA', nature: 'DEVEDORA', allows_posting: true, requires_cost_center: true, color: '#334155', icon: 'shield', category: 'DESPESAS', subcategory: 'ADMINISTRATIVAS', group_name: 'ADMIN' },
  { code: '6.9', parent_code: '6', name: 'Contabilidade', type: 'DESPESA', nature: 'DEVEDORA', allows_posting: true, requires_cost_center: true, color: '#334155', icon: 'calculator', category: 'DESPESAS', subcategory: 'ADMINISTRATIVAS', group_name: 'ADMIN' },
  { code: '6.10', parent_code: '6', name: 'Juridico', type: 'DESPESA', nature: 'DEVEDORA', allows_posting: true, requires_cost_center: true, color: '#334155', icon: 'scale', category: 'DESPESAS', subcategory: 'ADMINISTRATIVAS', group_name: 'ADMIN' },

  { code: '7', parent_code: null, name: 'DESPESAS FINANCEIRAS', type: 'DESPESA', nature: 'DEVEDORA', allows_posting: false, requires_cost_center: false, color: '#6d28d9', icon: 'landmark', category: 'DESPESAS', subcategory: 'FINANCEIRAS', group_name: 'DESPESAS' },
  { code: '7.1', parent_code: '7', name: 'Tarifas Bancarias', type: 'DESPESA', nature: 'DEVEDORA', allows_posting: true, requires_cost_center: true, color: '#6d28d9', icon: 'credit-card', category: 'DESPESAS', subcategory: 'FINANCEIRAS', group_name: 'FINANCEIRAS' },
  { code: '7.2', parent_code: '7', name: 'Juros', type: 'DESPESA', nature: 'DEVEDORA', allows_posting: true, requires_cost_center: true, color: '#6d28d9', icon: 'percent', category: 'DESPESAS', subcategory: 'FINANCEIRAS', group_name: 'FINANCEIRAS' },
  { code: '7.3', parent_code: '7', name: 'IOF', type: 'DESPESA', nature: 'DEVEDORA', allows_posting: true, requires_cost_center: true, color: '#6d28d9', icon: 'receipt', category: 'DESPESAS', subcategory: 'FINANCEIRAS', group_name: 'FINANCEIRAS' },
  { code: '7.4', parent_code: '7', name: 'Emprestimos', type: 'DESPESA', nature: 'DEVEDORA', allows_posting: true, requires_cost_center: true, color: '#6d28d9', icon: 'banknote', category: 'DESPESAS', subcategory: 'FINANCEIRAS', group_name: 'FINANCEIRAS' },
  { code: '7.5', parent_code: '7', name: 'Financiamentos', type: 'DESPESA', nature: 'DEVEDORA', allows_posting: true, requires_cost_center: true, color: '#6d28d9', icon: 'wallet', category: 'DESPESAS', subcategory: 'FINANCEIRAS', group_name: 'FINANCEIRAS' },

  { code: '8', parent_code: null, name: 'INVESTIMENTOS', type: 'INVESTIMENTO', nature: 'DEVEDORA', allows_posting: false, requires_cost_center: false, color: '#047857', icon: 'trending-up', category: 'INVESTIMENTOS', subcategory: 'ROOT', group_name: 'INVESTIMENTOS' },
  { code: '8.1', parent_code: '8', name: 'Equipamentos', type: 'INVESTIMENTO', nature: 'DEVEDORA', allows_posting: true, requires_cost_center: true, color: '#047857', icon: 'monitor', category: 'INVESTIMENTOS', subcategory: 'EQUIPAMENTOS', group_name: 'INVESTIMENTOS' },
  { code: '8.2', parent_code: '8', name: 'Reformas', type: 'INVESTIMENTO', nature: 'DEVEDORA', allows_posting: true, requires_cost_center: true, color: '#047857', icon: 'hammer', category: 'INVESTIMENTOS', subcategory: 'REFORMAS', group_name: 'INVESTIMENTOS' },
  { code: '8.3', parent_code: '8', name: 'Obras', type: 'INVESTIMENTO', nature: 'DEVEDORA', allows_posting: true, requires_cost_center: true, color: '#047857', icon: 'building', category: 'INVESTIMENTOS', subcategory: 'OBRAS', group_name: 'INVESTIMENTOS' },
  { code: '8.4', parent_code: '8', name: 'Tecnologia', type: 'INVESTIMENTO', nature: 'DEVEDORA', allows_posting: true, requires_cost_center: true, color: '#047857', icon: 'microchip', category: 'INVESTIMENTOS', subcategory: 'TECNOLOGIA', group_name: 'INVESTIMENTOS' },

  { code: '9', parent_code: null, name: 'PATRIMONIO', type: 'PATRIMONIO', nature: 'CREDORA', allows_posting: false, requires_cost_center: false, color: '#1e40af', icon: 'landmark', category: 'PATRIMONIO', subcategory: 'ROOT', group_name: 'PATRIMONIO' },
  { code: '9.1', parent_code: '9', name: 'Capital Social', type: 'PATRIMONIO', nature: 'CREDORA', allows_posting: true, requires_cost_center: false, color: '#1e40af', icon: 'coins', category: 'PATRIMONIO', subcategory: 'CAPITAL', group_name: 'PATRIMONIO' },
  { code: '9.2', parent_code: '9', name: 'Reservas', type: 'PATRIMONIO', nature: 'CREDORA', allows_posting: true, requires_cost_center: false, color: '#1e40af', icon: 'piggy-bank', category: 'PATRIMONIO', subcategory: 'RESERVAS', group_name: 'PATRIMONIO' },
  { code: '9.3', parent_code: '9', name: 'Lucros Acumulados', type: 'PATRIMONIO', nature: 'CREDORA', allows_posting: true, requires_cost_center: false, color: '#1e40af', icon: 'badge-dollar-sign', category: 'PATRIMONIO', subcategory: 'LUCROS', group_name: 'PATRIMONIO' },
];

function getLevelFromCode(code) {
  return String(code || '').split('.').length;
}

async function applyEnterpriseTemplateDirect(clinicId, userId) {
  const sorted = [...ENTERPRISE_TEMPLATE].sort((a, b) => getLevelFromCode(a.code) - getLevelFromCode(b.code));
  const idByCode = new Map();

  for (const row of sorted) {
    const parentId = row.parent_code ? idByCode.get(row.parent_code) || null : null;
    const payload = {
      clinic_id: clinicId,
      parent_id: parentId,
      code: row.code,
      name: row.name,
      description: row.name,
      type: row.type,
      nature: row.nature,
      level: getLevelFromCode(row.code),
      is_active: true,
      accepts_entries: row.allows_posting,
      allows_posting: row.allows_posting,
      requires_cost_center: row.requires_cost_center,
      is_analytic: row.allows_posting,
      is_synthetic: !row.allows_posting,
      status: 'ATIVA',
      color: row.color,
      icon: row.icon,
      category: row.category,
      subcategory: row.subcategory,
      group_name: row.group_name,
      integration_key: `ERP_${row.code}`,
      dimension_config: {
        category: true,
        subcategory: true,
        group: true,
        cost_center: true,
        unit: true,
        specialty: true,
        doctor: true,
        insurance: true,
        supplier: true,
        patient: true,
        company: true,
      },
      metadata: {
        seed: 'erp_hospital_enterprise',
        version: '2026-06-19',
        source: 'frontend_direct_seed',
      },
      created_by: userId || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('financial_chart_of_accounts')
      .upsert(payload, { onConflict: 'clinic_id,code' })
      .select('id, code')
      .single();

    if (error) {
      throw new Error(getErrorMessage(error));
    }

    if (!data?.id) {
      throw new Error(`Falha ao aplicar conta ${row.code}`);
    }

    idByCode.set(row.code, data.id);
  }

  return { ok: true, total: sorted.length, mode: 'direct' };
}

const getErrorMessage = (err) => {
  if (!err) return 'Erro desconhecido';
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  if (typeof err === 'object') {
    const maybe = err;
    const parts = [maybe.message, maybe.details, maybe.hint, maybe.code].filter(Boolean);
    if (parts.length > 0) return parts.join(' | ');
    try {
      return JSON.stringify(maybe);
    } catch {
      return 'Erro desconhecido';
    }
  }
  return 'Erro desconhecido';
};

async function backfillMissingDescriptions(clinicId) {
  const { data, error } = await supabase
    .from('financial_chart_of_accounts')
    .select('id, name, description')
    .eq('clinic_id', clinicId)
    .or('description.is.null,description.eq.');

  if (error) {
    throw new Error(getErrorMessage(error));
  }

  const missing = (data || []).filter((row) => !String(row.description || '').trim());

  for (const row of missing) {
    const { error: updateError } = await supabase
      .from('financial_chart_of_accounts')
      .update({ description: row.name || null, updated_at: new Date().toISOString() })
      .eq('id', row.id);

    if (updateError) {
      throw new Error(getErrorMessage(updateError));
    }
  }

  return missing.length;
}

export async function repairAccountPlanDescriptions(clinicId) {
  if (!clinicId) {
    throw new Error('Clinic ID obrigatório');
  }

  const fixed = await backfillMissingDescriptions(clinicId);
  return { ok: true, fixed };
}

/**
 * Apply the standard hierarchical Chart of Accounts for a clinic.
 *
 * Source of truth: financial_chart_of_accounts (enterprise table used by
 * /clinica/financeiro/plano-contas).
 */
export async function applyDefaultAccountPlan(clinicId, userId, userEmail) {
  if (!clinicId) {
    throw new Error('Clinic ID obrigatório');
  }
  const { data, error } = await supabase.rpc('seed_financial_chart_of_accounts', {
    p_clinic_id: clinicId,
    p_user_id: userId || null,
    p_user_email: userEmail || null,
  });

  if (error) {
    throw new Error(getErrorMessage(error));
  }

  await backfillMissingDescriptions(clinicId);

  return data || { ok: true, mode: 'rpc' };
}

/** Returns only launchable accounts (level 2, have parent). */
export function selectLaunchable(plans) {
  return (Array.isArray(plans) ? plans : []).filter((p) => !!p.parent_id);
}

/**
 * Reset the account plan for a clinic:
 * - Clears `category_id` on AP bills to avoid FK constraints
 * - Deletes enterprise rows in `financial_chart_of_accounts` for the clinic
 * - Re-applies the default hierarchical structure
 */
export async function resetAccountPlan(clinicId, userId, userEmail) {
  if (!clinicId) {
    throw new Error('Clinic ID obrigatório');
  }
  try {
    // Clear categories on AP bills for this clinic
    await supabase.from('ap_bills').update({ category_id: null }).eq('clinic_id', clinicId);
  } catch (e) {
    // Non-fatal; proceed to delete
    console.warn('resetAccountPlan: clear ap_bills categories warning:', e?.message || e);
  }
  // Delete existing enterprise plan
  const del = await supabase
    .from('financial_chart_of_accounts')
    .delete()
    .eq('clinic_id', clinicId);
  if (del.error) {
    throw new Error(getErrorMessage(del.error));
  }
  // Re-seed through security-definer RPC to avoid RLS issues.
  await applyDefaultAccountPlan(clinicId, userId, userEmail);
  await backfillMissingDescriptions(clinicId);
  return { ok: true, mode: 'reset_and_rpc_seed' };
}
