"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type FormEvent,
} from "react";

import type {
  RegistrationListItem,
  RegistrationsListResult,
} from "@/lib/admin/registrations";
import {
  REGISTRATION_STATUSES,
  type RegistrationStatus,
} from "@/lib/validation/admin";

// PRD §3.6 — 신청 목록 화면의 인터랙티브 영역.
// - 필터 폼: 회차 / 상태 / 검색 → URL 쿼리스트링으로 라우팅(서버 컴포넌트가 다시 fetch)
// - 페이지네이션: page= 쿼리만 변경
// - 행 클릭 → 상세 모달
// - 모달 내부에서 승인/취소 → /api/admin/registrations/[id]/(approve|cancel) 호출 후 router.refresh()

type StatusValue = "all" | RegistrationStatus;

type Filters = {
  status: StatusValue;
  program: number | null;
  q: string;
};

const STATUS_OPTIONS: { value: StatusValue; label: string }[] = [
  { value: "all", label: "전체" },
  ...REGISTRATION_STATUSES.map((s) => ({
    value: s as StatusValue,
    label: STATUS_KO(s),
  })),
];

const PROGRAM_OPTIONS: { value: number | ""; label: string }[] = [
  { value: "", label: "전체" },
  { value: 1, label: "I · 피가로의 결혼" },
  { value: 2, label: "II · 라보엠" },
  { value: 3, label: "III · 리골레토" },
  { value: 4, label: "IV · 카르멘" },
];

function STATUS_KO(status: string): string {
  switch (status) {
    case "pending":
      return "임시예약";
    case "confirmed":
      return "확정";
    case "cancelled":
      return "취소";
    default:
      return status;
  }
}

const KST_FORMATTER = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const KST_FULL_FORMATTER = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function fmtShort(iso: string | null): string {
  if (!iso) return "—";
  return KST_FORMATTER.format(new Date(iso));
}

function fmtFull(iso: string | null): string {
  if (!iso) return "—";
  return KST_FULL_FORMATTER.format(new Date(iso));
}

function fmtAmount(n: number): string {
  return n.toLocaleString("ko-KR") + "원";
}

function statusTone(item: RegistrationListItem): string {
  if (item.status === "pending") return "pending";
  if (item.status === "confirmed") return "confirmed";
  // cancelled — 만료(system) vs 관리자(admin) 구분 (PRD §3.6)
  const reason = item.cancel_reason ?? "";
  if (reason.startsWith("system:")) return "cancelled-expired";
  return "cancelled-admin";
}

function statusLabel(item: RegistrationListItem): string {
  if (item.status !== "cancelled") return STATUS_KO(item.status);
  const reason = item.cancel_reason ?? "";
  if (reason.startsWith("system:")) return "취소 (만료)";
  return "취소 (관리자)";
}

export function RegistrationsClient({
  initial,
  filters,
}: {
  initial: RegistrationsListResult;
  filters: Filters;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [statusInput, setStatusInput] = useState<StatusValue>(filters.status);
  const [programInput, setProgramInput] = useState<number | "">(
    filters.program ?? "",
  );
  const [qInput, setQInput] = useState(filters.q);

  // 외부에서 URL 이 바뀌면(예: 페이지네이션 클릭, 브라우저 back/forward) 입력 상태도 동기화.
  // React 19 권장 패턴: useEffect+setState 대신 렌더 중 prev props 비교 후 setState.
  const filtersKey = `${filters.status}|${filters.program ?? ""}|${filters.q}`;
  const [prevFiltersKey, setPrevFiltersKey] = useState(filtersKey);
  if (filtersKey !== prevFiltersKey) {
    setPrevFiltersKey(filtersKey);
    setStatusInput(filters.status);
    setProgramInput(filters.program ?? "");
    setQInput(filters.q);
  }

  const totalPages = Math.max(1, Math.ceil(initial.total / initial.page_size));

  const pushQuery = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchParams.toString());
      mutate(next);
      const qs = next.toString();
      startTransition(() => {
        router.push(qs ? `?${qs}` : "?");
      });
    },
    [router, searchParams],
  );

  function onSubmitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    pushQuery((p) => {
      if (statusInput && statusInput !== "all") p.set("status", statusInput);
      else p.delete("status");
      if (programInput) p.set("program", String(programInput));
      else p.delete("program");
      const trimmedQ = qInput.trim();
      if (trimmedQ) p.set("q", trimmedQ);
      else p.delete("q");
      p.delete("page");
    });
  }

  function onResetFilters() {
    setStatusInput("all");
    setProgramInput("");
    setQInput("");
    pushQuery((p) => {
      p.delete("status");
      p.delete("program");
      p.delete("q");
      p.delete("page");
    });
  }

  function gotoPage(page: number) {
    pushQuery((p) => {
      if (page <= 1) p.delete("page");
      else p.set("page", String(page));
    });
  }

  const [selected, setSelected] = useState<RegistrationListItem | null>(null);
  // 목록 갱신 시 모달이 떠 있으면 같은 id 의 최신 row 로 교체 (없으면 닫기).
  // 렌더 중 prev props 비교 후 setState 하는 React 19 권장 패턴.
  const [prevItems, setPrevItems] = useState(initial.items);
  if (initial.items !== prevItems) {
    setPrevItems(initial.items);
    if (selected) {
      const fresh = initial.items.find((i) => i.id === selected.id);
      setSelected(fresh ?? null);
    }
  }

  const rangeLabel = useMemo(() => {
    if (initial.total === 0) return "0건";
    const from = (initial.page - 1) * initial.page_size + 1;
    const to = Math.min(initial.total, initial.page * initial.page_size);
    return `${from}–${to} / ${initial.total}건`;
  }, [initial.total, initial.page, initial.page_size]);

  return (
    <>
      <form className="admin-registrations__filters" onSubmit={onSubmitFilters}>
        <label className="admin-registrations__field">
          <span>회차</span>
          <select
            value={programInput}
            onChange={(e) => {
              const v = e.target.value;
              setProgramInput(v === "" ? "" : Number(v));
            }}
            disabled={isPending}
          >
            {PROGRAM_OPTIONS.map((opt) => (
              <option key={String(opt.value)} value={String(opt.value)}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="admin-registrations__field">
          <span>상태</span>
          <select
            value={statusInput}
            onChange={(e) => setStatusInput(e.target.value as StatusValue)}
            disabled={isPending}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="admin-registrations__field admin-registrations__field--grow">
          <span>검색</span>
          <input
            type="search"
            placeholder="이름·전화·이메일·접수번호"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            disabled={isPending}
          />
        </label>

        <div className="admin-registrations__actions">
          <button
            type="button"
            className="admin-registrations__reset"
            onClick={onResetFilters}
            disabled={isPending}
          >
            초기화
          </button>
          <button
            type="submit"
            className="admin-registrations__apply"
            disabled={isPending}
          >
            {isPending ? "조회 중…" : "조회"}
          </button>
        </div>
      </form>

      <div className="admin-registrations__count">{rangeLabel}</div>

      <div className="admin-registrations__table-wrap">
        <table className="admin-registrations__table">
          <thead>
            <tr>
              <th scope="col">접수번호</th>
              <th scope="col">신청일시</th>
              <th scope="col">신청자</th>
              <th scope="col">연락처</th>
              <th scope="col">입금자명</th>
              <th scope="col">회차</th>
              <th scope="col" className="admin-registrations__col-amount">
                금액
              </th>
              <th scope="col">상태</th>
            </tr>
          </thead>
          <tbody>
            {initial.items.length === 0 ? (
              <tr>
                <td colSpan={8} className="admin-registrations__empty">
                  조건에 맞는 신청이 없습니다.
                </td>
              </tr>
            ) : (
              initial.items.map((item) => (
                <tr
                  key={item.id}
                  className="admin-registrations__row"
                  onClick={() => setSelected(item)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelected(item);
                    }
                  }}
                >
                  <td>{item.reference_no}</td>
                  <td>{fmtShort(item.created_at)}</td>
                  <td>{item.name}</td>
                  <td>{item.phone}</td>
                  <td>{item.depositor_name}</td>
                  <td>{item.programs.join(", ") || "—"}</td>
                  <td className="admin-registrations__col-amount">
                    {fmtAmount(item.total_amount)}
                  </td>
                  <td>
                    <span
                      className={`admin-status admin-status--${statusTone(item)}`}
                    >
                      {statusLabel(item)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={initial.page}
        totalPages={totalPages}
        onChange={gotoPage}
        disabled={isPending}
      />

      {selected ? (
        <DetailModal
          item={selected}
          onClose={() => setSelected(null)}
          onMutated={() => {
            startTransition(() => router.refresh());
          }}
        />
      ) : null}
    </>
  );
}

function Pagination({
  page,
  totalPages,
  onChange,
  disabled,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  disabled: boolean;
}) {
  if (totalPages <= 1) return null;

  // 페이지가 많을 때 좌우 2개씩만 노출
  const windowSize = 2;
  const pages: number[] = [];
  const start = Math.max(1, page - windowSize);
  const end = Math.min(totalPages, page + windowSize);
  for (let p = start; p <= end; p++) pages.push(p);

  return (
    <nav className="admin-pagination" aria-label="페이지네이션">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={disabled || page <= 1}
      >
        이전
      </button>
      {start > 1 ? (
        <>
          <button type="button" onClick={() => onChange(1)} disabled={disabled}>
            1
          </button>
          {start > 2 ? <span className="admin-pagination__ellipsis">…</span> : null}
        </>
      ) : null}
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          className={p === page ? "is-active" : ""}
          aria-current={p === page ? "page" : undefined}
          onClick={() => onChange(p)}
          disabled={disabled}
        >
          {p}
        </button>
      ))}
      {end < totalPages ? (
        <>
          {end < totalPages - 1 ? (
            <span className="admin-pagination__ellipsis">…</span>
          ) : null}
          <button
            type="button"
            onClick={() => onChange(totalPages)}
            disabled={disabled}
          >
            {totalPages}
          </button>
        </>
      ) : null}
      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={disabled || page >= totalPages}
      >
        다음
      </button>
    </nav>
  );
}

function DetailModal({
  item,
  onClose,
  onMutated,
}: {
  item: RegistrationListItem;
  onClose: () => void;
  onMutated: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingApprove, setConfirmingApprove] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // ESC 닫기
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  async function approve() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/registrations/${item.id}/approve`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        setError(body?.error?.message ?? "승인에 실패했습니다.");
        return;
      }
      setConfirmingApprove(false);
      onMutated();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    const reason = cancelReason.trim();
    if (!reason) {
      setError("취소 사유를 입력해주세요.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/registrations/${item.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        setError(body?.error?.message ?? "취소에 실패했습니다.");
        return;
      }
      setCancelling(false);
      setCancelReason("");
      onMutated();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }

  const canApprove = item.status === "pending";
  const canCancel = item.status !== "cancelled";

  return (
    <div className="admin-modal" role="dialog" aria-modal="true" aria-label="신청 상세">
      <button
        type="button"
        className="admin-modal__scrim"
        aria-label="모달 닫기"
        onClick={() => !busy && onClose()}
      />
      <div className="admin-modal__panel" role="document">
        <header className="admin-modal__header">
          <div>
            <p className="admin-modal__eyebrow">{item.reference_no}</p>
            <h2 className="admin-modal__title">{item.name}</h2>
          </div>
          <span
            className={`admin-status admin-status--${statusTone(item)}`}
          >
            {statusLabel(item)}
          </span>
        </header>

        <dl className="admin-modal__grid">
          <Field label="신청일시">{fmtFull(item.created_at)}</Field>
          <Field label="회차">{item.programs.join(", ") || "—"}</Field>
          <Field label="연락처">{item.phone}</Field>
          <Field label="이메일">{item.email}</Field>
          <Field label="입금자명">{item.depositor_name}</Field>
          <Field label="금액">{fmtAmount(item.total_amount)}</Field>
          <Field label="입금기한">{fmtFull(item.expires_at)}</Field>
          <Field label="확정시각">{fmtFull(item.confirmed_at)}</Field>
          <Field label="취소시각">{fmtFull(item.cancelled_at)}</Field>
          <Field label="취소사유">{item.cancel_reason ?? "—"}</Field>
          <Field label="알게된경로">{item.source ?? "—"}</Field>
          <Field label="한마디" wide>
            {item.message ?? "—"}
          </Field>
          <Field label="개인정보 동의">{item.consent_privacy ? "예" : "아니오"}</Field>
          <Field label="환불약관 동의">{item.consent_refund ? "예" : "아니오"}</Field>
          <Field label="마케팅 수신">{item.consent_marketing ? "예" : "아니오"}</Field>
        </dl>

        {error ? (
          <p className="admin-modal__error" role="alert">
            {error}
          </p>
        ) : null}

        {confirmingApprove ? (
          <div className="admin-modal__confirm">
            <p>{item.reference_no} 신청을 확정 상태로 전환할까요?</p>
            <div className="admin-modal__confirm-actions">
              <button
                type="button"
                onClick={() => {
                  setConfirmingApprove(false);
                  setError(null);
                }}
                disabled={busy}
              >
                되돌아가기
              </button>
              <button
                type="button"
                className="admin-modal__primary"
                onClick={approve}
                disabled={busy}
              >
                {busy ? "처리 중…" : "승인 확정"}
              </button>
            </div>
          </div>
        ) : null}

        {cancelling ? (
          <div className="admin-modal__confirm">
            <label className="admin-modal__cancel-field">
              <span>취소 사유 (필수, 200자 이내)</span>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                maxLength={200}
                disabled={busy}
                autoFocus
              />
            </label>
            <div className="admin-modal__confirm-actions">
              <button
                type="button"
                onClick={() => {
                  setCancelling(false);
                  setCancelReason("");
                  setError(null);
                }}
                disabled={busy}
              >
                되돌아가기
              </button>
              <button
                type="button"
                className="admin-modal__danger"
                onClick={cancel}
                disabled={busy}
              >
                {busy ? "처리 중…" : "취소 처리"}
              </button>
            </div>
          </div>
        ) : null}

        {!confirmingApprove && !cancelling ? (
          <footer className="admin-modal__footer">
            <button
              type="button"
              onClick={() => !busy && onClose()}
              disabled={busy}
            >
              닫기
            </button>
            {canApprove ? (
              <button
                type="button"
                className="admin-modal__primary"
                onClick={() => {
                  setError(null);
                  setConfirmingApprove(true);
                }}
              >
                승인
              </button>
            ) : null}
            {canCancel ? (
              <button
                type="button"
                className="admin-modal__danger"
                onClick={() => {
                  setError(null);
                  setCancelling(true);
                }}
              >
                취소
              </button>
            ) : null}
          </footer>
        ) : null}
      </div>
    </div>
  );
}

function Field({
  label,
  wide,
  children,
}: {
  label: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`admin-modal__field${wide ? " admin-modal__field--wide" : ""}`}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
