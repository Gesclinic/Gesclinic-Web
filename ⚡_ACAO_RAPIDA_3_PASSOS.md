# ⚡ AÇÃO RÁPIDA: 3 Passos para Limpar o Banco (15 min)

## 🎯 PASSO 1: Fixar Constraint FK
**Local:** Supabase SQL Editor  
**URL:** https://supabase.com/dashboard/project/gvdkdjyupktlflwurike/sql  
**Tempo:** 2 min

### Como fazer:
1. Clique: **+ New Query** (canto superior direito)
2. Copie TUDO do arquivo: **`scripts/FIX_CONSTRAINT_SQL.sql`**
3. Cole na caixa de código
4. Clique: **Executar** (botão azul) ou `Ctrl+Enter`
5. ✅ Resultado esperado: Sem erros

---

## 🎯 PASSO 2: Limpar Todos os Dados
**Local:** Supabase SQL Editor (mesmo de cima) OU Terminal  
**Tempo:** 5 min

### Opção A: SQL Editor (Recomendado)
1. Clique: **+ New Query**
2. Copie TUDO do arquivo: **`scripts/LIMPEZA_MANUAL_SUPABASE.sql`**
3. Cole e clique: **Executar**
4. ✅ Espere aparecer a tabela de contagens com todos ZEROS

### Opção B: Terminal (Automático)
```bash
npm run clean:lancamentos
```
✅ Espere aparecer todos os ZEROS no final

---

## 🎯 PASSO 3: Validar no Sistema
**Local:** http://localhost:3000  
**Tempo:** 3 min

### Como fazer:
1. Abra: http://localhost:3000
2. Navegue: **Financeiro → Contas a Receber**
3. Verifique: Deve estar vazio (sem registros)
4. Teste: Clique em "Novo" para criar registro de teste
5. ✅ Se funcionar → PRONTO!

---

## 🏁 Pronto em 15 minutos!

Se algo der errado, veja: `📋_RESUMO_STATUS_LIMPEZA.md`

---

## 💨 Alternativa: Automático (1 comando)

```powershell
# Windows PowerShell
.\scripts\cleanup.ps1 -full

# OU Terminal qualquer OS
npm run clean:advanced
```

Faz os 3 passos automaticamente (pede confirmação).

---

**⏱️  Tempo:** 15 min  
**📌 Dificuldade:** Muito fácil  
**✅ Status:** Pronto para começar  
