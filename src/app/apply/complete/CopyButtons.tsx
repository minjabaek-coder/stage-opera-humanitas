"use client";

import { useState } from "react";

type Props = {
  accountNumber: string;
  amount: string;
};

export function CopyButtons({ accountNumber, amount }: Props) {
  const [copied, setCopied] = useState<"account" | "amount" | null>(null);

  async function copy(text: string, which: "account" | "amount") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      window.setTimeout(() => setCopied((c) => (c === which ? null : c)), 1500);
    } catch {
      // clipboard 권한 거부 시 noop. 사용자가 수동 복사 가능하도록 텍스트는 화면에 노출되어 있음.
    }
  }

  return (
    <div className="apply__copy-row">
      <button
        type="button"
        className="apply__copy"
        onClick={() => copy(accountNumber.replace(/\s/g, ""), "account")}
      >
        {copied === "account" ? "복사됨 ✓" : "계좌번호 복사"}
      </button>
      <button
        type="button"
        className="apply__copy"
        onClick={() => copy(amount, "amount")}
      >
        {copied === "amount" ? "복사됨 ✓" : "금액 복사"}
      </button>
    </div>
  );
}
