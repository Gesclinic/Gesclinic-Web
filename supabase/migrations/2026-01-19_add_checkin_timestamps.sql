-- Migration: Adicionar colunas de timestamp para rastreamento de check-in
-- Data: 2026-01-19
-- Descrição: Adiciona colunas para rastrear os eventos do fluxo de check-in:
--   - chegada_em: Quando o paciente chega na recepção (marca como "presente")
--   - liberado_em: Quando é liberado para atendimento (marca como "pronto_atendimento")
--   - em_atendimento_em: Quando o profissional inicia o atendimento (marca como "em_atendimento")
--   - finalizado_em: Quando o atendimento é finalizado

BEGIN;

-- Adicionar coluna chegada_em se não existir
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS chegada_em TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Adicionar coluna liberado_em se não existir
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS liberado_em TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Adicionar coluna em_atendimento_em se não existir
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS em_atendimento_em TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Adicionar coluna finalizado_em se não existir
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS finalizado_em TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_appointments_chegada_em ON public.appointments(chegada_em);
CREATE INDEX IF NOT EXISTS idx_appointments_liberado_em ON public.appointments(liberado_em);
CREATE INDEX IF NOT EXISTS idx_appointments_em_atendimento_em ON public.appointments(em_atendimento_em);
CREATE INDEX IF NOT EXISTS idx_appointments_finalizado_em ON public.appointments(finalizado_em);

-- Criar trigger para atualizar chegada_em automaticamente quando status muda para "presente"
CREATE OR REPLACE FUNCTION update_chegada_em()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'presente' AND OLD.status != 'presente' AND NEW.chegada_em IS NULL THEN
    NEW.chegada_em := CURRENT_TIMESTAMP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_chegada_em ON public.appointments;
CREATE TRIGGER trigger_update_chegada_em
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION update_chegada_em();

-- Criar trigger para atualizar liberado_em automaticamente quando status muda para "pronto_atendimento"
CREATE OR REPLACE FUNCTION update_liberado_em()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'pronto_atendimento' AND OLD.status != 'pronto_atendimento' AND NEW.liberado_em IS NULL THEN
    NEW.liberado_em := CURRENT_TIMESTAMP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_liberado_em ON public.appointments;
CREATE TRIGGER trigger_update_liberado_em
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION update_liberado_em();

-- Criar trigger para atualizar em_atendimento_em automaticamente quando status muda para "em_atendimento"
CREATE OR REPLACE FUNCTION update_em_atendimento_em()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'em_atendimento' AND OLD.status != 'em_atendimento' AND NEW.em_atendimento_em IS NULL THEN
    NEW.em_atendimento_em := CURRENT_TIMESTAMP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_em_atendimento_em ON public.appointments;
CREATE TRIGGER trigger_update_em_atendimento_em
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION update_em_atendimento_em();

-- Criar trigger para atualizar finalizado_em automaticamente quando status muda para "finalizado"
CREATE OR REPLACE FUNCTION update_finalizado_em()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'finalizado' AND OLD.status != 'finalizado' AND NEW.finalizado_em IS NULL THEN
    NEW.finalizado_em := CURRENT_TIMESTAMP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_finalizado_em ON public.appointments;
CREATE TRIGGER trigger_update_finalizado_em
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION update_finalizado_em();

COMMIT;
