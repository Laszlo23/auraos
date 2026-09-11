-- Aura Square — Base ERC-6551 binder purchases. Not Hood. Not pAURA rails.
create table if not exists public.square_purchases (
  user_id uuid primary key references auth.users (id) on delete cascade,
  wallet text,
  status text not null default 'pending',
  token_id integer,
  stripe_session_id text,
  amount_cents integer not null default 11100,
  amount_usdc numeric not null default 111,
  tx_hash text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.square_tba_funds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token_id integer not null,
  tba text,
  amount_usdc numeric not null,
  amount_cents integer not null,
  status text not null default 'pending',
  stripe_session_id text,
  tx_hash text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists square_tba_funds_user_idx on public.square_tba_funds (user_id, created_at desc);

alter table public.square_purchases enable row level security;
alter table public.square_tba_funds enable row level security;

create policy square_purchases_own on public.square_purchases
  for select using (auth.uid() = user_id);

create policy square_tba_funds_own on public.square_tba_funds
  for select using (auth.uid() = user_id);
