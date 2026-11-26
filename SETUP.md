# 긍정플래너 설정

웹 주소는 `https://jkangmin95-maker.github.io/positive-planner/` 입니다.
앱은 로그인한 사람의 기록만 Postgres에 둡니다. 공개 저장소와 공개 페이지에 올라가는 키는 **anon(공개) 키**뿐입니다.

`service_role` 키와 `sb_secret_` 으로 시작하는 키는 `src/config.js`에 넣지 마세요. 넣으면 모든 사용자 기록을 읽는 키가 사이트 소스에 공개됩니다. 앱도 그 키를 거절하고 연결 전 화면을 보여 줍니다.

## 1. 로컬에서 켜 보기

```bash
npm install
npm test
npm run build
npm run serve
```

브라우저에서 `http://127.0.0.1:4173/positive-planner/` 를 엽니다.
키가 비어 있으면 ‘아직 연결 전’ 화면이 나옵니다.

화면만 먼저 보려면 `http://127.0.0.1:4173/positive-planner/?preview=1` 입니다.
이 주소의 기록은 그 브라우저에만 있고, 계정과 섞이지 않습니다. 배포된 사이트에서도 주소에 `?preview=1`을 붙이면 같습니다. 이용자에게 안내하는 기능은 아닙니다.
예시 문장이 채워진 화면은 `?preview=1&sample=1` 입니다. 디자인 확인용이고, 계정에는 올라가지 않습니다.

## 2. Supabase 프로젝트

1. [supabase.com/dashboard](https://supabase.com/dashboard)에서 **새 프로젝트**를 만듭니다. 우리사이 프로젝트와 섞지 않습니다.
2. 지역은 **서울, Northeast Asia (Seoul), `ap-northeast-2`** 로 만듭니다. 다른 리전으로 두지 않습니다. 데이터베이스 비밀번호는 비밀번호 관리자에 저장합니다.
3. 프로젝트가 준비되면 **Project Settings → API**(또는 API Keys)에서 다음만 복사합니다.
   - Project URL (`https://<project-ref>.supabase.co`)
   - 공개 키: `anon` `public` 또는 `publishable`
4. `src/config.js`의 빈 문자열에 넣습니다.

```js
export const PP_CONFIG = {
  supabaseUrl: "https://abcdxyzcompany.supabase.co",
  supabaseAnonKey: "여기에_anon_또는_publishable_키",
};
```

5. 저장하고 커밋한 뒤 `main`에 푸시하면 GitHub Actions가 Pages에 다시 배포합니다. 공개 키는 브라우저에 포함되는 것이 맞습니다. 데이터는 아래 RLS가 지킵니다.

## 3. SQL 실행

1. Supabase 대시보드 → **SQL Editor** → New query.
2. `supabase/migrations` 안의 SQL을 파일 이름 순서대로 실행합니다. 먼저 `20261126120000_init_planner.sql`, 다음 `20261126153000_created_at.sql` 입니다.
3. 한 번 더 실행해도 됩니다. 이미 만든 테이블은 유지하고, 정책만 다시 만듭니다. `created_at` 파일은 칸이 있으면 건너뜁니다.
4. Table Editor에 `daily_entries`, `weekly_entries`, `monthly_entries`, `worksheets`, `reviews`, `start_points`가 보이면 됩니다.
5. 각 테이블의 RLS가 켜져 있는지 확인합니다. 정책은 `authenticated`만, `user_id = auth.uid()` 입니다. `anon`에는 테이블 권한을 주지 않습니다.

## 4. Auth 리디렉션 URL

**Authentication → URL Configuration**

- Site URL: `https://jkangmin95-maker.github.io/positive-planner/`
- Redirect URLs에 아래를 추가합니다.
  - `https://jkangmin95-maker.github.io/positive-planner/`
  - `https://jkangmin95-maker.github.io/positive-planner/**`
  - `http://127.0.0.1:4173/positive-planner/**`
  - `http://localhost:4173/positive-planner/**`

이메일 링크와 Google 로그인 뒤에 사용자를 돌려보내는 주소입니다. Pages 주소의 끝 슬래시(`/`)를 빼먹지 마세요.

## 5. Google 로그인

Google 쪽 리디렉션 주소는 **Pages 주소가 아닙니다.** Supabase 콜백입니다.

`https://<project-ref>.supabase.co/auth/v1/callback`

`<project-ref>`는 프로젝트 URL의 서브도메인입니다. 예: URL이 `https://abcdxyzcompany.supabase.co`이면 콜백은 `https://abcdxyzcompany.supabase.co/auth/v1/callback` 입니다.

1. [Google Cloud Console](https://console.cloud.google.com/) → 프로젝트 만들기(또는 기존 프로젝트).
2. **API 및 서비스 → OAuth 동의 화면**. 사용자 유형은 외부. 앱 이름은 `긍정플래너`. 테스트 중이면 테스트 사용자에 본인 Gmail을 넣습니다.
3. **API 및 서비스 → 사용자 인증 정보 → 사용자 인증 정보 만들기 → OAuth 클라이언트 ID**.
4. 애플리케이션 유형: **웹 애플리케이션**.
5. 승인된 자바스크립트 원본:
   - `https://jkangmin95-maker.github.io`
   - `http://127.0.0.1:4173`
6. 승인된 리디렉션 URI: `https://<project-ref>.supabase.co/auth/v1/callback`
7. 만든 클라이언트의 **클라이언트 ID**와 **클라이언트 보안 비밀**을 복사합니다.
8. Supabase → **Authentication → Sign In / Providers → Google** 을 켜고, ID와 비밀을 붙여 넣은 뒤 저장합니다.

클라이언트 보안 비밀은 Supabase에만 둡니다. `src/config.js`나 GitHub에 넣지 않습니다.

## 6. 이메일 매직 링크

**Authentication → Sign In / Providers → Email** 이 켜져 있는지 확인합니다. 새 프로젝트는 기본으로 켜져 있습니다.

기본 메일 템플릿(Confirmation URL이 있는 매직 링크)을 그대로 둡니다. 앱은 PKCE를 쓰므로, **링크를 요청한 그 브라우저**에서 열어야 로그인이 이어집니다. 메일 앱 안의 다른 브라우저에서 열리면 “이 브라우저에서 받은 링크가 아닙니다”가 나올 수 있습니다. 그때는 플래너를 연 브라우저에서 링크를 다시 받으면 됩니다.

메일은 한 주소당 약 60초에 한 번만 나갑니다.

## 7. GitHub Pages

배포 워크플로는 `.github/workflows/pages.yml` 입니다. `main`에 푸시되면 `dist/`를 Pages에 올립니다.

1. GitHub 저장소 **Settings → Pages**.
2. **Build and deployment → Source: GitHub Actions**.
3. `main`에 이 저장소가 올라가 있으면 Actions 탭에서 “Deploy GitHub Pages”가 성공하는지 봅니다.
4. 주소: `https://jkangmin95-maker.github.io/positive-planner/`

처음 한 번은 Source를 GitHub Actions로 바꿔 주어야 워크플로가 환경을 만들 수 있습니다. 저장소가 비공개이면 Pages 정책에 따라 공개 설정이 필요할 수 있습니다. 공개 배포는 승인된 상태입니다.

## 8. 확인

1. 사이트 첫 화면이 연결 전 문구가 아니라 로그인인지 봅니다.
2. Google로 들어간 뒤 오늘 한 줄이 바로 있는지 봅니다.
3. 이메일 링크를 **같은 브라우저**에서 열어 같은지 봅니다.
4. 한 줄을 적고 새로고침한 뒤 남아 있는지 봅니다.
5. 다른 계정으로 들어가면 앞 계정의 글이 보이지 않는지 봅니다.

문제가 나면 SQL을 다시 실행했는지, Redirect URLs에 Pages 주소가 있는지, Google 리디렉션 URI가 Supabase 콜백인지를 먼저 봅니다.

## 9. 지표

분석 도구는 없습니다. 숫자는 SQL Editor에서 직접 봅니다. 이 쿼리는 대시보드의 postgres 역할로 실행하며, RLS를 넘어 전체 계정을 셉니다. 앱의 anon 키로는 돌리지 않습니다.

가입일은 `auth.users.created_at` 입니다. 기록을 처음 저장한 시각은 `daily_entries`, `weekly_entries`, `worksheets`, `reviews`의 `created_at` 입니다. 이 칸은 기본값이 `now()`이고, 이후 수정해도 바뀌지 않습니다. 플래너에 적힌 날짜나 `updated_at`(마지막 수정)과는 다릅니다. 같은 행을 나중에 고친 날은 아래 쿼리에 다시 잡히지 않습니다.

주간 활성은, 서울 시간으로 한 주(월요일 시작) 안에 서로 다른 날 3일 이상 기록을 처음 저장한 계정입니다.

```sql
with writes as (
  select user_id, created_at from public.daily_entries
  union all
  select user_id, created_at from public.weekly_entries
  union all
  select user_id, created_at from public.worksheets
  union all
  select user_id, created_at from public.reviews
),
seoul_days as (
  select
    user_id,
    date_trunc('week', created_at at time zone 'Asia/Seoul')::date as week_start,
    (created_at at time zone 'Asia/Seoul')::date as wrote_on
  from writes
)
select week_start, user_id, count(distinct wrote_on) as days_written
from seoul_days
group by week_start, user_id
having count(distinct wrote_on) >= 3
order by week_start, user_id;
```

4주 리텐션은, 가입한 서울 날짜를 Day 0으로 두고 Day 22–28에 무엇이든 처음 저장한 계정입니다.

```sql
with signups as (
  select id as user_id, (created_at at time zone 'Asia/Seoul')::date as signup_day
  from auth.users
),
writes as (
  select user_id, (created_at at time zone 'Asia/Seoul')::date as wrote_on
  from public.daily_entries
  union all
  select user_id, (created_at at time zone 'Asia/Seoul')::date as wrote_on
  from public.weekly_entries
  union all
  select user_id, (created_at at time zone 'Asia/Seoul')::date as wrote_on
  from public.worksheets
  union all
  select user_id, (created_at at time zone 'Asia/Seoul')::date as wrote_on
  from public.reviews
)
select distinct s.user_id, s.signup_day
from signups s
join writes w on w.user_id = s.user_id
where w.wrote_on between s.signup_day + 22 and s.signup_day + 28
order by s.signup_day, s.user_id;
```
