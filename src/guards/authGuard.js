/**
 * Authentication Guard
 * Valida usuário autenticado
 */

import { getCurrentUser } from '@/services/supabase/auth';

/**
 * Verifica se usuário está autenticado
 */
export const requireAuth = async () => {
  const { user, error } = await getCurrentUser();

  if (error || !user) {
    throw new Error('Autenticação obrigatória');
  }

  return user;
};

/**
 * Verifica se usuário tem clinic_id
 */
export const requireClinicContext = (user) => {
  if (!user?.user_metadata?.clinic_id) {
    throw new Error('Contexto de clínica obrigatório');
  }

  return user.user_metadata.clinic_id;
};

/**
 * Verifica role do usuário
 */
export const requireRole = (user, allowedRoles = []) => {
  const userRole = user?.user_metadata?.role;

  if (!userRole || !allowedRoles.includes(userRole)) {
    throw new Error('Permissão insuficiente');
  }

  return userRole;
};

/**
 * Wrapper para operações que exigem autenticação
 */
export const withAuth = async (fn, options = {}) => {
  try {
    const user = await requireAuth();

    if (options.requireClinic) {
      const clinicId = requireClinicContext(user);
      return await fn(user, clinicId);
    }

    if (options.requireRoles) {
      requireRole(user, options.requireRoles);
    }

    return await fn(user);
  } catch (error) {
    console.error('Auth guard error:', error);
    throw error;
  }
};
