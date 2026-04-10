# 🔧 EXECUTAR MIGRAÇÕES DE REPASSE - Passo a Passo

**Status:** Você está no Supabase SQL Editor (visto na imagem)  
**Ação:** Copiar + Executar 1 SQL  
**Tempo:** 5 minutos  
**Resultado:** 5 tabelas criadas + RLS habilitado

---

## ⚡ QUICK START (2 passos)

### PASSO 1: Copie o SQL consolidado

```bash
Arquivo: supabase/migrations/20260318_CONSOLIDADO_REPASSE_TABLES.sql
```

Abra este arquivo no seu editor (já criado no projeto)

### PASSO 2: Cole no Supabase SQL Editor

1. **No seu browser Supabase** (já aberto)
2. Abra uma **nova aba** no SQL Editor (botão `+`)
3. Cole TODO o conteúdo do arquivo consolidado
4. Clique **"Run"** (botão verde no canto inferior direito)

**Resultado esperado:**
```
✅ Query successful - 0 rows returned
```

---

## 📋 O QUE VAI SER CRIADO

```
Tabela 1: repasse_config_servico
 ├─ Repasse por serviço individual
 ├─ Com suporte a múltiplos regimes fiscais
 └─ 6 índices

Tabela 2: repasse_config  
 ├─ Repasse com 7 regimes preconfigados
 ├─ Simples (3%, 5%), Presumido, Real
 └─ 5 índices

Tabela 3: medical_repasse_config
 ├─ Configuração por profissional (70/30 padrão)
 ├─ Flags: aplicar_imposto, aplicar_glosa
 └─ 3 índices

Tabela 4: medical_production
 ├─ Base do cálculo (valor bruto/líquido)
 ├─ Tipo: consulta, exame, cirurgia
 └─ 4 índices

Tabela 5: medical_repasse
 ├─ Resultado do repasse calculado
 ├─ Status: pendente, processado, pago
 └─ 4 índices

RLS: ✅ Habilitado em todas (5 políticas por tabela)
Total Índices: 22
Total Políticas: 15
```

---

## ✅ VALIDAR APÓS EXECUÇÃO

Cole estas 3 queries no SQL Editor (uma por vez):

### Query 1: Verificar tabelas criadas

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_name IN (
  'repasse_config_servico',
  'repasse_config',
  'medical_repasse_config',
  'medical_production',
  'medical_repasse'
)
ORDER BY table_name;
```

**Resultado esperado:** 5 rows ✅

```
repasse_config
repasse_config_servico
medical_production
medical_repasse
medical_repasse_config
```

### Query 2: Verificar índices criados

```sql
SELECT indexname, tablename FROM pg_indexes 
WHERE tablename IN (
  'repasse_config_servico',
  'repasse_config',
  'medical_repasse_config',
  'medical_production',
  'medical_repasse'
)
ORDER BY tablename;
```

**Resultado esperado:** 22 rows (índices)

### Query 3: Verificar RLS habilitado

```sql
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true
AND tablename IN (
  'repasse_config_servico',
  'repasse_config',
  'medical_repasse_config',
  'medical_production',
  'medical_repasse'
);
```

**Resultado esperado:** 5 rows ✅ (RLS habilitado em todas)

---

## 🚨 SE ALGO DER ERRO

### Erro: "relation ... already exists"
**Causa:** Tabela já foi criada antes  
**Solução:** Execute de novo (usa `IF NOT EXISTS`, é seguro)

### Erro: "foreign key violation"
**Causa:** Tabelas faltando (clinics, professionals, services)  
**Solução:** Use RLS disable query abaixo para verificar

### Verificar RLS Conflitos

```sql
-- Ver todas as políticas RLS
SELECT schemaname, tablename, policyname FROM pg_policies 
WHERE tablename IN (
  'repasse_config_servico',
  'repasse_config',
  'medical_repasse_config',
  'medical_production',
  'medical_repasse'
);
```

---

## 📍 PRÓXIMO PASSO

Depois de validar as 3 queries acima ✅:

1. **Se passou ✅** → Volte aqui e execute `PHASE_1_SQL` (appointment_financial_integration)
2. **Se falhou** → Avise o erro exato aqui

---

## 🎯 CHECKLIST FINAL

- [x] Arquivo consolidado criado: `20260318_CONSOLIDADO_REPASSE_TABLES.sql`
- [ ] Copiar SQL do arquivo
- [ ] Colar no Supabase SQL Editor
- [ ] Executar (botão verde "Run")
- [ ] Validar Query 1 (5 tabelas) ✅
- [ ] Validar Query 2 (22 índices) ✅
- [ ] Validar Query 3 (5 RLS) ✅
- [ ] Informar: "Migrações OK ✅"
- [ ] Próximo: Executar PHASE 1 SQL

---

## 📞 SUPORTE RÁPIDO

**Está vendo este erro?**

```
ERROR: relation "user_roles" does not exist
```

**Solução:** Isso é NORMAL! A migration precisa de user_roles que deve existir do INIT.sql

Execute primeiro:

```sql
-- Verificar se user_roles existe
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'user_roles';
```

Se não existir → use migrations anteriores (`00_SAFE_INIT.sql`)

---

**👉 Pronto? Copie o arquivo e execute no Supabase SQL Editor! ⚡**
