# 🎬 COMECE AQUI - ETAPA 5.1

## ⏱️ Tempo Estimado: 1-2 horas

**Objetivo:** Integrar validações de agendamento em AgendaPage.jsx  
**Arquivo a Modificar:** `src/pages/clinica/agenda/AgendaPage.jsx`  
**API a Usar:** `agendaIntegrationApi.js`

---

## 1️⃣ VERIFICAÇÃO PRÉ-INTEGRAÇÃO

Antes de começar, verifique:

```bash
# Terminal: Verificar se arquivo de API existe
ls src/lib/agendaIntegrationApi.js

# Terminal: Verificar se AgendaPage.jsx existe
ls src/pages/clinica/agenda/AgendaPage.jsx
```

✅ Ambos os arquivos devem existir.

---

## 2️⃣ ABRIR AGENDAPAGE.JSX

```
1. Abrir VS Code
2. Pressionar Ctrl+P
3. Digitar: pages/clinica/agenda/AgendaPage.jsx
4. Pressionar Enter
```

Você agora está vendo o arquivo AgendaPage.jsx.

---

## 3️⃣ ADICIONAR IMPORT (no topo do arquivo)

**Procure por:** Outros imports de "@/lib"

```javascript
// Exemplo do que você verá:
import { appointmentsApi } from "@/lib/appointmentsApi";
import { clinicsApi } from "@/lib/clinicsApi";
```

**Adicione depois:**
```javascript
import { 
  validateAppointmentScheduling, 
  calculateAppointmentData,
  listProfessionalsForService 
} from "@/lib/agendaIntegrationApi";
```

---

## 4️⃣ ENCONTRAR FUNÇÃO DE CRIAR AGENDAMENTO

**Procure por:** `handleAddAppointment` ou `handleCreateAppointment`

Você verá algo como:
```javascript
const handleAddAppointment = async (formData) => {
  // ... código existente
}
```

---

## 5️⃣ ADICIONAR VALIDAÇÃO (código novo)

**Dentro da função handleAddAppointment, ANTES de chamar appointmentsApi.createAppointment():**

```javascript
const handleAddAppointment = async (formData) => {
  try {
    // ← ADICIONE ISTO:
    
    // Validar agendamento
    const validation = await validateAppointmentScheduling({
      clinicId: clinic.id,
      serviceId: formData.service_id, // ou formData.serviceId (adaptar ao seu código)
      professionalId: formData.professional_id, // ou formData.professionalId
      roomId: formData.room_id, // ou formData.roomId
      startTime: formData.start_time, // ou formData.startTime
      date: formData.date,
      patientId: formData.patient_id, // ou formData.patientId
    });

    // Se validação falhou, mostrar erros
    if (!validation.valid) {
      toast({
        title: "Erro ao agendar",
        description: validation.errors.join("\n"),
        variant: "destructive",
      });
      return; // ← IMPORTANTE: não continuar
    }

    // Se há avisos, mostrar mas permitir continuar
    if (validation.warnings && validation.warnings.length > 0) {
      toast({
        title: "Avisos",
        description: validation.warnings.join("\n"),
        variant: "warning",
      });
    }

    // ← CÓDIGO EXISTENTE CONTINUA AQUI
    // Exemplo do que havia antes:
    const appointment = await appointmentsApi.createAppointment({
      clinic_id: clinic.id,
      // ... resto dos dados
    });

  } catch (error) {
    console.error("Erro ao agendar:", error);
    toast({
      title: "Erro",
      description: error.message,
      variant: "destructive",
    });
  }
};
```

---

## 6️⃣ USAR VALOR CALCULADO PARA END_TIME (opcional mas recomendado)

**Antes de criar o appointment, adicione:**

```javascript
// Calcular end_time automaticamente
const appointmentData = await calculateAppointmentData({
  clinicId: clinic.id,
  serviceId: formData.service_id,
  professionalId: formData.professional_id,
  startTime: formData.start_time,
  date: formData.date,
});
```

**Depois, ao criar o appointment, use:**

```javascript
const appointment = await appointmentsApi.createAppointment({
  clinic_id: clinic.id,
  professional_id: formData.professional_id,
  service_id: formData.service_id,
  start_time: formData.start_time,
  end_time: appointmentData.endTime, // ← Use este valor
  duration: appointmentData.duration,
  // ... resto dos dados
});
```

---

## 7️⃣ TESTAR

**Teste 1: Agendar válido**
1. npm run dev
2. Ir para Agenda
3. Preencher formulário com dados válidos
4. Clicar "Agendar"
5. ✅ Deve criar sem erros

**Teste 2: Agendar inválido**
1. Tentar agendar em horário conflitante
2. ❌ Deve mostrar erro e NÃO criar

**Teste 3: Aviso**
1. Agendar quando último slot disponível
2. ⚠️ Deve mostrar aviso mas permitir prosseguir

---

## 🔍 TROUBLESHOOTING

### Erro: "Cannot find module '@/lib/agendaIntegrationApi'"
**Solução:** Verificar se arquivo existe em `src/lib/agendaIntegrationApi.js`

### Erro: "validation is undefined"
**Solução:** Verificar se função retornou. Adicionar console.log() para debug:
```javascript
console.log("validation:", validation);
```

### Agendamento criado mas sem end_time
**Solução:** Usar `appointmentData.endTime` ao criar, não deixar vazio.

### Seletor de profissional mostra todos, não filtra
**Solução:** Isso é ETAPA 5.1 avançada - opcional por enquanto. Documentado em PROXIMOS_PASSOS_ETAPA_5-1.md

---

## ✅ CHECKLIST DE CONCLUSÃO

- [ ] Import adicionado no topo do arquivo
- [ ] Função handleAddAppointment encontrada
- [ ] Validação adicionada ANTES de createAppointment()
- [ ] Tratamento de erro adicionado
- [ ] Teste 1 passou (válido)
- [ ] Teste 2 passou (erro)
- [ ] Código compilado sem erros (npm run dev)

---

## 📝 PRÓXIMA ETAPA

Após completar ETAPA 5.1:

1. Criar documento resumindo mudanças realizadas
2. Testar todos os cenários
3. Começar ETAPA 5.2 (Financeiro)

---

## 🆘 PRECISA DE AJUDA?

**Se erro de import:**
→ Verificar se `agendaIntegrationApi.js` está em `src/lib/`

**Se função não funciona:**
→ Adicionar console.log() para ver dados

**Se dúvida sobre nomes de campos:**
→ Procurar no resto do arquivo AgendaPage.jsx por padrão usado

**Para referência completa:**
→ Ler ETAPA_5_INTEGRACAO_APIS_COMPLETA.md

---

## 🚀 COMECE AGORA!

1. Abrir arquivo
2. Adicionar import (passo 3)
3. Adicionar validação (passo 5)
4. Testar (passo 7)
5. Marcar completo

**Tempo:** 30 min a 1 hora
