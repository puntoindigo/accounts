-- Tablas de Accounts

create extension if not exists "pgcrypto";

create table if not exists public.accounts_persons (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  nombre text not null,
  empresa text not null,
  face_descriptor jsonb,
  active boolean not null default true,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.accounts_activity (
  id uuid primary key default gen_random_uuid(),
  person_id uuid references public.accounts_persons(id) on delete set null,
  email text,
  provider text not null,
  status text not null check (status in ('success', 'failed')),
  reason text,
  ip text,
  city text,
  country text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists accounts_persons_email_idx on public.accounts_persons (email);
create index if not exists accounts_activity_status_idx on public.accounts_activity (status);
create index if not exists accounts_activity_created_at_idx on public.accounts_activity (created_at desc);

create or replace function public.accounts_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists accounts_persons_set_updated_at on public.accounts_persons;
create trigger accounts_persons_set_updated_at
before update on public.accounts_persons
for each row
execute procedure public.accounts_set_updated_at();