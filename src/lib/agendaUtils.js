/**
 * Agenda Utilities - Funções auxiliares para geração de horários
 */

import { supabase } from './customSupabaseClient';

/**
 * Gera array de horários baseado em configurações
 * @param {number} startHour - Hora de início (0-23)
 * @param {number} endHour - Hora de término (0-23)
 * @param {number} intervalMinutes - Intervalo em minutos (padrão: 30)
 * @returns {string[]} Array de horários em formato HH:mm
 */
export function generateTimeSlots(startHour = 8, endHour = 17, intervalMinutes = 30) {
  const slots = [];

  for (let hour = startHour; hour <= endHour; hour++) {
    for (let min = 0; min < 60; min += intervalMinutes) {
      const timeStr = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
      slots.push(timeStr);
    }
  }

  return slots;
}

/**
 * Obtém configurações de agenda da clínica (com fallbacks)
 * @param {object} clinic - Dados da clínica do context
 * @returns {object} { startHour, endHour, intervalMinutes }
 */
export function getAgendaConfig(clinic = {}) {
  return {
    // Puxar das configurações da clínica, com fallbacks
    startHour: clinic?.settings?.agenda_start_hour || clinic?.start_hour || 8,
    endHour: clinic?.settings?.agenda_end_hour || clinic?.end_hour || 17,
    intervalMinutes: clinic?.settings?.agenda_interval_minutes || clinic?.interval_minutes || 30,
  };
}

/**
 * Gera timeSlots baseado nas configurações da clínica
 * @param {object} clinic - Dados da clínica do context
 * @returns {string[]} Array de horários em formato HH:mm
 */
export function getClinicTimeSlots(clinic = null) {
  try {
    // Garantir que clinic é um objeto
    const clinicData = clinic && typeof clinic === 'object' ? clinic : {};
    const config = getAgendaConfig(clinicData);
    const slots = generateTimeSlots(config.startHour, config.endHour, config.intervalMinutes);

    // Garantir que sempre retorna um array válido
    return Array.isArray(slots) && slots.length > 0 ? slots : generateTimeSlots(8, 17, 30);
  } catch (error) {
    console.error('❌ Erro ao gerar timeSlots:', error);
    // Retornar padrão em caso de erro
    return generateTimeSlots(8, 17, 30);
  }
}

/**
 * 🆕 Obtém horários disponíveis de um profissional para um dia específico
 * Verifica se o profissional tem cadastro de disponibilidade para este dia
 * @param {string} professionalId - ID do profissional
 * @param {Date|string} date - Data a verificar (Date ou 'YYYY-MM-DD')
 * @param {string|null} clinicId - ID da clínica/empresa ativa
 * @returns {Promise<string[]>} Array de horários disponíveis (HH:mm)
 */
export async function getProfessionalAvailableSlots(professionalId, date, clinicId = null) {
  if (!professionalId || !date) {
    console.log('⚠️ [getProfessionalAvailableSlots] Missing profId or date:', {
      professionalId,
      date,
    });
    return [];
  }

  try {
    // Parse data usando timezone local (não UTC!)
    let dateObj;
    if (typeof date === 'string') {
      // Formatos: "2026-02-11" ou "2026-02-11T00:00:00"
      const [year, month, day] = date.split('T')[0].split('-');
      dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    } else {
      dateObj = date;
    }

    const dayOfWeek = dateObj.getDay(); // 0=domingo, 6=sábado (usando timezone local)

    console.log('🔍 [getProfessionalAvailableSlots] Buscando para profissional:', {
      professionalId,
      clinicId,
      date,
      dayOfWeek,
      dayName: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][dayOfWeek],
    });

    // Buscar disponibilidade cadastrada para este profissional neste dia
    let query = supabase
      .from('professional_schedules')
      .select('start_time, end_time, duration_minutes, active')
      .eq('professional_id', professionalId)
      .eq('day_of_week', dayOfWeek)
      .eq('active', true);

    if (clinicId) {
      query = query.eq('clinic_id', clinicId);
    }

    const { data: schedules, error } = await query;

    if (error) {
      console.error('❌ Erro ao carregar disponibilidade do profissional:', error);
      return [];
    }

    console.log('📊 [getProfessionalAvailableSlots] Schedules encontrados:', schedules);

    // Se não tem cadastro para este dia, retorna vazio (não está disponível)
    if (!schedules || schedules.length === 0) {
      console.log('❌ Nenhuma disponibilidade para esse dia/profissional');
      return [];
    }

    // Gerar slots baseado na disponibilidade cadastrada
    const availableSlots = [];
    const durationMinutes = schedules[0].duration_minutes || 30;

    schedules.forEach((schedule) => {
      const [startHour, startMin] = schedule.start_time.split(':').map(Number);
      const [endHour, endMin] = schedule.end_time.split(':').map(Number);

      // Converter para minutos totais do dia para cálculo
      const startTotalMin = startHour * 60 + startMin;
      const endTotalMin = endHour * 60 + endMin;

      // Gerar slots
      for (
        let currentMin = startTotalMin;
        currentMin + durationMinutes <= endTotalMin;
        currentMin += durationMinutes
      ) {
        const hour = Math.floor(currentMin / 60);
        const min = currentMin % 60;
        const slotTime = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
        availableSlots.push(slotTime);
      }
    });

    return availableSlots;
  } catch (err) {
    console.error('❌ Erro ao obter slots disponíveis do profissional:', err);
    return [];
  }
}

/**
 * 🆕 Obtém TODOS os profissionais disponíveis em um dia específico
 * Busca quais profissionais têm cadastro de disponibilidade para este dia
 * @param {Date|string} date - Data a verificar (Date ou 'YYYY-MM-DD')
 * @param {string} clinicId - ID da clínica (opcional, para filtrar por clínica se necessário)
 * @param {string} userProfessionalId - ID do profissional atual (se logado como profissional, retorna apenas ele)
 * @returns {Promise<Array>} Array de profissionais com { id, name, available_slots }
 */
export async function getAvailableProfessionalsForDay(
  date,
  clinicId = null,
  userProfessionalId = null,
) {
  if (!date) {
    console.log('⚠️ [getAvailableProfessionalsForDay] Missing date');
    return [];
  }

  try {
    console.log('🔍 [getAvailableProfessionsForDay] INPUT DATA RECEBIDA:', {
      date,
      dateType: typeof date,
      dateIsString: typeof date === 'string',
      dateLength: date?.length || 'N/A',
      dateInspect: date,
    });

    // Parse data
    let dateObj;
    if (typeof date === 'string') {
      // Suportar vários formatos: ISO (YYYY-MM-DD), BR (DD/MM/YYYY), e ISO com T
      let year, month, day;

      const isoMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (isoMatch) {
        // Formato ISO: YYYY-MM-DD
        [, year, month, day] = isoMatch;
        console.log('✅ Formato ISO detectado:', { year, month, day });
      } else {
        const brMatch = date.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (brMatch) {
          // Formato BR: DD/MM/YYYY
          [, day, month, year] = brMatch;
          console.log('✅ Formato BR detectado:', { day, month, year });
        } else {
          console.warn('⚠️ [getAvailableProfessionalsForDay] Formato de data não reconhecido:', date);
          return [];
        }
      }

      dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    } else {
      dateObj = date;
    }

    const dayOfWeek = dateObj.getDay(); // 0=domingo, 6=sábado

    console.log('🔍 [getAvailableProfessionalsForDay] Buscando profissionais para:', {
      date,
      clinicId,
      dayOfWeek,
      dayName: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][dayOfWeek],
      userProfessionalId,
    });

    // Buscar profissionais que têm disponibilidade para este dia
    let query = supabase
      .from('professional_schedules')
      .select('professional_id, start_time, end_time, duration_minutes')
      .eq('day_of_week', dayOfWeek)
      .eq('active', true);

    // Filtrar por clinic_id se fornecido
    if (clinicId) {
      query = query.eq('clinic_id', clinicId);
    }

    const { data: schedules, error } = await query;

    if (error) {
      console.error('❌ Erro ao buscar profissionais disponíveis:', error);
      return [];
    }

    console.log(
      '📊 [getAvailableProfessionalsForDay] Schedules encontrados:',
      schedules,
      'Total:',
      schedules?.length,
    );

    if (!schedules || schedules.length === 0) {
      console.log('ℹ️ Nenhum profissional disponível para este dia');
      return [];
    }

    // Agrupar por profissional
    const professionalsMap = new Map();

    schedules.forEach((schedule) => {
      const profId = schedule.professional_id;

      if (!professionalsMap.has(profId)) {
        professionalsMap.set(profId, {
          id: profId,
          name: null, // Será preenchido depois
          schedules: [],
        });
      }

      professionalsMap.get(profId).schedules.push({
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        duration_minutes: schedule.duration_minutes || 30,
      });
    });

    // Buscar dados dos profissionais (nome, etc)
    const profIds = Array.from(professionalsMap.keys());
    console.log('🔍 [getAvailableProfessionalsForDay] IDs de profissionais a buscar:', profIds);

    let professionalsQuery = supabase
      .from('professionals')
      .select('id, name')
      .in('id', profIds);

    if (clinicId) {
      professionalsQuery = professionalsQuery.eq('clinic_id', clinicId);
    }

    const { data: professionals, error: profError } = await professionalsQuery;

    if (profError) {
      console.error('❌ Erro ao carregar dados dos profissionais:', profError);
      return [];
    }

    console.log('📊 [getAvailableProfessionalsForDay] Profissionais carregados:', professionals);

    // Atualizar nomes
    professionals.forEach((prof) => {
      if (professionalsMap.has(prof.id)) {
        professionalsMap.get(prof.id).name = prof.name;
      }
    });

    // Gerar slots disponíveis para cada profissional
    let result = Array.from(professionalsMap.values()).map((prof) => {
      const availableSlots = [];

      prof.schedules.forEach((schedule) => {
        const [startHour, startMin] = schedule.start_time.split(':').map(Number);
        const [endHour, endMin] = schedule.end_time.split(':').map(Number);

        const startTotalMin = startHour * 60 + startMin;
        const endTotalMin = endHour * 60 + endMin;
        const durationMinutes = schedule.duration_minutes || 30;

        for (
          let currentMin = startTotalMin;
          currentMin + durationMinutes <= endTotalMin;
          currentMin += durationMinutes
        ) {
          const hour = Math.floor(currentMin / 60);
          const min = currentMin % 60;
          const slotTime = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
          if (!availableSlots.includes(slotTime)) {
            availableSlots.push(slotTime);
          }
        }
      });

      return {
        id: prof.id,
        name: prof.name || 'Profissional sem nome',
        available_slots: availableSlots,
      };
    });

    // 🔒 Se o usuário é um profissional, retornar apenas ele
    if (userProfessionalId) {
      console.log(`🔒 [RBAC] Filtrando para apenas o profissional: ${userProfessionalId}`);
      result = result.filter((prof) => prof.id === userProfessionalId);
      if (result.length === 0) {
        console.warn(
          `⚠️ [RBAC] Profissional ${userProfessionalId} não encontrado em profissionalsMap ou não tem disponibilidade hoje`,
        );
      }
    }

    console.log('✅ [getAvailableProfessionalsForDay] Profissionais com disponibilidade:', result);
    return result;
  } catch (err) {
    console.error('❌ Erro ao obter profissionais disponíveis:', err);
    return [];
  }
}

export default {
  generateTimeSlots,
  getAgendaConfig,
  getClinicTimeSlots,
  getProfessionalAvailableSlots,
  getAvailableProfessionalsForDay,
};
