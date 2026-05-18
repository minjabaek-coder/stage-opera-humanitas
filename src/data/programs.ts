export type ProgramCode = "figaro" | "boheme" | "rigoletto" | "carmen";

export type Program = {
  id: 1 | 2 | 3 | 4;
  code: ProgramCode;
  romanNumeral: "I" | "II" | "III" | "IV";
  composer: string;
  titleLatin: string;
  titleKo: string;
  tagline: string;
  subtitle: string;
  dateLabel: string;
  dateIso: string;
  capacity: 24;
  price: 30000;
};

export type ProgramAvailability = {
  programId: Program["id"];
  availableCount: number;
  isSoldOut: boolean;
};

export const PROGRAMS: readonly Program[] = [
  {
    id: 1,
    code: "figaro",
    romanNumeral: "I",
    composer: "Wolfgang Amadeus Mozart",
    titleLatin: "Le nozze di Figaro",
    titleKo: "피가로의 결혼 — 사랑과 계급, 혁명을 웃음으로 뒤집다",
    tagline: "사랑과 계급, 혁명을 웃음으로 뒤집다",
    subtitle: "왜 모차르트는 가장 정치적인 이야기를 가장 가벼운 노래로 썼는가.",
    dateLabel: "2026 · 06 · 20",
    dateIso: "2026-06-20T15:00:00+09:00",
    capacity: 24,
    price: 30000,
  },
  {
    id: 2,
    code: "boheme",
    romanNumeral: "II",
    composer: "Giacomo Puccini",
    titleLatin: "La bohème",
    titleKo: "라보엠 — 청춘은 왜 가장 찬란한 순간에 아픈가",
    tagline: "청춘은 왜 가장 찬란한 순간에 아픈가",
    subtitle: "파리의 다락방, 식어가는 손, 그리고 끝내 부르지 못한 이름들.",
    dateLabel: "2026 · 06 · 27",
    dateIso: "2026-06-27T15:00:00+09:00",
    capacity: 24,
    price: 30000,
  },
  {
    id: 3,
    code: "rigoletto",
    romanNumeral: "III",
    composer: "Giuseppe Verdi",
    titleLatin: "Rigoletto",
    titleKo: "리골레토 — 권력과 욕망이 만들어낸 비극",
    tagline: "권력과 욕망이 만들어낸 비극",
    subtitle: "광대의 가면 뒤, 아버지의 얼굴. 박경준이 실제 노래한 그 역할.",
    dateLabel: "2026 · 07 · 04",
    dateIso: "2026-07-04T15:00:00+09:00",
    capacity: 24,
    price: 30000,
  },
  {
    id: 4,
    code: "carmen",
    romanNumeral: "IV",
    composer: "Georges Bizet",
    titleLatin: "Carmen",
    titleKo: "카르멘 — 열정과 자유, 그리고 파멸의 서사",
    tagline: "열정과 자유, 그리고 파멸의 서사",
    subtitle: "사랑은 자유로워야 한다 — 그 한 문장을 위해 끝까지 간 여자의 노래.",
    dateLabel: "2026 · 07 · 11",
    dateIso: "2026-07-11T15:00:00+09:00",
    capacity: 24,
    price: 30000,
  },
] as const;

import { getAnonClient } from "@/lib/supabase/anon";

type AvailabilityRow = {
  id: Program["id"];
  available_count: number;
  is_sold_out: boolean;
};

function fullAvailability(): ProgramAvailability[] {
  return PROGRAMS.map((p) => ({
    programId: p.id,
    availableCount: p.capacity,
    isSoldOut: false,
  }));
}

export async function getProgramAvailability(): Promise<ProgramAvailability[]> {
  const supabase = getAnonClient();
  if (!supabase) {
    // env 미설정(개발 초기) 시 정원 가득 찬 상태로 fallback — 랜딩은 계속 동작.
    return fullAvailability();
  }

  const { data, error } = await supabase
    .from("program_availability")
    .select("id, available_count, is_sold_out")
    .returns<AvailabilityRow[]>();

  if (error || !data) {
    console.error("[programs] program_availability query failed", error);
    return fullAvailability();
  }

  const byId = new Map(data.map((row) => [row.id, row]));
  return PROGRAMS.map((p) => {
    const row = byId.get(p.id);
    if (!row) {
      return { programId: p.id, availableCount: p.capacity, isSoldOut: false };
    }
    return {
      programId: p.id,
      availableCount: Math.max(0, row.available_count),
      isSoldOut: row.is_sold_out,
    };
  });
}
