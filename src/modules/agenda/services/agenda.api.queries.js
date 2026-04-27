import { supabase } from "@/lib/customSupabaseClient";

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

// Busca agendamento por ID (completo, para modal de detalhes)
export async function buscarAgendamentoPorId(agendamentoId) {
  try {
    // Verificar autenticação
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Usuário não autenticado");
    }

    if (!agendamentoId) {
      throw new Error("agendamentoId é obrigatório");
    }

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
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      console.warn("⚠️ Agendamento não encontrado:", agendamentoId);
      throw new Error("Agendamento não encontrado ou sem permissão de acesso");
    }

    return { data, error: null };
  } catch (err) {
    console.error("❌ Erro ao buscar agendamento:", err.message);
    return { data: null, error: err };
  }
}
