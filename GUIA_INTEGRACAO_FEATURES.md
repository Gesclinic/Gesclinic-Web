# 🔧 GUIA DE INTEGRAÇÃO - Feature Flags e Menu Dinâmico

## Índice
1. [Menu Dinâmico por Plano](#menu-dinâmico)
2. [Proteger Componentes](#proteger-componentes)
3. [Proteger Rotas](#proteger-rotas)
4. [Usar UpgradeBanner](#usar-banner)
5. [Exemplos de Código](#exemplos)
6. [Troubleshooting](#troubleshooting)

---

## Menu Dinâmico

### Como integrar na AppLayout

**ANTES:** Menu estático para todos
**DEPOIS:** Menu filtrado por plano do usuário

#### Código Atual (AppLayout.jsx)
```jsx
import { useClinicContext } from '@/contexts/useClinicContext';
import { useMenuWithFeatures } from '@/hooks/useMenuWithFeatures';
import getMenuItems from '@/constants/menu';

export default function AppLayout({ children }) {
  const { clinic, loadingClinic } = useClinicContext();
  
  // Filtrar menu baseado no plano
  const baseMenu = getMenuItems();
  const filteredMenu = useMenuWithFeatures(baseMenu);
  
  if (loadingClinic) return <LoadingScreen />;
  
  return (
    <Layout>
      <Sidebar menu={filteredMenu} />
      <main>{children}</main>
    </Layout>
  );
}
```

#### Como funciona:
1. `getMenuItems()` retorna menu completo com todos os itens
2. `useMenuWithFeatures()` filtra baseado em `clinic.plan.slug`
3. Itens sem acesso aparecem com badge "BLOQUEADO"
4. Clique em item bloqueado mostra UpgradeBanner

---

## Proteger Componentes

### Opção 1: useFeatureAccess Hook (simples)

```jsx
import { useFeatureAccess } from '@/hooks/useFeatureAccess';

export default function EstoqueDashboard() {
  const hasEstoque = useFeatureAccess('estoque');
  
  if (!hasEstoque) {
    return null; // Ou mostrar banner
  }
  
  return <Dashboard />;
}
```

### Opção 2: UpgradePlanBanner (com aviso)

```jsx
import { UpgradePlanBanner } from '@/components/ui/UpgradePlanBanner';

export default function FinanceiroDashboard() {
  return (
    <>
      <UpgradePlanBanner 
        feature="financeiro"
        title="Financeiro não disponível"
        message="Este módulo requer o Plano Profissional ou superior."
      />
      
      {/* Seu componente de financeiro */}
      <FinanceiroContent />
    </>
  );
}
```

### Opção 3: ProtectFeature HOC (proteção de rota)

```jsx
import { ProtectFeature } from '@/hooks/useFeatureAccess';

const EstoquePageProtected = ProtectFeature({
  feature: 'estoque',
  title: 'Estoque',
  message: 'O módulo de Estoque está disponível no Plano Profissional.'
})(EstoquePage);

export default EstoquePageProtected;
```

---

## Proteger Rotas

### Em AppRoutes.jsx

```jsx
import { ProtectFeature } from '@/hooks/useFeatureAccess';
import EstoquePage from '@/pages/estoque/EstoquePage';
import FinanceiroPage from '@/pages/financeiro/FinanceiroPage';

const EstoquePageProtected = ProtectFeature({
  feature: 'estoque'
})(EstoquePage);

const FinanceiroPageProtected = ProtectFeature({
  feature: 'financeiro'
})(FinanceiroPage);

export default function AppRoutes() {
  return (
    <Routes>
      {/* ... outras rotas ... */}
      
      {/* Protegidas por Feature */}
      <Route path="/clinica/estoque/*" element={<EstoquePageProtected />} />
      <Route path="/clinica/financeiro/*" element={<FinanceiroPageProtected />} />
      
      {/* Não protegidas (todos planos) */}
      <Route path="/clinica/agenda/*" element={<AgendaPage />} />
      <Route path="/clinica/pacientes/*" element={<PacientesPage />} />
    </Routes>
  );
}
```

---

## Usar UpgradeBanner

### Cenário 1: Bloquear Feature na Página

```jsx
import { UpgradePlanBanner } from '@/components/ui/UpgradePlanBanner';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';

export default function EstoqueProdutos() {
  const hasAccess = useFeatureAccess('estoque.produtos');
  
  return (
    <div>
      {!hasAccess && (
        <UpgradePlanBanner 
          feature="estoque"
          title="Controle de Estoque"
          message="Para gerenciar seus produtos e estoque, faça upgrade para o Plano Profissional"
          showButton={true}
        />
      )}
      
      {hasAccess && <ProdutosTable />}
    </div>
  );
}
```

### Cenário 2: Desabilitar Botão

```jsx
import { useFeatureAccess } from '@/hooks/useFeatureAccess';

export default function PacientesPage() {
  const hasSeguros = useFeatureAccess('pacientes.seguradoras');
  
  return (
    <div>
      <button 
        disabled={!hasSeguros}
        title={!hasSeguros ? 'Disponível no Plano Enterprise' : ''}
      >
        {hasSeguros ? 'Adicionar Seguro' : 'Adicionar Seguro (Enterprise)'}
      </button>
    </div>
  );
}
```

### Cenário 3: Mostrar Modal ao Clicar

```jsx
import { BlockedFeatureModal } from '@/components/ui/UpgradePlanBanner';
import { useState } from 'react';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';

export default function Repasse() {
  const [showBlocked, setShowBlocked] = useState(false);
  const hasRepasse = useFeatureAccess('financeiro.repasse_medico');
  
  const handleClick = () => {
    if (!hasRepasse) {
      setShowBlocked(true);
      return;
    }
    // Lógica normal
  };
  
  return (
    <>
      {showBlocked && (
        <BlockedFeatureModal 
          feature="repasse_medico"
          onClose={() => setShowBlocked(false)}
        />
      )}
      
      <button onClick={handleClick}>
        Ir para Repasse
      </button>
    </>
  );
}
```

---

## Exemplos de Código

### Exemplo 1: Verificar Limite de Usuários

```jsx
import { usePlanLimits } from '@/hooks/useFeatureAccess';

export default function AddUserForm() {
  const { maxUsers, currentUsers } = usePlanLimits();
  const canAddMore = currentUsers < maxUsers;
  
  return (
    <div>
      <p>Usuários: {currentUsers}/{maxUsers}</p>
      
      {!canAddMore && (
        <UpgradePlanBanner 
          feature="users"
          title="Limite de Usuários Atingido"
          message={`Seu plano permite apenas ${maxUsers} usuários. Faça upgrade para mais.`}
        />
      )}
      
      <form disabled={!canAddMore}>
        {/* Form fields */}
      </form>
    </div>
  );
}
```

### Exemplo 2: Componente Condicional

```jsx
import { useFeatureAccess, usePlanInfo } from '@/hooks/useFeatureAccess';

export default function PacienteDetail() {
  const { plan } = usePlanInfo();
  const hasMultiUnit = useFeatureAccess('estoque.multiunidades');
  const hasFinanceiro = useFeatureAccess('financeiro');
  
  return (
    <div>
      <h1>Dados do Paciente</h1>
      
      {/* Sempre visível */}
      <Section title="Informações Básicas">
        <BasicInfo />
      </Section>
      
      {/* Profissional+ */}
      {hasMultiUnit && (
        <Section title="Associar Unidade">
          <UnidadeSelector />
        </Section>
      )}
      
      {/* Profissional+ */}
      {hasFinanceiro && (
        <Section title="Histórico Financeiro">
          <FinanceiroHistory />
        </Section>
      )}
      
      {/* Enterprise only */}
      {plan?.slug === 'enterprise' && (
        <Section title="Dados Familiar">
          <FamiliarData />
        </Section>
      )}
    </div>
  );
}
```

### Exemplo 3: Menu com Feature Guard

```jsx
import { useMenuItemAccess } from '@/hooks/useMenuWithFeatures';

export default function MenuItem({ item }) {
  const { canAccess, upgrade } = useMenuItemAccess(item.featurePath);
  
  if (!canAccess) {
    return (
      <div 
        title={upgrade}
        className="opacity-50 cursor-not-allowed"
      >
        {item.label} 
        <Badge variant="warning">BLOQUEADO</Badge>
      </div>
    );
  }
  
  return <Link to={item.path}>{item.label}</Link>;
}
```

---

## Troubleshooting

### Problema 1: Feature sempre bloqueada

**Causa:** `clinic.plan` é null/undefined
**Solução:**
```jsx
const { clinic, loadingClinic } = useClinicContext();

if (loadingClinic || !clinic?.plan) {
  return <LoadingScreen />;
}

// Agora seguro usar clinic.plan
```

### Problema 2: Menu não filtra

**Causa:** `useMenuWithFeatures()` não está sendo usado
**Solução:**
```jsx
// ERRADO - menu não é filtrado
<Sidebar menu={getMenuItems()} />

// CORRETO - menu filtrado
const filteredMenu = useMenuWithFeatures(getMenuItems());
<Sidebar menu={filteredMenu} />
```

### Problema 3: Featurepath não funciona

**Causa:** featurePath não existe no menuPlansMapping.js
**Solução:** Adicionar o featurePath ao arquivo:
```javascript
// src/constants/menuPlansMapping.js
export const plansFeatureMap = {
  'meu.novo.feature': {
    basic: false,
    professional: true,
    enterprise: true,
  }
};
```

### Problema 4: Banner aparece mesmo com acesso

**Causa:** Feature name incorreto
**Solução:** Verificar spelling:
```jsx
// ERRADO - 'estoque' vs 'estoque.dashboard'
<UpgradePlanBanner feature="estoque" />

// CORRETO - usar exact feature path
<UpgradePlanBanner feature="estoque.produtos" />
```

### Problema 5: Stripe checkout não mostra preços

**Causa:** Stripe Price IDs incorretos
**Solução:** Verificar em stripe-products.js:
```javascript
export const STRIPE_PRODUCTS = {
  basic: {
    productId: 'prod_TmWgbE3Y7gn42C',
    prices: {
      monthly: 'price_1SoxdGLH381hB5ddad7o2vYa', // ✅ Correto
      annual: 'price_1Soxe1LH381hB5ddjFcjfm9H',  // ✅ Correto
    }
  }
};
```

---

## Testes Recomendados

### Teste 1: Menu Dinâmico
```bash
# 1. Fazer login com plano Basic
# 2. Verificar que Estoque/Financeiro aparecem bloqueados
# 3. Fazer upgrade para Professional
# 4. Verificar que Estoque/Financeiro agora estão visíveis
```

### Teste 2: Feature Access
```javascript
// No console
const { clinic } = useClinicContext();
console.log('Plan:', clinic.plan);
console.log('Has Stock:', clinic.plan.has_stock);
console.log('Has Financial:', clinic.plan.has_financial);
```

### Teste 3: Upgrade Flow
```bash
# 1. Tentar acessar /clinica/estoque/produtos no plano Basic
# 2. Deve mostrar BlockedFeatureModal
# 3. Clicar "Ver Planos"
# 4. Deve redirecionar para /clinica/configuracoes/plano
```

### Teste 4: Stripe Integration
```bash
# 1. Ir para /checkout
# 2. Selecionar cada plano
# 3. Verificar preços (R$99, R$249, R$489)
# 4. Clicar "Começar agora"
# 5. Deve redirecionar para Stripe Checkout
```

---

## Referência Rápida

| Função | Uso | Returns |
|--------|-----|---------|
| `useFeatureAccess(feature)` | Verificar se feature está acessível | boolean |
| `usePlanLimits()` | Obter limites de usuários/profissionais | { maxUsers, currentUsers, maxDoctors, currentDoctors } |
| `usePlanInfo()` | Obter informações do plano | { plan, planName, planSlug, upgrade } |
| `useMenuWithFeatures(menu)` | Filtrar menu por plano | menu filtrado |
| `useMenuItemAccess(featurePath)` | Verificar item específico | { canAccess, upgrade } |
| `UpgradePlanBanner` | Componente de aviso | JSX |
| `BlockedFeatureModal` | Modal de bloqueio | JSX |
| `ProtectFeature(config)(Component)` | HOC de proteção | Protected Component |

---

## Fluxo Completo: Do Usuário ao Dashboard

```
1. Usuário acessa /checkout
   ↓
2. Seleciona Plano Profissional
   ↓
3. Clica "Começar agora"
   ↓
4. Redireciona para Stripe Checkout
   ↓
5. Completa pagamento
   ↓
6. Webhook de sucesso dispara
   ↓
7. clinic_subscriptions criada com plan_id = professional
   ↓
8. clinic.plan atualizado no contexto
   ↓
9. Menu refilitrado automaticamente
   ↓
10. Estoque/Financeiro agora visíveis
    ↓
11. Cliques em features Enterprise mostram UpgradeBanner
    ↓
12. Usuário pode navegar normalmente
```

---

**Última Atualização:** 2025-01-12
**Versão:** 1.0
**Mantido por:** Dev Team

