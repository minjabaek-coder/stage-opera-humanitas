import type { Metadata } from "next";

import { getServiceClient } from "@/lib/supabase/server";

import { SettingsClient } from "./SettingsClient";

// PRD §3.7 — 입금 정보 / 예약 정책 / 회차별 정원.
// settings 는 singleton(id=1), programs 는 4 rows. 활성 좌석(confirmed+active pending) 도
// 함께 가져와 capacity 축소 하한을 UI 에서 미리 안내한다 (서버 가드와 일관).

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Settings",
};

type SettingsRow = {
  id: number;
  hold_hours: number;
  bank_name: string;
  account_number: string;
  account_holder: string;
  updated_at: string;
};

type ProgramRow = {
  id: number;
  roman_numeral: string;
  title_ko: string;
  capacity: number;
};

type AvailabilityRow = {
  id: number;
  confirmed_count: number;
  pending_count: number;
};

export type SettingsProgramItem = ProgramRow & { active_count: number };

export default async function AdminSettingsPage() {
  const supabase = getServiceClient();

  const [settingsRes, programsRes, availabilityRes] = await Promise.all([
    supabase
      .from("settings")
      .select("id, hold_hours, bank_name, account_number, account_holder, updated_at")
      .eq("id", 1)
      .maybeSingle(),
    supabase
      .from("programs")
      .select("id, roman_numeral, title_ko, capacity")
      .order("id"),
    supabase
      .from("program_availability")
      .select("id, confirmed_count, pending_count"),
  ]);

  const errors: string[] = [];
  if (settingsRes.error) errors.push(`settings: ${settingsRes.error.message}`);
  if (programsRes.error) errors.push(`programs: ${programsRes.error.message}`);
  if (availabilityRes.error) errors.push(`availability: ${availabilityRes.error.message}`);

  const settings = (settingsRes.data ?? null) as SettingsRow | null;
  const programs = (programsRes.data ?? []) as ProgramRow[];
  const availability = (availabilityRes.data ?? []) as AvailabilityRow[];

  const availabilityById = new Map(
    availability.map((a) => [a.id, (a.confirmed_count ?? 0) + (a.pending_count ?? 0)]),
  );
  const programItems: SettingsProgramItem[] = programs.map((p) => ({
    ...p,
    active_count: availabilityById.get(p.id) ?? 0,
  }));

  return (
    <section className="admin-settings">
      <header className="admin-settings__header">
        <p className="admin-settings__eyebrow">Settings</p>
        <h1 className="admin-settings__heading">운영 설정</h1>
      </header>

      {errors.length > 0 ? (
        <p className="admin-settings__error" role="alert">
          {errors.join(" / ")}
        </p>
      ) : null}

      {settings ? (
        <SettingsClient settings={settings} programs={programItems} />
      ) : (
        <p className="admin-settings__error" role="alert">
          settings 데이터를 불러올 수 없습니다. seed.sql 적용 여부를 확인해주세요.
        </p>
      )}
    </section>
  );
}
