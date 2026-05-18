import { NextResponse } from "next/server";

import { getAnonClient } from "@/lib/supabase/anon";

// PRD §5.1 — GET /api/programs
// programs 테이블 + program_availability 뷰를 병합해 응답.
// env 미설정 또는 DB 오류 시 503.

type ProgramRow = {
  id: number;
  code: string;
  roman_numeral: string;
  title_latin: string;
  title_ko: string;
  composer: string;
  tagline: string | null;
  scheduled_at: string;
  capacity: number;
  price: number;
};

type AvailabilityRow = {
  id: number;
  available_count: number;
  is_sold_out: boolean;
  confirmed_count: number;
  pending_count: number;
};

export async function GET() {
  const supabase = getAnonClient();
  if (!supabase) {
    return NextResponse.json(
      { error: { code: "DB_NOT_CONFIGURED", message: "Supabase 환경변수가 설정되지 않았습니다." } },
      { status: 503 },
    );
  }

  const [{ data: programs, error: pErr }, { data: avail, error: aErr }] = await Promise.all([
    supabase
      .from("programs")
      .select("id, code, roman_numeral, title_latin, title_ko, composer, tagline, scheduled_at, capacity, price")
      .order("id")
      .returns<ProgramRow[]>(),
    supabase
      .from("program_availability")
      .select("id, available_count, is_sold_out, confirmed_count, pending_count")
      .returns<AvailabilityRow[]>(),
  ]);

  if (pErr || aErr || !programs || !avail) {
    return NextResponse.json(
      {
        error: {
          code: "FETCH_FAILED",
          message: pErr?.message ?? aErr?.message ?? "회차 정보를 불러오지 못했습니다.",
        },
      },
      { status: 500 },
    );
  }

  const availById = new Map(avail.map((row) => [row.id, row]));
  const merged = programs.map((p) => {
    const a = availById.get(p.id);
    return {
      ...p,
      available_count: Math.max(0, a?.available_count ?? p.capacity),
      is_sold_out: a?.is_sold_out ?? false,
    };
  });

  return NextResponse.json({ programs: merged });
}
