# ⚡ Aplicar Migração: Campo "grupo" na Tabela service_prices

## 📋 Resumo
Foi criada uma migração SQL para adicionar o campo `grupo` à tabela `service_prices` no Supabase.

**Arquivo de migração:** `supabase/migrations/20260218_add_grupo_to_service_prices.sql`

---

## 🚀 Como Aplicar (2 Opções)

### **OPÇÃO 1: Via Dashboard Supabase (Mais Fácil)**

1. Acesse: https://app.supabase.com/project/_/sql/new
2. Cole o SQL abaixo:

```sql
ALTER TABLE service_prices
ADD COLUMN IF NOT EXISTS grupo VARCHAR(255) DEFAULT NULL;

COMMENT ON COLUMN service_prices.grupo IS 'Grupo do serviço (ex: Consultas, Exames, Procedimentos)';
```

3. Clique no botão **"RUN"** (triângulo verde)
4. Aguarde a confirmação ✅

---

### **OPÇÃO 2: Via PowerShell Script**

```powershell
cd "c:\Users\ferna\Desktop\Projeto Gesclinic Web"
.\scripts\apply_grupo_migration.ps1
```

---

## ✅ Verificar se Foi Aplicado

No dashboard Supabase:

1. Acesse **Database** → **Tables** → `service_prices`
2. Procure pela coluna `grupo` na lista de colunas
3. Deve estar com tipo: `varchar(255)` e default `NULL`

---

## 🔗 Após Aplicar a Migração

Depois que a coluna for criada:

1. **Reinicie o dev server:**
   ```powershell
   npm run dev
   ```

2. **Teste a funcionalidade:**
   - Abra "Convênios"
   - Tente adicionar um novo item de preço com o campo "Grupo"
   - Tente fazer upload de Excel/CSV com dados de grupo

3. **Erros devem desaparecer** - A tabela agora terá a coluna `grupo` esperada

---

## 📝 Detalhes da Migração

| Campo | Tipo | Padrão | Descrição |
|-------|------|--------|-----------|
| `grupo` | VARCHAR(255) | NULL | Classificação/grupo do serviço (Consultas, Exames, etc) |

A coluna é **opcional** - valores podem ser nulos.

---

## ❓ Dúvidas?

Se a migração não funcionar no PowerShell, use sempre a **OPÇÃO 1** (Dashboard).
