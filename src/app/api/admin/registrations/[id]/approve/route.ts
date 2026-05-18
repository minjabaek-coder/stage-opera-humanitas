import { NextResponse } from "next/server";
import { z } from "zod";

import { recordAdminAction } from "@/lib/audit";
import { getServiceClient } from "@/lib/supabase/server";

// PRD §5.2 — POST /api/admin/registrations/[id]/approve
// pending → confirmed (그 외 상태이면 409).

export const runtime = "nodejs";

const IdSchema = z.string().uuid();

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!IdSchema.safeParse(id).success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "잘못된 신청 ID 입니다." } },
      { status: 400 },
    );
  }

  const supabase = getServiceClient();

  const { data: before, error: readError } = await supabase
    .from("registrations")
    .select("id, status, reference_no")
    .eq("id", id)
    .maybeSingle();
  if (readError) {
    console.error("[approve] read", readError);
    return NextResponse.json(
      { error: { code: "DB_ERROR", message: readError.message } },
      { status: 500 },
    );
  }
  if (!before) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "신청을 찾을 수 없습니다." } },
      { status: 404 },
    );
  }
  if (before.status !== "pending") {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_STATE",
          message: `이미 ${before.status} 상태인 신청은 승인할 수 없습니다.`,
        },
      },
      { status: 409 },
    );
  }

  // race-safe: WHERE status='pending' 동반 — 다른 트랜잭션이 먼저 바꾸면 0 행 영향.
  const nowIso = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from("registrations")
    .update({ status: "confirmed", confirmed_at: nowIso })
    .eq("id", id)
    .eq("status", "pending")
    .select("id, status, confirmed_at")
    .maybeSingle();
  if (updateError) {
    console.error("[approve] update", updateError);
    return NextResponse.json(
      { error: { code: "DB_ERROR", message: updateError.message } },
      { status: 500 },
    );
  }
  if (!updated) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_STATE",
          message: "다른 사용자가 먼저 상태를 변경했습니다. 새로고침 후 다시 시도해주세요.",
        },
      },
      { status: 409 },
    );
  }

  await recordAdminAction({
    action: "approve",
    target_id: id,
    payload: {
      reference_no: before.reference_no,
      from: "pending",
      to: "confirmed",
      confirmed_at: nowIso,
    },
  });

  return NextResponse.json({ success: true, status: "confirmed" });
}
