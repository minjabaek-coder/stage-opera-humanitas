# Implementation Plan

PRD([./PRD.md](./PRD.md)) Phase 1 MVP을 작업 가능한 단위로 쪼개고, 세션 사이에 진행 상황을 추적하기 위한 살아있는 문서.

각 항목 옆 체크박스는 **구현 완료** 여부 — 코드가 들어가고 dev 환경에서 동작이 확인됐을 때만 체크.
설계 결정의 *근거*는 [./decisions.md](./decisions.md), 변하지 않는 *요구사항*은 [./PRD.md](./PRD.md)를 본다.

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

## Phase 1B — 데이터 베이스 + 신청 흐름

### B1. Supabase 스키마 + 시드
- [ ] `supabase/migrations/0001_init.sql` — `programs`, `registrations`, `registration_items`, `settings`, `admin_audit_log` (PRD §4.2)
- [ ] `supabase/migrations/0002_views_and_fns.sql` — `program_availability` 뷰, `expire_pending_registrations()` 함수, `create_registration()` RPC (PRD §4.4, §6.5)
- [ ] `supabase/seed.sql` — 4개 회차 시드 + `settings` 단일 행 (PRD §4.3)
- [ ] `supabase/migrations/0003_rls.sql` — RLS 정책 (PRD §4.5)
- [ ] `supabase/migrations/README.md` — 각 migration이 PRD §4의 어느 부분에 해당하는지 매핑
- [ ] 사용자가 Supabase 프로젝트 생성 후 SQL Editor에 붙여넣어 적용 → 콘솔로 확인

### B2. Supabase 클라이언트 + 환경 변수
- [ ] `src/lib/supabase/server.ts` (service role) + `src/lib/supabase/anon.ts` (anon)
- [ ] `.env.example` — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`, `ADMIN_JWT_SECRET`, `CRON_SECRET`
- [ ] `src/data/programs.ts`의 `getProgramAvailability()` stub → 실제 `program_availability` 뷰 조회로 교체

### B3. Public API 라우트 (PRD §5.1)
- [ ] `GET /api/programs` — 회차 목록 + 좌석 현황
- [ ] `GET /api/settings/public` — 계좌·홀드시간
- [ ] `POST /api/registrations` — 트랜잭션으로 신청 생성 (매진/중복 체크 포함)
- [ ] `GET /api/registrations/[id]` — 완료 페이지 상세
- [ ] Zod 스키마 (`src/lib/validation/registration.ts`)

### B4. 신청 페이지 `/apply` (PRD §3.2)
- [ ] `src/app/apply/page.tsx` — 클라이언트 폼 (React Hook Form + Zod)
- [ ] `?program=` 파싱 → 사전 체크 (매진은 자동 체크 제외)
- [ ] 가격 실시간 합산, 전화번호 하이픈 포맷, 약관 동의, 더블 클릭 방지
- [ ] 매진/중복 에러 → 명확한 메시지

### B5. 완료 페이지 `/apply/complete` (PRD §3.3)
- [ ] `src/app/apply/complete/page.tsx` — `?id=<uuid>`로 신청 상세 조회
- [ ] 계좌번호/금액 복사 버튼

### B6. 인수 기준 검증
- [ ] 마지막 1석 동시 신청 부하 테스트 (`POST /api/registrations` 2건 동시) — 정확히 1건만 성공
- [ ] 모바일/PC 브라우저 검증

---

## Phase 1C — 관리자 + Cron

### C1. 관리자 인증
- [ ] `POST /api/admin/login` — 환경변수 비밀번호 검증 → HttpOnly JWT 쿠키 12h (PRD §5.2)
- [ ] `POST /api/admin/logout`
- [ ] `src/middleware.ts` — `/admin/*` 및 `/api/admin/*` 보호
- [ ] `src/app/admin/page.tsx` — 단일 비밀번호 입력 폼

### C2. 관리자 페이지 (PRD §3.5–3.7)
- [ ] `/admin/dashboard` — 회차별 잔여 좌석, 입금 대기 카운트, 곧 만료 카운트
- [ ] `/admin/registrations` — 필터·검색·페이지네이션 테이블 + 상세 모달
- [ ] `/admin/settings` — 계좌/홀드 시간/회차 정원 편집

### C3. 관리자 API (PRD §5.2)
- [ ] `GET /api/admin/registrations` — 필터/검색/페이지네이션
- [ ] `POST /api/admin/registrations/[id]/approve` — pending → confirmed
- [ ] `POST /api/admin/registrations/[id]/cancel` — 사유 입력 후 cancelled
- [ ] `GET /api/admin/registrations/export` — UTF-8 BOM CSV
- [ ] `GET /api/admin/dashboard`
- [ ] `PUT /api/admin/settings`
- [ ] 모든 관리자 액션 `admin_audit_log`에 기록

### C4. Vercel Cron (PRD §5.3)
- [ ] `POST /api/cron/expire-pending` — `Bearer ${CRON_SECRET}` 검증 + `expire_pending_registrations()` 호출
- [ ] `vercel.json` cron schedule `0 * * * *`

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
