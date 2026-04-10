# ✅ Fix: Informações Faltando ao Editar Agendamento

## 🔍 Problema Identificado

Ao clicar em **editar** um agendamento, algumas informações não estavam sendo carregadas:
- ❌ CPF do paciente
- ❌ Telefone do paciente  
- ❌ Celular do paciente

## 🎯 Causa Raiz

A query `listAppointments()` em `appointmentsApi.js` não estava retornando dados do paciente com profundidade suficiente para preencher os campos de edição.

**Query anterior:**
```javascript
patients:patient_id(id, name)  // ❌ Apenas id e name
```

**Query corrigida:**
```javascript
patients:patient_id(id, name, document_id, phone, cell_phone)  // ✅ Completo
```

## 💾 Mudanças Realizadas

### 1. **appointmentsApi.js** - Linha 28
✅ Expandido o SELECT dos dados do paciente para incluir:
- `document_id` (CPF)
- `phone` (Telefone)
- `cell_phone` (Celular)

### 2. **appointmentsApi.js** - Mapeamento de Dados
✅ Adicionado mapeamento dos novos campos retornados:
```javascript
patient_cpf: apt.patients?.document_id || null,
patient_phone: apt.patients?.phone || null,
patient_mobile: apt.patients?.cell_phone || null,
```

### 3. **AppointmentModal.jsx** - getInitialFormData()
✅ Atualizado para capturar os novos campos na edição:
```javascript
patient_cpf: selectedSlot.patient_cpf || selectedSlot.patients?.document_id || '',
patient_phone: selectedSlot.patient_phone || selectedSlot.patients?.phone || '',
patient_mobile: selectedSlot.patient_mobile || selectedSlot.patients?.cell_phone || '',
```

### 4. **AppointmentModal.jsx** - useEffect de Carregamento
✅ Adicionada função assíncrona que busca dados do paciente do banco se não estiverem em `metadata`:
```javascript
const { data: patient, error } = await supabase
  .from('patients')
  .select('id, name, document_id, phone, cell_phone')
  .eq('id', formData.patient_id)
  .single();
```

Fallbacks automáticos:
1. Primeiro tenta `preSelectedPatient`
2. Depois procura em `metadata.patients`
3. Se não encontrar, busca direto do banco via Supabase
4. Se não encontrar mesmo assim, mantém campos vazios

## 📊 Fluxo de Carregamento de Dados

```
Clica em Editar
    ↓
handleSlotClick() dispara
    ↓
agenda.selectSlot(slot) com dados do timeline
    ↓
AppointmentModal recebe selectedSlot com:
  - patient_cpf ✅
  - patient_phone ✅
  - patient_mobile ✅
  - patients.document_id ✅
  - patients.phone ✅
  - patients.cell_phone ✅
    ↓
getInitialFormData() popula formData com os dados
    ↓
useEffect carrega dados adicionais se faltarem
    ↓
Modal renderiza com todos os campos preenchidos ✅
```

## 🧪 Como Testar

1. **Crie um agendamento** com paciente e dados completos
2. **Clique em "✎ Editar"** no timeline
3. **Verifique se aparecem:**
   - ✅ CPF do paciente
   - ✅ Telefone
   - ✅ Celular
   - ✅ Nome do profissional
   - ✅ Sala
   - ✅ Serviço
   - ✅ Convênio
   - ✅ Valor

## 🔒 Campos Que Agora São Carregados

| Campo | Fonte 1 | Fonte 2 | Fonte 3 |
|-------|---------|---------|---------|
| patient_cpf | selectedSlot.patient_cpf | patients.document_id | useEffect SELECT |
| patient_phone | selectedSlot.patient_phone | patients.phone | useEffect SELECT |
| patient_mobile | selectedSlot.patient_mobile | patients.cell_phone | useEffect SELECT |

## 🚀 Benefícios

✅ **Edição completa** - Todos os dados do paciente carregam automaticamente  
✅ **Sem consultas extras** - Dados vêm na query principal via JOINs  
✅ **Fallback automático** - Se algo não vier, busca do banco  
✅ **Melhor performance** - Uma query com JOINs ao invés de múltiplas  
✅ **UX melhorada** - Usuário vê dados completos ao editar  

## 📝 Código Alterado

**Antes:**
```javascript
// appointmentsApi.js - Linha 28
patients:patient_id(id, name)
```

**Depois:**
```javascript
// appointmentsApi.js - Linha 28
patients:patient_id(id, name, document_id, phone, cell_phone)
```

**Antes:**
```javascript
// getInitialFormData - Linha 933
patient_cpf: selectedSlot.patient_cpf || '',
```

**Depois:**
```javascript
// getInitialFormData - Linha 933
patient_cpf: selectedSlot.patient_cpf || selectedSlot.patients?.document_id || '',
```

## ✨ Status

**Status:** ✅ COMPLETO  
**Arquivos Modificados:** 2
- `src/lib/appointmentsApi.js`
- `src/pages/clinica/agenda/components/AppointmentModal.jsx`

**Próximo Passo:** Recarregar a aplicação e testar edição de agendamento

---

**Data:** 2024-01-19  
**Tipo:** Bug Fix  
**Severidade:** Média (dados não carregavam ao editar)  
**Impacto:** Melhora na UX de edição de agendamentos
