-- Opera Humanitas — revert registration to pending
--
-- 운영 시 두 가지 시나리오를 위한 단방향 → 양방향 완화:
--   1) 실수 승인 복구:    confirmed → pending
--   2) 취소 철회 (이용자 변심): cancelled → pending
--
-- 둘 다 새 expires_at 을 발급(now() + settings.hold_hours)하고
-- confirmed_at / cancelled_at / cancel_reason 컬럼을 null 로 비운다.
-- (감사 이력은 admin_audit_log 에 따로 남으므로 row 컬럼은 깨끗하게 비우는 게
--  이후 cancel/approve 라우트의 상태 분기와 정합.)
--
-- cancelled → pending 만 좌석 재확보가 필요하므로 create_registration 과 동일한
-- FOR UPDATE 락 + 활성 카운트 + (email|phone)×program 활성 중복 검증을 거친다.
-- confirmed → pending 은 본인이 이미 자리 점유 중이므로 좌석 검증 불필요.
--
-- 호출 측에서는 SQLSTATE 분기:
--   OH001 → 매진       (409)
--   OH002 → 중복       (409)
--   OH003 → 이미 pending (409)
--   22023 → 신청/회차 없음 (404)

create or replace function opera_humanitas.revert_registration_to_pending(
  p_registration_id uuid
)
returns table (
  id           uuid,
  status       text,
  expires_at   timestamptz
)
language plpgsql
security definer
set search_path = opera_humanitas, extensions, public
as $$
#variable_conflict use_column
declare
  v_reg            opera_humanitas.registrations%rowtype;
  v_program        opera_humanitas.programs%rowtype;
  v_program_id     smallint;
  v_program_ids    smallint[];
  v_active_count   integer;
  v_hold_hours     smallint;
  v_now            timestamptz := now();
  v_expires_at     timestamptz;
  v_was_cancelled  boolean;
begin
  -- 신청 행 락
  select * into v_reg
    from opera_humanitas.registrations r
   where r.id = p_registration_id
     for update;

  if not found then
    raise exception 'OH_NOT_FOUND' using errcode = '22023';
  end if;

  if v_reg.status = 'pending' then
    raise exception 'OH_ALREADY_PENDING' using errcode = 'OH003';
  end if;

  v_was_cancelled := (v_reg.status = 'cancelled');

  -- 이 신청이 신청한 회차 ids 수집
  select array_agg(program_id order by program_id)
    into v_program_ids
    from opera_humanitas.registration_items
   where registration_id = p_registration_id;

  if v_program_ids is null or array_length(v_program_ids, 1) is null then
    raise exception 'OH_NO_ITEMS' using errcode = '22023';
  end if;

  -- cancelled → pending: 좌석 재확보 검증
  -- confirmed → pending: 본인 점유분이 그대로라 검증 불필요
  if v_was_cancelled then
    for v_program_id in select unnest(v_program_ids) loop
      select * into v_program
        from opera_humanitas.programs p
       where p.id = v_program_id
         for update;

      if not found then
        raise exception 'OH_PROGRAM_NOT_FOUND: %', v_program_id using errcode = '22023';
      end if;

      -- 다른 신청들의 활성 좌석 카운트 (본인 제외 — 본인은 아직 cancelled 상태)
      select count(*)
        into v_active_count
        from opera_humanitas.registration_items ri
        join opera_humanitas.registrations r on r.id = ri.registration_id
       where ri.program_id = v_program_id
         and r.id <> p_registration_id
         and (r.status = 'confirmed'
              or (r.status = 'pending' and r.expires_at > v_now));

      if v_active_count >= v_program.capacity then
        raise exception 'OH_SOLD_OUT: program %', v_program_id using errcode = 'OH001';
      end if;

      -- (email|phone) × program 활성 중복 차단 (본인 제외)
      if exists (
        select 1
          from opera_humanitas.registration_items ri
          join opera_humanitas.registrations r on r.id = ri.registration_id
         where ri.program_id = v_program_id
           and r.id <> p_registration_id
           and (lower(r.email) = lower(v_reg.email) or r.phone = v_reg.phone)
           and (r.status = 'confirmed'
                or (r.status = 'pending' and r.expires_at > v_now))
      ) then
        raise exception 'OH_DUPLICATE: program %', v_program_id using errcode = 'OH002';
      end if;
    end loop;
  end if;

  -- 새 hold 기한
  select hold_hours into v_hold_hours from opera_humanitas.settings where id = 1;
  if v_hold_hours is null then
    v_hold_hours := 48;
  end if;
  v_expires_at := v_now + make_interval(hours => v_hold_hours);

  update opera_humanitas.registrations
     set status        = 'pending',
         expires_at    = v_expires_at,
         confirmed_at  = null,
         cancelled_at  = null,
         cancel_reason = null,
         updated_at    = v_now
   where registrations.id = p_registration_id;

  return query
    select p_registration_id, 'pending'::text, v_expires_at;
end;
$$;

revoke all on function opera_humanitas.revert_registration_to_pending(uuid) from public, anon, authenticated;
grant execute on function opera_humanitas.revert_registration_to_pending(uuid) to service_role;
