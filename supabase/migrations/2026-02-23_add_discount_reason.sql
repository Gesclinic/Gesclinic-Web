-- 💰 Adicionar coluna discount_reason à tabela appointments
ALTER TABLE appointments
ADD COLUMN discount_reason TEXT DEFAULT '' NOT NULL;

-- Comentário explicativo
COMMENT ON COLUMN appointments.discount_reason IS 'Motivo do desconto autorizado (Autorizado Adm, Autorizado Médico, Convênio/Acordo, Promoção, Fidelidade, Dificuldade Financeira, Erro de Cobrança, Cortesia, Outro)';
