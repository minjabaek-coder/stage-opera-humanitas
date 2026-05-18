import { NextResponse } from "next/server";
import { z } from "zod";

import { recordAdminAction } from "@/lib/audit";
import { getServiceClient } from "@/lib/supabase/server";
import { ProgramUpdateSchema } from "@/lib/validation/admin";

// PRD §3.7 — 회차별 정원 편집.
// PRD §5.2 가 통합 settings 라우트만 명시했으나, settings(singleton) 와 programs(per-row) 는
// 데이터 모델상 분리돼 있어 라우트도 분리 (별도 ADR 필요 없는 자연 분기).
//
// 가드: 현재 활성 좌석(confirmed + active pending) 보다 작은 capacity 로 줄일 수 없음.

export const runtime = "nodejs";

const IdSchema = z.coerce.number().int().min(1).max(4);

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await params;
  const idResult = IdSchema.safeParse(rawId);
  if (!idResult.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "잘못된 회차 ID 입니다. (1~4)" } },
      { status: 400 },
    );
  }
  const programId = idResult.data;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_JSON", message: "잘못된 요청 본문입니다." } },
      { status: 400 },
    );
  }

  const parsed = ProgramUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION",
          message: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요.",
        },
      },
      { status: 400 },
    );
  }
  const { capacity } = parsed.data;

  const supabase = getServiceClient();

  const { data: before, error: readError } = await supabase
    .from("programs")
    .select("id, roman_numeral, title_ko, capacity")
    .eq("id", programId)
    .maybeSingle();
  if (readError) {
    console.error("[PUT /api/admin/programs/:id] read", readError);
    return NextResponse.json(
      { error: { code: "DB_ERROR", message: readError.message } },
      { status: 500 },
    );
  }
  if (!before) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "회차를 찾을 수 없습니다." } },
      { status: 404 },
    );
  }

  const { data: availability, error: availError } = await supabase
    .from("program_availability")
    .select("confirmed_count, pending_count")
    .eq("id", programId)
    .maybeSingle();
  if (availError || !availability) {
    console.error("[PUT /api/admin/programs/:id] availability", availError);
    return NextResponse.json(
      { error: { code: "DB_ERROR", message: availError?.message ?? "잔여 좌석 조회 실패" } },
      { status: 500 },
    );
  }
  const active = (availability.confirmed_count ?? 0) + (availability.pending_count ?? 0);
  if (capacity < active) {
    return NextResponse.json(
      {
        error: {
          code: "CAPACITY_TOO_LOW",
          message: `현재 활성 좌석(${active}석)보다 적은 정원으로는 줄일 수 없습니다.`,
        },
      },
      { status: 400 },
    );
  }

  const { data: after, error: updateError } = await supabase
    .from("programs")
    .update({ capacity })
    .eq("id", programId)
    .select("id, roman_numeral, title_ko, capacity")
    .maybeSingle();
  if (updateError || !after) {
    console.error("[PUT /api/admin/programs/:id] update", updateError);
    return NextResponse.json(
      { error: { code: "DB_ERROR", message: updateError?.message ?? "정원 갱신 실패" } },
      { status: 500 },
    );
  }

  await recordAdminAction({
    action: "update_program",
    target_id: String(programId),
    payload: {
      roman_numeral: before.roman_numeral,
      before_capacity: before.capacity,
      after_capacity: after.capacity,
      active_at_change: active,
    },
  });

  return NextResponse.json(after);
}
