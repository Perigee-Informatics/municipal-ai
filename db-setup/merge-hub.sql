-- Merge of Dr. Ghimire's Hub (dr-ghimire.lovable.app) into AI for ALL.
-- Applied by hand, like supabase-setup.sql. Everything here is ADDITIVE: no existing table,
-- column, function or policy used by the /workshop pages is changed or dropped.
--
-- Result: one database for the personal portfolio, every engagement (Events, Story Map,
-- Gallery), invitations / appointment requests, the private calendar with Google sync,
-- and the AI for ALL trainings. Trainings stay in `events` (assessments, participants);
-- each training also has one row in `stories`, the master list of engagements, linked by
-- stories.training_event_id and kept in step by a trigger.
--
-- Admin of the personal portal = public.has_role(uid, 'admin') from user_roles (only
-- dr.bghimire@gmail.com). This is separate from the workshop "trainer" role.

-- 1. Roles --------------------------------------------------------------------------------
do $$ begin
  create type public.app_role as enum ('admin', 'user');
exception when duplicate_object then null; end $$;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);
alter table public.user_roles enable row level security;
create or replace function public.has_role(_user_id uuid, _role public.app_role) returns boolean
  language sql stable security definer set search_path = public as
  $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;
drop policy if exists "own roles" on public.user_roles;
create policy "own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.user_roles from anon, authenticated;
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where lower(email) = 'dr.bghimire@gmail.com'
on conflict do nothing;

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = public as
  $$ begin new.updated_at = now(); return new; end $$;

-- 2. Portfolio -----------------------------------------------------------------------------
create table if not exists public.profile (
  id int primary key default 1 check (id = 1),
  full_name text not null, full_name_ne text,
  headline text, headline_ne text,
  short_bio text, short_bio_ne text,
  long_bio text, long_bio_ne text,
  photo_url text, email text, phone text, location text,
  facebook text, linkedin text, instagram text, google_scholar text, researchgate text, orcid text, website text,
  updated_at timestamptz not null default now(),
  facebook_followers text, linkedin_followers text, linkedin_connections text, cv_path text
);
create table if not exists public.highlights (id uuid primary key default gen_random_uuid(), value text not null, label text not null, label_ne text, sort_order int not null default 0);
create table if not exists public.expertise (id uuid primary key default gen_random_uuid(), title text not null, title_ne text, description text, description_ne text, sort_order int not null default 0);
create table if not exists public.education (id uuid primary key default gen_random_uuid(), degree text not null, degree_ne text, institution text not null, institution_ne text, location text, year text, notes text, notes_ne text, sort_order int not null default 0);
create table if not exists public.experience (id uuid primary key default gen_random_uuid(), title text not null, title_ne text, organization text not null, organization_ne text, period text, description text, description_ne text, category text not null default 'career', sort_order int not null default 0, start_date date, end_date date);
create table if not exists public.publications (id uuid primary key default gen_random_uuid(), title text not null, authors text, venue text, year text, url text, sort_order int not null default 0);
create table if not exists public.certifications (id uuid primary key default gen_random_uuid(), name text not null, name_ne text, issuer text, year text, kind text not null default 'certification', sort_order int not null default 0);
create table if not exists public.event_types (id uuid primary key default gen_random_uuid(), name text not null, name_ne text, active boolean not null default true, sort_order int not null default 0);
create table if not exists public.roles (id uuid primary key default gen_random_uuid(), name text not null, name_ne text, active boolean not null default true, sort_order int not null default 0);

drop trigger if exists t_prof_upd on public.profile;
create trigger t_prof_upd before update on public.profile for each row execute function public.touch_updated_at();

-- 3. Invitations / appointment requests ----------------------------------------------------
create table if not exists public.appointment_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending','accepted','declined','tentative')),
  show_publicly boolean not null default false,
  event_type_id uuid references public.event_types(id) on delete set null,
  role_id uuid references public.roles(id) on delete set null,
  event_title text not null, organization text not null, description text,
  timezone text not null default 'Asia/Kathmandu',
  basis text not null default 'paid' check (basis in ('paid','volunteer')),
  honorarium numeric, currency text,
  venue_mode text not null default 'in_person' check (venue_mode in ('in_person','online','hybrid')),
  venue_name text, address text, city text, country text, online_link text,
  requester_name text not null, requester_email text not null, requester_phone text, requester_designation text,
  attachment_path text,
  private_notes text
);
create table if not exists public.request_sessions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.appointment_requests(id) on delete cascade,
  session_date date not null, start_time time not null, end_time time not null,
  google_event_id text
);
create index if not exists request_sessions_request_id_idx on public.request_sessions(request_id);
create index if not exists request_sessions_session_date_idx on public.request_sessions(session_date);
drop trigger if exists t_req_upd on public.appointment_requests;
create trigger t_req_upd before update on public.appointment_requests for each row execute function public.touch_updated_at();

-- 4. Engagements (master list of events) and their media -----------------------------------
create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  event_date date not null, end_date date,
  event_type_id uuid references public.event_types(id) on delete set null,
  role_id uuid references public.roles(id) on delete set null,
  title text not null, title_ne text, organizer text, city text, country text,
  latitude double precision, longitude double precision,
  location_needs_review boolean not null default false,
  description text, description_ne text, facebook_post_url text,
  is_public boolean not null default true,
  cover_media_id uuid,
  source_request_id uuid references public.appointment_requests(id) on delete set null,
  start_time time, end_time time,
  venue_mode text not null default 'in_person' check (venue_mode in ('in_person','online','hybrid')),
  venue_name text, online_link text, private_notes text,
  source text not null default 'site' check (source in ('site','request','google','training')),
  google_event_id text, google_synced_at timestamptz,
  google_sync boolean not null default true,
  -- link to an AI for ALL training (public.events); one engagement per training
  training_event_id uuid references public.events(id) on delete set null
);
create table if not exists public.story_media (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  storage_path text not null,
  media_type text not null default 'image' check (media_type in ('image','video')),
  caption text, sort_order int not null default 0, source_url text,
  created_at timestamptz not null default now()
);
do $$ begin
  alter table public.stories add constraint stories_cover_fk foreign key (cover_media_id) references public.story_media(id) on delete set null;
exception when duplicate_object then null; end $$;
create index if not exists stories_event_date_idx on public.stories(event_date);
create unique index if not exists stories_google_event_id_key on public.stories(google_event_id) where google_event_id is not null;
create unique index if not exists stories_training_event_id_key on public.stories(training_event_id) where training_event_id is not null;
create index if not exists story_media_story_id_idx on public.story_media(story_id);
create unique index if not exists story_media_source_uniq on public.story_media(story_id, source_url) where source_url is not null;
drop trigger if exists t_story_upd on public.stories;
create trigger t_story_upd before update on public.stories for each row execute function public.touch_updated_at();

-- 5. Server-only tables --------------------------------------------------------------------
create table if not exists public.app_secrets (key text primary key, value text not null, created_at timestamptz not null default now());
create table if not exists public.google_calendar_auth (
  id int primary key default 1 check (id = 1),
  refresh_token text, calendar_id text not null default 'primary', connected_email text,
  updated_at timestamptz not null default now(),
  use_main boolean not null default false, engagements_calendar_id text,
  sync_token text, last_pulled_at timestamptz,
  watch_channel_id text, watch_resource_id text, watch_expires_at timestamptz
);

-- 6. Row-level security --------------------------------------------------------------------
alter table public.profile enable row level security;
alter table public.highlights enable row level security;
alter table public.expertise enable row level security;
alter table public.education enable row level security;
alter table public.experience enable row level security;
alter table public.publications enable row level security;
alter table public.certifications enable row level security;
alter table public.event_types enable row level security;
alter table public.roles enable row level security;
alter table public.appointment_requests enable row level security;
alter table public.request_sessions enable row level security;
alter table public.stories enable row level security;
alter table public.story_media enable row level security;
alter table public.app_secrets enable row level security;
alter table public.google_calendar_auth enable row level security;

do $$ declare t text; begin
  foreach t in array array['profile','highlights','expertise','education','experience','publications','certifications','event_types','roles'] loop
    execute format('drop policy if exists "public read" on public.%I', t);
    execute format('drop policy if exists "admin write" on public.%I', t);
    execute format('create policy "public read" on public.%I for select to anon, authenticated using (true)', t);
    execute format('create policy "admin write" on public.%I for all to authenticated using (public.has_role(auth.uid(),''admin'')) with check (public.has_role(auth.uid(),''admin''))', t);
  end loop;
end $$;

create or replace function public.request_is_fresh(_id uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.appointment_requests where id = _id and status = 'pending' and created_at > now() - interval '10 minutes')
$$;
drop policy if exists "anyone submit" on public.appointment_requests;
create policy "anyone submit" on public.appointment_requests for insert to anon, authenticated
  with check (status = 'pending' and show_publicly = false and private_notes is null);
drop policy if exists "admin all requests" on public.appointment_requests;
create policy "admin all requests" on public.appointment_requests for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
drop policy if exists "anyone add sessions" on public.request_sessions;
create policy "anyone add sessions" on public.request_sessions for insert to anon, authenticated
  with check (public.request_is_fresh(request_id));
drop policy if exists "admin all sessions" on public.request_sessions;
create policy "admin all sessions" on public.request_sessions for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create or replace function public.story_is_public(_id uuid) returns boolean language sql stable security definer set search_path = public as
  $$ select exists (select 1 from public.stories where id = _id and is_public) $$;
drop policy if exists "public read stories" on public.stories;
create policy "public read stories" on public.stories for select to anon, authenticated using (is_public or public.has_role(auth.uid(),'admin'));
drop policy if exists "admin write stories" on public.stories;
create policy "admin write stories" on public.stories for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
drop policy if exists "public read media" on public.story_media;
create policy "public read media" on public.story_media for select to anon, authenticated using (public.story_is_public(story_id) or public.has_role(auth.uid(),'admin'));
drop policy if exists "admin write media" on public.story_media;
create policy "admin write media" on public.story_media for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- Grants. Visitors never read the phone number, private notes, online links or sync data.
grant select on public.highlights, public.expertise, public.education, public.experience, public.publications, public.certifications, public.event_types, public.roles, public.story_media to anon, authenticated;
grant select on public.profile, public.stories to authenticated;
grant insert, update, delete on public.profile, public.highlights, public.expertise, public.education, public.experience, public.publications, public.certifications, public.event_types, public.roles, public.stories, public.story_media to authenticated;
grant insert on public.appointment_requests, public.request_sessions to anon, authenticated;
grant select, update, delete on public.appointment_requests, public.request_sessions to authenticated;
revoke all on public.profile, public.stories from anon;
grant select (
  id, full_name, full_name_ne, headline, headline_ne, short_bio, short_bio_ne, long_bio, long_bio_ne,
  photo_url, email, location, facebook, linkedin, instagram, google_scholar, researchgate, orcid, website,
  facebook_followers, linkedin_followers, linkedin_connections, cv_path, updated_at
) on public.profile to anon;
grant select (id, created_at, updated_at, event_date, end_date, event_type_id, role_id, title, title_ne, organizer,
  city, country, latitude, longitude, location_needs_review, description, description_ne, facebook_post_url,
  is_public, cover_media_id, start_time, end_time, venue_mode, venue_name, training_event_id) on public.stories to anon;
revoke all on public.app_secrets, public.google_calendar_auth from anon, authenticated;
grant all on public.profile, public.highlights, public.expertise, public.education, public.experience, public.publications,
  public.certifications, public.event_types, public.roles, public.appointment_requests, public.request_sessions,
  public.stories, public.story_media, public.app_secrets, public.google_calendar_auth to service_role;

-- 7. Functions used by the public pages ----------------------------------------------------
create or replace function public.get_public_events()
returns table (id uuid, event_title text, organization text, city text, country text, venue_mode text, event_type text, event_type_ne text, role text, role_ne text, session_date date, start_time time, end_time time)
language sql stable security definer set search_path = public as $$
  select s.id, s.title, coalesce(s.organizer, ''), s.city, s.country, s.venue_mode, et.name, et.name_ne, ro.name, ro.name_ne,
         d::date, s.start_time, s.end_time
  from public.stories s
  cross join lateral generate_series(s.event_date, least(greatest(coalesce(s.end_date, s.event_date), s.event_date), s.event_date + 60), interval '1 day') d
  left join public.event_types et on et.id = s.event_type_id
  left join public.roles ro on ro.id = s.role_id
  where s.is_public
  order by d, s.start_time nulls first
$$;
grant execute on function public.get_public_events() to anon, authenticated;

create or replace function public.recent_request_count(_email text) returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from public.appointment_requests where lower(requester_email) = lower(_email) and created_at > now() - interval '1 hour'
$$;
grant execute on function public.recent_request_count(text) to anon, authenticated;

create or replace function public.story_media_path_is_public(_path text) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.story_media m join public.stories s on s.id = m.story_id where m.storage_path = _path and s.is_public)
$$;
grant execute on function public.story_media_path_is_public(text) to anon, authenticated;

-- Gallery: training photos the trainer featured (event-media, public bucket) and photos of
-- public engagements (story-media, signed URLs), each tagged to its engagement.
create or replace function public.public_gallery(p_limit int default 200)
returns table (id uuid, source text, bucket text, kind text, path text, thumb_path text, caption text,
               width int, height int, story_id uuid, story_title text, story_title_ne text, event_date date,
               city text, organizer text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select * from (
    select m.id, 'training'::text as source, 'event-media'::text as bucket, m.kind, m.path, m.thumb_path, m.caption,
           m.width, m.height, s.id as story_id, coalesce(s.title, e.name) as story_title, s.title_ne as story_title_ne,
           coalesce(s.event_date, e.event_dates[1]) as event_date, s.city,
           coalesce(s.organizer, e.organized_by) as organizer, m.created_at
    from public.event_media m
    join public.events e on e.id = m.event_id
    left join public.stories s on s.training_event_id = e.id
    where m.featured and (s.id is null or s.is_public)
    union all
    select m.id, 'engagement', 'story-media', case when m.media_type = 'video' then 'video' else 'photo' end,
           m.storage_path, '', coalesce(m.caption, ''), null, null,
           s.id, s.title, s.title_ne, s.event_date, s.city, s.organizer, m.created_at
    from public.story_media m join public.stories s on s.id = m.story_id
    where s.is_public
  ) g
  order by event_date desc nulls last, created_at desc
  limit greatest(1, least(coalesce(p_limit, 200), 1000));
$$;
grant execute on function public.public_gallery(int) to anon, authenticated;

-- 8. Trainings appear in the master list automatically ------------------------------------
-- When the trainer creates or edits a training in the workshop console, its engagement is
-- created or its name/organiser/dates refreshed. Never blocks the workshop: any error is
-- only logged as a warning.
create or replace function public.sync_training_story() returns trigger
language plpgsql security definer set search_path = public as $$
declare d1 date; d2 date;
begin
  begin
    select min(x), max(x) into d1, d2 from unnest(new.event_dates) x;
    if d1 is null then return new; end if;
    if exists (select 1 from public.stories where training_event_id = new.id) then
      -- the English title is kept once edited; it follows the training's name only while equal to it
      update public.stories set
        title = case when tg_op = 'UPDATE' and title = old.name then new.name else title end,
        title_ne = new.name, organizer = new.organized_by,
        event_date = d1, end_date = nullif(d2, d1)
      where training_event_id = new.id;
    else
      insert into public.stories (training_event_id, source, title, title_ne, organizer, event_date, end_date,
        city, country, location_needs_review, is_public, event_type_id, role_id, google_sync)
      values (new.id, 'training', new.name, new.name, new.organized_by, d1, nullif(d2, d1),
        nullif(trim(split_part(coalesce(new.address, ''), ',', 1)), ''), 'Nepal', true, true,
        (select id from public.event_types where lower(name) = 'training' order by sort_order limit 1),
        (select id from public.roles where lower(name) = 'trainer' order by sort_order limit 1),
        true);
    end if;
  exception when others then
    raise warning 'sync_training_story(%): %', new.id, sqlerrm;
  end;
  return new;
end $$;
drop trigger if exists events_sync_story on public.events;
create trigger events_sync_story after insert or update of name, organized_by, event_dates on public.events
  for each row execute function public.sync_training_story();

-- 9. Storage buckets (private; files are served with signed URLs or the policies below) ---
insert into storage.buckets (id, name, public, file_size_limit) values
  ('attachments', 'attachments', false, 10485760),
  ('story-media', 'story-media', false, 209715200),
  ('site-files', 'site-files', false, 20971520)
on conflict (id) do nothing;

drop policy if exists "anyone upload attachments" on storage.objects;
create policy "anyone upload attachments" on storage.objects for insert to anon, authenticated with check (bucket_id = 'attachments');
drop policy if exists "admin read attachments" on storage.objects;
create policy "admin read attachments" on storage.objects for select to authenticated using (bucket_id = 'attachments' and public.has_role(auth.uid(),'admin'));
drop policy if exists "public read story media files" on storage.objects;
create policy "public read story media files" on storage.objects for select to anon, authenticated
  using (bucket_id = 'story-media' and (public.story_media_path_is_public(name) or public.has_role(auth.uid(), 'admin')));
drop policy if exists "admin insert story media" on storage.objects;
create policy "admin insert story media" on storage.objects for insert to authenticated with check (bucket_id = 'story-media' and public.has_role(auth.uid(),'admin'));
drop policy if exists "admin update story media" on storage.objects;
create policy "admin update story media" on storage.objects for update to authenticated using (bucket_id = 'story-media' and public.has_role(auth.uid(),'admin'));
drop policy if exists "admin delete story media" on storage.objects;
create policy "admin delete story media" on storage.objects for delete to authenticated using (bucket_id = 'story-media' and public.has_role(auth.uid(),'admin'));
drop policy if exists "public read site files" on storage.objects;
create policy "public read site files" on storage.objects for select to anon, authenticated using (bucket_id = 'site-files');
drop policy if exists "admin insert site files" on storage.objects;
create policy "admin insert site files" on storage.objects for insert to authenticated with check (bucket_id = 'site-files' and public.has_role(auth.uid(),'admin'));
drop policy if exists "admin update site files" on storage.objects;
create policy "admin update site files" on storage.objects for update to authenticated using (bucket_id = 'site-files' and public.has_role(auth.uid(),'admin'));
drop policy if exists "admin delete site files" on storage.objects;
create policy "admin delete site files" on storage.objects for delete to authenticated using (bucket_id = 'site-files' and public.has_role(auth.uid(),'admin'));
