# 🔧 Correções Críticas - Agenda Agendamento

**Data:** 25/04/2026  
**Status:** ✅ COMPLETADO

## Problemas Corrigidos

### 1. **UPDATE Query Pattern - appointmentsApi.js** ⭐ CRÍTICA
**Arquivo:** `src/lib/appointmentsApi.js` (linha 392)

**Problema:** A função `updateAppointment()` tinha lógica invertida:
```javascript
// ❌ ERRADO
const { data: result, error } = await supabase.update().select();
if (!data || data.length === 0) throw error;  // Checava payload, não result
return data[0];                                // Retornava payload, não response
if (error) throw error;                        // UNREACHABLE: depois do return
return mapFromDatabase(result);                // UNREACHABLE
```

**Solução:** Reordenado para padrão correto:
```javascript
// ✅ CORRETO
const { data: result, error } = await supabase.update().select();
if (error) throw error;
if (!result || result.length === 0) throw new Error('Record not found');
return mapFromDatabase(result[0]);
```

### 2. **Unreachable Code - AtendimentoModal.jsx** (linha 514)
**Arquivo:** `src/pages/clinica/agenda/components/AtendimentoModal.jsx`

**Problema:** Função `refreshAppointmentData()` tinha verificações duplicadas e unreachable:
```javascript
// ❌ ERRADO
if (error) return;
if (!freshData) return;
if (freshData) {  // <- Unreachable: se !freshData já retornou acima
  // código
}
```

**Solução:** Removida redundância, mantida estrutura lógica:
```javascript
// ✅ CORRETO
if (error) return;
if (!freshData) return;
// freshData garantidamente existe aqui
console.log('✅ Dados recarregados:', freshData);
```

### 3. **Desconto Não Salvando - AtendimentoModal.jsx** (linha 3329)
**Arquivo:** `src/pages/clinica/agenda/components/AtendimentoModal.jsx`

**Problema:** Inside `onChange` callback, return statement bloqueava código:
```javascript
// ❌ ERRADO
onChange={(e) => {
  if (newDiscount > 0 && !hasPermission) {
    alert('Sem permissão');
    return;  // <- Bloqueia resto do código
  }
  if (newDiscount > 0 && faturamentoData.discount === 0) {  // <- Unreachable
    setFaturamentoData(...);
  }
}}
```

**Solução:** Reorganizada lógica para permitir fluxo correto:
```javascript
// ✅ CORRETO
onChange={(e) => {
  const newDiscount = parseFloat(e.target.value) || 0;
  
  // Guard: sem permissão E tentando aplicar
  if (newDiscount > 0 && !hasPermission) {
    alert('Sem permissão');
    return;
  }
  
  // ✅ Pode prosseguir (tem permissão ou desconto é 0)
  if (newDiscount > 0) {
    setFaturamentoData({ ...newData, discount });
  } else {
    setFaturamentoData({ ...newData, discount: newDiscount });
  }
}}
```

### 4. **handleSaveAgendamento - Missing .select()** (linha 1180)
**Arquivo:** `src/pages/clinica/agenda/components/AtendimentoModal.jsx`

**Problema:** Salvamento não retornava dados atualizados:
```javascript
// ❌ ERRADO
const { error } = await supabase
  .from('appointments')
  .update(updateData)
  .eq('id', appointment.id);  // <- Sem .select()
if (error) throw error;
// Não retorna dados atualizados
```

**Solução:** Adicionado `.select()` com validação:
```javascript
// ✅ CORRETO
const { data, error } = await supabase
  .from('appointments')
  .update(updateData)
  .eq('id', appointment.id)
  .select();  // <- Retorna dados

if (error) throw error;
if (!data || data.length === 0) throw new Error('Falha ao atualizar');
return data[0];
```

## Campos Salvos Corretamente

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `scheduled_date` | date | Data do agendamento |
| `scheduled_time` | time | Hora do agendamento |
| `professional_id` | uuid | ID do profissional |
| `service_id` | uuid | ID do serviço |
| `payer_id` | uuid | ID do convênio ⭐ |
| `value` | numeric | Valor da consulta |
| `status` | enum | Status do agendamento |
| `notes` | text | Observações |

## Validações Implementadas

✅ **Hora:** Valida formato e conversão  
✅ **Convênio:** Mapped para `payer_id` corretamente  
✅ **Desconto:** Bloqueia aplicação sem permissão  
✅ **Saldo:** Valida não-excedência de valor  
✅ **Resposta:** Retorna dados atualizados do banco  

## Build Status

```
✅ npm run build: SUCCESS
   - 4947 modules transformed
   - Build time: 42.38s
   - No syntax errors
   - No unreachable code warnings
```

## Testes Recomendados

1. **Editar Horário**
   - Abrir agendamento
   - Mudar horário
   - Clicar salvar
   - ✅ Esperado: Horário atualizado no banco

2. **Trocar Convênio**
   - Abrir agendamento
   - Mudar convênio no dropdown
   - Clicar salvar
   - ✅ Esperado: `payer_id` atualizado

3. **Aplicar Desconto**
   - Abrir aba Faturamento
   - Tentar aplicar desconto SEM permissão
   - ✅ Esperado: Alert de permissão
   - Com permissão: Desconto salvo

4. **Verificar Logs no Console**
   - ✅ Deve ver `💾 [handleSaveAgendamento] Salvando: {...}`
   - ✅ Deve ver `✅ Agendamento salvo com sucesso! {...}`
   - ❌ NÃO deve ver erros de coerção JSON

## Próximos Passos

- [ ] Testar fluxo completo de edição
- [ ] Verificar console.log para confirmar dados corretos
- [ ] Validar persistência no Supabase
- [ ] Executar SQL migration para `get_current_clinic()`
- [ ] Remover logs console.log desnecessários em produção
