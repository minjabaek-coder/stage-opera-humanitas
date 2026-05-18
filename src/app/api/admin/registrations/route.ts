import { NextResponse } from "next/server";

import { getServiceClient } from "@/lib/supabase/server";
import { RegistrationsListQuerySchema } from "@/lib/validation/admin";

// PRD §5.2 — GET /api/admin/registrations
// status / program / q / page / page_size 필터.
// q 는 name·phone·email·reference_no 에 OR ILIKE. PostgREST 의 `or` 표현식에서
// reserved characters (` , ( ) * : " \\ %  _ `) 는 그대로 두면 파싱이 깨지거나
// 의도치 않은 wildcard 가 되므로 strip 처리한다.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ItemRow = {
  program_id: number;
  programs: { roman_numeral: string } | null;
};

type RegistrationRow = {
  id: string;
  reference_no: string;
  name: string;
  phone: string;
  email: string;
  depositor_name: string;
  source: string | null;
  message: string | null;
  total_amount: number;
  status: string;
  cancel_reason: string | null;
  expires_at: string;
  confirmed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  registration_items: ItemRow[] | null;
};

const SELECT =
  "id, reference_no, name, phone, email, depositor_name, source, message, " +
  "total_amount, status, cancel_reason, expires_at, confirmed_at, cancelled_at, created_at, " +
  "registration_items(program_id, programs(roman_numeral))";

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

  const { status, program, q, page, page_size } = parsed.data;
  const supabase = getServiceClient();

  // program 필터: registration_items 에서 program_id 매칭하는 registration_id 목록을 먼저 수집.
  // 이렇게 해야 응답의 items 배열에 해당 신청의 *모든* 회차가 그대로 임베드된다.
  let restrictIds: string[] | null = null;
  if (program) {
    const { data: itemRows, error } = await supabase
      .from("registration_items")
      .select("registration_id")
      .eq("program_id", program);
    if (error) {
      console.error("[GET /api/admin/registrations] item prefilter", error);
      return NextResponse.json(
        { error: { code: "DB_ERROR", message: error.message } },
        { status: 500 },
      );
    }
    restrictIds = Array.from(
      new Set((itemRows ?? []).map((r) => r.registration_id as string)),
    );
    if (restrictIds.length === 0) {
      return NextResponse.json({ items: [], total: 0, page, page_size });
    }
  }

  const from = (page - 1) * page_size;
  const to = from + page_size - 1;

  let query = supabase
    .from("registrations")
    .select(SELECT, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (status !== "all") query = query.eq("status", status);
  if (restrictIds) query = query.in("id", restrictIds);

  const safeQ = q?.replace(/[%_,():*"\\]/g, "").trim();
  if (safeQ) {
    const like = `%${safeQ}%`;
    query = query.or(
      `name.ilike.${like},phone.ilike.${like},email.ilike.${like},reference_no.ilike.${like}`,
    );
  }

  const { data, error, count } = await query;
  if (error) {
    console.error("[GET /api/admin/registrations] main", error);
    return NextResponse.json(
      { error: { code: "DB_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  const items = ((data ?? []) as unknown as RegistrationRow[]).map((r) => ({
    id: r.id,
    reference_no: r.reference_no,
    name: r.name,
    phone: r.phone,
    email: r.email,
    depositor_name: r.depositor_name,
    source: r.source,
    message: r.message,
    total_amount: r.total_amount,
    status: r.status,
    cancel_reason: r.cancel_reason,
    expires_at: r.expires_at,
    confirmed_at: r.confirmed_at,
    cancelled_at: r.cancelled_at,
    created_at: r.created_at,
    programs: (r.registration_items ?? [])
      .slice()
      .sort((a, b) => a.program_id - b.program_id)
      .map((it) => it.programs?.roman_numeral)
      .filter((v): v is string => Boolean(v)),
  }));

  return NextResponse.json({
    items,
    total: count ?? items.length,
    page,
    page_size,
  });
}
