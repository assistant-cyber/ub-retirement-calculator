-- ============================================================
-- United Benefits Retirement Calculator — Database Schema v1
-- Run this in: Supabase Dashboard → SQL Editor → New query → Run
-- Project: ub-retirement-calculator (esugcccnrvmifpnoivys)
-- ============================================================

-- ---------- ADVISORS (drives the Step-1 dropdown) ----------
create table if not exists public.advisors (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null default '',
  active      boolean not null default true,
  sort_order  int not null default 100,
  created_at  timestamptz not null default now()
);

-- ---------- SUBMISSIONS (one row per calculator run) ----------
create table if not exists public.submissions (
  id                      uuid primary key default gen_random_uuid(),

  -- Intake screen
  filler_type             text not null check (filler_type in ('individual','advisor')),
  contact_name            text not null,
  contact_phone           text not null,
  contact_email           text not null,
  description             text not null default '',
  advisor_id              uuid references public.advisors(id),
  advisor_name            text not null default '',   -- denormalized for easy reporting

  -- Step 1: About you
  dob                     date,
  scd                     date,
  marital_status          text check (marital_status in ('single','married')),
  dependents              text,                        -- '0'..'3','4+'
  union_affiliation       text,                        -- AFGE/NTEU/NFFE/AFSCME/None/Other
  federal_status          text,                        -- yes/no/retired-military
  military_years          numeric not null default 0,
  salary                  numeric not null default 0,

  -- Step 2: Federal benefits
  retirement_system       text check (retirement_system in ('FERS','CSRS','FERS-RAE')),
  tsp_balance             numeric not null default 0,
  tsp_contribution_mode   text check (tsp_contribution_mode in ('percent','dollar')),
  tsp_contribution_value  numeric not null default 0,
  tsp_tax_type            text check (tsp_tax_type in ('roth','traditional','split')),
  tsp_full_match          boolean,
  tsp_allocation          text[] not null default '{}',
  fegli_enrollment        text,                        -- none/basic/basic-a/basic-b/basic-c
  fegli_option_b_multiple int,
  fehb                    boolean,
  hsa                     boolean,
  les_uploaded            boolean not null default false,

  -- Step 3: Goals
  target_retirement_age   numeric,
  replacement_percent     numeric,
  inflation               numeric,
  ss_plan                 text,                        -- yes/no/csrs
  ss_start_age            text,                        -- '62'/'fra'/'70'

  -- Step 4: Outside accounts
  additional_savings      numeric not null default 0,
  monthly_savings_outside numeric not null default 0,
  spouse_monthly_income   numeric not null default 0,
  prior_pension_monthly   numeric not null default 0,
  has_roth_ira            boolean,

  -- Results snapshot at time of submission
  results                 jsonb,   -- computed income breakdown / gap / eligibility
  ai_narratives           jsonb,   -- gap + risk narratives, SS estimate

  -- Phase 2: Salesforce sync bookkeeping
  salesforce_id           text,
  synced_at               timestamptz,

  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists submissions_created_at_idx on public.submissions (created_at desc);
create index if not exists submissions_contact_email_idx on public.submissions (contact_email);
create index if not exists submissions_advisor_id_idx on public.submissions (advisor_id);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists submissions_updated_at on public.submissions;
create trigger submissions_updated_at
  before update on public.submissions
  for each row execute function public.set_updated_at();

-- ---------- SECURITY: lock everything down ----------
-- RLS on; NO public policies. Only the service-role key (server-side
-- API routes) can read/write. Anonymous/browser access is denied.
alter table public.advisors enable row level security;
alter table public.submissions enable row level security;

-- Advisors list is safe to expose read-only to the public site
create policy "advisors are publicly readable"
  on public.advisors for select
  using (active = true);

-- ---------- SEED ----------
insert into public.advisors (name, email, active, sort_order) values
  ('Not sure / Assign me one', '', true, 0),
  ('Sam', '', true, 10)
on conflict do nothing;
