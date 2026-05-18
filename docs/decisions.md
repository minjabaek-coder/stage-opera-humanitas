# Architecture Decisions

PRD([./PRD.md](./PRD.md))에서 **의도적으로 벗어난 결정**만 기록한다. PRD를 그대로 따른 부분은 적지 않는다 — 코드와 PRD가 곧 그 결정의 증거이기 때문.

각 결정은 다음 4줄로 압축:
- **Context:** 무엇 때문에 결정이 필요했나
- **Decision:** 무엇을 골랐나
- **Why:** 다른 선택지를 버린 이유
- **Reversal cost:** 나중에 뒤집을 때 어느 정도 부담인가

---

## ADR-001 · Next.js 14+ → **16.2** 사용 (2026-05-18)

- **Context:** PRD §6.1은 "Next.js 14+". `create-next-app@latest`는 16.2를 설치.
- **Decision:** 16.2를 그대로 사용 (App Router, Turbopack 기본).
- **Why:** "14+"는 lower bound. 다운그레이드는 14의 보안 패치도 별도 관리해야 하므로 최신을 따른다. 16에서는 React 19 canary가 기본, AGENTS.md에 "기존 Next.js와 다를 수 있음" 경고가 자동 포함됨.
- **Reversal cost:** 중간. 일부 API 사용 패턴(특히 server actions, dynamic params)이 14와 다르면 손볼 곳이 있음. 현재까지는 vanilla App Router만 사용 중이라 영향 미미.

## ADR-002 · Tailwind v3 → **v4** 사용 (2026-05-18)

- **Context:** PRD §6.1은 "Tailwind CSS". 스캐폴딩 시 v4가 깔림.
- **Decision:** v4 유지. 설정은 CSS-first(`@import "tailwindcss";` + `@theme inline`).
- **Why:** v4는 PostCSS 플러그인이 `@tailwindcss/postcss` 하나로 단순화, `tailwind.config.js` 불필요. 이 프로젝트의 디자인 토큰은 어차피 PRD §6.4의 CSS 변수가 source of truth라서 v4의 CSS-first 모델과 잘 맞음.
- **Reversal cost:** 중간. v3로 내려가려면 `tailwind.config.js` 만들고 `globals.css`의 `@theme inline` 블록을 옮겨야 함. 현재 CSS 변수는 그대로 두면 호환.

## ADR-003 · 디자인 토큰을 Tailwind utility로 옮기지 않고 **plain CSS 유지** (2026-05-18)

- **Context:** 랜딩 페이지를 원본 HTML에서 이식. 원본은 BEM-스타일 클래스(`.hero__title`, `.s-num` 등)와 CSS 변수로 작성됨.
- **Decision:** Tailwind는 설치만 해두고, 랜딩 페이지는 원본 CSS 클래스를 `globals.css`에 그대로 이식. 신청 폼/관리자 페이지부터 Tailwind utility 병용 검토.
- **Why:** 원본 디자인은 `clamp()` 기반 반응형 타입 스케일과 BEM이 단단하게 짜여 있어 Tailwind로 풀어쓰면 의미가 흐려지고 클래스 노이즈가 커짐. 디자인을 "그대로" 옮기는 게 PRD §3.1의 요구 ("기존 HTML의 디자인과 콘텐츠를 그대로").
- **Reversal cost:** 낮음. 섹션 단위로 점진 마이그레이션 가능.

## ADR-004 · Supabase **로컬 CLI/Docker 미사용**, 원격 프로젝트만 (2026-05-18)

- **Context:** PRD §6은 Supabase 사용을 명시하지만 로컬 vs 원격 운영 모드는 비특정. 사용자 환경에 Docker/Supabase CLI 미설치.
- **Decision:** 원격 Supabase 프로젝트 1개만 사용. 마이그레이션은 `supabase/migrations/*.sql`을 작성해 사용자가 SQL Editor에 붙여넣어 적용.
- **Why:** 로컬 Postgres 띄우려면 Docker Desktop 설치(>1GB)와 추가 학습 곡선. 본 프로젝트는 1인 운영자 규모라 원격 단일 환경의 위험(prod에 바로 적용)이 받아들일 만함. dev/staging이 필요해지면 두 번째 Supabase 프로젝트를 만들면 됨.
- **Reversal cost:** 낮음. 추후 `supabase init` 하고 같은 SQL을 `supabase db reset`으로 적용하면 됨.

## ADR-005 · `.claude/`는 **gitignore**, PRD는 `docs/PRD.md`로 박제 (2026-05-18)

- **Context:** `.claude/`에 PRD 사본, 원본 HTML(12MB), 추출한 이미지/JSX, 스크린샷이 있음. 원본 HTML과 추출 이미지는 이미 `public/images/`에 정제되어 들어감.
- **Decision:** `.claude/`를 통째로 gitignore. 변하지 않는 명세인 PRD만 `docs/PRD.md`로 박제해 commit.
- **Why:** 12MB 번들 HTML은 리포지토리에 둘 가치가 없음(이미지가 base64로 들어있고 추출본이 따로 있음). `.claude/`는 Claude Code 세션의 로컬 컨텍스트이므로 본질적으로 휘발성. PRD는 시간이 흘러 코드와 분리되어도 spec으로 남아야 함.
- **Reversal cost:** 낮음. `.gitignore`에서 한 줄 빼면 됨.

## ADR-006 · 도구성 의존성(`React Hook Form`, `Zod`, `date-fns`, `shadcn/ui`) **현재 미설치** (2026-05-18)

- **Context:** PRD §6.1이 추천. Phase 1A는 랜딩 페이지만 작업해서 폼/검증/날짜/UI 컴포넌트 미사용.
- **Decision:** Phase 1B(`/apply` 페이지 시작 시점)에 한 번에 설치. 그때까지 미설치.
- **Why:** 안 쓰는 의존성을 미리 깔아두면 lockfile만 부풀고 보안 audit 노이즈만 늘어남. 실제 첫 사용 시점에 최신 버전을 깔면 됨.
- **Reversal cost:** N/A — 단순 설치 시점 결정.

## ADR-007 · 다른 서비스와 **Supabase 프로젝트 공유**, 전용 `opera_humanitas` schema로 격리 (2026-05-18)

- **Context:** 사용자가 운영 중인 별도 서비스가 이미 Supabase 프로젝트 1개를 쓰고 있고, Opera Humanitas도 그 프로젝트를 그대로 공용한다. PRD §6은 단일 Supabase 프로젝트만 가정.
- **Decision:** 모든 신규 객체(테이블 5종, 뷰 1종, 함수 3종, 시퀀스 1종)는 `create schema if not exists opera_humanitas` 안에 만든다. `public` schema는 건드리지 않음. `gen_random_uuid()`는 `extensions.gen_random_uuid()`로 schema-qualify. 마이그레이션 적용 후 Dashboard > API > Exposed schemas 에 `opera_humanitas` 를 1회 추가해야 PostgREST가 접근 가능. 클라이언트는 `createClient(..., { db: { schema: 'opera_humanitas' } })` 로 기본 스키마를 고정 (`src/lib/supabase/anon.ts`, `server.ts`).
- **Why:** (1) **이름 충돌 0**: 다른 서비스가 `programs`/`registrations` 같은 흔한 이름을 써도 무관. (2) **권한 격리**: schema 단위로 `grant usage` 와 RLS를 끊을 수 있어, 다른 서비스의 anon 키가 PII 가 들어가는 `opera_humanitas.registrations` 를 보지 못함. (3) **분리 비용이 낮음**: 나중에 별도 프로젝트로 옮기려면 `pg_dump --schema=opera_humanitas` 한 번이면 됨. 대안인 `oh_` 프리픽스는 anon 키를 한 풀에서 공유하기 때문에 다른 서비스의 RLS 디폴트 실수가 이쪽 PII로 새어나갈 위험이 있다.
- **Reversal cost:** 중간. Dashboard 설정 한 번과 클라이언트 코드 한 줄이 비용의 전부지만, 일단 데이터가 쌓이면 다른 서비스로 옮길 때 외래키/뷰 재배선이 필요. 그래도 schema 단위 dump/restore가 가능하다는 점에서 prefix 방식 회수보다 훨씬 깔끔.

## ADR-008 · PRD의 `middleware.ts` → **`proxy.ts`** 로 채택 (2026-05-18)

- **Context:** PRD §6.2 는 `/middleware.ts` 가 `/admin/*` 를 보호하는 구조. Next.js 16 에서 file convention 이 `middleware` → `proxy` 로 rename 되었고 (`node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`), `middleware.ts` 사용은 deprecated.
- **Decision:** 16의 새 이름 `proxy.ts` 를 그대로 따른다. 파일 위치는 `src/proxy.ts` (app router 와 동일 레벨). 기능·matcher 문법은 동일.
- **Why:** rename 만이고 기능 동일. deprecated 이름을 쓰면 빌드 경고가 나오거나 향후 메이저에서 깨질 위험. PRD 표기는 14+ 기준이고, ADR-001 에서 16 채택한 이상 자연스러운 정합.
- **Reversal cost:** 낮음. 14 로 내려갈 경우 `proxy.ts` 를 `middleware.ts` 로 rename 하면 됨.

## ADR-009 · Vercel Hobby 플랜 호환 위해 **cron 을 hourly → daily (UTC 18:00 / KST 03:00)** 로 (2026-05-19)

- **Context:** PRD §5.3 + `vercel.json` 원안은 `0 * * * *` (매시 정각) 으로 `/api/cron/expire-pending` 호출. Vercel Hobby (무료) 플랜은 **daily cron** 만 허용 — hourly 표현식이 들어간 배포는 Deploy 단계에서 거절되어 deployment row 가 생성조차 되지 않는다 (이 세션에서 실제로 마주친 증상: Deployments 가 텅 빈 채로 push 가 무시되는 듯 보임).
- **Decision:** `vercel.json` 의 schedule 을 `"0 18 * * *"` 로 변경. UTC 18:00 = KST 03:00 (한국 신청자 가장 적은 시간 + 운영자 아침 출근 전 결과 확인 가능). Pro 플랜 업그레이드 시 hourly 로 복원.
- **Why:** (1) **사용자 체감 영향 0**: `program_availability` 뷰가 `r.status = 'pending' AND r.expires_at > now()` 로 좌석을 실시간 필터하므로 cron 이 늦어도 만료된 pending 의 자리는 즉시 다른 신청자에게 열린다. cron 은 단순히 `status` 컬럼을 `cancelled` 로 정리하는 cleanup 일 뿐. (2) **운영자 체감 영향 제한적**: 관리자 화면 Registrations 의 status 표시가 최대 24h 지연될 뿐, `expires_at` 컬럼은 정확. (3) **비용 절감**: Hobby 로 launch 가능, 트래픽 보고 Pro 필요 시 업그레이드.
- **Reversal cost:** 매우 낮음. `vercel.json` 한 줄 (`"0 18 * * *"` → `"0 * * * *"`) + Pro 플랜 결제 + redeploy. 데이터 마이그레이션 불필요.
