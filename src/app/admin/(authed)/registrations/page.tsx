import type { Metadata } from "next";

import { listRegistrations } from "@/lib/admin/registrations";
import { RegistrationsListQuerySchema } from "@/lib/validation/admin";

import { RegistrationsClient } from "./RegistrationsClient";

// PRD §3.6 — 관리자 신청 관리.
// searchParams 로 필터/페이지를 받아 listRegistrations() 로 직접 조회.
// 클라이언트 측은 검색 폼·페이지네이션·상세 모달·승인/취소 액션만 담당.

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Registrations",
};

type RawSearchParams = Record<string, string | string[] | undefined>;

function pickFirst(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value ?? undefined;
}

export default async function AdminRegistrationsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const raw = await searchParams;

  const parsed = RegistrationsListQuerySchema.safeParse({
    status: pickFirst(raw.status),
    program: pickFirst(raw.program),
    q: pickFirst(raw.q),
    page: pickFirst(raw.page),
    page_size: pickFirst(raw.page_size),
  });
  // 잘못된 입력은 조용히 기본값으로 fallback — 사용자 URL 조작에도 페이지가 깨지지 않도록.
  const query = parsed.success
    ? parsed.data
    : RegistrationsListQuerySchema.parse({});

  let result: Awaited<ReturnType<typeof listRegistrations>> | null = null;
  let errorMessage: string | null = null;
  try {
    result = await listRegistrations(query, { detail: true });
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "조회에 실패했습니다.";
  }

  return (
    <section className="admin-registrations">
      <header className="admin-registrations__header">
        <div>
          <p className="admin-registrations__eyebrow">Registrations</p>
          <h1 className="admin-registrations__heading">신청 관리</h1>
        </div>
        <a
          className="admin-registrations__export"
          href="/api/admin/registrations/export"
        >
          엑셀 다운로드
        </a>
      </header>

      {errorMessage ? (
        <p className="admin-registrations__error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {result ? (
        <RegistrationsClient
          initial={result}
          filters={{
            status: query.status,
            program: query.program ?? null,
            q: query.q ?? "",
          }}
        />
      ) : null}
    </section>
  );
}
