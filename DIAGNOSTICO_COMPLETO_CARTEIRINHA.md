# 🔴 Card_number não está salvando - Diagnóstico Completo

## O que aconteceu?

Você preencheu o campo "Matrícula / Nº Carteirinha" com `123456789012345` e clicou em "Salvar e Continuar →", mas o valor não foi persistido.

---

## 🔧 TESTE 1: Verificar Logs no Console

**Abra DevTools:**
1. Pressione `F12`
2. Vá para aba **"Console"** (não Elements)
3. Limpe o console: **Ctrl+L** ou clique no ícone de lixeira
4. **Reabra** o atendimento
5. Preencha a carteirinha novamente
6. Clique em **"Salvar e Continuar →"**

**Você DEVE ver estes logs em ordem:**

```
🔍 Verificando card_number: { valor: "123456789012345", tipo: "string", vazio: false }
```

Se **NÃO** aparecer este log:
- ❌ O campo está vazio ou não está sendo lido
- ❌ Solução: Recarregue a página (Ctrl+F5)

```
📤 Enviando dados de liberação TISS: { id: "...", payload: { card_number: "123456789012345", ... } }
```

Se **NÃO** aparecer este log:
- ❌ A validação falhou
- ❌ Verifique se o campo tem menos de 100 caracteres

```
📥 Resposta do servidor: { 
  data: [...], 
  error: null, 
  appointmentId: "...",
  cardNumberRetornado: "123456789012345"
}
```

Se aparecer `error: null` e `cardNumberRetornado`:
- ✅ Salvou com sucesso!
- Vá para Supabase e verifique: `SELECT * FROM appointments WHERE id = '...';`

---

## 🔴 Se aparecer ERRO

Se a resposta mostrar algo como:
```
error: { code: "42P01", message: "relation \"public.appointments\" does not exist" }
```
- ❌ Tabela appointments não existe
- ❌ Usar: `\dt appointments` no Supabase SQL

Se mostrar:
```
error: { code: "42703", message: "column \"card_number\" of relation \"appointments\" does not exist" }
```
- ❌ Coluna card_number não existe
- ❌ Executar SQL abaixo no Supabase

Se mostrar:
```
Nenhum registro foi atualizado. Verifique RLS policies.
```
- ❌ RLS está bloqueando UPDATE
- ❌ Executar SQL de criação de políticas abaixo

---

## 🆘 SOLUÇÃO RÁPIDA

Execute **TUDO ISTO** no Supabase SQL Editor:

```sql
-- PASSO 1: Adicionar coluna se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'card_number'
  ) THEN
    ALTER TABLE appointments ADD COLUMN card_number VARCHAR(100);
    RAISE NOTICE '✅ Coluna card_number criada';
  END IF;
END $$;

-- PASSO 2: Habilitar RLS
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- PASSO 3: Remover antigas conflitantes
DROP POLICY IF EXISTS "Users can update appointments from their clinic" ON appointments;
DROP POLICY IF EXISTS "Users can update appointments" ON appointments;
DROP POLICY IF EXISTS "Users can update own appointments" ON appointments;

-- PASSO 4: Criar política UPDATE correta
CREATE POLICY "Users can update appointments in their clinic"
ON appointments FOR UPDATE
USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()))
WITH CHECK (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

-- PASSO 5: Verificar resultado
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'appointments' AND column_name = 'card_number';
```

---

## ✅ TESTE 2: Verificar Banco Direto

Depois de executar o SQL acima, teste na Supabase com um ID real:

```sql
-- Substitua 'SEU_ID_AQUI' por um ID de appointment válido
UPDATE appointments 
SET card_number = 'TESTE123'
WHERE id = 'SEU_ID_AQUI'
RETURNING id, card_number;
```

Se retornar:
```
id                                    | card_number
--------------------------------------|------------
550e8400-e29b-41d4-a716-446655440000 | TESTE123
```

Então a tabela está OK. O problema é que o frontend pode estar em **cache**.

---

## 🔄 LIMPAR CACHE

1. **Developer Console:**
   - F12 → Application → Clear site data
   - Tipos: Cookies, Cache, Local Storage, Session Storage

2. **Ou manualmente:**
   - Feche o browser completamente
   - Abra novamente
   - Vá para `localhost:3000` na incógnita

3. **Ou force refresh:**
   - Ctrl+Shift+R (limpeza agressiva)

---

## 📋 CHECKLIST FINAL

- [ ] Executei todo o SQL no Supabase?
- [ ] Coluna `card_number` existe? (SELECT retorna?)
- [ ] RLS está habilitado? (ALTER TABLE ... ENABLE ROW LEVEL SECURITY)
- [ ] Política UPDATE existe? (SELECT * FROM pg_policies ... UPDATE)
- [ ] UPDATE manual funcionou? (TESTE123 apareceu?)
- [ ] Limpei cache do browser? (Ctrl+Shift+Del)
- [ ] Reabri aplicação? (Ctrl+F5 ou nova aba)
- [ ] DevTools mostra novos logs com '✅ Carteirinha salva'?

---

## 🎯 Se ainda não funcionar

**Copie e compartilhe:**

1. O **erro exato** do console (F12 → Console)
2. O resultado desta query Supabase:
```sql
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'appointments' AND column_name = 'card_number';
```

3. O resultado desta query:
```sql
SELECT * FROM pg_policies WHERE tablename = 'appointments' AND action = 'UPDATE';
```
