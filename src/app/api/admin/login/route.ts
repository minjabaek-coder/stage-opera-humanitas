import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import {
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_MAX_AGE,
  signAdminToken,
} from "@/lib/auth/admin";

// PRD §5.2 — POST /api/admin/login
// password === process.env.ADMIN_PASSWORD 검증 → HttpOnly JWT 쿠키 12h.
// 비밀번호 비교는 timing-safe (운영 비밀번호의 길이 누설 방지를 위해 동일 길이 패딩 후 비교).

export const runtime = "nodejs";

const LoginSchema = z.object({
  password: z.string().min(1).max(200),
});

function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  // 길이를 맞춰서 비교 (다르면 어차피 false). max 길이로 패딩하면 길이 차이가 timing 으로 새지 않음.
  const len = Math.max(ab.length, bb.length);
  const ap = Buffer.alloc(len);
  const bp = Buffer.alloc(len);
  ab.copy(ap);
  bb.copy(bp);
  const equal = timingSafeEqual(ap, bp);
  return equal && ab.length === bb.length;
}

export async function POST(request: Request) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return NextResponse.json(
      { error: { code: "ADMIN_NOT_CONFIGURED", message: "관리자 비밀번호가 설정되지 않았습니다." } },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_JSON", message: "잘못된 요청 본문입니다." } },
      { status: 400 },
    );
  }

  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "비밀번호를 입력해주세요." } },
      { status: 400 },
    );
  }

  if (!constantTimeEqual(parsed.data.password, adminPassword)) {
    return NextResponse.json(
      { error: { code: "INVALID_CREDENTIALS", message: "비밀번호가 일치하지 않습니다." } },
      { status: 401 },
    );
  }

  const token = await signAdminToken();
  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE,
  });
  return response;
}
