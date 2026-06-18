// src/lib/profilesApi.js
import { supabase } from './customSupabaseClient';

/**
 * Módulos reais do sistema (sincronizado com src/constants/menu.js e AppRoutes.jsx)
 */
export const MODULES_LIST = [
  { id: 'dashboard',         label: 'Dashboard',         path: '/clinica/dashboard' },
  { id: 'agenda',            label: 'Agenda',             path: '/clinica/agenda' },
  { id: 'pacientes',         label: 'Pacientes',          path: '/clinica/pacientes' },
  { id: 'cadastros_basicos', label: 'Cadastros Básicos',  path: '/clinica/base-sistema' },
  { id: 'financeiro',        label: 'Financeiro',         path: '/clinica/financeiro' },
  { id: 'estoque',           label: 'Estoque',            path: '/clinica/estoque' },
  { id: 'faturamento',       label: 'Faturamento',        path: '/clinica/faturamento' },
  { id: 'configuracoes',     label: 'Configurações',      path: '/clinica/configuracoes' },
  { id: 'administracao',     label: 'Administração',      path: '/clinica/administracao/usuarios' },
];

/**
 * Matriz de permissões: módulo → role → nível
 * 'full'    = acesso completo
 * 'partial' = acesso parcial (ex: só caixa do financeiro)
 * 'none'    = sem acesso
 */
export const PERMISSION_MATRIX = {
  dashboard:         { admin: 'full', gestor: 'full', financeiro: 'full', recepcao: 'full', medico: 'full',    estoque: 'full',    faturamento: 'full'    },
  agenda:            { admin: 'full', gestor: 'full', financeiro: 'none', recepcao: 'full', medico: 'partial', estoque: 'none',    faturamento: 'none'    },
  pacientes:         { admin: 'full', gestor: 'full', financeiro: 'none', recepcao: 'full', medico: 'full',    estoque: 'none',    faturamento: 'none'    },
  cadastros_basicos: { admin: 'full', gestor: 'full', financeiro: 'none', recepcao: 'none', medico: 'none',    estoque: 'none',    faturamento: 'none'    },
  financeiro:        { admin: 'full', gestor: 'full', financeiro: 'full', recepcao: 'partial', medico: 'none', estoque: 'none',    faturamento: 'partial' },
  estoque:           { admin: 'full', gestor: 'partial', financeiro: 'none', recepcao: 'none', medico: 'none', estoque: 'full',    faturamento: 'none'    },
  faturamento:       { admin: 'full', gestor: 'full', financeiro: 'full', recepcao: 'none', medico: 'none',    estoque: 'none',    faturamento: 'full'    },
  configuracoes:     { admin: 'full', gestor: 'none', financeiro: 'none', recepcao: 'none', medico: 'none',    estoque: 'none',    faturamento: 'none'    },
  administracao:     { admin: 'full', gestor: 'none', financeiro: 'none', recepcao: 'none', medico: 'none',    estoque: 'none',    faturamento: 'none'    },
};

/**
 * Perfis do sistema — sincronizados com menu.js e AppRoutes.jsx
 * Roles: admin, gestor, financeiro, recepcao, medico, estoque, faturamento
 */
export const PROFILES_CONFIG = {
  admin: {
    id: 'admin',
    label: 'Administrador',
    description: 'Acesso completo a todos os módulos e configurações do sistema',
    colorClass: 'text-red-600',
    bgClass: 'bg-red-50 border-red-200',
    badgeClass: 'bg-red-100 text-red-700',
    modules: ['dashboard', 'agenda', 'pacientes', 'cadastros_basicos', 'financeiro', 'estoque', 'faturamento', 'configuracoes', 'administracao'],
    permissions: [
      'dashboard.*', 'agenda.*', 'pacientes.*', 'cadastros_basicos.*',
      'financeiro.*', 'estoque.*', 'faturamento.*', 'configuracoes.*', 'administracao.*',
    ],
  },
  gestor: {
    id: 'gestor',
    label: 'Gestor',
    description: 'Visão executiva com acesso a relatórios, financeiro e faturamento',
    colorClass: 'text-purple-600',
    bgClass: 'bg-purple-50 border-purple-200',
    badgeClass: 'bg-purple-100 text-purple-700',
    modules: ['dashboard', 'agenda', 'pacientes', 'cadastros_basicos', 'financeiro', 'estoque', 'faturamento'],
    permissions: [
      'dashboard.*', 'agenda.*', 'pacientes.*', 'cadastros_basicos.*',
      'financeiro.*', 'estoque.dashboard', 'estoque.relatorios',
      'faturamento.*',
    ],
  },
  financeiro: {
    id: 'financeiro',
    label: 'Financeiro',
    description: 'Gerenciamento completo de contas a pagar, receber e fluxo de caixa',
    colorClass: 'text-green-600',
    bgClass: 'bg-green-50 border-green-200',
    badgeClass: 'bg-green-100 text-green-700',
    modules: ['dashboard', 'financeiro', 'faturamento'],
    permissions: [
      'dashboard.visualizar', 'financeiro.*', 'faturamento.visualizar', 'faturamento.relatorios',
    ],
  },
  recepcao: {
    id: 'recepcao',
    label: 'Recepção',
    description: 'Agendamento, gestão de pacientes e controle de caixa',
    colorClass: 'text-blue-600',
    bgClass: 'bg-blue-50 border-blue-200',
    badgeClass: 'bg-blue-100 text-blue-700',
    modules: ['dashboard', 'agenda', 'pacientes', 'financeiro'],
    permissions: [
      'dashboard.visualizar', 'agenda.*', 'pacientes.visualizar', 'pacientes.criar',
      'pacientes.editar', 'financeiro.caixa', 'financeiro.caixa_geral',
    ],
  },
  medico: {
    id: 'medico',
    label: 'Médico / Profissional',
    description: 'Agenda pessoal, prontuário e atendimento dos pacientes',
    colorClass: 'text-teal-600',
    bgClass: 'bg-teal-50 border-teal-200',
    badgeClass: 'bg-teal-100 text-teal-700',
    modules: ['dashboard', 'agenda', 'pacientes'],
    permissions: [
      'dashboard.visualizar', 'agenda.visualizar', 'agenda.confirmacao',
      'pacientes.visualizar', 'pacientes.prontuario', 'pacientes.documentos',
    ],
  },
  estoque: {
    id: 'estoque',
    label: 'Estoque',
    description: 'Controle de produtos, movimentações, inventário e fornecedores',
    colorClass: 'text-orange-600',
    bgClass: 'bg-orange-50 border-orange-200',
    badgeClass: 'bg-orange-100 text-orange-700',
    modules: ['dashboard', 'estoque'],
    permissions: [
      'dashboard.visualizar', 'estoque.*',
    ],
  },
  faturamento: {
    id: 'faturamento',
    label: 'Faturamento',
    description: 'Emissão de guias TISS, lotes de faturamento e relatórios',
    colorClass: 'text-amber-600',
    bgClass: 'bg-amber-50 border-amber-200',
    badgeClass: 'bg-amber-100 text-amber-700',
    modules: ['dashboard', 'faturamento'],
    permissions: [
      'dashboard.visualizar', 'faturamento.*', 'pacientes.visualizar',
    ],
  },
};

/**
 * Lista todos os perfis
 */
export async function listProfiles(clinicId) {
  try {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      throw error;
    }
    return data || [];
  } catch (error) {
    console.error('Erro ao listar perfis:', error);
    return [];
  }
}

/**
 * Busca um perfil específico
 */
export async function getProfile(roleId, clinicId) {
  try {
    const { data, error } = await supabase.from('roles').select('*').eq('id', roleId).single();

    if (error) {
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    return null;
  }
}

/**
 * Cria um novo perfil
 */
export async function createProfile(profileData, clinicId) {
  try {
    const { data, error } = await supabase
      .from('roles')
      .insert([
        {
          ...profileData,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Erro ao criar perfil:', error);
    throw error;
  }
}

/**
 * Atualiza um perfil existente
 */
export async function updateProfile(roleId, profileData, clinicId) {
  try {
    const { data, error } = await supabase
      .from('roles')
      .update({
        ...profileData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', roleId)
      .select();

    if (!data || data.length === 0) {
      throw new Error('Record not found');
    }
    return data[0];

    if (error) {
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    throw error;
  }
}

/**
 * Deleta um perfil
 */
export async function deleteProfile(roleId, clinicId) {
  try {
    const { error } = await supabase.from('roles').delete().eq('id', roleId);

    if (error) {
      throw error;
    }
    return true;
  } catch (error) {
    console.error('Erro ao deletar perfil:', error);
    throw error;
  }
}

/**
 * Conta usuários por perfil
 */
export async function countUsersByProfile(roleId, clinicId) {
  try {
    const { count, error } = await supabase
      .from('users')
      .select('id', { count: 'exact' })
      .eq('role', roleId)
      .eq('clinic_id', clinicId);

    if (error) {
      throw error;
    }
    return count || 0;
  } catch (error) {
    console.error('Erro ao contar usuários:', error);
    return 0;
  }
}

/**
 * Lista usuários de um perfil
 */
export async function listUsersByProfile(roleId, clinicId) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name, role')
      .eq('role', roleId)
      .eq('clinic_id', clinicId)
      .order('full_name', { ascending: true });

    if (error) {
      throw error;
    }
    return data || [];
  } catch (error) {
    console.error('Erro ao listar usuários do perfil:', error);
    return [];
  }
}
