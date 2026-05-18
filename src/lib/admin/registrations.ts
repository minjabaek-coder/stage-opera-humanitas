import "server-only";

import { getServiceClient } from "@/lib/supabase/server";
import type { RegistrationsListQuery } from "@/lib/validation/admin";

// PRD §3.6 / §5.2 — 신청 목록 조회 공통 헬퍼.
// /admin/registrations 페이지(서버 컴포넌트) 와 /api/admin/registrations route 가 같은 로직을 공유.
// q 는 reserved characters 가 들어가면 PostgREST `or` 표현식 파싱이 깨지므로 strip.

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
  consent_privacy?: boolean;
  consent_refund?: boolean;
  consent_marketing?: boolean;
  registration_items: ItemRow[] | null;
};

export type RegistrationListItem = {
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
  consent_privacy?: boolean;
  consent_refund?: boolean;
  consent_marketing?: boolean;
  programs: string[];
};

export type RegistrationsListResult = {
  items: RegistrationListItem[];
  total: number;
  page: number;
  page_size: number;
};

const BASE_SELECT =
  "id, reference_no, name, phone, email, depositor_name, source, message, " +
  "total_amount, status, cancel_reason, expires_at, confirmed_at, cancelled_at, created_at, " +
  "registration_items(program_id, programs(roman_numeral))";

const DETAIL_SELECT =
  BASE_SELECT + ", consent_privacy, consent_refund, consent_marketing";

function mapRow(r: RegistrationRow): RegistrationListItem {
  return {
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
    consent_privacy: r.consent_privacy,
    consent_refund: r.consent_refund,
    consent_marketing: r.consent_marketing,
    programs: (r.registration_items ?? [])
      .slice()
      .sort((a, b) => a.program_id - b.program_id)
      .map((it) => it.programs?.roman_numeral)
      .filter((v): v is string => Boolean(v)),
  };
}

export async function listRegistrations(
  query: RegistrationsListQuery,
  options: { detail?: boolean } = {},
): Promise<RegistrationsListResult> {
  const { status, program, q, page, page_size } = query;
  const supabase = getServiceClient();
  const select = options.detail ? DETAIL_SELECT : BASE_SELECT;

  // program 필터: registration_items 에서 program_id 매칭하는 registration_id 목록을 먼저 수집.
  // 그래야 items 임베드 시 해당 신청의 *모든* 회차가 그대로 따라온다.
  let restrictIds: string[] | null = null;
  if (program) {
    const { data: itemRows, error } = await supabase
      .from("registration_items")
      .select("registration_id")
      .eq("program_id", program);
    if (error) {
      throw new Error(`회차 prefilter 실패: ${error.message}`);
    }
    restrictIds = Array.from(
      new Set((itemRows ?? []).map((r) => r.registration_id as string)),
    );
    if (restrictIds.length === 0) {
      return { items: [], total: 0, page, page_size };
    }
  }

  const from = (page - 1) * page_size;
  const to = from + page_size - 1;

  let q1 = supabase
    .from("registrations")
    .select(select, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (status !== "all") q1 = q1.eq("status", status);
  if (restrictIds) q1 = q1.in("id", restrictIds);

  const safeQ = q?.replace(/[%_,():*"\\]/g, "").trim();
  if (safeQ) {
    const like = `%${safeQ}%`;
    q1 = q1.or(
      `name.ilike.${like},phone.ilike.${like},email.ilike.${like},reference_no.ilike.${like}`,
    );
  }

  const { data, error, count } = await q1;
  if (error) {
    throw new Error(`registrations 조회 실패: ${error.message}`);
  }

  const items = ((data ?? []) as unknown as RegistrationRow[]).map(mapRow);

  return { items, total: count ?? items.length, page, page_size };
}
