-- Opera Humanitas — fix create_registration ambiguity
--
-- 0002에서 만든 create_registration의 RETURNS TABLE (id uuid, reference_no text, ...)
-- 출력 컬럼이 plpgsql 변수로도 잡혀, 함수 본문에서 테이블 컬럼 `id`를 참조할 때
-- "column reference 'id' is ambiguous" (SQLSTATE 42702)가 발생한다.
--
-- 해결: 함수 본문에 `#variable_conflict use_column` 디렉티브를 추가해
-- 충돌 시 컬럼을 우선 사용하도록 한다. API 시그니처는 유지.

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
#variable_conflict use_column
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

  select array_agg(distinct x order by x)
    into v_unique_ids
    from unnest(p_program_ids) as x;

  for v_program_id in select unnest(v_unique_ids) order by 1 loop
    select * into v_program
      from opera_humanitas.programs p
     where p.id = v_program_id
       for update;

    if not found then
      raise exception 'OH_PROGRAM_NOT_FOUND: %', v_program_id using errcode = '22023';
    end if;

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

  select hold_hours into v_hold_hours from opera_humanitas.settings where id = 1;
  if v_hold_hours is null then
    v_hold_hours := 48;
  end if;
  v_expires_at := v_now + make_interval(hours => v_hold_hours);

  v_reference_no := 'OH-'
    || to_char(v_now at time zone 'Asia/Seoul', 'YYYY')
    || '-'
    || lpad(nextval('opera_humanitas.registrations_reference_seq')::text, 4, '0');

  insert into opera_humanitas.registrations (
    reference_no, name, phone, email, depositor_name, source, message,
    total_amount, status, consent_privacy, consent_refund, consent_marketing,
    expires_at, created_at, updated_at
  ) values (
    v_reference_no, p_name, p_phone, p_email, p_depositor_name, p_source, p_message,
    v_total, 'pending', p_consent_privacy, p_consent_refund, p_consent_marketing,
    v_expires_at, v_now, v_now
  )
  returning registrations.id into v_registration_id;

  insert into opera_humanitas.registration_items (registration_id, program_id, price_snapshot, created_at)
  select v_registration_id, p.id, p.price, v_now
    from opera_humanitas.programs p
   where p.id = any(v_unique_ids);

  return query
    select v_registration_id, v_reference_no, v_total, v_expires_at;
end;
$$;

grant execute on function opera_humanitas.create_registration(
  text, text, text, text, text, text, smallint[], boolean, boolean, boolean
) to anon, authenticated, service_role;
