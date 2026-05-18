-- Opera Humanitas — initial schema (schema-isolated)
-- PRD §4.1 ERD + §4.2 tables
--
-- 이 프로젝트는 다른 서비스와 Supabase 프로젝트를 공유하므로
-- 모든 객체는 전용 schema `opera_humanitas` 안에 만든다. (ADR-007)
-- public schema는 건드리지 않는다.

-- ---------------------------------------------------------------------------
-- 0. schema + extensions
-- ---------------------------------------------------------------------------

create schema if not exists opera_humanitas;

-- pgcrypto는 Supabase 기본 프로젝트에 이미 enabled (extensions 스키마).
-- 다른 위치에 깔려 있어도 동작하도록 명시적으로 try.
create extension if not exists pgcrypto with schema extensions;

-- Supabase PostgREST가 쓰는 두 권한 + 서버 사이드 service_role에게 schema 사용 허용.
grant usage on schema opera_humanitas to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- shared trigger: bump updated_at on row update
-- ---------------------------------------------------------------------------

create or replace function opera_humanitas.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- programs  (PRD §4.2)
-- ---------------------------------------------------------------------------

create table opera_humanitas.programs (
  id             smallint primary key check (id between 1 and 4),
  code           text not null unique check (code in ('figaro', 'boheme', 'rigoletto', 'carmen')),
  roman_numeral  text not null check (roman_numeral in ('I', 'II', 'III', 'IV')),
  title_latin    text not null,
  title_ko       text not null,
  composer       text not null,
  tagline        text,
  scheduled_at   timestamptz not null,
  capacity       smallint not null default 24 check (capacity > 0),
  price          integer  not null default 30000 check (price >= 0),
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- registrations  (PRD §4.2)
-- ---------------------------------------------------------------------------

create table opera_humanitas.registrations (
  id                  uuid primary key default extensions.gen_random_uuid(),
  reference_no        text not null unique,
  name                text not null check (char_length(name) between 1 and 50),
  phone               text not null check (phone ~ '^[0-9-]{9,20}$'),
  email               text not null check (email ~* '^[^@]+@[^@]+\.[^@]+$'),
  depositor_name      text not null check (char_length(depositor_name) between 1 and 50),
  source              text,
  message             text check (char_length(coalesce(message, '')) <= 200),
  total_amount        integer not null check (total_amount >= 0),
  status              text not null default 'pending'
                       check (status in ('pending', 'confirmed', 'cancelled')),
  cancel_reason       text,
  consent_privacy     boolean not null check (consent_privacy = true),
  consent_refund      boolean not null check (consent_refund  = true),
  consent_marketing   boolean not null default false,
  expires_at          timestamptz not null,
  confirmed_at        timestamptz,
  cancelled_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- 만료 처리 cron이 자주 스캔하므로 status='pending' 부분 인덱스만 둔다.
create index registrations_status_expires_idx
  on opera_humanitas.registrations (status, expires_at)
  where status = 'pending';

create index registrations_email_lower_idx on opera_humanitas.registrations (lower(email));
create index registrations_phone_idx       on opera_humanitas.registrations (phone);
create index registrations_created_at_idx  on opera_humanitas.registrations (created_at desc);

create trigger trg_registrations_updated_at
  before update on opera_humanitas.registrations
  for each row execute function opera_humanitas.set_updated_at();

-- ---------------------------------------------------------------------------
-- registration_items  (PRD §4.2 — n:m join)
-- ---------------------------------------------------------------------------

create table opera_humanitas.registration_items (
  id               uuid primary key default extensions.gen_random_uuid(),
  registration_id  uuid not null references opera_humanitas.registrations(id) on delete cascade,
  program_id       smallint not null references opera_humanitas.programs(id),
  price_snapshot   integer not null check (price_snapshot >= 0),
  created_at       timestamptz not null default now(),
  unique (registration_id, program_id)
);

create index registration_items_program_id_idx
  on opera_humanitas.registration_items (program_id);
create index registration_items_registration_id_idx
  on opera_humanitas.registration_items (registration_id);

-- ---------------------------------------------------------------------------
-- settings  (PRD §4.2 — singleton)
-- ---------------------------------------------------------------------------

create table opera_humanitas.settings (
  id              smallint primary key default 1 check (id = 1),
  hold_hours      smallint not null default 48 check (hold_hours between 1 and 720),
  bank_name       text not null default '신한은행',
  account_number  text not null default '110-XXX-XXX-XXX',
  account_holder  text not null default '박경준',
  updated_at      timestamptz not null default now()
);

create trigger trg_settings_updated_at
  before update on opera_humanitas.settings
  for each row execute function opera_humanitas.set_updated_at();

-- ---------------------------------------------------------------------------
-- admin_audit_log  (PRD §4.2)
-- ---------------------------------------------------------------------------

create table opera_humanitas.admin_audit_log (
  id          bigserial primary key,
  action      text not null,
  target_id   text,
  payload     jsonb,
  created_at  timestamptz not null default now()
);

create index admin_audit_log_created_at_idx
  on opera_humanitas.admin_audit_log (created_at desc);

-- ---------------------------------------------------------------------------
-- reference_no generator sequence
-- Format produced by create_registration() in 0002:  OH-{YYYY}-{NNNN}
-- ---------------------------------------------------------------------------

create sequence opera_humanitas.registrations_reference_seq start 1;

-- ---------------------------------------------------------------------------
-- 권한: PostgREST가 쓰는 anon/authenticated와 서버 service_role에게 기본 CRUD 권한을 준다.
-- 실제 접근 제어는 0003_rls.sql의 RLS 정책에서 한다.
-- ---------------------------------------------------------------------------

grant all on all tables    in schema opera_humanitas to anon, authenticated, service_role;
grant all on all sequences in schema opera_humanitas to anon, authenticated, service_role;
grant all on all functions in schema opera_humanitas to anon, authenticated, service_role;

alter default privileges in schema opera_humanitas
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema opera_humanitas
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema opera_humanitas
  grant all on functions to anon, authenticated, service_role;
