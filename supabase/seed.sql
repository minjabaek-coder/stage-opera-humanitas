-- Opera Humanitas — seed data
-- PRD §4.3
--
-- 0001~0003 적용 후 한 번만 실행. 멱등성을 위해 ON CONFLICT 사용.

insert into opera_humanitas.programs
  (id, code, roman_numeral, title_latin, title_ko, composer, tagline, scheduled_at, capacity, price)
values
  (1, 'figaro',    'I',   'Le nozze di Figaro', '피가로의 결혼', 'Wolfgang Amadeus Mozart', '사랑과 계급, 혁명을 웃음으로 뒤집다', '2026-06-20 15:00:00+09', 24, 30000),
  (2, 'boheme',    'II',  'La bohème',          '라보엠',       'Giacomo Puccini',         '청춘은 왜 가장 찬란한 순간에 아픈가', '2026-06-27 15:00:00+09', 24, 30000),
  (3, 'rigoletto', 'III', 'Rigoletto',          '리골레토',     'Giuseppe Verdi',          '권력과 욕망이 만들어낸 비극',     '2026-07-04 15:00:00+09', 24, 30000),
  (4, 'carmen',    'IV',  'Carmen',             '카르멘',       'Georges Bizet',           '열정과 자유, 그리고 파멸의 서사', '2026-07-11 15:00:00+09', 24, 30000)
on conflict (id) do update set
  code          = excluded.code,
  roman_numeral = excluded.roman_numeral,
  title_latin   = excluded.title_latin,
  title_ko      = excluded.title_ko,
  composer      = excluded.composer,
  tagline       = excluded.tagline,
  scheduled_at  = excluded.scheduled_at,
  capacity      = excluded.capacity,
  price         = excluded.price;

-- 운영 설정 싱글톤 — 실제 계좌번호는 운영자가 관리자 페이지에서 갱신 (PRD §10).
insert into opera_humanitas.settings
  (id, hold_hours, bank_name, account_number, account_holder)
values
  (1, 48, '신한은행', '110-XXX-XXX-XXX', '박경준')
on conflict (id) do nothing;
