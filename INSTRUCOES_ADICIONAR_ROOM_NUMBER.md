# 🚀 Adicionar room_number à Tabela Rooms - Supabase

## 📋 Resumo
Este SQL adiciona a coluna `room_number` à tabela `rooms`, que é usada pelo formulário de gerenciamento de salas.

## ✅ O Que Será Adicionado

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `room_number` | VARCHAR(50) | Identificador/número da sala (ex: 201, A1, Consultório 1) |

## 🔧 Índices Criados
- `idx_rooms_room_number` - Busca rápida por número de sala
- `idx_rooms_clinic_room_number` - Busca por clínica + número de sala

## 🎯 Como Executar no Supabase

### Opção 1: SQL Editor (Recomendado)
1. Acesse [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá para **SQL Editor**
4. Clique em **New Query**
5. Cole o SQL abaixo:

```sql
-- Adicionar coluna room_number à tabela rooms
ALTER TABLE rooms
ADD COLUMN IF NOT EXISTS room_number VARCHAR(50);

-- Criar índice para busca rápida por número de sala
CREATE INDEX IF NOT EXISTS idx_rooms_room_number ON rooms(room_number);

-- Criar índice composto para clinic_id + room_number
CREATE INDEX IF NOT EXISTS idx_rooms_clinic_room_number ON rooms(clinic_id, room_number);

-- Confirmação
SELECT 'Coluna room_number adicionada com sucesso!' as status;
```

6. Clique em **Run** (ou `Ctrl + Enter`)
7. Veja a confirmação: "Coluna room_number adicionada com sucesso!"

### Opção 2: Via CLI (se tiver Supabase CLI instalado)
```bash
supabase db push supabase/migrations/2026-01-18_add_room_number_to_rooms.sql
```

## ✨ Resultado Esperado
Após executar:
- ✅ Coluna `room_number` adicionada à tabela `rooms`
- ✅ Índices de performance criados
- ✅ Formulário de salas funcionará corretamente

## 📝 Campos Agora Disponíveis no Formulário
- ✅ Nome (name) - obrigatório
- ✅ Número/Identificador (room_number) - nova coluna
- ✅ Tipo (type)
- ✅ Unidade (unit)
- ✅ Descrição (description)
- ✅ Capacidade (capacity)
- ✅ Ativo (is_active)

## 🔄 Se Precisar Reverter
```sql
DROP INDEX IF EXISTS idx_rooms_clinic_room_number;
DROP INDEX IF EXISTS idx_rooms_room_number;
ALTER TABLE rooms DROP COLUMN IF EXISTS room_number;
```

---
**Data:** 18 de Janeiro de 2026
**Status:** Pronto para aplicar
