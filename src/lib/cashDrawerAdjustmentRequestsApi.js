import { supabase } from './customSupabaseClient';

function isMissingAdjustmentTableError(error) {
  const text = String(error?.message || error?.details || '');
  return text.includes('cash_drawer_adjustment_requests')
    && (text.includes('Could not find the table') || text.includes('schema cache') || text.includes('does not exist'));
}

function buildMissingMigrationError() {
  return new Error(
    'A estrutura de liberação do caixa ainda não foi aplicada no Supabase. Execute a migration supabase/migrations/20260711_cash_drawer_reopen_adjustment_requests.sql e atualize a tela.',
  );
}

async function enrichRequests(requests, clinicId) {
  const rows = requests || [];
  const drawerIds = [...new Set(rows.map((request) => request.drawer_id).filter(Boolean))];
  const userIds = [...new Set(rows.flatMap((request) => [request.requested_by, request.reviewed_by]).filter(Boolean))];

  const [drawersRes, usersRes] = await Promise.all([
    drawerIds.length > 0
      ? supabase.from('cash_drawers').select('*').eq('clinic_id', clinicId).in('id', drawerIds)
      : Promise.resolve({ data: [] }),
    userIds.length > 0
      ? supabase.from('users').select('id, name, full_name, email').eq('clinic_id', clinicId).in('id', userIds)
      : Promise.resolve({ data: [] }),
  ]);

  const usersById = new Map((usersRes.data || []).map((user) => [user.id, user]));
  const drawersById = new Map((drawersRes.data || []).map((drawer) => [drawer.id, drawer]));

  return rows.map((request) => {
    const drawer = drawersById.get(request.drawer_id) || null;
    const requestedBy = usersById.get(request.requested_by) || null;
    const reviewedBy = usersById.get(request.reviewed_by) || null;

    return {
      ...request,
      drawer,
      requestedBy: requestedBy
        ? {
            id: requestedBy.id,
            name: requestedBy.full_name || requestedBy.name || requestedBy.email || 'Usuário',
            email: requestedBy.email,
          }
        : null,
      reviewedBy: reviewedBy
        ? {
            id: reviewedBy.id,
            name: reviewedBy.full_name || reviewedBy.name || reviewedBy.email || 'Usuário',
            email: reviewedBy.email,
          }
        : null,
    };
  });
}

const cashDrawerAdjustmentRequestsApi = {
  async createRequest({ clinicId, drawerId, requestType, reason, requestedBy }) {
    const { data, error } = await supabase
      .from('cash_drawer_adjustment_requests')
      .insert({
        clinic_id: clinicId,
        drawer_id: drawerId,
        request_type: requestType,
        reason,
        requested_by: requestedBy,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      if (isMissingAdjustmentTableError(error)) {
        throw buildMissingMigrationError();
      }
      throw new Error(`Erro ao solicitar reabertura/reajuste: ${error.message}`);
    }

    return data;
  },

  async getPendingForDrawer({ clinicId, drawerId }) {
    if (!clinicId || !drawerId) {
      return null;
    }

    const { data, error } = await supabase
      .from('cash_drawer_adjustment_requests')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('drawer_id', drawerId)
      .eq('status', 'pending')
      .order('requested_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      if (isMissingAdjustmentTableError(error)) {
        console.warn(buildMissingMigrationError().message);
        return null;
      }
      console.error('Erro ao buscar solicitação pendente do caixa:', error);
      return null;
    }

    return data || null;
  },

  async cancelRequest(requestId, { requestedBy }) {
    const { data, error } = await supabase
      .from('cash_drawer_adjustment_requests')
      .update({
        status: 'rejected',
        reviewed_by: requestedBy,
        reviewed_at: new Date().toISOString(),
        review_notes: 'Solicitação cancelada pelo operador.',
      })
      .eq('id', requestId)
      .eq('status', 'pending')
      .select()
      .single();

    if (error) {
      if (isMissingAdjustmentTableError(error)) {
        throw buildMissingMigrationError();
      }
      throw new Error(`Erro ao cancelar solicitação: ${error.message}`);
    }

    return data;
  },

  async listPending(clinicId) {
    const { data, error } = await supabase
      .from('cash_drawer_adjustment_requests')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('status', 'pending')
      .order('requested_at', { ascending: false });

    if (error) {
      if (isMissingAdjustmentTableError(error)) {
        console.warn(buildMissingMigrationError().message);
        return [];
      }
      console.error('Erro ao listar solicitações de caixa:', error);
      return [];
    }

    return enrichRequests(data || [], clinicId);
  },

  async listHistory(clinicId, { limit = 30 } = {}) {
    const { data, error } = await supabase
      .from('cash_drawer_adjustment_requests')
      .select('*')
      .eq('clinic_id', clinicId)
      .in('status', ['approved', 'rejected'])
      .order('reviewed_at', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (error) {
      if (isMissingAdjustmentTableError(error)) {
        console.warn(buildMissingMigrationError().message);
        return [];
      }
      console.error('Erro ao listar histórico de solicitações de caixa:', error);
      return [];
    }

    return enrichRequests(data || [], clinicId);
  },

  async approveRequest(requestId, { reviewedBy, reviewNotes }) {
    const { data: request, error: requestError } = await supabase
      .from('cash_drawer_adjustment_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (requestError) {
      if (isMissingAdjustmentTableError(requestError)) {
        throw buildMissingMigrationError();
      }
      throw new Error(`Erro ao buscar solicitação: ${requestError.message}`);
    }

    const { error: drawerError } = await supabase
      .from('cash_drawers')
      .update({
        status: 'open',
        closed_at: null,
        notes: reviewNotes || request.reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', request.drawer_id);

    if (drawerError) {
      throw new Error(`Erro ao reabrir caixa: ${drawerError.message}`);
    }

    const { data, error } = await supabase
      .from('cash_drawer_adjustment_requests')
      .update({
        status: 'approved',
        reviewed_by: reviewedBy,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes || null,
      })
      .eq('id', requestId)
      .select()
      .single();

    if (error) {
      if (isMissingAdjustmentTableError(error)) {
        throw buildMissingMigrationError();
      }
      throw new Error(`Erro ao aprovar solicitação: ${error.message}`);
    }

    return data;
  },

  async rejectRequest(requestId, { reviewedBy, reviewNotes }) {
    const { data, error } = await supabase
      .from('cash_drawer_adjustment_requests')
      .update({
        status: 'rejected',
        reviewed_by: reviewedBy,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes || null,
      })
      .eq('id', requestId)
      .select()
      .single();

    if (error) {
      if (isMissingAdjustmentTableError(error)) {
        throw buildMissingMigrationError();
      }
      throw new Error(`Erro ao rejeitar solicitação: ${error.message}`);
    }

    return data;
  },
};

export default cashDrawerAdjustmentRequestsApi;
