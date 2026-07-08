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
  nayta_tulostaulu boolean not null default false,  -- extended feature toggles
  nayta_lukupiirit boolean not null default false,
  created_at      timestamptz not null default now()
);

-- Idempotent upgrade for databases created before the feature toggles:
alter table public.profiles add column if not exists nayta_tulostaulu boolean not null default false;
alter table public.profiles add column if not exists nayta_lukupiirit boolean not null default false;

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
-- Lukupiirit (reading circles): invite-code groups with a group scoreboard.
-- The tables allow NO direct access (RLS enabled, no policies) — all reads
-- and writes go through the security-definer functions below, each of which
-- validates the caller's membership itself. This avoids the recursive-policy
-- pitfalls of membership tables.
-- ---------------------------------------------------------------------------

create table if not exists public.groups (
  id          uuid primary key default gen_random_uuid(),
  nimi        text not null check (char_length(trim(nimi)) between 3 and 40),
  kutsukoodi  text not null unique,
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id   uuid not null references public.groups (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  joined_at  timestamptz not null default now(),
  primary key (group_id, user_id)
);

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
-- (no policies on purpose: deny all direct access)

-- List the caller's groups with member counts.
create or replace function public.my_groups()
returns table (id uuid, nimi text, kutsukoodi text, jasenia int)
language sql security definer set search_path = public as $$
  select g.id, g.nimi, g.kutsukoodi,
         (select count(*)::int from group_members m where m.group_id = g.id)
  from groups g
  join group_members gm on gm.group_id = g.id and gm.user_id = auth.uid()
  order by g.created_at;
$$;

-- Create a group with a unique invite code and join it as the first member.
create or replace function public.create_group(nimi_in text)
returns table (id uuid, nimi text, kutsukoodi text, jasenia int)
language plpgsql security definer set search_path = public as $$
declare
  gid uuid;
  koodi text;
begin
  if auth.uid() is null then
    raise exception 'Kirjaudu sisään luodaksesi lukupiirin.';
  end if;
  if char_length(trim(nimi_in)) < 3 or char_length(trim(nimi_in)) > 40 then
    raise exception 'Lukupiirin nimen on oltava 3–40 merkkiä.';
  end if;
  loop
    -- Derive the code from gen_random_uuid() (a core function) rather than
    -- pgcrypto's gen_random_bytes, which lives in the `extensions` schema and
    -- is not on this function's search_path.
    koodi := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    begin
      insert into groups (nimi, kutsukoodi, created_by)
      values (trim(nimi_in), koodi, auth.uid())
      returning groups.id into gid;
      exit;
    exception when unique_violation then
      -- astronomically rare code collision: try another code
    end;
  end loop;
  insert into group_members (group_id, user_id) values (gid, auth.uid());
  return query
    select g.id, g.nimi, g.kutsukoodi, 1
    from groups g where g.id = gid;
end $$;

-- Join a group by invite code (idempotent: joining twice is fine).
create or replace function public.join_group(koodi_in text)
returns table (id uuid, nimi text, kutsukoodi text, jasenia int)
language plpgsql security definer set search_path = public as $$
declare
  gid uuid;
begin
  if auth.uid() is null then
    raise exception 'Kirjaudu sisään liittyäksesi lukupiiriin.';
  end if;
  select g.id into gid from groups g
  where g.kutsukoodi = upper(trim(koodi_in));
  if gid is null then
    raise exception 'Kutsukoodilla ei löytynyt lukupiiriä.';
  end if;
  insert into group_members (group_id, user_id)
  values (gid, auth.uid())
  on conflict do nothing;
  return query
    select g.id, g.nimi, g.kutsukoodi,
           (select count(*)::int from group_members m where m.group_id = g.id)
    from groups g where g.id = gid;
end $$;

-- Leave a group; the group itself is removed when the last member leaves.
create or replace function public.leave_group(gid uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from group_members
  where group_id = gid and user_id = auth.uid();
  delete from groups g
  where g.id = gid
    and not exists (select 1 from group_members m where m.group_id = g.id);
end $$;

-- Standings inside one group: members' usernames with all-time and
-- this-month book counts. Only callable by members of that group.
create or replace function public.group_scoreboard(gid uuid)
returns table (kayttajanimi text, kirjat int, kirjat_kuussa int)
language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from group_members m
    where m.group_id = gid and m.user_id = auth.uid()
  ) then
    raise exception 'Et ole tämän lukupiirin jäsen.';
  end if;
  return query
    select
      p.kayttajanimi,
      count(b.id)::int,
      count(b.id) filter (
        where b.valmistumispaiva >= date_trunc('month', current_date)
      )::int
    from group_members gm
    join profiles p on p.user_id = gm.user_id
    left join books b on b.user_id = gm.user_id
    where gm.group_id = gid
    group by p.kayttajanimi
    order by 2 desc;
end $$;

revoke all on function public.my_groups() from anon, public;
revoke all on function public.create_group(text) from anon, public;
revoke all on function public.join_group(text) from anon, public;
revoke all on function public.leave_group(uuid) from anon, public;
revoke all on function public.group_scoreboard(uuid) from anon, public;
grant execute on function public.my_groups() to authenticated;
grant execute on function public.create_group(text) to authenticated;
grant execute on function public.join_group(text) to authenticated;
grant execute on function public.leave_group(uuid) to authenticated;
grant execute on function public.group_scoreboard(uuid) to authenticated;

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
