import { supabase } from '@/lib/customSupabaseClient.js';
import { deleteAP } from '@/lib/financeApi.js';

const handleResponse = (response) => {
  if (response.error) {
    throw response.error;
  }
  return response.data;
};

// Helper: detect missing column errors (Postgres code 42703)
const isMissingColumnError = (error) => {
  return error && (error.code === '42703' || /does not exist/i.test(error.message));
};

// Helper: detect undefined function errors (Postgres code 42883)
const isUndefinedFunctionError = (error, fnName) => {
  return (
    error &&
    (error.code === '42883' ||
      (typeof error.message === 'string' &&
        /function/i.test(error.message) &&
        /does not exist/i.test(error.message) &&
        (!fnName || error.message.includes(fnName))))
  );
};

// Helper: detect foreign key violations (Postgres code 23503)
const isForeignKeyViolationError = (error) => {
  return (
    error &&
    (error.code === '23503' ||
      (typeof error.message === 'string' && /violates foreign key constraint/i.test(error.message)))
  );
};

export const stockCategoriesApi = {
  list: async (clinicId) => {
    const { data, error } = await supabase
      .from('stock_categories')
      .select('id, name, description, code, color, active')
      .eq('clinic_id', clinicId)
      .order('name');
    if (error) {
      throw error;
    }
    return data || [];
  },
  create: async (clinicId, payload) => {
    // Remove emoji field if present (column doesn't exist in DB)
    const { emoji, ...cleanPayload } = payload;
    return handleResponse(
      await supabase
        .from('stock_categories')
        .insert({ ...cleanPayload, clinic_id: clinicId })
        .select()
        .single(),
    );
  },
  update: async (id, payload) => {
    // Remove emoji field if present (column doesn't exist in DB)
    const { emoji, ...cleanPayload } = payload;
    const { data, error } = await supabase
      .from('stock_categories')
      .update(cleanPayload)
      .eq('id', id)
      .select();

    if (error) {
      throw error;
    }
    if (!data || data.length === 0) {
      throw new Error('Record not found');
    }
    return data[0];
  },
  remove: async (id) => {
    return handleResponse(await supabase.from('stock_categories').delete().eq('id', id));
  },
};

export const stockItemsApi = {
  list: async (clinicId) => {
    // Prefer RPC (database function) when available
    const rpcRes = await supabase.rpc('list_stock_items_with_balance', { p_clinic_id: clinicId });

    if (!rpcRes.error) {
      return rpcRes.data || [];
    }

    // Fallback: If RPC is missing (migration not applied), compute balances client-side
    if (isUndefinedFunctionError(rpcRes.error, 'list_stock_items_with_balance')) {
      // Fetch items
      const itemsRes = await supabase
        .from('stock_items')
        .select(
          'id, clinic_id, name, sku, category_id, description, unit_id, unit_symbol, min_stock, max_stock, is_active',
        )
        .eq('clinic_id', clinicId)
        .order('name');
      if (itemsRes.error) {
        throw itemsRes.error;
      }

      const items = itemsRes.data || [];
      if (!items.length) {
        return [];
      }

      // Fetch movements for these items in clinic
      const ids = items.map((i) => i.id);
      const movRes = await supabase
        .from('stock_movements')
        .select('item_id, qty, type')
        .eq('clinic_id', clinicId)
        .in('item_id', ids);
      if (movRes.error) {
        throw movRes.error;
      }

      const movements = movRes.data || [];
      const balanceByItem = new Map();
      for (const m of movements) {
        const sign =
          m.type === 'entry' ? 1 : m.type === 'exit' ? -1 : m.type === 'adjustment' ? 1 : 0;
        balanceByItem.set(
          m.item_id,
          (balanceByItem.get(m.item_id) || 0) + sign * Number(m.qty || 0),
        );
      }

      // Shape result similar to RPC
      return items.map((i) => ({
        id: i.id,
        clinic_id: i.clinic_id,
        name: i.name,
        sku: i.sku,
        category_id: i.category_id,
        category_name: null,
        unit_symbol: i.unit_symbol ?? 'un',
        unit_id: i.unit_id ?? null,
        description: i.description ?? null,
        min_stock: i.min_stock ?? 0,
        max_stock: i.max_stock ?? null,
        is_active: i.is_active ?? true,
        total_balance: balanceByItem.get(i.id) ?? 0,
      }));
    }

    // Other errors: propagate
    throw rpcRes.error;
  },
  get: async (id) => {
    const { data, error } = await supabase
      .from('stock_items')
      .select('id, name, sku, category_id')
      .eq('id', id);

    if (!data || data.length === 0) {
      throw new Error('Record not found');
    }
    return data[0];
    if (error) {
      throw error;
    }
    return data;
  },
  create: async (clinicId, payload) => {
    // Permite apenas colunas seguras conhecidas
    const safe = {
      name: payload?.name ?? null,
      sku: payload?.sku ?? null,
      category_id: payload?.category_id || null,
      description: payload?.description || null,
      unit_id: payload?.unit_id || null,
      min_stock:
        payload?.min_stock !== '' && payload?.min_stock !== null && payload?.min_stock !== undefined
          ? parseFloat(payload.min_stock)
          : 0,
      max_stock:
        payload?.max_stock !== '' && payload?.max_stock !== null && payload?.max_stock !== undefined
          ? parseFloat(payload.max_stock)
          : null,
      is_active: payload?.is_active ?? true,
    };
    const { data, error } = await supabase
      .from('stock_items')
      .insert({ ...safe, clinic_id: clinicId })
      .select('id, name, sku');

    if (error) {
      throw error;
    }
    if (!data || data.length === 0) {
      throw new Error('Record not found');
    }
    return data[0];
  },
  update: async (id, payload) => {
    // Atualiza apenas campos seguros
    const updatePayload = {
      name: payload?.name,
      sku: payload?.sku,
      category_id: payload?.category_id || null,
      description: payload?.description || null,
      unit_id: payload?.unit_id || null,
      min_stock:
        payload?.min_stock !== '' && payload?.min_stock !== null && payload?.min_stock !== undefined
          ? parseFloat(payload.min_stock)
          : 0,
      max_stock:
        payload?.max_stock !== '' && payload?.max_stock !== null && payload?.max_stock !== undefined
          ? parseFloat(payload.max_stock)
          : null,
      is_active: payload?.is_active,
    };
    const { data, error } = await supabase
      .from('stock_items')
      .update(updatePayload)
      .eq('id', id)
      .select('id, name, sku');

    if (error) {
      throw error;
    }
    if (!data || data.length === 0) {
      throw new Error('Record not found');
    }
    return data[0];
  },
  remove: async (id) => {
    const removeRes = await supabase.from('stock_items').delete().eq('id', id);

    if (!removeRes.error) {
      return { action: 'deleted' };
    }

    // If item has movements, keep historical integrity and inactivate the item instead.
    if (isForeignKeyViolationError(removeRes.error)) {
      const inactivateRes = await supabase
        .from('stock_items')
        .update({ is_active: false })
        .eq('id', id)
        .select('id, is_active')
        .single();

      if (inactivateRes.error) {
        throw inactivateRes.error;
      }

      return { action: 'inactivated_due_to_movements' };
    }

    throw removeRes.error;
  },
};

export const stockSuppliersApi = {
  list: async (clinicId) => {
    // Query only existing columns: cnpj (not tax_id), contact_person/contact_email/contact_phone (not contact_name/email/phone)
    const { data, error } = await supabase
      .from('stock_suppliers')
      .select(
        'id, name, cnpj, contact_person, contact_email, contact_phone, address, city, state, zip_code, active',
      )
      .eq('clinic_id', clinicId)
      .order('name');
    if (error) {
      throw error;
    }
    return data || [];
  },
  create: async (clinicId, payload) => {
    const safe = {
      name: payload?.name ?? null,
      cnpj: payload?.cnpj ?? null,
      contact_person: payload?.contact_person ?? null,
      contact_email: payload?.contact_email ?? null,
      contact_phone: payload?.contact_phone ?? null,
      address: payload?.address ?? null,
      city: payload?.city ?? null,
      state: payload?.state ?? null,
      zip_code: payload?.zip_code ?? null,
      active: payload?.active ?? true,
    };
    const { data, error } = await supabase
      .from('stock_suppliers')
      .insert({ ...safe, clinic_id: clinicId })
      .select();

    if (!data || data.length === 0) {
      throw new Error('Record not found');
    }
    return data[0];
    if (error) {
      throw error;
    }
    return data;
  },
  update: async (id, payload) => {
    const safe = {
      name: payload?.name,
      cnpj: payload?.cnpj,
      contact_person: payload?.contact_person,
      contact_email: payload?.contact_email,
      contact_phone: payload?.contact_phone,
      address: payload?.address,
      city: payload?.city,
      state: payload?.state,
      zip_code: payload?.zip_code,
      active: payload?.active,
    };
    const { data, error } = await supabase
      .from('stock_suppliers')
      .update(safe)
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
  },
  remove: async (id) => {
    return handleResponse(await supabase.from('stock_suppliers').delete().eq('id', id));
  },
};

export const stockUnitsApi = {
  list: async (clinicId) => {
    const { data, error } = await supabase
      .from('stock_units')
      .select('id, name, symbol')
      .eq('clinic_id', clinicId)
      .order('name');
    if (error) {
      throw error;
    }
    return data || [];
  },
  create: async (clinicId, payload) => {
    const { data, error } = await supabase
      .from('stock_units')
      .insert({ ...payload, clinic_id: clinicId })
      .select();

    if (error) {
      throw error;
    }
    if (!data || data.length === 0) {
      throw new Error('Record not found');
    }
    return data[0];
  },
  update: async (id, payload) => {
    const { data, error } = await supabase
      .from('stock_units')
      .update(payload)
      .eq('id', id)
      .select();

    if (error) {
      throw error;
    }
    if (!data || data.length === 0) {
      throw new Error('Record not found');
    }
    return data[0];
  },
  remove: async (id) => {
    return handleResponse(await supabase.from('stock_units').delete().eq('id', id));
  },
};

export const stockLocationsApi = {
  list: async (clinicId) => {
    const { data, error } = await supabase
      .from('stock_locations')
      .select('id, name')
      .eq('clinic_id', clinicId)
      .order('name');
    if (error) {
      throw error;
    }
    return data || [];
  },
  create: async (clinicId, payload) => {
    const safe = {
      name: payload?.name ?? null,
    };
    const { data, error } = await supabase
      .from('stock_locations')
      .insert({ ...safe, clinic_id: clinicId })
      .select('id, name');

    if (error) {
      throw error;
    }
    if (!data || data.length === 0) {
      throw new Error('Record not found');
    }
    return data[0];
  },
  update: async (id, payload) => {
    const safe = {
      name: payload?.name,
    };
    const { data, error } = await supabase
      .from('stock_locations')
      .update(safe)
      .eq('id', id)
      .select('id, name');

    if (error) {
      throw error;
    }
    if (!data || data.length === 0) {
      throw new Error('Record not found');
    }
    return data[0];
  },
  remove: async (id) => {
    return handleResponse(await supabase.from('stock_locations').delete().eq('id', id));
  },
};

export const stockMovementsApi = {
  list: async (clinicId, filters = {}) => {
    console.log('🔍 stockMovementsApi.list chamado:', { clinicId, filters });

    let query = supabase
      .from('stock_movements')
      .select(
        `
        id, created_at, movement_type, quantity, notes,
        stock_item_id, location_id,
        item:stock_items ( name )
      `,
      )
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false });

    // ✅ APLICAR FILTROS APENAS SE EXISTIREM
    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate);
    }
    if (filters.itemId) {
      query = query.eq('stock_item_id', filters.itemId);
    }
    if (filters.locationId) {
      query = query.eq('location_id', filters.locationId);
    }
    if (filters.type) {
      query = query.eq('movement_type', filters.type);
    }

    const { data, error } = await query.limit(100);

    console.log('📦 Resultado da query:', { data, error, count: data?.length });

    if (error) {
      throw error;
    }
    return data || [];
  },

  createBulkEntryWithFinance: async (clinicId, header, items, finance, supplierName) => {
    const { data, error } = await supabase.rpc('create_bulk_entry_with_finance', {
      p_clinic_id: clinicId,
      p_header: header,
      p_items: items,
      p_finance: finance,
      p_supplier_name: supplierName,
    });

    if (error) {
      throw error;
    }
    return data;
  },

  update: async (id, payload) => {
    const safe = {
      created_at: payload?.created_at ?? payload?.move_date ?? null,
      quantity: payload?.quantity ?? payload?.qty ?? null,
      notes: payload?.notes ?? null,
      location_id: payload?.location_id ?? null,
      stock_item_id: payload?.stock_item_id ?? payload?.item_id ?? null,
      movement_type: payload?.movement_type ?? payload?.type ?? null,
    };

    const { data, error } = await supabase
      .from('stock_movements')
      .update(safe)
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
  },

  remove: async (id) => {
    const { error } = await supabase.from('stock_movements').delete().eq('id', id);
    if (error) {
      throw error;
    }
  },

  // Remove movimento e, se houver vínculo, exclui a AP correspondente
  removeCascadeAP: async (id) => {
    // Tenta buscar ap_bill_id; se coluna não existir, tenta extrair do notes (padrão AP#<uuid>)
    let apId = null;
    let res = await supabase
      .from('stock_movements')
      .select('id, notes, ap_bill_id')
      .eq('id', id)
      .limit(1);

    if (!data || data.length === 0) {
      throw new Error('Record not found');
    }
    return data[0];
    if (res.error && isMissingColumnError(res.error)) {
      res = await supabase.from('stock_movements').select('id, notes').eq('id', id).limit(1);

      if (!data || data.length === 0) {
        throw new Error('Record not found');
      }
      return data[0];
    }
    if (res.error) {
      throw res.error;
    }
    const mv = res.data;
    apId = mv?.ap_bill_id ?? null;
    if (!apId && typeof mv?.notes === 'string') {
      const m = mv.notes.match(/AP#([0-9a-fA-F-]{10,})/);
      if (m) {
        apId = m[1];
      }
    }

    // Exclui o movimento
    const { error: delErr } = await supabase.from('stock_movements').delete().eq('id', id);
    if (delErr) {
      throw delErr;
    }

    // Exclui AP vinculada (se houver)
    if (apId) {
      try {
        await deleteAP(apId);
      } catch (e) {
        // Loga mas não interrompe a exclusão do movimento
        console.warn('[removeCascadeAP] falha ao excluir AP vinculada:', e?.message || e);
      }
    }
  },
};

// Requisições de estoque (stock_requests)
export const stockRequestsApi = {
  list: async (clinicId) => {
    const { data, error } = await supabase
      .from('stock_requests')
      .select(
        'id, created_at, status, notes, requested_by, purpose, approved_by, approved_at, approval_comment, location_id',
      )
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) {
      throw error;
    }
    return data || [];
  },

  getItems: async (requestId) => {
    const { data, error } = await supabase
      .from('stock_request_items')
      .select(
        'id, qty, delivered_qty, item_id, item_note, item:stock_items(name, category:stock_categories(name))',
      )
      .eq('request_id', requestId);
    if (error) {
      throw error;
    }
    return data || [];
  },

  getHeader: async (id) => {
    const { data, error } = await supabase
      .from('stock_requests')
      .select(
        'id, clinic_id, created_at, location_id, requested_by, purpose, notes, status, approved_by, approved_at, approval_comment',
      )
      .eq('id', id);

    if (!data || data.length === 0) {
      throw new Error('Record not found');
    }
    return data[0];
    if (error) {
      throw error;
    }
    return data;
  },

  create: async (clinicId, payload) => {
    // payload: { date, locationId, notes, requested_by, products:[{itemId, qty}] }
    const header = {
      clinic_id: clinicId,
      request_date: payload?.date,
      location_id: payload?.locationId,
      requested_by: payload?.requested_by || null,
      purpose: payload?.purpose || null,
      notes: payload?.notes || null,
      status: 'pending',
    };
    const { data: req, error: e1 } = await supabase.from('stock_requests').insert(header).select();

    if (!data || data.length === 0) {
      throw new Error('Record not found');
    }
    return data[0];
    if (e1) {
      throw e1;
    }

    const items = (payload?.products || [])
      .map((p) => ({
        request_id: req.id,
        item_id: p.itemId,
        qty: parseFloat(p.qty) || 0,
        item_note: p.item_note || null,
      }))
      .filter((i) => i.item_id && i.qty > 0);
    if (items.length) {
      const { error: e2 } = await supabase.from('stock_request_items').insert(items);
      if (e2) {
        throw e2;
      }
    }
    return req;
  },

  getItemsByRequestIds: async (requestIds) => {
    if (!Array.isArray(requestIds) || requestIds.length === 0) {
      return [];
    }
    const { data, error } = await supabase
      .from('stock_request_items')
      .select('id, request_id, qty, delivered_qty')
      .in('request_id', requestIds);
    if (error) {
      throw error;
    }
    return data || [];
  },

  // Get available balance for an item at a specific location
  getItemBalanceByLocation: async (clinicId, itemId, locationId) => {
    // Try RPC first
    try {
      const res = await supabase.rpc('get_item_balance_by_location', {
        p_clinic_id: clinicId,
        p_item_id: itemId,
        p_location_id: locationId,
      });
      if (!res.error) {
        return Number(res.data || 0);
      }
      // If function missing, fallback to client-side aggregation
      if (!isUndefinedFunctionError) {
        // no-op, just proceed
      }
      if (isUndefinedFunctionError(res.error, 'get_item_balance_by_location')) {
        const { data, error } = await supabase
          .from('stock_movements')
          .select('qty, type')
          .eq('clinic_id', clinicId)
          .eq('item_id', itemId)
          .eq('location_id', locationId);
        if (error) {
          throw error;
        }
        const bal = (data || []).reduce((acc, m) => {
          const sign =
            m.type === 'entry' ? 1 : m.type === 'exit' ? -1 : m.type === 'adjustment' ? 1 : 0;
          return acc + sign * Number(m.qty || 0);
        }, 0);
        return bal;
      }
      throw res.error;
    } catch (e) {
      // On any unexpected error, report zero to avoid breaking UI; callers may handle
      console.error('[getItemBalanceByLocation] error:', e);
      return 0;
    }
  },

  updateStatus: async (id, status) => {
    const { data, error } = await supabase
      .from('stock_requests')
      .update({ status })
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
  },

  approve: async (id, approver, comment) => {
    const payload = {
      status: 'approved',
      approved_by: approver || null,
      approved_at: new Date().toISOString(),
      approval_comment: comment || null,
    };
    const { data, error } = await supabase
      .from('stock_requests')
      .update(payload)
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
  },

  fulfill: async (clinicId, id) => {
    // Full fulfill all pending quantities
    const header = await stockRequestsApi.getHeader(id);
    const items = await stockRequestsApi.getItems(id);
    const rows = items
      .map((it) => {
        const pending = Math.max(0, parseFloat(it.qty) - parseFloat(it.delivered_qty || 0));
        return {
          clinic_id: clinicId,
          stock_item_id: it.item?.id || it.item_id,
          movement_type: 'exit',
          location_id: header.location_id,
          quantity: pending,
          created_at: header.request_date,
          notes: `Requisição atendida: ${header.notes || ''}`.trim(),
        };
      })
      .filter((r) => r.quantity > 0);
    if (rows.length) {
      const { error } = await supabase.from('stock_movements').insert(rows);
      if (error) {
        throw error;
      }
      // update delivered_qty
      for (const it of items) {
        const pending = Math.max(0, parseFloat(it.qty) - parseFloat(it.delivered_qty || 0));
        if (pending > 0) {
          const { error: eUpd } = await supabase
            .from('stock_request_items')
            .update({ delivered_qty: (it.delivered_qty || 0) + pending })
            .eq('id', it.id);
          if (eUpd) {
            throw eUpd;
          }
        }
      }
    }
    await stockRequestsApi.updateStatus(id, 'fulfilled');
  },

  fulfillPartial: async (clinicId, id, lines) => {
    // lines: [{ item_id, qty }]
    if (!Array.isArray(lines) || lines.length === 0) {
      return;
    }
    const header = await stockRequestsApi.getHeader(id);
    const toInsert = lines
      .map((l) => ({
        clinic_id: clinicId,
        stock_item_id: l.item_id,
        movement_type: 'exit',
        location_id: header.location_id,
        quantity: parseFloat(l.qty) || 0,
        created_at: header.request_date,
        notes: `Requisição atendida: ${header.notes || ''}`.trim(),
      }))
      .filter((r) => r.quantity > 0);
    if (toInsert.length) {
      const { error } = await supabase.from('stock_movements').insert(toInsert);
      if (error) {
        throw error;
      }
      // increment delivered_qty for each item
      for (const l of lines) {
        const qty = parseFloat(l.qty) || 0;
        if (qty > 0) {
          const { data: it, error: eGet } = await supabase
            .from('stock_request_items')
            .select('id, delivered_qty, qty')
            .eq('id', l.id || '');

          if (!data || data.length === 0) {
            throw new Error('Record not found');
          }
          return data[0];
          if (!it || eGet) {
            // fallback by request_id + item_id
            const { data: it2, error: e2 } = await supabase
              .from('stock_request_items')
              .select('id, delivered_qty, qty')
              .eq('request_id', id)
              .eq('item_id', l.item_id)
              .limit(1);

            if (!data || data.length === 0) {
              throw new Error('Record not found');
            }
            return data[0];
            if (e2) {
              throw e2;
            }
            const newDelivered = Math.min(
              parseFloat(it2.qty),
              parseFloat(it2.delivered_qty || 0) + qty,
            );
            const { error: eUpd } = await supabase
              .from('stock_request_items')
              .update({ delivered_qty: newDelivered })
              .eq('id', it2.id);
            if (eUpd) {
              throw eUpd;
            }
          } else {
            const newDelivered = Math.min(
              parseFloat(it.qty),
              parseFloat(it.delivered_qty || 0) + qty,
            );
            const { error: eUpd } = await supabase
              .from('stock_request_items')
              .update({ delivered_qty: newDelivered })
              .eq('id', it.id);
            if (eUpd) {
              throw eUpd;
            }
          }
        }
      }
    }
    // recompute status
    const items = await stockRequestsApi.getItems(id);
    const allDelivered = items.every((i) => parseFloat(i.delivered_qty || 0) >= parseFloat(i.qty));
    await stockRequestsApi.updateStatus(id, allDelivered ? 'fulfilled' : 'partially_fulfilled');
  },

  remove: async (id) => {
    const { error } = await supabase.from('stock_requests').delete().eq('id', id);
    if (error) {
      throw error;
    }
  },
};
