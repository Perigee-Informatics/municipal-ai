-- Short Training Packages: AI in Judiciary ('judiciary'), a 2-hour hands-on session for judges and
-- court officers (judiciary/index.html, in English). No pre/post assessment or question bank.
-- Applied to the live database on 2026-11-26.
alter table public.exercise_answers drop constraint if exists exercise_answers_package_key_check;
alter table public.exercise_answers add constraint exercise_answers_package_key_check
  check (package_key in ('employee', 'representative', 'cso', 'hied', 'judiciary'));

insert into public.training_packages (key, name, is_short, description, audience, duration, sort_order)
values ('judiciary', 'AI in Judiciary', true,
  'Hands-on session on free AI tools for legal research, Likhat summary and translation, drafting support and case management, inside the Supreme Court of Nepal''s AI policy.',
  'Judges and court officers', '2 hours', 7)
on conflict (key) do update set is_short = true;

-- First event: National Judiciary Academy, 13 December 2026, 11:00–13:00, Hotel Country Villa, Nagarkot.
insert into public.events (code, name, organized_by, address, event_dates, package_id, materials_public, question_ids)
select 'AIJUD001', 'AI in Judiciary', 'National Judiciary Academy', 'Hotel Country Villa, Nagarkot', array['2026-12-13']::date[], id, false, '{}'
from public.training_packages where key = 'judiciary'
on conflict do nothing;
