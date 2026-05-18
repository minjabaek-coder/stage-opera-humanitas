import { NextResponse } from "next/server";

import { ADMIN_COOKIE_NAME } from "@/lib/auth/admin";

// PRD §5.2 — POST /api/admin/logout : 쿠키 만료.

export const runtime = "nodejs";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return response;
}
