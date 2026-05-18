import { NextResponse } from "next/server";
import { z } from "zod";

import { recordAdminAction } from "@/lib/audit";
import { getServiceClient } from "@/lib/supabase/server";
import { CancelBodySchema } from "@/lib/validation/admin";

// PRD §5.2 — POST /api/admin/registrations/[id]/cancel
// 어떤 상태에서도 cancelled 전환 가능. cancel_reason 에 "admin: <사유>" 기록.

export const runtime = "nodejs";

const IdSchema = z.string().uuid();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!IdSchema.safeParse(id).success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "잘못된 신청 ID 입니다." } },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_JSON", message: "잘못된 요청 본문입니다." } },
      { status: 400 },
    );
  }

  const parsed = CancelBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION",
          message: parsed.error.issues[0]?.message ?? "취소 사유를 확인해주세요.",
        },
      },
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
    console.error("[cancel] read", readError);
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
  if (before.status === "cancelled") {
    return NextResponse.json(
      { error: { code: "INVALID_STATE", message: "이미 취소된 신청입니다." } },
      { status: 409 },
    );
  }

  const nowIso = new Date().toISOString();
  const cancelReason = `admin: ${parsed.data.reason}`;

  const { data: updated, error: updateError } = await supabase
    .from("registrations")
    .update({
      status: "cancelled",
      cancel_reason: cancelReason,
      cancelled_at: nowIso,
    })
    .eq("id", id)
    .neq("status", "cancelled")
    .select("id, status, cancelled_at")
    .maybeSingle();
  if (updateError) {
    console.error("[cancel] update", updateError);
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
    action: "cancel",
    target_id: id,
    payload: {
      reference_no: before.reference_no,
      from: before.status,
      to: "cancelled",
      reason: cancelReason,
      cancelled_at: nowIso,
    },
  });

  return NextResponse.json({ success: true, status: "cancelled" });
}
