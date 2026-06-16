-- ====================================================
-- MIGRATION: Criar tabela appointment_items
-- Data: 2026-06-01
-- Objetivo: Suportar múltiplos itens/procedimentos por agendamento
-- ====================================================

-- 1. Criar tabela appointment_items
CREATE TABLE IF NOT EXISTS appointment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id),
  service_name TEXT NOT NULL,
  service_code TEXT,
  quantity NUMERIC DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC DEFAULT 0 CHECK (unit_price >= 0),
  discount NUMERIC DEFAULT 0 CHECK (discount >= 0),
  total_price NUMERIC DEFAULT 0 CHECK (total_price >= 0),
  
  -- Campos futuros para repasse médico
  professional_percentage NUMERIC DEFAULT 0 CHECK (professional_percentage >= 0 AND professional_percentage <= 100),
  professional_value NUMERIC DEFAULT 0,
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Soft delete
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_appointment_items_appointment_id 
  ON appointment_items(appointment_id);

CREATE INDEX IF NOT EXISTS idx_appointment_items_service_id 
  ON appointment_items(service_id);

CREATE INDEX IF NOT EXISTS idx_appointment_items_created_at 
  ON appointment_items(created_at);

CREATE INDEX IF NOT EXISTS idx_appointment_items_deleted_at 
  ON appointment_items(deleted_at);

-- Índice composto para queries comuns
CREATE INDEX IF NOT EXISTS idx_appointment_items_appointment_deleted 
  ON appointment_items(appointment_id, deleted_at);

-- 3. Criar trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_appointment_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_appointment_items_updated_at ON appointment_items;

CREATE TRIGGER trigger_appointment_items_updated_at
BEFORE UPDATE ON appointment_items
FOR EACH ROW
EXECUTE FUNCTION update_appointment_items_updated_at();

-- 4. Criar função para calcular total_price automaticamente
CREATE OR REPLACE FUNCTION calculate_appointment_items_total()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_price = (NEW.quantity * NEW.unit_price) - NEW.discount;
  
  -- Calcular valor do repasse médico se percentual estiver definido
  IF NEW.professional_percentage > 0 THEN
    NEW.professional_value = (NEW.total_price * NEW.professional_percentage) / 100;
  ELSE
    NEW.professional_value = 0;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_appointment_items_total ON appointment_items;

CREATE TRIGGER trigger_calculate_appointment_items_total
BEFORE INSERT OR UPDATE ON appointment_items
FOR EACH ROW
EXECUTE FUNCTION calculate_appointment_items_total();

-- 5. Criar função para agregar totais do agendamento
CREATE OR REPLACE FUNCTION get_appointment_totals(p_appointment_id UUID)
RETURNS TABLE (
  subtotal NUMERIC,
  total_discount NUMERIC,
  total_additions NUMERIC,
  grand_total NUMERIC,
  professional_total NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(quantity * unit_price), 0) AS subtotal,
    COALESCE(SUM(discount), 0) AS total_discount,
    0::NUMERIC AS total_additions,
    COALESCE(SUM(total_price), 0) AS grand_total,
    COALESCE(SUM(professional_value), 0) AS professional_total
  FROM appointment_items
  WHERE appointment_id = p_appointment_id
    AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- 6. Criar função para migração retrocompatível
-- Transforma appointments existentes em appointment_items
CREATE OR REPLACE FUNCTION migrate_existing_appointments_to_items()
RETURNS TABLE (
  migrated_count INTEGER,
  skipped_count INTEGER,
  error_message TEXT
) AS $$
DECLARE
  v_migrated INTEGER := 0;
  v_skipped INTEGER := 0;
  v_error TEXT := NULL;
  v_appointment RECORD;
BEGIN
  -- Iterar sobre todos os appointments que não foram migrados
  FOR v_appointment IN
    SELECT a.id, a.service_id, s.name, s.code, a.value
    FROM appointments a
    LEFT JOIN services s ON a.service_id = s.id
    WHERE a.service_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM appointment_items
        WHERE appointment_id = a.id AND deleted_at IS NULL
      )
  LOOP
    BEGIN
      INSERT INTO appointment_items (
        appointment_id,
        service_id,
        service_name,
        service_code,
        quantity,
        unit_price,
        discount,
        professional_percentage
      )
      VALUES (
        v_appointment.id,
        v_appointment.service_id,
        COALESCE(v_appointment.name, 'Serviço'),
        v_appointment.code,
        1,
        COALESCE(v_appointment.value, 0),
        0,
        0
      );
      
      v_migrated := v_migrated + 1;
    EXCEPTION WHEN OTHERS THEN
      v_skipped := v_skipped + 1;
      v_error := SQLERRM;
    END;
  END LOOP;

  RETURN QUERY SELECT v_migrated, v_skipped, v_error;
END;
$$ LANGUAGE plpgsql;

-- 7. Criar view para compatibilidade com código existente
-- Retorna appointments com seu serviço principal (primeiro item ou campo legado)
CREATE OR REPLACE VIEW v_appointments_with_items AS
SELECT
  a.id,
  a.clinic_id,
  a.patient_id,
  a.professional_id,
  a.service_id,
  a.scheduled_date,
  a.scheduled_time,
  a.end_time,
  a.status,
  a.notes,
  a.value,
  a.created_at,
  a.updated_at,
  
  -- Items aggregation
  COUNT(ai.id) FILTER (WHERE ai.deleted_at IS NULL) AS total_items,
  (SELECT get_appointment_totals(a.id)).subtotal AS items_subtotal,
  (SELECT get_appointment_totals(a.id)).total_discount AS items_discount,
  (SELECT get_appointment_totals(a.id)).grand_total AS items_total,
  (SELECT get_appointment_totals(a.id)).professional_total AS items_professional_value
  
FROM appointments a
LEFT JOIN appointment_items ai ON a.id = ai.appointment_id
GROUP BY a.id;

-- 8. RLS (Row Level Security) para appointment_items
ALTER TABLE appointment_items ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ver itens de seus agendamentos
CREATE POLICY "see_appointment_items"
  ON appointment_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = appointment_id
        AND a.clinic_id = (SELECT clinic_id FROM auth.users WHERE id = auth.uid())
    )
  );

-- Policy: Usuários podem inserir itens em seus agendamentos
CREATE POLICY "insert_appointment_items"
  ON appointment_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = appointment_id
        AND a.clinic_id = (SELECT clinic_id FROM auth.users WHERE id = auth.uid())
    )
  );

-- Policy: Usuários podem atualizar itens de seus agendamentos
CREATE POLICY "update_appointment_items"
  ON appointment_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = appointment_id
        AND a.clinic_id = (SELECT clinic_id FROM auth.users WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = appointment_id
        AND a.clinic_id = (SELECT clinic_id FROM auth.users WHERE id = auth.uid())
    )
  );

-- Policy: Usuários podem deletar (soft delete) itens de seus agendamentos
CREATE POLICY "delete_appointment_items"
  ON appointment_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = appointment_id
        AND a.clinic_id = (SELECT clinic_id FROM auth.users WHERE id = auth.uid())
    )
  );

-- 9. Comentários para documentação
COMMENT ON TABLE appointment_items IS 'Itens/procedimentos de um agendamento. Permite múltiplos serviços por atendimento.';
COMMENT ON COLUMN appointment_items.service_code IS 'Código TUSS do serviço para compatibilidade com faturamento.';
COMMENT ON COLUMN appointment_items.professional_percentage IS 'Percentual de repasse do item para o profissional (0-100).';
COMMENT ON FUNCTION get_appointment_totals IS 'Calcula totalizações de um agendamento (subtotal, desconto, total).';
COMMENT ON FUNCTION migrate_existing_appointments_to_items IS 'Migra agendamentos existentes para a nova estrutura de items.';

-- 10. Dados de teste (opcional, comentado)
-- INSERT INTO appointment_items (appointment_id, service_id, service_name, service_code, quantity, unit_price, discount, professional_percentage)
-- VALUES (
--   '550e8400-e29b-41d4-a716-446655440000'::UUID,
--   '550e8400-e29b-41d4-a716-446655440001'::UUID,
--   'Consulta Neurológica',
--   '10101012',
--   1,
--   300.00,
--   0,
--   25
-- );
