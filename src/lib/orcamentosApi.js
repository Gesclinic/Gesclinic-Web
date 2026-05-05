import { supabase } from '@/lib/customSupabaseClient';

// --- ORÇAMENTOS (CABEÇALHO) ---

export async function listOrcamentos(clinicId) {
  if (!clinicId) {
    return [];
  }
  const { data, error } = await supabase
    .from('orcamentos')
    .select(
      `
      *,
      patients:orcamentos_patient_id_fkey (full_name),
      payers:orcamentos_payer_id_fkey (name),
      orcamento_itens (
        service_name,
        professionals:orcamento_itens_medico_id_fkey (name)
      )
    `,
    )
    .eq('clinic_id', clinicId)
    .order('created_at', { ascending: false });
  if (error) {
    throw error;
  }
  return data;
}

export async function createOrcamento(clinicId, payload) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Usuário não autenticado.');
  }

  // Separate items and lists from header
  const { items, extraProfessionals, extraMaterials, ...headerPayload } = payload;

  const { data, error } = await supabase
    .from('orcamentos')
    .insert({ ...headerPayload, clinic_id: clinicId, created_by: user.id })
    .select()
    .single();
  if (error) {
    throw error;
  }

  const orcamentoId = data.id;

  // 1. Insert Items
  if (items && items.length > 0) {
    const itemsToInsert = items.map((item) => {
      const { id, ...rest } = item;
      return { ...rest, orcamento_id: orcamentoId };
    });
    await supabase.from('orcamento_itens').insert(itemsToInsert);
  }

  // 2. Insert Extra Professionals
  if (extraProfessionals && extraProfessionals.length > 0) {
    const prosToInsert = extraProfessionals.map((p) => {
      const { id, ...rest } = p;
      return { ...rest, orcamento_id: orcamentoId };
    });
    await supabase.from('orcamento_profissionais').insert(prosToInsert);
  }

  // 3. Insert Materials
  if (extraMaterials && extraMaterials.length > 0) {
    const matsToInsert = extraMaterials.map((m) => {
      const { id, ...rest } = m;
      return { ...rest, orcamento_id: orcamentoId };
    });
    await supabase.from('orcamento_materiais').insert(matsToInsert);
  }

  return data;
}

export async function updateOrcamento(id, payload) {
  // Separate items and lists from header
  const { items, extraProfessionals, extraMaterials, ...headerPayload } = payload;

  const { data, error } = await supabase
    .from('orcamentos')
    .update(headerPayload)
    .eq('id', id)
    .select();

  if (!data || data.length === 0) {
    throw new Error('Record not found');
  }
  return data[0];
  if (error) {
    throw error;
  }

  // 1. Update Items (Delete all and re-insert strategy)
  if (items) {
    await supabase.from('orcamento_itens').delete().eq('orcamento_id', id);
    if (items.length > 0) {
      const itemsToInsert = items.map((item) => {
        const { id: tempId, ...rest } = item;
        return { ...rest, orcamento_id: id };
      });
      await supabase.from('orcamento_itens').insert(itemsToInsert);
    }
  }

  // 2. Update Extra Professionals
  if (extraProfessionals) {
    await supabase.from('orcamento_profissionais').delete().eq('orcamento_id', id);
    if (extraProfessionals.length > 0) {
      const prosToInsert = extraProfessionals.map((p) => {
        const { id: tempId, ...rest } = p;
        return { ...rest, orcamento_id: id };
      });
      await supabase.from('orcamento_profissionais').insert(prosToInsert);
    }
  }

  // 3. Update Materials
  if (extraMaterials) {
    await supabase.from('orcamento_materiais').delete().eq('orcamento_id', id);
    if (extraMaterials.length > 0) {
      const matsToInsert = extraMaterials.map((m) => {
        const { id: tempId, ...rest } = m;
        return { ...rest, orcamento_id: id };
      });
      await supabase.from('orcamento_materiais').insert(matsToInsert);
    }
  }

  return data;
}

export async function deleteOrcamento(id) {
  const { error } = await supabase.from('orcamentos').delete().eq('id', id);
  if (error) {
    throw error;
  }
}

export async function getOrcamentoDetails(orcamentoId) {
  if (!orcamentoId) {
    return null;
  }

  // Fetch items (existing table)
  const itemsQuery = await supabase
    .from('orcamento_itens')
    .select('*')
    .eq('orcamento_id', orcamentoId)
    .order('id');

  if (itemsQuery.error) {
    throw itemsQuery.error;
  }

  // Try to fetch new tables, but don't crash if they don't exist yet
  let extraProfessionals = [];
  let extraMaterials = [];

  try {
    const prosQuery = await supabase
      .from('orcamento_profissionais')
      .select('*')
      .eq('orcamento_id', orcamentoId)
      .order('id');
    if (!prosQuery.error) {
      extraProfessionals = prosQuery.data;
    }
  } catch (e) {
    console.warn('Could not fetch extra professionals (table might be missing)');
  }

  try {
    const matsQuery = await supabase
      .from('orcamento_materiais')
      .select('*')
      .eq('orcamento_id', orcamentoId)
      .order('id');
    if (!matsQuery.error) {
      extraMaterials = matsQuery.data;
    }
  } catch (e) {
    console.warn('Could not fetch extra materials (table might be missing)');
  }

  return {
    items: itemsQuery.data,
    extraProfessionals,
    extraMaterials,
  };
}

// --- ITENS DO ORÇAMENTO ---

export async function listOrcamentoItens(orcamentoId) {
  if (!orcamentoId) {
    return [];
  }
  const { data, error } = await supabase
    .from('orcamento_itens')
    .select('*')
    .eq('orcamento_id', orcamentoId)
    .order('id');
  if (error) {
    throw error;
  }
  return data;
}

export async function addOrcamentoItem(orcamentoId, item) {
  const { data, error } = await supabase
    .from('orcamento_itens')
    .insert({ ...item, orcamento_id: orcamentoId })
    .select();

  if (!data || data.length === 0) {
    throw new Error('Record not found');
  }
  return data[0];
  if (error) {
    throw error;
  }
  return data;
}

export async function updateOrcamentoItem(id, patch) {
  const { data, error } = await supabase
    .from('orcamento_itens')
    .update(patch)
    .eq('id', id)
    .select();

  if (!data || data.length === 0) {
    throw new Error('Record not found');
  }
  return data[0];
  if (error) {
    throw error;
  }
  return data;
}

export async function deleteOrcamentoItem(id) {
  const { error } = await supabase.from('orcamento_itens').delete().eq('id', id);
  if (error) {
    throw error;
  }
}
