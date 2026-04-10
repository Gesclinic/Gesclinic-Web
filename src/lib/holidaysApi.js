import { supabase } from './customSupabaseClient';

/**
 * HOLIDAYS API
 * 
 * Gerencia feriados, bloqueios de agenda e overrides manuais
 * Segue padrão de sistemas grandes (MV, Amplimed, iClinic)
 */

// ============================================================================
// CONSULTAS - Verificar status de feriado
// ============================================================================

/**
 * Verifica se uma data é um feriado bloqueado
 * @param {string} date - Data no formato YYYY-MM-DD
 * @param {string} clinicId - ID da clínica
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
 * Obtém detalhes do feriado para uma data
 * @param {string} date - Data no formato YYYY-MM-DD
 * @param {string} clinicId - ID da clínica
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
 * Verifica múltiplas datas de uma vez (para semana/mês)
 * Busca feriados nacionais + feriados específicos da clínica
 * @param {array} dates - Array de datas YYYY-MM-DD
 * @param {string} clinicId - ID da clínica (opcional)
 * @returns {object} { [date]: { name, is_blocked, has_override } }
 */
export async function checkMultipleDates(dates, clinicId, options = {}) {
  try {
    const results = {};
    
    if (!dates || dates.length === 0) {
      console.warn('❌ checkMultipleDates: datas vazias');
      return results;
    }

    // Normalizar datas - remover hora se tiver
    const normalizedDates = dates.map(d => {
      if (typeof d === 'string' && d.includes('T')) {
        return d.split('T')[0];
      }
      return d;
    });

    console.log('🔍 checkMultipleDates:', { 
      datesCount: normalizedDates.length, 
      dates: normalizedDates.slice(0, 3),
      clinicId 
    });

    // ✅ FIX: Construir query de forma condicional para evitar erro "invalid input syntax for type uuid: null"
    let query = supabase
      .from('holidays')
      .select('id, date, name, scope, is_blocked, is_mandatory, clinic_id')
      .in('date', normalizedDates);

    // Se clinicId não existe, buscar APENAS feriados nacionais (clinic_id IS NULL)
    // Se clinicId existe, buscar feriados nacionais OU da clínica
    if (clinicId) {
      query = query.or(`clinic_id.is.null,clinic_id.eq.${clinicId}`);
    } else {
      query = query.is('clinic_id', null);
    }

    const { data: holidays, error } = await query;

    if (error) {
      console.error('❌ Erro ao buscar feriados:', error);
      return results;
    }

    console.log(`✅ Feriados encontrados: ${holidays?.length || 0}`, holidays);

    // Para cada feriado encontrado, coloca no mapa
    for (const holiday of (holidays || [])) {
      // ✅ IMPORTANTE: NÃO filtrar aqui - deixar filtragem no rendering
      // Todos os feriados vão para o mapa, a lógica de exibição filtra based em is_mandatory

      // Normalizar data
      const dateStr = holiday.date ? holiday.date.split('T')[0] : holiday.date;
      
      console.log(`🗓️ Processando:`, { 
        date: dateStr, 
        name: holiday.name, 
        is_blocked: holiday.is_blocked,
        is_mandatory: holiday.is_mandatory,
        clinic_id: holiday.clinic_id
      });
      
      results[dateStr] = {
        name: holiday.name,
        is_blocked: holiday.is_blocked,
        is_mandatory: holiday.is_mandatory ?? true, // Default: true (obrigatório)
        has_override: false,
        scope: holiday.scope,
      };
    }

    console.log(`🎯 Retornando ${Object.keys(results).length} datas com feriado:`, Object.keys(results));
    return results;
  } catch (error) {
    console.error('❌ Erro ao verificar múltiplas datas:', error);
    return {};
  }
}

/**
 * Lista todos os feriados de um período
 * @param {string} startDate - Data inicial YYYY-MM-DD
 * @param {string} endDate - Data final YYYY-MM-DD
 * @param {string} clinicId - ID da clínica
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
// MUTAÇÕES - Gerenciar feriados e overrides
// ============================================================================

/**
 * Abre agenda manualmente para um feriado bloqueado
 * @param {string} date - Data YYYY-MM-DD
 * @param {string} clinicId - ID da clínica
 * @param {string} userId - ID do usuário que abriu
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
 * @param {string} clinicId - ID da clínica
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
      .select()
      .single();

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
 * Obtém todos os overrides de um período
 * @param {string} startDate - Data inicial YYYY-MM-DD
 * @param {string} endDate - Data final YYYY-MM-DD
 * @param {string} clinicId - ID da clínica
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
 * ⚡ Versão robusta - Funciona mesmo se já existirem dados
 * @param {number} year - Ano
 * @param {string} clinicId - ID da clínica (opcional)
 * @returns {boolean} true se sucesso
 */
export async function seedNationalHolidays(year, clinicId) {
  try {
    // Feriados Nacionais do Brasil são globais - não usar clinic_id
    console.log(`🌱 [Seed] Iniciando seed de feriados ${year}:`, { year, clinicId });

    const holidays = [
      { date: `${year}-01-01`, name: 'Confraternização Universal', scope: 'NACIONAL', is_blocked: true, is_mandatory: true },
      { date: `${year}-02-13`, name: 'Carnaval', scope: 'NACIONAL', is_blocked: false, is_mandatory: false },
      { date: `${year}-02-14`, name: 'Sexta-feira de Carnaval', scope: 'NACIONAL', is_blocked: false, is_mandatory: false },
      { date: `${year}-02-17`, name: 'Terça-feira de Carnaval', scope: 'NACIONAL', is_blocked: false, is_mandatory: false },
      { date: `${year}-04-03`, name: 'Sexta-feira Santa', scope: 'NACIONAL', is_blocked: true, is_mandatory: true },
      { date: `${year}-04-21`, name: 'Tiradentes', scope: 'NACIONAL', is_blocked: true, is_mandatory: true },
      { date: `${year}-05-01`, name: 'Dia do Trabalho', scope: 'NACIONAL', is_blocked: true, is_mandatory: true },
      { date: `${year}-09-07`, name: 'Independência do Brasil', scope: 'NACIONAL', is_blocked: true, is_mandatory: true },
      { date: `${year}-10-12`, name: 'Nossa Senhora Aparecida', scope: 'NACIONAL', is_blocked: true, is_mandatory: true },
      { date: `${year}-11-02`, name: 'Finados', scope: 'NACIONAL', is_blocked: true, is_mandatory: true },
      { date: `${year}-11-15`, name: 'Proclamação da República', scope: 'NACIONAL', is_blocked: true, is_mandatory: true },
      { date: `${year}-11-20`, name: 'Consciência Negra', scope: 'NACIONAL', is_blocked: true, is_mandatory: true },
      { date: `${year}-12-25`, name: 'Natal', scope: 'NACIONAL', is_blocked: true, is_mandatory: true },
    ];

    console.log(`📋 [Seed] Total de feriados a inserir: ${holidays.length}`);

    // ✅ ESTRATÉGIA: Delete + Reinsert para garantir dados corretos
    // Se houver feriados antigos (versão anterior com 12 ao invés de 13), deleta e refaz
    
    // Verificar quantos feriados nacionais já existem para este ano
    const { count: existingCount } = await supabase
      .from('holidays')
      .select('*', { count: 'exact' })
      .eq('scope', 'NACIONAL')
      .gte('date', `${year}-01-01`)
      .lte('date', `${year}-12-31`);

    console.log(`📊 [Seed] Feriados existentes em ${year}: ${existingCount}`);

    // Se existem todos (13), não precisa fazer nada
    if (existingCount >= 13) {
      console.log(`✅ [Seed] Feriados de ${year} já existem (${existingCount} registros)`);
      return true;
    }

    // Se faltam feriados, tentar inserir os que estão faltando
    if (existingCount < 13) {
      console.log(`🔄 [Seed] Inserindo feriados faltantes de ${year}...`);
      
      // Buscar quais já existem
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
          console.error(`❌ [Seed] Erro ao inserir feriados ${year}:`, insertError);
          return false;
        }
        
        console.log(`✅ [Seed] ${toInsert.length} feriados inseridos para ${year}`);
      }
    }
    
    // Contagem final (verificação)
    const { count: finalCount } = await supabase
      .from('holidays')
      .select('*', { count: 'exact' })
      .eq('scope', 'NACIONAL')
      .gte('date', `${year}-01-01`)
      .lte('date', `${year}-12-31`);

    console.log(`📊 [Seed] Total final de feriados nacionais em ${year}: ${finalCount} (esperado: 13)`);
    return finalCount === 13;
  } catch (error) {
    console.error('❌ [Seed] Erro geral na seed de feriados:', error.message);
    return false;
  }
}

/**
 * Seed data - Popular feriados NACIONAIS de MÚLTIPLOS ANOS
 * ⚡ Garante cobertura de 2024, 2025, 2026, 2027, 2028
 * @returns {boolean} true se sucesso
 */
export async function seedNationalHolidaysMultipleYears() {
  try {
    console.log(`🌱 [Seed] Iniciando seed de feriados para múltiplos anos (2024-2028)`);
    
    // Semear feriados dos anos anteriores, atual e próximos anos
    const yearsToSeed = [2024, 2025, 2026, 2027, 2028];
    const results = [];
    
    for (const year of yearsToSeed) {
      console.log(`📅 [Seed] Semeando year ${year}...`);
      const result = await seedNationalHolidays(year, null);
      results.push({ year, success: result });
    }
    
    console.log(`✅ [Seed] Feriados de múltiplos anos:`, results);
    return results.every(r => r.success);
  } catch (error) {
    console.error('❌ [Seed] Erro ao semear múltiplos anos:', error.message);
    return false;
  }
}

// ============================================================================
// DEBUG - Diagnóstico
// ============================================================================

/**
 * Função de diagnóstico - testa se tabelas existem e retorna dados
 */
export async function debugHolidaysTable() {
  try {
    console.log('🔍 [DEBUG] Testando tabela holidays...');
    
    const { data, error, status } = await supabase
      .from('holidays')
      .select('*')
      .limit(5);
    
    console.log(`📊 [DEBUG] Status: ${status}`);
    if (error) {
      console.error(`❌ [DEBUG] Erro:`, error);
      return { error, data: null };
    }
    
    console.log(`✅ [DEBUG] Sucesso! Registros encontrados:`, data?.length || 0);
    console.log(`📋 [DEBUG] Amostra:`, data);
    
    return { error: null, data };
  } catch (error) {
    console.error('❌ [DEBUG] Exceção:', error);
    return { error, data: null };
  }
}

/**
 * Busca todos os feriados nacionais (sem filtro de clínica)
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
    console.error('❌ Erro ao buscar feriados nacionais:', error);
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
