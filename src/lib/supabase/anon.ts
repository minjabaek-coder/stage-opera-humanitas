import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const OPERA_SCHEMA = "opera_humanitas" as const;
// DB 타입 자동 생성 전까지 Database 제네릭은 any. supabase-gen 도입 시 교체.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type OperaClient = SupabaseClient<any, typeof OPERA_SCHEMA>;

// 모든 RPC/테이블 접근은 opera_humanitas 스키마로 향한다.
// 다른 서비스의 public 테이블과 격리하기 위한 ADR-007 결정.
let cached: OperaClient | null = null;

export function getAnonClient(): OperaClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  if (cached) return cached;
  cached = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    db: { schema: OPERA_SCHEMA },
    auth: { persistSession: false },
  });
  return cached;
}
