import type { Metadata } from "next";

import { AdminLogoutButton } from "./AdminLogoutButton";
import { AdminNav } from "./AdminNav";

// 인증된 관리자 페이지(/admin/dashboard, /admin/registrations, /admin/settings) 공통 shell.
// 로그인 페이지(/admin) 는 이 layout 밖이므로 영향 없음.
// 인증 자체는 src/proxy.ts 가 보장한다 — 여기서 추가 검증은 하지 않는다.

export const metadata: Metadata = {
  title: { default: "Admin · Opera Humanitas", template: "%s · Admin · Opera Humanitas" },
  robots: { index: false, follow: false },
};

export default function AdminAuthedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell">
      <header className="admin-shell__header">
        <div className="admin-shell__brand">
          <span className="admin-shell__eyebrow">Opera Humanitas</span>
          <span className="admin-shell__title">Admin</span>
        </div>
        <AdminNav />
        <AdminLogoutButton />
      </header>
      <main className="admin-shell__main">{children}</main>
    </div>
  );
}
