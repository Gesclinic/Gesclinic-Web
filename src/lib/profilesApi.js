// src/lib/profilesApi.js
import { supabase } from './customSupabaseClient';

/**
 * Perfis do sistema com suas permissões
 * admin: Acesso completo
 * financeiro: Acesso a módulos financeiros
 * recepcao: Acesso a agendamento e pacientes
 * profissional: Acesso a agenda pessoal e atendimento
 */

export const PROFILES_CONFIG = {
  admin: {
    id: 'admin',
    label: 'Administrador',
    description: 'Acesso completo ao sistema',
    color: 'bg-red-100 text-red-800',
    permissions: [
      'dashboard.visualizar',
      'agenda.visualizar',
      'agenda.criar',
      'agenda.editar',
      'agenda.deletar',
      'agenda.confirmacao',
      'agenda.lista_espera',
      'agenda.relatorios',
      'agenda.notificacoes',
      'pacientes.visualizar',
      'pacientes.criar',
      'pacientes.editar',
      'pacientes.deletar',
      'pacientes.documentos',
      'pacientes.historico',
      'profissionais.visualizar',
      'profissionais.criar',
      'profissionais.editar',
      'profissionais.deletar',
      'financeiro.dashboard',
      'financeiro.contas_pagar',
      'financeiro.contas_receber',
      'financeiro.fluxo_caixa',
      'financeiro.plano_contas',
      'financeiro.centro_custos',
      'financeiro.conciliacao',
      'financeiro.automacao',
      'financeiro.repasse_medico',
      'estoque.dashboard',
      'estoque.produtos',
      'estoque.categorias',
      'estoque.fornecedores',
      'estoque.movimentacoes',
      'estoque.transferencias',
      'estoque.requisicoes',
      'estoque.inventario',
      'estoque.relatorios',
      'faturamento.visualizar',
      'faturamento.criar',
      'faturamento.editar',
      'configuracoes.gerais',
      'configuracoes.perfis',
      'configuracoes.permissoes',
      'configuracoes.agenda',
      'configuracoes.conta',
      'configuracoes.faturamento',
      'configuracoes.estoque',
      'administracao.usuarios',
      'administracao.clinicas',
      'atendimento.visualizar',
      'atendimento.criar',
      'atendimento.editar'
    ],
    modules: ['Dashboard', 'Agenda', 'Pacientes', 'Financeiro', 'Estoque', 'Faturamento', 'Configurações', 'Administração']
  },
  financeiro: {
    id: 'financeiro',
    label: 'Financeiro',
    description: 'Gerenciamento de contas a pagar e receber',
    color: 'bg-green-100 text-green-800',
    permissions: [
      'dashboard.visualizar',
      'financeiro.dashboard',
      'financeiro.contas_pagar',
      'financeiro.contas_receber',
      'financeiro.fluxo_caixa',
      'financeiro.plano_contas',
      'financeiro.centro_custos',
      'financeiro.conciliacao',
      'financeiro.automacao',
      'financeiro.repasse_medico',
      'faturamento.visualizar'
    ],
    modules: ['Dashboard', 'Financeiro', 'Faturamento']
  },
  recepcao: {
    id: 'recepcao',
    label: 'Recepção',
    description: 'Agendamento, pacientes e atendimento',
    color: 'bg-blue-100 text-blue-800',
    permissions: [
      'dashboard.visualizar',
      'agenda.visualizar',
      'agenda.criar',
      'agenda.editar',
      'agenda.confirmacao',
      'agenda.lista_espera',
      'agenda.notificacoes',
      'pacientes.visualizar',
      'pacientes.criar',
      'pacientes.editar',
      'pacientes.documentos',
      'pacientes.historico',
      'profissionais.visualizar',
      'atendimento.visualizar',
      'atendimento.criar'
    ],
    modules: ['Dashboard', 'Agenda', 'Pacientes', 'Atendimento']
  },
  profissional: {
    id: 'profissional',
    label: 'Profissional',
    description: 'Agenda pessoal e atendimento',
    color: 'bg-purple-100 text-purple-800',
    permissions: [
      'dashboard.visualizar',
      'agenda.visualizar',
      'agenda.confirmacao',
      'pacientes.visualizar',
      'pacientes.documentos',
      'pacientes.historico',
      'atendimento.visualizar',
      'atendimento.criar',
      'atendimento.editar'
    ],
    modules: ['Dashboard', 'Agenda', 'Pacientes', 'Atendimento']
  },
  estoque: {
    id: 'estoque',
    label: 'Estoque',
    description: 'Gerenciamento de produtos e movimentações',
    color: 'bg-orange-100 text-orange-800',
    permissions: [
      'dashboard.visualizar',
      'estoque.dashboard',
      'estoque.produtos',
      'estoque.categorias',
      'estoque.fornecedores',
      'estoque.movimentacoes',
      'estoque.transferencias',
      'estoque.requisicoes',
      'estoque.inventario',
      'estoque.relatorios'
    ],
    modules: ['Dashboard', 'Estoque']
  },
  faturamento: {
    id: 'faturamento',
    label: 'Faturamento',
    description: 'Emissão de notas fiscais e guias',
    color: 'bg-amber-100 text-amber-800',
    permissions: [
      'dashboard.visualizar',
      'financeiro.dashboard',
      'faturamento.visualizar',
      'faturamento.criar',
      'faturamento.editar',
      'profissionais.visualizar',
      'pacientes.visualizar'
    ],
    modules: ['Dashboard', 'Financeiro', 'Faturamento']
  }
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

    if (error) throw error;
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
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .eq('id', roleId)
      .single();

    if (error) throw error;
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
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) throw error;
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
        updated_at: new Date().toISOString()
      })
      .eq('id', roleId)
      .select();

    if (!data || data.length === 0) {
      throw new Error('Record not found');
    }
    return data[0];

    if (error) throw error;
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
    const { error } = await supabase
      .from('roles')
      .delete()
      .eq('id', roleId);

    if (error) throw error;
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

    if (error) throw error;
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

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao listar usuários do perfil:', error);
    return [];
  }
}
