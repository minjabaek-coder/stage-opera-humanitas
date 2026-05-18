import { NextResponse, type NextRequest } from "next/server";

import { ADMIN_COOKIE_NAME, verifyAdminToken } from "@/lib/auth/admin";

// PRD §6.2 의 `middleware.ts` 는 Next.js 16 에서 `proxy.ts` 로 이름 변경됨 (ADR-008).
// 역할: /admin/* (UI) 및 /api/admin/* (API) 보호.
// 통과: /admin (로그인 페이지) 및 /api/admin/login (인증 진입점) 은 토큰 없이도 접근 허용.
// 인증된 상태로 /admin 에 진입하면 /admin/dashboard 로 redirect.

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 인증 진입점: 항상 통과
  if (pathname === "/api/admin/login") {
    return NextResponse.next();
  }

  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const authenticated = await verifyAdminToken(token);

  // 로그인 페이지: 이미 인증된 경우 대시보드로 보냄, 아니면 통과
  if (pathname === "/admin") {
    if (authenticated) {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (authenticated) {
    return NextResponse.next();
  }

  // 미인증 — API 는 401 JSON, 페이지는 /admin 으로 redirect
  if (pathname.startsWith("/api/admin")) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "관리자 인증이 필요합니다." } },
      { status: 401 },
    );
  }
  return NextResponse.redirect(new URL("/admin", request.url));
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
