# 🔧 Guia de Debug: Carteirinha não está salvando

## Passo 1: Verificar se a coluna existe no Supabase

Acesse https://supabase.com/dashboard e execute:

```sql
-- Verificar se coluna card_number existe
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'appointments' 
ORDER BY column_name;
```

Se `card_number` NÃO aparecer, execute:

```sql
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS card_number VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_appointments_card_number ON appointments(card_number);
```

---

## Passo 2: Rebuild do Frontend

```bash
cd "c:\Users\ferna\Desktop\Projeto Gesclinic Web"
npm run build
npm run preview
```

Ou para desenvolvimento:
```bash
npm run dev
```

---

## Passo 3: Testar e Verificar Console

1. Abra **DevTools** (F12)
2. Vá para aba **Console**
3. Abra um atendimento existente
4. Clique na aba **"Liberação (Padrão TISS)"**
5. Preencha o campo **"Matrícula / Nº Carteirinha"** com um número
6. Clique **"Salvar e Continuar →"**

**Procure pelos logs:**
- 🔍 `Verificando card_number: { valor: "...", tipo: "string", vazio: false }`
- 📤 `Enviando dados de liberação TISS: { id: "...", payload: { card_number: "...", ... } }`
- 📥 `Resposta do servidor: { data: [...], error: null, cardNumberRetornado: "..." }`

---

## Passo 4: Interpretar Erros

### ❌ Erro "Nenhum registro foi atualizado"
**Causa:** Problema de **RLS (Row Level Security)**
**Solução:** 
```sql
-- Verificar políticas RLS
SELECT * FROM pg_policies WHERE tablename = 'appointments';

-- Se nenhuma aparecer, adicionar:
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can update own clinic appointments" 
ON appointments FOR UPDATE
USING (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()))
WITH CHECK (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()));
```

### ❌ Erro "Column 'card_number' does not exist"
**Causa:** Coluna não foi criada
**Solução:** Executar SQL do Passo 1

### ❌ Erro "value too long for type"
**Causa:** Carteirinha com mais de 100 caracteres
**Solução:** Aumentar tamanho:
```sql
ALTER TABLE appointments ALTER COLUMN card_number TYPE VARCHAR(200);
```

---

## Passo 5: Verificar Dados Salvos

```sql
SELECT id, card_number, authorization_number 
FROM appointments 
ORDER BY updated_at DESC 
LIMIT 5;
```

Deve mostrar:
```
id                                    | card_number      | authorization_number
---------------------------------------|------------------|--------------------
550e8400-e29b-41d4-a716-446655440000 | 123456789012345 | NULL
```

---

## 📊 Checklist de Diagnóstico

- [ ] Coluna `card_number` existe em `appointments`?
- [ ] RLS está habilitado?
- [ ] Políticas RLS permitem UPDATE?
- [ ] DevTools Console mostra logs com valores?
- [ ] SELECT retorna valores?
- [ ] Carteirinha tem menos de 100 caracteres?

---

## 📞 Próximos Passos

1. **Se logs aparecerem normalmente:** Problema provavelmente é RLS
2. **Se nenhum log aparecer:** Frontend pode estar em cache (limpar cache de build)
3. **Se erro "column does not exist":** Executar migração SQL acima
4. **Se sucesso:** Problema resolvido! ✅

Compartilhe os **logs exactos do console** se precisar de mais ajuda.
