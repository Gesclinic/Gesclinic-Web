import { supabase } from './customSupabaseClient';

/**
 * ✅ GUARDAR SESSÃO VÁLIDA
 * Valida que o usuário está autenticado com JWT válido
 *
 * @returns {Promise<Object>} Session object com token válido
 * @throws {Error} Se sessão inválida ou expirada
 */
export async function requireSession() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error('❌ [authGuard] Erro ao obter sessão:', error.message);
    throw new Error('Erro ao validar sessão.');
  }

  if (!data?.session) {
    console.error('❌ [authGuard] Sessão não encontrada');
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  // ✅ Sessão válida
  console.log('✅ [authGuard] Sessão válida para usuário:', data.session.user.id);
  return data.session;
}

/**
 * ✅ VALIDAR USUÁRIO AUTENTICADO
 * Obtém usuário autenticado com JWT do token
 *
 * @returns {Promise<Object>} User object com ID válido
 * @throws {Error} Se não autenticado
 */
export async function requireAuth() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error('❌ [authGuard] Erro ao obter usuário:', error.message);
    throw new Error('Erro ao validar autenticação.');
  }

  if (!user) {
    console.error('❌ [authGuard] Usuário não autenticado');
    throw new Error('Usuário não autenticado. Faça login novamente.');
  }

  // ✅ Usuário válido
  console.log('✅ [authGuard] Usuário autenticado:', user.id);
  return user;
}
