-- Opera Humanitas — views & functions
-- PRD §4.4 (program_availability view, expire_pending_registrations)
-- PRD §5.1 + §6.5 (create_registration RPC with FOR UPDATE 락 + 중복 차단)

-- ---------------------------------------------------------------------------
-- program_availability — 회차별 좌석 현황 (PRD §4.4)
-- pending(미만료) + confirmed 를 점유 좌석으로 간주.
-- ---------------------------------------------------------------------------

create or replace view opera_humanitas.program_availability as
select
  p.id,
  p.roman_numeral,
  p.title_ko,
  p.capacity,
  count(ri.id) filter (where r.status = 'confirmed')                       as confirmed_count,
  count(ri.id) filter (where r.status = 'pending' and r.expires_at > now()) as pending_count,
  p.capacity - count(ri.id) filter (
    where r.status = 'confirmed'
       or (r.status = 'pending' and r.expires_at > now())
  ) as available_count,
  (p.capacity - count(ri.id) filter (
    where r.status = 'confirmed'
       or (r.status = 'pending' and r.expires_at > now())
  )) <= 0 as is_sold_out
from opera_humanitas.programs p
left join opera_humanitas.registration_items ri on ri.program_id = p.id
left join opera_humanitas.registrations r on r.id = ri.registration_id
group by p.id, p.capacity, p.roman_numeral, p.title_ko
order by p.id;

-- 뷰는 owner 권한으로 실행되므로 PostgREST가 read 할 수 있게 select 권한.
grant select on opera_humanitas.program_availability to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- expire_pending_registrations — Vercel Cron이 1시간마다 호출 (PRD §4.4, §5.3)
-- 만료된 pending 신청을 일괄 cancelled로 전환하고 영향 건수 반환.
-- ---------------------------------------------------------------------------

create or replace function opera_humanitas.expire_pending_registrations()
returns integer
language plpgsql
security definer
set search_path = opera_humanitas, extensions, public
as $$
declare
  expired_count integer;
begin
  update opera_humanitas.registrations
     set status        = 'cancelled',
         cancel_reason = 'expired',
         cancelled_at  = now(),
         updated_at    = now()
   where status = 'pending'
     and expires_at < now();

  get diagnostics expired_count = row_count;
  return expired_count;
end;
$$;

revoke all on function opera_humanitas.expire_pending_registrations() from public, anon, authenticated;
grant execute on function opera_humanitas.expire_pending_registrations() to service_role;

-- ---------------------------------------------------------------------------
-- create_registration — 신청 생성 RPC (PRD §5.1, §6.5)
--
-- 한 트랜잭션 안에서
--   1) 입력 회차들을 FOR UPDATE 락
--   2) 각 회차의 활성(점유) 카운트 계산 → 매진이면 'OH_SOLD_OUT'
--   3) (lower(email) OR phone) × program_id 활성 중복이면 'OH_DUPLICATE'
--   4) reference_no = OH-{YYYY}-{NNNN} (sequence 기반)
--   5) expires_at = now() + settings.hold_hours
--   6) registrations + registration_items INSERT
--   7) (id, reference_no, total_amount, expires_at) 반환
--
-- 호출 측에서는 SQLSTATE 'OH001'(매진) / 'OH002'(중복)을 분기해서 409로 매핑.
-- ---------------------------------------------------------------------------

create or replace function opera_humanitas.create_registration(
  p_name              text,
  p_phone             text,
  p_email             text,
  p_depositor_name    text,
  p_source            text,
  p_message           text,
  p_program_ids       smallint[],
  p_consent_privacy   boolean,
  p_consent_refund    boolean,
  p_consent_marketing boolean
)
returns table (
  id           uuid,
  reference_no text,
  total_amount integer,
  expires_at   timestamptz
)
language plpgsql
security definer
set search_path = opera_humanitas, extensions, public
as $$
declare
  v_program          opera_humanitas.programs%rowtype;
  v_active_count     integer;
  v_hold_hours       smallint;
  v_total            integer := 0;
  v_now              timestamptz := now();
  v_expires_at       timestamptz;
  v_reference_no     text;
  v_registration_id  uuid;
  v_program_id       smallint;
  v_unique_ids       smallint[];
begin
  if p_program_ids is null or array_length(p_program_ids, 1) is null then
    raise exception 'OH_NO_PROGRAMS' using errcode = '22023';
  end if;

  -- 중복 회차 제거 (1+1+2 같은 요청이 와도 1·2 두 회차로 처리)
  select array_agg(distinct x order by x)
    into v_unique_ids
    from unnest(p_program_ids) as x;

  -- (1) 회차 락 — 순서를 array 순서대로 잡아 데드락 회피.
  for v_program_id in select unnest(v_unique_ids) order by 1 loop
    select * into v_program
      from opera_humanitas.programs
     where opera_humanitas.programs.id = v_program_id
       for update;

    if not found then
      raise exception 'OH_PROGRAM_NOT_FOUND: %', v_program_id using errcode = '22023';
    end if;

    -- (2) 활성 카운트
    select count(*)
      into v_active_count
      from opera_humanitas.registration_items ri
      join opera_humanitas.registrations r on r.id = ri.registration_id
     where ri.program_id = v_program_id
       and (r.status = 'confirmed'
            or (r.status = 'pending' and r.expires_at > v_now));

    if v_active_count >= v_program.capacity then
      raise exception 'OH_SOLD_OUT: program %', v_program_id using errcode = 'OH001';
    end if;

    -- (3) 중복 차단 — 이메일(소문자) 또는 전화번호 + 회차
    if exists (
      select 1
        from opera_humanitas.registration_items ri
        join opera_humanitas.registrations r on r.id = ri.registration_id
       where ri.program_id = v_program_id
         and (lower(r.email) = lower(p_email) or r.phone = p_phone)
         and (r.status = 'confirmed'
              or (r.status = 'pending' and r.expires_at > v_now))
    ) then
      raise exception 'OH_DUPLICATE: program %', v_program_id using errcode = 'OH002';
    end if;

    v_total := v_total + v_program.price;
  end loop;

  -- (5) hold_hours
  select hold_hours into v_hold_hours from opera_humanitas.settings where id = 1;
  if v_hold_hours is null then
    v_hold_hours := 48;
  end if;
  v_expires_at := v_now + make_interval(hours => v_hold_hours);

  -- (4) reference_no: OH-YYYY-NNNN (4자리 미만은 zero-pad, 초과 시 자릿수 그대로 확장)
  v_reference_no := 'OH-'
    || to_char(v_now at time zone 'Asia/Seoul', 'YYYY')
    || '-'
    || lpad(nextval('opera_humanitas.registrations_reference_seq')::text, 4, '0');

  -- (6) INSERT
  insert into opera_humanitas.registrations (
    reference_no, name, phone, email, depositor_name, source, message,
    total_amount, status, consent_privacy, consent_refund, consent_marketing,
    expires_at, created_at, updated_at
  ) values (
    v_reference_no, p_name, p_phone, p_email, p_depositor_name, p_source, p_message,
    v_total, 'pending', p_consent_privacy, p_consent_refund, p_consent_marketing,
    v_expires_at, v_now, v_now
  )
  returning opera_humanitas.registrations.id into v_registration_id;

  insert into opera_humanitas.registration_items (registration_id, program_id, price_snapshot, created_at)
  select v_registration_id, p.id, p.price, v_now
    from opera_humanitas.programs p
   where p.id = any(v_unique_ids);

  -- (7) 반환
  return query
    select v_registration_id, v_reference_no, v_total, v_expires_at;
end;
$$;

-- anon은 RPC 호출 가능해야 한다. (Public 신청 페이지가 호출)
-- security definer 라 함수 owner 권한으로 INSERT 진행 → RLS 우회.
grant execute on function opera_humanitas.create_registration(
  text, text, text, text, text, text, smallint[], boolean, boolean, boolean
) to anon, authenticated, service_role;
