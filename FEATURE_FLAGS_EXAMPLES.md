/**
 * EXEMPLOS DE USO - Feature Flags e Guards
 * 
 * Estes são padrões práticos para usar os hooks de verificação de plano
 */

// ============================================
// 1. USAR HOOK SIMPLES EM COMPONENTES
// ============================================

import { useFeatureAccess, usePlanInfo } from '@/hooks/useFeatureAccess';

function FinancialDashboard() {
  const canAccessFinancial = useFeatureAccess('financial');
  
  if (!canAccessFinancial) {
    return (
      <div className="p-6 bg-blue-50 rounded-lg">
        <h2 className="text-2xl font-bold mb-2">Financeiro</h2>
        <p className="mb-4">Atualize para o plano Profissional para acessar este módulo.</p>
        <a href="/clinica/upgrade" className="btn btn-primary">
          Fazer Upgrade
        </a>
      </div>
    );
  }

  return (
    <div>
      {/* Seu componente financeiro aqui */}
    </div>
  );
}

// ============================================
// 2. USAR COMPONENTE ProtectFeature
// ============================================

import { ProtectFeature, UpgradePlanBanner } from '@/hooks/useFeatureAccess';

function StockModule() {
  return (
    <ProtectFeature feature="stock">
      <div className="p-6">
        <h2 className="text-2xl font-bold">Controle de Estoque</h2>
        {/* Conteúdo do estoque */}
      </div>
    </ProtectFeature>
  );
}

// ============================================
// 3. MOSTRAR/OCULTAR MENU ITEMS
// ============================================

import { useFeatureAccess } from '@/hooks/useFeatureAccess';

function Sidebar() {
  const canAccessFinancial = useFeatureAccess('financial');
  const canAccessStock = useFeatureAccess('stock');
  const canAccessReports = useFeatureAccess('reports');

  return (
    <nav>
      <ul>
        <li><a href="/clinica/agenda">Agenda</a></li>
        {canAccessFinancial && <li><a href="/clinica/financeiro">Financeiro</a></li>}
        {canAccessStock && <li><a href="/clinica/estoque">Estoque</a></li>}
        {canAccessReports && <li><a href="/clinica/relatorios">Relatórios</a></li>}
      </ul>
    </nav>
  );
}

// ============================================
// 4. VERIFICAR LIMITES DE USUÁRIOS
// ============================================

import { usePlanLimits } from '@/hooks/useFeatureAccess';

function UserManagement() {
  const { maxUsers, currentUsers } = usePlanLimits();

  return (
    <div>
      <p>
        Usuários: {currentUsers} / {maxUsers}
      </p>
      {currentUsers >= maxUsers && (
        <p className="text-red-600">Limite de usuários atingido!</p>
      )}
    </div>
  );
}

// ============================================
// 5. CRIAR BADGE DO PLANO ATUAL
// ============================================

import { usePlanInfo } from '@/hooks/useFeatureAccess';

function PlanBadge() {
  const plan = usePlanInfo();

  if (!plan) return null;

  const colors = {
    'basic': 'bg-green-100 text-green-800',
    'professional': 'bg-blue-100 text-blue-800',
    'enterprise': 'bg-purple-100 text-purple-800',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${colors[plan.planSlug]}`}>
      {plan.planName}
    </span>
  );
}

// ============================================
// 6. LISTAR FEATURES DISPONÍVEIS
// ============================================

function PlanFeaturesCheckout() {
  const plan = usePlanInfo();

  if (!plan) return null;

  const features = [
    { key: 'financial', label: 'Financeiro Completo' },
    { key: 'stock', label: 'Controle de Estoque' },
    { key: 'reports', label: 'Relatórios Gerenciais' },
    { key: 'multiUnit', label: 'Multiunidades' },
  ];

  return (
    <div>
      <h3>Funcionalidades do seu plano:</h3>
      <ul>
        {features.map(feature => (
          <li key={feature.key} className={plan.features[feature.key] ? 'text-green-600' : 'text-gray-400'}>
            <span>{plan.features[feature.key] ? '✓' : '✗'} {feature.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================
// 7. INTEGRAÇÃO COM SUPABASE (Query Exemplo)
// ============================================

/**
 * Quando buscar clinic do Supabase, incluir plan:
 */

async function loadClinic(clinicId) {
  const { data, error } = await supabase
    .from('clinics')
    .select(`
      *,
      plan:plan_id(
        id,
        name,
        slug,
        max_users,
        max_doctors,
        has_financial,
        has_stock,
        has_reports,
        has_multi_unit
      ),
      subscription:clinic_subscriptions(
        id,
        status,
        stripe_subscription_id,
        current_period_end
      )
    `)
    .eq('id', clinicId)
    .single();

  return data;
}

// ============================================
// 8. WEBHOOK STRIPE ATUALIZAR PLANO
// ============================================

/**
 * Na Edge Function de webhook do Stripe:
 * 
 * async function handleCheckoutSessionCompleted(session) {
 *   const { metadata } = session;
 *   const { clinic_id, plan_slug } = metadata;
 * 
 *   // Encontrar plan_id pelo slug
 *   const plan = await supabase
 *     .from('plans')
 *     .select('id')
 *     .eq('slug', plan_slug)
 *     .single();
 * 
 *   // Atualizar clínica com novo plano
 *   await supabase
 *     .from('clinics')
 *     .update({ plan_id: plan.data.id })
 *     .eq('id', clinic_id);
 * 
 *   // Criar/atualizar subscription
 *   await supabase
 *     .from('clinic_subscriptions')
 *     .upsert({
 *       clinic_id,
 *       plan_id: plan.data.id,
 *       stripe_customer_id: session.customer,
 *       stripe_subscription_id: session.subscription,
 *       status: 'active'
 *     });
 * }
 */

export default {
  FinancialDashboard,
  StockModule,
  Sidebar,
  UserManagement,
  PlanBadge,
  PlanFeaturesCheckout,
  loadClinic,
};
