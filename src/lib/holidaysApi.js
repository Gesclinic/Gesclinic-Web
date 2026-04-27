import { supabase } from './customSupabaseClient';

/**
 * HOLIDAYS API
 * 
 * Gerencia feriados, bloqueios de agenda e overrides manuais
 * Segue padrÃ£o de sistemas grandes (MV, Amplimed, iClinic)
 */

// ============================================================================
// CONSULTAS - Verificar status de feriado
// ============================================================================

/**
 * Verifica se uma data Ã© um feriado bloqueado
 * @param {string} date - Data no formato YYYY-MM-DD
 * @param {string} clinicId - ID da clÃ­nica
 * @param {object} options - { state, city } para feriados estaduais/municipais
 * @returns {boolean} true se bloqueado, false se aberto
 */
export async function isHolidayBlocked(date, clinicId, options = {}) {
  try {
    const { state = null, city = null } = options;
    
    const { data, error } = await supabase.rpc('is_holiday_blocked', {
      p_date: date,
      p_clinic_id: clinicId,
      p_state: state,
      p_city: city,
    });

    if (error) throw error;
    return data || false;
  } catch (error) {
    console.error('Erro ao verificar feriado:', error);
    return false;
  }
}

/**
 * ObtÃ©m detalhes do feriado para uma data
 * @param {string} date - Data no formato YYYY-MM-DD
 * @param {string} clinicId - ID da clÃ­nica
 * @param {object} options - { state, city }
 * @returns {object|null} { id, name, scope, is_blocked, has_override }
 */
export async function getHolidayDetails(date, clinicId, options = {}) {
  try {
    const { state = null, city = null } = options;
    
    const { data, error } = await supabase.rpc('get_holiday_details', {
      p_date: date,
      p_clinic_id: clinicId,
      p_state: state,
      p_city: city,
    });

    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('Erro ao buscar detalhes do feriado:', error);
    return null;
  }
}

/**
 * Verifica mÃºltiplas datas de uma vez (para semana/mÃªs)
 * Busca feriados nacionais + feriados especÃ­ficos da clÃ­nica
 * @param {array} dates - Array de datas YYYY-MM-DD
 * @param {string} clinicId - ID da clÃ­nica (opcional)
 * @returns {object} { [date]: { name, is_blocked, has_override } }
 */
export async function checkMultipleDates(dates, clinicId, options = {}) {
  try {
    const results = {};
    
    if (!dates || dates.length === 0) {
      console.warn('âŒ checkMultipleDates: datas vazias');
      return results;
    }

    // Normalizar datas - remover hora se tiver
    const normalizedDates = dates.map(d => {
      if (typeof d === 'string' && d.includes('T')) {
        return d.split('T')[0];
      }
      return d;
    });

    console.log('ðŸ” checkMultipleDates:', { 
      datesCount: normalizedDates.length, 
      dates: normalizedDates.slice(0, 3),
      clinicId 
    });

    // âœ… FIX: Construir query de forma condicional para evitar erro "invalid input syntax for type uuid: null"
    let query = supabase
      .from('holidays')
      .select('id, date, name, scope, is_blocked, is_mandatory, clinic_id')
      .in('date', normalizedDates);

    // Se clinicId nÃ£o existe, buscar APENAS feriados nacionais (clinic_id IS NULL)
    // Se clinicId existe, buscar feriados nacionais OU da clÃ­nica
    if (clinicId) {
      query = query.or(`clinic_id.is.null,clinic_id.eq.${clinicId}`);
    } else {
      query = query.is('clinic_id', null);
    }

    const { data: holidays, error } = await query;

    if (error) {
      console.error('âŒ Erro ao buscar feriados:', error);
      return results;
    }

    console.log(`âœ… Feriados encontrados: ${holidays?.length || 0}`, holidays);

    // Para cada feriado encontrado, coloca no mapa
    for (const holiday of (holidays || [])) {
      // âœ… IMPORTANTE: NÃƒO filtrar aqui - deixar filtragem no rendering
      // Todos os feriados vÃ£o para o mapa, a lÃ³gica de exibiÃ§Ã£o filtra based em is_mandatory

      // Normalizar data
      const dateStr = holiday.date ? holiday.date.split('T')[0] : holiday.date;
      
      console.log(`ðŸ—“ï¸ Processando:`, { 
        date: dateStr, 
        name: holiday.name, 
        is_blocked: holiday.is_blocked,
        is_mandatory: holiday.is_mandatory,
        clinic_id: holiday.clinic_id
      });
      
      results[dateStr] = {
        name: holiday.name,
        is_blocked: holiday.is_blocked,
        is_mandatory: holiday.is_mandatory ?? true, // Default: true (obrigatÃ³rio)
        has_override: false,
        scope: holiday.scope,
      };
    }

    console.log(`ðŸŽ¯ Retornando ${Object.keys(results).length} datas com feriado:`, Object.keys(results));
    return results;
  } catch (error) {
    console.error('âŒ Erro ao verificar mÃºltiplas datas:', error);
    return {};
  }
}

/**
 * Lista todos os feriados de um perÃ­odo
 * @param {string} startDate - Data inicial YYYY-MM-DD
 * @param {string} endDate - Data final YYYY-MM-DD
 * @param {string} clinicId - ID da clÃ­nica
 * @returns {array} Lista de feriados
 */
export async function listHolidaysInRange(startDate, endDate, clinicId) {
  try {
    const { data, error } = await supabase
      .from('holidays')
      .select('id, date, name, scope, is_blocked, state, city, created_at')
      .eq('clinic_id', clinicId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao listar feriados:', error);
    return [];
  }
}

// ============================================================================
// MUTAÃ‡Ã•ES - Gerenciar feriados e overrides
// ============================================================================

/**
 * Abre agenda manualmente para um feriado bloqueado
 * @param {string} date - Data YYYY-MM-DD
 * @param {string} clinicId - ID da clÃ­nica
 * @param {string} userId - ID do usuÃ¡rio que abriu
 * @param {string} notes - Motivo/notas
 * @returns {object} Override record ou null
 */
export async function openHolidayManual(date, clinicId, userId, notes = null) {
  try {
    const { data, error } = await supabase.rpc('open_holiday_manual', {
      p_date: date,
      p_clinic_id: clinicId,
      p_user_id: userId,
      p_notes: notes,
    });

    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('Erro ao abrir agenda manualmente:', error);
    return null;
  }
}

/**
 * Fecha override manual para um feriado
 * @param {string} date - Data YYYY-MM-DD
 * @param {string} clinicId - ID da clÃ­nica
 * @returns {boolean} true se sucesso
 */
export async function closeHolidayOverride(date, clinicId) {
  try {
    const { error } = await supabase.rpc('close_holiday_override', {
      p_date: date,
      p_clinic_id: clinicId,
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Erro ao fechar override:', error);
    return false;
  }
}

/**
 * Cria um novo feriado
 * @param {object} holiday - { date, name, scope, state?, city?, is_blocked, clinic_id }
 * @returns {object|null} Holiday criado ou null
 */
export async function createHoliday(holiday) {
  try {
    const { data, error } = await supabase
      .from('holidays')
      .insert([holiday])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao criar feriado:', error);
    return null;
  }
}

/**
 * Atualiza um feriado
 * @param {string} holidayId - ID do feriado
 * @param {object} updates - Campos a atualizar
 * @returns {object|null} Holiday atualizado ou null
 */
export async function updateHoliday(holidayId, updates) {
  try {
    const { data, error } = await supabase
      .from('holidays')
      .update(updates)
      .eq('id', holidayId)
      .select();

    if (!data || data.length === 0) {
      throw new Error('Record not found');
    }
    return data[0];

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao atualizar feriado:', error);
    return null;
  }
}

/**
 * Deleta um feriado
 * @param {string} holidayId - ID do feriado
 * @returns {boolean} true se sucesso
 */
export async function deleteHoliday(holidayId) {
  try {
    const { error } = await supabase
      .from('holidays')
      .delete()
      .eq('id', holidayId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Erro ao deletar feriado:', error);
    return false;
  }
}

/**
 * ObtÃ©m todos os overrides de um perÃ­odo
 * @param {string} startDate - Data inicial YYYY-MM-DD
 * @param {string} endDate - Data final YYYY-MM-DD
 * @param {string} clinicId - ID da clÃ­nica
 * @returns {array} Lista de overrides
 */
export async function listOverridesInRange(startDate, endDate, clinicId) {
  try {
    const { data, error } = await supabase
      .from('agenda_day_override')
      .select('date, allow_manual, opened_by, opened_at, notes')
      .eq('clinic_id', clinicId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao listar overrides:', error);
    return [];
  }
}

/**
 * Seed data - Popular feriados nacionais de um ano
 * âš¡ VersÃ£o robusta - Funciona mesmo se jÃ¡ existirem dados
 * @param {number} year - Ano
 * @param {string} clinicId - ID da clÃ­nica (opcional)
 * @returns {boolean} true se sucesso
 */
export async function seedNationalHolidays(year, clinicId) {
  try {
    // Feriados Nacionais do Brasil sÃ£o globais - nÃ£o usar clinic_id
    console.log(`ðŸŒ± [Seed] Iniciando seed de feriados ${year}:`, { year, clinicId });

    const holidays = [
      { date: `${year}-01-01`, name: 'ConfraternizaÃ§Ã£o Universal', scope: 'NACIONAL', is_blocked: true, is_mandatory: true },
      { date: `${year}-02-13`, name: 'Carnaval', scope: 'NACIONAL', is_blocked: false, is_mandatory: false },
      { date: `${year}-02-14`, name: 'Sexta-feira de Carnaval', scope: 'NACIONAL', is_blocked: false, is_mandatory: false },
      { date: `${year}-02-17`, name: 'TerÃ§a-feira de Carnaval', scope: 'NACIONAL', is_blocked: false, is_mandatory: false },
      { date: `${year}-04-03`, name: 'Sexta-feira Santa', scope: 'NACIONAL', is_blocked: true, is_mandatory: true },
      { date: `${year}-04-21`, name: 'Tiradentes', scope: 'NACIONAL', is_blocked: true, is_mandatory: true },
      { date: `${year}-05-01`, name: 'Dia do Trabalho', scope: 'NACIONAL', is_blocked: true, is_mandatory: true },
      { date: `${year}-09-07`, name: 'IndependÃªncia do Brasil', scope: 'NACIONAL', is_blocked: true, is_mandatory: true },
      { date: `${year}-10-12`, name: 'Nossa Senhora Aparecida', scope: 'NACIONAL', is_blocked: true, is_mandatory: true },
      { date: `${year}-11-02`, name: 'Finados', scope: 'NACIONAL', is_blocked: true, is_mandatory: true },
      { date: `${year}-11-15`, name: 'ProclamaÃ§Ã£o da RepÃºblica', scope: 'NACIONAL', is_blocked: true, is_mandatory: true },
      { date: `${year}-11-20`, name: 'ConsciÃªncia Negra', scope: 'NACIONAL', is_blocked: true, is_mandatory: true },
      { date: `${year}-12-25`, name: 'Natal', scope: 'NACIONAL', is_blocked: true, is_mandatory: true },
    ];

    console.log(`ðŸ“‹ [Seed] Total de feriados a inserir: ${holidays.length}`);

    // âœ… ESTRATÃ‰GIA: Delete + Reinsert para garantir dados corretos
    // Se houver feriados antigos (versÃ£o anterior com 12 ao invÃ©s de 13), deleta e refaz
    
    // Verificar quantos feriados nacionais jÃ¡ existem para este ano
    const { count: existingCount } = await supabase
      .from('holidays')
      .select('*', { count: 'exact' })
      .eq('scope', 'NACIONAL')
      .gte('date', `${year}-01-01`)
      .lte('date', `${year}-12-31`);

    console.log(`ðŸ“Š [Seed] Feriados existentes em ${year}: ${existingCount}`);

    // Se existem todos (13), nÃ£o precisa fazer nada
    if (existingCount >= 13) {
      console.log(`âœ… [Seed] Feriados de ${year} jÃ¡ existem (${existingCount} registros)`);
      return true;
    }

    // Se faltam feriados, tentar inserir os que estÃ£o faltando
    if (existingCount < 13) {
      console.log(`ðŸ”„ [Seed] Inserindo feriados faltantes de ${year}...`);
      
      // Buscar quais jÃ¡ existem
      const { data: existingHolidays } = await supabase
        .from('holidays')
        .select('date')
        .eq('scope', 'NACIONAL')
        .gte('date', `${year}-01-01`)
        .lte('date', `${year}-12-31`);
      
      const existingDates = new Set((existingHolidays || []).map(h => h.date));
      
      // Inserir apenas os que faltam
      const toInsert = holidays.filter(h => !existingDates.has(h.date));
      
      if (toInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('holidays')
          .insert(
            toInsert.map(h => ({
              ...h,
              clinic_id: null,
              state: null,
              city: null,
            }))
          );

        if (insertError) {
          console.error(`âŒ [Seed] Erro ao inserir feriados ${year}:`, insertError);
          return false;
        }
        
        console.log(`âœ… [Seed] ${toInsert.length} feriados inseridos para ${year}`);
      }
    }
    
    // Contagem final (verificaÃ§Ã£o)
    const { count: finalCount } = await supabase
      .from('holidays')
      .select('*', { count: 'exact' })
      .eq('scope', 'NACIONAL')
      .gte('date', `${year}-01-01`)
      .lte('date', `${year}-12-31`);

    console.log(`ðŸ“Š [Seed] Total final de feriados nacionais em ${year}: ${finalCount} (esperado: 13)`);
    return finalCount === 13;
  } catch (error) {
    console.error('âŒ [Seed] Erro geral na seed de feriados:', error.message);
    return false;
  }
}

/**
 * Seed data - Popular feriados NACIONAIS de MÃšLTIPLOS ANOS
 * âš¡ Garante cobertura de 2024, 2025, 2026, 2027, 2028
 * @returns {boolean} true se sucesso
 */
export async function seedNationalHolidaysMultipleYears() {
  try {
    console.log(`ðŸŒ± [Seed] Iniciando seed de feriados para mÃºltiplos anos (2024-2028)`);
    
    // Semear feriados dos anos anteriores, atual e prÃ³ximos anos
    const yearsToSeed = [2024, 2025, 2026, 2027, 2028];
    const results = [];
    
    for (const year of yearsToSeed) {
      console.log(`ðŸ“… [Seed] Semeando year ${year}...`);
      const result = await seedNationalHolidays(year, null);
      results.push({ year, success: result });
    }
    
    console.log(`âœ… [Seed] Feriados de mÃºltiplos anos:`, results);
    return results.every(r => r.success);
  } catch (error) {
    console.error('âŒ [Seed] Erro ao semear mÃºltiplos anos:', error.message);
    return false;
  }
}

// ============================================================================
// DEBUG - DiagnÃ³stico
// ============================================================================

/**
 * FunÃ§Ã£o de diagnÃ³stico - testa se tabelas existem e retorna dados
 */
export async function debugHolidaysTable() {
  try {
    console.log('ðŸ” [DEBUG] Testando tabela holidays...');
    
    const { data, error, status } = await supabase
      .from('holidays')
      .select('*')
      .limit(5);
    
    console.log(`ðŸ“Š [DEBUG] Status: ${status}`);
    if (error) {
      console.error(`âŒ [DEBUG] Erro:`, error);
      return { error, data: null };
    }
    
    console.log(`âœ… [DEBUG] Sucesso! Registros encontrados:`, data?.length || 0);
    console.log(`ðŸ“‹ [DEBUG] Amostra:`, data);
    
    return { error: null, data };
  } catch (error) {
    console.error('âŒ [DEBUG] ExceÃ§Ã£o:', error);
    return { error, data: null };
  }
}

/**
 * Busca todos os feriados nacionais (sem filtro de clÃ­nica)
 */
export async function getAllNationalHolidays(year) {
  try {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    
    const { data, error } = await supabase
      .from('holidays')
      .select('*')
      .eq('scope', 'NACIONAL')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('âŒ Erro ao buscar feriados nacionais:', error);
    return [];
  }
}

export default {
  // Queries
  isHolidayBlocked,
  getHolidayDetails,
  checkMultipleDates,
  listHolidaysInRange,
  
  // Mutations
  openHolidayManual,
  closeHolidayOverride,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  listOverridesInRange,
  
  // Utilities
  seedNationalHolidays,
  seedNationalHolidaysMultipleYears,
};

