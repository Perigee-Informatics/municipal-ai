alter table public.training_packages add column if not exists is_short boolean not null default false;

alter table public.exercise_answers drop constraint if exists exercise_answers_package_key_check;
alter table public.exercise_answers add constraint exercise_answers_package_key_check
  check (package_key in ('employee', 'representative', 'cso', 'hied'));

insert into public.training_packages (key, name, is_short)
values ('hied', 'AI for Higher Education', true)
on conflict (key) do update set is_short = true;