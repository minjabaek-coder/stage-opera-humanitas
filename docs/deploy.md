# Deploy guide — Opera Humanitas Phase 1D

이 문서는 운영자가 한 번에 따라가는 배포 절차다. 코드 변경 없이 외부 시스템(Vercel,
Supabase, DNS) 설정과 운영 값 입력만으로 끝난다. 순서는 의존성 순이라 건너뛰지 말 것.

> **전제**: Phase 1A/1B/1C/1D-D1 까지 코드는 모두 main 에 머지됨. Supabase 마이그레이션
> 0001 → 0004 + seed 도 [개발용] 프로젝트에 이미 적용된 상태. 운영용 Supabase 프로젝트와
> Vercel 프로젝트는 아직 비어 있다고 가정한다 (이미 import 했다면 §3 부터).

---

## 0. 결정해야 할 항목 체크리스트 (PRD §10)

배포 시작 **전에** 다음 값이 손에 있어야 한다. 모두 운영자의 결정이다.

- [ ] **실제 입금 계좌번호** (은행 / 계좌번호 / 예금주)
- [ ] **관리자 비밀번호** — 32자 이상 권장. 한 번 정하면 운영 내내 사용
- [ ] **도메인** — 메인(예: `operahumanitas.com`) 또는 서브도메인(`opera.example.com`)
- [ ] **약관 최종본** — 개인정보 수집·이용 동의문 + 환불 규정 (변호사 검토 권장)
- [ ] **환불 규정 세부 조건** — 약관에 박힐 시점별 환불율
- [ ] **OG 이미지 / 메타 태그** (마케팅 시작 전이면 미뤄도 됨)
- [ ] **개인정보 처리방침 페이지 별도 필요 여부** (법적 검토 후 결정)

위 항목 중 약관·메타·처리방침은 추후 코드 수정이 필요하므로, 미정이면 **계좌번호/관리자
비번/도메인 3개만** 결정해도 1차 배포는 가능하다. 약관은 현재 코드에 들어간 임시 본문 그대로
나가게 되니 주의.

---

## 1. Supabase — 운영 프로젝트 준비

> **이미 다른 서비스와 공유 중인 Supabase 프로젝트를 사용한다** (ADR-007 / [`docs/decisions.md`](./decisions.md)).
> 모든 객체는 `opera_humanitas` 전용 schema 에 들어가 다른 서비스의 `public` 과 격리된다.

### 1-1. 마이그레이션 적용

[`supabase/migrations/README.md`](../supabase/migrations/README.md) 의 적용 순서대로
Dashboard → **SQL Editor** 에서 한 번씩 실행:

1. `0001_init.sql`
2. `0002_views_and_fns.sql`
3. `0003_rls.sql`
4. `0004_fix_create_registration.sql`
5. `../seed.sql`

각 파일은 멱등(`on conflict do nothing` / `create or replace`)이므로 재실행해도 안전.

### 1-2. Exposed schemas 추가

Dashboard → **Project Settings → API → Exposed schemas** 에 `opera_humanitas` 를 추가하고
저장. 이걸 안 하면 PostgREST(`supabase-js`)가 우리 스키마의 테이블·뷰·함수를 보지 못한다.

### 1-3. 검증 부수효과 정리

[Phase 1A~1D 검증](../docs/implementation-plan.md#phase-1d--배포) 과정에서 누적된 테스트
신청(OH-2026-0001 ~ 0006) + admin audit log 를 비운다.

> ⚠️ **운영 신청이 한 건이라도 들어왔다면 절대 실행하지 말 것.** 조건절이 광범위해 운영
> 데이터까지 쓸어버릴 수 있다.

SQL Editor 에 [`supabase/cleanup-pre-deploy.sql`](../supabase/cleanup-pre-deploy.sql) 전체를
붙여넣어 한 번 실행. 마지막 select 가 `registrations 남은 row 수 = 0`, `admin_audit_log 남은
row 수 = 0` 을 반환하면 성공.

### 1-4. API 키 복사

Dashboard → **Project Settings → API** 에서 다음 3개 복사 (§3-2 환경변수에 사용):

- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon (publishable) key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role (secret) key` → `SUPABASE_SERVICE_ROLE_KEY` ← **클라이언트에 노출 금지**

---

## 2. 시크릿 생성

운영용 시크릿 두 개를 미리 만들어 둔다 (둘 다 충분히 긴 랜덤).

```bash
# JWT 서명용 — 최소 32자. base64 48바이트면 안전한 길이.
openssl rand -base64 48

# Cron 호출 인증용 — Vercel Cron 이 Authorization: Bearer <CRON_SECRET> 로 보냄
openssl rand -base64 48
```

각각 메모해 두고 §3-2 에 입력한다. 절대 git 에 커밋하지 말 것.

---

## 3. Vercel — 프로젝트 import + 환경변수 + 도메인

### 3-1. GitHub repo import

1. [vercel.com](https://vercel.com) 로그인 → **Add New → Project**
2. GitHub 에서 이 repo 를 선택해 import
3. Framework Preset 은 자동으로 **Next.js** 인식 — 그대로 진행
4. 첫 빌드는 환경변수가 없어 실패할 수 있다. 정상. §3-2 까지 채운 뒤 redeploy.

### 3-2. 환경변수 입력

Vercel 프로젝트 → **Settings → Environment Variables** 에 6개 입력:

| Key | 값 | Environments |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | §1-4 의 Project URL | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | §1-4 의 anon key | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | §1-4 의 service_role key | Production, Preview, Development |
| `ADMIN_PASSWORD` | §0 에서 정한 관리자 비밀번호 | Production (Preview 도 같은 값 권장) |
| `ADMIN_JWT_SECRET` | §2 에서 생성한 첫 번째 시크릿 | Production, Preview, Development |
| `CRON_SECRET` | §2 에서 생성한 두 번째 시크릿 | Production |

- `NEXT_PUBLIC_` 접두사가 있는 것만 클라이언트 번들에 들어간다. service_role/JWT_SECRET/CRON_SECRET 은 접두사가 없으니 안전.
- `CRON_SECRET` 은 Vercel Cron 자체가 자동으로 Bearer 헤더로 붙여 호출하므로 Production 환경만 있으면 충분.
- 입력 후 **Redeploy** 버튼으로 다시 배포.

### 3-3. Cron 활성화 확인

[`vercel.json`](../vercel.json) 의 `crons` 스케줄(`0 * * * *` — 매시 정각)이 자동 인식된다.
Vercel 프로젝트 → **Settings → Cron Jobs** 에 `/api/cron/expire-pending` 한 줄이 보이면 OK.
보이지 않으면 한 번 더 redeploy.

> Vercel Hobby 플랜은 daily cron 만 지원 — 시간당 실행은 Pro 이상 필요. PRD §5.3 이 hourly 를
> 명시하므로 Pro 가 전제다. Hobby 라면 일단 daily(`0 6 * * *`)로 두고 운영 중 업그레이드.

### 3-4. 도메인 연결

Vercel 프로젝트 → **Settings → Domains** 에 §0 에서 정한 도메인 추가.

- **루트 도메인** (`operahumanitas.com`): 도메인 등록기관(가비아/Cloudflare/Route 53 등)에서
  Vercel 이 알려주는 A/AAAA 레코드 추가
- **서브도메인** (`opera.example.com`): CNAME 으로 `cname.vercel-dns.com` 가리키기

DNS 전파 후 Vercel 이 자동으로 Let's Encrypt 인증서 발급. 보통 5~15분, 길면 24h.

---

## 4. 운영 첫 검증

도메인이 살아난 직후 운영 첫 신청 한 건을 통과시켜 전체 흐름을 점검한다.

### 4-1. 관리자 페이지에서 운영 계좌 입력

1. `https://<도메인>/admin` 접속 → §0 의 관리자 비밀번호로 로그인
2. **Settings** 페이지로 이동
3. **입금 정보** 에 §0 의 은행/계좌번호/예금주 입력 → 저장
4. 필요 시 **예약 정책** 의 임시예약 홀드 시간(기본 48h) 조정
5. 회차별 정원(기본 24)도 필요 시 조정

### 4-2. 신청 → 입금 안내 → 승인 흐름 1회

1. 시크릿/일반 창에서 `https://<도메인>/apply` 접속
2. 실제 본인 정보로 회차 한 개 선택 → 신청 → 입금 안내 페이지 도달
3. 입금 안내에 §4-1 에서 입력한 계좌 정보가 보이는지 확인
4. 관리자 페이지 **Registrations** 에 해당 행이 `임시예약` 으로 뜨는지 확인
5. 모달 열어 **승인** → `확정` 으로 전환되는지 확인
6. **Dashboard** 의 KPI 와 회차 카드가 업데이트되는지 확인

### 4-3. Cron 동작 확인

다음 정각(또는 daily 라면 다음 새벽)에 Vercel 프로젝트 → **Logs → Functions** 에서
`/api/cron/expire-pending` 호출 로그가 남는지 확인. 응답이 `{ expired_count: N }` (보통 0)
이면 정상.

수동으로 한 번 호출해 확인하려면:

```bash
curl -X POST https://<도메인>/api/cron/expire-pending \
  -H "Authorization: Bearer <CRON_SECRET>"
# → {"expired_count": 0}  (만료 대상 없을 때)
```

### 4-4. PRD §11-10 실기기 매트릭스

운영자가 직접 확인해야 하는 마지막 인수 기준:

- [ ] iPhone Safari (최신) — 랜딩 / 신청 / 완료 페이지
- [ ] Android Chrome (최신) — 랜딩 / 신청 / 완료 페이지
- [ ] Chrome PC (최신) — 전 페이지 + 관리자
- [ ] Safari PC (최신) — 전 페이지 + 관리자

Playwright 로 390×844 / 1440×900 viewport 는 이미 확인했지만 실기기 터치 인터랙션·폰트
렌더링·Web Audio(랜딩 모티프 미리듣기)는 실기기에서 한 번 더 봐야 안전.

---

## 5. 운영 모드 전환 체크리스트

배포 직후 다음을 확인해 운영 모드 진입을 마무리:

- [ ] `https://<도메인>/admin` 로그인 — Vercel env 의 `ADMIN_PASSWORD` 로 들어가지는지
- [ ] `https://<도메인>/admin/dashboard` 의 4개 회차 카드가 24/24 잔여로 시작하는지
- [ ] `/api/programs` JSON 응답이 정상인지 (`curl https://<도메인>/api/programs | jq .`)
- [ ] §4-2 의 운영 첫 신청은 본인이 직접 만든 row 이므로 **승인 후 취소** 로 정리 (실제
      입금 없는 테스트 신청을 운영 데이터로 남기지 말 것)
- [ ] Vercel 프로젝트 → **Settings → Git → Production Branch** 가 `main` 인지 확인
- [ ] (선택) Vercel 프로젝트 → **Settings → Analytics** 활성화 — Phase 2 모니터링에 유용

---

## 6. 트러블슈팅

| 증상 | 원인·해결 |
|---|---|
| `/admin/login` 에서 비밀번호 정확한데 401 | Vercel env 의 `ADMIN_PASSWORD` 와 입력값 비교 — 앞뒤 공백 의심. `ADMIN_JWT_SECRET` 이 32자 미만이면 서버 500. |
| `/api/registrations` POST 가 500 (DB_NOT_CONFIGURED) | Vercel env 에 Supabase 키 3개 모두 입력했는지 확인. Production 환경 redeploy 필요. |
| `/api/programs` 가 빈 배열 | Supabase Dashboard → API → Exposed schemas 에 `opera_humanitas` 추가됐는지 확인. 추가 후 PostgREST 가 자동 reload. |
| 회차 잔여 좌석이 운영 데이터와 안 맞음 | 랜딩이 ISR(`revalidate=30`) 이라 최대 30초 지연. 즉시 반영하려면 `/admin/dashboard` 의 새로고침 버튼 사용. |
| Vercel Cron 이 실행은 되는데 401 로 실패 | Vercel 에서 자동으로 붙이는 Bearer 헤더는 Production 환경의 `CRON_SECRET` 을 사용. Production 에 env 가 빠졌는지 확인. |
| 관리자 페이지가 로그인 후에도 계속 `/admin` 으로 튕김 | 쿠키가 막힌 케이스. dev 가 아니면 `secure: true` 가 적용되므로 반드시 HTTPS 도메인에서 접속. `http://` 로 접속하면 쿠키가 저장되지 않는다. |
| cron 결과 `expired_count` 가 계속 0인데 실제로 만료 대상이 있어야 한다 | `expires_at` 컬럼의 timezone 확인. Postgres 는 `timestamptz` 로 UTC 저장 — 운영 후 한 번 점검: `select id, expires_at, now(), expires_at < now() from opera_humanitas.registrations where status='pending';` |

문제 재현 시 Vercel 프로젝트 → **Logs → Functions** 에서 해당 라우트 로그를 먼저 본 뒤 GitHub
issue 에 첨부.

---

## 7. 운영 중 자주 쓰는 작업

| 작업 | 위치 |
|---|---|
| 입금 확인 → 승인 | `/admin/registrations` 행 클릭 → **승인** |
| 환불·관리자 취소 | `/admin/registrations` 행 클릭 → **취소** + 사유 입력 |
| 회차 정원 조정 | `/admin/settings` → 회차별 정원. 활성 좌석 이하로는 축소 불가 |
| 계좌번호 변경 | `/admin/settings` → 입금 정보 |
| 임시예약 홀드 시간 조정 | `/admin/settings` → 예약 정책 |
| 신청 일괄 다운로드 (CSV) | `/admin/registrations` → 우상단 **엑셀 다운로드** |
| Cron 강제 실행 | §4-3 의 curl 호출 (테스트용. 정기 실행은 Vercel 이 알아서) |

---

## 8. Phase 2 진입 시 추가

- Resend API 키 → `RESEND_API_KEY` / `RESEND_FROM_EMAIL` env 추가
- 관리자 알림 슬랙 webhook
- Supabase Auth 로 비밀번호 단일 인증 교체

자세한 사항은 [`docs/implementation-plan.md`](./implementation-plan.md) Phase 2 섹션 참조.
