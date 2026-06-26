import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
import { supabase } from '@/lib/customSupabaseClient';
import {
  approveCalculationStage,
  generateMedicalPayables,
  getExecutiveDashboard,
  getMedicalRentability,
  listApprovalWorkflow,
  listMedicalPayables,
  listMedicalProduction,
  listMedicalRepasseBankAccounts,
  listRepasseForecasts,
  listRepasseAudit,
  listRepasseCalculations,
  listRepasseRules,
  listSimulationHistory,
  recalculateRepasse,
  runRepasseSimulation,
  transitionRepasseCalculationStatus,
  upsertRepasseRule,
  getPeriodDates,
} from '@/lib/repasseEnterpriseApi';
// legado removido — regras agora gerenciadas integralmente pelo módulo enterprise

const SCOPE_META = {
  individual: {
    label: 'Individual',
    color: 'blue',
    icon: '👤',
    description: 'Regra aplicada a um profissional específico. Tem a maior prioridade no motor de cálculo.',
    primaryField: 'Profissional',
    hint: 'Selecione o profissional para vincular esta regra a ele exclusivamente.',
  },
  especialidade: {
    label: 'Especialidade',
    color: 'purple',
    icon: '🩺',
    description: 'Regra aplicada a todos os profissionais de uma especialidade clínica.',
    primaryField: 'Especialidade',
    hint: 'Informe o nome da especialidade (ex: Neurologia, Psiquiatria, Cardiologia).',
  },
  convenio: {
    label: 'Convênio',
    color: 'emerald',
    icon: '🤝',
    description: 'Regra aplicada ao faturamento de um convênio específico (Unimed, Amil, Particular…).',
    primaryField: 'Convênio (ID)',
    hint: 'Informe o ID do convênio. Afeta todos os profissionais que atenderem por ele.',
  },
  procedimento: {
    label: 'Procedimento',
    color: 'orange',
    icon: '⚕️',
    description: 'Regra aplicada a um procedimento ou serviço específico independente do profissional.',
    primaryField: 'Procedimento (ID)',
    hint: 'Informe o ID do serviço/procedimento (ex: EEG, Consulta, Ressonância).',
  },
};

const scopeColors = {
  blue: { badge: 'bg-blue-100 text-blue-800 border-blue-200', border: 'border-blue-200', bg: 'bg-blue-50' },
  purple: { badge: 'bg-purple-100 text-purple-800 border-purple-200', border: 'border-purple-200', bg: 'bg-purple-50' },
  emerald: { badge: 'bg-emerald-100 text-emerald-800 border-emerald-200', border: 'border-emerald-200', bg: 'bg-emerald-50' },
  orange: { badge: 'bg-orange-100 text-orange-800 border-orange-200', border: 'border-orange-200', bg: 'bg-orange-50' },
};

function RulesScopeHeader({ scope }) {
  const meta = SCOPE_META[scope || 'individual'];
  const colors = scopeColors[meta.color];
  return (
    <div className={`rounded-lg border ${colors.border} ${colors.bg} p-4`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{meta.icon}</span>
          <div>
            <h3 className="font-semibold text-slate-900">Regras — {meta.label}</h3>
            <p className="text-sm text-slate-600 mt-0.5">{meta.description}</p>
          </div>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${colors.badge}`}>
          {meta.label}
        </span>
      </div>
    </div>
  );
}

function money(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value || 0));
}

function percent(value) {
  return `${Number(value || 0).toFixed(2)}%`;
}

// Converte ISO (YYYY-MM-DD) → exibição (DD/MM/AAAA)
function isoToDisplay(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

// Converte exibição (DD/MM/AAAA) → ISO (YYYY-MM-DD) para salvar
function displayToIso(display) {
  if (!display) return '';
  const digits = display.replace(/\D/g, '');
  if (digits.length === 8) {
    return `${digits.slice(4, 8)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`;
  }
  return '';
}

// Aplica máscara DD/MM/AAAA enquanto o usuário digita
function maskDate(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

// Aceita faixas progressivas em formato simples: "50, 55, 60"
// Mantem compatibilidade com JSON legado.
function parseProgressiveRangesInput(raw) {
  const text = String(raw || '').trim();
  if (!text || text === '[]') return [];

  // Compatibilidade: aceita JSON antigo.
  if (text.startsWith('[')) {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (_err) {
      throw new Error('Faixas progressivas invalidas. Informe valores separados por virgula (ex.: 50, 55, 60).');
    }

    if (!Array.isArray(parsed)) {
      throw new Error('Faixas progressivas invalidas. Informe valores separados por virgula (ex.: 50, 55, 60).');
    }

    return parsed
      .map((item) => {
        if (typeof item === 'number') return Number(item);
        if (item && typeof item === 'object' && item.percentage != null) return Number(item.percentage);
        return NaN;
      })
      .filter((n) => Number.isFinite(n));
  }

  const values = text
    .split(/[;,\n]/)
    .map((part) => Number(String(part).trim().replace(',', '.')))
    .filter((n) => Number.isFinite(n));

  if (!values.length) {
    throw new Error('Faixas progressivas invalidas. Informe valores separados por virgula (ex.: 50, 55, 60).');
  }

  return values;
}

const sectionTitles = {
  'dashboard-executivo': 'Dashboard Executivo',
  'producao-medica': 'Produção Médica',
  'calculo-repasse': 'Cálculo de Repasse',
  regras: 'Regras de Repasse',
  'contas-pagar-medicas': 'Contas a Pagar Médicas',
  aprovacoes: 'Aprovações',
  'glosas-impacto': 'Glosas e Impacto',
  analytics: 'Analytics',
  rentabilidade: 'Rentabilidade Médica',
  simulacoes: 'Simulações',
  'contas-bancarias': 'Contas Bancárias',
  automacoes: 'Automações',
  auditoria: 'Auditoria',
};

export default function RepasseEnterprisePage() {
  const { section = 'dashboard-executivo', scope = null } = useParams();
  const { clinicId } = useClinicContext();
  const { user } = useAuth();

  const actorId = useMemo(() => {
    if (user?.id) {
      return user.id;
    }

    try {
      const raw = localStorage.getItem('gesclinic_session');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.user_id || parsed?.id || null;
    } catch (_err) {
      return null;
    }
  }, [user?.id]);

  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [dashboard, setDashboard] = useState(null);
  const [production, setProduction] = useState([]);
  const [productionPeriod, setProductionPeriod] = useState({ start: '', end: '' });
  const [productionFilters, setProductionFilters] = useState({
    professionalId: '',
    specialty: '',
    unitId: '',
    convenioId: '',
    procedureId: '',
    status: '',
  });
  const [calculations, setCalculations] = useState([]);
  const [payables, setPayables] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [rules, setRules] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [forecasts, setForecasts] = useState([]);
  const [rentability, setRentability] = useState({ top20: [], bottom20: [], by_professional: [] });
  const [simulationHistory, setSimulationHistory] = useState([]);
  const [auditRows, setAuditRows] = useState([]);
  const [calculationAuditRows, setCalculationAuditRows] = useState([]);

  // Lookups para os selects das regras
  const [lookupProfessionals, setLookupProfessionals] = useState([]);
  const [lookupSpecialties, setLookupSpecialties] = useState([]);
  const [lookupConvenios, setLookupConvenios] = useState([]);
  const [lookupServices, setLookupServices] = useState([]);

  useEffect(() => {
    if (!clinicId) return;
    Promise.all([
      supabase.from('professionals').select('id, name, specialization').eq('clinic_id', clinicId).order('name'),
      supabase.from('health_insurances').select('id, name').eq('clinic_id', clinicId).order('name'),
      supabase.from('services').select('id, name').eq('clinic_id', clinicId).order('name'),
    ]).then(([profsRes, conveniosRes, servicesRes]) => {
      const profs = profsRes.data || [];
      setLookupProfessionals(profs);
      const specs = [...new Set(profs.map((p) => p.specialization).filter(Boolean))].sort();
      setLookupSpecialties(specs);
      setLookupConvenios(conveniosRes.data || []);
      setLookupServices(servicesRes.data || []);
    });
  }, [clinicId]);

  const [ruleForm, setRuleForm] = useState({
    name: '',
    rule_type: scope || 'individual',
    professional_id: '',
    specialty: '',
    convenio_id: '',
    procedure_id: '',
    percentage: '',
    fixed_value: '',
    progressive_ranges: '',
    applies_to: 'recebido',
    ceiling_value: '',
    floor_value: '',
    valid_from: '',
    valid_to: '',
    priority: '100',
    notes: '',
  });
  const [progressiveRangeDraft, setProgressiveRangeDraft] = useState({ from: '', to: '', percentage: '' });
  const [progressiveRanges, setProgressiveRanges] = useState([]);
  const [editingProgressiveRangeIndex, setEditingProgressiveRangeIndex] = useState(null);

  const sortProgressiveRanges = (ranges) => (
    [...ranges].sort((a, b) => {
      const fromA = a.from == null ? Number.NEGATIVE_INFINITY : Number(a.from);
      const fromB = b.from == null ? Number.NEGATIVE_INFINITY : Number(b.from);
      return fromA - fromB;
    })
  );

  const validateProgressiveRanges = (ranges) => {
    for (let i = 1; i < ranges.length; i += 1) {
      const prev = ranges[i - 1];
      const current = ranges[i];

      // Trabalha em centavos para evitar ruído de ponto flutuante.
      const prevToCents = prev.to == null ? null : Math.round(Number(prev.to) * 100);
      const currentFromCents = current.from == null ? null : Math.round(Number(current.from) * 100);

      if (prev.to != null && current.from != null && Number(current.from) <= Number(prev.to)) {
        return `Faixas sobrepostas entre ${money(prev.from ?? 0)}-${money(prev.to)} e ${money(current.from)}-${current.to != null ? money(current.to) : 'Sem limite'}.`;
      }

      if (prevToCents != null && currentFromCents != null) {
        const expectedNextFromCents = prevToCents + 1;
        if (currentFromCents > expectedNextFromCents) {
          return `Ha lacuna entre faixas. A proxima faixa deve iniciar em ${money(expectedNextFromCents / 100)}.`;
        }
      }
    }
    return null;
  };

  const addProgressiveRange = () => {
    const fromValue = progressiveRangeDraft.from === '' ? null : Number(String(progressiveRangeDraft.from).replace(',', '.'));
    const toValue = progressiveRangeDraft.to === '' ? null : Number(String(progressiveRangeDraft.to).replace(',', '.'));
    const percentageValue = Number(String(progressiveRangeDraft.percentage).replace(',', '.'));

    if (!Number.isFinite(percentageValue)) {
      setError('Informe o percentual da faixa para incluir.');
      return;
    }

    if ((fromValue != null && !Number.isFinite(fromValue)) || (toValue != null && !Number.isFinite(toValue))) {
      setError('Valores de inicio/fim da faixa invalidos.');
      return;
    }

    if (fromValue != null && toValue != null && fromValue > toValue) {
      setError('Na faixa progressiva, o valor inicial nao pode ser maior que o valor final.');
      return;
    }

    setError(null);
    const nextRange = {
      from: fromValue,
      to: toValue,
      percentage: percentageValue,
    };

    if (editingProgressiveRangeIndex != null) {
      const updated = progressiveRanges.map((range, idx) => (idx === editingProgressiveRangeIndex ? nextRange : range));
      const sorted = sortProgressiveRanges(updated);
      const overlapError = validateProgressiveRanges(sorted);
      if (overlapError) {
        setError(overlapError);
        return;
      }
      setProgressiveRanges(sorted);
      setEditingProgressiveRangeIndex(null);
    } else {
      const updated = [...progressiveRanges, nextRange];
      const sorted = sortProgressiveRanges(updated);
      const overlapError = validateProgressiveRanges(sorted);
      if (overlapError) {
        setError(overlapError);
        return;
      }
      setProgressiveRanges(sorted);
    }

    setProgressiveRangeDraft({ from: '', to: '', percentage: '' });
  };

  const editProgressiveRangeAt = (index) => {
    const selected = progressiveRanges[index];
    if (!selected) return;
    setProgressiveRangeDraft({
      from: selected.from != null ? String(selected.from).replace('.', ',') : '',
      to: selected.to != null ? String(selected.to).replace('.', ',') : '',
      percentage: selected.percentage != null ? String(selected.percentage).replace('.', ',') : '',
    });
    setEditingProgressiveRangeIndex(index);
    setError(null);
  };

  const removeProgressiveRangeAt = (index) => {
    setProgressiveRanges((prev) => prev.filter((_, idx) => idx !== index));
    setEditingProgressiveRangeIndex((current) => {
      if (current == null) return null;
      if (current === index) return null;
      if (current > index) return current - 1;
      return current;
    });
  };

  const cancelEditProgressiveRange = () => {
    setEditingProgressiveRangeIndex(null);
    setProgressiveRangeDraft({ from: '', to: '', percentage: '' });
    setError(null);
  };

  const { periodStart, periodEnd } = useMemo(() => getPeriodDates(month, year), [month, year]);

  useEffect(() => {
    setProductionPeriod({ start: periodStart, end: periodEnd });
    setRuleForm((prev) => ({
      ...prev,
      valid_from: prev.valid_from || periodStart,
      rule_type: scope || prev.rule_type || 'individual',
    }));
  }, [periodStart, periodEnd, scope]);

  useEffect(() => {
    if (!clinicId) {
      return;
    }

    loadSection();
  }, [clinicId, section, scope, month, year, productionFilters, productionPeriod]);

  const loadSection = async () => {
    setLoading(true);
    setError(null);

    try {
      if (section === 'dashboard-executivo' || section === 'analytics') {
        const [dash, calc] = await Promise.all([
          getExecutiveDashboard({ clinicId, referenceMonth: month, referenceYear: year }),
          listRepasseCalculations(clinicId, month, year),
        ]);
        setDashboard(dash);
        setCalculations(calc);
      }

      if (section === 'producao-medica') {
        const rows = await listMedicalProduction({
          clinicId,
          periodStart: productionPeriod.start || periodStart,
          periodEnd: productionPeriod.end || periodEnd,
          professionalId: productionFilters.professionalId || undefined,
          specialty: productionFilters.specialty || undefined,
          unitId: productionFilters.unitId || undefined,
          convenioId: productionFilters.convenioId || undefined,
          procedureId: productionFilters.procedureId || undefined,
          status: productionFilters.status || undefined,
        });
        setProduction(rows);
      }

      if (section === 'calculo-repasse') {
        const [rows, audits] = await Promise.all([
          listRepasseCalculations(clinicId, month, year),
          listRepasseAudit(clinicId, 500),
        ]);
        setCalculations(rows);
        setCalculationAuditRows(
          (audits || []).filter((row) =>
            row.entity === 'medical_repasse_calculations' || row.action === 'STATUS_TRANSITION',
          ),
        );
      }

      if (section === 'regras') {
        const rows = await listRepasseRules(clinicId, scope || null);
        setRules(rows);
      }

      if (section === 'contas-pagar-medicas') {
        const rows = await listMedicalPayables(clinicId, month, year);
        setPayables(rows);
      }

      if (section === 'aprovacoes') {
        const rows = await listApprovalWorkflow(clinicId, month, year);
        setApprovals(rows);
      }

      if (section === 'glosas-impacto') {
        const dash = await getExecutiveDashboard({ clinicId, referenceMonth: month, referenceYear: year });
        setDashboard(dash);
      }

      if (section === 'rentabilidade') {
        const rows = await getMedicalRentability(clinicId, month, year);
        setRentability(rows);
      }

      if (section === 'simulacoes') {
        const [history, calc, forecastRows] = await Promise.all([
          listSimulationHistory(clinicId, month, year),
          listRepasseCalculations(clinicId, month, year),
          listRepasseForecasts(clinicId, month, year),
        ]);
        setSimulationHistory(history);
        setCalculations(calc);
        setForecasts(forecastRows);
      }

      if (section === 'contas-bancarias') {
        const rows = await listMedicalRepasseBankAccounts(clinicId);
        setBankAccounts(rows);
      }

      if (section === 'auditoria') {
        const rows = await listRepasseAudit(clinicId);
        setAuditRows(rows);
      }
    } catch (err) {
      setError(err.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculate = async () => {
    try {
      setLoading(true);
      setError(null);
      await recalculateRepasse({
        clinicId,
        referenceMonth: month,
        referenceYear: year,
        actorId,
      });
      await loadSection();
    } catch (err) {
      setError(err.message || 'Erro ao recalcular repasse');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePayables = async () => {
    try {
      setLoading(true);
      setError(null);
      await generateMedicalPayables({
        clinicId,
        referenceMonth: month,
        referenceYear: year,
        actorId,
      });
      await loadSection();
    } catch (err) {
      setError(err.message || 'Erro ao gerar AP medico');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickApprove = async (approvalRow) => {
    const nextStatusByStage = {
      producao: 'provisionado',
      auditoria: 'aprovado',
      financeiro: 'liberado',
      diretoria: 'liberado',
      pagamento: 'pago',
    };

    const nextStatus = nextStatusByStage[String(approvalRow.stage || '').toLowerCase()] || 'aprovado';

    try {
      setLoading(true);
      setError(null);
      await approveCalculationStage({
        clinicId,
        calculationId: approvalRow.calculation_id,
        stage: approvalRow.stage,
        status: 'aprovado',
        observation: 'Aprovacao via modulo enterprise',
        actorId,
      });

      await transitionRepasseCalculationStatus({
        clinicId,
        calculationId: approvalRow.calculation_id,
        newStatus: nextStatus,
        actorId,
        observation: `Transicao automatica via etapa ${approvalRow.stage}`,
      });

      await loadSection();
    } catch (err) {
      setError(err.message || 'Erro ao aprovar etapa');
    } finally {
      setLoading(false);
    }
  };

  const handleTransition = async (calculationId, newStatus) => {
    try {
      setLoading(true);
      setError(null);
      await transitionRepasseCalculationStatus({
        clinicId,
        calculationId,
        newStatus,
        actorId,
        observation: `Acao manual no modulo enterprise (${newStatus})`,
      });
      await loadSection();
    } catch (err) {
      setError(err.message || `Erro ao transicionar status para ${newStatus}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRunSimulation = async (targetPercent) => {
    try {
      setLoading(true);
      setError(null);
      const result = await runRepasseSimulation({
        clinicId,
        referenceMonth: month,
        referenceYear: year,
        percentage: targetPercent,
        actorId,
      });

      if (result?.metadata?.persisted === false) {
        setSimulationHistory((prev) => [result, ...prev]);
        setError('Simulação executada em modo local (sem gravação no banco por política de acesso).');
        return;
      }

      await loadSection();
    } catch (err) {
      setError(err.message || 'Erro ao simular repasse');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRule = async () => {
    try {
      setLoading(true);
      setError(null);

      let progressiveRangesPayload = progressiveRanges.length
        ? progressiveRanges
        : parseProgressiveRangesInput(ruleForm.progressive_ranges);

      if (Array.isArray(progressiveRangesPayload) && progressiveRangesPayload.length > 0 && typeof progressiveRangesPayload[0] === 'object') {
        const sortedPayload = sortProgressiveRanges(progressiveRangesPayload);
        const overlapError = validateProgressiveRanges(sortedPayload);
        if (overlapError) {
          throw new Error(overlapError);
        }
        progressiveRangesPayload = sortedPayload;
      }

      await upsertRepasseRule(
        clinicId,
        {
          name: ruleForm.name,
          rule_type: ruleForm.rule_type,
          professional_id: ruleForm.professional_id || null,
          specialty: ruleForm.specialty || null,
          convenio_id: ruleForm.convenio_id || null,
          procedure_id: ruleForm.procedure_id || null,
          percentage: ruleForm.percentage === '' ? null : Number(ruleForm.percentage),
          fixed_value: ruleForm.fixed_value === '' ? null : Number(ruleForm.fixed_value),
          progressive_ranges: progressiveRangesPayload,
          applies_to: ruleForm.applies_to,
          ceiling_value: ruleForm.ceiling_value === '' ? null : Number(ruleForm.ceiling_value),
          floor_value: ruleForm.floor_value === '' ? null : Number(ruleForm.floor_value),
          valid_from: ruleForm.valid_from,
          valid_to: ruleForm.valid_to || null,
          priority: Number(ruleForm.priority || 100),
          notes: ruleForm.notes || null,
          is_active: true,
        },
        actorId,
      );

      setRuleForm((prev) => ({
        ...prev,
        name: '',
        professional_id: '',
        specialty: '',
        convenio_id: '',
        procedure_id: '',
        percentage: '',
        fixed_value: '',
        progressive_ranges: '',
        ceiling_value: '',
        floor_value: '',
        notes: '',
      }));
      setProgressiveRanges([]);
      setProgressiveRangeDraft({ from: '', to: '', percentage: '' });
      setEditingProgressiveRangeIndex(null);
      await loadSection();
    } catch (err) {
      setError(err.message || 'Erro ao criar regra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Modulo</p>
            <h2 className="text-xl font-semibold text-slate-900">{sectionTitles[section] || 'Repasse Medico'}</h2>
          </div>
          <div className="ml-auto flex flex-wrap items-end gap-2">
            <div>
              <label className="mb-1 block text-xs text-slate-600">Mes</label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {String(m).padStart(2, '0')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-600">Ano</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="h-9 w-24 rounded-md border border-slate-300 px-3 text-sm"
              />
            </div>
            <button
              onClick={loadSection}
              disabled={loading}
              className="h-9 rounded-md bg-slate-900 px-4 text-sm font-medium text-white disabled:opacity-50"
            >
              Atualizar
            </button>
          </div>
        </div>
      </div>

      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {loading && <div className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600">Carregando...</div>}

      {!loading && section === 'dashboard-executivo' && dashboard && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Producao do mes" value={money(dashboard.kpis.production_month)} />
            <KpiCard label="Receita produzida" value={money(dashboard.kpis.revenue_produced)} />
            <KpiCard label="Receita faturada" value={money(dashboard.kpis.revenue_billed)} />
            <KpiCard label="Receita recebida" value={money(dashboard.kpis.revenue_received)} />
            <KpiCard label="Repasse calculado" value={money(dashboard.kpis.repasse_calculated)} />
            <KpiCard label="Repasse provisionado" value={money(dashboard.kpis.repasse_provisioned)} />
            <KpiCard label="Repasse pago" value={money(dashboard.kpis.repasse_paid)} />
            <KpiCard label="Repasse pendente" value={money(dashboard.kpis.repasse_pending)} />
            <KpiCard label="Glosas" value={money(dashboard.kpis.glosa_amount)} />
            <KpiCard label="% Glosa" value={percent(dashboard.kpis.glosa_percentage)} />
            <KpiCard label="Medicos ativos" value={String(dashboard.kpis.active_doctors || 0)} />
            <KpiCard label="Ticket medio" value={money(dashboard.kpis.avg_ticket)} />
            <KpiCard label="Margem medica" value={money(dashboard.kpis.medical_margin)} />
            <KpiCard label="Rentabilidade media" value={money(dashboard.kpis.avg_profitability)} />
          </div>

          <SimpleTable
            title="Top Medicos"
            columns={['Profissional', 'Produzido', 'Repasse', 'Rentabilidade']}
            rows={(dashboard.charts.top_doctors || []).map((item) => [
              item.professional_id || 'N/A',
              money(item.produced),
              money(item.repasse),
              money(item.profitability),
            ])}
          />

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <SimpleTable
              title="Top Especialidades"
              columns={['Especialidade', 'Produzido']}
              rows={(dashboard.charts.top_specialties || []).map((item) => [item.specialty, money(item.amount)])}
            />
            <SimpleTable
              title="Top Convenios"
              columns={['Convenio', 'Produzido', 'Glosa']}
              rows={(dashboard.charts.top_convenios || []).map((item) => [
                item.convenio,
                money(item.produced),
                money(item.glosa),
              ])}
            />
            <SimpleTable
              title="Top Procedimentos"
              columns={['Procedimento', 'Produzido']}
              rows={(dashboard.charts.top_procedures || []).map((item) => [item.procedure, money(item.amount)])}
            />
            <SimpleTable
              title="Comparativo Mes Atual x Anterior"
              columns={['Indicador', 'Valor']}
              rows={[
                ['Receita Recebida (Atual)', money(dashboard.charts.month_compare?.current)],
                ['Referencia Mês Anterior', money(dashboard.charts.month_compare?.previous)],
              ]}
            />
          </div>

          <SimpleTable
            title="Evolucao Mensal (Recebido x Repasse)"
            columns={['Periodo', 'Recebido', 'Repasse Liquido', 'Repasse Bruto']}
            rows={(dashboard.charts.evolution_monthly || []).map((item) => [
              item.period,
              money(item.received),
              money(item.repasse),
              money(item.gross_repasse),
            ])}
          />

          <SimpleTable
            title="Repasse Pago por Periodo"
            columns={['Periodo', 'Pago']}
            rows={(dashboard.charts.repasse_paid_by_period || []).map((item) => [item.period, money(item.amount)])}
          />
        </div>
      )}

      {!loading && section === 'producao-medica' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Filtros da Producao Medica</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              <input
                type="date"
                value={productionPeriod.start}
                onChange={(e) => setProductionPeriod((prev) => ({ ...prev, start: e.target.value }))}
                className="h-9 rounded-md border border-slate-300 px-3 text-sm"
              />
              <input
                type="date"
                value={productionPeriod.end}
                onChange={(e) => setProductionPeriod((prev) => ({ ...prev, end: e.target.value }))}
                className="h-9 rounded-md border border-slate-300 px-3 text-sm"
              />
              <input
                value={productionFilters.professionalId}
                onChange={(e) => setProductionFilters((prev) => ({ ...prev, professionalId: e.target.value }))}
                placeholder="Medico (ID)"
                className="h-9 rounded-md border border-slate-300 px-3 text-sm"
              />
              <input
                value={productionFilters.specialty}
                onChange={(e) => setProductionFilters((prev) => ({ ...prev, specialty: e.target.value }))}
                placeholder="Especialidade"
                className="h-9 rounded-md border border-slate-300 px-3 text-sm"
              />
              <input
                value={productionFilters.unitId}
                onChange={(e) => setProductionFilters((prev) => ({ ...prev, unitId: e.target.value }))}
                placeholder="Unidade (ID)"
                className="h-9 rounded-md border border-slate-300 px-3 text-sm"
              />
              <input
                value={productionFilters.convenioId}
                onChange={(e) => setProductionFilters((prev) => ({ ...prev, convenioId: e.target.value }))}
                placeholder="Convenio (ID)"
                className="h-9 rounded-md border border-slate-300 px-3 text-sm"
              />
              <input
                value={productionFilters.procedureId}
                onChange={(e) => setProductionFilters((prev) => ({ ...prev, procedureId: e.target.value }))}
                placeholder="Procedimento (ID)"
                className="h-9 rounded-md border border-slate-300 px-3 text-sm"
              />
              <input
                value={productionFilters.status}
                onChange={(e) => setProductionFilters((prev) => ({ ...prev, status: e.target.value }))}
                placeholder="Status"
                className="h-9 rounded-md border border-slate-300 px-3 text-sm"
              />
            </div>
          </div>

          <SimpleTable
            title="Base Operacional de Producao"
            columns={[
              'Medico',
              'Paciente',
              'Convenio',
              'Procedimento',
              'Data',
              'Qtd',
              'Produzido',
              'Faturado',
              'Recebido',
              'Glosa',
              'Elegivel',
              'Status',
            ]}
            rows={production.map((row) => [
              row.professional_name,
              row.patient_name,
              row.convenio_name,
              row.procedure_name,
              row.date,
              row.quantity,
              money(row.produced_amount),
              money(row.billed_amount),
              money(row.received_amount),
              money(row.glosa_amount),
              money(row.eligible_amount),
              row.status || '-',
            ])}
          />
        </div>
      )}

      {!loading && section === 'calculo-repasse' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={handleRecalculate}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
            >
              Recalcular Periodo
            </button>
          </div>
          <SimpleTable
            title="Motor de Calculo Auditavel"
            columns={[
              'Profissional',
              'Produzido',
              'Recebido',
              'Glosa',
              'Base',
              'Percentual',
              'Repasse',
              'Descontos',
              'Liquido',
              'Status',
              'Acoes',
            ]}
            rows={calculations.map((row) => [
              row.professional_id,
              money(row.production_amount),
              money(row.received_amount),
              money(row.glosa_amount),
              money(row.base_amount),
              percent(row.percentage_applied),
              money(row.gross_repasse_amount),
              money(row.discounts_amount),
              money(row.net_repasse_amount),
              row.status,
              <div key={row.id} className="flex gap-1">
                <button
                  onClick={() => handleTransition(row.id, 'provisionado')}
                  className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white"
                >
                  Provisionar
                </button>
                <button
                  onClick={() => handleTransition(row.id, 'aprovado')}
                  className="rounded bg-indigo-600 px-2 py-1 text-xs font-medium text-white"
                >
                  Aprovar
                </button>
                <button
                  onClick={() => handleTransition(row.id, 'liberado')}
                  className="rounded bg-purple-600 px-2 py-1 text-xs font-medium text-white"
                >
                  Liberar
                </button>
                <button
                  onClick={() => handleTransition(row.id, 'pago')}
                  className="rounded bg-emerald-600 px-2 py-1 text-xs font-medium text-white"
                >
                  Pagar
                </button>
                <button
                  onClick={() => handleTransition(row.id, 'cancelado')}
                  className="rounded bg-rose-600 px-2 py-1 text-xs font-medium text-white"
                >
                  Cancelar
                </button>
              </div>,
            ])}
          />

          <SimpleTable
            title="Historico Completo de Auditoria"
            columns={['Data', 'Acao', 'Calculo', 'Usuario', 'De/Para', 'Observacao']}
            rows={calculationAuditRows.map((row) => [
              row.created_at || '-',
              row.action || '-',
              row.entity_id || '-',
              row.actor_id || '-',
              `${row.old_data?.status || '-'} -> ${row.new_data?.status || '-'}`,
              row.details?.observation || row.details?.approval_stage || '-',
            ])}
          />
        </div>
      )}

      {!loading && section === 'regras' && (
        <div className="space-y-4">
          <RulesScopeHeader scope={scope} />
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Cadastrar Regra de Repasse</h3>
              {scope && SCOPE_META[scope] && (
                <span className="text-xs text-slate-500">
                  {SCOPE_META[scope].icon} Campo principal: <strong>{SCOPE_META[scope].primaryField}</strong>
                  {' — '}{SCOPE_META[scope].hint}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="flex flex-col gap-1 xl:col-span-2">
                <label className="h-4 text-xs leading-4 text-slate-500">Nome da Regra *</label>
                <input
                  value={ruleForm.name}
                  onChange={(e) => setRuleForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Nome da Regra *"
                  className="h-9 rounded-md border border-slate-300 px-3 text-sm"
                />
                <span className="min-h-4 text-[11px] text-transparent select-none">.</span>
              </div>
              <div className="flex flex-col gap-1">
                <label className="h-4 text-xs leading-4 text-slate-500">Tipo de Regra</label>
                <select
                  value={ruleForm.rule_type}
                  onChange={(e) => setRuleForm((prev) => ({ ...prev, rule_type: e.target.value }))}
                  className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm"
                >
                  <option value="individual">Individual</option>
                  <option value="especialidade">Especialidade</option>
                  <option value="convenio">Convênio</option>
                  <option value="procedimento">Procedimento</option>
                </select>
                <span className="min-h-4 text-[11px] text-transparent select-none">.</span>
              </div>
              <div className="flex flex-col gap-1">
                <label className="h-4 text-xs leading-4 text-slate-500">Base de Cálculo</label>
                <select
                  value={ruleForm.applies_to}
                  onChange={(e) => setRuleForm((prev) => ({ ...prev, applies_to: e.target.value }))}
                  className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm"
                >
                  <optgroup label="Sobre o Líquido (recebido)">
                    <option value="recebido">% sobre o recebido</option>
                    <option value="liquido">% sobre o líquido</option>
                  </optgroup>
                  <optgroup label="Sobre o Bruto (produzido)">
                    <option value="bruto">% sobre o bruto</option>
                    <option value="produzido">% sobre o produzido</option>
                  </optgroup>
                  <optgroup label="Sobre o Faturado">
                    <option value="faturado">% sobre o faturado</option>
                  </optgroup>
                </select>
                <span className="min-h-4 text-[11px] text-transparent select-none">.</span>
              </div>

              {/* Campo principal destacado conforme escopo */}
              <div className="flex flex-col gap-1">
                <label className="h-4 text-xs leading-4 text-slate-500">Profissional {scope === 'individual' ? '*' : '(filtro opcional)'}</label>
                <select
                  value={ruleForm.professional_id}
                  onChange={(e) => setRuleForm((prev) => ({ ...prev, professional_id: e.target.value }))}
                  className={`h-9 rounded-md border px-3 text-sm bg-white ${scope === 'individual' ? 'border-blue-400 ring-1 ring-blue-300' : 'border-slate-300'}`}
                >
                  <option value="">Selecione</option>
                  {lookupProfessionals.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}{p.specialization ? ` — ${p.specialization}` : ''}</option>
                  ))}
                </select>
                <span className="min-h-4 text-[11px] text-transparent select-none">.</span>
              </div>
              <div className="flex flex-col gap-1">
                <label className="h-4 text-xs leading-4 text-slate-500">Especialidade {scope === 'especialidade' ? '*' : '(filtro opcional)'}</label>
                <select
                  value={ruleForm.specialty}
                  onChange={(e) => setRuleForm((prev) => ({ ...prev, specialty: e.target.value }))}
                  className={`h-9 rounded-md border px-3 text-sm bg-white ${scope === 'especialidade' ? 'border-purple-400 ring-1 ring-purple-300' : 'border-slate-300'}`}
                >
                  <option value="">Selecione</option>
                  {lookupSpecialties.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <span className="min-h-4 text-[11px] text-transparent select-none">.</span>
              </div>
              <div className="flex flex-col gap-1">
                <label className="h-4 text-xs leading-4 text-slate-500">Convênio {scope === 'convenio' ? '*' : '(filtro opcional)'}</label>
                <select
                  value={ruleForm.convenio_id}
                  onChange={(e) => setRuleForm((prev) => ({ ...prev, convenio_id: e.target.value }))}
                  className={`h-9 rounded-md border px-3 text-sm bg-white ${scope === 'convenio' ? 'border-emerald-400 ring-1 ring-emerald-300' : 'border-slate-300'}`}
                >
                  <option value="">Selecione</option>
                  {lookupConvenios.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <span className="min-h-4 text-[11px] text-transparent select-none">.</span>
              </div>
              <div className="flex flex-col gap-1">
                <label className="h-4 text-xs leading-4 text-slate-500">Procedimento {scope === 'procedimento' ? '*' : '(filtro opcional)'}</label>
                <select
                  value={ruleForm.procedure_id}
                  onChange={(e) => setRuleForm((prev) => ({ ...prev, procedure_id: e.target.value }))}
                  className={`h-9 rounded-md border px-3 text-sm bg-white ${scope === 'procedimento' ? 'border-orange-400 ring-1 ring-orange-300' : 'border-slate-300'}`}
                >
                  <option value="">Selecione</option>
                  {lookupServices.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <span className="min-h-4 text-[11px] text-transparent select-none">.</span>
              </div>

              <div className="flex flex-col gap-1">
                <label className="h-4 text-xs leading-4 text-slate-500">Percentual (%)</label>
                <input
                  value={ruleForm.percentage}
                  onChange={(e) => setRuleForm((prev) => ({ ...prev, percentage: e.target.value }))}
                  placeholder="Percentual (%)"
                  className="h-9 rounded-md border border-slate-300 px-3 text-sm"
                />
                <span className="min-h-4 text-[11px] text-transparent select-none">.</span>
              </div>
              <div className="flex flex-col gap-1">
                <label className="h-4 text-xs leading-4 text-slate-500">Valor fixo (R$)</label>
                <input
                  value={ruleForm.fixed_value}
                  onChange={(e) => setRuleForm((prev) => ({ ...prev, fixed_value: e.target.value }))}
                  placeholder="Valor fixo (R$)"
                  className="h-9 rounded-md border border-slate-300 px-3 text-sm"
                />
                <span className="min-h-4 text-[11px] text-transparent select-none">.</span>
              </div>
              <div className="flex flex-col gap-1">
                <label className="h-4 text-xs leading-4 text-slate-500">Piso (R$)</label>
                <input
                  value={ruleForm.floor_value}
                  onChange={(e) => setRuleForm((prev) => ({ ...prev, floor_value: e.target.value }))}
                  placeholder="Piso (R$)"
                  className="h-9 rounded-md border border-slate-300 px-3 text-sm"
                />
                <span className="min-h-4 text-[11px] text-slate-400">Valor minimo de repasse a pagar, mesmo com calculo menor.</span>
              </div>
              <div className="flex flex-col gap-1">
                <label className="h-4 text-xs leading-4 text-slate-500">Teto (R$)</label>
                <input
                  value={ruleForm.ceiling_value}
                  onChange={(e) => setRuleForm((prev) => ({ ...prev, ceiling_value: e.target.value }))}
                  placeholder="Teto (R$)"
                  className="h-9 rounded-md border border-slate-300 px-3 text-sm"
                />
                <span className="min-h-4 text-[11px] text-slate-400">Valor maximo de repasse a pagar, mesmo com calculo maior.</span>
              </div>

              <div className="flex flex-col gap-1">
                <label className="h-4 text-xs leading-4 text-slate-500">Vigência início *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={isoToDisplay(ruleForm.valid_from)}
                  onChange={(e) => {
                    const masked = maskDate(e.target.value);
                    setRuleForm((prev) => ({ ...prev, valid_from: displayToIso(masked) || prev.valid_from }));
                  }}
                  onBlur={(e) => {
                    const iso = displayToIso(e.target.value);
                    if (iso) setRuleForm((prev) => ({ ...prev, valid_from: iso }));
                  }}
                  placeholder="dd/mm/aaaa"
                  maxLength={10}
                  className="h-9 rounded-md border border-slate-300 px-3 text-sm"
                />
                <span className="min-h-4 text-[11px] text-transparent select-none">.</span>
              </div>
              <div className="flex flex-col gap-1">
                <label className="h-4 text-xs leading-4 text-slate-500">Vigência fim (opcional)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={isoToDisplay(ruleForm.valid_to)}
                  onChange={(e) => {
                    const masked = maskDate(e.target.value);
                    setRuleForm((prev) => ({ ...prev, valid_to: displayToIso(masked) || '' }));
                  }}
                  onBlur={(e) => {
                    const iso = displayToIso(e.target.value);
                    setRuleForm((prev) => ({ ...prev, valid_to: iso || '' }));
                  }}
                  placeholder="dd/mm/aaaa"
                  maxLength={10}
                  className="h-9 rounded-md border border-slate-300 px-3 text-sm"
                />
                <span className="min-h-4 text-[11px] text-transparent select-none">.</span>
              </div>
              <div className="flex flex-col gap-1">
                <label className="h-4 text-xs leading-4 text-slate-500">Prioridade da regra</label>
                <input
                  value={ruleForm.priority}
                  onChange={(e) => setRuleForm((prev) => ({ ...prev, priority: e.target.value }))}
                  placeholder="Ex: 100"
                  className="h-9 rounded-md border border-slate-300 px-3 text-sm"
                />
                <span className="min-h-4 text-[11px] text-slate-400">Define qual regra vence conflito: menor numero aplica primeiro.</span>
              </div>
              <div className="flex flex-col gap-1">
                <label className="h-4 text-xs leading-4 text-slate-500">Observações (opcional)</label>
                <input
                  value={ruleForm.notes}
                  onChange={(e) => setRuleForm((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Observações"
                  className="h-9 rounded-md border border-slate-300 px-3 text-sm"
                />
                <span className="min-h-4 text-[11px] text-transparent select-none">.</span>
              </div>

              <div className="flex flex-col gap-1 md:col-span-2 xl:col-span-2">
                <label className="h-4 text-xs leading-4 text-slate-500">Faixas progressivas (opcional)</label>

                <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_1fr_auto]">
                  <input
                    type="text"
                    value={progressiveRangeDraft.from}
                    onChange={(e) => setProgressiveRangeDraft((prev) => ({ ...prev, from: e.target.value }))}
                    placeholder="De (R$)"
                    className="h-9 rounded-md border border-slate-300 px-3 text-sm"
                  />
                  <input
                    type="text"
                    value={progressiveRangeDraft.to}
                    onChange={(e) => setProgressiveRangeDraft((prev) => ({ ...prev, to: e.target.value }))}
                    placeholder="Até (R$)"
                    className="h-9 rounded-md border border-slate-300 px-3 text-sm"
                  />
                  <input
                    type="text"
                    value={progressiveRangeDraft.percentage}
                    onChange={(e) => setProgressiveRangeDraft((prev) => ({ ...prev, percentage: e.target.value }))}
                    placeholder="Percentual (%)"
                    className="h-9 rounded-md border border-slate-300 px-3 text-sm"
                  />
                  <button
                    type="button"
                    onClick={addProgressiveRange}
                    className="h-9 rounded-md bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    {editingProgressiveRangeIndex != null ? 'Salvar Edição' : 'Incluir Faixa'}
                  </button>
                </div>

                {editingProgressiveRangeIndex != null && (
                  <div className="mt-1">
                    <button
                      type="button"
                      onClick={cancelEditProgressiveRange}
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      Cancelar Edição
                    </button>
                  </div>
                )}

                {progressiveRanges.length > 0 && (
                  <div className="mt-2 space-y-1 rounded-md border border-slate-200 bg-slate-50 p-2">
                    {progressiveRanges.map((range, idx) => (
                      <div key={`${range.from ?? 'null'}-${range.to ?? 'null'}-${range.percentage}-${idx}`} className="flex items-center justify-between rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700">
                        <span>
                          Faixa {idx + 1}: {range.from != null ? money(range.from) : 'Sem inicio'} ate {range.to != null ? money(range.to) : 'Sem limite'} - {percent(range.percentage)}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => editProgressiveRangeAt(idx)}
                            className="rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs text-blue-700 hover:bg-blue-100"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => removeProgressiveRangeAt(idx)}
                            className="rounded border border-red-200 bg-red-50 px-2 py-0.5 text-xs text-red-700 hover:bg-red-100"
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <span className="min-h-4 text-[11px] text-slate-400">Use Incluir Faixa para adicionar e Excluir para remover cada faixa progressiva.</span>
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => {
                  setRuleForm({ name: '', rule_type: scope || 'individual', professional_id: '', specialty: '', convenio_id: '', procedure_id: '', percentage: '', fixed_value: '', progressive_ranges: '', applies_to: 'recebido', ceiling_value: '', floor_value: '', valid_from: periodStart, valid_to: '', priority: '100', notes: '' });
                  setProgressiveRanges([]);
                  setProgressiveRangeDraft({ from: '', to: '', percentage: '' });
                  setEditingProgressiveRangeIndex(null);
                }}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
              >
                Limpar
              </button>
              <button
                onClick={handleCreateRule}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
              >
                Salvar Regra
              </button>
            </div>
          </div>

          <SimpleTable
            title={`Regras Cadastradas — ${SCOPE_META[scope || 'individual']?.label || scope || 'Todas'}`}
            columns={['Nome', 'Médico', 'Especialidade', 'Convênio', 'Procedimento', 'Base Cálculo', 'Percentual', 'Valor Fixo', 'Piso', 'Teto', 'Prioridade', 'Vigência Início', 'Vigência Fim', 'Ativa']}
            rows={rules.filter((r) => !scope || r.rule_type === scope).map((row) => {
              const profName = lookupProfessionals.find((p) => p.id === row.professional_id)?.name || row.professional_id || '-';
              const convenioName = lookupConvenios.find((c) => c.id === row.convenio_id)?.name || row.convenio_id || '-';
              const serviceName = lookupServices.find((s) => s.id === row.procedure_id)?.name || row.procedure_id || '-';
              return [
                row.name || '-',
                row.professional_id ? profName : '-',
                row.specialty || '-',
                row.convenio_id ? convenioName : '-',
                row.procedure_id ? serviceName : '-',
                row.applies_to || '-',
                row.percentage != null ? percent(row.percentage) : '-',
                row.fixed_value != null ? money(row.fixed_value) : '-',
                row.floor_value != null ? money(row.floor_value) : '-',
                row.ceiling_value != null ? money(row.ceiling_value) : '-',
                row.priority ?? '-',
                row.valid_from || '-',
                row.valid_to || 'Sem fim',
                row.is_active !== false ? '✓ Sim' : '✗ Não',
              ];
            })}
          />
        </div>
      )}

      {!loading && section === 'contas-pagar-medicas' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={handleGeneratePayables}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
            >
              Gerar AP Medica
            </button>
          </div>
          <SimpleTable
            title="Contas a Pagar Medicas"
            columns={['Médico', 'Competência', 'Valor', 'Vencimento', 'Status AP', 'Status Repasse', 'Banco', 'PIX', 'Conta Financeira', 'Centro de Custo']}
            rows={payables.map((row) => [
              row.professional_id || '-',
              row.reference_month && row.reference_year
                ? `${String(row.reference_month).padStart(2, '0')}/${row.reference_year}`
                : (row.competency_date || '-'),
              money(row.net_amount || row.amount),
              row.due_date || '-',
              row.status || '-',
              row.repasse_status || '-',
              row.bank_name || row.bank || '-',
              row.pix_key || '-',
              row.financial_account_id || '-',
              row.repasse_cost_center_id || '-',
            ])}
          />
        </div>
      )}

      {!loading && section === 'aprovacoes' && (
        <SimpleTable
          title="Workflow de Aprovacao"
          columns={['Calculo', 'Etapa', 'Status', 'Usuario', 'Data', 'Acao']}
          rows={approvals.map((row) => [
            row.calculation_id,
            row.stage,
            row.status,
            row.approved_by || '-',
            row.approved_at || '-',
            <button
              key={row.id}
              onClick={() => handleQuickApprove(row)}
              className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white"
            >
              Aprovar
            </button>,
          ])}
        />
      )}

      {!loading && section === 'glosas-impacto' && dashboard && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <KpiCard label="Valor total de glosa" value={money(dashboard.kpis.glosa_amount)} />
          <KpiCard label="Impacto percentual" value={percent(dashboard.kpis.glosa_percentage)} />
          <SimpleTable
            title="Glosa por Convenio"
            columns={['Convenio', 'Produzido', 'Glosa']}
            rows={(dashboard.charts.glosa_by_convenio || []).map((row) => [
              row.convenio,
              money(row.produced),
              money(row.glosa),
            ])}
          />
          <SimpleTable
            title="Impacto por Medico"
            columns={['Profissional', 'Rentabilidade']}
            rows={(dashboard.charts.glosa_by_doctor || []).map((row) => [
              row.professional_id || 'N/A',
              money(row.profitability),
            ])}
          />
        </div>
      )}

      {!loading && section === 'analytics' && dashboard && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <KpiCard label="Receita" value={money(dashboard.kpis.revenue_received)} />
            <KpiCard label="Repasse" value={money(dashboard.kpis.repasse_calculated)} />
            <KpiCard label="Margem" value={money(dashboard.kpis.medical_margin)} />
          </div>
          <SimpleTable
            title="Top Especialidades"
            columns={['Especialidade', 'Receita']}
            rows={(dashboard.charts.top_specialties || []).map((row) => [row.specialty, money(row.amount)])}
          />
          <SimpleTable
            title="Top Procedimentos"
            columns={['Procedimento', 'Receita']}
            rows={(dashboard.charts.top_procedures || []).map((row) => [row.procedure, money(row.amount)])}
          />
        </div>
      )}

      {!loading && section === 'rentabilidade' && (
        <div className="space-y-4">
          <SimpleTable
            title="Top 20 Lucrativos"
            columns={['Profissional', 'Recebido', 'Repasse', 'Margem']}
            rows={(rentability.top20 || []).map((row) => [
              row.professional_id,
              money(row.received_amount),
              money(row.net_repasse_amount),
              money(row.margin),
            ])}
          />
          <SimpleTable
            title="Bottom 20 Lucrativos"
            columns={['Profissional', 'Recebido', 'Repasse', 'Margem']}
            rows={(rentability.bottom20 || []).map((row) => [
              row.professional_id,
              money(row.received_amount),
              money(row.net_repasse_amount),
              money(row.margin),
            ])}
          />
        </div>
      )}

      {!loading && section === 'simulacoes' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {[40, 50, 60, 70, 80, 90].map((target) => (
              <button
                key={target}
                onClick={() => handleRunSimulation(target)}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800"
              >
                Simular {target}%
              </button>
            ))}
          </div>
          <SimpleTable
            title="Historico de Simulacoes"
            columns={[
              'Cenario',
              'Percentual',
              'Base Receita',
              'Repasse Simulado',
              'Impacto DRE',
              'Impacto EBITDA',
              'Impacto Lucro Liquido',
            ]}
            rows={simulationHistory.map((row) => [
              row.scenario_name,
              percent(row.repasse_percentage),
              money(row.revenue_base),
              money(row.simulated_repasse),
              money(row.dre_impact),
              money(row.ebitda_impact),
              money(row.net_income_impact),
            ])}
          />

          <SimpleTable
            title="Fluxo de Caixa Projetado (30/60/90/180/365 dias)"
            columns={['Horizon (dias)', 'Projetado', 'Status']}
            rows={[30, 60, 90, 180, 365].map((h) => {
              const total = forecasts
                .filter((row) => Number(row.horizon_days) === h)
                .reduce((sum, row) => sum + Number(row.projected_amount || 0), 0);
              const statuses = Array.from(new Set(forecasts
                .filter((row) => Number(row.horizon_days) === h)
                .map((row) => row.status || 'projetado'))).join(', ') || 'projetado';
              return [String(h), money(total), statuses];
            })}
          />
        </div>
      )}

      {!loading && section === 'contas-bancarias' && (
        <SimpleTable
          title="Contas Bancarias para Repasse"
          columns={['Banco', 'Agencia', 'Conta', 'PIX', 'Titular', 'Status']}
          rows={bankAccounts.map((row) => [
            row.bank_name,
            row.agency,
            row.account_number,
            row.pix_key || '-',
            row.holder_name || '-',
            row.is_active === false ? 'Inativo' : 'Ativo',
          ])}
        />
      )}

      {!loading && section === 'automacoes' && (
        <AutomacoesPanel clinicId={clinicId} actorId={actorId} />
      )}

      {!loading && section === 'auditoria' && (
        <SimpleTable
          title="Auditoria Completa"
          columns={['Data', 'Entidade', 'Acao', 'Usuario', 'ID Entidade', 'Detalhes']}
          rows={auditRows.map((row) => [
            row.created_at,
            row.entity,
            row.action,
            row.actor_id || '-',
            row.entity_id || '-',
            JSON.stringify(row.details || {}),
          ])}
        />
      )}
    </div>
  );
}

// =============================================================================
// Componente de Automações Enterprise
// =============================================================================
const AUTOMATION_DEFS = [
  {
    id: 'fechar_repasse',
    icon: '📅',
    title: 'Fechar Repasse Automaticamente',
    description: 'Encerra o cálculo de repasse no dia configurado de cada mês.',
    configKey: 'dia_fechamento',
    configLabel: 'Dia do mês para fechamento',
    color: 'blue',
  },
  {
    id: 'gerar_ap_medica',
    icon: '📋',
    title: 'Gerar Contas a Pagar Médicas',
    description: 'Cria automaticamente os registros de AP após o fechamento do repasse.',
    configKey: 'dia_geracao_ap',
    configLabel: 'Dia do mês para geração de AP',
    color: 'indigo',
  },
  {
    id: 'enviar_aprovacao',
    icon: '✅',
    title: 'Enviar para Aprovação',
    description: 'Encaminha o repasse ao fluxo de aprovação automaticamente após cálculo.',
    configKey: null,
    configLabel: null,
    color: 'purple',
  },
  {
    id: 'gerar_pix',
    icon: '💳',
    title: 'Gerar PIX',
    description: 'Cria as chaves PIX/QR Code para pagamento dos profissionais.',
    configKey: 'dia_pix',
    configLabel: 'Dia do mês para geração de PIX',
    color: 'emerald',
  },
  {
    id: 'enviar_comprovante',
    icon: '📄',
    title: 'Enviar Comprovante',
    description: 'Envia o comprovante de pagamento ao profissional após a transferência.',
    configKey: null,
    configLabel: null,
    color: 'teal',
  },
  {
    id: 'enviar_email',
    icon: '📧',
    title: 'Enviar E-mail',
    description: 'Notifica o profissional por e-mail sobre o valor do repasse e vencimento.',
    configKey: null,
    configLabel: null,
    color: 'sky',
  },
  {
    id: 'lembrar_aprovacao_pendente',
    icon: '🔔',
    title: 'Lembrar Aprovação Pendente',
    description: 'Dispara lembrete quando há repasse aguardando aprovação há mais de X dias.',
    configKey: 'dias_lembrete',
    configLabel: 'Dias sem aprovação para lembrar',
    color: 'yellow',
  },
];

const colorMap = {
  blue: 'border-blue-200 bg-blue-50',
  indigo: 'border-indigo-200 bg-indigo-50',
  purple: 'border-purple-200 bg-purple-50',
  emerald: 'border-emerald-200 bg-emerald-50',
  teal: 'border-teal-200 bg-teal-50',
  sky: 'border-sky-200 bg-sky-50',
  yellow: 'border-yellow-200 bg-yellow-50',
};

function AutomacoesPanel({ clinicId, actorId }) {
  const [enabled, setEnabled] = React.useState({});
  const [config, setConfig] = React.useState({
    dia_fechamento: 28,
    dia_geracao_ap: 29,
    dia_pix: 30,
    dias_lembrete: 3,
    modo_teste: true,
  });
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [logs] = React.useState([]);

  const toggle = (id) => setEnabled((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">⚡ Automações de Repasse Médico</h3>
            <p className="mt-1 text-sm text-slate-600">
              Configure processos automáticos para fechamento, geração de AP, pagamentos e notificações.
            </p>
          </div>
          <button
            onClick={() => setConfig((p) => ({ ...p, modo_teste: !p.modo_teste }))}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
              config.modo_teste
                ? 'border-yellow-300 bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                : 'border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
            }`}
          >
            {config.modo_teste ? '🧪 Modo Teste — Clique para Produção' : '✅ Produção — Clique para Teste'}
          </button>
        </div>
      </div>

      {/* Modo Teste Banner — informativo, sem botão (controle está no header) */}
      {config.modo_teste && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 flex items-start gap-3">
          <span className="text-yellow-600 text-lg mt-0.5">⚠️</span>
          <div>
            <p className="text-sm font-medium text-yellow-900">Modo Teste Ativo</p>
            <p className="text-xs text-yellow-800 mt-0.5">Automações não executarão de verdade. Use o botão no cabeçalho acima para ativar o modo Produção.</p>
          </div>
        </div>
      )}

      {/* Cards de Automação */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {AUTOMATION_DEFS.map((def) => (
          <div key={def.id} className={`rounded-lg border ${colorMap[def.color] || 'border-slate-200 bg-white'} p-4`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                <span className="text-2xl leading-none mt-0.5">{def.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">{def.title}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{def.description}</p>

                  {enabled[def.id] && def.configKey && (
                    <div className="mt-3 flex items-center gap-2">
                      <label className="text-xs text-slate-600 shrink-0">{def.configLabel}:</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={config[def.configKey] ?? ''}
                        onChange={(e) => setConfig((p) => ({ ...p, [def.configKey]: Number(e.target.value) }))}
                        className="h-7 w-16 rounded border border-slate-300 px-2 text-sm"
                      />
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => toggle(def.id)}
                className={`shrink-0 h-6 w-11 rounded-full transition-colors ${enabled[def.id] ? 'bg-emerald-500' : 'bg-slate-300'}`}
              >
                <span className={`block h-5 w-5 rounded-full bg-white shadow transition-transform mx-0.5 ${enabled[def.id] ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Logs */}
      {logs.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-900">📋 Histórico de Execuções</p>
          </div>
          <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
            {logs.map((log, idx) => (
              <div key={idx} className="flex items-center gap-3 px-4 py-2 text-sm">
                <span className={`h-2 w-2 rounded-full shrink-0 ${log.status === 'sucesso' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                <span className="flex-1 text-slate-700">{log.evento}</span>
                <span className="text-xs text-slate-400">{log.data}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Salvar */}
      <div className="flex justify-end gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-slate-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? 'Salvando…' : saved ? '✓ Salvo' : 'Salvar Configuração'}
        </button>
      </div>
    </div>
  );
}

function KpiCard({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function SimpleTable({ title, columns, rows }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </div>
      <div className="max-h-[70vh] overflow-auto">
        <table className="w-full min-w-[900px] table-auto text-sm">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((col) => (
                <th key={col} className="whitespace-nowrap px-3 py-2 text-left font-medium text-slate-700">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!rows.length && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-6 text-center text-slate-500">
                  Sem dados para exibir
                </td>
              </tr>
            )}
            {rows.map((row, idx) => (
              <tr key={idx} className="border-t border-slate-100">
                {row.map((cell, cidx) => (
                  <td key={`${idx}-${cidx}`} className="whitespace-nowrap px-3 py-2 text-slate-700">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
