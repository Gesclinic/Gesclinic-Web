🎯 **INSTRUÇÕES MANUAL - EXECUTE OS 3 PASSOS NO SUPABASE SQL EDITOR**

═══════════════════════════════════════════════════════════════════════════════

⚠️ **AVISO IMPORTANTE**

O browser automation teve problemas ao acessar o Supabase SQL Editor.
Você precisa executar os 3 SQLs MANUALMENTE no Supabase.

Não se preocupe - é bem rápido! (~2 minutos)

═══════════════════════════════════════════════════════════════════════════════

✅ PASSO 1 - COPIE E COLE NO SUPABASE

1. Abra: https://supabase.com/dashboard/project/gvdkdjyupktlflwurike/sql
2. Clique em "New query" (ou crie uma nova query)
3. COPIE TODO O SQL ABAIXO (começando em CREATE TABLE até o último semicolon):

```sql
CREATE TABLE IF NOT EXISTS card_processors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  settlement_day INT NOT NULL CHECK (settlement_day >= 1 AND settlement_day <= 31),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(clinic_id, name)
);

ALTER TABLE card_processors ENABLE ROW LEVEL SECURITY;

CREATE POLICY card_processors_clinic_isolation ON card_processors
  FOR SELECT USING (clinic_id = auth.jwt() ->> 'clinic_id');

CREATE POLICY card_processors_insert ON card_processors
  FOR INSERT WITH CHECK (clinic_id = auth.jwt() ->> 'clinic_id');

CREATE POLICY card_processors_update ON card_processors
  FOR UPDATE USING (clinic_id = auth.jwt() ->> 'clinic_id');

CREATE POLICY card_processors_delete ON card_processors
  FOR DELETE USING (clinic_id = auth.jwt() ->> 'clinic_id');
```

4. Cole no editor SQL
5. Clique no botão "Run" (botão azul, superior direito)
6. Aguarde: deve mostrar ✅ "Success. No rows returned"

═══════════════════════════════════════════════════════════════════════════════

✅ PASSO 2 - ADICIONE A COLUNA

1. Nova query (ou limpe o editor anterior)
2. COPIE TODO O SQL ABAIXO:

```sql
ALTER TABLE clinic_payment_cards 
  ADD COLUMN IF NOT EXISTS processor_id UUID REFERENCES card_processors(id) ON DELETE SET NULL;
```

3. Cole no editor SQL
4. Clique "Run"
5. Aguarde: deve mostrar ✅ "Success. No rows returned"

═══════════════════════════════════════════════════════════════════════════════

✅ PASSO 3 - INSIRA AS 6 OPERADORAS PADRÃO

Primeiro, descubra seu clinic_id:

1. Nova query
2. COPIE:

```sql
SELECT id FROM clinics LIMIT 1;
```

3. Clique "Run"
4. Copie o valor do campo "id" que aparece na tabela de resultados
5. Ex: se vê `dcee437c-fd14-463c-b25e-a318f5da60b7`, copie esse valor

Agora insira as operadoras:

1. Nova query
2. COPIE E MODIFIQUE o SQL abaixo (substitua {clinic_id} pelo valor que copiou):

```sql
INSERT INTO card_processors (clinic_id, name, settlement_day, notes, is_active)
VALUES
  ('{clinic_id}', 'STONE', 1, 'D+1 próximo dia útil', true),
  ('{clinic_id}', 'PAGBANK', 1, 'D+1 ou D+2', true),
  ('{clinic_id}', 'PAGSEGURO', 15, '15º do mês', true),
  ('{clinic_id}', 'MERCADO PAGO', 1, 'D+1 a D+3', true),
  ('{clinic_id}', 'CIELO', 1, 'D+1 dia útil', true),
  ('{clinic_id}', 'REDE', 1, 'D+1 próximo dia', true);
```

3. Cole no editor
4. Clique "Run"
5. Aguarde: deve mostrar ✅ "Success. 6 rows inserted"

═══════════════════════════════════════════════════════════════════════════════

🎉 PRONTO!

Os 3 passos SQL foram executados com sucesso.

Próxima ação:
└─ Teste no app: http://localhost:3000/clinica/financeiro/cartoes-operadoras

═══════════════════════════════════════════════════════════════════════════════

❓ DÚVIDAS?

"Não consigo copiar?"
└─ Selecione todo o SQL com mouse, depois Ctrl+C

"O SQL deu erro?"
└─ Verifique se copiou TUDO (até o último ;)
└─ Verifique se o clinic_id está correto no PASSO 3

"Não apareceu a tabela de resultados?"
└─ F5 para recarregar
└─ Tente novamente

═══════════════════════════════════════════════════════════════════════════════

✨ SUCESSO!

Após executar todos os 3 passos, o sistema estará 100% ativado.
