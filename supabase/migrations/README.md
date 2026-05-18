# Supabase migrations

이 디렉토리의 SQL 파일은 **다른 서비스와 공유하는 Supabase 프로젝트**에 적용한다.
모든 객체는 `opera_humanitas` 전용 schema에 들어가므로 기존 `public` 스키마의 다른 서비스 테이블과 충돌하지 않는다. (격리 근거: [`docs/decisions.md` ADR-007](../../docs/decisions.md))

## 적용 순서

Supabase Dashboard > **SQL Editor** 에서 다음 파일을 순서대로 붙여넣어 실행한다. 각 파일은 멱등하므로 재실행해도 안전.

| # | 파일 | PRD 절 | 내용 |
|---|---|---|---|
| 1 | [`0001_init.sql`](./0001_init.sql) | §4.1 / §4.2 | schema 생성, 5개 테이블 + 인덱스 + trigger, sequence, 권한·default privileges |
| 2 | [`0002_views_and_fns.sql`](./0002_views_and_fns.sql) | §4.4 / §5.1 / §6.5 | `program_availability` 뷰, `expire_pending_registrations()`, `create_registration()` RPC |
| 3 | [`0003_rls.sql`](./0003_rls.sql) | §4.5 | RLS 정책 (public SELECT 허용 범위 외에는 차단) |
| 4 | [`0004_fix_create_registration.sql`](./0004_fix_create_registration.sql) | §5.1 / §6.5 | `create_registration` 함수의 `id` 컬럼 ↔ 리턴 변수 ambiguity(SQLSTATE 42702) 해결 — `#variable_conflict use_column` 디렉티브 |
| 5 | [`../seed.sql`](../seed.sql) | §4.3 | 4개 회차 + settings 1행 |

## 적용 후 Dashboard에서 1회만 설정

> **Project Settings → API → Exposed schemas**

기본은 `public, graphql_public` 만 노출됨. 여기에 **`opera_humanitas` 를 추가**해 저장.
이 설정을 안 하면 PostgREST(`supabase-js`)가 `opera_humanitas` 스키마의 테이블·뷰·함수를 보지 못한다.

## 검증 쿼리 (선택)

```sql
-- 좌석 현황 뷰가 동작하는지
select * from opera_humanitas.program_availability;

-- 시드 확인
select id, code, scheduled_at, capacity, price from opera_humanitas.programs order by id;

-- 만료 처리 함수 (현재 시점 기준 0건이 정상)
select opera_humanitas.expire_pending_registrations();
```

## 새 migration을 추가할 때

- 파일명은 4자리 zero-padded 순번 + snake_case (`0004_add_xxx.sql`).
- 같은 스키마 안에서만 작업 — `opera_humanitas.<obj>` 로 항상 schema-qualified.
- `pgcrypto` 같은 extensions는 `extensions` 스키마를 사용 (`extensions.gen_random_uuid()`).
- DROP/RENAME 같은 파괴적 변경은 별도 migration 파일로 분리하고, 운영자가 적용 전에 백업하도록 README/PR 설명에 적는다.
