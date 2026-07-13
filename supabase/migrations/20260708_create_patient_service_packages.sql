create table if not exists public.patient_service_packages (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null,
  patient_id uuid not null,
  payer_id uuid null,
  service_id uuid not null,
  source_appointment_id uuid null,
  source_appointment_service_id uuid null unique,
  source_receivable_id uuid null,
  billing_type text not null default 'package',
  total_sessions numeric(10,2) not null default 0,
  used_sessions numeric(10,2) not null default 0,
  package_value numeric(12,2) not null default 0,
  unit_value numeric(12,2) not null default 0,
  status text not null default 'active',
  valid_from date not null default current_date,
  valid_until date null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint patient_service_packages_sessions_check check (total_sessions >= 0 and used_sessions >= 0 and used_sessions <= total_sessions),
  constraint patient_service_packages_status_check check (status in ('active', 'exhausted', 'canceled'))
);

create index if not exists idx_patient_service_packages_active
  on public.patient_service_packages (clinic_id, patient_id, service_id, status, created_at);

create table if not exists public.patient_service_package_movements (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.patient_service_packages(id) on delete cascade,
  clinic_id uuid not null,
  patient_id uuid not null,
  appointment_id uuid null,
  appointment_service_id uuid null,
  receivable_id uuid null,
  movement_type text not null,
  quantity numeric(10,2) not null default 0,
  previous_used_sessions numeric(10,2) not null default 0,
  new_used_sessions numeric(10,2) not null default 0,
  note text null,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid null,
  created_at timestamptz not null default now(),
  constraint patient_service_package_movements_type_check check (movement_type in ('purchase', 'consume', 'reverse', 'adjust'))
);

create index if not exists idx_patient_service_package_movements_package
  on public.patient_service_package_movements (package_id, created_at);

create index if not exists idx_patient_service_package_movements_appointment
  on public.patient_service_package_movements (appointment_id, appointment_service_id);

alter table public.patient_service_packages enable row level security;
alter table public.patient_service_package_movements enable row level security;

drop policy if exists patient_service_packages_authenticated on public.patient_service_packages;
create policy patient_service_packages_authenticated
  on public.patient_service_packages
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists patient_service_package_movements_authenticated on public.patient_service_package_movements;
create policy patient_service_package_movements_authenticated
  on public.patient_service_package_movements
  for all
  to authenticated
  using (true)
  with check (true);

alter table if exists public.appointment_services
  drop constraint if exists appointment_services_billing_type_check;

alter table if exists public.appointment_services
  add constraint appointment_services_billing_type_check
  check (
    billing_type in (
      'per_consultation',
      'package',
      'per_package',
      'sessions',
      'per_session',
      'class',
      'per_class',
      'fixed'
    )
  );