# 🚀 APLICAR MIGRAÇÕES AGORA - GUIA FINAL

**Status**: ✅ Arquivos SQL criados e prontos  
**Tempo**: ~45 minutos  
**Próxima Ação**: Abrir Supabase e aplicar

---

## ⚡ 4 PASSOS SIMPLES

### PASSO 1: Criar Backup (10-15 min)

```
1. Abrir: https://app.supabase.com/
2. Projeto → Settings → Backups
3. Clicar "Start backup"
4. Aguardar conclusão (você recebe email)
```

**Enquanto aguarda (paralelamente)**:
- Continue com Passos 2-4 abaixo
- Não precisa esperar o backup acabar para começar as migrations

---

### PASSO 2: Aplicar FASE 6-8 Migration (5 min)

```
1. Supabase → SQL Editor
2. Novo Query (botão)
3. Ir para arquivo: supabase/migrations/2026-06-06_fase6-8_architectural_prep.sql
4. Copiar TODO o conteúdo do arquivo
5. Colar no SQL Editor do Supabase
6. Clicar "Run"
7. Aguardar: "Query executed successfully" (verde)
```

**Verificar se funcionou** (copiar e colar no SQL Editor):
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'appointment_services' 
ORDER BY column_name;
```

Esperado: Ver colunas novas (`plan_id`, `authorization_number`, `professional_percentage`, etc)

---

### PASSO 3: Aplicar FASE 9-11 Migration (5 min)

```
1. SQL Editor → Novo Query
2. Ir para arquivo: supabase/migrations/2026-06-06_fase9-11_financial_integration.sql
3. Copiar TODO o conteúdo do arquivo
4. Colar no SQL Editor do Supabase
5. Clicar "Run"
6. Aguardar: "Query executed successfully" (verde)
```

**Verificar se funcionou** (copiar e colar no SQL Editor):
```sql
SELECT table_name, table_type FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'VIEW'
  AND table_name LIKE 'vw_%'
ORDER BY table_name;
```

Esperado: Ver 3 views novas
- `vw_billing_report`
- `vw_production_report`
- `vw_receivables_report`

---

### PASSO 4: Validar Triggers (5 min)

```sql
-- Copiar e colar no SQL Editor:
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY trigger_name;
```

Esperado: Ver 2 triggers
- `create_receivable_on_appointment_attended`
- `sync_cashflow_on_receivable_update`

---

## ✅ PRONTO!

Quando os 4 passos forem concluídos:

```
✅ Colunas adicionadas
✅ Views criadas
✅ Triggers criados
✅ FASE 9-11 100% FUNCIONAL
```

---

## 📍 LOCALIZAÇÃO DOS ARQUIVOS SQL

```
Arquivo 1: c:\dev\gesclinic-web\supabase\migrations\2026-06-06_fase6-8_architectural_prep.sql
Arquivo 2: c:\dev\gesclinic-web\supabase\migrations\2026-06-06_fase9-11_financial_integration.sql
```

---

## 🧪 TESTAR OS TRIGGERS (Opcional, Mas Recomendado)

Depois que as migrações forem aplicadas, testar se os triggers funcionam:

### Teste 1: Criar Receivable Automaticamente

```sql
-- 1. Criar appointment de teste (substituir IDs de verdade)
INSERT INTO appointments (
  clinic_id, 
  patient_id, 
  professional_id, 
  service_id, 
  payer_id, 
  scheduled_date, 
  scheduled_time, 
  status
) VALUES (
  'SEU_CLINIC_ID',     -- Substituir
  'SEU_PATIENT_ID',    -- Substituir
  'SEU_PROF_ID',       -- Substituir
  'SEU_SERVICE_ID',    -- Substituir
  'SEU_PAYER_ID',      -- Substituir
  NOW()::DATE,
  '10:00',
  'confirmed'
) RETURNING id;

-- 2. Copiar o ID retornado acima

-- 3. Marcar como "attended" para disparar trigger
UPDATE appointments 
SET status = 'attended', updated_at = NOW()
WHERE id = 'COLE_ID_AQUI';

-- 4. Verificar que receivable foi criado
SELECT id, appointment_id, amount, status 
FROM ar_receivables 
WHERE appointment_id = 'COLE_ID_AQUI';
```

---

## 🎯 RESUMO

| Ação | Tempo | Status |
|------|-------|--------|
| Backup | 10-15 min | ⏳ Paralelo |
| FASE 6-8 SQL | 5 min | ⏳ |
| FASE 9-11 SQL | 5 min | ⏳ |
| Validar Triggers | 5 min | ⏳ |
| Testar | 10 min | ⏳ Opcional |
| **TOTAL** | **~35-45 min** | **⏳** |

---

## 🎓 DEPOIS DISSO

Quando tudo estiver aplicado:

```
✅ FASE 9-11 COMPLETAMENTE FUNCIONAL
✅ BD SINCRONIZADO COM CÓDIGO
✅ Triggers automáticos funcionando
✅ Views de relatórios criadas

Próximo: FASE 12-17 (Testes & Deploy)
Tempo: ~18 horas (podem ser feitas amanhã)
```

---

## 📋 CHECKLIST

- [ ] Backup iniciado (Settings → Backups)
- [ ] FASE 6-8 migration copiada e executada
- [ ] Verificação de colunas: 8 novas colunas ✓
- [ ] FASE 9-11 migration copiada e executada
- [ ] Verificação de views: 3 views criadas ✓
- [ ] Verificação de triggers: 2 triggers criados ✓
- [ ] ✅ MIGRAÇÕES APLICADAS COM SUCESSO!

---

**Próxima Ação**: Abrir Supabase e começar com PASSO 1 (backup)

Você sabe onde estão seus IDs de clinic/patient/professional para testar? Se não souber, você pode deixar apenas confirmar que as migrações foram aplicadas sem testar os triggers (ainda funcionarão quando triggers realmente forem disparados no app).

