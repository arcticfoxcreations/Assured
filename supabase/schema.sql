-- ASSURED Part 3 — run once in Supabase → SQL Editor.
-- One generic table; the server (service-role key) is the only client.
create table if not exists public.assured_rows (
  col  text   not null,            -- 'journeys' | 'reports'
  id   text   not null,
  k    text,                       -- lookup key (hashed guardian token)
  exp  bigint not null,            -- expiry, epoch ms — rows past this are ignored and purged
  data jsonb  not null,
  primary key (col, id)
);
create index if not exists assured_rows_k   on public.assured_rows (col, k);
create index if not exists assured_rows_exp on public.assured_rows (col, exp);

-- Row Level Security ON with NO policies = the public/anon key can read and
-- write nothing. Only the server's service-role key can touch this table.
alter table public.assured_rows enable row level security;
