-- Opera Humanitas — Row Level Security
-- PRD §4.5
--
-- Phase 1 권한 모델:
--   - 공개 페이지 (랜딩, 신청, 완료 페이지)는 anon 키로만 호출.
--   - 신청 INSERT는 create_registration RPC(security definer)로 처리 → 테이블 직접 INSERT 권한 불요.
--   - 관리자 페이지는 서버 라우트에서 service_role 키로 호출 (BYPASSRLS).
--   - Supabase Auth의 'authenticated' 역할은 Phase 2에 도입. 현재는 anon=일반사용자, service_role=관리자.

-- ---------------------------------------------------------------------------
-- programs  — public SELECT
-- ---------------------------------------------------------------------------

alter table opera_humanitas.programs enable row level security;

create policy programs_select_public
  on opera_humanitas.programs
  for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- registrations  — anon 직접 접근 금지 (RPC 경유)
-- ---------------------------------------------------------------------------

alter table opera_humanitas.registrations enable row level security;

-- 정책 없음 = anon/authenticated 모두 직접 SELECT/INSERT/UPDATE/DELETE 차단.
-- 신청은 opera_humanitas.create_registration RPC(security definer)가 처리.
-- 관리자 라우트는 service_role 키로 호출 (BYPASSRLS).

-- ---------------------------------------------------------------------------
-- registration_items  — anon 직접 접근 금지
-- ---------------------------------------------------------------------------

alter table opera_humanitas.registration_items enable row level security;

-- 정책 없음 = RPC와 service_role 경유만 가능.

-- ---------------------------------------------------------------------------
-- settings  — public SELECT (계좌·홀드시간 공개 API에서 사용)
-- ---------------------------------------------------------------------------

alter table opera_humanitas.settings enable row level security;

create policy settings_select_public
  on opera_humanitas.settings
  for select
  to anon, authenticated
  using (true);

-- UPDATE/INSERT/DELETE는 정책 없음 → service_role만 가능.

-- ---------------------------------------------------------------------------
-- admin_audit_log  — service_role 전용
-- ---------------------------------------------------------------------------

alter table opera_humanitas.admin_audit_log enable row level security;

-- 정책 없음 → anon/authenticated 차단. service_role은 BYPASSRLS로 통과.
