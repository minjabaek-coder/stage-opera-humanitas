import { NextResponse } from "next/server";
import { z } from "zod";

import { recordAdminAction } from "@/lib/audit";
import { getServiceClient } from "@/lib/supabase/server";

// POST /api/admin/registrations/[id]/revert
// confirmed → pending (실수 승인 복구) 또는 cancelled → pending (취소 철회).
// 새 expires_at 발급 + confirmed_at/cancelled_at/cancel_reason 초기화.
// cancelled → pending 시 좌석/중복 검증 → 매진/중복 시 409.

export const runtime = "nodejs";

const IdSchema = z.string().uuid();

type RevertResult = {
  id: string;
  status: string;
  expires_at: string;
};

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

  // before snapshot — audit log 와 status 확인용
  const { data: before, error: readError } = await supabase
    .from("registrations")
    .select("id, status, reference_no, cancel_reason, expires_at")
    .eq("id", id)
    .maybeSingle();
  if (readError) {
    console.error("[revert] read", readError);
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
  if (before.status === "pending") {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_STATE",
          message: "이미 임시예약 상태입니다.",
        },
      },
      { status: 409 },
    );
  }

  // supabase-js v2 의 RPC 타입 가드는 OperaClient<any> 환경에서 PG `RETURNS TABLE`
  // 와 array wrapper 사이 cast 를 거절한다 (LSP-level 오류만, 런타임은 정상).
  // 같은 RPC 패턴인 create_registration 은 anon 클라이언트라 통과되지만 service_role
  // 에서는 unknown 으로 한 번 우회한다. 도메인 모델 (RevertResult) 은 동일.
  const { data, error } = (await supabase.rpc("revert_registration_to_pending", {
    p_registration_id: id,
  })) as unknown as {
    data: RevertResult[] | RevertResult | null;
    error: { code?: string; message: string } | null;
  };

  if (error) {
    // SQLSTATE 분기 — 0005 migration 의 RAISE EXCEPTION ... USING errcode 매핑.
    if (error.code === "OH001") {
      return NextResponse.json(
        {
          error: {
            code: "SOLD_OUT",
            message:
              "해당 회차가 매진되어 임시예약으로 되돌릴 수 없습니다. 좌석을 회복하려면 다른 신청을 먼저 취소해주세요.",
          },
        },
        { status: 409 },
      );
    }
    if (error.code === "OH002") {
      return NextResponse.json(
        {
          error: {
            code: "DUPLICATE",
            message:
              "같은 회차에 동일한 이메일/전화번호의 활성 신청이 이미 있어 임시예약으로 되돌릴 수 없습니다.",
          },
        },
        { status: 409 },
      );
    }
    if (error.code === "OH003") {
      return NextResponse.json(
        { error: { code: "INVALID_STATE", message: "이미 임시예약 상태입니다." } },
        { status: 409 },
      );
    }
    if (error.code === "22023") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "신청 또는 회차 정보를 찾을 수 없습니다." } },
        { status: 404 },
      );
    }

    console.error("[revert] rpc", error);
    return NextResponse.json(
      { error: { code: "RPC_FAILED", message: error.message } },
      { status: 500 },
    );
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return NextResponse.json(
      { error: { code: "RPC_FAILED", message: "복귀 결과를 받지 못했습니다." } },
      { status: 500 },
    );
  }

  await recordAdminAction({
    action: "revert",
    target_id: id,
    payload: {
      reference_no: before.reference_no,
      from: before.status,
      to: "pending",
      previous_cancel_reason: before.cancel_reason,
      previous_expires_at: before.expires_at,
      new_expires_at: row.expires_at,
    },
  });

  return NextResponse.json({
    success: true,
    status: "pending",
    expires_at: row.expires_at,
  });
}
