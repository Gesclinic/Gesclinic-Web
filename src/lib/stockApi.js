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

const normalizeDocument = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  return digits || null;
};

const isCnpjDocument = (value) => normalizeDocument(value)?.length === 14;

const normalizePublicCompany = (company) => {
  if (!company) return null;
  const cnpj = normalizeDocument(company.cnpj);
  const name = company.razao_social || company.nome || company.nome_fantasia || company.fantasia;
  if (!cnpj || !name) return null;

  return compactObject({
    name,
    cnpj,
    contact_person: company.nome_fantasia || company.fantasia || null,
    contact_email: company.email || null,
    contact_phone: company.ddd_telefone_1 || company.telefone || null,
    address: [company.logradouro, company.numero].filter(Boolean).join(', ') || company.descricao_tipo_de_logradouro || null,
    neighborhood: company.bairro || null,
    city: company.municipio || null,
    state: company.uf || null,
    zip_code: normalizeDocument(company.cep),
  });
};

const lookupPublicCompanyByCnpj = async (document) => {
  const cnpj = normalizeDocument(document);
  if (!isCnpjDocument(cnpj) || typeof fetch !== 'function') {
    return null;
  }

  try {
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
    if (!response.ok) {
      return null;
    }
    return normalizePublicCompany(await response.json());
  } catch (error) {
    console.warn('[stockSuppliersApi] Consulta publica de CNPJ indisponivel:', error);
    return null;
  }
};

const normalizeStockSupplier = (row) => ({
  ...row,
  tax_id: row?.cnpj || '',
  contact_name: row?.contact_person || '',
  email: row?.contact_email || '',
  phone: row?.contact_phone || '',
  street: row?.address || '',
  neighborhood: row?.neighborhood || '',
  postal_code: row?.zip_code || '',
});

const compactObject = (value) =>
  Object.fromEntries(
    Object.entries(value || {}).filter(([, entry]) => entry !== undefined && entry !== null && entry !== ''),
  );

const isUniqueSupplierDocumentError = (error) => {
  return error?.code === '23505' && String(error?.message || '').includes('idx_stock_suppliers_unique_document_per_clinic');
};

const supplierDocumentErrorMessage = 'Já existe fornecedor cadastrado com este CNPJ/CPF.';

const normalizeSearchText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const sanitizeSku = (value) => {
  const text = String(value || '').trim();
  return text ? text.slice(0, 50) : null;
};

const tokenizeSearchText = (value) =>
  normalizeSearchText(value)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3);

const similarityScore = (left, right) => {
  const leftText = normalizeSearchText(left);
  const rightText = normalizeSearchText(right);
  if (!leftText || !rightText) {
    return 0;
  }
  if (leftText === rightText) {
    return 1;
  }
  if (leftText.includes(rightText) || rightText.includes(leftText)) {
    return 0.85;
  }

  const leftTokens = new Set(tokenizeSearchText(leftText));
  const rightTokens = new Set(tokenizeSearchText(rightText));
  if (!leftTokens.size || !rightTokens.size) {
    return 0;
  }

  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  return intersection / Math.max(leftTokens.size, rightTokens.size);
};

const findBestByText = (rows, text, fields = ['name'], threshold = 0.65) => {
  let best = null;
  let bestScore = 0;
  for (const row of rows || []) {
    const score = Math.max(...fields.map((field) => similarityScore(text, row?.[field] || '')));
    if (score > bestScore) {
      best = row;
      bestScore = score;
    }
  }
  return bestScore >= threshold ? best : null;
};

const classifyStockItem = (item) => {
  const text = normalizeSearchText(`${item?.description || ''} ${item?.code || ''}`);
  if (item?.anvisa_code || /\b(medicamento|farmaco|remedio|anvisa|ampola|comprimido|capsula)\b/.test(text)) {
    return { category: 'Medicamentos e Insumos Farmaceuticos', subcategory: 'Medicamentos' };
  }
  if (/\b(equipamento|imobilizado|aparelho|monitor|computador|notebook|impressora|scanner|mobiliario|cadeira|mesa)\b/.test(text)) {
    return { category: 'Equipamentos e Imobilizados', subcategory: 'Imobilizados' };
  }
  if (/\b(expediente|papel|caneta|lapis|envelope|pasta|toner|cartucho|etiqueta|bobina)\b/.test(text)) {
    return { category: 'Materiais de Expediente', subcategory: 'Expediente' };
  }
  if (/\b(procedimento|luva|seringa|agulha|gaze|atadura|mascara|cateter|sonda|curativo|campo|fio|sutura)\b/.test(text)) {
    return { category: 'Materiais de Procedimento', subcategory: 'Procedimentos' };
  }
  if (/\b(consumo|limpeza|higiene|alcool|sabonete|desinfetante|detergente|papel toalha|copo|saco)\b/.test(text)) {
    return { category: 'Materiais de Consumo', subcategory: 'Consumo Geral' };
  }
  return { category: 'Materiais de Consumo', subcategory: 'Consumo Geral' };
};

const normalizeStockMovement = (row) => ({
  ...row,
  move_date: row?.created_at ? String(row.created_at).slice(0, 10) : null,
  type: row?.movement_type || null,
  qty: row?.quantity ?? null,
  item_id: row?.stock_item_id || null,
  unit_cost: row?.unit_cost ?? null,
});

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
  ensureByName: async (clinicId, name) => {
    const categoryName = String(name || '').trim() || 'Materiais de Consumo';
    const { data, error } = await supabase
      .from('stock_categories')
      .select('id, name, description, code, color, active')
      .eq('clinic_id', clinicId)
      .order('name');

    if (error) {
      throw error;
    }
    const existing = findBestByText(data || [], categoryName, ['name', 'code', 'description'], 0.65);
    if (existing) {
      return existing;
    }

    return stockCategoriesApi.create(clinicId, {
      name: categoryName,
      description: 'Categoria criada automaticamente a partir de XML fiscal de contas a pagar.',
      active: true,
    });
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

export const stockSubcategoriesApi = {
  list: async (clinicId, categoryId = null) => {
    let query = supabase
      .from('stock_subcategories')
      .select('id, clinic_id, category_id, name, description, active')
      .eq('clinic_id', clinicId)
      .order('name');
    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }
    const { data, error } = await query;
    if (error) {
      if (isMissingColumnError(error) || error.code === '42P01') {
        return [];
      }
      throw error;
    }
    return data || [];
  },
  ensureByName: async (clinicId, categoryId, name) => {
    const subcategoryName = String(name || '').trim();
    if (!clinicId || !categoryId || !subcategoryName) {
      return null;
    }

    const rows = await stockSubcategoriesApi.list(clinicId, categoryId);
    const existing = findBestByText(rows, subcategoryName, ['name', 'description'], 0.7);
    if (existing) {
      return existing;
    }

    const { data, error } = await supabase
      .from('stock_subcategories')
      .insert({
        clinic_id: clinicId,
        category_id: categoryId,
        name: subcategoryName,
        description: 'Subcategoria criada automaticamente a partir de XML fiscal de contas a pagar.',
        active: true,
      })
      .select('id, clinic_id, category_id, name, description, active')
      .single();

    if (error) {
      throw error;
    }
    return data;
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
          'id, clinic_id, name, sku, category_id, subcategory_id, description, unit_id, unit_symbol, min_stock, max_stock, is_active',
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
        .select('stock_item_id, quantity, movement_type')
        .eq('clinic_id', clinicId)
        .in('stock_item_id', ids);
      if (movRes.error) {
        throw movRes.error;
      }

      const movements = movRes.data || [];
      const balanceByItem = new Map();
      for (const m of movements) {
        const sign =
          m.movement_type === 'entry' ? 1 : m.movement_type === 'exit' ? -1 : m.movement_type === 'adjustment' ? 1 : 0;
        balanceByItem.set(
          m.stock_item_id,
          (balanceByItem.get(m.stock_item_id) || 0) + sign * Number(m.quantity || 0),
        );
      }

      // Shape result similar to RPC
      return items.map((i) => ({
        id: i.id,
        clinic_id: i.clinic_id,
        name: i.name,
        sku: i.sku,
        category_id: i.category_id,
        subcategory_id: i.subcategory_id ?? null,
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
      .select('id, name, sku, category_id, subcategory_id')
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
      subcategory_id: payload?.subcategory_id || null,
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
      .select('id, name, sku, category_id, subcategory_id');

    if (error) {
      throw error;
    }
    if (!data || data.length === 0) {
      throw new Error('Record not found');
    }
    return data[0];
  },
  ensureFromDocumentItem: async (clinicId, documentItem) => {
    const name = String(documentItem?.description || '').trim();
    if (!clinicId || !name) {
      return null;
    }

    const sku = sanitizeSku(documentItem?.code);
    if (sku) {
      const { data: skuMatch, error: skuError } = await supabase
        .from('stock_items')
        .select('id, name, sku, category_id, subcategory_id')
        .eq('clinic_id', clinicId)
        .eq('sku', sku)
        .limit(1)
        .maybeSingle();

      if (skuError) {
        throw skuError;
      }
      if (skuMatch) {
        return skuMatch;
      }
    }

    const { data: candidates, error: candidatesError } = await supabase
      .from('stock_items')
      .select('id, name, sku, category_id, subcategory_id, description')
      .eq('clinic_id', clinicId)
      .limit(500);

    if (candidatesError) {
      throw candidatesError;
    }

    const existing = findBestByText(candidates || [], name, ['name', 'description'], 0.82);
    if (existing) {
      return existing;
    }

    const classification = classifyStockItem(documentItem);
    const category = await stockCategoriesApi.ensureByName(clinicId, classification.category);
    const subcategory = await stockSubcategoriesApi.ensureByName(
      clinicId,
      category?.id,
      classification.subcategory,
    );

    let insertPayload = {
      clinic_id: clinicId,
      name,
      sku,
      category_id: category?.id || null,
      subcategory_id: subcategory?.id || null,
      description: documentItem?.code ? `Criado automaticamente pelo item fiscal ${documentItem.code}.` : 'Criado automaticamente por XML fiscal de contas a pagar.',
      unit_cost: null,
      unit_symbol: documentItem?.unit_symbol || 'un',
      min_stock: 0,
      is_active: true,
      active: true,
    };

    const unitCost = Number(documentItem?.unit_value || 0);
    if (Number.isFinite(unitCost) && unitCost > 0) {
      insertPayload.unit_cost = unitCost;
    }

    let { data, error } = await supabase
      .from('stock_items')
      .insert(insertPayload)
      .select('id, name, sku, category_id, subcategory_id')
      .single();

    if (error && isMissingColumnError(error)) {
      const { subcategory_id, ...fallbackPayload } = insertPayload;
      const fallback = await supabase
        .from('stock_items')
        .insert(fallbackPayload)
        .select('id, name, sku, category_id')
        .single();
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      if (error.code === '23505') {
        const refreshed = await supabase
          .from('stock_items')
          .select('id, name, sku, category_id, subcategory_id')
          .eq('clinic_id', clinicId)
          .or(sku ? `sku.eq.${sku},name.eq.${name}` : `name.eq.${name}`)
          .limit(1)
          .maybeSingle();
        if (!refreshed.error && refreshed.data) {
          return refreshed.data;
        }
      }
      throw error;
    }
    return data;
  },
  update: async (id, payload) => {
    // Atualiza apenas campos seguros
    const updatePayload = {
      name: payload?.name,
      sku: payload?.sku,
      category_id: payload?.category_id || null,
      subcategory_id: payload?.subcategory_id || null,
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
      .select('id, name, sku, category_id, subcategory_id');

    if (error) {
      throw error;
    }
    if (!data || data.length === 0) {
      throw new Error('Record not found');
    }
    return data[0];
  },
  remove: async (id) => {
    return handleResponse(await supabase.from('stock_items').delete().eq('id', id));
  },
};

export const stockSuppliersApi = {
  list: async (clinicId) => {
    const { data, error } = await supabase
      .from('stock_suppliers')
      .select(
        'id, name, cnpj, contact_person, contact_email, contact_phone, address, neighborhood, city, state, zip_code, active',
      )
      .eq('clinic_id', clinicId)
      .order('name');
    if (error) {
      throw error;
    }
    return (data || []).map(normalizeStockSupplier);
  },
  findByDocument: async (clinicId, document) => {
    const cnpj = normalizeDocument(document);
    if (!clinicId || !cnpj) {
      return null;
    }

    const { data, error } = await supabase
      .from('stock_suppliers')
      .select('id, name, cnpj, contact_person, contact_email, contact_phone, address, neighborhood, city, state, zip_code, active')
      .eq('clinic_id', clinicId)
      .or(`cnpj.eq.${cnpj},cnpj.eq.${document}`)
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }
    return data ? normalizeStockSupplier(data) : null;
  },
  get: async (id) => {
    const { data, error } = await supabase
      .from('stock_suppliers')
      .select('id, name, cnpj, contact_person, contact_email, contact_phone, address, neighborhood, city, state, zip_code, active')
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }
    return normalizeStockSupplier(data);
  },
  ensureFromDocument: async (clinicId, payload) => {
    const cnpj = normalizeDocument(payload?.cnpj || payload?.tax_id || payload?.document_number || payload?.supplier_document);
    if (!clinicId || (!cnpj && !(payload?.name || payload?.supplier_name))) {
      return null;
    }

    const existing = cnpj ? await stockSuppliersApi.findByDocument(clinicId, cnpj) : null;
    const publicRegistration = existing ? null : await lookupPublicCompanyByCnpj(cnpj);
    const enrichedPayload = {
      ...(publicRegistration || {}),
      ...(payload || {}),
      name: payload?.name || payload?.supplier_name || publicRegistration?.name,
      cnpj: cnpj || publicRegistration?.cnpj,
      contact_person: payload?.contact_person ?? payload?.contact_name ?? publicRegistration?.contact_person,
      contact_email: payload?.contact_email ?? payload?.email ?? publicRegistration?.contact_email,
      contact_phone: payload?.contact_phone ?? payload?.phone ?? publicRegistration?.contact_phone,
      address: payload?.address ?? payload?.street ?? publicRegistration?.address,
      neighborhood: payload?.neighborhood ?? payload?.district ?? publicRegistration?.neighborhood,
      city: payload?.city ?? publicRegistration?.city,
      state: payload?.state ?? publicRegistration?.state,
      zip_code: payload?.zip_code ?? payload?.postal_code ?? publicRegistration?.zip_code,
    };

    const name = enrichedPayload.name;
    if (!name) {
      return null;
    }

    const supplierPayload = {
      name,
      cnpj: enrichedPayload.cnpj,
      contact_person: enrichedPayload.contact_person ?? null,
      contact_email: enrichedPayload.contact_email ?? null,
      contact_phone: enrichedPayload.contact_phone ?? null,
      address: enrichedPayload.address ?? null,
      neighborhood: enrichedPayload.neighborhood ?? null,
      city: enrichedPayload.city ?? null,
      state: enrichedPayload.state ?? null,
      zip_code: enrichedPayload.zip_code ?? null,
      active: true,
    };

    if (existing) {
      const missingPatch = compactObject({
        name: existing.name ? undefined : supplierPayload.name,
        contact_person: existing.contact_person ? undefined : supplierPayload.contact_person,
        contact_email: existing.contact_email ? undefined : supplierPayload.contact_email,
        contact_phone: existing.contact_phone ? undefined : supplierPayload.contact_phone,
        address: existing.address ? undefined : supplierPayload.address,
        neighborhood: existing.neighborhood ? undefined : supplierPayload.neighborhood,
        city: existing.city ? undefined : supplierPayload.city,
        state: existing.state ? undefined : supplierPayload.state,
        zip_code: existing.zip_code ? undefined : supplierPayload.zip_code,
      });

      if (Object.keys(missingPatch).length > 0) {
        return stockSuppliersApi.update(existing.id, missingPatch);
      }
      return existing;
    }

    return stockSuppliersApi.create(clinicId, supplierPayload);
  },
  lookupPublicRegistration: async (document) => lookupPublicCompanyByCnpj(document),
  create: async (clinicId, payload) => {
    const safe = {
      name: payload?.name ?? null,
      cnpj: normalizeDocument(payload?.cnpj ?? payload?.tax_id),
      contact_person: payload?.contact_person ?? payload?.contact_name ?? null,
      contact_email: payload?.contact_email ?? payload?.email ?? null,
      contact_phone: payload?.contact_phone ?? payload?.phone ?? null,
      address: payload?.address ?? payload?.street ?? null,
      neighborhood: payload?.neighborhood ?? payload?.district ?? null,
      city: payload?.city ?? null,
      state: payload?.state ?? null,
      zip_code: payload?.zip_code ?? payload?.postal_code ?? null,
      active: payload?.active ?? true,
    };

    if (safe.cnpj) {
      const existing = await stockSuppliersApi.findByDocument(clinicId, safe.cnpj);
      if (existing) {
        throw new Error(supplierDocumentErrorMessage);
      }
    }

    const { data, error } = await supabase
      .from('stock_suppliers')
      .insert({ ...safe, clinic_id: clinicId })
      .select('id, name, cnpj, contact_person, contact_email, contact_phone, address, neighborhood, city, state, zip_code, active');

    if (error) {
      if (isUniqueSupplierDocumentError(error)) {
        throw new Error(supplierDocumentErrorMessage);
      }
      throw error;
    }

    if (!data || data.length === 0) {
      throw new Error('Record not found');
    }
    return normalizeStockSupplier(data[0]);
  },
  update: async (id, payload) => {
    const safe = compactObject({
      name: payload?.name,
      cnpj: payload?.cnpj !== undefined || payload?.tax_id !== undefined ? normalizeDocument(payload?.cnpj ?? payload?.tax_id) : undefined,
      contact_person: payload?.contact_person ?? payload?.contact_name,
      contact_email: payload?.contact_email ?? payload?.email,
      contact_phone: payload?.contact_phone ?? payload?.phone,
      address: payload?.address ?? payload?.street,
      neighborhood: payload?.neighborhood ?? payload?.district,
      city: payload?.city,
      state: payload?.state,
      zip_code: payload?.zip_code ?? payload?.postal_code,
      active: payload?.active,
    });

    const { data: current, error: currentError } = await supabase
      .from('stock_suppliers')
      .select('id, clinic_id')
      .eq('id', id)
      .single();

    if (currentError) {
      throw currentError;
    }

    if (safe.cnpj) {
      const existing = await stockSuppliersApi.findByDocument(current.clinic_id, safe.cnpj);
      if (existing && existing.id !== id) {
        throw new Error(supplierDocumentErrorMessage);
      }
    }

    const { data, error } = await supabase
      .from('stock_suppliers')
      .update(safe)
      .eq('id', id)
      .select('id, name, cnpj, contact_person, contact_email, contact_phone, address, neighborhood, city, state, zip_code, active');

    if (error) {
      if (isUniqueSupplierDocumentError(error)) {
        throw new Error(supplierDocumentErrorMessage);
      }
      throw error;
    }

    if (!data || data.length === 0) {
      throw new Error('Record not found');
    }
    return normalizeStockSupplier(data[0]);
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
  ensureDefault: async (clinicId) => {
    const { data, error } = await supabase
      .from('stock_locations')
      .select('id, name')
      .eq('clinic_id', clinicId)
      .ilike('name', 'Estoque Principal')
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }
    if (data) {
      return data;
    }

    return stockLocationsApi.create(clinicId, { name: 'Estoque Principal' });
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
    return (data || []).map(normalizeStockMovement);
  },

  createEntriesFromPayableDocument: async (clinicId, payable, options = {}) => {
    const items = Array.isArray(options.items) ? options.items : [];
    const stockItems = items.filter((item) => {
      const quantity = Number(item?.quantity || item?.qty || 0);
      const name = String(item?.description || item?.name || '').trim();
      return name && Number.isFinite(quantity) && quantity > 0;
    });

    if (!clinicId || !payable?.id || stockItems.length === 0) {
      return { created: 0, skipped: true };
    }

    const { error: deleteError } = await supabase
      .from('stock_movements')
      .delete()
      .eq('clinic_id', clinicId)
      .eq('reference_type', 'accounts_payable')
      .eq('reference_id', payable.id);

    if (deleteError) {
      throw deleteError;
    }

    const location = options.locationId
      ? { id: options.locationId }
      : await stockLocationsApi.ensureDefault(clinicId);
    const movementDate = options.issueDate || payable.issue_date || payable.competency_date || payable.due_date || new Date().toISOString();
    const createdAt = String(movementDate).includes('T') ? movementDate : `${movementDate}T12:00:00`;

    const rows = [];
    for (const item of stockItems) {
      const stockItem = await stockItemsApi.ensureFromDocumentItem(clinicId, item);
      if (!stockItem?.id) {
        continue;
      }
      const quantity = Number(item.quantity || item.qty || 0);
      const totalValue = Number(item.total_value || item.total || 0);
      const unitValue = Number(item.unit_value || item.unit || (quantity > 0 ? totalValue / quantity : 0));
      rows.push({
        clinic_id: clinicId,
        stock_item_id: stockItem.id,
        movement_type: 'entry',
        quantity,
        location_id: location?.id || null,
        reference_type: 'accounts_payable',
        reference_id: payable.id,
        notes: [
          `Entrada automatica XML AP#${payable.id}`,
          options.invoiceNumber ? `NF ${options.invoiceNumber}` : null,
          options.supplierName ? `Fornecedor ${options.supplierName}` : null,
          Number.isFinite(unitValue) && unitValue > 0 ? `Custo unitario R$ ${unitValue.toFixed(2)}` : null,
        ].filter(Boolean).join(' | '),
        created_at: createdAt,
      });
    }

    if (!rows.length) {
      return { created: 0, skipped: true };
    }

    const { data, error } = await supabase
      .from('stock_movements')
      .insert(rows)
      .select('id');

    if (error) {
      throw error;
    }
    return { created: data?.length || 0, location_id: location?.id || null };
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
    // Remove movimento e, quando ele nasceu de uma entrada manual com AP, remove a AP vinculada.
    let apId = null;
    const res = await supabase
      .from('stock_movements')
      .select('id, notes, reference_type, reference_id')
      .eq('id', id)
      .maybeSingle();

    if (res.error) {
      throw res.error;
    }
    if (!res.data) {
      throw new Error('Record not found');
    }

    const mv = res.data;
    apId = mv?.reference_type === 'accounts_payable' ? mv.reference_id : null;
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
