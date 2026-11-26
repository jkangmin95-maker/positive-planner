-- 이미 20261126120000 을 created_at 없이 실행한 경우에 칸을 더합니다.
-- 최신 init 파일을 빈 데이터베이스에서 실행했다면 이 파일은 같은 칸을 다시 만들지 않습니다.
-- RLS 정책은 바꾸지 않습니다.

alter table public.daily_entries
  add column if not exists created_at timestamptz not null default now();

alter table public.weekly_entries
  add column if not exists created_at timestamptz not null default now();

alter table public.worksheets
  add column if not exists created_at timestamptz not null default now();

alter table public.reviews
  add column if not exists created_at timestamptz not null default now();

comment on column public.daily_entries.created_at is '행을 처음 저장한 시각. 수정해도 바뀌지 않음. entry_date, updated_at과 다름.';
comment on column public.weekly_entries.created_at is '행을 처음 저장한 시각. 수정해도 바뀌지 않음.';
comment on column public.worksheets.created_at is '행을 처음 저장한 시각. 수정해도 바뀌지 않음.';
comment on column public.reviews.created_at is '행을 처음 저장한 시각. 수정해도 바뀌지 않음.';

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

drop trigger if exists keep_created_at on public.daily_entries;
create trigger keep_created_at
before insert or update on public.daily_entries
for each row execute function public.keep_created_at();

drop trigger if exists keep_created_at on public.weekly_entries;
create trigger keep_created_at
before insert or update on public.weekly_entries
for each row execute function public.keep_created_at();

drop trigger if exists keep_created_at on public.worksheets;
create trigger keep_created_at
before insert or update on public.worksheets
for each row execute function public.keep_created_at();

drop trigger if exists keep_created_at on public.reviews;
create trigger keep_created_at
before insert or update on public.reviews
for each row execute function public.keep_created_at();

notify pgrst, 'reload schema';
