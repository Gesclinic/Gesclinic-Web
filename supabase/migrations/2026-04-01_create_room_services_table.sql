-- Migration: Create room_services table (M:M de Salas × Serviços)
-- Created: 2026-04-01

CREATE TABLE IF NOT EXISTS room_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  
  active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(room_id, service_id, clinic_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_room_services_clinic 
  ON room_services(clinic_id, active);

CREATE INDEX IF NOT EXISTS idx_room_services_room_clinic 
  ON room_services(room_id, clinic_id, active);

CREATE INDEX IF NOT EXISTS idx_room_services_service_clinic 
  ON room_services(service_id, clinic_id, active);
