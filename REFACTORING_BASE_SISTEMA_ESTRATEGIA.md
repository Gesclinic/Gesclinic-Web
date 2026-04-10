# 🏗️ ESTRATÉGIA DE REFATORAÇÃO: BASE DO SISTEMA - GESCLINIC WEB

**Data:** 15 de janeiro de 2026  
**Status:** ⚙️ EM PLANEJAMENTO  
**Escopo:** Refatoração completa do módulo "Base do Sistema"

---

## 📊 ANÁLISE ATUAL DO PROJETO

### ✅ Estrutura Existente
- **Frontend:** React 18 + Vite 5 + TailwindCSS + Radix UI
- **Backend:** Supabase (PostgreSQL)
- **Padrão API:** Módulos em `src/lib/*Api.js` com queries diretas ao Supabase
- **Autenticação:** Context-based com `SupabaseAuthContext`
- **Roteamento:** `AppRoutes.jsx` (React Router v6)

### ✅ Tabelas já existentes
```
✓ services           (id, clinic_id, code, name, description, duration_minutes, price, active)
✓ professionals      (id, clinic_id, name, email, phone, specialization, license_number, active)
✓ professional_services (id, professional_id, service_id, clinic_id)
✓ service_prices     (id, service_id, payer_id, clinic_id, price)
✓ rooms              (id, clinic_id, name, type, unit, description, capacity, is_active)
✓ payers             (id, clinic_id, code, name, cnpj, contact_*, active)
✓ plans              (id, clinic_id, payer_id, name, code, description, active)
✓ appointments       (id, clinic_id, patient_id, professional_id, service_id, scheduled_date, scheduled_time, status)
```

### ❌ Tabelas faltando (requisitos obrigatórios)
```
✗ health_insurances  (convênios/seguros)
✗ resources          (equipamentos/insumos)
✗ room_resources     (alocação de recursos em salas)
✗ agenda_rules       (regras de agendamento)
✗ revenue_rules      (regras de repasse/receita)
```

### ⚠️ Problemas Identificados

1. **Inconsistência de Schema:**
   - `services.group_id` é referenciado em algumas telas mas pode não existir
   - `professional_services` existe mas não é usado completamente
   - Faltam tabelas críticas para regras de negócio

2. **Falta de Regras de Negócio:**
   - Sem tabelas dedicadas para agenda_rules (horários, durações, etc.)
   - Sem revenue_rules (repasse médico, comissões, etc.)
   - Sem vincular profissional-serviço-convênio com regras

3. **Dependência Física vs Lógica:**
   - Deletam registros fisicamente ao invés de inativar

4. **Falta de Menu Centralizado:**
   - Sem "Base do Sistema" estruturado
   - Cadastros espalhados em vários locais

---

## 🎯 PLANO DE REFATORAÇÃO (10 ETAPAS)

### **ETAPA 1: Preparar Schema SQL (Migrations)**
**Objetivo:** Garantir tabelas corretas e consistentes

```sql
-- 1.1 Criar/Garantir tabelas faltando
- health_insurances (convênios)
- resources (equipamentos)
- room_resources (alocação)
- agenda_rules (regras de agenda)
- revenue_rules (regras de repasse)

-- 1.2 Validar/Corrigir tabelas existentes
- services (remover group_id se não existe, adicionar unique index em code)
- professional_services (adicionar is_active, validar FK)
- service_prices (garantir structure correta)
- rooms (adicionar active/is_active consistente)

-- 1.3 Criar índices críticos
- Para todas as chaves estrangeiras
- Para active/is_active (filtros comuns)
- Para buscas por code e name
```

**Deliverable:** `supabase/migrations/20260115_base_sistema_schema.sql`

---

### **ETAPA 2: Implementar API Modules (Backend Layer)**
**Objetivo:** Criar camada consistente de acesso aos dados

**Arquivos a criar/refatorar:**
```
src/lib/baseSystemApi.js          (novo - orquestrador)
src/lib/servicesApi.js            (refatorado)
src/lib/professionalsApi.js        (refatorado)
src/lib/professionalServicesApi.js (novo)
src/lib/healthInsurancesApi.js     (novo)
src/lib/agendaRulesApi.js          (novo)
src/lib/revenueRulesApi.js         (novo)
src/lib/roomsApi.js                (refatorado)
src/lib/resourcesApi.js            (novo)
```

**Padrão de cada módulo:**
```javascript
// Exemplo: servicesApi.js
export async function listServices(clinicId, { includeInactive = false } = {}) {
  let query = supabase
    .from('services')
    .select('id, code, name, description, duration_minutes, price, active');

  if (!includeInactive) query = query.eq('active', true);
  query = query.eq('clinic_id', clinicId).order('name');

  const { data, error } = await query;
  if (error) throw new Error(`Falha ao listar serviços: ${error.message}`);
  return data ?? [];
}

export async function getService(serviceId, clinicId) {
  const { data, error } = await supabase
    .from('services')
    .select(`
      id, code, name, description, duration_minutes, price, active,
      professional_services(id, professional_id, professionals(name)),
      service_prices(id, payer_id, price, payers(name))
    `)
    .eq('id', serviceId)
    .eq('clinic_id', clinicId)
    .maybeSingle();
  
  if (error) throw error;
  return data;
}

export async function createService(clinicId, data) {
  const { data: service, error } = await supabase
    .from('services')
    .insert([{ clinic_id: clinicId, active: true, ...data }])
    .select()
    .maybeSingle();
  
  if (error) throw error;
  return service;
}

export async function deactivateService(serviceId, clinicId) {
  // NUNCA deletar, apenas inativar
  const { data, error } = await supabase
    .from('services')
    .update({ active: false, updated_at: new Date() })
    .eq('id', serviceId)
    .eq('clinic_id', clinicId)
    .select()
    .maybeSingle();
  
  if (error) throw error;
  return data;
}
```

**Deliverable:** 8+ módulos API refatorados/novos

---

### **ETAPA 3: Criar Menu "Base do Sistema"**
**Objetivo:** Estrutura centralizada para cadastros

**Estrutura Navegacional:**
```
/clinica/base-sistema/
├── cadastros-estruturais/
│   ├── servicos          (Services)
│   ├── profissionais      (Professionals)
│   ├── salas              (Rooms)
│   ├── recursos           (Resources)
│   ├── convênios          (Health Insurances)
│   └── grupos-servicos    (Service Groups)
├── regras-operacionais/
│   ├── agenda             (Agenda Rules)
│   ├── disponibilidade    (Professional Availability)
│   └── recursos-sala      (Room Resources)
└── parametros-financeiros/
    ├── tabelas-preco      (Service Prices)
    ├── regras-repasse     (Revenue Rules)
    └── profissional-payer (Professional-Payer)
```

**Arquivo:** `src/pages/clinica/base-sistema/BaseSystemLayout.jsx`

---

### **ETAPA 4: Criar Wizard de Configuração Inicial**
**Objetivo:** Guiar usuário na ordem correta, bloquear funcionalidades

**Tela:** `src/pages/clinica/base-sistema/SetupWizard.jsx`

**Lógica:**
```javascript
const setupSteps = [
  {
    id: 'professionals',
    title: 'Cadastre Profissionais',
    description: 'Médicos, terapeutas e outros profissionais',
    required: true,
    validation: () => countProfessionals() > 0,
    component: <SetupProfessionals />
  },
  {
    id: 'services',
    title: 'Configure Serviços',
    description: 'Procedimentos, consultas e serviços oferecidos',
    required: true,
    validation: () => countServices() > 0,
    dependsOn: ['professionals'],
    component: <SetupServices />
  },
  {
    id: 'professional-services',
    title: 'Vincule Profissionais aos Serviços',
    description: 'Defina qual profissional faz qual serviço',
    required: true,
    validation: () => countProfessionalServices() > 0,
    dependsOn: ['professionals', 'services'],
    component: <SetupProfessionalServices />
  },
  // ... mais passos
];
```

---

### **ETAPA 5: Refatorar Componentes Existentes**
**Objetivo:** Usar novo schema em telas já existentes

**Telas a refatorar:**
```
Agenda (AgendaUnificada, AgendaPorProfissional, AgendaSala)
  → Usar professional_services para validar
  → Usar agenda_rules para bloqueios
  → Usar rooms corretamente

Financeiro (Repasses, Faturamento)
  → Usar revenue_rules para cálculos
  → Usar service_prices para valores
  → Usar professional-payer vinculação

Atendimento (Check-in, Ficha do Paciente)
  → Validar serviço x profissional x sala
  → Aplicar regras de agenda
```

---

### **ETAPA 6: Implementar Validações e Regras de UX**
**Objetivo:** Garantir consistência e experiência do usuário

```javascript
// Exemplos de validações obrigatórias:

// 1. Um serviço não pode ser agendado sem pelo menos 1 profissional vinculado
function validateServiceHasProfessionals(serviceId, clinicId) {
  const count = await supabase
    .from('professional_services')
    .select('id', { count: 'exact' })
    .eq('service_id', serviceId)
    .eq('clinic_id', clinicId);
  
  if (count.count === 0) {
    throw new Error('Serviço sem profissionais vinculados. Configure em Base > Profissionais-Serviços');
  }
}

// 2. Profissional só pode atender serviço se foi configurado
function validateProfessionalCanServe(professionalId, serviceId, clinicId) {
  const { data } = await supabase
    .from('professional_services')
    .select('id')
    .eq('professional_id', professionalId)
    .eq('service_id', serviceId)
    .eq('clinic_id', clinicId)
    .maybeSingle();
  
  return !!data;
}

// 3. Agenda não pode ser criada sem regras definidas
function validateAgendaRuleExists(serviceId, clinicId) {
  const { data } = await supabase
    .from('agenda_rules')
    .select('id')
    .eq('service_id', serviceId)
    .eq('clinic_id', clinicId)
    .maybeSingle();
  
  if (!data) {
    throw new Error('Serviço sem regras de agendamento. Configure em Base > Regras Operacionais');
  }
}
```

---

### **ETAPA 7: Formulários com Abas e Selects Dinâmicos**
**Objetivo:** UX melhorada, validações antes de salvar

**Exemplo: FormServiço com abas**
```jsx
<Tabs defaultValue="basico">
  <TabsList>
    <TabsTrigger value="basico">Básico</TabsTrigger>
    <TabsTrigger value="profissionais">Profissionais</TabsTrigger>
    <TabsTrigger value="precos">Preços</TabsTrigger>
    <TabsTrigger value="agenda">Agenda</TabsTrigger>
  </TabsList>

  <TabsContent value="basico">
    <Input name="code" placeholder="Código (ex: CONS001)" />
    <Input name="name" placeholder="Nome" required />
    <Input name="duration_minutes" type="number" placeholder="Duração (minutos)" />
  </TabsContent>

  <TabsContent value="profissionais">
    {/* Multiselect de profissionais */}
    <ProfessionalMultiSelect 
      selected={form.professionalsIds}
      onChange={setProfessionalsIds}
      clinicId={clinicId}
    />
  </TabsContent>

  <TabsContent value="precos">
    {/* Tabela dinâmica de preço por convênio */}
    <ServicePricesTable serviceId={serviceId} />
  </TabsContent>

  <TabsContent value="agenda">
    {/* Regras de agendamento */}
    <AgendaRulesForm serviceId={serviceId} />
  </TabsContent>
</Tabs>
```

---

### **ETAPA 8: Implementar Alertas de Regras Incompletas**
**Objetivo:** Avisar quando configuração está incompleta

```javascript
// healthCheck.js - Validação de integridade
export async function validateBaseSystemSetup(clinicId) {
  const issues = [];

  // Check 1: Profissionais sem especialização
  const professionalsWithoutSpecialization = await supabase
    .from('professionals')
    .select('id, name')
    .eq('clinic_id', clinicId)
    .eq('active', true)
    .is('specialization', null);

  if (professionalsWithoutSpecialization.count > 0) {
    issues.push({
      level: 'warning',
      module: 'Profissionais',
      message: `${professionalsWithoutSpecialization.count} profissional(is) sem especialização`,
      action: 'Editar profissionais'
    });
  }

  // Check 2: Serviços sem profissionais vinculados
  const servicesWithoutProfessionals = await supabase
    .from('services')
    .select('id, name')
    .eq('clinic_id', clinicId)
    .eq('active', true)
    .not('professional_services', 'is', null);
  
  if (servicesWithoutProfessionals.count > 0) {
    issues.push({
      level: 'error',
      module: 'Serviços',
      message: `${servicesWithoutProfessionals.count} serviço(s) sem profissionais`,
      action: 'Vincular profissionais'
    });
  }

  // ... mais validações

  return issues;
}
```

---

### **ETAPA 9: Garantir Consistência Entre Módulos**
**Objetivo:** Agenda, Check-in e Financeiro usam as mesmas regras

**Pontos de integração:**

1. **Agenda + Professional Services**
   - Validar que profissional pode atender serviço
   - Usar agenda_rules para bloqueios de horário

2. **Agenda + Service Prices**
   - Recuperar valor do serviço baseado no convênio

3. **Agenda + Revenue Rules**
   - Calcular repasse imediatamente quando agendado

4. **Check-in + Appointments**
   - Buscar agenda via professional_services
   - Validar sala via room_resources

---

### **ETAPA 10: Testes e Documentação**
**Objetivo:** Validar tudo funciona, documentar uso

**Testes:**
- ✅ Schema validation (todas as tabelas existem)
- ✅ API modules (CRUD completo com validações)
- ✅ Menu navegação (todas as rotas funcionam)
- ✅ Wizard (bloqueios corretos)
- ✅ Integração Agenda + Profissionais
- ✅ Integração Financeiro + Preços

**Documentação:**
- [x] Schema SQL comentado
- [x] Guia de API modules
- [x] Guia de uso do Wizard
- [x] Validações e regras de negócio
- [x] Troubleshooting

---

## 📦 DELIVERABLES POR ETAPA

| Etapa | Archivos | Status | Peso |
|-------|---------|--------|------|
| 1     | Migration SQL | ⏳ TODO | 10% |
| 2     | 8+ API modules | ⏳ TODO | 20% |
| 3     | Menu + Layout | ⏳ TODO | 10% |
| 4     | Wizard JSX | ⏳ TODO | 15% |
| 5     | Refactor Telas | ⏳ TODO | 20% |
| 6     | Validações | ⏳ TODO | 10% |
| 7     | Formulários | ⏳ TODO | 10% |
| 8     | Health Check | ⏳ TODO | 5% |
| 9     | Integração | ⏳ TODO | 10% |
| 10    | Testes | ⏳ TODO | 10% |

---

## 🚀 PRÓXIMOS PASSOS

1. ✅ **Agora:** Implementar ETAPA 1 (Schema SQL)
2. ⏭️ **Próximo:** ETAPA 2 (API modules)
3. ⏭️ **Depois:** ETAPA 3 (Menu)
4. ⏭️ **Final:** ETAPAS 4-10 (UI + Validações)

---

## 📝 NOTAS CRÍTICAS

- **Nada é deletado fisicamente** - sempre use `active = false`
- **Sempre validar FK antes de salvar** - evitar orphans
- **Usar clinicId em TODAS as queries** - segurança multi-clínica
- **Schema é FONTE ÚNICA DA VERDADE** - frontend deve refletir exatamente
- **Sem migrações quebrando existentes** - usar `IF NOT EXISTS`

---

**Status:** ✅ PRONTO PARA IMPLEMENTAÇÃO  
**Próxima ação:** Criar migration SQL para ETAPA 1
