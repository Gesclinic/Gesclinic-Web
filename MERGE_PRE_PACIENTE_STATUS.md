# 🔄 MERGE PRÉ-PACIENTE → PACIENTE - STATUS DA IMPLEMENTAÇÃO

## ✅ O QUE JÁ FOI FEITO

### 1️⃣ MODELO DE DADOS (COMPLETO)
- ✅ Coluna `patient_type` (TEXT) criada na tabela `appointments`
- ✅ Coluna `lead_name` (TEXT) criada na tabela `appointments`
- ✅ Coluna `lead_phone` (TEXT) criada na tabela `appointments`
- ✅ Coluna `lead_mobile` (TEXT) criada na tabela `appointments`
- ✅ Coluna `payer_id` (TEXT) criada na tabela `appointments`
- ✅ `patient_id` tornou-se NULLABLE
- ✅ API `createAppointment()` salva todos esses campos

### 2️⃣ AGENDAMENTO RÁPIDO (COMPLETO)
- ✅ Modal "Novo Agendamento" com abas
- ✅ Aba "Paciente" com 2 modos:
  - "📞 Agendamento Rápido" (pré-paciente)
  - "Paciente Cadastrado" (paciente normal)
- ✅ Campos pré-paciente:
  - Nome do Paciente * (obrigatório)
  - Celular * (obrigatório)
  - Telefone (opcional)
- ✅ Formatação de telefone automática (XX) 9 XXXX-XXXX
- ✅ Validação frontend: obriga Data, Hora, Prof, Sala, Serviço, Convênio, Nome, Celular
- ✅ Salva com `patient_type = "PRE_PATIENT"`

### 3️⃣ DETECÇÃO DE PRÉ-PACIENTE NO CHECK-IN (PARCIAL)
- ✅ CheckinDrawer detecta `patient_type === "PRE_PATIENT"`
- ✅ Mostra alerta bloqueando liberação
- ✅ Mensagem clara: "Cadastro Incompleto"
- ✅ Status na aba Ações: "📞 Pré-cadastro"
- ❌ Banner de "Cadastro incompleto" não está visualmente destacado (apenas no alerta)

### 4️⃣ BLOQUEIOS (PARCIAL)
- ✅ Impede liberação se `patient_type === "PRE_PATIENT"`
- ✅ Mostra mensagem de erro
- ❌ Não impede que profissional veja (não há validação na view de atendimento)
- ❌ Não há bloqueio para gerar prontuário

---

## ❌ O QUE AINDA FALTA IMPLEMENTAR

### 1️⃣ MODAL DE MERGE (CRÍTICO)
**Necessário criar: `MergePatientModal.jsx`**

Deve ter 3 etapas:
```
[ 1. Buscar existente ] → [ 2. Criar novo ] → [ 3. Confirmar vínculo ]
```

#### Etapa 1: BUSCAR PACIENTE EXISTENTE
```javascript
// Campos de busca:
- CPF
- Nome
- Telefone (usar lead_phone/lead_mobile)

// Exibir resultados:
- Nome
- CPF (mascarado: XXX.XXX.***-**)
- Data nascimento
- Botão: [ Vincular este paciente ]
```

#### Etapa 2: CRIAR NOVO PACIENTE
```javascript
// Formulário:
- Nome completo * (obrigatório)
- CPF * (obrigatório)
- Data de nascimento * (obrigatório)
- Telefone * (obrigatório)
- Sexo (opcional)

// Botão:
[ Criar paciente ]
```

#### Etapa 3: CONFIRMAR MERGE
```javascript
// Resumo exibido:
Pré-paciente: João (Tel: 99999-0000)
         ↓
Será vinculado a: João Silva · CPF ***.***.***.****

// Confirmação:
☑ Confirmo que os dados estão corretos

// Botão final:
[ Confirmar vínculo ]
```

### 2️⃣ BOTÃO "FINALIZAR CADASTRO" (CRÍTICO)
**Implementar em CheckinDrawer:**
- ✅ Visível somente se: `appointment.patient_type === "PRE_PATIENT"`
- ❌ Texto: "🧾 Finalizar cadastro do paciente"
- ❌ Abre o `MergePatientModal`
- ❌ Colocar em destaque (cor vermelha/alerta)

### 3️⃣ BACKEND: MERGE LOGIC (CRÍTICO)
**Implementar endpoints / API functions:**

```javascript
// src/lib/patientsApi.js - Função nova
export async function mergePrepaticentToPatient(appointmentId, { 
  patientId, 
  createNew = false, 
  newPatientData = null 
}) {
  // Se vinculando paciente existente:
  if (!createNew && patientId) {
    await updateAppointment(appointmentId, {
      patient_id: patientId,
      patient_type: "PATIENT",
      lead_name: null,
      lead_phone: null,
      lead_mobile: null,
      merged_at: new Date().toISOString(),
      merged_by: currentUserId,
    });
  }
  
  // Se criando novo paciente:
  if (createNew && newPatientData) {
    const newPatient = await createPatient(newPatientData);
    await updateAppointment(appointmentId, {
      patient_id: newPatient.id,
      patient_type: "PATIENT",
      lead_name: null,
      lead_phone: null,
      lead_mobile: null,
      merged_at: new Date().toISOString(),
      merged_by: currentUserId,
    });
  }
}
```

### 4️⃣ CAMPOS DE AUDITORIA (IMPORTANTE)
**Adicionar ao banco via SQL:**
```sql
ALTER TABLE appointments
ADD COLUMN merged_at TIMESTAMP,
ADD COLUMN merged_by UUID REFERENCES auth.users(id),
ADD COLUMN previous_patient_type TEXT;
```

### 5️⃣ BLOQUEIOS ADICIONAIS (IMPORTANTE)
**Implementar validações globais:**

1. **Na tela de atendimento (profissional)**
```javascript
if (appointment.patient_type === 'PRE_PATIENT') {
  return <ErrorPage message="Paciente não foi cadastrado ainda" />;
}
```

2. **Na geração de prontuário**
```javascript
if (appointment.patient_type === 'PRE_PATIENT') {
  throw new Error('Não é possível gerar prontuário sem paciente cadastrado');
}
```

3. **No dashboard financeiro**
```javascript
// Aparecer como "Pendente de Cadastro"
```

### 6️⃣ FLUXO VISUAL COMPLETO (UI/UX)
**CheckinDrawer improvements:**

- ⚠️ Banner destacado (vermelho/laranja) no topo:
  ```
  ⚠ CADASTRO INCOMPLETO
  Este paciente foi agendado por telefone.
  Finalize o cadastro clicando abaixo.
  ```

- Botão "🧾 Finalizar cadastro" em destaque (vermelho)
  
- Após sucesso do merge:
  - Banner muda para verde: "✅ Cadastro concluído"
  - Botão "Liberar para Atendimento" volta a ficar ativo
  - Reload automático dos dados

### 7️⃣ VALIDAÇÕES NA BUSCA DE PACIENTE (UX)
**Sugestões melhoradas:**

```javascript
// Sugerir pacientes por:
1. CPF exato
2. Nome similar (nome do agendamento vs pacientes)
3. Telefone exato (lead_phone ou lead_mobile)

// Evitar duplicidade:
if (existePacienteSimilar) {
  mostrar: "⚠️ Já existe paciente com dados similares"
  permissão: Usuário escolhe se continua ou vincula existente
}
```

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

### Fase 1: INTERFACE (1-2 horas)
- [ ] Criar `MergePatientModal.jsx` com 3 etapas
- [ ] Adicionar botão em CheckinDrawer (visível para pré-paciente)
- [ ] Estilizar banner de alerta
- [ ] Testar responsividade (mobile/desktop)

### Fase 2: BACKEND (1-2 horas)
- [ ] Criar função `mergePrepaticentToPatient()` em patientsApi.js
- [ ] Implementar busca de paciente por CPF/Nome/Telefone
- [ ] Implementar criação de novo paciente
- [ ] Adicionar campos de auditoria no banco

### Fase 3: VALIDAÇÕES (1 hora)
- [ ] Bloquear atendimento se `patient_type === "PRE_PATIENT"`
- [ ] Bloquear prontuário se pré-paciente
- [ ] Validar duplicidade na busca
- [ ] Mensagens de erro claras

### Fase 4: TESTES (1-2 horas)
- [ ] E2E: Agendamento rápido → Merge → Atendimento
- [ ] Validar integridade de dados
- [ ] Testar auditoria
- [ ] Testar bloqueios em todas as telas

---

## 🎯 PRIORIDADE

**CRÍTICO (bloqueador):**
1. Modal de Merge (etapas 1-3)
2. Botão "Finalizar cadastro"
3. Merge logic backend
4. Bloqueio de atendimento

**IMPORTANTE:**
5. Campos de auditoria
6. Validações globais
7. Bloqueios adicionais (prontuário, dashboard)

**NICE-TO-HAVE:**
8. Validações de duplicidade avançadas
9. Sugestões inteligentes na busca
10. Dashboard mostrando pré-pacientes pendentes

---

## 🔗 ARQUIVOS ENVOLVIDOS

**Já criados/modificados:**
- ✅ `src/lib/appointmentsApi.js` (createAppointment)
- ✅ `src/pages/clinica/agenda/components/AppointmentModal.jsx`
- ✅ `src/pages/clinica/agenda/AgendaPage.jsx`
- ✅ `src/pages/clinica/agenda/components/CheckinDrawer.jsx`

**Precisam ser criados:**
- ❌ `src/components/MergePatientModal.jsx` (NOVO)
- ❌ `src/lib/patientsApi.js` - função `mergePrepaticentToPatient()`

**Precisam ser modificados:**
- ⚠️ `src/pages/clinica/agenda/components/CheckinDrawer.jsx` (adicionar botão)
- ⚠️ `src/pages/clinica/agenda/views/components/CheckinAcoes.jsx` (bloqueios)
- ⚠️ Telas de atendimento/profissional (validação de pré-paciente)

