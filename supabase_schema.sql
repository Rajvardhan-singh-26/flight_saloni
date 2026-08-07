-- ============================================================================
--  Carewell Aviation — Supabase schema
--  Run this once in the Supabase dashboard: SQL Editor → New query → Run.
--  Safe to re-run: every statement is idempotent.
-- ============================================================================

-- ── profiles ────────────────────────────────────────────────────────────────
-- One row per user, keyed to the Supabase Auth user. Signup creates the auth
-- user AND a profile with approved = false; a sales executive flips that flag
-- before the account can sign in.
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null unique,
  name        text not null default '',
  post        text not null default '',          -- job title, e.g. "Charter Consultant"
  role        text not null default 'sales',     -- 'sales' | 'admin'
  approved    boolean not null default false,
  created_at  timestamptz not null default now(),
  approved_at timestamptz,
  approved_by text
);

-- ── aircraft ────────────────────────────────────────────────────────────────
-- gallery is a JSON array of { "url": ..., "caption": ... } objects.
create table if not exists public.aircraft (
  id              text primary key,
  name            text not null,
  manufacturer    text not null default '',
  category        text not null default '',
  hourly_rate     double precision not null default 0,
  max_passengers  integer not null default 1,
  max_range_nm    integer not null default 0,
  cruise_speed_kt integer not null default 0,
  image           text not null default '',
  accent          text not null default '#2d67b2',
  description     text not null default '',
  gallery         jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now()
);

-- ── customers ───────────────────────────────────────────────────────────────
create table if not exists public.customers (
  id              text primary key,
  name            text not null default '',
  company         text not null default '',
  phone           text not null default '',
  email           text not null default '',
  status          text not null default 'New',
  quote_count     integer not null default 0,
  total_value     double precision not null default 0,
  currency        text not null default 'USD',
  last_quote_date text not null default '',
  created_at      timestamptz not null default now()
);

create index if not exists customers_email_idx on public.customers (lower(email));
create index if not exists customers_phone_idx on public.customers (phone);

-- ── quotes ──────────────────────────────────────────────────────────────────
-- The generated PDF is kept as base64 so a shared link keeps working after a
-- restart. quote/pricing hold the full request and computed breakdown.
create table if not exists public.quotes (
  quote_id    text primary key,
  quote       jsonb not null,
  pricing     jsonb not null,
  pdf_base64  text not null default '',
  created_at  timestamptz not null default now()
);

create index if not exists quotes_created_at_idx on public.quotes (created_at desc);

-- ── Row Level Security ──────────────────────────────────────────────────────
-- The FastAPI backend talks to Supabase with the service-role key, which
-- bypasses RLS. RLS is still enabled so that if the anon key is ever exposed
-- (or the tables are queried from a browser) nothing is readable by default.
alter table public.profiles  enable row level security;
alter table public.aircraft  enable row level security;
alter table public.customers enable row level security;
alter table public.quotes    enable row level security;
