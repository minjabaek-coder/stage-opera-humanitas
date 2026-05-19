import type { Metadata } from "next";

import { getDashboardData, type DashboardProgramRow } from "@/lib/admin/dashboard";

import { RefreshButton } from "./RefreshButton";

// PRD §3.5 — 관리자 대시보드
// - 회차별 잔여 좌석 / pending / confirmed / capacity
// - 전체 입금 대기(pending) 카운트
// - 6시간 내 만료 예정 카운트
//
// 서버 컴포넌트에서 직접 getDashboardData() 를 호출한다(자체 API fetch 라운드트립 생략).
// 인증은 src/proxy.ts 가 막아준다.

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard",
};

const NOW_FORMATTER = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  // ko-KR + hour12:false 는 hourCycle 을 h24 로 override (자정=24:00). hourCycle:"h23" 만 명시.
  hourCycle: "h23",
});

export default async function AdminDashboardPage() {
  let data: Awaited<ReturnType<typeof getDashboardData>> | null = null;
  let errorMessage: string | null = null;

  try {
    data = await getDashboardData();
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "데이터를 불러오지 못했습니다.";
  }

  const fetchedAt = NOW_FORMATTER.format(new Date());

  return (
    <section className="admin-dashboard">
      <header className="admin-dashboard__header">
        <div>
          <p className="admin-dashboard__eyebrow">Overview</p>
          <h1 className="admin-dashboard__heading">대시보드</h1>
          <p className="admin-dashboard__meta">기준 {fetchedAt} (KST)</p>
        </div>
        <RefreshButton />
      </header>

      {errorMessage ? (
        <p className="admin-dashboard__error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {data ? (
        <>
          <div className="admin-dashboard__kpis">
            <KpiCard
              label="입금 대기 (Pending)"
              value={data.pending_count}
              hint="만료되지 않은 활성 pending 신청 건수"
            />
            <KpiCard
              label="곧 만료 예정"
              value={data.expiring_soon_count}
              hint="6시간 내 만료 예정 pending"
              tone={data.expiring_soon_count > 0 ? "warning" : "default"}
            />
            <KpiCard
              label="총 잔여 좌석"
              value={data.programs.reduce((sum, p) => sum + p.available, 0)}
              hint={`정원 ${data.programs.reduce((sum, p) => sum + p.capacity, 0)}석 기준`}
            />
          </div>

          <h2 className="admin-dashboard__section-heading">회차별 좌석 현황</h2>
          <div className="admin-dashboard__programs">
            {data.programs.map((program) => (
              <ProgramCard key={program.id} program={program} />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}

function KpiCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: number;
  hint?: string;
  tone?: "default" | "warning";
}) {
  return (
    <article className={`admin-dashboard__kpi admin-dashboard__kpi--${tone}`}>
      <p className="admin-dashboard__kpi-label">{label}</p>
      <p className="admin-dashboard__kpi-value">{value}</p>
      {hint ? <p className="admin-dashboard__kpi-hint">{hint}</p> : null}
    </article>
  );
}

function ProgramCard({ program }: { program: DashboardProgramRow }) {
  const { roman_numeral, title_ko, capacity, confirmed, pending, available } = program;
  const confirmedPct = capacity > 0 ? (confirmed / capacity) * 100 : 0;
  const pendingPct = capacity > 0 ? (pending / capacity) * 100 : 0;
  const soldOut = available <= 0;

  return (
    <article className={`admin-dashboard__program${soldOut ? " is-soldout" : ""}`}>
      <header className="admin-dashboard__program-header">
        <span className="admin-dashboard__program-numeral">{roman_numeral}</span>
        <h3 className="admin-dashboard__program-title">{title_ko}</h3>
      </header>

      <div className="admin-dashboard__program-availability">
        <span className="admin-dashboard__program-available">{available}</span>
        <span className="admin-dashboard__program-capacity">/ {capacity}석 잔여</span>
      </div>

      <div
        className="admin-dashboard__program-bar"
        role="img"
        aria-label={`확정 ${confirmed}석, 대기 ${pending}석, 잔여 ${available}석`}
      >
        <span
          className="admin-dashboard__program-bar-confirmed"
          style={{ width: `${confirmedPct}%` }}
        />
        <span
          className="admin-dashboard__program-bar-pending"
          style={{ width: `${pendingPct}%` }}
        />
      </div>

      <dl className="admin-dashboard__program-stats">
        <div>
          <dt>확정</dt>
          <dd>{confirmed}</dd>
        </div>
        <div>
          <dt>대기</dt>
          <dd>{pending}</dd>
        </div>
        <div>
          <dt>정원</dt>
          <dd>{capacity}</dd>
        </div>
      </dl>
    </article>
  );
}
