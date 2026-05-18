import { z } from "zod";

// PRD §8 검증 규칙. 전화는 010 모바일 + 02/0NN 유선 모두 허용 (정규화 후 검증).
// program_ids는 1~4 범위, 최소 1개. 동의는 둘 다 true 강제.

const PHONE_REGEX = /^0(?:10-\d{3,4}-\d{4}|[2-9]\d?-\d{3,4}-\d{4})$/;

export const PROGRAM_SOURCES = [
  "instagram",
  "referral",
  "search",
  "book",
  "etc",
] as const;
export type ProgramSource = (typeof PROGRAM_SOURCES)[number];

export const RegistrationInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { error: "이름은 2자 이상 입력해주세요." })
    .max(30, { error: "이름은 30자 이하로 입력해주세요." }),
  phone: z
    .string()
    .trim()
    .regex(PHONE_REGEX, { error: "전화번호 형식을 확인해주세요. (예: 010-1234-5678)" }),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ error: "이메일 형식을 확인해주세요." })
    .max(120, { error: "이메일이 너무 깁니다." }),
  depositor_name: z
    .string()
    .trim()
    .min(1, { error: "입금자명을 입력해주세요." })
    .max(20, { error: "입금자명은 20자 이하로 입력해주세요." }),
  source: z
    .union([z.enum(PROGRAM_SOURCES), z.literal("")])
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  message: z
    .string()
    .max(200, { error: "한마디는 200자 이하로 작성해주세요." })
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined)),
  program_ids: z
    .array(z.number().int().min(1).max(4))
    .min(1, { error: "신청하실 회차를 최소 1개 이상 선택해주세요." })
    .max(4, { error: "회차는 최대 4개까지 선택 가능합니다." })
    .transform((arr) => Array.from(new Set(arr)).sort((a, b) => a - b)),
  consent_privacy: z
    .boolean()
    .refine((v) => v === true, { error: "개인정보 수집·이용 동의는 필수입니다." }),
  consent_refund: z
    .boolean()
    .refine((v) => v === true, { error: "취소·환불 규정 동의는 필수입니다." }),
  consent_marketing: z.boolean().default(false),
});

export type RegistrationInput = z.infer<typeof RegistrationInputSchema>;

// API 응답 — POST /api/registrations
export type RegistrationCreated = {
  id: string;
  reference_no: string;
  total_amount: number;
  expires_at: string;
};

// 클라이언트가 입력하는 형태(전화 자동 하이픈 등 폼 상태)
export type RegistrationFormValues = {
  name: string;
  phone: string;
  email: string;
  depositor_name: string;
  source: ProgramSource | "";
  message: string;
  program_ids: number[];
  consent_privacy: boolean;
  consent_refund: boolean;
  consent_marketing: boolean;
  consent_all_required: boolean;
};

// 010 이외 입력에서도 사용자가 편의상 입력한 숫자를 자동 하이픈으로 포맷.
export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.startsWith("02")) {
    // 02-XXX(X)-XXXX
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    if (digits.length <= 9) return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  // 010 외 0NN 시작도 동일 포맷
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length <= 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}
