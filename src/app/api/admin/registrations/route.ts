import { NextResponse } from "next/server";

import { listRegistrations } from "@/lib/admin/registrations";
import { RegistrationsListQuerySchema } from "@/lib/validation/admin";

// PRD §5.2 — GET /api/admin/registrations
// status / program / q / page / page_size 필터.
// 실제 쿼리 로직은 src/lib/admin/registrations.ts 의 listRegistrations() 가 담당.
// /admin/registrations 페이지에서도 동일 헬퍼를 직접 호출한다.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = RegistrationsListQuerySchema.safeParse({
    status: url.searchParams.get("status") ?? undefined,
    program: url.searchParams.get("program") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
    page_size: url.searchParams.get("page_size") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "잘못된 검색 조건입니다." } },
      { status: 400 },
    );
  }

  try {
    const result = await listRegistrations(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[GET /api/admin/registrations]", error);
    const message = error instanceof Error ? error.message : "조회에 실패했습니다.";
    return NextResponse.json(
      { error: { code: "DB_ERROR", message } },
      { status: 500 },
    );
  }
}
