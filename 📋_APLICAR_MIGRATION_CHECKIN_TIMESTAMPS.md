# 🔧 Como Aplicar a Migração SQL para Check-in Timestamps

**Data:** 2026-01-19  
**Status:** 📋 Pronto para Aplicar  
**Colunas Adicionadas:** 4 (chegada_em, liberado_em, em_atendimento_em, finalizado_em)

---

## 📍 O que será feito?

Este SQL adiciona 4 colunas de timestamp à tabela `appointments` para rastrear o fluxo de check-in:

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `chegada_em` | TIMESTAMP | Quando paciente marca "Presente" na recepção |
| `liberado_em` | TIMESTAMP | Quando paciente é liberado para atendimento |
| `em_atendimento_em` | TIMESTAMP | Quando profissional inicia atendimento |
| `finalizado_em` | TIMESTAMP | Quando atendimento é finalizado |

---

## 🚀 Como Aplicar (3 Opções)

### Opção 1: Via Supabase SQL Editor (Recomendado)

1. **Abra o Supabase Dashboard**
   - Acesse: https://app.supabase.com
   - Selecione seu projeto

2. **Vá para SQL Editor**
   - Menu esquerdo → "SQL Editor"
   - Clique em "New Query"

3. **Copie e Cole o SQL**
   - Abra: `supabase/migrations/2026-01-19_add_checkin_timestamps.sql`
   - Copie TODO o conteúdo
   - Cole no SQL Editor do Supabase

4. **Execute**
   - Clique em "Run" (ou Ctrl+Enter)
   - Aguarde conclusão (geralmente 2-5 segundos)
   - Veja mensagem de sucesso

5. **Verifique**
   - Menu esquerdo → "Table Editor"
   - Clique em "appointments"
   - Scroll direita para ver as novas colunas

---

### Opção 2: Via PowerShell (Script Local)

```powershell
# Abra PowerShell na pasta do projeto
cd "c:\Users\ferna\Desktop\Projeto Gesclinic Web"

# Execute o script (salvar como apply_checkin_migration.ps1)
$sqlContent = Get-Content "supabase/migrations/2026-01-19_add_checkin_timestamps.sql" -Raw
# Copie o SQL e cole no Supabase SQL Editor (usar Opção 1 é mais seguro)
```

---

### Opção 3: Via Arquivo SQL no Supabase

Se o Supabase estiver configurado com migrações automáticas:

```bash
# Copie o arquivo para a pasta de migrações do Supabase local (se usar)
cp supabase/migrations/2026-01-19_add_checkin_timestamps.sql ./migrations/
```

---

## ✅ Verificação Pós-Aplicação

Depois de aplicar o SQL, verifique se tudo funcionou:

### 1. Verifique as Colunas
```sql
-- Execute no Supabase SQL Editor
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'appointments'
AND column_name IN ('chegada_em', 'liberado_em', 'em_atendimento_em', 'finalizado_em')
ORDER BY ordinal_position;
```

**Resultado esperado:**
```
column_name          | data_type
---------------------|-----------------------------
chegada_em           | timestamp with time zone
liberado_em          | timestamp with time zone
em_atendimento_em    | timestamp with time zone
finalizado_em        | timestamp with time zone
```

### 2. Verifique os Índices
```sql
-- Execute no Supabase SQL Editor
SELECT indexname FROM pg_indexes
WHERE tablename = 'appointments'
AND indexname LIKE '%chegada%' OR indexname LIKE '%liberado%' OR indexname LIKE '%atendimento%' OR indexname LIKE '%finalizado%';
```

**Resultado esperado:** 4 índices listados

### 3. Verifique os Triggers
```sql
-- Execute no Supabase SQL Editor
SELECT trigger_name FROM information_schema.triggers
WHERE event_object_table = 'appointments'
AND trigger_name LIKE 'trigger_update%';
```

**Resultado esperado:** 4 triggers listados

---

## 🧪 Teste o Fluxo (Depois da Migração)

1. **Abra a agenda** em localhost:3000/clinica/agenda
2. **Clique [📋 Check-in]** em um paciente
3. **Clique [📍 Registrar Presença]**
   - ✅ Deve mudar status para "Presente"
   - ✅ Coluna `chegada_em` recebe timestamp
4. **Complete Checklist**
5. **Clique [🟢 Liberar para Atendimento]**
   - ✅ Deve mudar status para "Pronto Atendimento"
   - ✅ Coluna `liberado_em` recebe timestamp
6. **Verifique no Supabase** (Table Editor → appointments)
   - Procure a linha do paciente
   - Veja as colunas com timestamps

---

## ❌ Se Algo der Errado

### Erro: "Column already exists"
- As colunas já foram adicionadas anteriormente
- Isso é OK! O SQL usa `ADD COLUMN IF NOT EXISTS`, então é seguro executar novamente

### Erro: "Trigger already exists"
- Os triggers já foram criados
- Isso é OK! O SQL usa `DROP TRIGGER IF NOT EXISTS`, então substitui automaticamente

### Status não muda
- Verifique se o código do frontend foi restaurado com as referências às colunas
- Recarregue a página do browser (Ctrl+Shift+R para cache limpo)
- Verifique o console do browser para erros

### Timestamps não aparecem
- Aguarde 5 segundos após realizar a ação
- Recarregue a página do Supabase Table Editor
- Procure pelas colunas no final (scroll para direita)

---

## 📊 O que Cada Trigger Faz

| Trigger | Ativado quando | Ação |
|---------|---|---|
| `trigger_update_chegada_em` | Status → `presente` | Define `chegada_em` = NOW() |
| `trigger_update_liberado_em` | Status → `pronto_atendimento` | Define `liberado_em` = NOW() |
| `trigger_update_em_atendimento_em` | Status → `em_atendimento` | Define `em_atendimento_em` = NOW() |
| `trigger_update_finalizado_em` | Status → `finalizado` | Define `finalizado_em` = NOW() |

---

## 🎯 Próximos Passos

Depois que a migração for aplicada:

1. ✅ Aplique o SQL no Supabase
2. ✅ Verifique as colunas foram criadas
3. ✅ Teste o fluxo de check-in
4. ✅ Veja os timestamps sendo preenchidos automaticamente
5. ✅ Pronto! Sistema rastreando o fluxo completo

---

## 📝 Referência do SQL

- **Tipo:** Data Definition Language (DDL)
- **Alteração:** Structural (adiciona colunas)
- **Impacto:** Nenhum para dados existentes (colunas nullable)
- **Reversível:** Sim (pode dropar as colunas se necessário)
- **Segurança:** 100% (usa IF NOT EXISTS)

---

**Status:** 🟢 PRONTO PARA USAR  
**Arquivo:** `supabase/migrations/2026-01-19_add_checkin_timestamps.sql`

Aplique agora! 🚀
