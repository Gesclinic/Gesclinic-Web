# 🚀 ROADMAP IMPLEMENTAÇÃO - PRÓXIMOS 2-3 DIAS

**Data:** 18 de janeiro de 2026  
**Objetivo:** Estrutura pronta para Agenda + Faturamento + TISS  
**Sequência:** Exatamente nesta ordem

---

## 📅 FASE 1: BANCO DE DADOS (2 horas)

### 1.1 - Verificar Campos Existentes

**Local:** Supabase Console → SQL Editor

```sql
-- Executar para cada tabela:

-- SERVICES
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'services'
ORDER BY ordinal_position;

-- PROFESSIONALS
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'professionals'
ORDER BY ordinal_position;

-- HEALTH_INSURANCES
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'health_insurances'
ORDER BY ordinal_position;
```

**Resultado esperado:**
- Se retorna `tuss_code`, `cbo_code`, etc → ✅ Campo existe
- Se não aparece → ❌ Precisa criar

### 1.2 - Criar Migration SQL

**Arquivo:** `supabase/migrations/20260118_add_tiss_mandatory_fields.sql`

```sql
-- ============================================================
-- Migration: Adicionar Campos Obrigatórios para TISS XML
-- Data: 18 de janeiro de 2026
-- ============================================================

-- 1. SERVICES - Adicionar campos TISS
ALTER TABLE IF EXISTS services
ADD COLUMN IF NOT EXISTS tuss_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS type_service VARCHAR(50),
ADD COLUMN IF NOT EXISTS guide_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS unit_measure VARCHAR(20),
ADD COLUMN IF NOT EXISTS cost_value DECIMAL(12,2);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_services_tuss_code 
ON services(clinic_id, tuss_code) 
WHERE active = TRUE;

-- 2. PROFESSIONALS - Adicionar campos TISS
ALTER TABLE IF EXISTS professionals
ADD COLUMN IF NOT EXISTS cbo_code VARCHAR(6),
ADD COLUMN IF NOT EXISTS cns_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS council_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS council_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS council_state VARCHAR(2);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_professionals_cbo_code 
ON professionals(clinic_id, cbo_code);

-- 3. HEALTH_INSURANCES - Adicionar campos TISS
ALTER TABLE IF EXISTS health_insurances
ADD COLUMN IF NOT EXISTS registration_ans VARCHAR(20),
ADD COLUMN IF NOT EXISTS tiss_pattern BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS guide_format VARCHAR(50);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_health_insurances_ans 
ON health_insurances(clinic_id, registration_ans);

-- 4. PROFESSIONAL_PAYERS - Validar credential_number
-- Se não tiver a coluna:
ALTER TABLE IF EXISTS professional_payers
ADD COLUMN IF NOT EXISTS credential_number VARCHAR(50);

-- ============================================================
-- FIM DA MIGRATION
-- ============================================================
```

**Como executar:**
1. Copiar todo o código acima
2. Ir em Supabase → SQL Editor
3. Colar e executar (⌘Enter ou Ctrl+Enter)
4. Verificar se não há erros

---

## 📝 FASE 2: ATUALIZAR APIS (2 horas)

### 2.1 - servicesApi.js

**Arquivo:** `src/lib/servicesApi.js`

Adicionar após a função `createService`:

```javascript
// ============================================================
// VALIDAÇÃO TISS PARA SERVIÇOS
// ============================================================

/**
 * Valida se serviço tem campos obrigatórios para TISS
 * @param {Object} serviceData
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateServiceForTISS(serviceData) {
  const errors = [];
  
  // TUSS Code (obrigatório)
  if (!serviceData.tuss_code) {
    errors.push("TUSS Code é obrigatório");
  } else if (serviceData.tuss_code.length !== 10) {
    errors.push("TUSS Code deve ter exatamente 10 dígitos");
  } else if (!/^\d{10}$/.test(serviceData.tuss_code)) {
    errors.push("TUSS Code deve conter apenas números");
  }
  
  // Type Service (obrigatório)
  if (!serviceData.type_service) {
    errors.push("Tipo de Serviço é obrigatório");
  }
  
  // Guide Type (recomendado)
  if (!serviceData.guide_type) {
    console.warn("⚠️ Guide Type não definido");
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Atualizar serviço com validação TISS
 * @param {string} serviceId
 * @param {Object} serviceData
 * @returns {Promise<Object>}
 */
export async function updateServiceWithValidation(serviceId, serviceData) {
  // Validar se vai ativar sem campos obrigatórios
  if (serviceData.active && !serviceData.tuss_code) {
    throw new Error("Não é possível ativar serviço sem TUSS Code");
  }
  
  const validation = validateServiceForTISS(serviceData);
  if (!validation.valid) {
    console.warn("⚠️ Avisos TISS:", validation.errors);
    // Continua mesmo com avisos, mas registra
  }
  
  return updateService(serviceId, serviceData);
}
```

### 2.2 - professionalsApi.js

**Arquivo:** `src/lib/professionalsApi.js`

Adicionar após `createProfessional`:

```javascript
// ============================================================
// VALIDAÇÃO TISS PARA PROFISSIONAIS
// ============================================================

/**
 * Valida se profissional tem campos obrigatórios para TISS
 * @param {Object} profData
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateProfessionalForTISS(profData) {
  const errors = [];
  
  // CBO Code (obrigatório)
  if (!profData.cbo_code) {
    errors.push("CBO Code é obrigatório (ex: 225101)");
  } else if (!/^\d{6}$/.test(profData.cbo_code)) {
    errors.push("CBO Code deve ter 6 dígitos");
  }
  
  // Council (obrigatório)
  if (!profData.council_type) {
    errors.push("Tipo de Conselho é obrigatório (CRM/CREFITO/CRP)");
  }
  if (!profData.council_number) {
    errors.push("Número do Conselho é obrigatório");
  }
  if (!profData.council_state || profData.council_state.length !== 2) {
    errors.push("UF do Conselho é obrigatória (ex: SP)");
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Atualizar profissional com validação TISS
 * @param {string} professionalId
 * @param {Object} profData
 * @returns {Promise<Object>}
 */
export async function updateProfessionalWithValidation(professionalId, profData) {
  // Validar se vai ativar sem campos obrigatórios
  if (profData.active && !profData.cbo_code) {
    throw new Error("Não é possível ativar profissional sem CBO Code e dados de conselho");
  }
  
  const validation = validateProfessionalForTISS(profData);
  if (!validation.valid) {
    console.warn("⚠️ Avisos TISS:", validation.errors);
  }
  
  return updateProfessional(professionalId, profData);
}
```

### 2.3 - healthInsurancesApi.js

**Arquivo:** `src/lib/healthInsurancesApi.js`

Adicionar após `createHealthInsurance`:

```javascript
// ============================================================
// VALIDAÇÃO TISS PARA CONVÊNIOS
// ============================================================

/**
 * Valida se convênio tem campos obrigatórios para TISS
 * @param {Object} insuranceData
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateInsuranceForTISS(insuranceData) {
  const errors = [];
  
  // ANS (obrigatório para privados)
  if (insuranceData.type !== 'government' && !insuranceData.registration_ans) {
    errors.push("ANS Registration é obrigatório para seguros privados");
  }
  
  // TISS Pattern (recomendado)
  if (insuranceData.tiss_pattern !== true) {
    console.warn("⚠️ TISS Pattern não ativado - pode causar rejeição");
  }
  
  // Guide Format
  if (!insuranceData.guide_format) {
    console.warn("⚠️ Guide Format não definido");
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Atualizar convênio com validação TISS
 * @param {string} insuranceId
 * @param {Object} insuranceData
 * @returns {Promise<Object>}
 */
export async function updateInsuranceWithValidation(insuranceId, insuranceData) {
  const validation = validateInsuranceForTISS(insuranceData);
  if (!validation.valid) {
    throw new Error(`Erros TISS: ${validation.errors.join(", ")}`);
  }
  
  return updateHealthInsurance(insuranceId, insuranceData);
}
```

---

## 🎨 FASE 3: ATUALIZAR FORMS (2-3 horas)

### 3.1 - ServicesPage.jsx

**Arquivo:** `src/pages/clinica/base-sistema/ServicesPage.jsx`

Adicionar campos no form:

```jsx
// No JSX do formulário, adicionar:

<div className="space-y-4">
  
  {/* ===== NOVA SEÇÃO: TISS ===== */}
  <div className="bg-blue-50 p-4 rounded border-l-4 border-blue-500">
    <h3 className="font-semibold text-blue-900 mb-3">⚕️ Informações TISS</h3>
    
    <div className="grid grid-cols-2 gap-4">
      {/* TUSS Code */}
      <div>
        <Label>TUSS Code * <span className="text-red-600">(obrigatório)</span></Label>
        <Input
          placeholder="0101010100"
          value={formData.tuss_code || ''}
          onChange={(e) => setFormData({...formData, tuss_code: e.target.value})}
          maxLength="10"
          pattern="[0-9]{10}"
          required
          title="Digite 10 dígitos numéricos"
        />
        <small className="text-gray-500">
          Código TUSS de 10 dígitos. Obrigatório para faturamento.
        </small>
      </div>
      
      {/* Type Service */}
      <div>
        <Label>Tipo de Serviço * <span className="text-red-600">(obrigatório)</span></Label>
        <Select 
          value={formData.type_service || ''} 
          onValueChange={(val) => setFormData({...formData, type_service: val})}
        >
          <SelectTrigger required>
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Consulta">Consulta</SelectItem>
            <SelectItem value="Exame">Exame</SelectItem>
            <SelectItem value="Procedimento">Procedimento</SelectItem>
            <SelectItem value="Terapia">Terapia</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
    
    <div className="grid grid-cols-2 gap-4 mt-4">
      {/* Guide Type */}
      <div>
        <Label>Tipo de Guia</Label>
        <Select 
          value={formData.guide_type || ''} 
          onValueChange={(val) => setFormData({...formData, guide_type: val})}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Consulta">Consulta</SelectItem>
            <SelectItem value="SADT">SADT</SelectItem>
            <SelectItem value="Internação">Internação</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Unit Measure */}
      <div>
        <Label>Unidade de Medida</Label>
        <Select 
          value={formData.unit_measure || ''} 
          onValueChange={(val) => setFormData({...formData, unit_measure: val})}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sessão">Sessão</SelectItem>
            <SelectItem value="unidade">Unidade</SelectItem>
            <SelectItem value="minuto">Minuto</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
    
    {/* Cost Value */}
    <div className="mt-4">
      <Label>Custo Interno (para margem)</Label>
      <Input
        type="number"
        step="0.01"
        placeholder="0.00"
        value={formData.cost_value || ''}
        onChange={(e) => setFormData({...formData, cost_value: parseFloat(e.target.value) || 0})}
      />
      <small className="text-gray-500">
        Custo interno para cálculo de margem. Deixe 0 se não aplicável.
      </small>
    </div>
  </div>
  
  {/* Validação visual */}
  {formData.active && !formData.tuss_code && (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>⚠️ Aviso</AlertTitle>
      <AlertDescription>
        Este serviço está ativo mas falta TUSS Code. Isso causará GLOSA no faturamento.
      </AlertDescription>
    </Alert>
  )}
  
</div>
```

### 3.2 - ProfessionalsPage.jsx

**Arquivo:** `src/pages/clinica/base-sistema/ProfessionalsPage.jsx`

Adicionar campos:

```jsx
<div className="space-y-4">
  
  {/* ===== NOVA SEÇÃO: CONSELHO PROFISSIONAL ===== */}
  <div className="bg-purple-50 p-4 rounded border-l-4 border-purple-500">
    <h3 className="font-semibold text-purple-900 mb-3">🏛️ Conselho Profissional</h3>
    
    <div className="grid grid-cols-3 gap-4">
      {/* Council Type */}
      <div>
        <Label>Tipo de Conselho * <span className="text-red-600">(obrigatório)</span></Label>
        <Select 
          value={formData.council_type || ''} 
          onValueChange={(val) => setFormData({...formData, council_type: val})}
        >
          <SelectTrigger required>
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="CRM">CRM (Médico)</SelectItem>
            <SelectItem value="CREFITO">CREFITO (Fisio)</SelectItem>
            <SelectItem value="CRP">CRP (Psicólogo)</SelectItem>
            <SelectItem value="CORE">CORE (Enfermeira)</SelectItem>
            <SelectItem value="CROSP">CROSP (Odonto)</SelectItem>
            <SelectItem value="CREFONO">CREFONO (Fonoaudiólogo)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Council Number */}
      <div>
        <Label>Número do Conselho * <span className="text-red-600">(obrigatório)</span></Label>
        <Input
          placeholder="123456"
          value={formData.council_number || ''}
          onChange={(e) => setFormData({...formData, council_number: e.target.value})}
          required
        />
      </div>
      
      {/* Council State */}
      <div>
        <Label>UF do Conselho * <span className="text-red-600">(obrigatório)</span></Label>
        <Input
          placeholder="SP"
          value={formData.council_state || ''}
          onChange={(e) => setFormData({...formData, council_state: e.target.value.toUpperCase()})}
          maxLength="2"
          required
        />
      </div>
    </div>
  </div>
  
  {/* ===== NOVA SEÇÃO: CBO ===== */}
  <div className="bg-green-50 p-4 rounded border-l-4 border-green-500">
    <h3 className="font-semibold text-green-900 mb-3">📊 CBO (Ocupação)</h3>
    
    <div>
      <Label>CBO Code * <span className="text-red-600">(obrigatório)</span></Label>
      <Input
        placeholder="225101"
        value={formData.cbo_code || ''}
        onChange={(e) => setFormData({...formData, cbo_code: e.target.value})}
        maxLength="6"
        pattern="[0-9]{6}"
        required
        title="Digite 6 dígitos numéricos"
      />
      <small className="text-gray-500">
        Classificação Brasileira de Ocupações (6 dígitos). Exemplos:
        <br/>• 225101 = Médico Clínico Geral
        <br/>• 223101 = Fisioterapeuta
      </small>
    </div>
  </div>
  
  {/* Validação visual */}
  {formData.active && (!formData.cbo_code || !formData.council_type) && (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>⚠️ Aviso</AlertTitle>
      <AlertDescription>
        Este profissional está ativo mas falta CBO ou dados de conselho. Isso causará GLOSA no TISS XML.
      </AlertDescription>
    </Alert>
  )}
  
</div>
```

### 3.3 - ConveniosPage.jsx

**Arquivo:** `src/pages/clinica/base-sistema/ConveniosPage.jsx`

Adicionar campos:

```jsx
<div className="space-y-4">
  
  {/* ===== NOVA SEÇÃO: TISS ===== */}
  <div className="bg-orange-50 p-4 rounded border-l-4 border-orange-500">
    <h3 className="font-semibold text-orange-900 mb-3">📄 Padrão TISS</h3>
    
    <div className="grid grid-cols-2 gap-4">
      {/* ANS */}
      <div>
        <Label>ANS Registration <span className="text-red-600">(se privado)</span></Label>
        <Input
          placeholder="342856"
          value={formData.registration_ans || ''}
          onChange={(e) => setFormData({...formData, registration_ans: e.target.value})}
          pattern="[0-9]{0,20}"
          title="Apenas números"
        />
        <small className="text-gray-500">
          Código ANS de registro da operadora. Obrigatório para seguros privados.
        </small>
      </div>
      
      {/* Guide Format */}
      <div>
        <Label>Formato de Guia</Label>
        <Select 
          value={formData.guide_format || ''} 
          onValueChange={(val) => setFormData({...formData, guide_format: val})}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Consulta">Consulta</SelectItem>
            <SelectItem value="SADT">SADT</SelectItem>
            <SelectItem value="Internação">Internação</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
    
    {/* TISS Pattern */}
    <div className="mt-4 flex items-center space-x-2">
      <Checkbox 
        checked={formData.tiss_pattern !== false}
        onCheckedChange={(val) => setFormData({...formData, tiss_pattern: val})}
      />
      <Label>Segue padrão TISS</Label>
      <small className="text-gray-500">Ativar se este convênio segue o padrão TISS</small>
    </div>
  </div>
  
</div>
```

---

## ✅ FASE 4: VALIDAÇÃO E TESTES (1-2 horas)

### 4.1 - Teste em Desenvolvimento

```bash
# Terminal VS Code:

# 1. Iniciar servidor
npm run dev

# 2. Entrar em: http://localhost:3000

# 3. Navegar para Base do Sistema
# Ir em: /clinica/base-sistema/servicos
# Ir em: /clinica/base-sistema/profissionais
# Ir em: /clinica/base-sistema/convenios

# 4. Tentar criar registro SEM campos TISS
# Deve mostrar erro ou aviso

# 5. Tentar criar registro COM campos TISS
# Deve salvar com sucesso
```

### 4.2 - Teste de Banco de Dados

```sql
-- Executar no Supabase Console:

-- Verificar dados criados com TISS
SELECT id, name, tuss_code, type_service, cost_value
FROM services
WHERE clinic_id = 'SEU_CLINIC_ID'
LIMIT 5;

-- Verificar profissionais com CBO
SELECT id, name, cbo_code, council_type, council_number
FROM professionals
WHERE clinic_id = 'SEU_CLINIC_ID'
LIMIT 5;

-- Verificar convênios com ANS
SELECT id, name, registration_ans, tiss_pattern
FROM health_insurances
WHERE clinic_id = 'SEU_CLINIC_ID'
LIMIT 5;
```

---

## 🎯 CHECKLIST FINAL (Antes de ir para Agenda)

- [ ] Todos os campos TISS existem no BD (migration executada)
- [ ] APIs têm validações (servicesApi, professionalsApi, healthInsurancesApi)
- [ ] Forms mostram campos obrigatórios (com asterisco *)
- [ ] Validação visual com avisos (Alert quando falta TISS)
- [ ] Teste manual: criar registro com TISS
- [ ] Teste manual: tentar criar sem TISS (deve avisar ou bloquear)
- [ ] Dados de teste preenchidos (pelo menos 1 serviço, 1 prof, 1 convênio com campos TISS)

---

## 📊 PRÓXIMO PASSO

Após completar FASE 1-4, integrar com:

1. **AgendaPage.jsx**
   - Validar professional_services
   - Usar duração do vínculo

2. **GuiasConsulta.jsx**
   - Validar TUSS, CBO, ANS
   - Validar credential_number
   - Gerar XML com dados corretos

3. **RepasseMedicoPage.jsx**
   - Buscar revenue_rules
   - Calcular automáticamente

---

**Tempo total estimado:** 2-3 dias  
**Complexidade:** Média (muitos campos, mas lógica simples)  
**Risco:** Baixo (não afeta fluxos existentes, apenas adiciona validação)

---

**Comece por FASE 1 (BD) → FASE 2 (APIs) → FASE 3 (Forms) → FASE 4 (Testes)**
