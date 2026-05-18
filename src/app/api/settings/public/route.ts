import { NextResponse } from "next/server";

import { getAnonClient } from "@/lib/supabase/anon";

// PRD §5.1 — GET /api/settings/public
// 신청·완료 페이지에서 사용하는 공개 운영 정보. private 컬럼은 노출하지 않는다.

type PublicSettings = {
  hold_hours: number;
  bank_name: string;
  account_number: string;
  account_holder: string;
};

export async function GET() {
  const supabase = getAnonClient();
  if (!supabase) {
    return NextResponse.json(
      { error: { code: "DB_NOT_CONFIGURED", message: "Supabase 환경변수가 설정되지 않았습니다." } },
      { status: 503 },
    );
  }

  const { data, error } = await supabase
    .from("settings")
    .select("hold_hours, bank_name, account_number, account_holder")
    .eq("id", 1)
    .single<PublicSettings>();

  if (error || !data) {
    return NextResponse.json(
      { error: { code: "FETCH_FAILED", message: error?.message ?? "설정을 불러오지 못했습니다." } },
      { status: 500 },
    );
  }

  return NextResponse.json(data);
}
