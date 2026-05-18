import { NextResponse } from "next/server";

import { getAnonClient } from "@/lib/supabase/anon";
import { RegistrationInputSchema } from "@/lib/validation/registration";

// PRD §5.1 — POST /api/registrations
// Zod 검증 → create_registration RPC → SOLD_OUT/DUPLICATE 분기.
// RLS는 RPC가 security definer 라 우회. anon 클라이언트로 호출 가능.

type CreateRegistrationResult = {
  id: string;
  reference_no: string;
  total_amount: number;
  expires_at: string;
};

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_JSON", message: "잘못된 요청 본문입니다." } },
      { status: 400 },
    );
  }

  const parsed = RegistrationInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION",
          message: "입력값을 확인해주세요.",
          fields: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
      },
      { status: 400 },
    );
  }

  const supabase = getAnonClient();
  if (!supabase) {
    return NextResponse.json(
      { error: { code: "DB_NOT_CONFIGURED", message: "Supabase 환경변수가 설정되지 않았습니다." } },
      { status: 503 },
    );
  }

  const v = parsed.data;
  const { data, error } = await supabase
    .rpc("create_registration", {
      p_name: v.name,
      p_phone: v.phone,
      p_email: v.email,
      p_depositor_name: v.depositor_name,
      p_source: v.source ?? null,
      p_message: v.message ?? null,
      p_program_ids: v.program_ids,
      p_consent_privacy: v.consent_privacy,
      p_consent_refund: v.consent_refund,
      p_consent_marketing: v.consent_marketing,
    })
    .returns<CreateRegistrationResult[]>();

  if (error) {
    // SQLSTATE 분기. RAISE EXCEPTION ... USING errcode = 'OH001'/'OH002' 매핑.
    if (error.code === "OH001") {
      return NextResponse.json(
        { error: { code: "SOLD_OUT", message: "선택하신 회차가 매진되었습니다. 페이지를 새로고침하고 다시 확인해주세요." } },
        { status: 409 },
      );
    }
    if (error.code === "OH002") {
      return NextResponse.json(
        {
          error: {
            code: "DUPLICATE",
            message: "동일한 이메일 또는 전화번호로 이미 신청된 회차가 있습니다.",
          },
        },
        { status: 409 },
      );
    }

    console.error("[POST /api/registrations] RPC failure", error);
    return NextResponse.json(
      { error: { code: "RPC_FAILED", message: error.message } },
      { status: 500 },
    );
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return NextResponse.json(
      { error: { code: "RPC_FAILED", message: "신청 결과를 받지 못했습니다." } },
      { status: 500 },
    );
  }

  return NextResponse.json(row, { status: 201 });
}
