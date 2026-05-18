import { NextResponse } from "next/server";

import { getServiceClient } from "@/lib/supabase/server";

// PRD §5.2 — GET /api/admin/dashboard
// - 회차별 (id, title_ko, roman_numeral, capacity, confirmed, pending, available)
// - pending_count: 전체 활성(만료 전) pending 신청 건수
// - expiring_soon_count: 6시간 내 만료 예정 pending (PRD §3.5)

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AvailabilityRow = {
  id: number;
  roman_numeral: string;
  title_ko: string;
  capacity: number;
  confirmed_count: number;
  pending_count: number;
  available_count: number;
};

export async function GET() {
  const supabase = getServiceClient();
  const now = new Date();
  const soonIso = new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString();
  const nowIso = now.toISOString();

  const [availability, pendingCount, expiringSoonCount] = await Promise.all([
    supabase
      .from("program_availability")
      .select("id, roman_numeral, title_ko, capacity, confirmed_count, pending_count, available_count")
      .order("id"),
    supabase
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .gt("expires_at", nowIso),
    supabase
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .gt("expires_at", nowIso)
      .lte("expires_at", soonIso),
  ]);

  if (availability.error) {
    console.error("[GET /api/admin/dashboard] availability", availability.error);
    return NextResponse.json(
      { error: { code: "DB_ERROR", message: availability.error.message } },
      { status: 500 },
    );
  }
  if (pendingCount.error || expiringSoonCount.error) {
    console.error(
      "[GET /api/admin/dashboard] counts",
      pendingCount.error ?? expiringSoonCount.error,
    );
    return NextResponse.json(
      { error: { code: "DB_ERROR", message: "카운트 조회에 실패했습니다." } },
      { status: 500 },
    );
  }

  const programs = ((availability.data ?? []) as AvailabilityRow[]).map((row) => ({
    id: row.id,
    roman_numeral: row.roman_numeral,
    title_ko: row.title_ko,
    capacity: row.capacity,
    confirmed: row.confirmed_count,
    pending: row.pending_count,
    available: row.available_count,
  }));

  return NextResponse.json({
    programs,
    pending_count: pendingCount.count ?? 0,
    expiring_soon_count: expiringSoonCount.count ?? 0,
  });
}
