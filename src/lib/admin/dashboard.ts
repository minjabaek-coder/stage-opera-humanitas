import "server-only";

import { getServiceClient } from "@/lib/supabase/server";

// PRD §3.5 / §5.2 — 대시보드 데이터 조회 헬퍼.
// 같은 데이터를 페이지(서버 컴포넌트)와 API route 양쪽에서 쓰므로 한 곳에 둔다.

export type DashboardProgramRow = {
  id: number;
  roman_numeral: string;
  title_ko: string;
  capacity: number;
  confirmed: number;
  pending: number;
  available: number;
};

export type DashboardData = {
  programs: DashboardProgramRow[];
  pending_count: number;
  expiring_soon_count: number;
};

type AvailabilityRow = {
  id: number;
  roman_numeral: string;
  title_ko: string;
  capacity: number;
  confirmed_count: number;
  pending_count: number;
  available_count: number;
};

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = getServiceClient();
  const now = new Date();
  const nowIso = now.toISOString();
  const soonIso = new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString();

  const [availability, pendingCount, expiringSoonCount] = await Promise.all([
    supabase
      .from("program_availability")
      .select(
        "id, roman_numeral, title_ko, capacity, confirmed_count, pending_count, available_count",
      )
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
    throw new Error(`program_availability 조회 실패: ${availability.error.message}`);
  }
  if (pendingCount.error || expiringSoonCount.error) {
    throw new Error(
      `pending 카운트 조회 실패: ${(pendingCount.error ?? expiringSoonCount.error)?.message}`,
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

  return {
    programs,
    pending_count: pendingCount.count ?? 0,
    expiring_soon_count: expiringSoonCount.count ?? 0,
  };
}
