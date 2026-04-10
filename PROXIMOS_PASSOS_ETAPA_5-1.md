# 🎯 PRÓXIMOS PASSOS - ETAPA 5.1

## ETAPA 5.1: Integração Agenda

**Status:** Pronto para começar  
**Tempo Estimado:** 1-2 horas  
**Localização:** `src/pages/clinica/agenda/AgendaPage.jsx`  
**API a Integrar:** `agendaIntegrationApi.js`  

---

## 📋 Checklist

### Passo 1: Adicionar Import
**Arquivo:** `src/pages/clinica/agenda/AgendaPage.jsx`

```javascript
// Adicionar no topo do arquivo, após outros imports
import { 
  validateAppointmentScheduling, 
  calculateAppointmentData,
  listProfessionalsForService 
} from "@/lib/agendaIntegrationApi";
```

---

### Passo 2: Atualizar Função de Criar Agendamento

**Antes:**
```javascript
const handleAddAppointment = async (formData) => {
  // Validação básica
  if (!formData.professional || !formData.service) {
    showError("Profissional e serviço são obrigatórios");
    return;
  }

  // Criar agendamento diretamente
  const appointment = await appointmentsApi.createAppointment({
    clinic_id: clinicId,
    professional_id: formData.professional,
    service_id: formData.service,
    // ...
  });
};
```

**Depois:**
```javascript
const handleAddAppointment = async (formData) => {
  try {
    // 1. Validar agendamento completo
    const validation = await validateAppointmentScheduling({
      clinicId,
      serviceId: formData.service,
      professionalId: formData.professional,
      roomId: formData.room,
      startTime: formData.startTime,
      date: formData.date,
      patientId: formData.patient,
    });

    // 2. Se houver erros, mostrar e retornar
    if (!validation.valid) {
      showErrorToast(validation.errors.join("\n"));
      return;
    }

    // 3. Se houver warnings, mostrar ao usuário
    if (validation.warnings.length > 0) {
      const proceed = await showWarningDialog({
        title: "Avisos ao agendar",
        warnings: validation.warnings,
      });
      if (!proceed) return;
    }

    // 4. Calcular dados adicionais
    const appointmentData = await calculateAppointmentData({
      clinicId,
      serviceId: formData.service,
      professionalId: formData.professional,
      startTime: formData.startTime,
      date: formData.date,
    });

    // 5. Criar agendamento com dados validados e calculados
    const appointment = await appointmentsApi.createAppointment({
      clinic_id: clinicId,
      professional_id: formData.professional,
      service_id: formData.service,
      room_id: formData.room,
      patient_id: formData.patient,
      date: formData.date,
      start_time: formData.startTime,
      end_time: appointmentData.endTime, // ← Usa valor calculado
      duration: appointmentData.duration,
      appointment_status: "scheduled",
      agenda_rule_id: validation.rule?.id, // ← Usa regra validada
    });

    showSuccessToast("Agendamento criado com sucesso!");
    refreshAppointmentList();

  } catch (error) {
    console.error("Erro ao agendar:", error);
    showErrorToast("Erro ao criar agendamento");
  }
};
```

---

### Passo 3: Atualizar Seletor de Profissional

**Objetivo:** Filtrar profissionais por serviço selecionado

**Antes:**
```javascript
<Select 
  label="Profissional"
  options={professionals} // Todos os profissionais
  value={formData.professional}
  onChange={(value) => setFormData({...formData, professional: value})}
/>
```

**Depois:**
```javascript
const [availableProfessionals, setAvailableProfessionals] = useState([]);

const handleServiceChange = async (serviceId) => {
  setFormData({...formData, service: serviceId, professional: null});
  
  // Buscar profissionais que podem servir este serviço
  const professionals = await listProfessionalsForService(clinicId, serviceId);
  setAvailableProfessionals(professionals);
};

// Componente
<Select 
  label="Profissional"
  options={availableProfessionals.map(p => ({ id: p.id, label: p.name }))}
  value={formData.professional}
  onChange={handleServiceChange}
  disabled={!formData.service}
  placeholder="Selecione um serviço primeiro"
/>
```

---

### Passo 4: Adicionar Validação em Tempo Real

**Objetivo:** Validar conforme usuário preenche o formulário

```javascript
const [validationState, setValidationState] = useState(null);

const validateFormData = async () => {
  if (!formData.service || !formData.professional || !formData.date || !formData.startTime) {
    return; // Incompleto
  }

  const validation = await validateAppointmentScheduling({
    clinicId,
    serviceId: formData.service,
    professionalId: formData.professional,
    roomId: formData.room,
    startTime: formData.startTime,
    date: formData.date,
    patientId: formData.patient,
  });

  setValidationState(validation);
};

useEffect(() => {
  // Validar quando qualquer campo muda
  const timer = setTimeout(() => {
    validateFormData();
  }, 500); // Debounce de 500ms

  return () => clearTimeout(timer);
}, [formData.service, formData.professional, formData.date, formData.startTime, formData.room]);

// No formulário, mostrar status
{validationState && (
  <div>
    {validationState.valid ? (
      <SuccessMessage>✓ Agendamento válido</SuccessMessage>
    ) : (
      <ErrorMessage>{validationState.errors[0]}</ErrorMessage>
    )}
    {validationState.warnings.length > 0 && (
      <WarningMessage>⚠ {validationState.warnings[0]}</WarningMessage>
    )}
  </div>
)}
```

---

### Passo 5: Atualizar Horário Final Automaticamente

**Objetivo:** Quando usuário seleciona hora inicial, calcular fim automaticamente

```javascript
const handleStartTimeChange = async (startTime) => {
  setFormData({...formData, startTime});

  if (!formData.service || !formData.professional || !formData.date) {
    return; // Incompleto
  }

  // Calcular dados incluindo hora final
  const data = await calculateAppointmentData({
    clinicId,
    serviceId: formData.service,
    professionalId: formData.professional,
    startTime,
    date: formData.date,
  });

  // Auto-preencher end_time
  setFormData(prev => ({
    ...prev,
    endTime: data.endTime, // ← Usa valor calculado
    duration: data.duration,
  }));
};
```

---

## 🧪 Como Testar

### Teste 1: Validação Básica
1. Preencher formulário com dados válidos
2. Clicar "Agendar"
3. Verificar se validação passa
4. Verificar se agendamento é criado
5. Verificar se end_time está correto

### Teste 2: Erro de Validação
1. Tentar agendar para horário conflitante
2. Verificar se erro é mostrado
3. Verificar se agendamento NÃO é criado

### Teste 3: Aviso de Validação
1. Tentar agendar quando último slot
2. Verificar se aviso é mostrado
3. Confirmar se permite prosseguir com aviso
4. Verificar se agendamento é criado

### Teste 4: Filtragem de Profissional
1. Selecionar serviço X
2. Verificar se apenas profissionais vinculados aparecem
3. Mudar para serviço Y
4. Verificar se lista atualiza

---

## ⚠️ Pontos de Atenção

### Possível Erro 1: Import não encontrado
```
Error: Cannot find module '@/lib/agendaIntegrationApi'
```
**Solução:** Verificar se arquivo foi criado em `src/lib/agendaIntegrationApi.js`

### Possível Erro 2: Função retorna null
```javascript
validation = { valid: false, errors: [...] }
```
**Solução:** Verificar se clinic_id está correto. Adicionar console.log() para debug.

### Possível Erro 3: Duração não calcula
```
appointmentData.endTime = undefined
```
**Solução:** Verificar se serviço existe e tem duração configurada. Fallback para 60 minutos.

---

## 📝 Template Mínimo

```javascript
// src/pages/clinica/agenda/AgendaPage.jsx

import { validateAppointmentScheduling, calculateAppointmentData } from "@/lib/agendaIntegrationApi";

export function AgendaPage() {
  const handleAddAppointment = async (formData) => {
    // 1. Validar
    const validation = await validateAppointmentScheduling({
      clinicId: clinic.id,
      serviceId: formData.service,
      professionalId: formData.professional,
      roomId: formData.room,
      startTime: formData.startTime,
      date: formData.date,
      patientId: formData.patient,
    });

    if (!validation.valid) {
      alert(validation.errors.join("\n"));
      return;
    }

    // 2. Criar
    await appointmentsApi.createAppointment({
      clinic_id: clinic.id,
      professional_id: formData.professional,
      service_id: formData.service,
      room_id: formData.room,
      patient_id: formData.patient,
      date: formData.date,
      start_time: formData.startTime,
      end_time: validation.endTime, // ← Calculado
      appointment_status: "scheduled",
    });

    alert("Agendado!");
  };

  return (
    // ... render formulário e chamar handleAddAppointment
  );
}
```

---

## ✅ Quando Está Pronto

Você saberá que ETAPA 5.1 está completa quando:

- ✅ Validação de agendamento está sendo chamada antes de criar
- ✅ Erros são mostrados ao usuário com mensagens claras
- ✅ Avisos são mostrados mas permitem prosseguir
- ✅ End time é calculado automaticamente
- ✅ Profissionais são filtrados por serviço
- ✅ Testes de cenários passou (vide seção "Como Testar")

---

## 🚀 Depois de Completar

Após terminar ETAPA 5.1:

1. Criar documento com status de integração
2. Testar cenários de erro
3. Mover para ETAPA 5.2 (Financeiro)
