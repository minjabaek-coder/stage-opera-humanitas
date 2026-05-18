import "server-only";

import { getServiceClient } from "@/lib/supabase/server";

// PRD §4.2 / §6 — 관리자 액션은 opera_humanitas.admin_audit_log 에 기록한다.
// 단일 비밀번호 인증이라 actor 구분은 없음. payload 에 변경 전후 데이터를 jsonb 로 담는다.
// 로깅 실패는 운영 액션의 성공/실패를 좌우하지 않게 throw 하지 않고 console.error 만 남긴다.

export type AdminAction =
  | "approve"
  | "cancel"
  | "revert"
  | "update_settings"
  | "update_program";

export async function recordAdminAction(input: {
  action: AdminAction;
  target_id: string;
  payload: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = getServiceClient();
    const { error } = await supabase.from("admin_audit_log").insert({
      action: input.action,
      target_id: input.target_id,
      payload: input.payload,
    });
    if (error) {
      console.error("[admin audit] insert failed", error);
    }
  } catch (err) {
    console.error("[admin audit] unexpected", err);
  }
}
