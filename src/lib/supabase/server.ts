import "server-only";

import { createClient } from "@supabase/supabase-js";

import { OPERA_SCHEMA, type OperaClient } from "./anon";

// service_role 키는 절대 브라우저로 새어나가면 안 된다. 'server-only' import가 클라이언트 번들에 들어가면 빌드 타임에 fail.
// 관리자 라우트와 cron 라우트에서만 호출.

let cached: OperaClient | null = null;

export function getServiceClient(): OperaClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Supabase service client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. " +
        "Add them to .env.local before calling getServiceClient().",
    );
  }

  cached = createClient(url, serviceKey, {
    db: { schema: OPERA_SCHEMA },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return cached;
}
