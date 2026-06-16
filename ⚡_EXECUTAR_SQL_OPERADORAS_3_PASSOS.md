🚀 **PRÓXIMAS 3 OPERAÇÕES NO SUPABASE SQL EDITOR**

## PASSO 1: Criar tabela card_processors
Copie e cole no Supabase SQL Editor (https://supabase.com/dashboard/project/gvdkdjyupktlflwurike/sql/new):

```sql
CREATE TABLE card_processors (
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
  FOR SELECT
  USING (clinic_id = auth.jwt() ->> 'clinic_id' OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY card_processors_insert ON card_processors
  FOR INSERT
  WITH CHECK (clinic_id = auth.jwt() ->> 'clinic_id' OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY card_processors_update ON card_processors
  FOR UPDATE
  USING (clinic_id = auth.jwt() ->> 'clinic_id' OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY card_processors_delete ON card_processors
  FOR DELETE
  USING (clinic_id = auth.jwt() ->> 'clinic_id' OR auth.jwt() ->> 'role' = 'admin');
```

**Depois de clicar Run:** Você deve ver "Success. No rows returned"

---

## PASSO 2: Adicionar coluna processor_id em clinic_payment_cards
Copie e cole no Supabase SQL Editor:

```sql
ALTER TABLE clinic_payment_cards 
ADD COLUMN processor_id UUID REFERENCES card_processors(id) ON DELETE SET NULL;
```

**Resultado esperado:** "Success. No rows returned"

---

## PASSO 3: Inserir dados padrão de operadoras
Copie e cole no Supabase SQL Editor:

```sql
INSERT INTO card_processors (clinic_id, name, settlement_day, notes)
VALUES 
  ('5c5e3f4e-1234-5678-90ab-cdef12345678', 'STONE', 1, 'Crédito em D+1 (próximo dia útil)'),
  ('5c5e3f4e-1234-5678-90ab-cdef12345678', 'PAGBANK', 1, 'Crédito em D+1 ou D+2'),
  ('5c5e3f4e-1234-5678-90ab-cdef12345678', 'PAGSEGURO', 15, 'Crédito no 15º dia do mês'),
  ('5c5e3f4e-1234-5678-90ab-cdef12345678', 'MERCADO PAGO', 1, 'Crédito em D+1 a D+3'),
  ('5c5e3f4e-1234-5678-90ab-cdef12345678', 'CIELO', 1, 'Crédito em D+1 (dia útil)'),
  ('5c5e3f4e-1234-5678-90ab-cdef12345678', 'REDE', 1, 'Crédito em D+1 (próximo dia)')
ON CONFLICT DO NOTHING;
```

**Resultado esperado:** "Success. 6 rows inserted" ou similar

---

⚠️ **IMPORTANTE:**
- Substitua `'5c5e3f4e-1234-5678-90ab-cdef12345678'` pelo seu `clinic_id` real se for diferente
- Para descobrir seu clinic_id real, execute:
  ```sql
  SELECT id, name FROM clinics LIMIT 5;
  ```

---

✅ **APÓS EXECUTAR OS 3 PASSOS:**
1. Volte para http://localhost:3000/clinica/financeiro/cartoes-operadoras
2. Atualize a página (F5)
3. Você deve ver a página de operadoras carregada corretamente!
