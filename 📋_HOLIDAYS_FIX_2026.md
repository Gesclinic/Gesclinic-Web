# 🎉 FIX: Sistema de Feriados 2026

## ⚠️ IMPORTANTE: EXECUTE O SQL PRIMEIRO!

**Antes de fazer qualquer teste**, você PRECISA aplicar as RLS policies corrigidas no Supabase:

### Passo 0: Aplicar SQL Fix

1. Abra **Supabase → SQL Editor**
2. Abra o arquivo: `⚡_SQL_FIX_HOLIDAYS_RLS.sql`
3. Cole o código completo no editor
4. Clique em **Run** (verde)
5. Veja o resultado: Deve dizer ✅ 

**O que faz:**
- Remove policies antigas que bloqueavam feriados nacionais
- Cria policies novas que permitem `clinic_id IS NULL`

## ✅ O que foi corrigido

### 1️⃣ **Seed de Feriados Desativada**
- ❌ `seedNationalHolidays()` estava comentada em `AgendaIndex`
- ✅ Ativada: Agora roda automaticamente quando você entra na Agenda

### 2️⃣ **Inserção de Feriados**
- ❌ Antes: Inserindo com `clinic_id = 'NACIONAL_SEED'` (string)
- ✅ Agora: Inserindo com `clinic_id = NULL` (para indicar nacional)

### 3️⃣ **Query de Busca**
- ❌ Antes: `.in('date', dates)` - retornava todos
- ✅ Agora: `.or(\`clinic_id.is.null,clinic_id.eq.${clinicId}\`)` - busca nacionais + locais

### 4️⃣ **Normalização de Datas**
- ✅ Agora remove timestamp se tiver: `"2026-01-01T00:00:00" → "2026-01-01"`

### 5️⃣ **RLS Policies**
- ❌ Antes: `clinic_id = holidays.clinic_id` (não funciona se NULL)
- ✅ Agora: `clinic_id IS NULL OR (admin check)` - permite feriados nacionais

## 🚀 Como testar

### Passo 1: Abrir console do browser
```
F12 → Console
```

### Passo 2: Logar na app
- Ir a `http://localhost:3001`
- Login com suas credenciais
- Ir para **Agenda** (/clinica/agenda)

### Passo 3: Olhar os logs
Você deve ver no console:

```
🌱 [Seed] Iniciando seed de feriados 2026
📋 [Seed] Total de feriados a inserir: 12
✅ [Seed] Feriados 2026 inseridos/atualizados com sucesso
📊 [Seed] Total de feriados nacionais em 2026: 12

🔍 checkMultipleDates
✅ Feriados encontrados: 12
🗓️ Processando: 2026-01-01 Confraternização Universal
🗓️ Processando: 2026-02-13 Carnaval
... (outros feriados)
🎯 Retornando 12 datas com feriado: 2026-01-01, 2026-02-13, ...
```

### Passo 4: Verificar Visual
No debug banner da Agenda, deve aparecer:
```
Feriados encontrados: 12
Datas com feriado: 2026-01-01, 2026-02-13, 2026-02-14, ...
```

## 📊 Feriados 2026

Os seguintes feriados serão populados:

| Data | Feriado |
|------|---------|
| 2026-01-01 | Confraternização Universal |
| 2026-02-13 | Carnaval |
| 2026-02-14 | Sexta-feira de Carnaval |
| 2026-02-17 | Terça-feira de Carnaval |
| 2026-04-03 | Sexta-feira Santa |
| 2026-04-21 | Tiradentes |
| 2026-05-01 | Dia do Trabalho |
| 2026-09-07 | Independência do Brasil |
| 2026-10-12 | Nossa Senhora Aparecida |
| 2026-11-02 | Finados |
| 2026-11-20 | Consciência Negra |
| 2026-12-25 | Natal |

## 🔧 Arquivos Modificados

1. **[src/lib/holidaysApi.js](src/lib/holidaysApi.js)**
   - Função `seedNationalHolidays()` - Usa `clinic_id: null` para nacionais
   - Função `checkMultipleDates()` - Query melhorada com `.or()` para buscar nacionais + locais
   - Adicionado logs detalhados para debug

2. **[src/pages/clinica/agenda/components/index.jsx](src/pages/clinica/agenda/components/index.jsx)**
   - Descomentado `useEffect` que chama `seedNationalHolidays()`
   - Agora roda automaticamente quando `clinicId` está disponível

3. **[supabase/migrations/20260206_holidays_system.sql](supabase/migrations/20260206_holidays_system.sql)**
   - RLS policies atualizadas para permitir `clinic_id IS NULL`
   - INSERT, UPDATE, DELETE agora funcionam para feriados nacionais

## 🐛 Troubleshooting

### "Feriados encontrados: X, Datas com feriado: (vazio)"

**Solução:**
1. Verifique se aplicou o SQL fix (⚡_SQL_FIX_HOLIDAYS_RLS.sql)
2. Abra DevTools (F12) → Console
3. Procure por `❌` para ver o erro específico

### "Erro: invalid request body: {clinic_id}"

**Causa:** RLS Policy bloqueando
**Solução:** Aplicar o SQL fix acima

### Nenhum log aparecendo

**Causa:** Seed pode estar comentado ou não rodando
**Solução:** 
1. Verifique se está em http://localhost:3001/clinica/agenda
2. Se não ver logs, abra incognito (fresh session)
3. Recarregue a página (F5)

## 📝 Notas

- Seed roda **UMA VEZ** por session quando você entra na Agenda
- Se quiser forçar de novo: Clear Browser Cache ou abrir em incognito
- Feriados são **globais** (clinic_id = NULL) dentro do escopo NACIONAL
- Cada clínica pode ter feriados **específicos** (com clinic_id preenchido)

---

**Versão:** 1.0
**Última atualização:** 2026-01-30
**Status:** ✅ Pronto para testar

