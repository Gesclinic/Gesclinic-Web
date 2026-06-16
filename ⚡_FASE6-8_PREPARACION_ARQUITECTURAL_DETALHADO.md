# ⚡ FASE 6-8: PREPARACIÓN ARQUITECTURAL
## Estrutura de Dados para Enterprise Billing

**Status**: 🚀 INICIANDO AGORA  
**Objetivo**: Preparar banco de dados para convênios, repasse médico e produção médica  
**Tempo Estimado**: 3-4 horas  
**Dependência**: FASE 4-5 ✅ Completa  

---

## 📋 ESCOPO FASE 6-8

### FASE 6: Estrutura de Convênios
- Adicionar coluna `plan_id` em `appointment_services`
- Adicionar coluna `authorization_number` em `appointment_services`
- Validação de autorização de serviços por plano
- Query para buscar preços por convênio

### FASE 7: Preparação Repasse Médico
- Adicionar coluna `professional_percentage` em `appointment_services`
- Adicionar coluna `professional_discount` em `appointment_services`
- Lógica de cálculo (desconto fixo vs percentual)
- API para atualizar repasse

### FASE 8: Preparação Produção Médica
- Link com `medical_production` table
- Indicadores de produção (atendimentos, receita, ticket médio)
- Dashboard de produção

---

## 🔧 ETAPAS DE IMPLEMENTAÇÃO

### Etapa 1: Análise de Schema Atual
**Objetivo**: Verificar estrutura atual de `appointment_services`

**Query SQL**:
```sql
-- Verificar colunas existentes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'appointment_services'
ORDER BY ordinal_position;
```

**Checklist**:
- [ ] Coluna `id` - UUID (PK)
- [ ] Coluna `appointment_id` - UUID (FK)
- [ ] Coluna `clinic_id` - UUID (FK)
- [ ] Coluna `service_id` - UUID (FK)
- [ ] Coluna `value` - NUMERIC
- [ ] Coluna `discount` - NUMERIC
- [ ] Coluna `created_at` - TIMESTAMP
- [ ] Coluna `updated_at` - TIMESTAMP

**Colunas Esperadas**:
- [ ] `plan_id` - (FASE 6) UUID (FK to plans)
- [ ] `authorization_number` - (FASE 6) VARCHAR (MAX 50)
- [ ] `professional_percentage` - (FASE 7) NUMERIC(5,2)
- [ ] `professional_discount` - (FASE 7) NUMERIC(10,2)

---

### Etapa 2: Criar Migrations SQL

**Arquivo**: `supabase/migrations/2026-06-06_fase6-8_architectural_prep.sql`

```sql
-- ============================================
-- FASE 6-8: Preparación Arquitectural
-- Adiciona colunas para convênios, repasse e produção
-- ============================================

-- FASE 6: Estrutura de Convênios
ALTER TABLE appointment_services
ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS authorization_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS authorization_verified_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS plan_name VARCHAR(255); -- Cache do nome do plano

-- FASE 7: Preparação Repasse Médico
ALTER TABLE appointment_services
ADD COLUMN IF NOT EXISTS professional_percentage NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS professional_discount NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS professional_repay_type VARCHAR(50) DEFAULT 'percentage'; -- 'percentage' ou 'fixed'

-- FASE 8: Preparação Produção Médica
ALTER TABLE appointment_services
ADD COLUMN IF NOT EXISTS medical_production_id UUID REFERENCES medical_production(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS sessions_completed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sessions_total INTEGER,
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending'; -- 'pending', 'partial', 'completed', 'cancelled'

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_appointment_services_plan_id 
ON appointment_services(plan_id);

CREATE INDEX IF NOT EXISTS idx_appointment_services_professional_id 
ON appointment_services(professional_id);

CREATE INDEX IF NOT EXISTS idx_appointment_services_status 
ON appointment_services(status);

-- Criar função RPC para cálculo de repasse médico
CREATE OR REPLACE FUNCTION calculate_professional_repay(
  p_value NUMERIC,
  p_percentage NUMERIC,
  p_discount NUMERIC,
  p_repay_type VARCHAR
)
RETURNS NUMERIC AS $$
BEGIN
  IF p_repay_type = 'percentage' THEN
    RETURN (p_value - p_discount) * (p_percentage / 100.0);
  ELSIF p_repay_type = 'fixed' THEN
    RETURN p_discount;
  ELSE
    RETURN 0;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Criar função RPC para sincronizar dados de convênio
CREATE OR REPLACE FUNCTION sync_plan_info_to_service(
  p_service_id UUID,
  p_plan_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_plan_name VARCHAR;
BEGIN
  -- Buscar nome do plano
  SELECT name INTO v_plan_name FROM plans WHERE id = p_plan_id;
  
  -- Atualizar appointment_services
  UPDATE appointment_services
  SET plan_name = v_plan_name,
      updated_at = NOW()
  WHERE id = p_service_id;
END;
$$ LANGUAGE plpgsql;

-- Comentários para documentação
COMMENT ON COLUMN appointment_services.plan_id IS 'Referência ao convênio/plano de saúde (FASE 6)';
COMMENT ON COLUMN appointment_services.authorization_number IS 'Número de autorização do convênio (FASE 6)';
COMMENT ON COLUMN appointment_services.professional_percentage IS 'Percentual de repasse médico (FASE 7)';
COMMENT ON COLUMN appointment_services.professional_discount IS 'Valor fixo de repasse médico (FASE 7)';
COMMENT ON COLUMN appointment_services.medical_production_id IS 'Link com registro de produção médica (FASE 8)';

-- RLS: Garantir que usuários só acessem dados da sua clínica
-- (Já devem estar configuradas, apenas verificar)
CREATE POLICY IF NOT EXISTS appointment_services_clinic_isolation
ON appointment_services
FOR ALL
USING (clinic_id = auth.uid()::UUID OR clinic_id IN (
  SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid()
));
```

---

### Etapa 3: Aplicar Migrations

**Opção A**: Via Supabase Console
1. Acessar Supabase → SQL Editor
2. Copiar queries acima
3. Executar

**Opção B**: Via PowerShell Script
```powershell
# scripts/apply_fase6-8_migration.ps1
$migrationFile = "supabase/migrations/2026-06-06_fase6-8_architectural_prep.sql"
$supabaseUrl = $env:VITE_SUPABASE_URL
$supabaseKey = $env:VITE_SUPABASE_ANON_KEY

# Ler arquivo
$sql = Get-Content $migrationFile -Raw

# Executar via API ou local
Write-Host "Aplicando migration FASE 6-8..."
# (Implementar execução)
```

---

### Etapa 4: Atualizar API Layer

**Arquivo**: `src/lib/appointmentsApi.js`

**Novas Funções**:
```javascript
/**
 * Sincronizar informações de convênio para appointment_services
 */
export async function syncPlanInfoToService(serviceId, planId) {
  try {
    const result = await supabase.rpc('sync_plan_info_to_service', {
      p_service_id: serviceId,
      p_plan_id: planId,
    });
    
    if (result.error) throw result.error;
    return true;
  } catch (err) {
    console.error('❌ Erro ao sincronizar informações de convênio:', err);
    throw err;
  }
}

/**
 * Atualizar informações de repasse médico para serviço
 */
export async function updateProfessionalRepay(serviceId, {
  percentage,
  discount,
  repayType = 'percentage'
}) {
  try {
    const { data, error } = await supabase
      .from('appointment_services')
      .update({
        professional_percentage: percentage,
        professional_discount: discount,
        professional_repay_type: repayType,
        updated_at: new Date().toISOString(),
      })
      .eq('id', serviceId);
    
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('❌ Erro ao atualizar repasse médico:', err);
    throw err;
  }
}

/**
 * Calcular valor de repasse médico
 */
export async function calculateProfessionalRepay(value, percentage, discount, repayType) {
  try {
    const { data, error } = await supabase.rpc('calculate_professional_repay', {
      p_value: value,
      p_percentage: percentage,
      p_discount: discount,
      p_repay_type: repayType,
    });
    
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('❌ Erro ao calcular repasse médico:', err);
    throw err;
  }
}

/**
 * Buscar preços de serviço por convênio
 */
export async function getServicePriceByPlan(serviceId, planId) {
  try {
    const { data, error } = await supabase
      .from('service_prices')
      .select('id, service_id, plan_id, price, active')
      .eq('service_id', serviceId)
      .eq('plan_id', planId)
      .eq('active', true)
      .single();
    
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('❌ Erro ao buscar preço de convênio:', err);
    return null;
  }
}

/**
 * Atualizar authorization_number de serviço
 */
export async function updateAuthorizationNumber(serviceId, authorizationNumber) {
  try {
    const { data, error } = await supabase
      .from('appointment_services')
      .update({
        authorization_number: authorizationNumber,
        authorization_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', serviceId);
    
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('❌ Erro ao atualizar authorization_number:', err);
    throw err;
  }
}
```

---

### Etapa 5: Atualizar getAppointmentServices()

**Modificar função existente**:
```javascript
/**
 * MODIFICADO: Incluir novas colunas de FASE 6-8
 */
export async function getAppointmentServices(appointmentId) {
  try {
    const { data, error } = await supabase
      .from('appointment_services')
      .select(`
        id,
        appointment_id,
        clinic_id,
        service_id,
        services:service_id (id, name, code, active),
        
        -- FASE 6: Convênios
        plan_id,
        plan_name,
        authorization_number,
        authorization_verified_at,
        
        -- FASE 7: Repasse Médico
        professional_percentage,
        professional_discount,
        professional_repay_type,
        
        -- FASE 8: Produção Médica
        medical_production_id,
        sessions_completed,
        sessions_total,
        status,
        
        -- Colunas existentes
        value,
        discount,
        billing_type,
        quantity,
        sequence_order,
        created_at,
        updated_at
      `)
      .eq('appointment_id', appointmentId)
      .order('sequence_order', { ascending: true });
    
    if (error) throw error;
    
    console.log('📊 [getAppointmentServices] Retornando', data?.length || 0, 'serviços');
    return data || [];
  } catch (err) {
    console.error('❌ [getAppointmentServices] Erro:', err);
    throw err;
  }
}
```

---

### Etapa 6: Atualizar UI Components

**Modificar**: `BillingTypeSelector.jsx`
```javascript
// Adicionar state para plan_id e authorization
const [planId, setPlanId] = useState(null);
const [authNumber, setAuthNumber] = useState('');

// Adicionar field de autorização
<input
  type="text"
  placeholder="Número de autorização"
  value={authNumber}
  onChange={(e) => setAuthNumber(e.target.value)}
  style={{...}}
/>
```

**Modificar**: `AppointmentItemsTable.jsx`
```javascript
// Adicionar coluna de autorização (opcional, mas útil para visualizar)
// Mostrar badge: "✅ Autorizado" ou "⚠️ Pendente"
```

---

## ✅ CHECKLIST FASE 6-8

### Banco de Dados
- [ ] Criar arquivo migration SQL
- [ ] Adicionar coluna `plan_id` com FK
- [ ] Adicionar coluna `authorization_number`
- [ ] Adicionar coluna `professional_percentage`
- [ ] Adicionar coluna `professional_discount`
- [ ] Adicionar coluna `professional_repay_type`
- [ ] Adicionar coluna `medical_production_id`
- [ ] Criar índices para performance
- [ ] Criar função RPC `calculate_professional_repay`
- [ ] Criar função RPC `sync_plan_info_to_service`
- [ ] Aplicar migration via Supabase

### API Layer (appointmentsApi.js)
- [ ] Adicionar função `syncPlanInfoToService()`
- [ ] Adicionar função `updateProfessionalRepay()`
- [ ] Adicionar função `calculateProfessionalRepay()`
- [ ] Adicionar função `getServicePriceByPlan()`
- [ ] Adicionar função `updateAuthorizationNumber()`
- [ ] Modificar `getAppointmentServices()` para incluir novas colunas
- [ ] Modificar `syncAppointmentServices()` para preservar novas colunas

### UI Components
- [ ] Modificar `BillingTypeSelector.jsx` - adicionar campos de convênio
- [ ] Modificar `AppointmentItemsFooter.jsx` - adicionar indicador de repasse
- [ ] Adicionar nova seção em `AppointmentItemsManager.jsx` - Informações de Convênio

### Validação
- [ ] Build: npm run build
- [ ] Dev server: npm run dev
- [ ] Teste manual: Criar appointment com convênio
- [ ] Verificar dados em Supabase

---

## 🚀 PRÓXIMAS AÇÕES

1. **Próximo Imediato**: Criar migration SQL
2. **Depois**: Aplicar migration no banco
3. **Depois**: Atualizar appointmentsApi.js
4. **Depois**: Testar e validar
5. **Depois**: Continuar com FASE 9-11 (Integração Financeira)

---

## 📊 ARQUITETURA PÓS FASE 6-8

```
appointment_services (Tabela Central)
├─ Dados Básicos: id, appointment_id, service_id, value, discount
├─ FASE 6: plan_id, authorization_number, plan_name
├─ FASE 7: professional_percentage, professional_discount, professional_repay_type
├─ FASE 8: medical_production_id, sessions_completed, sessions_total, status
└─ Relacionamentos:
   ├─ appointments (FK)
   ├─ services (FK)
   ├─ plans (FK) ← NOVO
   ├─ medical_production (FK) ← NOVO
   └─ RLS: clinic_id + user_clinic_roles
```
