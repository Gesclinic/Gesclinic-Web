import { supabase } from '@/lib/customSupabaseClient';

let cachedClinicContext = null;

/**
 * 🗑️ LIMPAR CACHE
 * Chamar quando:
 * - Usuário faz logout
 * - Troca de clínica
 * - Sessão expira
 */
export function clearClinicContextCache() {
  console.log('🗑️ [clearClinicContextCache] Cache limpo');
  cachedClinicContext = null;
}

/**
 * ✅ OBTER CONTEXTO DA CLÍNICA
 *
 * Retorna:
 * - userId: ID do usuário autenticado
 * - clinicId: ID da clínica vinculada ao usuário
 *
 * Processo:
 * 1. Valida autenticação (JWT válido)
 * 2. Verifica cache
 * 3. Busca clinic_id do banco
 * 4. Cacheia resultado
 *
 * @returns {Promise<{userId: string, clinicId: string}>}
 * @throws {Error} Se não autenticado ou sem vínculo com clínica
 */
export async function getClinicContext() {
  // 🔐 ETAPA 1: VALIDAR AUTENTICAÇÃO
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    console.error('❌ [getClinicContext] Usuário não autenticado');
    clearClinicContextCache();
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  console.log('✅ [getClinicContext] Usuário autenticado:', user.id);

  // ⚡ ETAPA 2: VERIFICAR CACHE
  if (cachedClinicContext && cachedClinicContext.userId === user.id) {
    console.log('⚡ [getClinicContext] Retornando do cache:', cachedClinicContext.clinicId);
    return cachedClinicContext;
  }

  console.log('📡 [getClinicContext] Buscando clinic_id do banco...');

  // 🏥 ETAPA 3: BUSCAR CLINIC_ID
  const { data, error: dbError } = await supabase
    .from('users')
    .select('clinic_id')
    .eq('id', user.id)
    .maybeSingle();

  if (dbError) {
    console.error('❌ [getClinicContext] Erro ao buscar clinic_id:', dbError.message);
    clearClinicContextCache();
    throw new Error(`Erro ao carregar clínica: ${dbError.message}`);
  }

  if (!data?.clinic_id) {
    console.error('❌ [getClinicContext] Usuário sem vínculo com clínica:', user.id);
    clearClinicContextCache();
    throw new Error('Usuário sem clinic_id vinculado');
  }

  // 💾 ETAPA 4: CACHEAR RESULTADO
  cachedClinicContext = {
    userId: user.id,
    clinicId: data.clinic_id,
  };

  console.log('✅ [getClinicContext] Contexto carregado:', cachedClinicContext);

  return cachedClinicContext;
}

/**
 * ⚡ ALIAS: getClinicId()
 * Para compatibilidade com código antigo
 */
export async function getClinicId() {
  return getClinicContext();
}
