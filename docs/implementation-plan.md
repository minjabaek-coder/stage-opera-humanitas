# Implementation Plan

PRD([./PRD.md](./PRD.md)) Phase 1 MVP을 작업 가능한 단위로 쪼개고, 세션 사이에 진행 상황을 추적하기 위한 살아있는 문서.

각 항목 옆 체크박스는 **구현 완료** 여부 — 코드가 들어가고 dev 환경에서 동작이 확인됐을 때만 체크.
설계 결정의 *근거*는 [./decisions.md](./decisions.md), 변하지 않는 *요구사항*은 [./PRD.md](./PRD.md)를 본다.

> **현재 상태 (2026-05-18 기준):** Phase 1A ✅, 1B ✅, **1C 전체 완료 (C1 인증 + C2 관리자 UI 3종 + C3 관리자 API + C4 Vercel Cron)** 까지 완료. 다음 진입점은 **Phase 1D 배포 준비** (Vercel 프로젝트 연결, 환경변수 입력, 도메인, §10 미해결 항목 확인, §11 인수 기준 점검).

---

## Phase 1A — 랜딩 페이지 (✅ 완료 / 커밋 `8988845`)

- [x] Next.js 16 + TypeScript + Tailwind v4 + App Router 스캐폴딩 (`src/` 구조)
- [x] PRD §6.4 디자인 토큰 + 폰트 4종(`Cormorant Garamond` / `EB Garamond` / `Noto Serif KR` / `Inter`) 연결
- [x] 원본 HTML의 이미지 6개 추출 → `public/images/`
- [x] 랜딩 페이지 섹션 컴포넌트화 (`Hero` / `Philosophy` / `Speaker` / `Series` / `Books` / `Info` / `Audience` / `CTA` / `Footer`)
- [x] 인터랙션 포팅 — 인트로 오버레이(2.4s), reveal-on-scroll IntersectionObserver, hero word stagger, hero 패럴랙스, Web Audio 오페라 모티프 미리듣기
- [x] 6개 Apply 버튼 → `/apply` 및 `/apply?program={1..4}` 매핑 (PRD §3.1)
- [x] 회차 카드 잔여 좌석 UI 슬롯 (현재 stub 풀 24석)
- [x] 데스크톱/모바일 비주얼 검증 + lint/typecheck 통과

---

## Phase 1B — 데이터 베이스 + 신청 흐름 (✅ 완료 / 커밋 `02a763f`)

### B1. Supabase 스키마 + 시드  (✅ 완료)
- [x] `supabase/migrations/0001_init.sql` — `opera_humanitas` schema + `programs`, `registrations`, `registration_items`, `settings`, `admin_audit_log` (PRD §4.2, ADR-007)
- [x] `supabase/migrations/0002_views_and_fns.sql` — `program_availability` 뷰, `expire_pending_registrations()` 함수, `create_registration()` RPC (PRD §4.4, §6.5)
- [x] `supabase/seed.sql` — 4개 회차 시드 + `settings` 단일 행 (PRD §4.3)
- [x] `supabase/migrations/0003_rls.sql` — RLS 정책 (PRD §4.5)
- [x] `supabase/migrations/0004_fix_create_registration.sql` — `create_registration` 함수 본문의 `id` 컬럼 ↔ 변수 ambiguity(SQLSTATE 42702) 해결 (`#variable_conflict use_column`)
- [x] `supabase/migrations/README.md` — 각 migration이 PRD §4의 어느 부분에 해당하는지 매핑 + Dashboard "Exposed schemas" 운영자 안내
- [x] **사용자 작업**: 공유 Supabase 프로젝트 SQL Editor에 0001 → 0002 → 0003 → 0004 → seed 순으로 붙여넣어 적용
- [x] **사용자 작업**: Dashboard > Project Settings > API > Exposed schemas 에 `opera_humanitas` 추가
- [x] **사용자 작업**: `.env.local` 채우고 `npm run dev` 로 랜딩의 좌석 표시가 24/24로 떠는지 확인

### B2. Supabase 클라이언트 + 환경 변수  (✅ 완료)
- [x] `src/lib/supabase/anon.ts` — `OperaClient` 타입 + `getAnonClient()` (schema 고정)
- [x] `src/lib/supabase/server.ts` — `getServiceClient()` (`server-only` 보호)
- [x] `.env.example` — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`, `ADMIN_JWT_SECRET`, `CRON_SECRET`
- [x] `src/data/programs.ts`의 `getProgramAvailability()` → `program_availability` 뷰 조회로 교체 (env 미설정 시 stub fallback)
- [x] `src/app/page.tsx` 에 `export const revalidate = 30` 추가 — 런타임에 좌석 현황 캐싱이 stale 안 되도록

### B3. Public API 라우트 (PRD §5.1)  (✅ 완료)
- [x] `GET /api/programs` — `programs` + `program_availability` 병합 응답
- [x] `GET /api/settings/public` — 공개 운영 정보(은행/계좌/예금주/홀드 시간)
- [x] `POST /api/registrations` — Zod 검증 + `create_registration` RPC + SQLSTATE 'OH001/OH002' → 409 분기
- [x] `GET /api/registrations/[id]` — UUID 검증, service_role로 `registrations` + `registration_items` + `programs` 임베드, `settings` 동봉
- [x] Zod 스키마 (`src/lib/validation/registration.ts`) + 전화 자동 하이픈 헬퍼

### B4. 신청 페이지 `/apply` (PRD §3.2)  (✅ 완료)
- [x] `src/app/apply/page.tsx` (서버 컴포넌트, DB 미연결 시 fallback) + `ApplyClient.tsx` (RHF + zodResolver)
- [x] `?program=1,3` 콤마 구분 파싱 → 사전 체크 (매진/0석은 자동 체크 제외)
- [x] 가격 실시간 합산, 전화번호 자동 하이픈, [필수] 동의 일괄 토글, isSubmitting 더블 클릭 방지
- [x] 매진/중복/검증 에러 분기 + 서버 에러 배너

### B5. 완료 페이지 `/apply/complete` (PRD §3.3)  (✅ 완료)
- [x] `src/app/apply/complete/page.tsx` — `?id=<uuid>`로 service_role 직접 조회 (RLS 차단 회피)
- [x] 입금 기한을 KST로 포맷 (`Intl.DateTimeFormat`, `Asia/Seoul`)
- [x] `CopyButtons.tsx` (계좌번호·금액 복사, 1.5s 토스트 텍스트)

### B6. 인수 기준 검증
- [x] `/`에 `revalidate = 30` ISR 추가 — 빌드 시점 박제 방지
- [x] **사용자 검증**: `npm run dev` → `http://localhost:3000/apply` 진입, 회차 선택→폼 작성→제출까지 통과해 `/apply/complete?id=...` 에 도달하는지 (Playwright E2E 통과)
- [x] **사용자 검증**: 동일 이메일로 동일 회차 재제출 시 "이미 신청된 회차" 에러 노출되는지 (Playwright로 OH002 메시지 노출 확인)
- [ ] 마지막 1석 동시 신청 부하 테스트 (`POST /api/registrations` 2건 동시) — 정확히 1건만 성공 *(Phase 1D 배포 전 점검 항목으로 이연)*
- [ ] 모바일/PC 브라우저 검증 *(Phase 1D 배포 전 점검 항목으로 이연)*
- [ ] (이후) 레이트 리미팅 (PRD §6.7) — Vercel 인스턴스가 메모리 공유 안 하므로 Upstash 등 외부 스토어 필요. Phase 2로 이연.

---

## Phase 1C — 관리자 + Cron

### C1. 관리자 인증  (✅ 완료 / 커밋 `7afc6b1`)
- [x] `src/lib/auth/admin.ts` — `jose` 기반 HS256 JWT 발급/검증 + 쿠키 이름·만료 상수 (Edge 호환)
- [x] `POST /api/admin/login` — Zod 검증 → timing-safe 비밀번호 비교 → HttpOnly Secure SameSite=Strict 쿠키 12h
- [x] `POST /api/admin/logout` — 쿠키 Max-Age=0
- [x] `src/proxy.ts` — `/admin/*` 및 `/api/admin/*` 보호 (PRD §6.2 의 `middleware.ts` 는 Next.js 16 에서 `proxy.ts` 로 rename, ADR-008). `/admin` 및 `/api/admin/login` 통과, 인증 상태로 `/admin` 진입 시 `/admin/dashboard` 로 redirect
- [x] `src/app/admin/page.tsx` + `AdminLoginClient.tsx` — 단일 비밀번호 입력 폼 (다크 톤, `noindex`)
- [x] `globals.css` — `.admin-login__*` 디자인 토큰 기반 스타일

> **운영 메모:** dev 검증을 위해 `.env.local` 에 임시값을 채워 둠 (`ADMIN_PASSWORD=dev-admin-2026`, 32자 이상 랜덤 `ADMIN_JWT_SECRET`). Phase 1D 배포 전 운영자가 정한 값으로 교체 필요. `.env.local` 자체는 gitignore.

### C2. 관리자 페이지 (PRD §3.5–3.7)
- [x] `/admin/dashboard` — 회차별 잔여 좌석, 입금 대기 카운트, 곧 만료 카운트 (커밋 `55dcafc`)
  - Route group `src/app/admin/(authed)/` 도입 — 로그인 페이지(`/admin`)는 shell 밖, 인증된 3개 페이지는 공통 shell(헤더 + nav + 로그아웃) 공유
  - 데이터 헬퍼 `src/lib/admin/dashboard.ts` 의 `getDashboardData()` 를 페이지(서버 컴포넌트)와 `/api/admin/dashboard` 양쪽에서 재사용 → API fetch 라운드트립 생략
  - KPI 3장(pending / 6h 내 만료 / 총 잔여 좌석) + 회차 4장 카드(확정/대기 비율 막대)
  - 클라이언트 `RefreshButton` (`router.refresh()` + 트랜지션 토스트), `AdminLogoutButton`, `AdminNav` (usePathname 활성 표시)
- [x] `/admin/registrations` — 필터·검색·페이지네이션 테이블 + 상세 모달 (커밋 `347b564`)
  - 데이터 헬퍼 `src/lib/admin/registrations.ts` 의 `listRegistrations()` 를 페이지/API 양쪽에서 재사용 (detail flag 로 동의 컬럼 추가 select)
  - `RegistrationsListQuerySchema` (`status` / `program` / `q` / `page` / `page_size`) 를 페이지 searchParams 파싱에도 그대로 사용 — 잘못된 URL 은 조용히 기본값으로 fallback
  - 단일 클라이언트 `RegistrationsClient.tsx` 안에 필터 폼 / 결과 카운트 / 테이블 (행 클릭 → 모달) / 페이지네이션 / 상세 모달 통합. URL 갱신은 `router.push` + `useTransition`
  - 상태 배지(`pending` / `confirmed` / `cancelled-expired` / `cancelled-admin`) — cancel_reason 의 `system:` / `admin:` prefix 로 만료/관리자 구분
  - 상세 모달: ESC 닫기, 모든 필드 + 동의 3종 표시, 승인(2단계 confirm) / 취소(사유 textarea, 200자) 액션. API 응답 후 `router.refresh()` → 목록과 모달 상태 동기화 (다음 상태로 빠진 row 는 자동으로 모달 닫힘)
  - 엑셀 다운로드 링크 → `/api/admin/registrations/export`
  - React 19 권장 패턴(렌더 중 prev props 비교 후 setState)으로 외부 URL/items 변화 동기화 — `useEffect+setState` 안티패턴 회피 (lint 강제)
- [x] `/admin/settings` — 계좌/홀드 시간/회차 정원 편집 (커밋 `92b1ceb`)
  - 서버 컴포넌트 `page.tsx` 가 `settings`(id=1) + `programs` + `program_availability` 를 병렬 조회. 활성 좌석(confirmed+active pending)을 회차별로 합산해 UI 에 노출 → capacity floor 가드(서버 가드 `CAPACITY_TOO_LOW` 와 일관) 를 사용자가 미리 안내받음
  - `SettingsClient.tsx` 안에 3개 sub-form (입금 정보 / 예약 정책 / 회차별 정원) — 각자 dirty 추적 + 자체 [저장] 버튼 + 자체 상태 토스트(`저장 중… / 저장됨 / 에러 메시지`, 1.8s 후 idle). 회차별 정원은 4개 행 각각 별도 폼/저장 버튼
  - `useSubmit()` 훅으로 fetch + router.refresh + status state 머신 (idle/saving/saved/error) 공통화
  - capacity 입력 `min` 을 `Math.max(1, active_count)` 로 잡고, valid 가 깨지면 저장 비활성 + hint 빨강 — 활성 1석에서 0으로 줄이려 시도 시 즉시 차단됨 (E2E 검증)

### C3. 관리자 API (PRD §5.2)  (✅ 완료 / 커밋 `969b489`)
- [x] `src/lib/audit.ts` — `recordAdminAction({ action, target_id, payload })` (실패는 throw 안 함)
- [x] `src/lib/validation/admin.ts` — Zod 스키마 (`RegistrationsListQuery`, `CancelBody`, `SettingsUpdate`, `ProgramUpdate`)
- [x] `GET /api/admin/dashboard` — 회차별 (`confirmed`/`pending`/`available`/`capacity`) + `pending_count` + `expiring_soon_count` (≤6h)
- [x] `GET /api/admin/registrations` — `status`/`program`/`q`/`page` 필터, page_size=20, `q` 는 name·phone·email·reference_no OR ILIKE
- [x] `POST /api/admin/registrations/[id]/approve` — pending → confirmed (그 외 409)
- [x] `POST /api/admin/registrations/[id]/cancel` — 사유 받아 `admin: <reason>` 으로 cancelled 전환
- [x] `GET /api/admin/registrations/export` — UTF-8 BOM CSV, 전체 컬럼 + 회차 배열
- [x] `GET/PUT /api/admin/settings` — id=1 singleton 부분 업데이트 (PRD §5.2 는 PUT 만 명시 — UI 진입용 GET 자연 확장)
- [x] `PUT /api/admin/programs/[id]` — 회차별 정원 (PRD §3.7 분리 저장 UI 와 정합). 현재 활성 좌석 미만으로 축소 금지.
- [x] 모든 변경 액션은 `admin_audit_log` 기록

> **검증 부수효과:** Playwright 검증 과정에서 `OH-2026-0001` (program=I) + `OH-2026-0002` (program=II, C2-2) + `OH-2026-0003` (program=III, C2-3 capacity floor 가드) + `OH-2026-0004` (program=IV, C4 cron expiry — `cancel_reason='expired'`) 가 모두 `cancelled` 상태로 남았고, `admin_audit_log` 에 검증 액션이 누적됐다. Phase 1D 배포 직전에 일괄 정리: `DELETE FROM opera_humanitas.registrations WHERE reference_no LIKE 'OH-2026-%' AND name = '테스트신청자';` + `TRUNCATE opera_humanitas.admin_audit_log;` (+ reference seq 리셋도 함께 고려).

### C4. Vercel Cron (PRD §5.3)  (✅ 완료 / 커밋 `94d63fe`)
- [x] `POST /api/cron/expire-pending` — `Bearer ${CRON_SECRET}` timing-safe 검증 + `expire_pending_registrations()` RPC 호출. CRON_SECRET 미설정 시 500 fail-loud
- [x] `vercel.json` cron schedule `0 * * * *`
- [x] **부수 fix**: `RegistrationsClient` 의 status badge 가 `cancel_reason === 'expired'` (PG 함수가 실제로 박는 literal) 을 만료로 분류하도록 수정. 이전 로직(`startsWith('system:')`)으로는 cron 으로 만료된 row 가 "취소 (관리자)" 로 잘못 표시됐다
- [x] `.env.local` 에 CRON_SECRET dev placeholder 추가 (gitignored). Phase 1D 배포 전 운영자가 정한 값으로 교체 필요

---

## Phase 1D — 배포

- [ ] Vercel 프로젝트 연결 + 환경 변수 입력
- [ ] 도메인 결정 + 연결
- [ ] PRD §10 "미해결 항목" 운영자 확인 — 실제 계좌번호, 약관 최종본, 관리자 비밀번호 등
- [ ] PRD §11 인수 기준 전체 점검

---

## Phase 2 — 자동화 (이후, PRD §9)

- [ ] Resend 연동 (접수 메일, 입금 확정 메일, 만료 알림)
- [ ] 신규 신청 시 관리자 슬랙/메일 알림
- [ ] Supabase Auth로 관리자 인증 전환

---

## Phase 3 — 확장 (필요 시)

영문 신청 페이지, 후기/갤러리, 대기자 명단, PG 결제, 카카오 알림톡 — PRD §9 참조.

---

## 세션 종료 시 체크리스트

각 세션 끝에 이 문서를 업데이트:
1. 완료한 항목 `[ ]` → `[x]`로 변경
2. 발견한 추가 작업이 있다면 해당 단계에 항목 추가
3. PRD에서 벗어난 결정이 있었다면 [./decisions.md](./decisions.md)에 ADR 추가
4. 커밋 SHA를 해당 Phase 헤더 옆에 기록
