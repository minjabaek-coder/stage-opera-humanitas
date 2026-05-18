import { NextResponse } from "next/server";

import { getServiceClient } from "@/lib/supabase/server";

// PRD §5.1 — GET /api/registrations/[id]
// 완료 페이지 표시용. UUID 자체가 비공개 토큰 역할이므로 별도 인증 불요.
// registrations는 RLS로 anon 차단 → service_role 사용.

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ProgramEmbed = {
  id: number;
  roman_numeral: string;
  title_latin: string;
  title_ko: string;
  scheduled_at: string;
  price: number;
};

type RegistrationRow = {
  id: string;
  reference_no: string;
  name: string;
  phone: string;
  email: string;
  depositor_name: string;
  total_amount: number;
  status: "pending" | "confirmed" | "cancelled";
  expires_at: string;
  registration_items: Array<{
    price_snapshot: number;
    programs: ProgramEmbed | null;
  }>;
};

type SettingsRow = {
  bank_name: string;
  account_number: string;
  account_holder: string;
};

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json(
      { error: { code: "BAD_ID", message: "잘못된 신청 ID 형식입니다." } },
      { status: 400 },
    );
  }

  let supabase;
  try {
    supabase = getServiceClient();
  } catch (e) {
    return NextResponse.json(
      {
        error: {
          code: "DB_NOT_CONFIGURED",
          message: e instanceof Error ? e.message : "Supabase 설정 미완료",
        },
      },
      { status: 503 },
    );
  }

  const [regRes, settingsRes] = await Promise.all([
    supabase
      .from("registrations")
      .select(
        `id, reference_no, name, phone, email, depositor_name,
         total_amount, status, expires_at,
         registration_items (
           price_snapshot,
           programs ( id, roman_numeral, title_latin, title_ko, scheduled_at, price )
         )`,
      )
      .eq("id", id)
      .single<RegistrationRow>(),
    supabase
      .from("settings")
      .select("bank_name, account_number, account_holder")
      .eq("id", 1)
      .single<SettingsRow>(),
  ]);

  if (regRes.error || !regRes.data) {
    // PostgREST: 'PGRST116' = no rows. 404로 매핑.
    const status = regRes.error?.code === "PGRST116" ? 404 : 500;
    return NextResponse.json(
      {
        error: {
          code: status === 404 ? "NOT_FOUND" : "FETCH_FAILED",
          message: status === 404 ? "신청 내역을 찾을 수 없습니다." : regRes.error?.message ?? "조회 실패",
        },
      },
      { status },
    );
  }

  if (settingsRes.error || !settingsRes.data) {
    return NextResponse.json(
      { error: { code: "FETCH_FAILED", message: settingsRes.error?.message ?? "설정 조회 실패" } },
      { status: 500 },
    );
  }

  const reg = regRes.data;
  const programs = reg.registration_items
    .map((item) => item.programs)
    .filter((p): p is ProgramEmbed => p !== null)
    .sort((a, b) => a.id - b.id);

  return NextResponse.json({
    reference_no: reg.reference_no,
    name: reg.name,
    phone: reg.phone,
    email: reg.email,
    depositor_name: reg.depositor_name,
    total_amount: reg.total_amount,
    status: reg.status,
    expires_at: reg.expires_at,
    programs,
    bank_info: settingsRes.data,
  });
}
