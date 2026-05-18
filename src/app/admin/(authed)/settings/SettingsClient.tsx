"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import type { SettingsProgramItem } from "./page";

// PRD §3.7 — 운영 설정 폼.
// 세 영역을 별도 폼으로 분리 (각각 자체 저장 버튼) — 사용자가 한 영역만 바꿔서 저장할 수 있도록.
// 각 폼은 제출 후 router.refresh() 로 서버 컴포넌트가 다시 조회한 값으로 동기화한다.

type SettingsValue = {
  id: number;
  hold_hours: number;
  bank_name: string;
  account_number: string;
  account_holder: string;
  updated_at: string;
};

export function SettingsClient({
  settings,
  programs,
}: {
  settings: SettingsValue;
  programs: SettingsProgramItem[];
}) {
  return (
    <div className="admin-settings__sections">
      <PaymentInfoForm settings={settings} />
      <PolicyForm settings={settings} />
      <CapacityForm programs={programs} />
    </div>
  );
}

type SubmitState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "error"; message: string };

function useSubmit() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [state, setState] = useState<SubmitState>({ kind: "idle" });

  async function run(op: () => Promise<Response>) {
    setState({ kind: "saving" });
    try {
      const res = await op();
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        setState({
          kind: "error",
          message: body?.error?.message ?? "저장에 실패했습니다.",
        });
        return false;
      }
      startTransition(() => router.refresh());
      setState({ kind: "saved" });
      window.setTimeout(() => {
        setState((current) => (current.kind === "saved" ? { kind: "idle" } : current));
      }, 1800);
      return true;
    } catch {
      setState({ kind: "error", message: "네트워크 오류가 발생했습니다." });
      return false;
    }
  }

  return { state, run } as const;
}

function StatusLine({ state, savedLabel = "저장됨" }: { state: SubmitState; savedLabel?: string }) {
  if (state.kind === "idle") return null;
  if (state.kind === "saving")
    return <span className="admin-settings__status">저장 중…</span>;
  if (state.kind === "saved")
    return (
      <span className="admin-settings__status admin-settings__status--ok">{savedLabel}</span>
    );
  return (
    <span className="admin-settings__status admin-settings__status--error" role="alert">
      {state.message}
    </span>
  );
}

function PaymentInfoForm({ settings }: { settings: SettingsValue }) {
  const { state, run } = useSubmit();
  const [bankName, setBankName] = useState(settings.bank_name);
  const [accountNumber, setAccountNumber] = useState(settings.account_number);
  const [accountHolder, setAccountHolder] = useState(settings.account_holder);

  const dirty =
    bankName.trim() !== settings.bank_name ||
    accountNumber.trim() !== settings.account_number ||
    accountHolder.trim() !== settings.account_holder;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.kind === "saving") return;
    const payload: Record<string, string> = {};
    if (bankName.trim() !== settings.bank_name) payload.bank_name = bankName.trim();
    if (accountNumber.trim() !== settings.account_number)
      payload.account_number = accountNumber.trim();
    if (accountHolder.trim() !== settings.account_holder)
      payload.account_holder = accountHolder.trim();
    if (Object.keys(payload).length === 0) return;
    await run(() =>
      fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    );
  }

  return (
    <form className="admin-settings__card" onSubmit={onSubmit}>
      <header className="admin-settings__card-header">
        <h2>입금 정보</h2>
        <p>신청 완료 화면과 안내 메일에 그대로 노출됩니다.</p>
      </header>

      <div className="admin-settings__fields">
        <label className="admin-settings__field">
          <span>은행</span>
          <input
            type="text"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            maxLength={50}
            disabled={state.kind === "saving"}
            required
          />
        </label>
        <label className="admin-settings__field">
          <span>계좌번호</span>
          <input
            type="text"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            maxLength={50}
            disabled={state.kind === "saving"}
            required
            inputMode="numeric"
          />
        </label>
        <label className="admin-settings__field">
          <span>예금주</span>
          <input
            type="text"
            value={accountHolder}
            onChange={(e) => setAccountHolder(e.target.value)}
            maxLength={50}
            disabled={state.kind === "saving"}
            required
          />
        </label>
      </div>

      <footer className="admin-settings__card-footer">
        <StatusLine state={state} />
        <button
          type="submit"
          className="admin-settings__save"
          disabled={state.kind === "saving" || !dirty}
        >
          {state.kind === "saving" ? "저장 중…" : "저장"}
        </button>
      </footer>
    </form>
  );
}

function PolicyForm({ settings }: { settings: SettingsValue }) {
  const { state, run } = useSubmit();
  const [holdHours, setHoldHours] = useState<number>(settings.hold_hours);

  const dirty = holdHours !== settings.hold_hours;
  const valid = Number.isInteger(holdHours) && holdHours >= 1 && holdHours <= 720;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.kind === "saving" || !dirty || !valid) return;
    await run(() =>
      fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hold_hours: holdHours }),
      }),
    );
  }

  return (
    <form className="admin-settings__card" onSubmit={onSubmit}>
      <header className="admin-settings__card-header">
        <h2>예약 정책</h2>
        <p>입금이 확인되지 않을 때 임시예약이 자동으로 만료되는 시간(시).</p>
      </header>

      <div className="admin-settings__fields">
        <label className="admin-settings__field admin-settings__field--narrow">
          <span>임시예약 홀드 시간 (시)</span>
          <input
            type="number"
            min={1}
            max={720}
            step={1}
            value={Number.isNaN(holdHours) ? "" : holdHours}
            onChange={(e) => setHoldHours(Number(e.target.value))}
            disabled={state.kind === "saving"}
            required
          />
        </label>
      </div>

      <footer className="admin-settings__card-footer">
        <StatusLine state={state} />
        <button
          type="submit"
          className="admin-settings__save"
          disabled={state.kind === "saving" || !dirty || !valid}
        >
          {state.kind === "saving" ? "저장 중…" : "저장"}
        </button>
      </footer>
    </form>
  );
}

function CapacityForm({ programs }: { programs: SettingsProgramItem[] }) {
  return (
    <section className="admin-settings__card">
      <header className="admin-settings__card-header">
        <h2>회차별 정원</h2>
        <p>활성 좌석(확정 + 만료 전 임시예약)보다 적게는 줄일 수 없습니다.</p>
      </header>

      <ul className="admin-settings__capacity-list">
        {programs.map((program) => (
          <CapacityRow key={program.id} program={program} />
        ))}
      </ul>
    </section>
  );
}

function CapacityRow({ program }: { program: SettingsProgramItem }) {
  const { state, run } = useSubmit();
  const [capacity, setCapacity] = useState<number>(program.capacity);

  const dirty = capacity !== program.capacity;
  const meetsFloor = capacity >= program.active_count;
  const valid =
    Number.isInteger(capacity) && capacity >= 1 && capacity <= 500 && meetsFloor;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.kind === "saving" || !dirty || !valid) return;
    await run(() =>
      fetch(`/api/admin/programs/${program.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ capacity }),
      }),
    );
  }

  const hint = meetsFloor
    ? `활성 ${program.active_count}석 / 새 정원 ${capacity}석`
    : `활성 ${program.active_count}석보다 적게 설정할 수 없습니다`;

  return (
    <li>
      <form className="admin-settings__capacity-row" onSubmit={onSubmit}>
        <span className="admin-settings__capacity-numeral">{program.roman_numeral}</span>
        <span className="admin-settings__capacity-title">{program.title_ko}</span>
        <label className="admin-settings__field admin-settings__field--narrow">
          <span className="sr-only">정원</span>
          <input
            type="number"
            min={Math.max(1, program.active_count)}
            max={500}
            step={1}
            value={Number.isNaN(capacity) ? "" : capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
            disabled={state.kind === "saving"}
            required
            aria-label={`${program.title_ko} 정원`}
          />
        </label>
        <span
          className={`admin-settings__capacity-hint${
            meetsFloor ? "" : " admin-settings__capacity-hint--error"
          }`}
        >
          {hint}
        </span>
        <div className="admin-settings__capacity-actions">
          <StatusLine state={state} />
          <button
            type="submit"
            className="admin-settings__save admin-settings__save--small"
            disabled={state.kind === "saving" || !dirty || !valid}
          >
            저장
          </button>
        </div>
      </form>
    </li>
  );
}
