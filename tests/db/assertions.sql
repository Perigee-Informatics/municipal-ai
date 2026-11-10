-- Behaviour tests for db-setup/supabase-setup.sql. Each check raises an exception when it fails.
create or replace function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin
  if not coalesce(ok, false) then raise exception 'FAILED: %', what; end if;
  raise notice 'ok - %', what;
end $$;

create or replace function pg_temp.expect_error(stmt text, what text) returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    raise notice 'ok - % (rejected: %)', what, sqlerrm;
    return;
  end;
  raise exception 'FAILED: % (was allowed)', what;
end $$;

-- ---- fixtures (as the platform owner) ----
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000001', 'trainer@test.local', '{"full_name":"Trainer"}'),
  ('00000000-0000-0000-0000-000000000002', 'p1@test.local', '{"full_name":"Participant One","gender":"Female","age_group":"20-30","education":"Undergraduate","office":"Ward"}'),
  ('00000000-0000-0000-0000-000000000003', 'p2@test.local', '{}');

-- Trainer approval (the documented one-time step).
update public.profiles set role = 'trainer', status = 'approved' where id = '00000000-0000-0000-0000-000000000001';

do $$
declare pkg uuid; begin
  select id into pkg from public.training_packages where key = 'employee';
  insert into public.events (code, name, event_dates, pre_open, post_open, pre_answers, post_answers, question_ids, package_id)
  values ('TST-01', 'Test event', '{2026-11-01}', true, false, true, false, array_fill(0, array[0]) || (select array_agg(g) from generate_series(1, 20) g), pkg);
end $$;

-- ---- 1. schema and seed ----
select pg_temp.check((select count(*) = 2 from public.training_packages where key in ('employee','representative')), 'two training packages seeded');
select pg_temp.check(to_regclass('public.workshop_feedback') is not null, 'workshop_feedback table exists');
select pg_temp.check((select count(*) = 1 from public.events where package_id is not null), 'event linked to a package');

-- ---- 2. sign-up trigger ----
select pg_temp.check((select full_name = 'Participant One' and status = 'pending' and role = 'participant' from public.profiles where id = '00000000-0000-0000-0000-000000000002'), 'sign-up creates a pending participant profile with details');

-- Approve participant 2 to the event (what the admin page does), participant 1 stays pending.
update public.profiles set status = 'approved', event_id = (select id from public.events where code = 'TST-01') where id = '00000000-0000-0000-0000-000000000003';
update public.profiles set status = 'approved', event_id = (select id from public.events where code = 'TST-01') where id = '00000000-0000-0000-0000-000000000002';

-- ---- 3. save_my_profile: own details only, validated, cannot change status/event ----
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', false);
select pg_temp.expect_error($q$select public.save_my_profile('', 'Male', '', '', '')$q$, 'empty name rejected');
select pg_temp.expect_error($q$select public.save_my_profile('X', 'Robot', '', '', '')$q$, 'invalid gender rejected');
select pg_temp.expect_error($q$select public.save_my_profile('X', '', '70+', '', '')$q$, 'invalid age group rejected');
select public.save_my_profile('  Participant Two  ', 'Male', '30-40', 'Masters and Above', 'Office');
reset role;
select pg_temp.check((select full_name = 'Participant Two' and gender = 'Male' and office = 'Office' and status = 'approved' and event_id is not null from public.profiles where id = '00000000-0000-0000-0000-000000000003'), 'participant saved own details, status and event unchanged');

set role authenticated;
select set_config('request.jwt.claim.sub', '', false);
select pg_temp.expect_error($q$select public.save_my_profile('Anon', 'Male', '', '', '')$q$, 'no session cannot save a profile');
reset role;

-- ---- 4. profile visibility and updates ----
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', false);
select pg_temp.check((select count(*) = 1 from public.profiles), 'participant sees only own profile');
update public.profiles set status = 'approved' where id = '00000000-0000-0000-0000-000000000002';
reset role;
select pg_temp.check((select status = 'approved' from public.profiles where id = '00000000-0000-0000-0000-000000000002'), 'participant cannot change another profile (no effect)');

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
select pg_temp.check((select count(*) = 3 from public.profiles), 'trainer sees all profiles');
select pg_temp.check(public.is_trainer(), 'is_trainer true for trainer');
reset role;

-- ---- 5. events: trainer writes, participants read but cannot write ----
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', false);
select pg_temp.expect_error($q$insert into public.events (code, name) values ('HACK', 'Hack')$q$, 'participant cannot create an event');
select pg_temp.check((select count(*) = 1 from public.events), 'participant can read events');
reset role;

-- ---- 6. results: participant insert only for own id and open test ----
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', false);
select pg_temp.expect_error($q$insert into public.assessment_results (test, code, session_code, user_id, question_ids) values ('pre','X','TST-01','00000000-0000-0000-0000-000000000002', '{1}')$q$, 'participant cannot submit under another user id');
insert into public.assessment_results (test, code, session_code, user_id, answers, score, max_score, submitted_at, question_ids)
  values ('pre', 'P2', 'TST-01', '00000000-0000-0000-0000-000000000003', '[0,1]', 1, 2, now(), '{1,2}');
select pg_temp.expect_error($q$insert into public.assessment_results (test, code, session_code, user_id) values ('post','P2','TST-01','00000000-0000-0000-0000-000000000003')$q$, 'post test rejected while closed');
reset role;

-- ---- 7. anonymous (QR) survey ----
set role anon;
select pg_temp.check((select name = 'Test event' and pre_ok and not post_ok from public.public_event_info('tst-01')), 'public event info works with lower-case code');
select pg_temp.check(public.event_test_open('TST-01', 'pre') and not public.event_test_open('TST-01', 'post'), 'event_test_open follows the switches');
select pg_temp.expect_error($q$insert into public.assessment_results (test, code, session_code, user_id, question_ids) values ('pre','ANON1','TST-01', null, '{1,2,3}')$q$, 'anon insert rejected when question set does not match event');
insert into public.assessment_results (test, code, session_code, user_id, answers, score, max_score, submitted_at, question_ids)
  values ('pre', 'ANON1', 'TST-01', null, '[1,1]', 2, 2, now(), public.event_question_ids('TST-01'));
select pg_temp.expect_error($q$insert into public.assessment_results (test, code, session_code, user_id, question_ids) values ('post','ANON2','TST-01', null, public.event_question_ids('TST-01'))$q$, 'anon insert rejected while post test is closed');
select pg_temp.expect_error($q$select count(*) from public.assessment_results$q$, 'anon cannot read results');
reset role;

-- Answers are only returned when the answers switch is on for that test (pre is on, post is off).
set role anon;
select pg_temp.check((select (public_review('TST-01','pre','ANON1')->>'score')::int = 2), 'public review returns score when pre answers are on');
select pg_temp.check(public_review('TST-01','post','ANON1') is null, 'public review hidden when post answers are off');
reset role;

-- ---- 8. feedback form ----
set role anon;
insert into public.workshop_feedback (event_code, ratings, best_session, improve, first_ai_use, recommend)
  values ('TST-01', '{5,4,4,5,3,5}', 'a', 'b', 'c', true);
select pg_temp.expect_error($q$insert into public.workshop_feedback (event_code, ratings) values ('NOPE', '{5,5,5,5,5,5}')$q$, 'feedback rejected for unknown event code');
select pg_temp.expect_error($q$insert into public.workshop_feedback (event_code, ratings) values ('TST-01', '{5,5,5}')$q$, 'feedback rejected with wrong rating count');
select pg_temp.expect_error($q$select count(*) from public.workshop_feedback$q$, 'anon cannot read feedback');
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', false);
select pg_temp.check((select count(*) = 0 from public.workshop_feedback), 'participant cannot read feedback');
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
select pg_temp.check((select count(*) = 1 from public.workshop_feedback), 'trainer reads feedback');
reset role;

-- ---- 9. materials switch ----
set role anon;
select pg_temp.check((select value = false from public.app_settings where key = 'materials_public'), 'materials private by default');
reset role;

-- ---- 10. active event ----
insert into public.events (code, name, organized_by, address, event_dates, package_id)
values ('TST-02', 'Second event', 'मालारानी गाउँपालिका', 'मालारानी', '{2026-12-01}', (select id from public.training_packages where key = 'representative'));
set role anon;
select pg_temp.check((select count(*) = 0 from public.active_event_brand()), 'no active event at first');
select pg_temp.expect_error($q$select public.set_active_event('TST-01')$q$, 'anon cannot choose the active event');
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', false);
select pg_temp.expect_error($q$select public.set_active_event('TST-01')$q$, 'participant cannot choose the active event');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
select public.set_active_event('tst-01');
select public.set_active_event('TST-02');
select pg_temp.expect_error($q$select public.set_active_event('NOPE')$q$, 'unknown code rejected');
reset role;
select pg_temp.check((select count(*) = 1 and bool_and(code = 'TST-02') from public.events where is_active), 'exactly one active event, the last one chosen');
select pg_temp.expect_error($q$update public.events set is_active = true where code = 'TST-01'$q$, 'a second active event is impossible');
set role anon;
select pg_temp.check((select organized_by = 'मालारानी गाउँपालिका' and package_key = 'representative' from public.active_event_brand()), 'visitors see the active event organiser and package');
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
select public.set_active_event('');
reset role;
select pg_temp.check((select count(*) = 0 from public.events where is_active), 'trainer can clear the active event');
