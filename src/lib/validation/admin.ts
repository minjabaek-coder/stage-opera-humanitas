import { z } from "zod";

// PRD §5.2 Admin API 입력 검증.

const STATUS_VALUES = ["pending", "confirmed", "cancelled"] as const;
export type RegistrationStatus = (typeof STATUS_VALUES)[number];

// GET /api/admin/registrations?status=&program=&q=&page=&page_size=
export const RegistrationsListQuerySchema = z.object({
  status: z
    .enum(["all", ...STATUS_VALUES])
    .optional()
    .default("all"),
  program: z.coerce.number().int().min(1).max(4).optional(),
  q: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).max(10_000).optional().default(1),
  page_size: z.coerce.number().int().min(1).max(100).optional().default(20),
});
export type RegistrationsListQuery = z.infer<typeof RegistrationsListQuerySchema>;

// POST /api/admin/registrations/[id]/cancel
export const CancelBodySchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, { error: "취소 사유를 입력해주세요." })
    .max(200, { error: "사유는 200자 이하로 작성해주세요." }),
});
export type CancelBody = z.infer<typeof CancelBodySchema>;

// PUT /api/admin/settings  (PRD §3.7 입금 정보 + 예약 정책)
// 모든 필드 선택적 — 부분 업데이트 지원.
export const SettingsUpdateSchema = z
  .object({
    bank_name: z.string().trim().min(1).max(50).optional(),
    account_number: z.string().trim().min(1).max(50).optional(),
    account_holder: z.string().trim().min(1).max(50).optional(),
    hold_hours: z.number().int().min(1).max(720).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    error: "변경할 항목이 없습니다.",
  });
export type SettingsUpdate = z.infer<typeof SettingsUpdateSchema>;

// PUT /api/admin/programs/[id]  (PRD §3.7 회차별 정원)
export const ProgramUpdateSchema = z.object({
  capacity: z.number().int().min(1).max(500),
});
export type ProgramUpdate = z.infer<typeof ProgramUpdateSchema>;

export const REGISTRATION_STATUSES = STATUS_VALUES;
