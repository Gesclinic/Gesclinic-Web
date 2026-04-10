# 🎉 Salas - Sincronização Completa

## 📋 Resumo da Situação

### ✅ Frontend (React) - COMPLETO
O formulário e a página de salas foram corrigidos para usar apenas os campos que realmente existem no banco de dados.

**Campos removidos (não existiam):**
- ❌ services_allowed
- ❌ resources  
- ❌ location
- ❌ status

**Campos mantidos (já existem):**
- ✅ name
- ✅ type
- ✅ unit
- ✅ description
- ✅ capacity
- ✅ is_active

**Campos adicionados (necessários):**
- ✅ room_number (novo no frontend, precisa no banco)

---

### ❌ Backend (Supabase) - FALTA 1 COLUNA

A tabela `rooms` precisa da coluna `room_number`.

---

## 🚀 Como Adicionar a Coluna

### Opção 1️⃣: Copiar e Colar (5 segundos)

**Copie este SQL:**

```sql
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS room_number VARCHAR(50);
CREATE INDEX IF NOT EXISTS idx_rooms_room_number ON rooms(room_number);
CREATE INDEX IF NOT EXISTS idx_rooms_clinic_room_number ON rooms(clinic_id, room_number);
SELECT 'Coluna room_number adicionada com sucesso!' as status;
```

**Execute aqui:**
1. Abra: https://app.supabase.com
2. Seu projeto → SQL Editor → New Query
3. Cole o SQL
4. Clique em Run
5. Pronto! ✅

---

### Opção 2️⃣: Arquivo Migration

Executar via CLI (se tiver instalado):

```bash
supabase db push supabase/migrations/2026-01-18_add_room_number_to_rooms.sql
```

---

## 📊 Antes vs Depois

### ANTES (Errava)
```
Campos do Formulário:
- name ✅
- room_number ❌ (não existia no banco)
- type ✅
- services_allowed ❌ (não existia no banco)
- resources ❌ (não existia no banco)
```

### DEPOIS (Funciona)
```
Campos da Tabela:
- id ✅
- clinic_id ✅
- name ✅
- room_number ✅ (NOVO)
- type ✅
- unit ✅
- description ✅
- capacity ✅
- is_active ✅
- created_at ✅
- updated_at ✅
```

---

## ✨ Teste Completo

Após executar o SQL no Supabase:

```bash
# 1. Acesse a página
http://localhost:3000/clinica/base-sistema/salas

# 2. Clique em "+ Nova Sala"

# 3. Preencha:
Nome: "Consultório Principal"
Número: "201"
Tipo: "Consultório"
Unidade: "Piso 2"
Descrição: "Consultório com equipamento completo"
Capacidade: "2"
Ativo: [x] marcado

# 4. Clique em "Criar"

# 5. Verifique na tabela se apareceu
✅ Sala criada com sucesso!
```

---

## 📁 Arquivos Criados para Referência

```
├── supabase/migrations/
│   └── 2026-01-18_add_room_number_to_rooms.sql  ← SQL Migration
│
└── Documentação/
    ├── SQL_PARA_SUPABASE_ROOMS.txt              ← Copiar e Colar (Fácil)
    ├── INSTRUCOES_ADICIONAR_ROOM_NUMBER.md      ← Passos Detalhados
    ├── SINCRONIZACAO_ROOMS_COMPLETA.md          ← Técnico
    └── RESUMO_SINCRONIZACAO_ROOMS.txt           ← Resumido
```

---

## 🎯 Checklist Final

- [ ] Copie o SQL acima
- [ ] Abra Supabase SQL Editor
- [ ] Execute o SQL
- [ ] Verifique mensagem de sucesso
- [ ] Recarregue a página (F5)
- [ ] Teste criar uma sala
- [ ] Verifique se aparece na listagem
- [ ] ✅ Pronto!

---

## 💡 Dicas

**Se receber erro:**

| Erro | Causa | Solução |
|------|-------|--------|
| "Column already exists" | Coluna já foi adicionada | Ignore, é normal |
| "Table not found" | Tabela rooms não existe | Verificar projeto Supabase |
| Outro erro | Problema de sintaxe | Copie o SQL novamente |

---

## 🔄 Se Precisar Reverter

```sql
DROP INDEX IF EXISTS idx_rooms_clinic_room_number;
DROP INDEX IF EXISTS idx_rooms_room_number;
ALTER TABLE rooms DROP COLUMN IF EXISTS room_number;
```

---

**Gerado:** 18 de Janeiro de 2026  
**Status:** ✅ Pronto para Produção  
**Tempo estimado:** 5 minutos  
