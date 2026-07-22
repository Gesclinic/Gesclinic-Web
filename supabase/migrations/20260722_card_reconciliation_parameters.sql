create table if not exists public.card_brands (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  code text not null,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id, code)
);

create table if not exists public.card_settlement_types (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  code text not null,
  name text not null,
  days_offset integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id, code)
);

alter table public.card_brands enable row level security;
alter table public.card_settlement_types enable row level security;

drop policy if exists card_brands_select on public.card_brands;
drop policy if exists card_brands_insert on public.card_brands;
drop policy if exists card_brands_update on public.card_brands;
drop policy if exists card_brands_delete on public.card_brands;

create policy card_brands_select on public.card_brands
  for select using (true);
create policy card_brands_insert on public.card_brands
  for insert with check (true);
create policy card_brands_update on public.card_brands
  for update using (true) with check (true);
create policy card_brands_delete on public.card_brands
  for delete using (true);

drop policy if exists card_settlement_types_select on public.card_settlement_types;
drop policy if exists card_settlement_types_insert on public.card_settlement_types;
drop policy if exists card_settlement_types_update on public.card_settlement_types;
drop policy if exists card_settlement_types_delete on public.card_settlement_types;

create policy card_settlement_types_select on public.card_settlement_types
  for select using (true);
create policy card_settlement_types_insert on public.card_settlement_types
  for insert with check (true);
create policy card_settlement_types_update on public.card_settlement_types
  for update using (true) with check (true);
create policy card_settlement_types_delete on public.card_settlement_types
  for delete using (true);
