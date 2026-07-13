alter table public.drawer_movements
  add column if not exists counterparty_name text,
  add column if not exists expense_supplier_name text,
  add column if not exists expense_provider_name text,
  add column if not exists expense_service_description text,
  add column if not exists financial_category text;

comment on column public.drawer_movements.counterparty_name is 'Pagador ou favorecido informado em movimento manual do caixa.';
comment on column public.drawer_movements.expense_supplier_name is 'Fornecedor informado em saída manual do caixa.';
comment on column public.drawer_movements.expense_provider_name is 'Prestador informado em saída manual do caixa.';
comment on column public.drawer_movements.expense_service_description is 'Serviço ou despesa realizada em saída manual do caixa.';
comment on column public.drawer_movements.financial_category is 'Categoria financeira escolhida para integração de movimento manual do caixa.';
