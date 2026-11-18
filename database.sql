-- Run this script in Supabase Dashboard -> SQL Editor -> New query.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  bio text not null check (char_length(bio) between 1 and 280),
  skills text[] not null default '{}',
  github text,
  linkedin text,
  portfolio text,
  created_at timestamptz not null default now()
);

-- This starter project accesses the table only from the Express server
-- using the service-role key. Never put that key in frontend JavaScript.
alter table public.profiles enable row level security;
