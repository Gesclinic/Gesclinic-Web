-- =============================================================================
-- FIX RLS: medical_repasse_simulations
-- =============================================================================
-- Objetivo:
-- - Garantir leitura para membros da clínica
-- - Permitir persistência (INSERT/UPDATE/DELETE) para perfis de gestão financeira
-- =============================================================================

alter table if exists public.medical_repasse_simulations enable row level security;

-- Remove políticas antigas (se existirem)
drop policy if exists medical_repasse_simulations_select on public.medical_repasse_simulations;
drop policy if exists medical_repasse_simulations_write on public.medical_repasse_simulations;
drop policy if exists medical_repasse_simulations_insert on public.medical_repasse_simulations;
drop policy if exists medical_repasse_simulations_update on public.medical_repasse_simulations;
drop policy if exists medical_repasse_simulations_delete on public.medical_repasse_simulations;

-- Leitura para usuários da própria clínica
create policy medical_repasse_simulations_select
on public.medical_repasse_simulations
for select
to authenticated
using (public.is_clinic_member(clinic_id));

-- Escrita para perfis de gestão
create policy medical_repasse_simulations_insert
on public.medical_repasse_simulations
for insert
to authenticated
with check (public.is_clinic_manager(clinic_id));

create policy medical_repasse_simulations_update
on public.medical_repasse_simulations
for update
to authenticated
using (public.is_clinic_manager(clinic_id))
with check (public.is_clinic_manager(clinic_id));

create policy medical_repasse_simulations_delete
on public.medical_repasse_simulations
for delete
to authenticated
using (public.is_clinic_manager(clinic_id));
