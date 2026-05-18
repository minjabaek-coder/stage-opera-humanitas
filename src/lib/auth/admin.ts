import { SignJWT, jwtVerify, type JWTPayload } from "jose";

// PRD §5.2 — 환경변수 비밀번호 단일 인증 + HttpOnly JWT 쿠키 12h.
// proxy.ts(Edge runtime)에서도 import 되므로 `server-only`/node 전용 API 사용 금지.
// `ADMIN_JWT_SECRET` 은 NEXT_PUBLIC_ 접두사가 없어 클라이언트 번들에서는 보이지 않는다.

export const ADMIN_COOKIE_NAME = "oh_admin_session";
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 12; // 12h, seconds
const ADMIN_JWT_ISS = "opera-humanitas";
const ADMIN_JWT_AUD = "admin";

let cachedSecret: Uint8Array | null = null;

function getJwtSecret(): Uint8Array {
  if (cachedSecret) return cachedSecret;
  const raw = process.env.ADMIN_JWT_SECRET;
  if (!raw || raw.length < 32) {
    throw new Error(
      "ADMIN_JWT_SECRET is missing or too short (need ≥32 chars). " +
        "Generate one with `openssl rand -base64 48` and set it in .env.local.",
    );
  }
  cachedSecret = new TextEncoder().encode(raw);
  return cachedSecret;
}

type AdminClaims = JWTPayload & { role: "admin" };

export async function signAdminToken(): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ADMIN_JWT_ISS)
    .setAudience(ADMIN_JWT_AUD)
    .setIssuedAt()
    .setExpirationTime(`${ADMIN_SESSION_MAX_AGE}s`)
    .sign(getJwtSecret());
}

export async function verifyAdminToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify<AdminClaims>(token, getJwtSecret(), {
      issuer: ADMIN_JWT_ISS,
      audience: ADMIN_JWT_AUD,
    });
    return payload.role === "admin";
  } catch {
    return false;
  }
}
