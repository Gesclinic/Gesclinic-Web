# 🔧 Card Number (Nº Carteira/Matrícula) - Fix Completo

## ✅ Problema Identificado e Corrigido

### O Que Estava Acontecendo:
- O campo **Nº Carteira/Matrícula** (card_number) não estava sendo salvo no banco
- Havia **2 UPDATEs** subsequentes na tabela `appointments`
- O **primeiro UPDATE** (handleSaveDataOnly) incluía card_number ✅
- O **segundo UPDATE** (handleSaveChanges com faturamentoData) **NÃO incluía card_number** ❌
- Resultado: O segundo UPDATE sobrescrevia e **zerrava** os dados salvos pelo primeiro!

### Demonstração do Bug:
**Arquivo:** `src/pages/clinica/agenda/components/AppointmentUnitedModal.jsx`

**Linha 1419 - ANTES (❌ Estava faltando card_number):**
```javascript
await supabase
  .from('appointments')
  .update({
    guide_number: faturamentoData.guide_number || null,
    authorization_number: faturamentoData.authorization_number || null,
    authorization_expiry: faturamentoData.auth_expiry || null,
    authorization_verified: faturamentoData.authorized === true,
    billing_data: billingData,
  })
  .eq('id', appointment.id);
```

**Linha 1419 - DEPOIS (✅ Agora inclui card_number):**
```javascript
await supabase
  .from('appointments')
  .update({
    // 📋 DADOS DE LIBERAÇÃO
    card_number: liberacaoData.card_number || null,
    guide_number: faturamentoData.guide_number || null,
    authorization_number: faturamentoData.authorization_number || null,
    authorization_expiry: faturamentoData.auth_expiry || null,
    authorization_verified: faturamentoData.authorized === true,
    billing_data: billingData,
  })
  .eq('id', appointment.id);
```

---

## 🔨 Correções Aplicadas

### 1️⃣ Primeiro UPDATE - Linha 1419 (saveDataOnly flow)
**Adicionado:** `card_number: liberacaoData.card_number || null`

### 2️⃣ Segundo UPDATE - Linha 1653 (handleSaveChanges flow)
**Adicionado:** `card_number: liberacaoData.card_number || null`

---

## 📊 Situação Antes vs Depois

| Cenário | Antes ❌ | Depois ✅ |
|---------|---------|----------|
| Preench Nº Carteira | ❌ Salva (1º UPDATE) | ✅ Salva (1º UPDATE) |
| Avança para Faturamento | ❌ **APAGADO** (2º UPDATE) | ✅ **MANTÉM** (2º UPDATE) |
| Recarrega Modal | ❌ Campo vazio | ✅ Valor restaurado |
| Vercel Production | ⚠️ Dados exigtos | ✅ Funcionando |

---

## 🚀 Como Fazer Deploy

### Opção 1: Via Terminal/Git Bash
```bash
git add src/pages/clinica/agenda/components/AppointmentUnitedModal.jsx
git commit -m "🔧 Fix: Preservar card_number em ambos os UPDATEs de appointments"
git push origin main
```

### Opção 2: Via VS Code Git Panel
1. Abra **Source Control** (Ctrl+Shift+G)
2. Veja `AppointmentUnitedModal.jsx` em "Changes"
3. Clique **Stage Changes** (+)
4. Digite mensagem: `Fix: Preservar card_number em ambos os UPDATEs`
5. Clique **Commit**
6. Clique **Push**

### Opção 3: Via GitHub Desktop (se instalado)
1. Abra GitHub Desktop
2. Você verá 1 arquivo modificado
3. Escreva commit message
4. Clique "Commit to main"
5. Clique "Push origin"

---

## ⏱️ Próximos Passos

1. **Fazer o commit e push** das mudanças para GitHub
2. **Vercel reagirá automaticamente**:
   - Detecta novo push
   - Executa `npm run build`
   - Faz deploy se build bem-sucedido
3. **Verificar no Vercel Dashboard**:
   - Acesse https://vercel.com/dashboard
   - Veja o status do deployment
4. **Testar em Produção**:
   - Abra um agendamento no Vercel
   - Vá para aba Liberação
   - Preencha Nº Carteira/Matrícula
   - Clique "Salvar Dados"
   - Feche e reabra → deve manter o valor

---

## 🧪 Testes Recomendados

### Teste 1: Salvar via "Salvar Dados" (Edit Mode)
1. Abra agendamento existente
2. Aba Liberação
3. Preencha:
   - Nº Carteira: `123ABC456`
   - Nº Autorização: `9999999`
4. Clique "Salvar Dados"
5. Recarregue a página
6. **Esperado:** Ambos os campos mantêm valores ✅

### Teste 2: Salvar via "Criar Atendimento" (New Mode)
1. Crie novo agendamento
2. Preencha aba Liberação
3. Clique "Criar Atendimento"
4. Abra agendamento novamente
5. **Esperado:** card_number está lá ✅

### Teste 3: Sincronização Liberação ↔ Faturamento
1. Preencha Nº Autorização
2. Avance para Faturamento
3. **Esperado:** Nº Guia TISS sincronizado com Nº Autorização ✅

---

## 📝 Notas Técnicas

**Por que o bug acontecia:**
- `handleSaveChanges()` é chamada quando:
  - Avançar de aba
  - Criar atendimento
  - Salvar mudanças
- Internamente faz **dois UPDATEs**:
  1. UPDATE principal (agendamento, status, etc)
  2. UPDATE secundário (faturamentoData específicos)
- O segundo UPDATE **não incluía** campos de liberação
- Supabase executa sequencialmente
- Resultado: Segundo UPDATE sobrescrevia card_number com NULL

**Como a correção funciona:**
- Agora ambos os UPDATEs incluem todos os campos de liberação
- Dados não são mais perdidos entre UPDATEs
- Estado React continua sincronizado com banco

---

## 🎯 Status Atual

| Componente | Status |
|-----------|--------|
| Local Dev (Localhost) | ⏳ Precisa hard refresh |
| Production (Vercel) | ⏳ Precisa fazer push |
| Código Compilado | ✅ Pronto (build bem-sucedido) |
| Testes | ⏳ Aguardando deploy |

---

**Data da Correção:** 10/04/2026 (Abril 2026)
**Arquivo Modificado:** AppointmentUnitedModal.jsx (2 locais)
**Tipo de Fix:** Preservação de dados entre UPDATEs sequenciais
