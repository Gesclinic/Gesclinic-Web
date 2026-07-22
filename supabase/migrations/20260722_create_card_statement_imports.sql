create table if not exists public.card_statement_import_batches (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  processor_id uuid references public.card_processors(id) on delete set null,
  file_name text,
  imported_count integer not null default 0,
  duplicate_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.card_statement_entries (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  processor_id uuid references public.card_processors(id) on delete set null,
  import_batch_id uuid references public.card_statement_import_batches(id) on delete set null,
  sale_date date,
  settlement_date date,
  description text,
  authorization_code text,
  nsu text,
  document_number text,
  card_brand text,
  settlement_type text,
  gross_amount numeric(12,2) not null default 0,
  fee_amount numeric(12,2) not null default 0,
  net_amount numeric(12,2) not null default 0,
  status text not null default 'pending',
  reference_hash text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id, reference_hash)
);

create index if not exists idx_card_statement_entries_clinic on public.card_statement_entries(clinic_id);
create index if not exists idx_card_statement_entries_processor on public.card_statement_entries(processor_id);
create index if not exists idx_card_statement_entries_sale_date on public.card_statement_entries(sale_date);
create index if not exists idx_card_statement_entries_status on public.card_statement_entries(status);

alter table public.card_statement_import_batches enable row level security;
alter table public.card_statement_entries enable row level security;

drop policy if exists card_statement_import_batches_select on public.card_statement_import_batches;
drop policy if exists card_statement_import_batches_insert on public.card_statement_import_batches;
create policy card_statement_import_batches_select on public.card_statement_import_batches for select using (true);
create policy card_statement_import_batches_insert on public.card_statement_import_batches for insert with check (true);

drop policy if exists card_statement_entries_select on public.card_statement_entries;
drop policy if exists card_statement_entries_insert on public.card_statement_entries;
drop policy if exists card_statement_entries_update on public.card_statement_entries;
drop policy if exists card_statement_entries_delete on public.card_statement_entries;
create policy card_statement_entries_select on public.card_statement_entries for select using (true);
create policy card_statement_entries_insert on public.card_statement_entries for insert with check (true);
create policy card_statement_entries_update on public.card_statement_entries for update using (true) with check (true);
create policy card_statement_entries_delete on public.card_statement_entries for delete using (true);
