import { getServiceClient } from "@/lib/supabase/server";

// PRD §5.2 — GET /api/admin/registrations/export
// UTF-8 BOM CSV. Excel 에서 한글 깨짐 방지를 위해 0xFEFF prefix.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ItemRow = {
  program_id: number;
  programs: { roman_numeral: string } | null;
};

type Row = {
  reference_no: string;
  created_at: string;
  name: string;
  phone: string;
  email: string;
  depositor_name: string;
  total_amount: number;
  status: string;
  expires_at: string;
  confirmed_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  source: string | null;
  message: string | null;
  consent_privacy: boolean;
  consent_refund: boolean;
  consent_marketing: boolean;
  registration_items: ItemRow[] | null;
};

const STATUS_KO: Record<string, string> = {
  pending: "임시예약",
  confirmed: "확정",
  cancelled: "취소",
};

const KST = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  // ko-KR + hour12:false 는 hourCycle 을 h24 로 override (자정=24:00). hourCycle:"h23" 만 명시.
  hourCycle: "h23",
});

function fmtKst(iso: string | null): string {
  if (!iso) return "";
  // ko-KR 출력: "2026. 05. 18. 14:32" → 보기 좋은 단일 형식으로 정규화
  return KST.format(new Date(iso)).replace(/\.\s/g, "-").replace(/-$/, "");
}

function csvEscape(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET() {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("registrations")
    .select(
      "reference_no, created_at, name, phone, email, depositor_name, total_amount, status, " +
        "expires_at, confirmed_at, cancelled_at, cancel_reason, source, message, " +
        "consent_privacy, consent_refund, consent_marketing, " +
        "registration_items(program_id, programs(roman_numeral))",
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[GET /api/admin/registrations/export]", error);
    return new Response(
      JSON.stringify({ error: { code: "DB_ERROR", message: error.message } }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const headers = [
    "접수번호",
    "신청일시(KST)",
    "이름",
    "전화",
    "이메일",
    "입금자명",
    "회차",
    "금액",
    "상태",
    "입금기한(KST)",
    "확정시각(KST)",
    "취소시각(KST)",
    "취소사유",
    "알게된경로",
    "한마디",
    "개인정보동의",
    "환불약관동의",
    "마케팅수신동의",
  ];

  const rows = ((data ?? []) as unknown as Row[]).map((r) => {
    const programs = (r.registration_items ?? [])
      .slice()
      .sort((a, b) => a.program_id - b.program_id)
      .map((it) => it.programs?.roman_numeral)
      .filter(Boolean)
      .join(", ");
    return [
      r.reference_no,
      fmtKst(r.created_at),
      r.name,
      r.phone,
      r.email,
      r.depositor_name,
      programs,
      r.total_amount,
      STATUS_KO[r.status] ?? r.status,
      fmtKst(r.expires_at),
      fmtKst(r.confirmed_at),
      fmtKst(r.cancelled_at),
      r.cancel_reason ?? "",
      r.source ?? "",
      r.message ?? "",
      r.consent_privacy ? "Y" : "N",
      r.consent_refund ? "Y" : "N",
      r.consent_marketing ? "Y" : "N",
    ].map(csvEscape).join(",");
  });

  const csv = "﻿" + [headers.map(csvEscape).join(","), ...rows].join("\r\n");

  const yyyymmdd = new Date()
    .toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" })
    .replace(/-/g, "");
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="opera-humanitas-registrations-${yyyymmdd}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
