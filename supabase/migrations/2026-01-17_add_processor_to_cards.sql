-- Add processor_id to clinic_payment_cards
ALTER TABLE clinic_payment_cards 
ADD COLUMN processor_id UUID REFERENCES card_processors(id) ON DELETE SET NULL;

-- Add comment
COMMENT ON COLUMN clinic_payment_cards.processor_id IS 'FK to card_processors table';
