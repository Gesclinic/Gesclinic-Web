# 🧹 LIMPEZA COMPLETA DE BANCO DE DADOS
## Sistema Gesclinic-Web

---

## 🎯 O QUE VOCÊ QUER FAZER?

### ⚡ "Quero fazer AGORA, rápido!" (15 min)
→ Abra: **`⚡_ACAO_RAPIDA_3_PASSOS.md`**  
3 passos simples, nada de explicação, só ação.

### 📖 "Quero entender tudo antes" (20 min)
→ Abra: **`LIMPEZA_RAPIDO_3_ETAPAS.md`**  
Guia completo com explicações e troubleshooting.

### 🤖 "Quero automático!" (10 min)
Execute um destes:
```powershell
# Windows PowerShell (recomendado)
.\scripts\cleanup.ps1 -full

# OU Terminal qualquer OS
npm run clean:advanced
```

### 🔍 "Quero saber tudo que foi feito" (30 min)
→ Abra: **`📋_RESUMO_STATUS_LIMPEZA.md`**  
Resumo técnico de TUDO que foi implementado.

### 📚 "Quero catálogo de tudo" (10 min)
→ Abra: **`📦_INVENTARIO_COMPLETO.md`**  
Listagem de todos os arquivos e o que cada um faz.

---

## 📋 ESTRUTURA DOS ARQUIVOS

```
projeto/
├── 📄 Documentação (você está aqui)
│   ├── ⚡_ACAO_RAPIDA_3_PASSOS.md           ← COMECE AQUI (2 min leitura)
│   ├── LIMPEZA_RAPIDO_3_ETAPAS.md          ← Guia completo (5 min leitura)
│   ├── 🎯_LIMPEZA_FINAL_INSTRUCOES.md      ← Instruções finais (3 min)
│   ├── 📋_RESUMO_STATUS_LIMPEZA.md         ← Resumo técnico (10 min)
│   └── 📦_INVENTARIO_COMPLETO.md           ← Catálogo de tudo (10 min)
│
├── scripts/
│   ├── 🔴 SQL Scripts (Supabase SQL Editor)
│   │   ├── FIX_CONSTRAINT_SQL.sql           ← EXECUTAR 1º
│   │   └── LIMPEZA_MANUAL_SUPABASE.sql      ← EXECUTAR 2º
│   │
│   ├── 🟢 Node.js Scripts (npm/Terminal)
│   │   ├── clean-lancamentos.mjs            ← npm run clean:lancamentos
│   │   ├── clean-as-admin.mjs               ← npm run clean:admin
│   │   └── clean-advanced.mjs               ← npm run clean:advanced
│   │
│   └── 🟡 PowerShell Scripts (Windows)
│       └── cleanup.ps1                      ← .\cleanup.ps1 -full
│
└── package.json
    ├── "clean:lancamentos"  ← npm run clean:lancamentos
    ├── "clean:all"          ← npm run clean:all (mesmo que acima)
    ├── "clean:admin"        ← npm run clean:admin
    └── "clean:advanced"     ← npm run clean:advanced
```

---

## ✨ COMEÇAR AGORA

### Opção A: Mais Fácil (Manual no Supabase)
```
1. Abra: https://supabase.com/dashboard/project/gvdkdjyupktlflwurike/sql

2. Execute SCRIPT 1:
   scripts/FIX_CONSTRAINT_SQL.sql
   
3. Execute SCRIPT 2:
   scripts/LIMPEZA_MANUAL_SUPABASE.sql
   
4. Validar em: http://localhost:3000
```
⏱️ Tempo: 15 min

### Opção B: Mais Rápida (Automático)
```bash
npm run clean:advanced
```
⏱️ Tempo: 10 min

### Opção C: Totalmente Automático (Windows)
```powershell
.\scripts\cleanup.ps1 -full
```
⏱️ Tempo: 15 min

---

## 📊 TABELAS QUE SERÃO LIMPAS

| Tabela | Tipo | Status |
|--------|------|--------|
| 🗂️ appointments | Agendamentos | ✅ Deletado |
| 💰 ar_invoices | Notas Fiscais | ✅ Deletado |
| 💰 ar_receivables | Contas a Receber | ✅ Deletado |
| 💰 ar_receivable_installments | Parcelas | ✅ Deletado |
| 💰 ar_payments | Pagamentos Recebidos | ✅ Deletado |
| 💰 ar_payment_splits | Divisão de Pagamentos | ✅ Deletado |
| 💰 ap_bills | Contas a Pagar | ✅ Deletado |
| 📎 payable_attachments | Anexos | ✅ Deletado |
| 💼 payment_settlements | Liquidações | ✅ Deletado |
| ↩️ payment_reversals | Reversões | ✅ Deletado |
| 👨‍⚕️ professional_repayments | Repasses Profissionais | ✅ Deletado |
| 📊 medical_commission_ledger | Comissões Médicas | ✅ Deletado |

**NÃO serão deletados:** Pacientes, Profissionais, Clínicas, Usuários, Serviços, etc.

---

## ❌ PROBLEMA ENCONTRADO (JÁ RESOLVIDO)

**O que era:** Constraint FK sem `ON DELETE CASCADE`  
**Efeito:** Não conseguia deletar appointments  
**Solução:** Script `FIX_CONSTRAINT_SQL.sql` reconstrói a constraint corretamente  
**Status:** ✅ RESOLVIDO

---

## ✅ VERIFICAÇÃO: Como Saber que Funcionou?

Após executar, verifique:

1. **No Terminal/PowerShell:**
```
Todos os valores devem ser ZERO:
✓ ar_payment_splits: 0
✓ ar_payments: 0
✓ payment_settlements: 0
... (todos)
✓ appointments: 0
```

2. **No Supabase SQL Editor:**
```
Resultado final mostra todos os valores como 0
```

3. **Na Aplicação:**
```
http://localhost:3000 → Financeiro → Contas a Receber
Deve estar VAZIO (sem registros)
```

---

## 🆘 DEU ERRO?

### Erro: "Permission Denied"
→ Use Supabase SQL Editor (não requer permissões especiais)

### Erro: "Foreign Key Constraint"
→ Executar `FIX_CONSTRAINT_SQL.sql` primeiro

### Erro: "Table doesn't exist"
→ Problema resolvido - scripts atualizados com nomes corretos

### Outro erro?
→ Leia: `LIMPEZA_RAPIDO_3_ETAPAS.md` (seção Troubleshooting)

---

## 📚 DOCUMENTAÇÃO DETALHADA

| Arquivo | Tempo | Público | Conteúdo |
|---------|-------|---------|----------|
| ⚡_ACAO_RAPIDA_3_PASSOS.md | 2 min | Iniciantes | Apenas passos, ir rápido |
| LIMPEZA_RAPIDO_3_ETAPAS.md | 5 min | Interesse geral | Passos + explicações + troubleshooting |
| 🎯_LIMPEZA_FINAL_INSTRUCOES.md | 3 min | Referência | Instruções finais + checklist |
| 📋_RESUMO_STATUS_LIMPEZA.md | 10 min | Técnico | Tudo que foi implementado |
| 📦_INVENTARIO_COMPLETO.md | 10 min | Referência | Catálogo de todos os arquivos |

---

## 🎯 PRÓXIMOS PASSOS (Após Limpeza)

1. ✅ Banco zerado
2. 📝 Criar dados de teste (opcional)
3. 🧪 Testar workflows
4. 🚀 Deploy (se necessário)

---

## 💡 DICAS RÁPIDAS

- 📍 Você deve estar em: `c:\dev\gesclinic-web`
- 🔑 `.env` precisa ter `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
- 🌐 Supabase URL: https://supabase.com/dashboard/project/gvdkdjyupktlflwurike
- 📱 Aplicação: http://localhost:3000 (depois de `npm run dev`)
- 🔄 Não é reversível! (Mas tem backup do Supabase)

---

## 📞 REFERÊNCIA RÁPIDA

**Problema:** Banco com dados antigos precisa ser zerado  
**Solução:** Scripts de limpeza + configuração de constraints  
**Tempo:** 15 minutos  
**Dificuldade:** Muito fácil  
**Risco:** Muito baixo (tudo automatizado)  
**Suporte:** Veja documentação de troubleshooting  

---

## 🚀 COMEÇAR AGORA!

### ✨ Recomendado: Rápido e Fácil
```bash
npm run clean:advanced
```

### 🔧 Alternativo: Mais Controle
Abra: `⚡_ACAO_RAPIDA_3_PASSOS.md`

### 🤖 Totalmente Automático (Windows)
```powershell
.\scripts\cleanup.ps1 -full
```

---

**Status:** ✅ Pronto para usar agora mesmo  
**Última atualização:** Hoje  
**Tempo estimado:** 15 minutos  

Bom trabalho! 🎉
