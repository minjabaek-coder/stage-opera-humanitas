import Link from "next/link";

import { getServiceClient } from "@/lib/supabase/server";

import { CopyButtons } from "./CopyButtons";

export const dynamic = "force-dynamic";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KRW = new Intl.NumberFormat("ko-KR");

type ProgramEmbed = {
  id: number;
  roman_numeral: string;
  title_latin: string;
  title_ko: string;
  scheduled_at: string;
  price: number;
};

type RegistrationDetail = {
  reference_no: string;
  name: string;
  phone: string;
  email: string;
  depositor_name: string;
  total_amount: number;
  status: "pending" | "confirmed" | "cancelled";
  expires_at: string;
  programs: ProgramEmbed[];
  bank_info: {
    bank_name: string;
    account_number: string;
    account_holder: string;
  };
};

type SearchParams = Promise<{ id?: string }>;

async function loadRegistration(id: string): Promise<RegistrationDetail | { error: "not_found" | "config" }> {
  let supabase;
  try {
    supabase = getServiceClient();
  } catch {
    return { error: "config" };
  }

  const [regRes, settingsRes] = await Promise.all([
    supabase
      .from("registrations")
      .select(
        `id, reference_no, name, phone, email, depositor_name,
         total_amount, status, expires_at,
         registration_items (
           price_snapshot,
           programs ( id, roman_numeral, title_latin, title_ko, scheduled_at, price )
         )`,
      )
      .eq("id", id)
      .single(),
    supabase
      .from("settings")
      .select("bank_name, account_number, account_holder")
      .eq("id", 1)
      .single(),
  ]);

  if (regRes.error || !regRes.data) return { error: "not_found" };
  if (settingsRes.error || !settingsRes.data) return { error: "config" };

  type Row = {
    reference_no: string;
    name: string;
    phone: string;
    email: string;
    depositor_name: string;
    total_amount: number;
    status: "pending" | "confirmed" | "cancelled";
    expires_at: string;
    registration_items: Array<{ price_snapshot: number; programs: ProgramEmbed | null }>;
  };
  const reg = regRes.data as unknown as Row;

  return {
    reference_no: reg.reference_no,
    name: reg.name,
    phone: reg.phone,
    email: reg.email,
    depositor_name: reg.depositor_name,
    total_amount: reg.total_amount,
    status: reg.status,
    expires_at: reg.expires_at,
    programs: reg.registration_items
      .map((ri) => ri.programs)
      .filter((p): p is ProgramEmbed => p !== null)
      .sort((a, b) => a.id - b.id),
    bank_info: settingsRes.data as RegistrationDetail["bank_info"],
  };
}

function formatKstDateLong(iso: string): string {
  // "2026.06.20 (토) 15:00" 형식
  const d = new Date(iso);
  const fmt = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    // hour12:false 는 ko-KR 에서 hourCycle 을 h24 로 override 해버려 자정이 "24:00"
    // 출력 → 서버/클라이언트 불일치 (hydration mismatch). hourCycle:"h23" 만 명시.
    hourCycle: "h23",
  });
  // Intl 출력은 "2026. 06. 20. (토) 15:00" — 점공백 패턴을 점으로 정리
  return fmt.format(d).replace(/\.\s/g, ".").replace(/\.$/, "");
}

function formatKstDateShort(iso: string): string {
  // "2026.06.20 SAT" 형식
  const d = new Date(iso);
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });
  const parts = fmt.formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}.${get("month")}.${get("day")} ${get("weekday").toUpperCase()}`;
}

export default async function CompletePage({ searchParams }: { searchParams: SearchParams }) {
  const { id } = await searchParams;

  if (!id || !UUID_REGEX.test(id)) {
    return (
      <main className="apply">
        <nav className="apply__nav">
          <Link href="/" className="apply__brand">Opera Humanitas.</Link>
        </nav>
        <div className="apply__header container">
          <div className="num">— Completed</div>
          <h1 className="apply__title">신청 정보를 찾을 수 없습니다.</h1>
          <p className="apply__kr">올바른 신청 링크로 다시 접속해주세요.</p>
        </div>
        <footer className="apply__footer">
          <Link href="/apply" className="apply__back">← 신청 페이지로</Link>
        </footer>
      </main>
    );
  }

  const result = await loadRegistration(id);

  if ("error" in result) {
    return (
      <main className="apply">
        <nav className="apply__nav">
          <Link href="/" className="apply__brand">Opera Humanitas.</Link>
        </nav>
        <div className="apply__header container">
          <div className="num">— Completed</div>
          <h1 className="apply__title">
            {result.error === "config" ? "운영자 설정 미완료" : "신청을 찾지 못했습니다"}
          </h1>
          <p className="apply__kr">
            {result.error === "config"
              ? "Supabase 환경 변수가 설정되지 않았습니다. 운영자에게 문의해주세요."
              : "주소를 잘못 입력하셨거나, 신청이 취소·만료되었을 수 있습니다."}
          </p>
        </div>
        <footer className="apply__footer">
          <Link href="/" className="apply__back">← 처음으로</Link>
        </footer>
      </main>
    );
  }

  const r = result;
  const copyAmount = String(r.total_amount);

  return (
    <main className="apply">
      <nav className="apply__nav">
        <Link href="/" className="apply__brand">Opera Humanitas.</Link>
      </nav>

      <header className="apply__header container">
        <div className="num">— Completed · 06</div>
        <h1 className="apply__title">Reservatio facta est.</h1>
        <p className="apply__kr">신청이 접수되었습니다.</p>
      </header>

      <section className="apply__form container" aria-label="신청 요약">
        <div className="apply__section">
          <h2 className="apply__section-title">
            <span className="apply__section-num">·</span> 신청 요약
          </h2>
          <dl className="apply__summary">
            <div>
              <dt>접수번호</dt>
              <dd className="apply__refno">{r.reference_no}</dd>
            </div>
            <div>
              <dt>신청자</dt>
              <dd>{r.name} / {r.phone} / {r.email}</dd>
            </div>
            <div>
              <dt>입금자명</dt>
              <dd>{r.depositor_name}</dd>
            </div>
            <div>
              <dt>상태</dt>
              <dd>
                {r.status === "pending" && "입금 대기"}
                {r.status === "confirmed" && "입금 확정"}
                {r.status === "cancelled" && "취소됨"}
              </dd>
            </div>
          </dl>

          <ul className="apply__program-list" role="list">
            {r.programs.map((p) => (
              <li key={p.id}>
                <span className="apply__program-roman">{p.roman_numeral}.</span>
                <span>{p.title_latin} · {p.title_ko}</span>
                <span className="apply__program-when">{formatKstDateShort(p.scheduled_at)}</span>
                <span className="apply__program-price">₩{KRW.format(p.price)}</span>
              </li>
            ))}
          </ul>

          <div className="apply__totals">
            <div>합계</div>
            <div><strong>₩{KRW.format(r.total_amount)}</strong></div>
          </div>
        </div>

        {r.status === "pending" && (
          <div className="apply__section">
            <h2 className="apply__section-title">
              <span className="apply__section-num">·</span> 입금 안내
            </h2>
            <div className="apply__bank-box">
              <div>
                <span className="apply__bank-label">계좌</span>
                <span>{r.bank_info.bank_name} {r.bank_info.account_number}</span>
              </div>
              <div>
                <span className="apply__bank-label">예금주</span>
                <span>{r.bank_info.account_holder}</span>
              </div>
              <div>
                <span className="apply__bank-label">입금 기한</span>
                <span>{formatKstDateLong(r.expires_at)}까지</span>
              </div>
              <div>
                <span className="apply__bank-label">입금자명</span>
                <span>반드시 <strong>{r.depositor_name}</strong> 으로 입금해주세요.</span>
              </div>
              <div className="apply__bank-note">기한 내 미입금 시 자동 취소됩니다.</div>
            </div>

            <CopyButtons accountNumber={r.bank_info.account_number} amount={copyAmount} />
          </div>
        )}

        <div className="apply__section apply__notes">
          <ul>
            <li>입금이 확인되면 별도 안내드립니다. (자동 메일은 Phase 2 도입 예정)</li>
            <li>문의: voceverdiana@naver.com</li>
            <li>좌석은 24석 자유석이며, 입금 확인 순으로 확정됩니다.</li>
            <li>이 페이지를 캡처하여 보관해주세요.</li>
          </ul>
        </div>
      </section>

      <footer className="apply__footer">
        <Link href="/" className="apply__back">← 처음으로</Link>
      </footer>
    </main>
  );
}
