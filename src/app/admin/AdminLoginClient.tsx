"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function AdminLoginClient() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (response.ok) {
        router.replace("/admin/dashboard");
        router.refresh();
        return;
      }
      const data = (await response.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null;
      setError(data?.error?.message ?? "로그인에 실패했습니다.");
    } catch {
      setError("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="admin-login__form" onSubmit={onSubmit} noValidate>
      <label className="admin-login__field">
        <span className="admin-login__label">PASSWORD</span>
        <input
          className="admin-login__input"
          type="password"
          autoComplete="current-password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={submitting}
          required
        />
      </label>

      {error ? (
        <p className="admin-login__error" role="alert">
          {error}
        </p>
      ) : null}

      <button
        className="admin-login__submit"
        type="submit"
        disabled={submitting || password.length === 0}
      >
        {submitting ? "확인 중…" : "로그인"}
      </button>
    </form>
  );
}
