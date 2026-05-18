"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/registrations", label: "Registrations" },
  { href: "/admin/settings", label: "Settings" },
] as const;

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="admin-shell__nav" aria-label="관리자 메뉴">
      {ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`admin-shell__nav-link${active ? " is-active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
