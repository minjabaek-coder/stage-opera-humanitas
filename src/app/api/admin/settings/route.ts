import { NextResponse } from "next/server";

import { recordAdminAction } from "@/lib/audit";
import { getServiceClient } from "@/lib/supabase/server";
import { SettingsUpdateSchema } from "@/lib/validation/admin";

// PRD §5.2 / §3.7 — settings 는 id=1 singleton.
// GET : 관리자 페이지 진입 시 현재 값. (PRD 명시 GET 은 없으나 PUT 응답 형식과 동일하게 자연 확장.)
// PUT : 부분 업데이트 + admin_audit_log.

export const runtime = "nodejs";

const COLUMNS = "id, hold_hours, bank_name, account_number, account_holder, updated_at";

export async function GET() {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("settings")
    .select(COLUMNS)
    .eq("id", 1)
    .maybeSingle();
  if (error) {
    console.error("[GET /api/admin/settings]", error);
    return NextResponse.json(
      { error: { code: "DB_ERROR", message: error.message } },
      { status: 500 },
    );
  }
  if (!data) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "settings row 가 없습니다. seed 가 적용됐는지 확인해주세요." } },
      { status: 404 },
    );
  }
  return NextResponse.json(data);
}

export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_JSON", message: "잘못된 요청 본문입니다." } },
      { status: 400 },
    );
  }

  const parsed = SettingsUpdateSchema.safeParse(body);
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

  const supabase = getServiceClient();

  const { data: before, error: readError } = await supabase
    .from("settings")
    .select(COLUMNS)
    .eq("id", 1)
    .maybeSingle();
  if (readError || !before) {
    console.error("[PUT /api/admin/settings] read", readError);
    return NextResponse.json(
      { error: { code: "DB_ERROR", message: readError?.message ?? "settings 조회 실패" } },
      { status: 500 },
    );
  }

  const { data: after, error: updateError } = await supabase
    .from("settings")
    .update(parsed.data)
    .eq("id", 1)
    .select(COLUMNS)
    .maybeSingle();
  if (updateError || !after) {
    console.error("[PUT /api/admin/settings] update", updateError);
    return NextResponse.json(
      { error: { code: "DB_ERROR", message: updateError?.message ?? "settings 갱신 실패" } },
      { status: 500 },
    );
  }

  await recordAdminAction({
    action: "update_settings",
    target_id: "1",
    payload: { before, after, changed_keys: Object.keys(parsed.data) },
  });

  return NextResponse.json(after);
}
