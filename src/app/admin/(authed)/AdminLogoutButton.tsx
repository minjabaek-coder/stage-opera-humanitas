"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminLogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    if (pending) return;
    setPending(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch {
      // 네트워크 실패 시에도 클라이언트는 /admin 으로 이동 — proxy 가 다시 받아준다.
    }
    router.replace("/admin");
    router.refresh();
  }

  return (
    <button
      type="button"
      className="admin-shell__logout"
      onClick={onClick}
      disabled={pending}
    >
      {pending ? "로그아웃 중…" : "로그아웃"}
    </button>
  );
}
