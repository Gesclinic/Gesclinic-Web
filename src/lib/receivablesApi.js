import { supabase } from '@/lib/customSupabaseClient';
import { logReceivableCreated, logPaymentReceived } from '@/lib/auditFinancialIntegration.js';

function normalizeArStatus(s) {
  if (!s) return null;
  const v = String(s).toLowerCase();
  if (['open','em aberto','aberto','pendente'].includes(v)) return 'open';
  if (['planned','previsto','previsao','estimado'].includes(v)) return 'planned';
  if (['received','recebido','pago','quitado'].includes(v)) return 'received';
  if (['partial','parcial','recebido parcial'].includes(v)) return 'partial';
  if (['overdue','em atraso','atrasado'].includes(v)) return 'overdue';
  if (['canceled','cancelado','cancelada'].includes(v)) return 'canceled';
  if (['glossed','glosado','glosa'].includes(v)) return 'glossed';
  return null;
}

export async function listReceivables({
  clinicId,
  payer = null,
  payerType = null,
  professionalId = null,
  status = null,
  statusList = null,
  origin = null,
  ccId = null,
  planId = null,
  emissionStart = null,
  emissionEnd = null,
  dueStart = null,
  dueEnd = null,
  receivedStart = null,
  receivedEnd = null,
  search = null,
  limit = 100,
  offset = 0,
} = {}) {
  console.log('📡 [listReceivables] Iniciada com params:', {
    clinicId,
    payer: payer || '(null)',
    payerType: payerType || '(null)',
    status: status || '(null)',
    origin: origin || '(null)',
    professionalId: professionalId || '(null)',
    planId: planId || '(null)',
  });

  // 🔍 PRIMEIRO: Buscar TODOS os registros sem filtro para debug
  let debugQuery = supabase
    .from('ar_receivables')
    .select('id, profissional_id, origem, status, payer_name, descricao')
    .eq('clinic_id', clinicId)
    .limit(100);

  const { data: debugData, error: debugError } = await debugQuery;
  console.log('📊 [DEBUG] Todos os registros na tabela (SEM FILTRO):');
  if (debugData && debugData.length > 0) {
    debugData.forEach((row, idx) => {
      console.log(`   [${idx}] profissional_id=${row.profissional_id}, origem=${row.origem}, status=${row.status}, payer=${row.payer_name}`);
    });
  } else {
    console.log('   ⚠️ Nenhum registro encontrado na tabela!');
  }

  let query = supabase
    .from('ar_receivables')
    .select('*')
    .eq('clinic_id', clinicId)
    .order('data_vencimento', { ascending: true })
    .range(offset, offset + limit - 1);

  if (payer && payer.trim()) {
    console.log('  ✅ Aplicando filtro: payer.ilike("%' + payer.trim() + '%")');
    query = query.ilike('pagador', `%${payer.trim()}%`);
  }
  if (professionalId) {
    console.log('  ✅ Aplicando filtro: profissional_id = ' + professionalId);
    query = query.eq('profissional_id', professionalId);
  }
  if (origin) {
    console.log('  ✅ Aplicando filtro: origem = ' + origin);
    query = query.eq('origem', origin);
  }
  if (payerType === 'paciente') {
    console.log('  ✅ Aplicando filtro: paciente_id IS NOT NULL');
    query = query.not('paciente_id', 'is', null);
  }
  if (payerType === 'convenio') {
    console.log('  ✅ Aplicando filtro: convenio_id IS NOT NULL');
    query = query.not('convenio_id', 'is', null);
  }
  if (payerType === 'empresa') {
    console.log('  ✅ Aplicando filtro: empresa_id IS NOT NULL');
    query = query.not('empresa_id', 'is', null);
  }
  if (ccId) {
    console.log('  ✅ Aplicando filtro: centro_custo_id = ' + ccId);
    query = query.eq('centro_custo_id', ccId);
  }
  if (planId) {
    console.log('  ✅ Aplicando filtro: plano_contas_id = ' + planId);
    query = query.eq('plano_contas_id', planId);
  }

  if (Array.isArray(statusList) && statusList.length) {
    const normalized = Array.from(new Set(statusList.map(normalizeArStatus).filter(Boolean)));
    if (normalized.length) {
      console.log('  ✅ Aplicando filtro: status IN [' + normalized.join(', ') + ']');
      query = query.in('status', normalized);
    }
  } else {
    const norm = normalizeArStatus(status);
    if (norm) {
      console.log('  ✅ Aplicando filtro: status = ' + norm);
      query = query.eq('status', norm);
    }
  }

  if (emissionStart) {
    console.log('  ✅ Aplicando filtro: data_emissao >= ' + emissionStart);
    query = query.gte('data_emissao', emissionStart);
  }
  if (emissionEnd) {
    console.log('  ✅ Aplicando filtro: data_emissao <= ' + emissionEnd);
    query = query.lte('data_emissao', emissionEnd);
  }
  if (dueStart) {
    console.log('  ✅ Aplicando filtro: data_vencimento >= ' + dueStart);
    query = query.gte('data_vencimento', dueStart);
  }
  if (dueEnd) {
    console.log('  ✅ Aplicando filtro: data_vencimento <= ' + dueEnd);
    query = query.lte('data_vencimento', dueEnd);
  }
  if (receivedStart) {
    console.log('  ✅ Aplicando filtro: data_recebimento >= ' + receivedStart);
    query = query.gte('data_recebimento', receivedStart);
  }
  if (receivedEnd) {
    console.log('  ✅ Aplicando filtro: data_recebimento <= ' + receivedEnd);
    query = query.lte('data_recebimento', receivedEnd);
  }

  if (search && search.trim()) {
    const pat = `%${search.trim()}%`;
    console.log('  ✅ Aplicando filtro: search pattern "%' + search.trim() + '%"');
    query = query.or(`descricao.ilike.${pat},pagador.ilike.${pat},origem.ilike.${pat}`);
  }

  console.log('📡 [listReceivables] Executando query...');
  const { data, error } = await query;
  
  if (error) {
    console.error('❌ listReceivables error:', error);
    throw new Error(error.message);
  }
  
  console.log('📡 [listReceivables] ✅ Resultado:', data?.length || 0, 'linhas');
  if (data && data.length > 0) {
    console.log('📋 Registros retornados:');
    data.forEach((row, idx) => {
      console.log(`   [${idx}] ${row.payer_name || row.descricao} | status=${row.status} | origem=${row.origem}`);
    });
  }
  return data || [];
}

export async function createReceivable(clinicId, payload) {
  const base = {
    clinic_id: clinicId,
    payer_name: payload.payer_name || null,
    paciente_id: payload.paciente_id || null,
    convenio_id: payload.convenio_id || null,
    empresa_id: payload.empresa_id || null,
    origem: payload.origem || 'Manual',
    descricao: payload.descricao || null,
    servico_id: payload.servico_id || null,
    profissional_id: payload.profissional_id || null,
    centro_custo_id: payload.centro_custo_id || null,
    plano_contas_id: payload.plano_contas_id || null,
    valor_bruto: Number(payload.valor_bruto || payload.valor || 0),
    descontos: Number(payload.descontos || 0),
    forma_prevista: payload.forma_prevista || null,
    data_emissao: payload.data_emissao || new Date().toISOString().slice(0,10),
    data_vencimento: payload.data_vencimento || null,
    status: normalizeArStatus(payload.status) || 'open',
    parcelado: !!payload.parcelado,
    parcela_atual: payload.parcela_atual || null,
    total_parcelas: payload.total_parcelas || null,
    grupo_parcelamento_id: payload.grupo_parcelamento_id || null,
  };

  const parcels = Math.max(1, Number(payload.total_parcelas || 1));
  const isParcelado = parcels > 1 || !!payload.parcelado;
  const groupId = isParcelado ? (payload.grupo_parcelamento_id || (crypto?.randomUUID ? crypto.randomUUID() : null)) : null;

  if (!isParcelado) {
    const { data, error } = await supabase
      .from('ar_receivables')
      .insert({ ...base, parcelado: false })
      .select()
      .single();
    if (error) throw new Error(error.message);
    
    // Log: Conta a receber criada
    if (data && payload.appointment_id) {
      logReceivableCreated(
        payload.appointment_id,
        data.id,
        data.valor_bruto,
        { 
          payer_name: data.payer_name,
          description: data.descricao,
          due_date: data.data_vencimento 
        }
      ).catch(err => console.warn('Auditoria log failed:', err));
    }
    
    return data;
  }

  const rows = [];
  const amountLiq = Math.max(0, Number(base.valor_bruto) - Number(base.descontos || 0));
  const per = Number((amountLiq / parcels).toFixed(2));
  const start = base.data_vencimento ? new Date(base.data_vencimento) : new Date();
  for (let i = 1; i <= parcels; i++) {
    const d = new Date(start);
    d.setMonth(d.getMonth() + (i - 1));
    const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    rows.push({
      ...base,
      parcelado: true,
      parcela_atual: i,
      total_parcelas: parcels,
      grupo_parcelamento_id: groupId,
      data_vencimento: iso,
      valor_bruto: per, // armazenamos como bruto por parcela; descontos rateados já refletidos
      descontos: 0,
    });
  }
  const { data, error } = await supabase.from('ar_receivables').insert(rows).select();
  if (error) throw new Error(error.message);
  
  // Log: Conta a receber criada (primeira parcela)
  if (data?.[0] && payload.appointment_id) {
    logReceivableCreated(
      payload.appointment_id,
      data[0].id,
      data[0].valor_bruto,
      { 
        payer_name: data[0].payer_name,
        description: data[0].descricao,
        due_date: data[0].data_vencimento,
        installments: parcels 
      }
    ).catch(err => console.warn('Auditoria log failed:', err));
  }
  
  return data?.[0] || null;
}

export async function updateReceivable(id, patch) {
  const upd = { ...patch };
  
  // Fetch dados atuais para audit trail
  const { data: currentData } = await supabase
    .from('ar_receivables')
    .select('*')
    .eq('id', id)
    .single();
  
  if ('status' in upd) upd.status = normalizeArStatus(upd.status) || undefined;
  const { data, error } = await supabase
    .from('ar_receivables')
    .update(upd)
    .eq('id', id)
    .select();

    if (!data || data.length === 0) {
      throw new Error('Record not found');
    }
    return data[0];
  if (error) throw new Error(error.message);
  
  // Log: Pagamento recebido (se status mudou para received ou partial)
  if (data && currentData && (upd.status === 'received' || upd.status === 'partial')) {
    if (currentData.status !== upd.status) {
      logPaymentReceived(
        currentData.atendimento_id || null, // Se houver vínculo
        id,
        data.valor_bruto,
        currentData.valor_bruto,
        upd.status,
        {
          payer_name: data.payer_name,
          previous_status: currentData.status,
          new_status: upd.status
        }
      ).catch(err => console.warn('Auditoria log failed:', err));
    }
  }
  
  return data;
}

export async function deleteReceivable(id) {
  const { error } = await supabase.from('ar_receivables').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function getReceivableById(id) {
  const { data, error } = await supabase
    .from('ar_receivables')
    .select('*')
    .eq('id', id);

    if (!data || data.length === 0) {
      throw new Error('Record not found');
    }
    return data[0];
  if (error) throw new Error(error.message);
  return data;
}

export const arStatusOptions = [
  { value: 'open', label: 'Em aberto' },
  { value: 'planned', label: 'Previsto' },
  { value: 'received', label: 'Recebido' },
  { value: 'partial', label: 'Recebido Parcial' },
  { value: 'overdue', label: 'Em atraso' },
  { value: 'canceled', label: 'Cancelado' },
  { value: 'glossed', label: 'Glosado' },
];

