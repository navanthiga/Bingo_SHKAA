-- Run this entire file in Supabase Dashboard -> SQL Editor.
-- Evidence is stored in a PRIVATE bucket. Never expose the service-role key in client code.

create extension if not exists pgcrypto;

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 70),
  participant_code text not null unique check (char_length(participant_code) between 4 and 32),
  created_at timestamptz not null default now()
);

create table if not exists public.task_submissions (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  task_id integer not null check (task_id between 1 and 25),
  response_text text,
  storage_path text,
  tile_index integer not null check (tile_index between 0 and 24),
  created_at timestamptz not null default now(),
  unique (participant_id, task_id),
  unique (participant_id, tile_index),
  check (response_text is not null or storage_path is not null)
);

create table if not exists public.bingo_submissions (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  winning_line integer[] not null,
  submitted_at timestamptz not null default now(),
  unique (participant_id)
);

create index if not exists task_submissions_participant_idx on public.task_submissions(participant_id);
create index if not exists bingo_submissions_submitted_idx on public.bingo_submissions(submitted_at);

-- Private bucket, 4 MB per object. Allowed image types only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bingo-evidence', 'bingo-evidence', false, 4194304, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 4194304, allowed_mime_types = array['image/jpeg','image/png','image/webp'];

-- The app accesses the database from server routes using SUPABASE_SERVICE_ROLE_KEY.
-- Keep RLS enabled and do not add public/anon write policies.
alter table public.participants enable row level security;
alter table public.task_submissions enable row level security;
alter table public.bingo_submissions enable row level security;
