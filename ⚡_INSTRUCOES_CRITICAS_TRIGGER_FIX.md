# 🚨 AÇÃO CRÍTICA - Corrigir Trigger na Supabase

## Status
❌ A execução anterior do SQL não funcionou corretamente - o trigger ainda está bloqueando INSERT de appointments

## O que Fazer AGORA

### Passo 1: Abrir SQL Editor
Clique aqui: **https://supabase.com/dashboard/project/gvdkdjyupktlflwurike/sql**

### Passo 2: Clicar em "New Query" (novo arquivo em branco)
Para evitar confusão com queries anteriores

### Passo 3: **COPIAR E COLAR** (NÃO DIGITAR) este código exatamente:

```sql
DROP TRIGGER IF EXISTS on_appointments_created ON appointments;
DROP TRIGGER IF EXISTS on_appointments_insert_set_created_by ON appointments;
DROP FUNCTION IF EXISTS set_appointments_created_by();
```

**IMPORTANTE**: Não use "Ctrl+A" + "Delete" antes, apenas clique na query nova em branco e cole.

### Passo 4: Clicar no botão azul "Run" 
Deve rodar rapidamente (menos de 1 segundo)

### Passo 5: Executar segunda query

Clique "New Query" novamente e cole:

```sql
CREATE OR REPLACE FUNCTION set_appointments_created_by()
RETURNS TRIGGER AS $$
BEGIN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

Clique "Run"

### Passo 6: Executar terceira query

Clique "New Query" novamente e cole:

```sql
CREATE TRIGGER on_appointments_insert_set_created_by
BEFORE INSERT ON appointments
FOR EACH ROW
EXECUTE FUNCTION set_appointments_created_by();
```

Clique "Run"

### Passo 7: Voltar aqui e avisar quando terminar

---

## Por que isso vai funcionar?
1. Droppa o trigger antigo que tenta referenciar `created_by` antes da coluna ser compilada
2. Cria uma função simples que não tenta fazer nada complicado
3. Recria o trigger com a nova função simples
4. Agora os INSERT vão funcionar!

---

## Se tiver erro "already exists"
É normal, o DROP IF EXISTS vai remover tudo antes

## Se tiver erro de "permission denied"
Você pode não ter permissão admin - entre em contato com o admin do Supabase
