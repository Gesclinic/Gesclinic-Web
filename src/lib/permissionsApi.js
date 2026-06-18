// src/lib/permissionsApi.js
import { supabase } from './customSupabaseClient';

/**
 * Permissões do sistema organizadas por módulo
 */
export const PERMISSIONS_BY_MODULE = {
  dashboard: {
    label: 'Dashboard',
    icon: 'LayoutDashboard',
    permissions: [
      {
        id: 'dashboard.visualizar',
        label: 'Visualizar Dashboard',
        description: 'Acessar a página inicial do dashboard',
      },
    ],
  },
  agenda: {
    label: 'Agenda',
    icon: 'Calendar',
    permissions: [
      {
        id: 'agenda.visualizar',
        label: 'Visualizar Agenda',
        description: 'Visualizar compromissos agendados',
      },
      { id: 'agenda.criar', label: 'Criar Agendamentos', description: 'Criar novos agendamentos' },
      {
        id: 'agenda.editar',
        label: 'Editar Agendamentos',
        description: 'Modificar agendamentos existentes',
      },
      { id: 'agenda.deletar', label: 'Deletar Agendamentos', description: 'Remover agendamentos' },
      {
        id: 'agenda.confirmacao',
        label: 'Confirmar Agendamentos',
        description: 'Confirmar presença de pacientes',
      },
      {
        id: 'agenda.lista_espera',
        label: 'Lista de Espera',
        description: 'Gerenciar lista de espera',
      },
      {
        id: 'agenda.relatorios',
        label: 'Relatórios de Agenda',
        description: 'Gerar relatórios de agendamentos',
      },
      {
        id: 'agenda.notificacoes',
        label: 'Notificações',
        description: 'Enviar notificações de agendamento',
      },
    ],
  },
  pacientes: {
    label: 'Pacientes',
    icon: 'Users',
    permissions: [
      {
        id: 'pacientes.visualizar',
        label: 'Visualizar Pacientes',
        description: 'Ver informações dos pacientes',
      },
      { id: 'pacientes.criar', label: 'Criar Pacientes', description: 'Registrar novos pacientes' },
      {
        id: 'pacientes.editar',
        label: 'Editar Pacientes',
        description: 'Atualizar dados dos pacientes',
      },
      {
        id: 'pacientes.deletar',
        label: 'Deletar Pacientes',
        description: 'Remover registros de pacientes',
      },
      {
        id: 'pacientes.documentos',
        label: 'Documentos',
        description: 'Gerenciar documentos de pacientes',
      },
      {
        id: 'pacientes.historico',
        label: 'Histórico',
        description: 'Visualizar histórico de atendimentos',
      },
    ],
  },
  profissionais: {
    label: 'Profissionais',
    icon: 'Stethoscope',
    permissions: [
      {
        id: 'profissionais.visualizar',
        label: 'Visualizar Profissionais',
        description: 'Ver lista de profissionais',
      },
      {
        id: 'profissionais.criar',
        label: 'Criar Profissionais',
        description: 'Registrar novos profissionais',
      },
      {
        id: 'profissionais.editar',
        label: 'Editar Profissionais',
        description: 'Atualizar dados dos profissionais',
      },
      {
        id: 'profissionais.deletar',
        label: 'Deletar Profissionais',
        description: 'Remover profissionais',
      },
    ],
  },
  financeiro: {
    label: 'Financeiro',
    icon: 'Wallet',
    permissions: [
      {
        id: 'financeiro.dashboard',
        label: 'Dashboard Financeiro',
        description: 'Visualizar dashboard financeiro',
      },
      {
        id: 'financeiro.contas_pagar',
        label: 'Contas a Pagar',
        description: 'Gerenciar contas a pagar',
      },
      {
        id: 'financeiro.contas_receber',
        label: 'Contas a Receber',
        description: 'Gerenciar contas a receber',
      },
      {
        id: 'financeiro.fluxo_caixa',
        label: 'Fluxo de Caixa',
        description: 'Visualizar fluxo de caixa',
      },
      {
        id: 'financeiro.plano_contas',
        label: 'Plano de Contas',
        description: 'Gerenciar plano de contas',
      },
      {
        id: 'financeiro.centro_custos',
        label: 'Centro de Custos',
        description: 'Gerenciar centros de custo',
      },
      {
        id: 'financeiro.conciliacao',
        label: 'Conciliação Bancária',
        description: 'Realizar conciliação bancária',
      },
      {
        id: 'financeiro.automacao',
        label: 'Automação',
        description: 'Configurar automação financeira',
      },
      {
        id: 'financeiro.repasse_medico',
        label: 'Repasse Médico',
        description: 'Gerenciar repasse de médicos',
      },
    ],
  },
  estoque: {
    label: 'Estoque',
    icon: 'Boxes',
    permissions: [
      {
        id: 'estoque.dashboard',
        label: 'Dashboard Estoque',
        description: 'Visualizar dashboard de estoque',
      },
      { id: 'estoque.produtos', label: 'Produtos', description: 'Gerenciar produtos' },
      {
        id: 'estoque.categorias',
        label: 'Categorias',
        description: 'Gerenciar categorias de produtos',
      },
      { id: 'estoque.fornecedores', label: 'Fornecedores', description: 'Gerenciar fornecedores' },
      {
        id: 'estoque.movimentacoes',
        label: 'Movimentações',
        description: 'Registrar movimentações',
      },
      {
        id: 'estoque.transferencias',
        label: 'Transferências',
        description: 'Gerenciar transferências',
      },
      { id: 'estoque.requisicoes', label: 'Requisições', description: 'Gerenciar requisições' },
      { id: 'estoque.inventario', label: 'Inventário', description: 'Realizar inventário' },
      { id: 'estoque.relatorios', label: 'Relatórios', description: 'Gerar relatórios de estoque' },
    ],
  },
  faturamento: {
    label: 'Faturamento',
    icon: 'FileText',
    permissions: [
      {
        id: 'faturamento.visualizar',
        label: 'Visualizar Faturamento',
        description: 'Ver dados de faturamento',
      },
      {
        id: 'faturamento.criar',
        label: 'Criar Faturamento',
        description: 'Criar documentos de faturamento',
      },
      {
        id: 'faturamento.editar',
        label: 'Editar Faturamento',
        description: 'Editar documentos de faturamento',
      },
    ],
  },
  configuracoes: {
    label: 'Configurações',
    icon: 'Settings',
    permissions: [
      {
        id: 'configuracoes.gerais',
        label: 'Gerais',
        description: 'Configurações gerais da clínica',
      },
      { id: 'configuracoes.perfis', label: 'Perfis', description: 'Gerenciar perfis de usuários' },
      { id: 'configuracoes.permissoes', label: 'Permissões', description: 'Gerenciar permissões' },
      { id: 'configuracoes.agenda', label: 'Agenda', description: 'Configurações de agenda' },
      { id: 'configuracoes.conta', label: 'Conta', description: 'Configurações de conta' },
      {
        id: 'configuracoes.faturamento',
        label: 'Faturamento',
        description: 'Configurações de faturamento',
      },
      { id: 'configuracoes.estoque', label: 'Estoque', description: 'Configurações de estoque' },
    ],
  },
  administracao: {
    label: 'Administração',
    icon: 'Shield',
    permissions: [
      {
        id: 'administracao.usuarios',
        label: 'Usuários',
        description: 'Gerenciar usuários do sistema',
      },
      { id: 'administracao.clinicas', label: 'Clínicas', description: 'Gerenciar clínicas' },
    ],
  },
  atendimento: {
    label: 'Atendimento',
    icon: 'Heart',
    permissions: [
      {
        id: 'atendimento.visualizar',
        label: 'Visualizar Atendimento',
        description: 'Ver registros de atendimento',
      },
      {
        id: 'atendimento.criar',
        label: 'Criar Atendimento',
        description: 'Registrar novo atendimento',
      },
      {
        id: 'atendimento.editar',
        label: 'Editar Atendimento',
        description: 'Editar registros de atendimento',
      },
    ],
  },
};

/**
 * Obtém todas as permissões do sistema
 */
export function getAllPermissions() {
  const allPermissions = [];
  Object.values(PERMISSIONS_BY_MODULE).forEach((module) => {
    allPermissions.push(...module.permissions);
  });
  return allPermissions;
}

/**
 * Obtém permissões de um módulo específico
 */
export function getModulePermissions(moduleName) {
  return PERMISSIONS_BY_MODULE[moduleName]?.permissions || [];
}

/**
 * Lista todas as permissões de um usuário
 */
export async function listUserPermissions(userId, clinicId) {
  try {
    const { data, error } = await supabase
      .from('user_permissions')
      .select('*')
      .eq('user_id', userId)
      .eq('clinic_id', clinicId);

    if (error) {
      throw error;
    }
    return data || [];
  } catch (error) {
    console.error('Erro ao listar permissões do usuário:', error);
    return [];
  }
}

/**
 * Concede uma permissão a um usuário
 */
export async function grantPermission(userId, permissionId, clinicId) {
  try {
    const { data, error } = await supabase
      .from('user_permissions')
      .upsert(
        [
          {
            user_id: userId,
            permission_key: permissionId,
            clinic_id: clinicId,
            access_level: 'view',
            data_scope: 'own',
            source: 'custom',
          },
        ],
        { onConflict: 'user_id,clinic_id,permission_key' },
      )
      .select()
      .single();

    if (error) {
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Erro ao conceder permissão:', error);
    throw error;
  }
}

/**
 * Revoga uma permissão de um usuário
 */
export async function revokePermission(userId, permissionId, clinicId) {
  try {
    const { error } = await supabase
      .from('user_permissions')
      .delete()
      .eq('user_id', userId)
      .eq('permission_key', permissionId)
      .eq('clinic_id', clinicId);

    if (error) {
      throw error;
    }
    return true;
  } catch (error) {
    console.error('Erro ao revogar permissão:', error);
    throw error;
  }
}

/**
 * Concede múltiplas permissões a um usuário
 */
export async function grantPermissionsBatch(userId, permissionIds, clinicId) {
  try {
    const permissions = permissionIds.map((permissionId) => ({
      user_id: userId,
      permission_key: permissionId,
      clinic_id: clinicId,
      access_level: 'view',
      data_scope: 'own',
      source: 'custom',
    }));

    const { data, error } = await supabase
      .from('user_permissions')
      .upsert(permissions, { onConflict: 'user_id,clinic_id,permission_key' })
      .select();

    if (error) {
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Erro ao conceder permissões em lote:', error);
    throw error;
  }
}

/**
 * Revoga múltiplas permissões de um usuário
 */
export async function revokePermissionsBatch(userId, permissionIds, clinicId) {
  try {
    const { error } = await supabase
      .from('user_permissions')
      .delete()
      .eq('user_id', userId)
      .eq('clinic_id', clinicId)
      .in('permission_key', permissionIds);

    if (error) {
      throw error;
    }
    return true;
  } catch (error) {
    console.error('Erro ao revogar permissões em lote:', error);
    throw error;
  }
}

/**
 * Verifica se um usuário tem uma permissão específica
 */
export async function hasPermission(userId, permissionId, clinicId) {
  try {
    const { data, error } = await supabase
      .from('user_permissions')
      .select('id, access_level')
      .eq('user_id', userId)
      .eq('permission_key', permissionId)
      .eq('clinic_id', clinicId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    return !!data && data.access_level !== 'blocked';
  } catch (error) {
    console.error('Erro ao verificar permissão:', error);
    return false;
  }
}

/**
 * Lista usuários com uma permissão específica
 */
export async function listUsersWithPermission(permissionId, clinicId) {
  try {
    const { data, error } = await supabase
      .from('user_permissions')
      .select('users(id, email, full_name, role)')
      .eq('permission_key', permissionId)
      .eq('clinic_id', clinicId);

    if (error) {
      throw error;
    }
    return data?.map((item) => item.users) || [];
  } catch (error) {
    console.error('Erro ao listar usuários com permissão:', error);
    return [];
  }
}
