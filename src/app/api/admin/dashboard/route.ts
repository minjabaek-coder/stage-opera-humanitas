import { NextResponse } from "next/server";

import { getDashboardData } from "@/lib/admin/dashboard";

// PRD §5.2 — GET /api/admin/dashboard
// 같은 페이로드를 /admin/dashboard 서버 컴포넌트도 직접 사용하므로 헬퍼로 분리(lib/admin/dashboard.ts).

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getDashboardData();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[GET /api/admin/dashboard]", error);
    const message = error instanceof Error ? error.message : "조회에 실패했습니다.";
    return NextResponse.json(
      { error: { code: "DB_ERROR", message } },
      { status: 500 },
    );
  }
}
