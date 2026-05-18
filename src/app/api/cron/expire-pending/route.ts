import { NextResponse } from "next/server";

import { getServiceClient } from "@/lib/supabase/server";

// PRD §5.3 — Vercel Cron 이 1시간마다 호출.
// Authorization: Bearer ${CRON_SECRET} 검증 후 opera_humanitas.expire_pending_registrations() 실행.
// 함수는 만료된 pending 을 cancelled('expired') 로 일괄 전환하고 row_count 를 반환한다.
//
// proxy.ts 의 matcher 는 /api/admin/* 만 가드하므로 이 라우트는 Bearer 검증으로 자체 보호한다.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json(
    { error: { code: "UNAUTHORIZED", message: "Bearer 토큰이 필요합니다." } },
    { status: 401 },
  );
}

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron/expire-pending] CRON_SECRET 미설정");
    return NextResponse.json(
      { error: { code: "MISCONFIGURED", message: "CRON_SECRET 환경변수가 설정되지 않았습니다." } },
      { status: 500 },
    );
  }

  const header = request.headers.get("authorization") ?? "";
  const prefix = "Bearer ";
  if (!header.startsWith(prefix)) return unauthorized();
  const token = header.slice(prefix.length).trim();
  // timing-safe 비교: 길이가 다르면 즉시 401, 같으면 const-time XOR.
  if (token.length !== secret.length) return unauthorized();
  let diff = 0;
  for (let i = 0; i < token.length; i++) {
    diff |= token.charCodeAt(i) ^ secret.charCodeAt(i);
  }
  if (diff !== 0) return unauthorized();

  const supabase = getServiceClient();
  const { data, error } = await supabase.rpc("expire_pending_registrations");
  if (error) {
    console.error("[cron/expire-pending] rpc", error);
    return NextResponse.json(
      { error: { code: "DB_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  // 함수가 scalar integer 를 반환 → supabase-js 는 그대로 number 로 받아온다.
  const expired_count = typeof data === "number" ? data : 0;
  return NextResponse.json({ expired_count });
}
