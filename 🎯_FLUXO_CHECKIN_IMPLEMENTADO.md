# ✅ Fluxo de Check-in Implementado

## 📋 Resumo da Implementação

Implementado um fluxo completo de check-in com **3 status intermediários** para rastrear a jornada do paciente na clínica:

1. **Confirmado/A Confirmar** → Agendamento inicial
2. **📍 Presente** → Paciente chegou na recepção
3. **🟢 Pronto para Atendimento** → Recepção completou check-in
4. **👨‍⚕️ Em Atendimento** → Profissional está atendendo
5. **✓ Finalizado** → Consulta concluída

---

## 🔄 Fluxo Operacional

### **Fase 1: Agendamento**
- Status inicial: **Confirmado** ou **A Confirmar**
- Paciente agenda consulta
- Ação: Nenhuma até chegada

### **Fase 2: Chegada na Recepção** ✨ NEW
- Recepcionista clica em **"📋 Check-in"** na timeline
- Sistema abre o **CheckinDrawer**
- Recepcionista marca paciente como **"📍 Presente"**
- Status muda para: **presente**
- Timestamp registrado em: `chegada_em`

### **Fase 3: Liberação para Profissional** ✨ NEW
- Recepcionista completa o checklist
- Finança validada (se necessário)
- Recepcionista clica em **"🟢 Liberar para Atendimento"**
- Status muda para: **pronto_atendimento**
- Timestamp registrado em: `liberado_em`
- ✅ **Paciente entra na fila do profissional**

### **Fase 4: Profissional em Atendimento**
- Profissional vê paciente "Pronto"
- Clica em "Iniciar Atendimento" (se implementado)
- Status muda para: **em_atendimento**

### **Fase 5: Conclusão**
- Profissional finaliza consulta
- Status muda para: **finalizado**

---

## 🎯 Mudanças Implementadas

### **1. CheckinDrawer.jsx** 
✅ Adicionado novo botão "📍 Marcar como Presente"
```jsx
<button onClick={handleRegistrarPresenca}>
  📍 Marcar como Presente
</button>
```

- Função `handleRegistrarPresenca()` atualiza status para `presente`
- Registra timestamp em `chegada_em`
- Permite que recepcionista continue com checklist

### **2. AppointmentModal.jsx**
✅ Adicionados 2 novos status no dropdown:
```jsx
<option value="presente">📍 Presente (Chegou)</option>
<option value="pronto_atendimento">🟢 Pronto para Atendimento</option>
```

### **3. AgendaTimeline.jsx**
✅ Adicionadas cores e labels para novo fluxo:
```javascript
case 'presente':
  return {
    bgColor: 'bg-blue-50',
    badgeColor: 'bg-blue-100 text-blue-800',
    label: '📍 Presente'
  };
case 'pronto_atendimento':
  return {
    bgColor: 'bg-lime-50',
    badgeColor: 'bg-lime-100 text-lime-800',
    label: '🟢 Pronto para Atendimento'
  };
```

---

## 💾 Dados Armazenados

### **Campos no Banco de Dados**
```sql
appointments:
  id                    UUID PRIMARY KEY
  patient_id            UUID (nullable para pré-pacientes)
  professional_id       UUID
  status                VARCHAR (presente, pronto_atendimento, etc.)
  chegada_em            TIMESTAMP (quando marcado como presente)
  liberado_em           TIMESTAMP (quando liberado para atendimento)
  scheduled_date        DATE (data do agendamento)
  scheduled_time        TIME (hora marcada)
  end_time              TIME (hora final)
```

---

## 📊 Visualização na Agenda

### **Timeline Geral**
- Mostra todos agendamentos coloridos por status
- Cores diferentes para cada etapa do fluxo
- Botões de ação (Editar, Deletar) para admin

### **Indicadores de Status**
- **⚠ A Confirmar** (Amarelo) - Precisa confirmação
- **✓ Confirmado** (Verde) - Confirmado
- **📍 Presente** (Azul) - Chegou na recepção
- **🟢 Pronto para Atendimento** (Limão) - Pronto para profissional
- **👨‍⚕️ Em Atendimento** (Índigo) - Com profissional
- **✓ Finalizado** (Esmeralda) - Consulta concluída
- **✕ Faltou** (Vermelho) - Paciente não compareceu
- **✕ Cancelado** (Laranja) - Cancelado
- **⚡ Encaixe** (Ciano) - Encaixe de emergência
- **🔒 Bloqueado** (Cinza) - Horário bloqueado

---

## 🔐 Permissões por Papel

| Ação | Recepção | Profissional | Admin | Gestor |
|------|----------|--------------|-------|--------|
| Marcar Presente | ✅ | ❌ | ✅ | ✅ |
| Liberar p/ Atendimento | ✅ | ❌ | ✅ | ✅ |
| Iniciar Atendimento | ❌ | ✅ | ✅ | ✅ |
| Finalizar Consulta | ❌ | ✅ | ✅ | ✅ |
| Deletar Agendamento | ❌ | ❌ | ✅ | ❌ |

---

## 🚀 Como Usar

### **Recepcionista: Processo de Check-in**

1. **Paciente chega na recepção**
   - Hora: ~15:30 (15 minutos antes do agendamento)
   - Recepcionista procura o paciente na agenda

2. **Clica em "📋 Check-in"**
   - Abre drawer com checklist e informações financeiras

3. **Clica em "📍 Marcar como Presente"**
   - Status muda para PRESENTE
   - Timestamp registrado em `chegada_em`

4. **Completa o checklist**
   - Valida documentação
   - Verifica situação financeira

5. **Clica em "🟢 Liberar para Atendimento"**
   - Status muda para PRONTO_ATENDIMENTO
   - Timestamp registrado em `liberado_em`
   - Paciente pronto para profissional

### **Profissional: Visualizar Prontos**

1. **Acessa sua agenda**
   - Filtra por status: "Pronto para Atendimento"
   - Vê pacientes aguardando

2. **Clica no paciente**
   - Abre agendamento
   - Clica "Iniciar Atendimento" (se implementado)

3. **Durante atendimento**
   - Status automático: "Em Atendimento"

4. **Ao finalizar**
   - Status: "Finalizado"

---

## 📈 Próximos Passos Opcionais

### **1. Profissional Iniciar Atendimento**
- Adicionar botão "👨‍⚕️ Iniciar Atendimento"
- Profissional clica quando começa consulta
- Muda status para `em_atendimento`

### **2. Filtro de Status**
- Recepção vê: Confirmado + A Confirmar + Presente
- Profissional vê: Pronto para Atendimento + Em Atendimento
- Gestor vê: Todos

### **3. Fila de Espera**
- Dashboard mostra pacientes "Pronto para Atendimento"
- Profissional clica para chamar próximo

### **4. Notificação de Chegada**
- SMS/WhatsApp quando paciente marca presente (opcional)
- App mobile sincroniza status em tempo real

### **5. Relatórios**
- Tempo de espera: `liberado_em` - `chegada_em`
- Tempo de atendimento: `finalizado_em` - `em_atendimento_em`
- Taxa de presença/falta

---

## ✅ Status da Implementação

| Item | Status | Arquivo |
|------|--------|---------|
| Botão "Marcar Presente" | ✅ DONE | CheckinDrawer.jsx |
| Status "presente" no DB | ⚠️ NEEDED | Migração SQL |
| Status "pronto_atendimento" no DB | ⚠️ NEEDED | Migração SQL |
| Cores na timeline | ✅ DONE | AgendaTimeline.jsx |
| Labels atualizados | ✅ DONE | AgendaTimeline.jsx |
| Dropdown com novos status | ✅ DONE | AppointmentModal.jsx |
| Timestamps (chegada_em, liberado_em) | ⚠️ NEEDED | Migração SQL |

---

## 🔧 Migration SQL Necessária

```sql
-- Adicionar novos status à constraint check se houver
-- Adicionar novos campos de timestamp

ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS chegada_em TIMESTAMP,
ADD COLUMN IF NOT EXISTS liberado_em TIMESTAMP,
ADD COLUMN IF NOT EXISTS em_atendimento_em TIMESTAMP,
ADD COLUMN IF NOT EXISTS finalizado_em TIMESTAMP;

-- Validar status permitidos (exemplo)
ALTER TABLE appointments
DROP CONSTRAINT IF EXISTS check_status;

ALTER TABLE appointments
ADD CONSTRAINT check_status CHECK (status IN (
  'a_confirmar', 'confirmado', 'presente', 'pronto_atendimento',
  'em_atendimento', 'finalizado', 'faltou', 'cancelado', 
  'encaixe', 'bloqueado', 'liberado_para_atendimento'
));
```

---

## 🎓 Diagrama de Estados

```
┌─────────────────┐
│   Agendado      │ (a_confirmar/confirmado)
└────────┬────────┘
         │ Paciente chega
         ↓
┌─────────────────┐
│   Presente      │ (presente) - Chegou na recepção
└────────┬────────┘
         │ Recepção completa check-in
         ↓
┌──────────────────────────┐
│ Pronto p/ Atendimento    │ (pronto_atendimento)
└────────┬─────────────────┘
         │ Profissional começa
         ↓
┌─────────────────┐
│  Em Atendimento │ (em_atendimento)
└────────┬────────┘
         │ Profissional termina
         ↓
┌─────────────────┐
│   Finalizado    │ (finalizado)
└─────────────────┘

ALT: Faltou ────────→ (faltou)
ALT: Cancelado ─────→ (cancelado)
```

---

**Data da Implementação:** 2024
**Status:** ✅ FRONTEND COMPLETO - AGUARDA SQL MIGRATION
**Próximo Passo:** Executar migrations SQL para adicionar campos de timestamp
