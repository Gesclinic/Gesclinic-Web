import { supabase } from "@/lib/customSupabaseClient";

// ✅ Validar se é um UUID válido
function isValidUUID(uuid) {
  if (!uuid || typeof uuid !== 'string') return false;
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(uuid);
}

// Lista serviços vinculados ao profissional
export async function listarServicosPorProfissional({ profissionalId }) {
  const { data, error } = await supabase
    .from('professional_services')
    .select('service:service_id(id, name, duration)')
    .eq('professional_id', profissionalId);
  return (data || []).map(ps => ps.service);
}
// Lista salas da clínica
export async function listarSalas({ clinicId }) {
  const { data, error } = await supabase
    .from('rooms')
    .select('id, name')
    .eq('clinic_id', clinicId)
    .order('name', { ascending: true });
  return data || [];
}
// Lista profissionais ativos da clínica
export async function listarProfissionais({ clinicId }) {
  const { data, error } = await supabase
    .from('professionals')
    .select('id, name, specialty, active')
    .eq('clinic_id', clinicId)
    .eq('active', true)
    .order('name', { ascending: true }); // If 'name' does not exist, change to 'full_name' or another valid column
  return (data || []).filter(p => p.active);
}
// Lista planos vinculados ao convênio
export async function listarPlanosPorConvenio({ convenioId }) {
  const { data, error } = await supabase
    .from('plans')
    .select('id, name')
    .eq('payer_id', convenioId)
    .order('name', { ascending: true });
  return data || [];
}
// Lista pacientes da clínica
export async function listarPacientes({ clinicId }) {
  const { data, error } = await supabase
    .from('patients')
    .select('id, full_name, record_number, phone, email, cpf')
    .eq('clinic_id', clinicId)
    .order('full_name', { ascending: true });
  return data || [];
}
// Lista convênios da clínica
export async function listarConvenios({ clinicId }) {
  const { data, error } = await supabase
    .from('payers')
    .select('id, name')
    .eq('clinic_id', clinicId)
    .eq('active', true)
    .order('name', { ascending: true });
  return data || [];
}

// Lista convênios vinculados a um profissional específico
export async function listarConveniosPorProfissional({ profissionalId }) {
  try {
    console.log("🔍 [listarConveniosPorProfissional] Iniciando busca para profissionalId:", profissionalId);
    
    // ⚠️ VALIDAÇÃO: Verificar se profissionalId é um UUID válido
    if (!isValidUUID(profissionalId)) {
      console.warn("⚠️ [listarConveniosPorProfissional] profissionalId inválido (não é UUID):", profissionalId);
      console.log("📝 [listarConveniosPorProfissional] Retornando lista vazia (fallback)");
      return [];
    }
    
    // Primeiro, buscar os payer_ids do profissional
    const { data: professionalPayers, error: ppError } = await supabase
      .from('professional_payers')
      .select('*')
      .eq('professional_id', profissionalId);
    
    console.log("📊 [Query 1] professional_payers resultado:", professionalPayers);
    console.log("📊 [Query 1] erro:", ppError);
    
    if (ppError) {
      console.error("❌ Erro ao carregar payers do profissional:", ppError);
      return [];
    }

    if (!professionalPayers || professionalPayers.length === 0) {
      console.log("⚠️ Nenhum payer encontrado para profissional:", profissionalId);
      console.log("📌 Tentando fallback: Buscar o profissional para pegar clinic_id...");
      
      // FALLBACK: Se não há professional_payers vinculados, retorna todos os payers da clínica
      const { data: prof, error: profError } = await supabase
        .from('professionals')
        .select('clinic_id')
        .eq('id', profissionalId)
        .maybeSingle();
      
      if (profError) {
        console.error("❌ Erro ao buscar profissional para clinic_id:", profError);
        return [];
      }
      
      if (!prof) {
        console.warn("⚠️ Profissional não encontrado:", profissionalId);
        return [];
      }
      
      console.log("💡 Found clinic_id:", prof.clinic_id, "- mostrando todos os payers da clínica");
      
      const { data: allPayers, error: allPayersError } = await supabase
        .from('payers')
        .select('id, name')
        .eq('clinic_id', prof.clinic_id)
        .eq('active', true);
      
      if (allPayersError) {
        console.error("❌ Erro ao buscar todos os payers:", allPayersError);
        return [];
      }
      
      console.log("✅ Retornando todos os payers da clínica (fallback):", allPayers);
      return allPayers || [];
    }

    // Extrair os IDs dos payers
    const payerIds = professionalPayers
      .map(pp => {
        console.log("📌 [Debug] pp.payer_id =", pp.payer_id, "tipo:", typeof pp.payer_id);
        return pp.payer_id;
      })
      .filter(id => id !== null && id !== undefined && id !== "");

    console.log("🎯 Payer IDs extraídos (filtrados):", payerIds);
    console.log("📊 Quantidade de payer IDs:", payerIds.length);

    if (payerIds.length === 0) {
      console.log("⚠️ Todos os payer_ids eram null/undefined/vazio");
      return [];
    }

    // Buscar os dados dos payers na tabela payers
    const { data: payers, error: payersError } = await supabase
      .from('payers')
      .select('id, name')
      .in('id', payerIds)
      .eq('active', true);

    console.log("📊 [Query 2] payers resultado:", payers);
    console.log("📊 [Query 2] erro:", payersError);

    if (payersError) {
      console.error("❌ Erro ao carregar dados dos payers:", payersError);
      return [];
    }

    console.log("✅ Convênios do profissional carregados com sucesso:", payers);
    return payers || [];
  } catch (err) {
    console.error("❌ Erro ao listar convênios do profissional:", err);
    return [];
  }
}
// Busca agendamento por ID (completo, para modal de detalhes)
export async function buscarAgendamentoPorId(agendamentoId) {
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      patient:patient_id (id, name, record_number, phone, email, cpf),
      professional:professional_id (id, name, specialty),
      service:service_id (id, name, type, duration, value),
      room:room_id (id, name, type, unit),
      payer:payer_id (id, name),
      plan:plan_id (id, name),
      updated_at,
      notes,
      internal_notes
    `)
    .eq('id', agendamentoId)
    .single();
  return { data, error };
}

/**
 * Serviço ÚNICO de agenda
 * Nunca faz join frágil
 * Retorna dados crus e estáveis
 */
export async function listarAgenda({ clinicId, date, startDate = null, endDate = null }) {
  console.log('[DEBUG listarAgenda] Input:', { clinicId, date, startDate, endDate });
  
  if (!clinicId) {
    console.warn('[DEBUG listarAgenda] Missing clinicId');
    return [];
  }

  // Formatar data primeiro (fazer isso fora do if para evitar ReferenceError)
  let formattedDate = date;
  if (date instanceof Date) {
    formattedDate = date.toISOString().split('T')[0];
  } else if (typeof date === 'string' && date.includes('/')) {
    const parts = date.split('/');
    if (parts.length === 3) {
      formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }

  // Determinar range de datas
  let queryStartDate = startDate || formattedDate;
  let queryEndDate = endDate;
  
  if (!queryEndDate) {
    // Carregar 30 dias a partir da data
    const endDateObj = new Date(formattedDate);
    endDateObj.setDate(endDateObj.getDate() + 30);
    queryEndDate = endDateObj.toISOString().split('T')[0];
  }

  console.log('[DEBUG listarAgenda] Query range:', { queryStartDate, queryEndDate });

  const { data, error } = await supabase
    .from("appointments")
    .select(`
      id,
      clinic_id,
      scheduled_date,
      scheduled_time,
      end_time,
      status,
      patient_id,
      professional_id,
      service_id,
      room_id,
      payer_id,
      patient:patients(id, name, record_number),
      professional:professionals(id, name),
      service:services(id, name),
      room:rooms(id, name),
      payer:payers(id, name)
    `)
    .eq("clinic_id", clinicId)
    .gte("scheduled_date", queryStartDate)
    .lte("scheduled_date", queryEndDate)
    .order("scheduled_date")
    .order("scheduled_time");

  if (error) {
    console.error("❌ Erro ao listar agenda:", error);
    return [];
  }

  console.log(`✅ Agendamentos carregados: ${data?.length || 0} para clínica ${clinicId} no período ${queryStartDate} a ${queryEndDate}`);
  if (data && data.length > 0) {
    console.log('   Profissionais com agendamentos:', [...new Set(data.map(a => a.professional?.name || a.professional_id))].join(', '));
    console.log('   Datas com agendamentos:', [...new Set(data.map(a => a.scheduled_date))].join(', '));
  }
  return data || [];
}

// Atualiza agendamento existente
export async function atualizarAgendamento(agendamentoId, payload) {
  const {
    date, startTime, endTime, pacienteId,
    profissionalId, servicoId, salaId, convenioId, planoId, status,
    observacoes, observacoesInternas
  } = payload;
  const { error } = await supabase
    .from('appointments')
    .update({
      scheduled_date: date,
      scheduled_time: startTime,
      end_time: endTime || null,
      patient_id: pacienteId ? pacienteId : null,
      professional_id: profissionalId ? profissionalId : null,
      service_id: servicoId ? servicoId : null,
      room_id: salaId ? salaId : null,
      payer_id: convenioId ? convenioId : null,
      status,
      notes: observacoes || null,
      internal_notes: observacoesInternas || null,
    })
    .eq('id', agendamentoId);
  if (error) throw error;
  return true;
}
