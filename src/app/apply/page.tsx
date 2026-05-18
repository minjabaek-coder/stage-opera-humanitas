import { getAnonClient } from "@/lib/supabase/anon";
import { ApplyClient, type ProgramForApply, type SettingsForApply } from "./ApplyClient";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ program?: string | string[] }>;

function parsePreselect(raw?: string | string[]): number[] {
  if (!raw) return [];
  const str = Array.isArray(raw) ? raw.join(",") : raw;
  return Array.from(
    new Set(
      str
        .split(",")
        .map((x) => parseInt(x.trim(), 10))
        .filter((n) => Number.isInteger(n) && n >= 1 && n <= 4),
    ),
  ).sort((a, b) => a - b);
}

const FALLBACK_PROGRAMS: ProgramForApply[] = [
  { id: 1, code: "figaro",    roman_numeral: "I",   title_latin: "Le nozze di Figaro", title_ko: "피가로의 결혼", composer: "Wolfgang Amadeus Mozart", scheduled_at: "2026-06-20T15:00:00+09:00", price: 30000, available_count: 24, is_sold_out: false },
  { id: 2, code: "boheme",    roman_numeral: "II",  title_latin: "La bohème",          title_ko: "라보엠",       composer: "Giacomo Puccini",         scheduled_at: "2026-06-27T15:00:00+09:00", price: 30000, available_count: 24, is_sold_out: false },
  { id: 3, code: "rigoletto", roman_numeral: "III", title_latin: "Rigoletto",          title_ko: "리골레토",     composer: "Giuseppe Verdi",          scheduled_at: "2026-07-04T15:00:00+09:00", price: 30000, available_count: 24, is_sold_out: false },
  { id: 4, code: "carmen",    roman_numeral: "IV",  title_latin: "Carmen",             title_ko: "카르멘",       composer: "Georges Bizet",           scheduled_at: "2026-07-11T15:00:00+09:00", price: 30000, available_count: 24, is_sold_out: false },
];

const FALLBACK_SETTINGS: SettingsForApply = {
  hold_hours: 48,
  bank_name: "신한은행",
  account_number: "110-XXX-XXX-XXX",
  account_holder: "박경준",
};

export default async function ApplyPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const preselectedIds = parsePreselect(params.program);

  const supabase = getAnonClient();
  if (!supabase) {
    return (
      <ApplyClient
        programs={FALLBACK_PROGRAMS}
        settings={FALLBACK_SETTINGS}
        preselectedIds={preselectedIds}
        dbReady={false}
      />
    );
  }

  const [pRes, aRes, sRes] = await Promise.all([
    supabase
      .from("programs")
      .select("id, code, roman_numeral, title_latin, title_ko, composer, scheduled_at, price")
      .order("id"),
    supabase
      .from("program_availability")
      .select("id, available_count, is_sold_out"),
    supabase
      .from("settings")
      .select("hold_hours, bank_name, account_number, account_holder")
      .eq("id", 1)
      .single<SettingsForApply>(),
  ]);

  if (pRes.error || aRes.error || !pRes.data || !aRes.data) {
    console.error("[apply] failed to load programs/availability", pRes.error ?? aRes.error);
    return (
      <ApplyClient
        programs={FALLBACK_PROGRAMS}
        settings={sRes.data ?? FALLBACK_SETTINGS}
        preselectedIds={preselectedIds}
        dbReady={false}
      />
    );
  }

  const availById = new Map(
    (aRes.data as Array<{ id: number; available_count: number; is_sold_out: boolean }>).map((a) => [a.id, a]),
  );
  const programs: ProgramForApply[] = (
    pRes.data as Array<Omit<ProgramForApply, "available_count" | "is_sold_out">>
  ).map((p) => {
    const a = availById.get(p.id);
    return {
      ...p,
      available_count: Math.max(0, a?.available_count ?? 24),
      is_sold_out: a?.is_sold_out ?? false,
    };
  });

  return (
    <ApplyClient
      programs={programs}
      settings={sRes.data ?? FALLBACK_SETTINGS}
      preselectedIds={preselectedIds}
      dbReady={true}
    />
  );
}
