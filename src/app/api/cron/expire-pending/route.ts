import { NextResponse } from "next/server";

import { getServiceClient } from "@/lib/supabase/server";

// PRD §5.3 — Vercel Cron 호출 (현재 daily KST 03:00, ADR-009).
// Authorization: Bearer ${CRON_SECRET} 검증 후 opera_humanitas.expire_pending_registrations() 실행.
// 함수는 만료된 pending 을 cancelled('expired') 로 일괄 전환하고 row_count 를 반환한다.
//
// HTTP 메서드는 GET — Vercel Cron 은 항상 GET 으로 트리거한다
// (https://vercel.com/docs/cron-jobs). PRD §5.3 는 POST 로 기술되어 있지만 Vercel
// 구현과 어긋나서 405 가 떨어진다. 수동 호출도 GET 으로 통일.
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

export async function GET(request: Request) {
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
  // Vercel Logs → Runtime Logs 에서 매 호출 결과를 확인할 수 있도록 박제.
  // (Function 로그는 status/duration 만 남고 응답 body 는 안 남기므로 별도 필요.)
  console.log(`[cron/expire-pending] expired_count=${expired_count}`);
  return NextResponse.json({ expired_count });
}
