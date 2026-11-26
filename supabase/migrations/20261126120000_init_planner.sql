-- 긍정플래너 v0
-- Supabase SQL Editor에서 이 파일 전체를 한 번 실행합니다.
-- 다시 실행해도 됩니다. 이미 있는 테이블은 유지하고, RLS 정책만 다시 만듭니다.
--
-- 각 행은 auth.uid() = user_id 일 때만 읽고 쓸 수 있습니다.
-- anon(로그인 전)에는 테이블 권한을 주지 않습니다.
-- service_role 키는 이 앱에 넣지 않습니다.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;

-- created_at은 처음 저장 시각만 남긴다. UPDATE에서는 클라이언트가 보낸 값으로 바꾸지 않는다.
create or replace function public.keep_created_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    new.created_at = old.created_at;
  elsif new.created_at is null then
    new.created_at = now();
  end if;
  return new;
end;
$$;

revoke all on function public.keep_created_at() from public, anon, authenticated;

create table if not exists public.daily_entries (
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_date date not null,
  one_line text not null default '',
  emotion_felt text not null default '',
  thought_held text not null default '',
  choices text not null default '',
  feeling_note text not null default '',
  result_note text not null default '',
  other_side_one_thing text not null default '',
  tasks jsonb not null default '[]'::jsonb,
  belief_to_accept text not null default '',
  next_action text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, entry_date),
  constraint daily_entries_one_line_len check (char_length(one_line) <= 4000),
  constraint daily_entries_tasks_array check (jsonb_typeof(tasks) = 'array')
);

create table if not exists public.weekly_entries (
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  choice_1 text not null default '',
  choice_2 text not null default '',
  choice_3 text not null default '',
  feeling_note text not null default '',
  result_note text not null default '',
  tasks jsonb not null default '[]'::jsonb,
  next_fix text not null default '',
  review text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, week_start),
  constraint weekly_entries_tasks_array check (jsonb_typeof(tasks) = 'array')
);

create table if not exists public.monthly_entries (
  user_id uuid not null references auth.users (id) on delete cascade,
  month text not null,
  principle text not null default '',
  structure_check text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, month),
  constraint monthly_entries_month_shape check (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$')
);

create table if not exists public.worksheets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  sheet_type text not null,
  entry_date date,
  daily_date date,
  body jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint worksheets_type check (sheet_type in ('A', 'B', 'C')),
  constraint worksheets_body_object check (jsonb_typeof(body) = 'object')
);

create index if not exists worksheets_user_updated_idx
  on public.worksheets (user_id, updated_at desc);

create table if not exists public.reviews (
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  period_start date not null,
  period_end date not null,
  body jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, kind, period_start),
  constraint reviews_kind check (kind in ('4week', '13week')),
  constraint reviews_body_object check (jsonb_typeof(body) = 'object')
);

create table if not exists public.start_points (
  user_id uuid primary key references auth.users (id) on delete cascade,
  worries jsonb not null default '[]'::jsonb,
  beliefs jsonb not null default '[]'::jsonb,
  control_to_regain text not null default '',
  updated_at timestamptz not null default now(),
  constraint start_points_worries_array check (jsonb_typeof(worries) = 'array'),
  constraint start_points_beliefs_array check (jsonb_typeof(beliefs) = 'array')
);

comment on table public.daily_entries is '일간. 앱에서 필수처럼 두는 칸은 one_line 하나. 빈 값은 실패가 아님.';
comment on table public.weekly_entries is '주간. review는 주간 회고이며 채움은 선택.';
comment on table public.worksheets is 'A 그럴 수 있지 / B 고정관념 전환 / C 책임 선택. C의 본칸은 다음 행동 하나.';
comment on table public.reviews is '4주·13주 회고. 주간 회고는 weekly_entries.review.';
comment on column public.daily_entries.next_action is '다음 행동 하나. 못한 이유 목록을 두지 않음.';
comment on column public.daily_entries.tasks is '[{id,text,nextFix}] 다음에 고칠 한 가지.';
comment on column public.daily_entries.created_at is '행을 처음 저장한 시각. 수정해도 바뀌지 않음. entry_date, updated_at과 다름.';
comment on column public.weekly_entries.created_at is '행을 처음 저장한 시각. 수정해도 바뀌지 않음.';
comment on column public.worksheets.created_at is '행을 처음 저장한 시각. 수정해도 바뀌지 않음.';
comment on column public.reviews.created_at is '행을 처음 저장한 시각. 수정해도 바뀌지 않음.';

create or replace function public.pp_apply_owner_rls(schema_name text, table_name text)
returns void
language plpgsql
security invoker
set search_path = public, auth, pg_catalog
as $$
declare
  pol record;
begin
  execute format('alter table %I.%I enable row level security', schema_name, table_name);
  for pol in
    select policyname
    from pg_policies
    where schemaname = schema_name
      and tablename = table_name
  loop
    execute format('drop policy if exists %I on %I.%I', pol.policyname, schema_name, table_name);
  end loop;

  execute format(
    'create policy %I on %I.%I for select to authenticated using ((select auth.uid()) = user_id)',
    table_name || '_select_own', schema_name, table_name
  );
  execute format(
    'create policy %I on %I.%I for insert to authenticated with check ((select auth.uid()) = user_id)',
    table_name || '_insert_own', schema_name, table_name
  );
  execute format(
    'create policy %I on %I.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
    table_name || '_update_own', schema_name, table_name
  );
  execute format(
    'create policy %I on %I.%I for delete to authenticated using ((select auth.uid()) = user_id)',
    table_name || '_delete_own', schema_name, table_name
  );
  execute format('revoke all on table %I.%I from public, anon', schema_name, table_name);
  execute format(
    'grant select, insert, update, delete on table %I.%I to authenticated',
    schema_name, table_name
  );
end;
$$;

revoke all on function public.pp_apply_owner_rls(text, text) from public, anon, authenticated;

select public.pp_apply_owner_rls('public', 'daily_entries');
select public.pp_apply_owner_rls('public', 'weekly_entries');
select public.pp_apply_owner_rls('public', 'monthly_entries');
select public.pp_apply_owner_rls('public', 'worksheets');
select public.pp_apply_owner_rls('public', 'reviews');
select public.pp_apply_owner_rls('public', 'start_points');

drop function public.pp_apply_owner_rls(text, text);

drop trigger if exists set_updated_at on public.daily_entries;
create trigger set_updated_at
before insert or update on public.daily_entries
for each row execute function public.set_updated_at();

drop trigger if exists keep_created_at on public.daily_entries;
create trigger keep_created_at
before insert or update on public.daily_entries
for each row execute function public.keep_created_at();

drop trigger if exists set_updated_at on public.weekly_entries;
create trigger set_updated_at
before insert or update on public.weekly_entries
for each row execute function public.set_updated_at();

drop trigger if exists keep_created_at on public.weekly_entries;
create trigger keep_created_at
before insert or update on public.weekly_entries
for each row execute function public.keep_created_at();

drop trigger if exists set_updated_at on public.monthly_entries;
create trigger set_updated_at
before insert or update on public.monthly_entries
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.worksheets;
create trigger set_updated_at
before insert or update on public.worksheets
for each row execute function public.set_updated_at();

drop trigger if exists keep_created_at on public.worksheets;
create trigger keep_created_at
before insert or update on public.worksheets
for each row execute function public.keep_created_at();

drop trigger if exists set_updated_at on public.reviews;
create trigger set_updated_at
before insert or update on public.reviews
for each row execute function public.set_updated_at();

drop trigger if exists keep_created_at on public.reviews;
create trigger keep_created_at
before insert or update on public.reviews
for each row execute function public.keep_created_at();

drop trigger if exists set_updated_at on public.start_points;
create trigger set_updated_at
before insert or update on public.start_points
for each row execute function public.set_updated_at();

notify pgrst, 'reload schema';
