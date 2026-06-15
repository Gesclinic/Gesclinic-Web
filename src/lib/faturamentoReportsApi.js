import { supabase } from './customSupabaseClient';

function inRange(value, startDate, endDate) {
  if (!value) return false;
  const date = String(value).slice(0, 10);
  return (!startDate || date >= startDate) && (!endDate || date <= endDate);
}

function invoiceDate(row) {
  return row.competency_date || row.due_date || row.invoice_date || row.created_at;
}

function guideDate(row) {
  return row.data_criacao || row.data_envio || row.data_atualizacao;
}

function money(value) {
  return Number(value || 0) || 0;
}

function normalizeStatus(status) {
  const text = String(status || '').toLowerCase();
  if (['received', 'paid', 'pago', 'recebido'].some((item) => text.includes(item))) return 'Pago';
  if (['glossed', 'glosado', 'glosa'].some((item) => text.includes(item))) return 'Glosado';
  if (['sent', 'enviado'].some((item) => text.includes(item))) return 'Enviado';
  if (['xml'].some((item) => text.includes(item))) return 'XML Gerado';
  if (['closed', 'fechado'].some((item) => text.includes(item))) return 'Fechado';
  if (['processing', 'processado', 'retornado'].some((item) => text.includes(item))) return 'Processado';
  return 'Aberto';
}

function servicesFromInvoice(row) {
  const services = row.metadata?.billing_event?.services || row.metadata?.services || [];
  if (Array.isArray(services) && services.length > 0) {
    return services.map((item) => ({
      codigo: item.procedure_code || item.code || '',
      nome: item.procedure_name || item.name || row.procedure_name || row.service_description || 'Procedimento',
      quantidade: money(item.quantity) || 1,
      valor_total: money(item.net_total ?? item.total ?? item.gross_total ?? row.net_value ?? row.amount),
    }));
  }

  return [
    {
      codigo: row.procedure_code || '',
      nome: row.procedure_name || row.service_description || row.description || 'Procedimento',
      quantidade: 1,
      valor_total: money(row.net_value || row.amount),
    },
  ];
}

function addProcedure(map, procedure) {
  const key = `${procedure.codigo || ''}|${procedure.nome || 'Procedimento'}`;
  const current = map.get(key) || {
    codigo: procedure.codigo || '',
    nome: procedure.nome || 'Procedimento',
    quantidade: 0,
    valor_total: 0,
  };
  current.quantidade += money(procedure.quantidade) || 1;
  current.valor_total += money(procedure.valor_total);
  map.set(key, current);
}

function topProcedures(map, limit = 5) {
  return Array.from(map.values())
    .sort((a, b) => b.valor_total - a.valor_total)
    .slice(0, limit);
}

function buildLotsFromGuides(guides, submissions, glosas) {
  const submissionsByGuide = new Map();
  for (const submission of submissions) {
    const rows = submissionsByGuide.get(submission.guide_id) || [];
    rows.push(submission);
    submissionsByGuide.set(submission.guide_id, rows);
  }

  const glosaByGuide = new Map();
  for (const glosa of glosas) {
    const guide = glosa.metadata?.guide_number || glosa.metadata?.numero_guia || null;
    if (!guide) continue;
    glosaByGuide.set(guide, money(glosa.glosa_amount) + money(glosaByGuide.get(guide)));
  }

  const map = new Map();
  for (const guide of guides) {
    const status = normalizeStatus(guide.status);
    const competencia = String(guideDate(guide) || '').slice(0, 7) || 'Sem competencia';
    const convenio = guide.convenio || 'Particular';
    const key = `${competencia}|${convenio}|${status}`;
    const current = map.get(key) || {
      lote_id: key,
      id: key,
      numero_lote: `${competencia}-${convenio}`,
      convenio_nome: convenio,
      convenio,
      competencia,
      data_criacao: String(guideDate(guide) || '').slice(0, 10),
      data_envio: null,
      data_processamento: null,
      data_fechamento: null,
      status,
      total_guias: 0,
      total_valor: 0,
      valor_apresentado: 0,
      valor_processado: 0,
      valor_glosado: 0,
      percentual_glosa: 0,
      guias_aceitas: 0,
      guias_glosadas: 0,
      protocolo_envio: null,
      protocolo_retorno: null,
      xml_path: null,
      observacoes: '',
      guide_ids: [],
    };

    const guideValue = money(guide.valor);
    const guideSubmissions = submissionsByGuide.get(guide.id) || [];
    const guideGlosa = money(glosaByGuide.get(guide.numero_guia));
    current.total_guias += 1;
    current.total_valor += guideValue;
    current.valor_apresentado += guideValue;
    current.valor_glosado += guideGlosa;
    current.valor_processado += ['Pago', 'Processado'].includes(status) ? Math.max(0, guideValue - guideGlosa) : 0;
    current.guias_glosadas += guideGlosa > 0 || status === 'Glosado' ? 1 : 0;
    current.guias_aceitas += ['Pago', 'Processado'].includes(status) && guideGlosa <= 0 ? 1 : 0;
    current.protocolo_envio = current.protocolo_envio || guideSubmissions[0]?.id || null;
    current.protocolo_retorno = current.protocolo_retorno || guideSubmissions[0]?.response_data?.protocol || null;
    current.data_envio = current.data_envio || guide.data_envio || guide.last_submission_at || null;
    current.data_processamento = current.data_processamento || guide.data_processamento || null;
    current.data_fechamento = current.data_fechamento || (status === 'Fechado' ? guide.data_atualizacao : null);
    current.xml_path = current.xml_path || guide.xml_path || (guideSubmissions.some((item) => item.xml_content) ? `tiss/guias/${guide.id}.xml` : null);
    current.guide_ids.push(guide.id);
    current.percentual_glosa = current.valor_apresentado > 0 ? (current.valor_glosado / current.valor_apresentado) * 100 : 0;
    map.set(key, current);
  }

  return Array.from(map.values()).sort((a, b) => String(b.data_criacao).localeCompare(String(a.data_criacao)));
}

export async function loadFaturamentoReportBase({ clinicId, startDate, endDate }) {
  if (!clinicId) {
    return { invoices: [], guides: [], glosas: [], submissions: [] };
  }

  const [invoicesResult, guidesResult, glosasResult, submissionsResult] = await Promise.all([
    supabase.from('ar_invoices').select('*').eq('clinic_id', clinicId),
    supabase.from('billing_guides').select('*').eq('clinic_id', clinicId),
    supabase.from('receivable_glosas').select('*').eq('clinic_id', clinicId),
    supabase.from('tiss_submissions').select('*').eq('clinic_id', clinicId),
  ]);

  const failed = [invoicesResult, guidesResult, glosasResult, submissionsResult].find((result) => result.error);
  if (failed?.error) throw failed.error;

  return {
    invoices: (invoicesResult.data || []).filter((row) => inRange(invoiceDate(row), startDate, endDate)),
    guides: (guidesResult.data || []).filter((row) => inRange(guideDate(row), startDate, endDate)),
    glosas: (glosasResult.data || []).filter((row) => inRange(row.glosa_date || row.created_at, startDate, endDate)),
    submissions: (submissionsResult.data || []).filter((row) => inRange(row.created_at || row.last_attempt_at, startDate, endDate)),
  };
}

export async function getProductionByPayer({ clinicId, startDate, endDate, payerFilter = 'all' }) {
  const { invoices, guides } = await loadFaturamentoReportBase({ clinicId, startDate, endDate });
  const totalNet = invoices.reduce((sum, row) => sum + money(row.net_value || row.amount), 0);
  const map = new Map();

  for (const row of invoices) {
    const name = row.payer_name || row.convenio || row.patient_name || 'Particular';
    const type = String(row.payer_type || '').toLowerCase().includes('particular') || name === 'Particular' ? 'Particular' : 'Medico';
    if (payerFilter !== 'all' && type.toLowerCase() !== payerFilter.toLowerCase()) continue;

    const current = map.get(name) || {
      convenio_id: row.payer_id || row.convenio_id || name,
      convenio_nome: name,
      tipo_convenio: type,
      total_guias: 0,
      total_procedimentos: 0,
      valor_bruto: 0,
      valor_desconto: 0,
      valor_liquido: 0,
      percentual_total: 0,
      guias_pagas: 0,
      guias_pendentes: 0,
      guias_glosadas: 0,
      valor_medio_guia: 0,
      procedimentosMap: new Map(),
    };

    current.total_guias += row.guide_number ? 1 : 0;
    current.valor_bruto += money(row.gross_amount || row.amount);
    current.valor_desconto += money(row.discount_value);
    current.valor_liquido += money(row.net_value || row.amount);
    current.guias_pagas += normalizeStatus(row.status) === 'Pago' ? 1 : 0;
    current.guias_glosadas += money(row.glosa_value) > 0 || normalizeStatus(row.status) === 'Glosado' ? 1 : 0;
    current.guias_pendentes += !['Pago', 'Glosado'].includes(normalizeStatus(row.status)) ? 1 : 0;

    for (const procedure of servicesFromInvoice(row)) {
      current.total_procedimentos += money(procedure.quantidade) || 1;
      addProcedure(current.procedimentosMap, procedure);
    }

    map.set(name, current);
  }

  for (const guide of guides) {
    const name = guide.convenio || 'Particular';
    if (!map.has(name)) {
      map.set(name, {
        convenio_id: name,
        convenio_nome: name,
        tipo_convenio: name === 'Particular' ? 'Particular' : 'Medico',
        total_guias: 0,
        total_procedimentos: 0,
        valor_bruto: 0,
        valor_desconto: 0,
        valor_liquido: 0,
        percentual_total: 0,
        guias_pagas: 0,
        guias_pendentes: 0,
        guias_glosadas: 0,
        valor_medio_guia: 0,
        procedimentosMap: new Map(),
      });
    }
    const current = map.get(name);
    current.total_guias += 1;
    current.valor_bruto += money(guide.valor);
    current.valor_liquido += money(guide.valor);
    current.guias_pagas += normalizeStatus(guide.status) === 'Pago' ? 1 : 0;
    current.guias_glosadas += normalizeStatus(guide.status) === 'Glosado' ? 1 : 0;
    current.guias_pendentes += !['Pago', 'Glosado'].includes(normalizeStatus(guide.status)) ? 1 : 0;
    addProcedure(current.procedimentosMap, {
      codigo: guide.codigo_cbhpm || '',
      nome: guide.codigo_cbhpm || guide.tipo_guia || 'Guia TISS',
      quantidade: 1,
      valor_total: money(guide.valor),
    });
  }

  return Array.from(map.values())
    .map((item) => ({
      ...item,
      percentual_total: totalNet > 0 ? Number(((item.valor_liquido / totalNet) * 100).toFixed(1)) : 0,
      valor_medio_guia: item.total_guias > 0 ? item.valor_liquido / item.total_guias : 0,
      procedimentos_principais: topProcedures(item.procedimentosMap),
    }))
    .sort((a, b) => b.valor_liquido - a.valor_liquido);
}

export async function getProductionByProfessional({ clinicId, startDate, endDate, specialtyFilter = 'all', professionalFilter = 'all' }) {
  const { invoices } = await loadFaturamentoReportBase({ clinicId, startDate, endDate });
  const totalNet = invoices.reduce((sum, row) => sum + money(row.net_value || row.amount), 0);
  const map = new Map();

  for (const row of invoices) {
    const id = row.professional_id || 'sem-profissional';
    if (professionalFilter !== 'all' && id !== professionalFilter) continue;

    const specialty = row.specialty_name || 'Nao informada';
    if (specialtyFilter !== 'all' && !specialty.toLowerCase().includes(specialtyFilter.toLowerCase())) continue;

    const current = map.get(id) || {
      profissional_id: id,
      nome: row.professional_name || row.metadata?.billing_event?.professional_name || 'Profissional nao informado',
      crm: row.metadata?.billing_event?.professional_document || '',
      especialidade: specialty,
      total_atendimentos: 0,
      total_procedimentos: 0,
      valor_bruto: 0,
      valor_desconto: 0,
      valor_liquido: 0,
      participacao_percentual: 0,
      valor_medio_atendimento: 0,
      horas_trabalhadas: 0,
      produtividade_hora: 0,
      ranking_mensal: 0,
      meta_mensal: 0,
      atingimento_meta: 0,
      procedimentosMap: new Map(),
      convenioMap: new Map(),
    };

    current.total_atendimentos += 1;
    current.valor_bruto += money(row.gross_amount || row.amount);
    current.valor_desconto += money(row.discount_value);
    current.valor_liquido += money(row.net_value || row.amount);
    for (const procedure of servicesFromInvoice(row)) {
      current.total_procedimentos += money(procedure.quantidade) || 1;
      addProcedure(current.procedimentosMap, procedure);
    }

    const payer = row.payer_name || 'Particular';
    const conv = current.convenioMap.get(payer) || { convenio: payer, atendimentos: 0, valor: 0 };
    conv.atendimentos += 1;
    conv.valor += money(row.net_value || row.amount);
    current.convenioMap.set(payer, conv);
    map.set(id, current);
  }

  return Array.from(map.values())
    .map((item, index) => {
      const hours = Math.max(1, item.total_atendimentos * 0.5);
      const meta = item.valor_liquido || 1;
      return {
        ...item,
        ranking_mensal: index + 1,
        participacao_percentual: totalNet > 0 ? Number(((item.valor_liquido / totalNet) * 100).toFixed(1)) : 0,
        valor_medio_atendimento: item.total_atendimentos > 0 ? item.valor_liquido / item.total_atendimentos : 0,
        horas_trabalhadas: Number(hours.toFixed(1)),
        produtividade_hora: item.valor_liquido / hours,
        meta_mensal: meta,
        atingimento_meta: 100,
        procedimentos_principais: topProcedures(item.procedimentosMap),
        distribuicao_convenios: Array.from(item.convenioMap.values()).sort((a, b) => b.valor - a.valor),
      };
    })
    .sort((a, b) => b.valor_liquido - a.valor_liquido);
}

function groupPeriodKey(dateString, grouping) {
  const date = new Date(`${dateString}T00:00:00`);
  if (grouping === 'mensal') return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  if (grouping === 'semanal') {
    const first = new Date(date.getFullYear(), 0, 1);
    const week = Math.ceil((((date - first) / 86400000) + first.getDay() + 1) / 7);
    return `${date.getFullYear()}-S${String(week).padStart(2, '0')}`;
  }
  return dateString;
}

export async function getProductionByPeriod({ clinicId, startDate, endDate, grouping = 'diario' }) {
  const { invoices } = await loadFaturamentoReportBase({ clinicId, startDate, endDate });
  const map = new Map();

  for (const row of invoices) {
    const date = String(invoiceDate(row) || '').slice(0, 10);
    if (!date) continue;
    const key = groupPeriodKey(date, grouping);
    const current = map.get(key) || {
      periodo: key,
      data_inicio: date,
      data_fim: date,
      dia_semana: new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR', { weekday: 'long' }),
      total_atendimentos: 0,
      total_procedimentos: 0,
      valor_bruto: 0,
      valor_desconto: 0,
      valor_liquido: 0,
      numero_profissionais: new Set(),
      horas_funcionamento: 0,
      produtividade_hora: 0,
      ticket_medio: 0,
      crescimento_dia_anterior: 0,
      crescimento_semana_anterior: 0,
      crescimento_mes_anterior: 0,
      dias_funcionamento: 0,
      media_diaria: 0,
      meta_mensal: 0,
      atingimento_meta: 100,
      principaisMap: new Map(),
    };

    current.data_inicio = current.data_inicio < date ? current.data_inicio : date;
    current.data_fim = current.data_fim > date ? current.data_fim : date;
    current.total_atendimentos += 1;
    current.valor_bruto += money(row.gross_amount || row.amount);
    current.valor_desconto += money(row.discount_value);
    current.valor_liquido += money(row.net_value || row.amount);
    if (row.professional_id) current.numero_profissionais.add(row.professional_id);
    for (const procedure of servicesFromInvoice(row)) current.total_procedimentos += money(procedure.quantidade) || 1;

    const payer = row.payer_name || 'Particular';
    const payerRow = current.principaisMap.get(payer) || { nome: payer, atendimentos: 0, valor: 0 };
    payerRow.atendimentos += 1;
    payerRow.valor += money(row.net_value || row.amount);
    current.principaisMap.set(payer, payerRow);
    map.set(key, current);
  }

  const rows = Array.from(map.values()).sort((a, b) => String(a.data_inicio).localeCompare(String(b.data_inicio)));
  return rows.map((item, index) => {
    const previous = rows[index - 1];
    const growth = previous?.valor_liquido ? ((item.valor_liquido - previous.valor_liquido) / previous.valor_liquido) * 100 : 0;
    const days = Math.max(1, Math.round((new Date(`${item.data_fim}T00:00:00`) - new Date(`${item.data_inicio}T00:00:00`)) / 86400000) + 1);
    const hours = Math.max(1, item.total_atendimentos * 0.5);
    const common = {
      ...item,
      numero_profissionais: item.numero_profissionais.size,
      horas_funcionamento: Number(hours.toFixed(1)),
      produtividade_hora: item.valor_liquido / hours,
      ticket_medio: item.total_atendimentos > 0 ? item.valor_liquido / item.total_atendimentos : 0,
      dias_funcionamento: days,
      media_diaria: item.valor_liquido / days,
      principais_convenios: Array.from(item.principaisMap.values()).sort((a, b) => b.valor - a.valor).slice(0, 5),
    };
    if (grouping === 'mensal') {
      return { ...common, periodo: item.periodo, meta_mensal: item.valor_liquido || 1, atingimento_meta: 100, crescimento_mes_anterior: growth };
    }
    if (grouping === 'semanal') {
      return { ...common, periodo: item.periodo, melhor_dia: { dia: item.data_fim, valor: item.valor_liquido }, pior_dia: { dia: item.data_inicio, valor: item.valor_liquido }, crescimento_semana_anterior: growth };
    }
    return { ...common, crescimento_dia_anterior: growth };
  }).sort((a, b) => String(b.data_inicio || b.periodo).localeCompare(String(a.data_inicio || a.periodo)));
}

export async function getLotsAndGlosas({ clinicId, startDate, endDate, statusFilter = 'all', payerFilter = 'all' }) {
  const { guides, submissions, glosas } = await loadFaturamentoReportBase({ clinicId, startDate, endDate });
  let lotes = buildLotsFromGuides(guides, submissions, glosas);
  let glosaRows = glosas.map((glosa) => ({
    glosa_id: glosa.id,
    lote_numero: glosa.metadata?.batch_number || glosa.metadata?.lote_numero || '-',
    convenio_nome: glosa.metadata?.payer_name || glosa.metadata?.convenio || '-',
    guia_numero: glosa.metadata?.guide_number || glosa.metadata?.numero_guia || '-',
    paciente_nome: glosa.metadata?.patient_name || '-',
    data_atendimento: glosa.glosa_date || glosa.created_at,
    procedimento_codigo: glosa.metadata?.procedure_code || '',
    procedimento_nome: glosa.metadata?.procedure_name || 'Procedimento',
    valor_apresentado: money(glosa.sent_amount),
    valor_glosado: money(glosa.glosa_amount),
    motivo_glosa: glosa.reason || 'Nao informado',
    codigo_glosa: glosa.glosa_type || '-',
    status_recurso: glosa.contestation_status || 'Pendente',
    data_recurso: glosa.contested_at || glosa.recovered_at || glosa.accepted_at || null,
    profissional: glosa.metadata?.professional_name || '-',
    observacoes: glosa.workflow_notes || glosa.reason || '',
  }));

  if (statusFilter !== 'all') lotes = lotes.filter((lote) => lote.status === statusFilter);
  if (payerFilter !== 'all') {
    lotes = lotes.filter((lote) => lote.convenio_nome.toLowerCase().includes(payerFilter.toLowerCase()));
    glosaRows = glosaRows.filter((glosa) => glosa.convenio_nome.toLowerCase().includes(payerFilter.toLowerCase()));
  }

  return { lotes, glosas: glosaRows };
}

export async function getOperationalLots({ clinicId }) {
  const { guides, submissions, glosas } = await loadFaturamentoReportBase({ clinicId });
  return buildLotsFromGuides(guides, submissions, glosas).map((lote) => ({
    ...lote,
    numero_lote: lote.numero_lote,
    data_criacao: lote.data_criacao || '',
    observacoes: lote.observacoes || `Lote derivado de ${lote.total_guias} guia(s) em billing_guides`,
  }));
}

export async function updateOperationalLot({ clinicId, lote, status, xml = false }) {
  const now = new Date().toISOString();
  const patch = {
    status,
    data_atualizacao: now,
    ...(status === 'Enviado' ? { data_envio: now } : {}),
    ...(xml ? { xml_path: `tiss/lotes/${encodeURIComponent(lote.id)}.xml` } : {}),
  };

  const { error } = await supabase
    .from('billing_guides')
    .update(patch)
    .eq('clinic_id', clinicId)
    .in('id', lote.guide_ids || []);

  if (error) throw error;
}
