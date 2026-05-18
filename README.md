# Opera Humanitas

A four-part lecture-concert series 신청 시스템 — 박경준 바리톤의 강연-콘서트(2026.06.20–07.11, 호서대 ART SPACE HOSEO) 신청 페이지와 운영자 관리 도구.

## Getting started

```bash
npm install
npm run dev
```

`http://localhost:3000` 에서 랜딩 페이지를 확인할 수 있다. Supabase 환경 변수가 없어도 랜딩은 동작 (회차 좌석 데이터는 stub).

## Docs

- [`docs/PRD.md`](./docs/PRD.md) — 변경되지 않는 요구사항 명세 (v1.0)
- [`docs/implementation-plan.md`](./docs/implementation-plan.md) — Phase 별 진행 상황 / 다음 작업
- [`docs/decisions.md`](./docs/decisions.md) — PRD에서 벗어난 결정 (ADR-lite)
- [`docs/deploy.md`](./docs/deploy.md) — Phase 1D 배포 가이드 (Supabase 마이그레이션 + Vercel env + 도메인 + 운영 첫 검증)
- [`supabase/migrations/README.md`](./supabase/migrations/README.md) — SQL 적용 순서 + 정리 SQL 안내

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.2 (App Router, Turbopack) |
| Runtime | React 19 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 (CSS-first 토큰) + 원본 BEM CSS |
| Fonts | `Cormorant Garamond` · `EB Garamond` · `Noto Serif KR` · `Inter` (via `next/font/google`) |
| Backend | Supabase (PostgreSQL, `opera_humanitas` 전용 schema) |
| Auth | 환경변수 비밀번호 + `jose` HS256 JWT 쿠키 (Phase 2 에서 Supabase Auth 로 전환 예정) |
| Deployment | Vercel (Cron 포함 — `/api/cron/expire-pending` 매시 정각) |

PRD가 명시한 버전보다 최신을 사용하는 경우는 [`docs/decisions.md`](./docs/decisions.md)에 근거가 적혀 있다.

## Project layout

```
src/
├── app/
│   ├── (landing routes)/      # `/`, `/apply`, `/apply/complete`
│   ├── admin/                 # `/admin` 로그인 + `(authed)/dashboard|registrations|settings`
│   ├── api/                   # /api/registrations, /api/admin/*, /api/cron/expire-pending
│   ├── globals.css            # PRD §6.4 디자인 토큰 + BEM 클래스
│   └── proxy.ts               # Next.js 16 의 middleware (ADR-008 rename)
├── components/landing/        # 랜딩 페이지 섹션 컴포넌트
├── data/programs.ts           # 4개 회차 메타데이터 + availability stub (Supabase 미설정 시 fallback)
└── lib/
    ├── admin/                 # dashboard·registrations 서버 헬퍼 (page + API 공용)
    ├── auth/                  # 관리자 JWT 발급·검증
    ├── supabase/              # anon / service_role 클라이언트
    └── validation/            # Zod 스키마 (registration, admin)
public/images/                 # hero, speaker, books, sponsor 로고
supabase/                      # SQL migrations + seed + 배포 직전 정리 스크립트
docs/                          # PRD, implementation plan, ADR, deploy guide
vercel.json                    # Cron schedule
```

## Scripts

```bash
npm run dev    # next dev
npm run build  # next build
npm run start  # next start
npm run lint   # eslint
```

타입체크는 `npx tsc --noEmit`.
