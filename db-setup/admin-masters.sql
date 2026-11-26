-- Master settings for the unified admin (/admin). Applied by hand like the other db-setup files.
-- ADDITIVE ONLY: new tables and new nullable/defaulted columns; nothing the workshop pages use changes.
--
-- 1. organizers           – one list of organisers (municipalities, CSOs, universities, agencies…)
--                           offered in the training-event and engagement forms. Events and
--                           engagements keep storing the organiser's name as text, so every
--                           existing page keeps working; the list only fills the pickers.
-- 2. invitation_settings  – whether new invitations are accepted (the "Open to invitations"
--                           badge and the Request form), the notice shown when closed, minimum
--                           notice and the currencies offered.
-- 3. training_packages    – description, audience, duration and order for the master list.

-- Who may manage: the portal admin (has_role 'admin') or the workshop trainer (is_trainer()).
create or replace function public.is_staff() returns boolean
  language sql stable security definer set search_path = public as
  $$ select public.has_role(auth.uid(), 'admin') or public.is_trainer() $$;
grant execute on function public.is_staff() to anon, authenticated;

-- 1. Organizers ---------------------------------------------------------------------------
create table if not exists public.organizers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_ne text,
  kind text not null default 'other' check (kind in
    ('municipality','rural_municipality','cso','university','government','international','private','other')),
  city text,
  country text default 'Nepal',
  contact_person text,
  email text,
  phone text,
  website text,
  notes text,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create unique index if not exists organizers_name_key on public.organizers (lower(btrim(name)));
alter table public.organizers enable row level security;
drop policy if exists "organizers: staff read" on public.organizers;
create policy "organizers: staff read" on public.organizers for select to authenticated using (public.is_staff());
drop policy if exists "organizers: staff write" on public.organizers;
create policy "organizers: staff write" on public.organizers for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
revoke all on public.organizers from anon;
grant select, insert, update, delete on public.organizers to authenticated;
grant all on public.organizers to service_role;

-- Seed from the organisers already used by trainings and engagements.
insert into public.organizers (name, kind, city)
select distinct on (lower(btrim(n))) btrim(n),
  case when n ~ 'गाउँपालिका' then 'rural_municipality'
       when n ~ 'नगरपालिका|Metropolitan|Municipality' then 'municipality'
       when n ~* 'universit|college|campus|school|academy' then 'university'
       when n ~* 'ministry|authority|commission|court|government|department|office' then 'government'
       when n ~* 'UN|UNDP|UNESCO|WHO|World Bank|ICIMOD|APN|ADB|Swisscontact' then 'international'
       when n ~* 'foundation|group|association|federation|forum|network|NGO|society' then 'cso'
       else 'other' end,
  null
from (
  select organized_by as n from public.events
  union all select organizer from public.stories
) s
where coalesce(btrim(n), '') <> ''
on conflict do nothing;

-- 2. Invitation settings -------------------------------------------------------------------
create table if not exists public.invitation_settings (
  id int primary key default 1 check (id = 1),
  accepting boolean not null default true,
  closed_message text,
  closed_message_ne text,
  min_notice_days int not null default 0 check (min_notice_days between 0 and 365),
  currencies text[] not null default array['NPR','USD','EUR','INR','GBP','THB','JPY','AUD'],
  default_currency text not null default 'NPR',
  updated_at timestamptz not null default now()
);
insert into public.invitation_settings (id) values (1) on conflict do nothing;
alter table public.invitation_settings enable row level security;
drop policy if exists "invitation settings: anyone reads" on public.invitation_settings;
create policy "invitation settings: anyone reads" on public.invitation_settings for select to anon, authenticated using (true);
drop policy if exists "invitation settings: admin writes" on public.invitation_settings;
create policy "invitation settings: admin writes" on public.invitation_settings for update to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
grant select on public.invitation_settings to anon, authenticated;
grant update on public.invitation_settings to authenticated;
grant all on public.invitation_settings to service_role;
drop trigger if exists t_invset_upd on public.invitation_settings;
create trigger t_invset_upd before update on public.invitation_settings for each row execute function public.touch_updated_at();

-- 3. Training packages: descriptive fields for the master list -----------------------------
alter table public.training_packages add column if not exists description text;
alter table public.training_packages add column if not exists audience text;
alter table public.training_packages add column if not exists duration text;
alter table public.training_packages add column if not exists sort_order int not null default 0;
