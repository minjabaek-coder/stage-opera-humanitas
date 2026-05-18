"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function RefreshButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [justRefreshed, setJustRefreshed] = useState(false);

  function onClick() {
    setJustRefreshed(false);
    startTransition(() => {
      router.refresh();
      // router.refresh()는 promise를 반환하지 않으므로 트랜지션 종료 시점에 토스트
      setJustRefreshed(true);
      setTimeout(() => setJustRefreshed(false), 1500);
    });
  }

  return (
    <button
      type="button"
      className="admin-dashboard__refresh"
      onClick={onClick}
      disabled={isPending}
    >
      {isPending ? "새로고침 중…" : justRefreshed ? "최신 상태" : "새로고침"}
    </button>
  );
}
