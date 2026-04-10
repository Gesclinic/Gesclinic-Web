# 🗄️ Migrações SQL: Fluxo de Check-in

## 📋 Migrações Necessárias

Execute estas queries no Supabase para completar a implementação do fluxo de check-in.

---

## 1️⃣ Adicionar Campos de Timestamp

```sql
-- Adicionar campos para rastrear cada etapa do fluxo
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS chegada_em TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS liberado_em TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS em_atendimento_em TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS finalizado_em TIMESTAMP WITH TIME ZONE;

-- Adicionar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_appointments_chegada_em 
ON public.appointments(chegada_em);

CREATE INDEX IF NOT EXISTS idx_appointments_liberado_em 
ON public.appointments(liberado_em);

CREATE INDEX IF NOT EXISTS idx_appointments_status_chegada 
ON public.appointments(status, chegada_em);
```

---

## 2️⃣ Validar Status Permitidos

```sql
-- Remover constraint antigo (se houver)
ALTER TABLE public.appointments
DROP CONSTRAINT IF EXISTS check_status;

-- Adicionar constraint atualizado com novos status
ALTER TABLE public.appointments
ADD CONSTRAINT check_status CHECK (
  status IN (
    'a_confirmar',
    'confirmado',
    'presente',
    'pronto_atendimento',
    'em_atendimento',
    'finalizado',
    'faltou',
    'cancelado',
    'encaixe',
    'bloqueado',
    'liberado_para_atendimento'
  )
);
```

---

## 3️⃣ Criar Função para Auto-Preencher Timestamps

```sql
-- Função para auto-preencher timestamps ao atualizar status
CREATE OR REPLACE FUNCTION public.update_appointment_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando status muda para 'presente'
  IF NEW.status = 'presente' AND OLD.status IS DISTINCT FROM 'presente' THEN
    IF NEW.chegada_em IS NULL THEN
      NEW.chegada_em := CURRENT_TIMESTAMP;
    END IF;
  END IF;

  -- Quando status muda para 'pronto_atendimento'
  IF NEW.status = 'pronto_atendimento' AND OLD.status IS DISTINCT FROM 'pronto_atendimento' THEN
    IF NEW.liberado_em IS NULL THEN
      NEW.liberado_em := CURRENT_TIMESTAMP;
    END IF;
  END IF;

  -- Quando status muda para 'em_atendimento'
  IF NEW.status = 'em_atendimento' AND OLD.status IS DISTINCT FROM 'em_atendimento' THEN
    IF NEW.em_atendimento_em IS NULL THEN
      NEW.em_atendimento_em := CURRENT_TIMESTAMP;
    END IF;
  END IF;

  -- Quando status muda para 'finalizado'
  IF NEW.status = 'finalizado' AND OLD.status IS DISTINCT FROM 'finalizado' THEN
    IF NEW.finalizado_em IS NULL THEN
      NEW.finalizado_em := CURRENT_TIMESTAMP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_update_appointment_timestamps 
ON public.appointments;

CREATE TRIGGER trigger_update_appointment_timestamps
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.update_appointment_timestamps();
```

---

## 4️⃣ Criar View para Relatórios de Tempo de Espera

```sql
-- View para calcular tempo de espera e atendimento
CREATE OR REPLACE VIEW public.vw_appointment_times AS
SELECT
  id,
  patient_id,
  professional_id,
  status,
  scheduled_date,
  scheduled_time,
  chegada_em,
  liberado_em,
  em_atendimento_em,
  finalizado_em,
  -- Tempo de espera (desde chegada até liberação)
  CASE 
    WHEN chegada_em IS NOT NULL AND liberado_em IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (liberado_em - chegada_em)) / 60 
    ELSE NULL 
  END AS espera_minutos,
  -- Tempo de atendimento (desde liberação até finalização)
  CASE 
    WHEN liberado_em IS NOT NULL AND finalizado_em IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (finalizado_em - liberado_em)) / 60 
    ELSE NULL 
  END AS atendimento_minutos,
  -- Tempo total (desde chegada até finalização)
  CASE 
    WHEN chegada_em IS NOT NULL AND finalizado_em IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (finalizado_em - chegada_em)) / 60 
    ELSE NULL 
  END AS total_minutos,
  -- Flag: Paciente compareceu?
  CASE 
    WHEN status IN ('presente', 'pronto_atendimento', 'em_atendimento', 'finalizado') 
    THEN true 
    ELSE false 
  END AS compareceu,
  -- Flag: Consulta foi realizada?
  CASE 
    WHEN status = 'finalizado' 
    THEN true 
    ELSE false 
  END AS realizada
FROM public.appointments
WHERE deleted_at IS NULL;
```

---

## 5️⃣ Criar Função para Estatísticas Diárias

```sql
-- RPC para gerar estatísticas diárias de check-in
CREATE OR REPLACE FUNCTION public.get_checkin_stats(
  p_clinic_id UUID,
  p_date DATE
)
RETURNS TABLE(
  total_agendamentos BIGINT,
  comparecimentos BIGINT,
  faltas BIGINT,
  cancelamentos BIGINT,
  tempo_espera_medio NUMERIC,
  tempo_atendimento_medio NUMERIC,
  taxa_presenca NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_agendamentos,
    COUNT(CASE WHEN compareceu = true THEN 1 END) as comparecimentos,
    COUNT(CASE WHEN status = 'faltou' THEN 1 END) as faltas,
    COUNT(CASE WHEN status = 'cancelado' THEN 1 END) as cancelamentos,
    ROUND(AVG(espera_minutos), 2) as tempo_espera_medio,
    ROUND(AVG(atendimento_minutos), 2) as tempo_atendimento_medio,
    ROUND(
      (COUNT(CASE WHEN compareceu = true THEN 1 END)::NUMERIC / 
       NULLIF(COUNT(*), 0) * 100), 
      2
    ) as taxa_presenca
  FROM public.vw_appointment_times
  WHERE 
    scheduled_date = p_date
    AND clinic_id = p_clinic_id;
END;
$$ LANGUAGE plpgsql;

-- Grants
GRANT EXECUTE ON FUNCTION public.get_checkin_stats(UUID, DATE) TO anon, authenticated;
```

---

## 6️⃣ Criar Função para Fila de Espera

```sql
-- RPC para obter fila de pacientes prontos
CREATE OR REPLACE FUNCTION public.get_pacientes_prontos(
  p_clinic_id UUID,
  p_professional_id UUID DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  patient_name VARCHAR,
  professional_name VARCHAR,
  service_name VARCHAR,
  room_name VARCHAR,
  liberado_em TIMESTAMP,
  tempo_espera_minutos BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    COALESCE(pa.name, a.lead_name) as patient_name,
    pr.name as professional_name,
    sv.name as service_name,
    rm.name as room_name,
    a.liberado_em,
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - a.liberado_em))::BIGINT / 60 as tempo_espera_minutos
  FROM public.appointments a
  LEFT JOIN public.patients pa ON a.patient_id = pa.id
  LEFT JOIN public.professionals pr ON a.professional_id = pr.id
  LEFT JOIN public.services sv ON a.service_id = sv.id
  LEFT JOIN public.rooms rm ON a.room_id = rm.id
  WHERE 
    a.clinic_id = p_clinic_id
    AND a.status = 'pronto_atendimento'
    AND a.liberado_em IS NOT NULL
    AND a.deleted_at IS NULL
    AND (p_professional_id IS NULL OR a.professional_id = p_professional_id)
  ORDER BY a.liberado_em ASC;
END;
$$ LANGUAGE plpgsql;

-- Grants
GRANT EXECUTE ON FUNCTION public.get_pacientes_prontos(UUID, UUID) TO anon, authenticated;
```

---

## 7️⃣ Criar Função para Atualizar Status com Auditoria

```sql
-- RPC para atualizar status com auditoria
CREATE OR REPLACE FUNCTION public.update_appointment_status(
  p_appointment_id UUID,
  p_new_status VARCHAR,
  p_user_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  appointment_id UUID,
  old_status VARCHAR,
  new_status VARCHAR
) AS $$
DECLARE
  v_old_status VARCHAR;
  v_timestamp TIMESTAMP;
BEGIN
  -- Obter status antigo
  SELECT status INTO v_old_status FROM public.appointments WHERE id = p_appointment_id;
  
  IF v_old_status IS NULL THEN
    RETURN QUERY SELECT false, 'Agendamento não encontrado', p_appointment_id, NULL, NULL;
    RETURN;
  END IF;

  -- Validar transição de status
  IF NOT (
    (v_old_status = 'confirmado' AND p_new_status = 'presente') OR
    (v_old_status = 'a_confirmar' AND p_new_status = 'presente') OR
    (v_old_status = 'presente' AND p_new_status = 'pronto_atendimento') OR
    (p_new_status = ANY(ARRAY['cancelado', 'faltou'])) OR
    (p_user_id IN (SELECT id FROM public.auth.users WHERE role = 'admin')) -- Admin pode tudo
  ) THEN
    RETURN QUERY SELECT false, 'Transição de status não permitida', p_appointment_id, v_old_status, p_new_status;
    RETURN;
  END IF;

  -- Atualizar status
  UPDATE public.appointments
  SET status = p_new_status,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = p_appointment_id;

  -- Registrar auditoria (se tabela existir)
  INSERT INTO public.appointment_audit_log (appointment_id, old_status, new_status, user_id, notes, created_at)
  VALUES (p_appointment_id, v_old_status, p_new_status, p_user_id, p_notes, CURRENT_TIMESTAMP)
  ON CONFLICT DO NOTHING;

  RETURN QUERY SELECT true, 'Status atualizado com sucesso', p_appointment_id, v_old_status, p_new_status;
END;
$$ LANGUAGE plpgsql;

-- Grants
GRANT EXECUTE ON FUNCTION public.update_appointment_status(UUID, VARCHAR, UUID, TEXT) TO anon, authenticated;
```

---

## 📋 Instruções de Execução

### **Passo 1: Acesse Supabase**
1. Abra [supabase.com](https://supabase.com)
2. Acesse seu projeto Gesclinic

### **Passo 2: Abra SQL Editor**
1. Clique em "SQL Editor" no menu lateral
2. Clique em "New Query"

### **Passo 3: Copie e Execute**
1. Copie a migration acima (ou em partes se muito grande)
2. Cole no editor
3. Clique em "▶ Run"

### **Passo 4: Validate**
1. Abra "Table Editor"
2. Procure por "appointments"
3. Verifique se novos campos aparecem:
   - `chegada_em`
   - `liberado_em`
   - `em_atendimento_em`
   - `finalizado_em`

---

## ✅ Checklist Pós-Migração

- [ ] Campos de timestamp adicionados com sucesso
- [ ] Índices criados para performance
- [ ] Constraint de status atualizado
- [ ] Trigger de timestamps funcionando
- [ ] Views criadas sem erros
- [ ] RPC para estatísticas disponível
- [ ] RPC para fila de espera disponível
- [ ] RPC para atualizar status disponível
- [ ] Roles e grants configurados

---

## 🚀 Próximo Passo

Após executar estas migrações, o sistema estará pronto para:
1. ✅ Rastrear chegada do paciente (`chegada_em`)
2. ✅ Rastrear liberação para profissional (`liberado_em`)
3. ✅ Calcular tempo de espera
4. ✅ Gerar relatórios de eficiência
5. ✅ Gerenciar fila de espera

---

**Data:** 2024
**Complexidade:** Média
**Tempo Estimado:** 5 minutos
**Status:** PRONTO PARA EXECUTAR
