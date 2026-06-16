# 🎯 LIMPEZA DO BANCO: Instruções Finais

## ⚠️ Problema Atual

Ao tentar limpar appointmemts, ocorre erro:
```
ERROR: update or delete on table "appointments" violates foreign key constraint 
"professional_repayments_appointment_id_fkey" on table "professional_repayments"
```

**Motivo:** A constraint FK não foi criada com `ON DELETE CASCADE`

## ✅ Solução: 3 Passos (15 minutos)

### 1️⃣ **Fixar a Constraint** (5 min)

**Local:** Supabase SQL Editor  
**URL:** https://supabase.com/dashboard/project/gvdkdjyupktlflwurike/sql

**Passos:**
1. Clique em "+ New query" (novo no canto superior direito)
2. Na área de código, copie tudo de:
   ```
   scripts/FIX_CONSTRAINT_SQL.sql
   ```
3. Clique em **"Executar"** (botão azul) ou `Ctrl+Enter`
4. Aguarde a mensagem: `Query successful`

**Resultado esperado:**
```
constraint_name: professional_repayments_appointment_id_fkey
table_name: professional_repayments
column_name: appointment_id
```

---

### 2️⃣ **Limpar Todos os Dados** (5 min)

**Opção A: Via Supabase SQL Editor** (Recomendado)
1. Clique em "+ New query"
2. Copie tudo de:
   ```
   scripts/LIMPEZA_MANUAL_SUPABASE.sql
   ```
3. Clique em **"Executar"**
4. Aguarde conclusão

**Opção B: Via Terminal** (Automático)
```bash
npm run clean:lancamentos
```

**Resultado esperado (ao final):**
```
✓ ar_payment_splits: 0
✓ ar_payments: 0
✓ payment_settlements: 0
✓ payment_reversals: 0
✓ medical_commission_ledger: 0
✓ ar_receivable_installments: 0
✓ ar_receivables: 0
✓ ar_invoices: 0
✓ payable_attachments: 0
✓ ap_bills: 0
✓ professional_repayments: 0
✓ appointments: 0
```

---

### 3️⃣ **Validar no Sistema** (5 min)

1. Abra a aplicação: http://localhost:3000
2. Faça login (Fernando Cooper Medeiros)
3. Vá em: **Financeiro → Contas a Receber**
4. Verifique se está **vazio/sem dados**
5. Tente criar um novo registro
6. Se funcionar → Sucesso! ✅

---

## 🚀 Atalho Rápido via PowerShell

Se quiser automático, execute:
```powershell
.\scripts\cleanup.ps1 -full
```

Faz tudo automaticamente (após confirmação).

---

## 📁 Arquivos de Referência

| Arquivo | Objetivo |
|---------|----------|
| `scripts/FIX_CONSTRAINT_SQL.sql` | Fixar constraint FK |
| `scripts/LIMPEZA_MANUAL_SUPABASE.sql` | SQL de limpeza (copiar para Supabase) |
| `scripts/clean-lancamentos.mjs` | Script Node.js (npm run clean:lancamentos) |
| `scripts/clean-as-admin.mjs` | Script Node.js com admin key |
| `scripts/clean-advanced.mjs` | Script avançado com múltiplas estratégias |
| `scripts/cleanup.ps1` | Automação via PowerShell |
| `LIMPEZA_RAPIDO_3_ETAPAS.md` | Guia detalhado |

---

## 🎯 Checklist Final

- [ ] Executei: `scripts/FIX_CONSTRAINT_SQL.sql` (Supabase)
- [ ] Executei: `scripts/LIMPEZA_MANUAL_SUPABASE.sql` (Supabase) OU `npm run clean:lancamentos` (Terminal)
- [ ] Verifiquei: http://localhost:3000 → Financeiro → Contas a Receber (vazio)
- [ ] Testei: Criar novo registro (funciona)

---

## 🆘 Se algo der errado

### Erro: Permission Denied
→ Usar Supabase SQL Editor (faz limpeza com ANON key, sem problemas)

### Erro: Violates Foreign Key
→ Executar `FIX_CONSTRAINT_SQL.sql` primeiro, depois tentar novamente

### Erro: Table doesn't exist
→ Scripts agora usam nomes corretos, não deve mais ocorrer

### Tudo travado?
→ Ir ao Supabase e verificar se constraint foi criada corretamente

---

## 💡 Próximos Passos (Opcional)

Depois da limpeza, você pode:

1. **Criar dados de teste** manualmente via UI
2. **Importar dados** de um backup (se tiver)
3. **Validar** workflows de financeiro
4. **Testar** criação de agendamentos
5. **Deploy** com confiança (banco limpo)

---

## 📞 Suporte

Se der erro não previsto:
1. Copie a mensagem de erro completa
2. Verifique se está na raiz do projeto: `c:\dev\gesclinic-web`
3. Confirme que `.env` tem `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
4. Tente novamente

---

**Status:** ✅ Pronto para limpar banco  
**Última atualização:** Hoje  
**Tempo estimado:** 15 minutos
