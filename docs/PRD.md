# Opera Humanitas — 신청 시스템 상세 요구사항 명세서

| 항목 | 내용 |
|---|---|
| 문서 버전 | v1.0 |
| 작성일 | 2026-05-18 |
| 프로젝트명 | Opera Humanitas — A Lecture Concert Series |
| 시리즈 일정 | 2026-06-20 ~ 2026-07-11 (매주 토요일 15:00–17:00, 총 4회차) |
| 장소 | 호서대학교 ART SPACE HOSEO (서울 서초구 반포대로 9) |
| 회차당 가격 | ₩30,000 |
| 회차당 정원 | 24석 |
| 배포 환경 | Vercel (Next.js) + Supabase |

---

## 1. 프로젝트 개요

### 1.1 목적

기존에 제작된 정적 랜딩 HTML(`OPERA_HUMANITAS.html`)에 **신청 기능**을 결합하여 다음을 달성한다.

- 방문자가 4회차 강연-콘서트 중 원하는 회차를 선택해 신청할 수 있도록 한다.
- 24석 한정 좌석을 임시예약 → 입금 확인 → 확정의 흐름으로 안전하게 운영한다.
- 주최자가 별도의 외부 도구 없이 신청 현황을 관리하고 입금 승인/취소를 처리한다.

### 1.2 범위

| 포함 | 미포함 (향후 검토) |
|---|---|
| 랜딩 페이지 (기존 HTML 디자인 이식) | 다국어(영문) 신청 페이지 |
| 신청 페이지 | 후기/갤러리 페이지 |
| 입금 안내 페이지 | PG 결제(카카오페이/토스 등) |
| 관리자 페이지 (인증 포함) | 회원가입/소셜 로그인 |
| 임시예약 자동 만료 처리 | 카카오 알림톡 |
| (Phase 2) 이메일 자동 발송 | 대기자 명단 |
| | 좌석 지정제 |
| | SMS 발송 |

### 1.3 핵심 비즈니스 룰

- **결제 방식**: 무통장 입금 단일 (PG 미사용)
- **좌석 운영**: 자유석 + 정원 24석 카운트 (좌석 지정 없음)
- **예약 라이프사이클**: `pending` (임시예약) → `confirmed` (입금확정) / `cancelled` (취소·만료)
- **임시예약 홀드 시간**: 기본 48시간, 관리자 변경 가능 (회차별 또는 전역)
- **중복 신청 방지**: 동일 (이메일 또는 전화번호) × 동일 회차 조합은 차단
- **매진 처리**: `pending + confirmed`가 24석에 도달하면 체크박스 비활성화 + 'SOLD OUT' 표시
- **여러 회차 동시 신청 가능**: 체크박스 다중 선택, 가격 실시간 합산
- **인증**: 사용자는 비로그인. 관리자는 환경변수 비밀번호 방식 (Phase 2에서 Supabase Auth로 확장)

---

## 2. 사용자 정의 및 시나리오

### 2.1 페르소나

| 페르소나 | 설명 | 주요 행동 |
|---|---|---|
| **일반 신청자** | 클래식 음악·인문학에 관심 있는 30~60대. 주로 모바일에서 인스타그램·지인 추천을 통해 유입. | 회차 확인 → 신청 → 입금 → 참석 |
| **관리자 (주최자)** | 박경준 / 아트컴퍼니본 운영자. PC 사용 기준. | 신청 현황 조회 → 입금 확인 → 승인/취소 처리 |

### 2.2 사용자 시나리오

#### 시나리오 A: 단일 회차 신청
1. 사용자가 인스타그램 링크로 랜딩 페이지에 진입한다.
2. Programme 섹션을 스크롤하며 4개 회차를 훑어본다.
3. III. 리골레토의 `Apply →` 버튼을 누른다.
4. 신청 페이지가 열리며 **III. 리골레토만 체크된 상태**로 표시되고, 가격에 ₩30,000이 보인다.
5. 이름, 전화번호, 이메일, 입금자명을 입력하고 약관에 동의한 뒤 **신청하기**를 누른다.
6. 입금 안내 페이지로 이동: "신한은행 110-XXX-XXX 박경준 / 입금자명 [홍길동] / ₩30,000 / 48시간 내 입금 요망"이 표시된다.
7. 사용자는 페이지를 캡처하거나 별도로 송금한다.
8. 관리자가 입금을 확인하고 승인 처리하면 좌석이 확정된다. (Phase 2에서 이메일 자동 안내 추가)

#### 시나리오 B: 다중 회차 신청
1. 사용자가 랜딩 페이지 상단 또는 하단의 `지금 신청하기 →` 버튼을 누른다.
2. 신청 페이지가 열리되 **어떤 회차도 미체크 상태**로 표시된다.
3. 사용자가 I. 피가로의 결혼과 IV. 카르멘을 체크한다 → 가격 표시가 ₩60,000으로 갱신된다.
4. 정보 입력 후 신청 → 입금 안내(₩60,000)로 이동.

#### 시나리오 C: 매진 회차
1. II. 라보엠이 이미 24명(pending + confirmed)이 된 상황.
2. 신청 페이지에 진입 시 II. 라보엠 체크박스가 비활성화되고 **SOLD OUT** 라벨이 표시된다.
3. `Apply →` 버튼에서 II. 라보엠을 누른 경우, 신청 페이지로 이동하되 해당 회차는 SOLD OUT 상태로 표시되며 자동 체크되지 않는다.

#### 시나리오 D: 관리자 입금 확인
1. 관리자가 `/admin` 경로로 진입.
2. 환경변수 비밀번호를 입력하고 로그인.
3. 대시보드에서 회차별 잔여 좌석, 미확인 신청 수를 확인.
4. 신청 목록에서 입금 입금자명·금액과 통장 거래내역을 대조.
5. 일치하는 신청 건에 **승인** 버튼 → `confirmed`로 전환.
6. 비정상 신청(스팸, 금액 불일치)은 **취소** 버튼 → `cancelled`로 전환.

#### 시나리오 E: 자동 만료
1. 사용자가 신청했으나 48시간 이내에 입금하지 않음.
2. 시스템(Vercel Cron)이 1시간마다 실행되어 `expires_at < now()`인 `pending`을 `cancelled`로 변경.
3. 해당 회차의 매진 카운트가 자동으로 줄어들어, 다음 신청자가 신청 가능해진다.

---

## 3. 화면 정의 (와이어프레임 수준 기술)

전체 라우팅 구조:

```
/                       랜딩 페이지 (기존 OPERA_HUMANITAS.html 이식)
/apply                  신청 페이지
/apply?program=2        신청 페이지 (회차 II 사전 체크)
/apply?program=1,3      신청 페이지 (회차 I, III 사전 체크)
/apply/complete         신청 완료 + 입금 안내 페이지
/apply/complete?id=xxx  특정 신청 건의 입금 안내
/admin                  관리자 로그인
/admin/dashboard        관리자 대시보드
/admin/registrations    신청 목록·관리
/admin/settings         설정 (홀드 시간, 계좌번호 등)
```

### 3.1 랜딩 페이지 `/`

기존 `OPERA_HUMANITAS.html`의 디자인과 콘텐츠를 **그대로** Next.js로 이식한다. 변경되는 부분은 다음 6개 버튼의 동작뿐이다.

| 위치 | 버튼 텍스트 | 동작 |
|---|---|---|
| 히어로 섹션 | `지금 신청하기 →` | `/apply`로 이동 (사전 체크 없음) |
| Programme · I. Le nozze di Figaro | `Apply →` | `/apply?program=1`로 이동 |
| Programme · II. La bohème | `Apply →` | `/apply?program=2`로 이동 |
| Programme · III. Rigoletto | `Apply →` | `/apply?program=3`로 이동 |
| Programme · IV. Carmen | `Apply →` | `/apply?program=4`로 이동 |
| 하단 CTA 섹션 | `지금 신청하기 →` | `/apply`로 이동 (사전 체크 없음) |

**추가 표시 사항**: 각 회차 카드에 **잔여 좌석 표시**를 추가한다.
- 24석 중 잔여 0~5석: 빨강 강조 `남은 자리 N석`
- 6~15석: 일반 `남은 자리 N석`
- 16석 이상: 표시 생략 또는 `예약 가능`
- 매진: `SOLD OUT` (`Apply →` 버튼 비활성화 + 시각적 비활성 처리)

### 3.2 신청 페이지 `/apply`

랜딩 페이지와 **동일한 디자인 언어**(다크 톤 `#0e1420`, 액센트 `#c69464`, Cormorant Garamond + Noto Serif KR)를 따른다.

#### 페이지 구조 (상단 → 하단)

```
[NAV / 로고: 좌상단에 "Opera Humanitas." 로고 (랜딩으로 돌아가기)]

[헤더]
  — Application · 신청
  Reservatio
  네 개의 밤 — 신청 양식

[01. 프로그램 선택]
  Quattuor noctes — 신청하실 회차를 선택해주세요. 복수 선택 가능합니다.

  ┌────────────────────────────────────────────┐
  │ ☑ I.  Le nozze di Figaro  · 피가로의 결혼     │
  │     2026.06.20 SAT · 15:00 · ₩30,000        │
  │     남은 자리 12석                            │
  ├────────────────────────────────────────────┤
  │ ☐ II. La bohème  · 라보엠                    │
  │     2026.06.27 SAT · 15:00 · ₩30,000        │
  │     SOLD OUT                  [비활성]       │
  ├────────────────────────────────────────────┤
  │ ☐ III. Rigoletto · 리골레토                  │
  │     2026.07.04 SAT · 15:00 · ₩30,000        │
  │     남은 자리 3석 (빨강)                      │
  ├────────────────────────────────────────────┤
  │ ☐ IV. Carmen · 카르멘                        │
  │     2026.07.11 SAT · 15:00 · ₩30,000        │
  │     예약 가능                                │
  └────────────────────────────────────────────┘

  ──────────────────────────────────────────────
  선택 회차: 1개      합계: ₩30,000
  ──────────────────────────────────────────────

[02. 신청자 정보]
  이름 *                [________________]
  전화번호 *            [010-____-____  ]
  이메일 *              [________________]
  입금자명 *            [________________]
                       ↳ 신청자와 다를 경우 입금자 이름을 적어주세요.
                          신청자 이름이 곧 입금자명일 경우 동일하게 적어주세요.

[03. 추가 정보 (선택)]
  알게 된 경로         [드롭다운: 인스타그램 / 지인 추천 / 검색 / 책 / 기타]
  남기실 한마디        [텍스트 영역 max 200자]

[04. 입금 안내]
  ┌────────────────────────────────────────────┐
  │ 입금 계좌  신한은행 110-XXX-XXX 박경준         │
  │ 입금 기한  신청 후 48시간 이내                  │
  │ 입금자명  반드시 위 [입금자명]과 동일하게      │
  │ 미입금 시 자동으로 예약이 취소됩니다.            │
  └────────────────────────────────────────────┘

[05. 약관 동의]
  ☐ [필수] 개인정보 수집 및 이용 동의            [전문 보기]
  ☐ [필수] 취소 및 환불 규정 동의                [전문 보기]
  ☐ [선택] 마케팅 정보 수신 동의

  ☐ 위 [필수] 약관에 모두 동의합니다.

[ 신청하기 → ]  버튼 (필수 항목 미입력 시 비활성화)

[FOOTER]
```

#### 동작 규칙

- URL `?program=` 파라미터의 회차 번호(1~4, 콤마 구분)를 파싱해 자동 체크. 매진된 회차는 자동 체크하지 않음.
- 체크박스 상태 변경 시 합계 가격 즉시 재계산 (₩30,000 × 선택 회차 수).
- 회차 미선택 상태에서는 `신청하기` 버튼 비활성.
- 전화번호 입력 시 자동 하이픈 포맷 (`010-1234-5678`).
- 이메일 유효성 클라이언트 검증.
- 모바일에서 회차 카드는 1열, PC에서는 2열 그리드.
- 폼 제출 중 더블 클릭 방지 (loading 상태).

### 3.3 신청 완료 페이지 `/apply/complete`

```
[헤더]
  — Completed · 06
  Reservatio facta est.
  신청이 접수되었습니다.

[신청 요약]
  접수번호: OH-2026-0042
  신청자:   홍길동 / 010-1234-5678 / hong@example.com
  입금자명: 홍길동

  선택 회차:
  · I.  Le nozze di Figaro  2026.06.20 SAT  ₩30,000
  · IV. Carmen              2026.07.11 SAT  ₩30,000
  ─────────────────────────────────────────
  합계                                     ₩60,000

[입금 안내 (큰 박스)]
  💳  입금 계좌
       신한은행  110-XXX-XXX-XXX
       예금주: 박경준

  ⏰  입금 기한
       2026.05.20 (수) 18:00까지 (48시간)
       기한 내 미입금 시 자동 취소됩니다.

  📝  입금자명을 반드시 [홍길동]으로 입금해주세요.
       다른 이름으로 입금 시 확인이 지연될 수 있습니다.

  [계좌번호 복사하기]   [입금 금액 복사하기]

[안내 문구]
  · 입금이 확인되면 별도 안내드립니다. (Phase 2 시 자동 메일)
  · 문의: voceverdiana@naver.com
  · 좌석은 24석 자유석이며, 입금 확인 순으로 확정됩니다.
  · 페이지를 캡처하여 보관해주세요.

[ 처음으로 ← ]
```

URL: `/apply/complete?id=<registration_id>` 형태로 접근. ID로 Supabase에서 상세 조회.

### 3.4 관리자 로그인 `/admin`

미니멀한 단일 입력 화면.

```
Opera Humanitas — Admin

[ 비밀번호 입력 ]
[ 로그인 ]
```

환경변수 `ADMIN_PASSWORD`와 비교, 일치 시 HttpOnly 쿠키 발급 (서명된 JWT 또는 단순 세션 토큰).

### 3.5 관리자 대시보드 `/admin/dashboard`

```
[상단 헤더 + 로그아웃]

[전체 요약 카드]
┌──────────────────────────────────────────────────────────┐
│ 회차별 현황                                                │
│  I.   피가로의 결혼   ▮▮▮▮▮▮▮▯▯▯▯▯▯▯▯▯▯▯▯▯▯▯▯▯  7/24      │
│       (확정 5 / 임시 2 / 잔여 17)                          │
│  II.  라보엠         ▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮  24/24 매진 │
│  III. 리골레토       ▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▯▯▯▯▯  20/24     │
│  IV.  카르멘         ▮▮▮▮▮▮▮▮▯▯▯▯▯▯▯▯▯▯▯▯▯▯▯▯  8/24      │
└──────────────────────────────────────────────────────────┘

[알림 카드]
- 입금 확인 대기 신청: 12건
- 곧 만료 예정 (6시간 내 미입금): 3건

[빠른 작업]
[ 신청 관리로 ]   [ 설정 ]
```

### 3.6 관리자 신청 관리 `/admin/registrations`

신청 목록 테이블.

```
[필터]
회차: [전체 ▼]  상태: [전체 ▼]  검색: [______]  [엑셀 다운로드]

[테이블]
┌─────┬──────────┬────────────┬──────────────┬────────┬─────────────┬────────┬──────────┬──────────────┐
│ 번호 │ 신청일시  │ 신청자      │ 연락처        │ 입금자명│ 회차         │ 금액   │ 상태      │ 액션         │
├─────┼──────────┼────────────┼──────────────┼────────┼─────────────┼────────┼──────────┼──────────────┤
│ 42  │ 05-18 14:│ 홍길동      │ 010-1234-... │ 홍길동  │ I, IV       │ 60,000│ 임시예약  │ [승인][취소] │
│ 41  │ 05-17 22:│ 김영희      │ 010-9876-... │ 김영희  │ III         │ 30,000│ 확정      │ [상세]       │
│ 40  │ 05-15 11:│ 박철수      │ 010-5555-... │ 박철수부│ II          │ 30,000│ 취소(만료)│ [상세]       │
└─────┴──────────┴────────────┴──────────────┴────────┴─────────────┴────────┴──────────┴──────────────┘

상태 컬럼은 색 구분:
  - 임시예약 (회색)
  - 확정 (초록)
  - 취소(만료) (연한 빨강)
  - 취소(관리자) (빨강)

페이지네이션: 20건씩
```

**상세 모달**: 행 클릭 시 신청자가 입력한 모든 필드(추가 정보 포함) 표시.

**액션**:
- `승인` (pending → confirmed): 클릭 시 확인 다이얼로그 → 상태 변경
- `취소` (pending|confirmed → cancelled): 클릭 시 사유 입력 다이얼로그 → 상태 변경
- 확정 건도 환불 케이스 위해 취소 가능

### 3.7 관리자 설정 `/admin/settings`

```
[입금 정보]
  입금 계좌  [______________]
  예금주    [______________]
  은행      [드롭다운]
  [저장]

[예약 정책]
  임시예약 홀드 시간   [48] 시간
  [저장]

[회차별 정원]   (기본 24, 회차별 조정 가능)
  I.   [24]
  II.  [24]
  III. [24]
  IV.  [24]
  [저장]
```

---

## 4. 데이터 모델 (Supabase / PostgreSQL)

### 4.1 ERD 개요

```
programs (4 rows, seeded)
  │
  └─< registration_items >─── registrations
                                  │
                                  └── consents (1:1 또는 컬럼)
```

### 4.2 테이블 정의

#### `programs` — 회차 마스터

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `id` | smallint | PK | 1~4 |
| `code` | text | UNIQUE NOT NULL | `figaro`, `boheme`, `rigoletto`, `carmen` |
| `roman_numeral` | text | NOT NULL | `I`, `II`, `III`, `IV` |
| `title_latin` | text | NOT NULL | `Le nozze di Figaro` |
| `title_ko` | text | NOT NULL | `피가로의 결혼` |
| `composer` | text | NOT NULL | `Wolfgang Amadeus Mozart` |
| `tagline` | text | | `사랑과 계급, 혁명을 웃음으로 뒤집다` |
| `scheduled_at` | timestamptz | NOT NULL | `2026-06-20 15:00:00+09` |
| `capacity` | smallint | NOT NULL DEFAULT 24 | 정원 |
| `price` | integer | NOT NULL DEFAULT 30000 | 가격(원) |
| `created_at` | timestamptz | DEFAULT now() | |

#### `registrations` — 신청 (헤더)

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `id` | uuid | PK DEFAULT gen_random_uuid() | |
| `reference_no` | text | UNIQUE NOT NULL | 사용자 노출용 (`OH-2026-0042`) |
| `name` | text | NOT NULL | 신청자명 |
| `phone` | text | NOT NULL | 하이픈 포함 정규화 (`010-1234-5678`) |
| `email` | text | NOT NULL | |
| `depositor_name` | text | NOT NULL | 입금자명 |
| `source` | text | | 알게 된 경로 |
| `message` | text | | 남기는 한마디 (max 200자) |
| `total_amount` | integer | NOT NULL | 합계 금액 |
| `status` | text | NOT NULL DEFAULT `pending` | `pending`/`confirmed`/`cancelled` |
| `cancel_reason` | text | | 취소 사유 (`expired`, `admin_manual`, 자유 텍스트) |
| `consent_privacy` | boolean | NOT NULL | 개인정보 동의 (필수) |
| `consent_refund` | boolean | NOT NULL | 환불약관 동의 (필수) |
| `consent_marketing` | boolean | NOT NULL DEFAULT false | 마케팅 동의 (선택) |
| `expires_at` | timestamptz | NOT NULL | 임시예약 만료 시각 |
| `confirmed_at` | timestamptz | | 입금 확정 시각 |
| `cancelled_at` | timestamptz | | 취소 시각 |
| `created_at` | timestamptz | NOT NULL DEFAULT now() | |
| `updated_at` | timestamptz | NOT NULL DEFAULT now() | |

#### `registration_items` — 신청-회차 (n:m 조인)

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `id` | uuid | PK DEFAULT gen_random_uuid() | |
| `registration_id` | uuid | FK → registrations(id) ON DELETE CASCADE | |
| `program_id` | smallint | FK → programs(id) | |
| `price_snapshot` | integer | NOT NULL | 신청 당시 가격 (가격 변동 대비) |
| `created_at` | timestamptz | DEFAULT now() | |
| | | UNIQUE(registration_id, program_id) | 동일 신청 내 중복 방지 |

**중복 신청 방지 (이메일 또는 전화번호 × 회차)**: 데이터 무결성을 위해 부분 인덱스 사용.

```sql
-- (registration의 status가 pending/confirmed인 건에 한해)
-- (email, program_id) 조합 유일성
CREATE UNIQUE INDEX uniq_email_program_active
  ON registration_items (lower(
    (SELECT email FROM registrations WHERE id = registration_id)
  ), program_id)
  WHERE -- 이 부분은 함수 인덱스 한계로 트리거로 대체 필요
  ;
```

→ 실제로는 **DB 트리거 또는 애플리케이션 레벨**에서 중복 체크하는 게 안전. (구현 가이드는 §6에서 상세히)

#### `settings` — 운영 설정 (단일 행)

| 컬럼 | 타입 | 기본값 | 설명 |
|---|---|---|---|
| `id` | smallint | PK = 1 (CHECK id=1) | 싱글톤 |
| `hold_hours` | smallint | 48 | 임시예약 홀드 시간 |
| `bank_name` | text | `신한은행` | |
| `account_number` | text | `110-XXX-XXX-XXX` | |
| `account_holder` | text | `박경준` | |
| `updated_at` | timestamptz | now() | |

#### `admin_audit_log` — 관리자 작업 이력 (선택, 권장)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | bigserial | PK |
| `action` | text | `approve`, `cancel`, `update_settings` 등 |
| `target_id` | text | 대상 ID |
| `payload` | jsonb | 변경 전후 데이터 |
| `created_at` | timestamptz | DEFAULT now() |

### 4.3 시드 데이터 (`programs`)

```sql
INSERT INTO programs (id, code, roman_numeral, title_latin, title_ko, composer, tagline, scheduled_at, capacity, price) VALUES
(1, 'figaro',    'I',   'Le nozze di Figaro', '피가로의 결혼', 'Wolfgang Amadeus Mozart', '사랑과 계급, 혁명을 웃음으로 뒤집다', '2026-06-20 15:00:00+09', 24, 30000),
(2, 'boheme',    'II',  'La bohème',          '라보엠',       'Giacomo Puccini',         '청춘은 왜 가장 찬란한 순간에 아픈가', '2026-06-27 15:00:00+09', 24, 30000),
(3, 'rigoletto', 'III', 'Rigoletto',          '리골레토',     'Giuseppe Verdi',          '권력과 욕망이 만들어낸 비극',     '2026-07-04 15:00:00+09', 24, 30000),
(4, 'carmen',    'IV',  'Carmen',             '카르멘',       'Georges Bizet',           '열정과 자유, 그리고 파멸의 서사', '2026-07-11 15:00:00+09', 24, 30000);
```

### 4.4 핵심 SQL 뷰/함수

#### 회차별 좌석 현황 뷰

```sql
CREATE VIEW program_availability AS
SELECT
  p.id,
  p.roman_numeral,
  p.title_ko,
  p.capacity,
  COUNT(ri.id) FILTER (WHERE r.status = 'confirmed')                    AS confirmed_count,
  COUNT(ri.id) FILTER (WHERE r.status = 'pending' AND r.expires_at > now()) AS pending_count,
  p.capacity - COUNT(ri.id) FILTER (
    WHERE r.status = 'confirmed' OR (r.status = 'pending' AND r.expires_at > now())
  ) AS available_count,
  CASE
    WHEN p.capacity - COUNT(ri.id) FILTER (
      WHERE r.status = 'confirmed' OR (r.status = 'pending' AND r.expires_at > now())
    ) <= 0 THEN true
    ELSE false
  END AS is_sold_out
FROM programs p
LEFT JOIN registration_items ri ON ri.program_id = p.id
LEFT JOIN registrations r ON r.id = ri.registration_id
GROUP BY p.id, p.capacity, p.roman_numeral, p.title_ko
ORDER BY p.id;
```

#### 만료 처리 함수

```sql
CREATE OR REPLACE FUNCTION expire_pending_registrations()
RETURNS integer AS $$
DECLARE
  expired_count integer;
BEGIN
  UPDATE registrations
  SET status = 'cancelled',
      cancel_reason = 'expired',
      cancelled_at = now(),
      updated_at = now()
  WHERE status = 'pending'
    AND expires_at < now();
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;
```

Vercel Cron이 1시간마다 이 함수를 호출하는 API를 트리거.

### 4.5 RLS (Row Level Security) 정책

- `programs`: **public SELECT**, 다른 권한 없음.
- `program_availability`: **public SELECT**.
- `registrations`, `registration_items`: 일반 anon 키로는 **INSERT만 허용**. SELECT/UPDATE/DELETE는 모두 서버 측 `service_role` 키로만 접근 (API 라우트 내부에서만 사용).
- `settings`: **public SELECT** (계좌·홀드시간은 신청 페이지에서 사용), UPDATE는 service_role만.

---

## 5. API 명세 (Next.js Route Handlers)

모든 응답은 JSON. 에러는 `{ error: { code, message } }` 포맷.

### 5.1 Public API

#### `GET /api/programs`
회차 목록 + 좌석 현황 반환.

응답:
```json
{
  "programs": [
    {
      "id": 1,
      "roman_numeral": "I",
      "title_latin": "Le nozze di Figaro",
      "title_ko": "피가로의 결혼",
      "composer": "Wolfgang Amadeus Mozart",
      "tagline": "사랑과 계급, 혁명을 웃음으로 뒤집다",
      "scheduled_at": "2026-06-20T15:00:00+09:00",
      "capacity": 24,
      "price": 30000,
      "available_count": 17,
      "is_sold_out": false
    }
    // ... 4개
  ]
}
```

#### `GET /api/settings/public`
공개 설정(계좌, 홀드시간).

응답:
```json
{
  "hold_hours": 48,
  "bank_name": "신한은행",
  "account_number": "110-XXX-XXX-XXX",
  "account_holder": "박경준"
}
```

#### `POST /api/registrations`
신청 생성.

요청:
```json
{
  "name": "홍길동",
  "phone": "010-1234-5678",
  "email": "hong@example.com",
  "depositor_name": "홍길동",
  "source": "instagram",
  "message": "기대됩니다.",
  "program_ids": [1, 4],
  "consent_privacy": true,
  "consent_refund": true,
  "consent_marketing": false
}
```

서버 처리 순서 (트랜잭션):
1. 입력값 검증 (Zod 등)
2. 모든 `program_ids`가 매진 아닌지 확인 (FOR UPDATE 락)
3. 동일 (이메일 OR 전화번호) × 동일 회차 조합이 활성 상태(pending+미만료 또는 confirmed)로 존재하는지 확인 → 있으면 409 에러
4. `reference_no` 생성: `OH-2026-{4자리}`
5. `expires_at` = `now() + settings.hold_hours * interval '1 hour'`
6. `registrations` INSERT
7. `registration_items` INSERT (program 수만큼)
8. 201 응답

응답:
```json
{
  "id": "uuid-...",
  "reference_no": "OH-2026-0042",
  "total_amount": 60000,
  "expires_at": "2026-05-20T18:30:00+09:00"
}
```

에러:
- `400` 입력값 오류
- `409 SOLD_OUT` 매진 (어떤 program이 매진인지 명시)
- `409 DUPLICATE` 중복 신청

#### `GET /api/registrations/[id]`
신청 완료 페이지에서 표시할 정보 조회. `id`는 UUID.

응답:
```json
{
  "reference_no": "OH-2026-0042",
  "name": "홍길동",
  "phone": "010-1234-5678",
  "email": "hong@example.com",
  "depositor_name": "홍길동",
  "total_amount": 60000,
  "status": "pending",
  "expires_at": "2026-05-20T18:30:00+09:00",
  "programs": [
    { "id": 1, "roman_numeral": "I", "title_ko": "피가로의 결혼", "scheduled_at": "...", "price": 30000 },
    { "id": 4, "roman_numeral": "IV", "title_ko": "카르멘",     "scheduled_at": "...", "price": 30000 }
  ],
  "bank_info": {
    "bank_name": "신한은행",
    "account_number": "110-XXX-XXX-XXX",
    "account_holder": "박경준"
  }
}
```

### 5.2 Admin API

모든 admin API는 **`Authorization` 쿠키 검증** 미들웨어를 통과해야 함.

#### `POST /api/admin/login`
요청: `{ "password": "..." }`
서버: `password === process.env.ADMIN_PASSWORD` 확인 → HttpOnly 쿠키 발급 (서명된 JWT, 12시간 유효).
응답: `{ "success": true }` 또는 `401`.

#### `POST /api/admin/logout`
쿠키 삭제.

#### `GET /api/admin/registrations?status=pending&program=2&q=홍&page=1`
신청 목록 조회 (필터·검색·페이지네이션).

응답:
```json
{
  "items": [
    {
      "id": "uuid-...",
      "reference_no": "OH-2026-0042",
      "name": "홍길동",
      "phone": "010-1234-5678",
      "email": "hong@example.com",
      "depositor_name": "홍길동",
      "total_amount": 60000,
      "status": "pending",
      "programs": ["I", "IV"],
      "created_at": "...",
      "expires_at": "...",
      "source": "instagram",
      "message": "기대됩니다."
    }
  ],
  "total": 42,
  "page": 1,
  "page_size": 20
}
```

#### `POST /api/admin/registrations/[id]/approve`
`pending` → `confirmed` 전환. `confirmed_at = now()`.
응답: `{ "success": true, "status": "confirmed" }`
에러: 이미 다른 상태인 경우 `409`.

#### `POST /api/admin/registrations/[id]/cancel`
요청: `{ "reason": "관리자 취소 사유 텍스트" }`
어떤 상태에서도 `cancelled` 전환 가능. `cancel_reason = "admin: <reason>"`, `cancelled_at = now()`.

#### `GET /api/admin/dashboard`
요약 정보.

응답:
```json
{
  "programs": [
    { "id": 1, "title_ko": "피가로의 결혼", "confirmed": 5, "pending": 2, "available": 17, "capacity": 24 }
  ],
  "pending_count": 12,
  "expiring_soon_count": 3
}
```

#### `GET /api/admin/registrations/export`
모든 신청 데이터 CSV 다운로드. UTF-8 BOM 포함.

#### `PUT /api/admin/settings`
요청: 설정 변경 객체.
응답: 변경된 설정.

### 5.3 Cron API

#### `POST /api/cron/expire-pending`
- Vercel Cron에서 1시간마다 호출.
- `Authorization: Bearer ${CRON_SECRET}` 헤더 검증.
- `expire_pending_registrations()` 함수 호출.
- 응답: `{ "expired_count": N }`

`vercel.json`:
```json
{
  "crons": [
    { "path": "/api/cron/expire-pending", "schedule": "0 * * * *" }
  ]
}
```

---

## 6. 구현 가이드

### 6.1 기술 스택

- **프레임워크**: Next.js 14+ (App Router) on Vercel
- **DB·인증·스토리지**: Supabase (PostgreSQL)
- **스타일링**: Tailwind CSS + CSS Variables (기존 HTML 디자인 시스템 이식)
- **폼·검증**: React Hook Form + Zod
- **날짜**: `date-fns` (KST 처리 명확화)
- **UI 컴포넌트**: shadcn/ui (Toast, Dialog, Table 등)
- **(Phase 2) 이메일**: Resend (무료 100건/일)

### 6.2 디렉토리 구조 (제안)

```
/app
  /(public)
    /page.tsx                    # 랜딩 페이지
    /apply
      /page.tsx                  # 신청 페이지
      /complete
        /page.tsx                # 완료/입금안내
  /(admin)
    /admin
      /page.tsx                  # 로그인
      /dashboard/page.tsx
      /registrations/page.tsx
      /registrations/[id]/page.tsx
      /settings/page.tsx
  /api
    /programs/route.ts
    /registrations/route.ts
    /registrations/[id]/route.ts
    /settings/public/route.ts
    /admin/login/route.ts
    /admin/logout/route.ts
    /admin/registrations/route.ts
    /admin/registrations/[id]/approve/route.ts
    /admin/registrations/[id]/cancel/route.ts
    /admin/registrations/export/route.ts
    /admin/dashboard/route.ts
    /admin/settings/route.ts
    /cron/expire-pending/route.ts
/components
  /landing/*                     # 기존 HTML 이식
  /apply/ProgramSelector.tsx
  /apply/RegistrationForm.tsx
  /apply/PriceSummary.tsx
  /apply/ConsentSection.tsx
  /apply/CompleteCard.tsx
  /admin/RegistrationsTable.tsx
  /admin/DashboardSummary.tsx
  /admin/AdminGuard.tsx
  /ui/*                          # shadcn
/lib
  /supabase/server.ts            # service role client
  /supabase/anon.ts              # anon client
  /auth/admin.ts                 # JWT 발급/검증
  /validation/registration.ts    # Zod 스키마
  /constants.ts
/middleware.ts                   # /admin/* 보호
```

### 6.3 환경 변수

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_PASSWORD=                  # 관리자 비밀번호
ADMIN_JWT_SECRET=                # 쿠키 서명용
CRON_SECRET=                     # Vercel Cron 인증
# Phase 2
RESEND_API_KEY=
RESEND_FROM_EMAIL=
```

### 6.4 디자인 토큰 (기존 HTML에서 추출)

```css
:root {
  /* Dark theme (메인) */
  --bg-deep: #0e1420;
  --bg-soft: #161d2c;
  --paper: #f4efe6;
  --ink: #f4efe6;
  --ink-dim: #b9b0a0;
  --ink-faint: #6a6358;
  --accent: #c69464;
  --rule: rgba(244, 239, 230, 0.18);

  /* Paper theme (보조 — 일부 섹션) */
  --paper-bg: #ede5d2;
  --paper-ink: #1a1814;

  /* Typography */
  --font-serif-latin: "Cormorant Garamond", "EB Garamond", serif;
  --font-serif-kr: "Noto Serif KR", serif;
  --font-sans: "Inter", "Pretendard", sans-serif;

  /* Scale */
  --type-display: clamp(56px, 11vw, 168px);
  --type-lead: clamp(18px, 1.4vw, 22px);
  --type-body: clamp(15px, 1.05vw, 17px);
  --section-y: clamp(96px, 11vw, 180px);
  --gutter: clamp(20px, 5vw, 56px);
  --container: 1280px;
}
```

### 6.5 동시성 처리 — 매진 직전 동시 신청 시나리오

**문제**: A와 B가 같은 순간에 마지막 1석 회차를 신청하면 둘 다 통과될 수 있다.

**해결 전략 (서버 트랜잭션)**:
```sql
BEGIN;
-- 1. 회차별 잔여 좌석을 락과 함께 조회
SELECT id, capacity FROM programs WHERE id = ANY($1) FOR UPDATE;

-- 2. 현재 활성 카운트 계산
WITH active_count AS (
  SELECT program_id, COUNT(*) AS cnt
  FROM registration_items ri
  JOIN registrations r ON r.id = ri.registration_id
  WHERE program_id = ANY($1)
    AND (r.status = 'confirmed' OR (r.status = 'pending' AND r.expires_at > now()))
  GROUP BY program_id
)
-- 3. capacity 초과 여부 확인
SELECT p.id, p.capacity - COALESCE(a.cnt, 0) AS available
FROM programs p
LEFT JOIN active_count a ON a.program_id = p.id
WHERE p.id = ANY($1);

-- 4. 모두 available >= 1이면 INSERT 진행, 아니면 ROLLBACK
INSERT INTO registrations (...) VALUES (...);
INSERT INTO registration_items (...) VALUES (...);
COMMIT;
```

→ Supabase에서는 이를 **RPC 함수**(`create_registration`)로 감싸서 호출.

### 6.6 중복 신청 차단

API 레이어에서 INSERT 직전에:
```sql
SELECT 1 FROM registration_items ri
JOIN registrations r ON r.id = ri.registration_id
WHERE ri.program_id = ANY($program_ids)
  AND (LOWER(r.email) = LOWER($email) OR r.phone = $phone)
  AND (r.status = 'confirmed' OR (r.status = 'pending' AND r.expires_at > now()))
LIMIT 1;
```
1행이라도 나오면 `409 DUPLICATE` 응답.

### 6.7 보안 고려사항

- **레이트 리미팅**: `/api/registrations` POST는 IP당 분당 5회 (Vercel 미들웨어 또는 Upstash Redis).
- **CSRF**: SameSite=Lax 쿠키. POST API는 Origin 헤더 검증.
- **XSS**: 사용자 입력(message, name 등)은 React 기본 이스케이핑 활용, dangerouslySetInnerHTML 금지.
- **개인정보**: phone·email은 DB에 평문 저장 (소규모 운영). 향후 필요 시 컬럼 단위 암호화 검토.
- **관리자 비밀번호**: bcrypt 해시 저장이 정석이나, MVP에서는 환경변수 평문 비교. Phase 2 (Supabase Auth) 이전 시 변경.
- **rate-limit + Cloudflare Turnstile (캡차)**: 봇 차단 위해 신청 폼에 추가 권장 (선택).

### 6.8 로깅·모니터링

- Vercel Logs로 API 호출 추적.
- `admin_audit_log` 테이블에 모든 관리자 액션 기록.
- Cron 만료 처리 결과 로깅.

---

## 7. 약관 문구 (초안 — 실제 문구는 운영자 검토 필요)

### 7.1 개인정보 수집 및 이용 동의 (필수)

> 아트컴퍼니본은 Opera Humanitas 강연-콘서트 신청·운영을 위해 다음과 같이 개인정보를 수집·이용합니다.
>
> **수집 항목**: 이름, 전화번호, 이메일, 입금자명, 알게 된 경로(선택), 남기는 한마디(선택)
> **이용 목적**: 신청 접수, 입금 확인, 행사 안내, 본인 확인
> **보유 기간**: 행사 종료 후 3개월까지 (이후 즉시 파기)
> **거부 시 불이익**: 동의를 거부하실 수 있으나, 동의 거부 시 신청이 불가합니다.

### 7.2 취소 및 환불 규정 (필수)

> · 입금 전 취소: 별도 절차 없이 자동 만료 (48시간 미입금)
> · 입금 후 ~ 공연일 7일 전: 100% 환불
> · 공연일 7일 전 ~ 3일 전: 50% 환불
> · 공연일 2일 전 ~ 당일: 환불 불가
> · 환불 요청: voceverdiana@naver.com 또는 공식 채널

### 7.3 마케팅 정보 수신 동의 (선택)

> 향후 Opera Humanitas 시리즈, 박경준의 공연·도서 출간, 관련 프로그램 안내를 이메일로 수신합니다. 거부하셔도 신청에 영향이 없습니다.

---

## 8. 검증 규칙 (요약)

| 필드 | 규칙 |
|---|---|
| `name` | 필수, 2~30자, 공백 트림 |
| `phone` | 필수, 정규식 `/^010-\d{4}-\d{4}$/` 또는 정규화 후 검증 |
| `email` | 필수, RFC 5322 간이 검증, 소문자 정규화 |
| `depositor_name` | 필수, 1~20자 |
| `source` | 선택, 사전정의 값 또는 기타 |
| `message` | 선택, 최대 200자 |
| `program_ids` | 최소 1개, 최대 4개, 각각 1~4 범위 |
| `consent_privacy` | 필수 true |
| `consent_refund` | 필수 true |
| `consent_marketing` | boolean |

---

## 9. 단계별 마일스톤 (제안)

### Phase 1 — MVP (필수, 본 문서 범위)
1. DB 스키마 마이그레이션 + 시드
2. 랜딩 페이지 이식 (기존 HTML → Next.js, 잔여 좌석 표시 추가)
3. 신청 페이지 + API
4. 완료/입금 안내 페이지
5. 관리자 로그인·대시보드·신청 관리·설정
6. Cron 만료 처리
7. Vercel 배포 + 환경변수 설정
8. **사용자 인수 테스트 (UAT) 시나리오 검증**

### Phase 2 — 자동화 (이후)
- Resend 연동 (신청 접수 메일, 입금 확인 메일, 만료 알림 메일)
- 관리자 알림 (신규 신청 슬랙/메일)
- Supabase Auth로 관리자 인증 전환

### Phase 3 — 확장 (필요 시)
- 영문 신청 페이지
- 후기·갤러리 페이지
- 대기자 명단
- PG 결제 (토스페이먼츠)
- 카카오 알림톡

---

## 10. 미해결·운영 단계 결정 사항

배포 전 반드시 운영자가 채워야 할 항목:

| 항목 | 결정 필요 시점 |
|---|---|
| 실제 입금 계좌번호 (현재 placeholder) | 배포 전 |
| 약관 문구 최종본 (변호사·운영자 검토) | 배포 전 |
| 관리자 비밀번호 | 배포 전 |
| 도메인 (서브도메인 사용 여부 포함) | 배포 전 |
| 환불 규정 세부 조건 | 약관 확정 시 |
| 신청 페이지 메타 태그 (OG 이미지 등 SNS 공유) | 마케팅 시작 전 |
| 개인정보 처리방침 페이지 별도 필요 여부 | 법적 검토 후 |

---

## 11. 인수 기준 (Acceptance Criteria 요약)

다음이 모두 통과하면 MVP 완료로 본다.

- [ ] 랜딩 페이지의 6개 `Apply / 지금 신청하기` 버튼이 모두 의도된 회차로 사전 체크된 신청 페이지를 연다.
- [ ] 신청 페이지에서 회차 체크 시 가격이 실시간으로 갱신된다.
- [ ] 매진 회차는 신청 페이지에서 비활성·SOLD OUT 표시된다.
- [ ] 동일 이메일 또는 전화번호로 동일 회차 중복 신청 시 명확한 에러 메시지가 표시된다.
- [ ] 신청 완료 시 입금 안내 페이지가 표시되고 계좌·금액·기한이 정확히 보인다.
- [ ] 신청 후 48시간 + 1시간 이내에 미입금 신청이 자동으로 `cancelled`로 전환된다.
- [ ] 관리자 페이지에서 입금 확인 후 `승인` 클릭 시 상태가 `confirmed`로 변경되고 잔여 좌석에 반영된다.
- [ ] 관리자 페이지에서 임의 신청을 `취소` 가능하고 좌석이 회복된다.
- [ ] 잘못된 비밀번호로는 관리자 페이지에 접근할 수 없다.
- [ ] 모바일(iPhone Safari, Android Chrome) 및 PC(Chrome, Safari) 최신 버전에서 모두 정상 동작한다.
- [ ] 동시 신청 부하 테스트: 마지막 1석에 2건 동시 INSERT 시 정확히 1건만 성공한다.

---

**문서 끝.**
