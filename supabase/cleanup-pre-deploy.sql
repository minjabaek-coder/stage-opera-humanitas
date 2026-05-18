-- Opera Humanitas — Phase 1D 배포 직전 검증 데이터 정리
-- =============================================================
-- 적용 위치: Supabase Dashboard > SQL Editor (운영 프로젝트)
-- 적용 시점: Phase 1D 배포 전, 모든 검증 완료 후 한 번만 실행
-- ⚠️ 운영 데이터가 단 한 건도 들어오기 전에만 실행할 것. 검증 외 신청이
--    포함됐다면 이 스크립트는 사용하지 말고 개별 삭제 SQL 을 별도로 작성한다.
--
-- 정리 대상:
--   1) 검증 과정에서 생성된 테스트 신청 모두 (name = '테스트신청자',
--      reference_no LIKE 'OH-2026-%') → registrations + 연관
--      registration_items 모두 ON DELETE CASCADE 로 함께 삭제
--   2) admin_audit_log 의 검증 액션 전체 (TRUNCATE)
--   3) reference_no 시퀀스 리셋 → 운영 첫 신청이 OH-{YYYY}-0001 부터 시작
--
-- 누적된 검증 부수효과 (각 단계별로 cancelled 상태로 남음):
--   - OH-2026-0001 : C1/C3 검증
--   - OH-2026-0002 : C2-2 승인→취소 흐름 검증
--   - OH-2026-0003 : C2-3 capacity floor 가드 검증
--   - OH-2026-0004 : C4 cron 만료 검증 (cancel_reason='expired')
--   - OH-2026-0005 : 1D 동시 신청 부하 테스트 승자
--   - OH-2026-0006 : 1D SOLD OUT 표시 검증
-- =============================================================

begin;

-- 1) 검증 신청 삭제 (registration_items 는 FK CASCADE 로 함께 사라짐)
delete from opera_humanitas.registrations
where reference_no like 'OH-%'
  and name = '테스트신청자';

-- 2) 검증 감사 로그 전부 비움
truncate opera_humanitas.admin_audit_log;

-- 3) reference_no 시퀀스를 1 부터 다시 시작하도록 리셋
alter sequence opera_humanitas.registrations_reference_seq restart with 1;

-- 확인
select 'registrations 남은 row 수' as label, count(*) as value
  from opera_humanitas.registrations
union all
select 'admin_audit_log 남은 row 수', count(*)
  from opera_humanitas.admin_audit_log
union all
select 'next reference_no 시퀀스 값',
       nextval('opera_humanitas.registrations_reference_seq');

-- ↑ 마지막 select 가 시퀀스를 한 칸 소비하므로(nextval=1 후 currval=1) 확인 후
-- 실제 첫 운영 신청은 OH-{YYYY}-0002 가 된다. 이게 부담스럽다면 위 select 를
-- 빼고 별도로 `select currval(...)` 만 확인한 뒤 다시 restart 한다.
-- 일반적으로 운영 첫 번호가 0001 인지 0002 인지는 무관하므로 그대로 commit.

commit;
