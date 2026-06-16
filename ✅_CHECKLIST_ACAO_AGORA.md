# ✅ CHECKLIST AÇÃO - FAÇ A AGORA!

**Tempo**: 45 minutos

---

## PASSO 1: PREPARAR

- [ ] Abra arquivo: `📋_QUICK_REFERENCE.md` (nesta pasta)
- [ ] Abra Supabase: https://app.supabase.com/ (em outro aba)
- [ ] Copie SQL 1 (FASE 6-8) de: 📋_QUICK_REFERENCE.md
  - Procure pela seção: "PASSO 1: COLAR ISSO NO SUPABASE"
  - Copie TUDO desde `-- ============` até fim

---

## PASSO 2: APLICAR SQL 1 (FASE 6-8)

- [ ] Supabase → Seu Projeto (esquerda)
- [ ] Menu → SQL Editor
- [ ] Botão verde: "New Query"
- [ ] Cole o SQL 1 completo
- [ ] Botão azul: "Run"
- [ ] Aguarde: "Query executed successfully" ✅

**Se vir erro**: Tira print, manda mensagem comigo

---

## PASSO 3: APLICAR SQL 2 (FASE 9-11)

- [ ] Novo Query: "New Query" (botão verde novamente)
- [ ] Copie SQL 2 de: 📋_QUICK_REFERENCE.md
  - Procure: "PASSO 2: COLAR ISSO NO SUPABASE (SQL 2 - FASE 9-11)"
  - Copie TUDO
- [ ] Cole no editor
- [ ] Clique "Run"
- [ ] Aguarde: "Query executed successfully" ✅

**Se vir erro**: Tira print, manda mensagem

---

## PASSO 4: VALIDAR RÁPIDO

Execute estas 3 queries (um por um):

### Query 1: Verificar Colunas
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'appointment_services' 
AND column_name IN ('plan_id', 'professional_percentage', 'medical_production_id')
LIMIT 3;
```

Resultado esperado: 3 linhas ✅

- [ ] Vejo 3 colunas

### Query 2: Verificar Views
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'VIEW'
AND table_name LIKE 'vw_%';
```

Resultado esperado: 3 views ✅

- [ ] Vejo: vw_production_report
- [ ] Vejo: vw_billing_report
- [ ] Vejo: vw_receivables_report

### Query 3: Verificar Triggers
```sql
SELECT trigger_name FROM information_schema.triggers 
WHERE trigger_schema = 'public'
AND (trigger_name LIKE '%appointment%' OR trigger_name LIKE '%receivable%');
```

Resultado esperado: 2 triggers ✅

- [ ] Vejo: create_receivable_on_appointment_attended
- [ ] Vejo: sync_cashflow_on_receivable_update

---

## ✅ VALIDAÇÃO COMPLETA!

- [ ] SQL 1 executado com sucesso
- [ ] SQL 2 executado com sucesso
- [ ] Query 1: 3 colunas visíveis ✓
- [ ] Query 2: 3 views visíveis ✓
- [ ] Query 3: 2 triggers visíveis ✓

**🎉 FASE 9-11 APLICADA COM SUCESSO!**

---

## 🚀 PRÓXIMA FASE

Quando estiver pronto para FASE 12-17:

Abra: `📍_FASE_12-17_COMPLETO.md`

Tempo: 4 horas (pode fazer em 2 sessões de 2h)

---

## 📞 SE TIVER ERRO

### Erro: "table não existe"
```
Solução: Pode ser que a tabela foi renomeada
Ação: Tira print e manda
```

### Erro: "column já existe"
```
Solução: NORMAL! Os SQLs usam IF NOT EXISTS
Ação: Execute novamente, vai dar sucesso
```

### Erro: "permission denied"
```
Solução: RLS policy pode estar bloqueando
Ação: Tira print da mensagem de erro exato
```

### Query retorna vazio
```
Solução: NORMAL! Precisa de dados reais no appointment_services
Ação: Não é erro, é esperado
```

---

## 📊 TEMPO ESTIMADO

```
Leitura: 5 minutos
SQL 1:   5 minutos
SQL 2:   5 minutos
Validação: 10 minutos
────────────────────
TOTAL:   25 minutos (45 min com buffer)
```

---

## 🎯 AGORA: COMECE!

1. Abra: 📋_QUICK_REFERENCE.md
2. Copie SQL 1
3. Cole em Supabase
4. Clique Run
5. Repita com SQL 2
6. Execute as 3 validações
7. ✅ PRONTO!

**VAI! ⚡**

