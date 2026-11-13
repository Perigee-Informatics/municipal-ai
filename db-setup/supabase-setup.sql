-- MuniAI workshop: events, accounts, trainer approval and row-level security.
-- Run once in the Supabase SQL editor for the project, AFTER the matching pages are pushed.
-- This file is not a migration. It is applied by hand so each step can be checked.

-- 0. Results table used by the assessment pages. Created only if missing (the live project already has it).
create table if not exists public.assessment_results (
  id            uuid primary key default gen_random_uuid(),
  test          text not null check (test in ('pre', 'post')),
  code          text,
  gender        text,
  age_group     text,
  education     text,
  answers       jsonb,
  score         int,
  max_score     int,
  seconds       int,
  submitted_at  timestamptz,
  session_code  text,
  user_id       uuid,
  question_ids  int[],
  created_at    timestamptz not null default now()
);

-- 1. Event master: one row per training event.
create table if not exists public.events (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,
  name          text not null,
  organized_by  text,
  address       text,
  event_dates   date[] not null default '{}',
  pre_open      boolean not null default false,
  post_open     boolean not null default false,
  created_at    timestamptz not null default now()
);

-- 2. Profiles: one row per account. New sign-ups start as 'participant' / 'pending' with no event.
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  gender      text,
  age_group   text,
  education   text,
  office      text,
  role        text not null default 'participant' check (role in ('participant', 'trainer')),
  status      text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  event_id    uuid references public.events(id),
  created_at  timestamptz not null default now()
);

-- If the profiles table already exists without event_id, add it:
alter table public.profiles add column if not exists event_id uuid references public.events(id);

-- 3. Create a profile automatically when someone signs up (details come from the sign-up form).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, gender, age_group, education, office)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'gender',
    new.raw_user_meta_data->>'age_group',
    new.raw_user_meta_data->>'education',
    new.raw_user_meta_data->>'office'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. Helper checks used by the policies below.
create or replace function public.is_trainer()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles
                 where id = auth.uid() and role = 'trainer' and status = 'approved');
$$;

create or replace function public.is_approved()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles
                 where id = auth.uid() and status = 'approved');
$$;

-- Event policies need is_trainer(), so they are applied here, after the helper functions.
alter table public.events enable row level security;

drop policy if exists "events: signed-in read" on public.events;
create policy "events: signed-in read" on public.events
  for select to authenticated
  using (true);

drop policy if exists "events: trainer writes" on public.events;
create policy "events: trainer writes" on public.events
  for all to authenticated
  using (public.is_trainer())
  with check (public.is_trainer());


-- 5. Profiles: people see their own profile; the trainer sees and updates all.
alter table public.profiles enable row level security;

drop policy if exists "profile: own or trainer read" on public.profiles;
create policy "profile: own or trainer read" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_trainer());

drop policy if exists "profile: trainer updates" on public.profiles;
create policy "profile: trainer updates" on public.profiles
  for update to authenticated
  using (public.is_trainer())
  with check (public.is_trainer());

-- 6. Settings: one switch that makes the training material public or private.
create table if not exists public.app_settings (
  key    text primary key,
  value  boolean not null default false
);
insert into public.app_settings (key, value) values ('materials_public', false)
  on conflict (key) do nothing;

alter table public.app_settings enable row level security;

drop policy if exists "settings: anyone reads" on public.app_settings;
create policy "settings: anyone reads" on public.app_settings
  for select to anon, authenticated
  using (true);

drop policy if exists "settings: trainer writes" on public.app_settings;
create policy "settings: trainer writes" on public.app_settings
  for update to authenticated
  using (public.is_trainer())
  with check (public.is_trainer());

-- 7. Results: tied to the participant, and only accepted while that test is open for their event.
alter table public.assessment_results add column if not exists user_id uuid references auth.users(id);
alter table public.assessment_results enable row level security;

drop policy if exists "Allow anon insert" on public.assessment_results;
drop policy if exists "Allow anon select" on public.assessment_results;
revoke select, insert on public.assessment_results from anon;

drop policy if exists "results: approved insert own" on public.assessment_results;
drop policy if exists "results: open test for own event" on public.assessment_results;
create policy "results: open test for own event" on public.assessment_results
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.profiles p
      join public.events e on e.id = p.event_id
      where p.id = auth.uid()
        and p.status = 'approved'
        and e.code = session_code
        and ((test = 'pre' and e.pre_open) or (test = 'post' and e.post_open))
    )
  );

drop policy if exists "results: own or trainer read" on public.assessment_results;
create policy "results: own or trainer read" on public.assessment_results
  for select to authenticated
  using (user_id = auth.uid() or public.is_trainer());

-- 8. Old session-code table: no longer used by the pages. Remove open access to it.
do $$
begin
  if to_regclass('public.training_sessions') is not null then
    execute 'drop policy if exists "Allow anon select training_sessions" on public.training_sessions';
    execute 'revoke select on public.training_sessions from anon';
  end if;
end $$;

-- 9. After the trainer account is created (sign up once in the page), make it the trainer:
--    update public.profiles set role = 'trainer', status = 'approved'
--    where id = (select id from auth.users where email = 'TRAINER_EMAIL_HERE');

-- 10. Public survey (QR link, no sign-up) and answer reveal. Set per event in the admin page.
--     pre_open / post_open: the on/off switch for each test (applies to QR and signed-in participants).
--     pre_answers / post_answers: when on, participants also see correct answers and explanations.
alter table public.events add column if not exists pre_answers boolean not null default false;
alter table public.events add column if not exists post_answers boolean not null default false;
-- The 20 pool question ids for this event (chosen randomly in the admin page, 4 simple + 10 medium + 6 complex).
alter table public.events add column if not exists question_ids int[] not null default '{}';
-- The question ids each response was answered against (so results stay tied to the right questions).
alter table public.assessment_results add column if not exists question_ids int[];

-- Event info for the QR page. Returns only non-sensitive columns.
drop function if exists public.public_event_info(text);
create or replace function public.public_event_info(p_code text)
returns table(name text, address text, event_dates date[], pre_ok boolean, post_ok boolean, pre_answers boolean, post_answers boolean, question_ids int[])
language sql stable security definer set search_path = public as $$
  select e.name, e.address, e.event_dates, e.pre_open, e.post_open, e.pre_answers, e.post_answers, e.question_ids
  from public.events e
  where e.code = upper(p_code)
  limit 1;
$$;

create or replace function public.event_test_open(p_code text, p_test text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.events e
    where e.code = p_code
      and ((p_test = 'pre' and e.pre_open) or (p_test = 'post' and e.post_open))
  );
$$;

-- Answers and score for one participant code, only while answers are switched on for that test.
create or replace function public.public_review(p_code text, p_test text, p_participant text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('answers', r.answers, 'score', r.score, 'max', r.max_score)
  from public.assessment_results r
  join public.events e on e.code = r.session_code
  where e.code = upper(p_code)
    and r.session_code = upper(p_code)
    and r.test = p_test
    and r.code = upper(p_participant)
    and r.user_id is null
    and ((p_test = 'pre' and e.pre_answers) or (p_test = 'post' and e.post_answers))
  order by r.submitted_at asc
  limit 1;
$$;

grant execute on function public.public_event_info(text) to anon, authenticated;
grant execute on function public.event_test_open(text, text) to anon, authenticated;
grant execute on function public.public_review(text, text, text) to anon, authenticated;

-- The question set for an event code. Anonymous visitors cannot read the events table,
-- so the survey's insert check goes through this function.
create or replace function public.event_question_ids(p_code text)
returns int[] language sql stable security definer set search_path = public as $$
  select e.question_ids from public.events e where e.code = upper(p_code) limit 1;
$$;
grant execute on function public.event_question_ids(text) to anon, authenticated;

-- Anonymous responses: insert only (never read), and only while that test is open.
grant insert on public.assessment_results to anon;
drop policy if exists "results: public insert while open" on public.assessment_results;
create policy "results: public insert while open" on public.assessment_results
  for insert to anon
  with check (
    user_id is null
    and public.event_test_open(session_code, test)
    and question_ids = public.event_question_ids(session_code)
  );

-- 11. Training packages. Each package has its own question pool and its own events.
--     'employee' = AI for Municipal Employee (pool ids 1-50); 'representative' = AI for Municipal Representative (pool ids 101-150).
create table if not exists public.training_packages (
  id         uuid primary key default gen_random_uuid(),
  key        text not null unique,
  name       text not null,
  created_at timestamptz not null default now()
);
alter table public.training_packages enable row level security;

drop policy if exists "packages: signed-in read" on public.training_packages;
create policy "packages: signed-in read" on public.training_packages
  for select to authenticated
  using (true);

drop policy if exists "packages: trainer writes" on public.training_packages;
create policy "packages: trainer writes" on public.training_packages
  for all to authenticated
  using (public.is_trainer())
  with check (public.is_trainer());

insert into public.training_packages (key, name) values
  ('employee', 'AI for Municipal Employee'),
  ('representative', 'AI for Municipal Representative')
on conflict (key) do nothing;

alter table public.events add column if not exists package_id uuid references public.training_packages(id);
update public.events
   set package_id = (select id from public.training_packages where key = 'employee')
 where package_id is null;

-- Whether an event code exists. Visitors cannot read the events table, so checks go through this function.
create or replace function public.event_exists(p_code text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.events e where e.code = upper(p_code));
$$;
grant execute on function public.event_exists(text) to anon, authenticated;

-- 12. Workshop feedback (section 12 form). Anyone can submit for an existing event code; only the trainer reads.
create table if not exists public.workshop_feedback (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  event_code    text not null,
  ratings       int[] not null check (array_length(ratings, 1) = 6),
  best_session  text,
  improve       text,
  first_ai_use  text,
  recommend     boolean not null default false
);
alter table public.workshop_feedback enable row level security;
revoke all on public.workshop_feedback from anon;
grant insert on public.workshop_feedback to anon;
grant insert, select on public.workshop_feedback to authenticated;

drop policy if exists "feedback: insert for existing event" on public.workshop_feedback;
create policy "feedback: insert for existing event" on public.workshop_feedback
  for insert to anon, authenticated
  with check (public.event_exists(event_code));

drop policy if exists "feedback: trainer reads" on public.workshop_feedback;
create policy "feedback: trainer reads" on public.workshop_feedback
  for select to authenticated
  using (public.is_trainer());

-- 13. Participants complete their own details after a manual registration (or any first sign-in).
--     Only the signed-in user's own details can change; status, role and event stay under trainer control.
create or replace function public.save_my_profile(
  p_full_name text, p_gender text, p_age_group text, p_education text, p_office text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not-signed-in'; end if;
  if coalesce(trim(p_full_name), '') = '' then raise exception 'name-required'; end if;
  if p_gender is not null and p_gender <> '' and p_gender not in ('Male','Female','Others') then raise exception 'bad-gender'; end if;
  if p_age_group is not null and p_age_group <> '' and p_age_group not in ('Below 20','20-30','30-40','40-50','50 and above') then raise exception 'bad-age'; end if;
  if p_education is not null and p_education <> '' and p_education not in ('High School','Undergraduate','Masters and Above') then raise exception 'bad-education'; end if;
  update public.profiles
     set full_name = trim(p_full_name),
         gender = nullif(p_gender, ''),
         age_group = nullif(p_age_group, ''),
         education = nullif(p_education, ''),
         office = nullif(trim(coalesce(p_office, '')), '')
   where id = auth.uid();
end;
$$;
revoke all on function public.save_my_profile(text, text, text, text, text) from public;
grant execute on function public.save_my_profile(text, text, text, text, text) to authenticated;

-- Anonymous visitors (the QR survey) never read these tables directly. Row-level security also applies.
revoke all on public.profiles, public.events, public.training_packages from anon;
grant select on public.training_packages to authenticated;

-- 14. Organiser, place and dates for an event code, so the workshop pages can show them to
--     visitors who are not signed in (a link with ?event=CODE). Only non-sensitive columns.
create or replace function public.public_event_brand(p_code text)
returns table(organized_by text, address text, event_dates date[])
language sql stable security definer set search_path = public as $$
  select e.organized_by, e.address, e.event_dates
  from public.events e
  where e.code = upper(p_code)
  limit 1;
$$;
grant execute on function public.public_event_brand(text) to anon, authenticated;

-- 15. The active event. At most one event is active; visitors who are not signed in see the
--     organiser, place and dates of the active event (not its code). Only the trainer changes it.
alter table public.events add column if not exists is_active boolean not null default false;
create unique index if not exists events_one_active on public.events ((true)) where is_active;

create or replace function public.set_active_event(p_code text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_trainer() then
    raise exception 'only the trainer can choose the active event';
  end if;
  update public.events set is_active = false where is_active;
  if coalesce(p_code, '') <> '' then
    update public.events set is_active = true where code = upper(p_code);
    if not found then raise exception 'no event with code %', p_code; end if;
  end if;
end;
$$;
revoke all on function public.set_active_event(text) from public, anon;
grant execute on function public.set_active_event(text) to authenticated;

create or replace function public.active_event_brand()
returns table(name text, organized_by text, address text, event_dates date[], package_key text)
language sql stable security definer set search_path = public as $$
  select e.name, e.organized_by, e.address, e.event_dates, p.key
  from public.events e
  left join public.training_packages p on p.id = e.package_id
  where e.is_active
  limit 1;
$$;
grant execute on function public.active_event_brand() to anon, authenticated;

-- 15. Ideal answers to the workshop exercises. Only an approved trainer can read or change them;
--     trainees (and anonymous visitors) get no rows. The answer text is NOT kept in this repository
--     (it is public); it lives only in this table.
create table if not exists public.exercise_answers (
  key          text primary key,
  package_key  text not null check (package_key in ('employee', 'representative')),
  html         text not null,
  updated_at   timestamptz not null default now()
);
alter table public.exercise_answers enable row level security;
revoke all on public.exercise_answers from anon;
revoke all on public.exercise_answers from authenticated;
grant select, insert, update, delete on public.exercise_answers to authenticated;
drop policy if exists "answers: trainer only" on public.exercise_answers;
create policy "answers: trainer only" on public.exercise_answers
  for all to authenticated
  using (public.is_trainer())
  with check (public.is_trainer());
