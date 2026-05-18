"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  PROGRAM_SOURCES,
  RegistrationInputSchema,
  type RegistrationCreated,
  type RegistrationInput,
  formatPhone,
} from "@/lib/validation/registration";

export type ProgramForApply = {
  id: number;
  code: string;
  roman_numeral: string;
  title_latin: string;
  title_ko: string;
  composer: string;
  scheduled_at: string;
  price: number;
  available_count: number;
  is_sold_out: boolean;
};

export type SettingsForApply = {
  hold_hours: number;
  bank_name: string;
  account_number: string;
  account_holder: string;
};

type Props = {
  programs: ProgramForApply[];
  settings: SettingsForApply;
  preselectedIds: number[];
  dbReady: boolean;
};

const KRW = new Intl.NumberFormat("ko-KR");
const EMPTY_IDS: number[] = [];

function formatProgramDate(iso: string): string {
  // 시드된 시각은 모두 토요일 15:00 KST — 표기는 항상 "YYYY.MM.DD SAT · 15:00"
  return `${iso.slice(0, 10).replace(/-/g, ".")} SAT · 15:00`;
}

const SOURCE_LABEL: Record<(typeof PROGRAM_SOURCES)[number], string> = {
  instagram: "인스타그램",
  referral: "지인 추천",
  search: "검색",
  book: "책",
  etc: "기타",
};

export function ApplyClient({ programs, settings, preselectedIds, dbReady }: Props) {
  const router = useRouter();

  const validPreselect = useMemo(
    () =>
      preselectedIds.filter((id) => {
        const p = programs.find((x) => x.id === id);
        return p && !p.is_sold_out && p.available_count > 0;
      }),
    [preselectedIds, programs],
  );

  type FormShape = {
    name: string;
    phone: string;
    email: string;
    depositor_name: string;
    source: "" | (typeof PROGRAM_SOURCES)[number];
    message: string;
    program_ids: number[];
    consent_privacy: boolean;
    consent_refund: boolean;
    consent_marketing: boolean;
  };

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormShape>({
    // Zod 스키마와 동일한 검증 규칙. resolver는 입력 → 검증된 RegistrationInput으로 변환.
    resolver: zodResolver(RegistrationInputSchema) as never,
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      depositor_name: "",
      source: "",
      message: "",
      program_ids: validPreselect,
      consent_privacy: false,
      consent_refund: false,
      consent_marketing: false,
    },
    mode: "onTouched",
  });

  // useWatch (subscription 기반) 사용 — React Compiler가 watch() 의 비결정성을 잡지 못해 메모이제이션을 건너뜀.
  const selectedIds = useWatch({ control, name: "program_ids" }) ?? EMPTY_IDS;
  const consentPrivacy = useWatch({ control, name: "consent_privacy" }) ?? false;
  const consentRefund = useWatch({ control, name: "consent_refund" }) ?? false;

  const totalAmount = useMemo(() => {
    return programs
      .filter((p) => selectedIds.includes(p.id))
      .reduce((sum, p) => sum + p.price, 0);
  }, [programs, selectedIds]);

  const [serverError, setServerError] = useState<string | null>(null);

  async function onSubmit(values: FormShape) {
    setServerError(null);
    if (!dbReady) {
      setServerError("DB 연결이 준비되지 않았습니다. 운영자에게 문의해주세요.");
      return;
    }

    try {
      const res = await fetch("/api/registrations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          phone: values.phone,
          email: values.email,
          depositor_name: values.depositor_name,
          source: values.source || undefined,
          message: values.message || undefined,
          program_ids: values.program_ids,
          consent_privacy: values.consent_privacy,
          consent_refund: values.consent_refund,
          consent_marketing: values.consent_marketing,
        } satisfies RegistrationInput),
      });

      if (res.ok) {
        const body = (await res.json()) as RegistrationCreated;
        router.push(`/apply/complete?id=${body.id}`);
        return;
      }

      const body = (await res.json().catch(() => null)) as
        | { error?: { code?: string; message?: string } }
        | null;
      const code = body?.error?.code;
      const message = body?.error?.message ?? "신청 처리 중 오류가 발생했습니다.";

      if (code === "SOLD_OUT") {
        setServerError("선택하신 회차가 매진되었습니다. 잠시 후 페이지를 새로고침해 다시 확인해주세요.");
      } else if (code === "DUPLICATE") {
        setServerError("동일한 이메일 또는 전화번호로 이미 신청된 회차가 있습니다.");
      } else if (code === "VALIDATION") {
        setServerError(message);
      } else {
        setServerError(message);
      }
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "네트워크 오류가 발생했습니다.");
    }
  }

  // [필수] 약관 일괄 토글
  const allRequiredChecked = consentPrivacy && consentRefund;
  function toggleAllRequired(next: boolean) {
    setValue("consent_privacy", next, { shouldValidate: true });
    setValue("consent_refund", next, { shouldValidate: true });
  }

  // RHF에 program_ids가 [] 일 때 첫 submit에서 친절히 에러 띄우기
  useEffect(() => {
    if (errors.program_ids) {
      const el = document.getElementById("program-selector");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [errors.program_ids]);

  return (
    <main className="apply">
      <nav className="apply__nav">
        <Link href="/" className="apply__brand">
          Opera Humanitas.
        </Link>
      </nav>

      <header className="apply__header container">
        <div className="num">— Application · 신청</div>
        <h1 className="apply__title">
          Reservatio.
        </h1>
        <p className="apply__kr">네 개의 밤 — 신청 양식</p>
      </header>

      <form className="apply__form container" onSubmit={handleSubmit(onSubmit)} noValidate>
        {/* 01. 프로그램 선택 */}
        <section className="apply__section" id="program-selector">
          <h2 className="apply__section-title">
            <span className="apply__section-num">01.</span> 프로그램 선택
          </h2>
          <p className="apply__section-lead">
            Quattuor noctes — 신청하실 회차를 선택해주세요. 복수 선택 가능합니다.
          </p>

          <Controller
            control={control}
            name="program_ids"
            render={({ field }) => (
              <ul className="apply__programs" role="list">
                {programs.map((p) => {
                  const disabled = p.is_sold_out || p.available_count <= 0;
                  const checked = field.value.includes(p.id);
                  return (
                    <li key={p.id}>
                      <label
                        className={`apply__program-card${checked ? " is-checked" : ""}${disabled ? " is-disabled" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...field.value, p.id]
                              : field.value.filter((id) => id !== p.id);
                            field.onChange(next.sort((a, b) => a - b));
                          }}
                          aria-describedby={`program-${p.id}-meta`}
                        />
                        <div className="apply__program-body">
                          <div className="apply__program-head">
                            <span className="apply__program-roman">{p.roman_numeral}.</span>
                            <span className="apply__program-latin">{p.title_latin}</span>
                            <span className="apply__program-sep">·</span>
                            <span className="apply__program-kr">{p.title_ko}</span>
                          </div>
                          <div className="apply__program-composer">{p.composer}</div>
                          <div className="apply__program-meta" id={`program-${p.id}-meta`}>
                            <span>{formatProgramDate(p.scheduled_at)}</span>
                            <span>·</span>
                            <span>₩{KRW.format(p.price)}</span>
                            <span>·</span>
                            <SeatStatus available={p.available_count} soldOut={p.is_sold_out} />
                          </div>
                        </div>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          />
          {errors.program_ids && (
            <p className="apply__error">{errors.program_ids.message}</p>
          )}

          <div className="apply__totals">
            <div>선택 회차 <strong>{selectedIds.length}개</strong></div>
            <div>합계 <strong>₩{KRW.format(totalAmount)}</strong></div>
          </div>
        </section>

        {/* 02. 신청자 정보 */}
        <section className="apply__section">
          <h2 className="apply__section-title">
            <span className="apply__section-num">02.</span> 신청자 정보
          </h2>

          <div className="apply__field">
            <label htmlFor="name">이름 <span className="apply__req">*</span></label>
            <input id="name" type="text" autoComplete="name" {...register("name")} />
            {errors.name && <p className="apply__error">{errors.name.message}</p>}
          </div>

          <div className="apply__field">
            <label htmlFor="phone">전화번호 <span className="apply__req">*</span></label>
            <Controller
              control={control}
              name="phone"
              render={({ field }) => (
                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="010-1234-5678"
                  value={field.value}
                  onBlur={field.onBlur}
                  onChange={(e) => field.onChange(formatPhone(e.target.value))}
                />
              )}
            />
            {errors.phone && <p className="apply__error">{errors.phone.message}</p>}
          </div>

          <div className="apply__field">
            <label htmlFor="email">이메일 <span className="apply__req">*</span></label>
            <input id="email" type="email" autoComplete="email" {...register("email")} />
            {errors.email && <p className="apply__error">{errors.email.message}</p>}
          </div>

          <div className="apply__field">
            <label htmlFor="depositor_name">입금자명 <span className="apply__req">*</span></label>
            <input id="depositor_name" type="text" {...register("depositor_name")} />
            <p className="apply__hint">
              신청자와 다를 경우 입금자 이름을 적어주세요. 동일한 경우에도 다시 입력해주세요.
            </p>
            {errors.depositor_name && (
              <p className="apply__error">{errors.depositor_name.message}</p>
            )}
          </div>
        </section>

        {/* 03. 추가 정보 (선택) */}
        <section className="apply__section">
          <h2 className="apply__section-title">
            <span className="apply__section-num">03.</span> 추가 정보 <span className="apply__optional">(선택)</span>
          </h2>

          <div className="apply__field">
            <label htmlFor="source">알게 된 경로</label>
            <select id="source" {...register("source")} defaultValue="">
              <option value="">선택하지 않음</option>
              {PROGRAM_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {SOURCE_LABEL[s]}
                </option>
              ))}
            </select>
          </div>

          <div className="apply__field">
            <label htmlFor="message">남기실 한마디 <span className="apply__optional">(최대 200자)</span></label>
            <textarea id="message" rows={4} maxLength={200} {...register("message")} />
            {errors.message && <p className="apply__error">{errors.message.message}</p>}
          </div>
        </section>

        {/* 04. 입금 안내 */}
        <section className="apply__section">
          <h2 className="apply__section-title">
            <span className="apply__section-num">04.</span> 입금 안내
          </h2>
          <div className="apply__bank-box">
            <div>
              <span className="apply__bank-label">입금 계좌</span>
              <span>{settings.bank_name} {settings.account_number} 예금주 {settings.account_holder}</span>
            </div>
            <div>
              <span className="apply__bank-label">입금 기한</span>
              <span>신청 후 {settings.hold_hours}시간 이내</span>
            </div>
            <div>
              <span className="apply__bank-label">입금자명</span>
              <span>반드시 위 [입금자명]과 동일하게 입금해주세요.</span>
            </div>
            <div className="apply__bank-note">미입금 시 자동으로 예약이 취소됩니다.</div>
          </div>
        </section>

        {/* 05. 약관 동의 */}
        <section className="apply__section">
          <h2 className="apply__section-title">
            <span className="apply__section-num">05.</span> 약관 동의
          </h2>

          <label className="apply__consent">
            <input type="checkbox" {...register("consent_privacy")} />
            <span><strong>[필수]</strong> 개인정보 수집 및 이용 동의</span>
            <details className="apply__consent-details">
              <summary>전문 보기</summary>
              <p>
                아트컴퍼니본은 Opera Humanitas 강연-콘서트 신청·운영을 위해 다음과 같이 개인정보를 수집·이용합니다.
              </p>
              <ul>
                <li>수집 항목: 이름, 전화번호, 이메일, 입금자명, 알게 된 경로(선택), 남기는 한마디(선택)</li>
                <li>이용 목적: 신청 접수, 입금 확인, 행사 안내, 본인 확인</li>
                <li>보유 기간: 행사 종료 후 3개월까지 (이후 즉시 파기)</li>
                <li>거부 시 신청이 불가합니다.</li>
              </ul>
            </details>
          </label>
          {errors.consent_privacy && (
            <p className="apply__error">{errors.consent_privacy.message}</p>
          )}

          <label className="apply__consent">
            <input type="checkbox" {...register("consent_refund")} />
            <span><strong>[필수]</strong> 취소 및 환불 규정 동의</span>
            <details className="apply__consent-details">
              <summary>전문 보기</summary>
              <ul>
                <li>입금 전 취소: 별도 절차 없이 자동 만료 ({settings.hold_hours}시간 미입금)</li>
                <li>입금 후 ~ 공연일 7일 전: 100% 환불</li>
                <li>공연일 7일 전 ~ 3일 전: 50% 환불</li>
                <li>공연일 2일 전 ~ 당일: 환불 불가</li>
                <li>환불 요청: voceverdiana@naver.com</li>
              </ul>
            </details>
          </label>
          {errors.consent_refund && (
            <p className="apply__error">{errors.consent_refund.message}</p>
          )}

          <label className="apply__consent">
            <input type="checkbox" {...register("consent_marketing")} />
            <span><strong>[선택]</strong> 마케팅 정보 수신 동의</span>
          </label>

          <label className="apply__consent apply__consent--all">
            <input
              type="checkbox"
              checked={allRequiredChecked}
              onChange={(e) => toggleAllRequired(e.target.checked)}
            />
            <span>위 [필수] 약관에 모두 동의합니다.</span>
          </label>
        </section>

        {serverError && (
          <div className="apply__server-error" role="alert">
            {serverError}
          </div>
        )}

        <button
          type="submit"
          className="apply__submit"
          disabled={isSubmitting || selectedIds.length === 0}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? "처리 중…" : "신청하기 →"}
        </button>

        {!dbReady && (
          <p className="apply__server-error" role="alert">
            현재 DB 연결이 준비되지 않아 신청을 받을 수 없습니다. 운영자 환경설정을 확인해주세요.
          </p>
        )}
      </form>

      <footer className="apply__footer">
        <Link href="/" className="apply__back">← 처음으로</Link>
      </footer>
    </main>
  );
}

function SeatStatus({ available, soldOut }: { available: number; soldOut: boolean }) {
  if (soldOut || available <= 0) {
    return <span className="apply__seats apply__seats--sold">SOLD OUT</span>;
  }
  if (available <= 5) {
    return <span className="apply__seats apply__seats--low">남은 자리 {available}석</span>;
  }
  if (available <= 15) {
    return <span className="apply__seats">남은 자리 {available}석</span>;
  }
  return <span className="apply__seats apply__seats--open">예약 가능</span>;
}
