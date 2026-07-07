-- Lukupäiväkirja: books table with per-user access (Supabase Auth)
-- Paste this into the Supabase SQL Editor and run it once.
--
-- If you already created the OLD books table (without user_id), drop it first
-- or run the migration block at the bottom of this file instead.

create extension if not exists "pgcrypto";

create table if not exists public.books (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid()
                      references auth.users (id) on delete cascade,
  kirjan_nimi       text not null,
  kirjoittaja       text not null,
  valmistumispaiva  date not null default current_date,   -- Päivä, jolloin sain kirjan valmiiksi
  arvio             smallint not null default 0 check (arvio between 0 and 5),
  yhteenveto        text not null default '',
  tarkein_oppi      text not null default '',             -- Tärkein ajatus / oppi
  mista_pidin       text not null default '',
  mista_en_pitanyt  text not null default '',
  lempilainaus      text not null default '',
  omat_ajatukset    text not null default '',             -- Omat ajatukset (pohdinta)
  suosittelen       boolean not null default false,       -- Suosittelisinko?
  suosittelu_syy    text not null default '',
  kansikuva_url     text not null default '',             -- Kansikuvan URL (tyhjä = oletuskansi)
  created_at        timestamptz not null default now()
);

create index if not exists books_user_id_idx on public.books (user_id);

-- Row Level Security: each signed-in user can only see and modify their own
-- entries. user_id is filled automatically from the session (default auth.uid()),
-- and anonymous requests match no policy, so they get nothing.
alter table public.books enable row level security;

drop policy if exists "Anon full access to books" on public.books;
drop policy if exists "Users read own books" on public.books;
drop policy if exists "Users insert own books" on public.books;
drop policy if exists "Users update own books" on public.books;
drop policy if exists "Users delete own books" on public.books;

create policy "Users read own books"
  on public.books for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users insert own books"
  on public.books for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users update own books"
  on public.books for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own books"
  on public.books for delete
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- MIGRATION: run this instead if the old table (without user_id) already
-- exists. Existing rows are assigned to the user whose email you set below.
-- ---------------------------------------------------------------------------
-- alter table public.books
--   add column if not exists user_id uuid default auth.uid()
--     references auth.users (id) on delete cascade;
--
-- update public.books
--   set user_id = (select id from auth.users where email = 'your@email.com')
--   where user_id is null;
--
-- alter table public.books alter column user_id set not null;
-- create index if not exists books_user_id_idx on public.books (user_id);
-- Then re-run the "drop policy / create policy" statements above.
--
-- If the table predates the cover-image feature, also run:
-- alter table public.books add column if not exists kansikuva_url text not null default '';
