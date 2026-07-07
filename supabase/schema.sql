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
-- Lukulista: books the user wants to read later. Same per-user isolation.
-- ---------------------------------------------------------------------------

create table if not exists public.wishlist (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid()
                 references auth.users (id) on delete cascade,
  kirjan_nimi  text not null,
  kirjoittaja  text not null default '',
  huomautus    text not null default '',
  created_at   timestamptz not null default now()
);

create index if not exists wishlist_user_id_idx on public.wishlist (user_id);

alter table public.wishlist enable row level security;

drop policy if exists "Users read own wishlist" on public.wishlist;
drop policy if exists "Users insert own wishlist" on public.wishlist;
drop policy if exists "Users delete own wishlist" on public.wishlist;

create policy "Users read own wishlist"
  on public.wishlist for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users insert own wishlist"
  on public.wishlist for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users delete own wishlist"
  on public.wishlist for delete
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Community recommendations: a deliberately narrow window into other users'
-- journals. The view runs with the owner's rights (security_invoker = off),
-- bypassing books RLS on purpose — but it exposes ONLY the safe columns
-- (title, author, rating, recommendation reason) of entries whose owner set
-- suosittelen = true, and never the viewer's own entries. Summaries, quotes,
-- and reflections stay private.
-- ---------------------------------------------------------------------------

-- Drop first: "create or replace" cannot reorder/insert columns on an
-- existing view, which would break upgrades from the pre-cover version.
drop view if exists public.recommendations;

create view public.recommendations
with (security_invoker = off) as
  select
    kirjan_nimi,
    kirjoittaja,
    arvio,
    suosittelu_syy,
    kansikuva_url,
    created_at
  from public.books
  where suosittelen = true
    and user_id is distinct from auth.uid();

revoke all on public.recommendations from anon, public;
grant select on public.recommendations to authenticated;

-- ---------------------------------------------------------------------------
-- Profiles: username (shown on the scoreboard instead of the email),
-- scoreboard opt-in, and the yearly reading goal.
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  user_id         uuid primary key default auth.uid()
                    references auth.users (id) on delete cascade,
  kayttajanimi    text not null
                    check (kayttajanimi ~ '^[A-Za-z0-9_åäöÅÄÖ]{3,20}$'),
  public_profile  boolean not null default false,   -- opt-in to the scoreboard
  lukutavoite     smallint not null default 0
                    check (lukutavoite between 0 and 1000),  -- books/year, 0 = no goal
  created_at      timestamptz not null default now()
);

-- Case-insensitive uniqueness: "Liisa" and "liisa" are the same name.
create unique index if not exists profiles_kayttajanimi_lower_idx
  on public.profiles (lower(kayttajanimi));

alter table public.profiles enable row level security;

drop policy if exists "Users read own profile" on public.profiles;
drop policy if exists "Users insert own profile" on public.profiles;
drop policy if exists "Users update own profile" on public.profiles;

create policy "Users read own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Scoreboard: monthly and all-time book counts of users who opted in
-- (public_profile = true). Same deliberate security-definer pattern as the
-- recommendations view: only the username and a count are ever exposed.
-- ---------------------------------------------------------------------------

drop view if exists public.scoreboard_total;
create view public.scoreboard_total
with (security_invoker = off) as
  select p.kayttajanimi, count(b.id)::int as kirjat
  from public.profiles p
  join public.books b on b.user_id = p.user_id
  where p.public_profile
  group by p.kayttajanimi;

drop view if exists public.scoreboard_monthly;
create view public.scoreboard_monthly
with (security_invoker = off) as
  select p.kayttajanimi, count(b.id)::int as kirjat
  from public.profiles p
  join public.books b on b.user_id = p.user_id
  where p.public_profile
    and b.valmistumispaiva >= date_trunc('month', current_date)
  group by p.kayttajanimi;

revoke all on public.scoreboard_total, public.scoreboard_monthly from anon, public;
grant select on public.scoreboard_total, public.scoreboard_monthly to authenticated;

-- ---------------------------------------------------------------------------
-- Feedback: bug reports and improvement ideas from users. Write-only for
-- users (they can insert but not read others' feedback); read it yourself
-- in the Supabase Table Editor or SQL Editor.
-- ---------------------------------------------------------------------------

create table if not exists public.feedback (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid default auth.uid()
                references auth.users (id) on delete set null,
  tyyppi      text not null check (tyyppi in ('bugi', 'idea')),
  viesti      text not null check (char_length(viesti) between 1 and 4000),
  created_at  timestamptz not null default now()
);

alter table public.feedback enable row level security;

drop policy if exists "Users submit feedback" on public.feedback;
create policy "Users submit feedback"
  on public.feedback for insert
  to authenticated
  with check (auth.uid() = user_id);

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
