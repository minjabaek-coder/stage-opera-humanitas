import type { Metadata } from "next";

import { AdminLoginClient } from "./AdminLoginClient";

// PRD §3.4 — 미니멀한 단일 입력 화면.
// 인증된 사용자가 진입한 경우 proxy.ts 가 /admin/dashboard 로 redirect 한다.

export const metadata: Metadata = {
  title: "Admin · Opera Humanitas",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <main className="admin-login">
      <div className="admin-login__card">
        <p className="admin-login__eyebrow">Opera Humanitas</p>
        <h1 className="admin-login__title">Admin</h1>
        <AdminLoginClient />
      </div>
    </main>
  );
}
