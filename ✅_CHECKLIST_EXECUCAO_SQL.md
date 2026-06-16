# ✅ CHECKLIST: EXECUÇÃO SQL ETAPAS 1-6

## 📋 PRÉ-EXECUÇÃO

### Preparação
- [ ] VS Code aberto
- [ ] Arquivo `⚡_TODAS_MIGRAÇÕES_ETAPAS_1-6_COMPILADO.sql` localizado
- [ ] Navegador aberto em https://supabase.com/dashboard
- [ ] Login feito no Supabase (admin/owner)
- [ ] Internet estável

---

## 🚀 EXECUÇÃO

### Passo 1: Copiar SQL
- [ ] Abrir arquivo `⚡_TODAS_MIGRAÇÕES_ETAPAS_1-6_COMPILADO.sql`
- [ ] `Ctrl+A` para selecionar todo conteúdo
- [ ] `Ctrl+C` para copiar
- [ ] Verificar que ~5,000 linhas foram copiadas

### Passo 2: Colar no Supabase
- [ ] Supabase Dashboard aberto
- [ ] SQL Editor → New Query
- [ ] `Ctrl+V` para colar
- [ ] Verificar que texto apareceu na editor
- [ ] Scroll para baixo para ver final (deve terminar com "COMMIT;")

### Passo 3: Executar
- [ ] Botão **RUN** clicado (verde, no topo direito)
- [ ] Aguardar 30-60 segundos
- [ ] ✅ Mensagem de sucesso apareceu (sem erros vermelhos)
- [ ] Status mostra "Done in X.XXXs"

---

## 🔍 VALIDAÇÃO

### Verificar Tabelas Criadas
- [ ] Supabase Dashboard → Table Editor
- [ ] Verificar 15 tabelas (marca cada uma):
  - [ ] `financial_automation_queue`
  - [ ] `dre_metrics`
  - [ ] `financial_indicators`
  - [ ] `ar_receivable_installments`
  - [ ] `ar_payments`
  - [ ] `ar_payment_splits`
  - [ ] `payment_settlements`
  - [ ] `payment_reversals`
  - [ ] `medical_commission_models`
  - [ ] `commission_fixed_percent`
  - [ ] `commission_rate_tables`
  - [ ] `medical_commission_ledger`
  - [ ] `bank_import_transactions`
  - [ ] `bank_reconciliations`
  - [ ] `reconciliation_audit_log`

### Contar Funções Criadas
- [ ] SQL Editor → New Query
- [ ] Executar:
```sql
SELECT COUNT(*) as total_functions FROM pg_proc
WHERE proname LIKE 'fn_%' OR proname LIKE 'sp_%'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
```
- [ ] Resultado deve ser ~20+
- [ ] Documentar número: ______

### Contar Views Criadas
- [ ] SQL Editor → New Query
- [ ] Executar:
```sql
SELECT COUNT(*) as total_views FROM pg_views
WHERE schemaname = 'public';
```
- [ ] Resultado deve ter aumentado (ETAPA 1-6 criam ~5 views)
- [ ] Documentar número: ______

### Contar Triggers Criados
- [ ] SQL Editor → New Query
- [ ] Executar:
```sql
SELECT COUNT(*) as total_triggers FROM pg_trigger
WHERE tgname LIKE 'trg_%';
```
- [ ] Resultado deve ser ~7+
- [ ] Documentar número: ______

---

## 🧪 TESTES RÁPIDOS

### Teste 1: Verificar RLS ativado
- [ ] SQL Editor → New Query
- [ ] Executar:
```sql
SELECT table_name 
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY'
  AND table_schema = 'public'
  AND table_name LIKE 'ar_%' OR table_name LIKE 'payment_%'
LIMIT 5;
```
- [ ] Retornar 5+ resultados
- [ ] ✅ RLS está ativo

### Teste 2: Verificar Índices
- [ ] SQL Editor → New Query
- [ ] Executar:
```sql
SELECT COUNT(*) as total_indexes FROM pg_indexes
WHERE schemaname = 'public'
  AND (indexname LIKE 'idx_%' OR indexname LIKE 'idx_ar_%' OR indexname LIKE 'idx_payment_%');
```
- [ ] Resultado deve ser 30+
- [ ] Documentar número: ______

### Teste 3: Verificar Política RLS
- [ ] SQL Editor → New Query
- [ ] Executar:
```sql
SELECT COUNT(*) as rls_policies FROM pg_policies
WHERE schemaname = 'public';
```
- [ ] Resultado deve ser 20+
- [ ] ✅ RLS configurado corretamente

---

## 📊 ESTATÍSTICAS FINAIS

Preencher após validação:

- [ ] **Total de tabelas criadas**: _____ (esperado: 15)
- [ ] **Total de funções criadas**: _____ (esperado: 20+)
- [ ] **Total de views criadas**: _____ (esperado: 5+)
- [ ] **Total de triggers criados**: _____ (esperado: 7+)
- [ ] **Total de índices criados**: _____ (esperado: 30+)
- [ ] **Total de políticas RLS**: _____ (esperado: 20+)

---

## ⏱️ TEMPOS DE EXECUÇÃO

Registrar para referência futura:

- **Tempo de cópia**: _____ minutos
- **Tempo de paste**: _____ minutos
- **Tempo de execução SQL**: _____ minutos
- **Tempo de validação**: _____ minutos
- **Tempo total**: _____ minutos

**Meta**: 10-15 minutos total ⏱️

---

## 🎉 PÓS-EXECUÇÃO

### Limpar Dashboard
- [ ] Fechar queries não usadas
- [ ] Fechar Table Editor (se aberto)
- [ ] Fechar SQL Editor (opcional)

### Documentar Sucesso
- [ ] ✅ Anotar data/hora de conclusão: _______________
- [ ] ✅ Anotar ambiente (desenvolvimento/staging): _______________
- [ ] ✅ Anotar usuário que executou: _______________

### Próximas Etapas
- [ ] npm run dev (para testar APIs)
- [ ] Rodar 6 testes básicos
- [ ] Documentar resultados
- [ ] Iniciar ETAPA 5 (DRE Dinâmica)

---

## 📝 NOTAS

Espaço para anotações durante execução:

```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

---

## 🆘 PROBLEMAS ENCONTRADOS

Se houver erro, anotar:

```
Erro:
_________________________________________________________________

Local (linha/tabela):
_________________________________________________________________

Solução tentada:
_________________________________________________________________

Resultado:
_________________________________________________________________
```

---

**Status**: ⏳ Pronto para começar
**Última atualização**: 25 de maio de 2026
**Responsável**: _____________________
**Data conclusão**: _____________________
