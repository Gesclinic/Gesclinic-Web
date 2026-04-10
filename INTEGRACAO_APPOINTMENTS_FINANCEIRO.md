# 🚀 INTEGRAÇÃO COMPLETA: APPOINTMENTS → FINANCEIRO

**Status:** Pronto para Implementação  
**Data:** 05/04/2026  
**Objetivo:** Cada atendimento finalizado gera automaticamente Produção Médica, Repasse, DRE, AR/Faturamento

---

## 📋 ARQUIVOS CRIADOS

### 1. **Migração SQL com Funções RPC**
```
supabase/migrations/20260405_appointment_financial_integration.sql
```

Contém 3 funções RPC:
- `process_appointment_medical_production()` → Cria produção + transação
- `calculate_monthly_repasse()` → Calcula 70/30
- `finalize_appointment_financial()` → Combina ambos

### 2. **API JavaScript**
```
src/lib/appointmentFinancialIntegrationApi.js
```

Exporta funções:
- `finalizeAppointmentWithFinancials()` → Fluxo completo
- `calculateMonthlyRepasse()` → Apenas repasse
- `processAppointmentProduction()` → Apenas produção
- `getProductionAndRepasseSummary()` → Dashboard

---

## 🔧 PASSO 1: EXECUTAR MIGRAÇÃO SQL

### No Supabase Console:

1. **Acesse:** https://app.supabase.com/
2. **Projeto:** Gesclinic
3. **SQL Editor** → Nova Query
4. **Copie todo o conteúdo de:**
```
supabase/migrations/20260405_appointment_financial_integration.sql
```
5. **Execute (Ctrl+E)**

✅ Você verá mensagem: "Query executed successfully"

---

## ✅ PASSO 2: INTEGRAÇÃO COM UI (OPCIONAL)

Para chamar automaticamente quando finaliza atendimento, edite:

### `src/pages/clinica/agenda/views/AgendaDayView.jsx`

Procure por: **"Salvar dados financeiros se houver"** (linha ~646)

Adicione antes de `saveCheckInFinancialData`:

```javascript
// 1️⃣ Processar financeiro (produção + repasse)
console.log('💰 Processando produção médica e repasse...');
const { finalizeAppointmentWithFinancials } = await import('@/lib/appointmentFinancialIntegrationApi');
const financeResult = await finalizeAppointmentWithFinancials(aptId, financialData);

if (!financeResult.success) {
  console.warn('⚠️  Aviso ao processar financeiro:', financeResult.message);
} else {
  console.log('✅ Produção + Repasse criados:', financeResult);
}

// 2️⃣ Depois processar check-in (AR/Billing)
if (Object.keys(financialData).length > 0) {
  console.log('📋 Processando documentos (AR/Faturamento)...');
  // ... resto do código ...
}
```

---

## 📊 O QUE ACONTECE AGORA

Quando você finaliza um atendimento em 23/03/2026:

### ✅ Medical Production
```
Profissional: 4e8d3f88-c7c0-4d29-bcb6-f21b35219bf1
Data: 2026-03-23
Valor Bruto: (valor do serviço)
Valor Líquido: (75% do bruto)
```

### ✅ Medical Repasse (Calculado Automaticamente)
```
Período: 01/03 - 31/03/2026
Produção Total: (soma todas de março)
Profissional (70%): (70% do total)
Clínica (30%): (30% do total)
```

### ✅ Financial Transactions
```
Receita - Consulta 23/03/2026: R$ XXX (type: revenue)
```

### ✅ Contas a Receber (Se PARTICULAR)
```
Atendimento - 23/03/2026: R$ XXX
Status: Open
Vencimento: 22 dias depois
```

### ✅ Guia de Faturamento (Se CONVÊNIO)
```
Fatura Convênio 23/03/2026
Aguardando processamento
```

---

## 🎯 TESTE RÁPIDO

Após executar a migração:

1. **Acesse a Agenda**
2. **Finalize um atendimento** (clique em "Finalizar Atendimento")
3. **Preencha dados financeiros** no check-in
4. **Verifique em Finanças:**
   - ✅ Fluxo de Caixa → nova transação
   - ✅ Repasse Médico → valores atualizados
   - ✅ Contas a Receber → nova conta (se particular)

---

## 🔍 VERIFICAR TUDO FUNCIONA

```bash
# Execute o script de verificação
node verify_march.js

# Espere ver:
✅ Fluxo de Caixa → aumentou em X
✅ Repasse Médico → recalculado
✅ Contas a Receber → novas entradas
```

---

## 📝 PRÓXIMAS ETAPAS

1. ✅ Executar migração SQL
2. ✅ (Opcional) Integrar com AgendaDayView.jsx
3. ☐ Testar com atendimentos reais
4. ☐ Verificar cálculos de repasse
5. ☐ Reabilitar RLS (segurança)
6. ☐ Deploy em produção

---

## 🆘 TROUBLESHOOTING

**Erro: "function finalize_appointment_financial does not exist"**
- Solução: Verifique se a migração SQL foi executada no Supabase

**Erro: "row-level security policy"**
- Solução: RLS ainda está habilitado. Execute DISABLE_RLS_QUICK.sql novamente

**Produção não está sendo criada**
- Verifique se `medical_production` tem RLS desabilitado
- Verifique se appointment tem valor > 0

**Repasse zerado**
- Verifique se tem registros em `medical_repasse_config`
- Se não tiver, use default 70/30 (função usa isso)

---

## 📞 SUPORTE

Para testar funções RPC diretamente no Supabase SQL Editor:

```sql
-- Testar produção
SELECT * FROM finalize_appointment_financial('UUID_DO_APPOINTMENT'::UUID);

-- Testar repasse
SELECT * FROM calculate_monthly_repasse(
  'UUID_CLINIC'::UUID,
  'UUID_PROF'::UUID,
  '2026-03-01'::DATE
);
```

---

**Integração completa em 3 passos! 🚀**
