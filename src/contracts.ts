import * as z from "zod/v4";

export const ROLE_IDS = ["strategist", "diplomat", "schemer"] as const;
export type AdvisorRole = (typeof ROLE_IDS)[number];
export const ROLE_NAMES: Record<AdvisorRole | "arbiter", string> = {
  strategist: "战略家",
  diplomat: "纵横家",
  schemer: "阴谋家",
  arbiter: "贾诩(合议者)",
};

// Bounds protect transport and memory, not the shape of a model's reasoning.
export const LIMITS = Object.freeze({
  problem: 4_000,
  context: 16_000,
  response: 12_000,
  sessions: 32,
  ttlMs: 2 * 60 * 60 * 1_000,
});

const nonblank = (max: number) =>
  z
    .string()
    .min(1)
    .max(max)
    .refine((s) => s.trim().length > 0, "Must not be blank");
export const responsesSchema = z.strictObject({
  strategist: nonblank(LIMITS.response),
  diplomat: nonblank(LIMITS.response),
  schemer: nonblank(LIMITS.response),
});
export type Responses = z.infer<typeof responsesSchema>;

export const beginSchema = z.strictObject({
  problem: nonblank(LIMITS.problem).describe("需要决断的具体问题。"),
  context: z
    .string()
    .max(LIMITS.context)
    .default("")
    .describe("用户的背景、处境、所求及已知材料。"),
  request_id: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[A-Za-z0-9._:-]+$/)
    .optional()
    .describe("可选的调用方重试标识；相同标识只能用于同一问题和上下文。"),
});
export const submitSchema = z.strictObject({
  session_id: z.uuid(),
  proposals: responsesSchema.describe("三位独立实例的方略全文，保持原文。"),
});
export const verdictSchema = z.strictObject({
  session_id: z.uuid(),
  critiques: responsesSchema.describe("三位质询实例的结果全文，保持原文。"),
});

export const jobSchema = z.strictObject({
  role: z.enum([...ROLE_IDS, "arbiter"]),
  name: z.string(),
  system_prompt: z.string(),
  user_prompt: z.string(),
});
export const packetSchema = z.strictObject({
  session_id: z.uuid(),
  stage: z.enum(["proposal", "critique", "verdict"]),
  expires_at: z.iso.datetime(),
  instructions: z.string(),
  jobs: z.array(jobSchema).min(1).max(3),
  next_tool: z.enum(["strategize_submit", "strategize_verdict"]).nullable(),
});
export type Job = z.infer<typeof jobSchema>;
export type Packet = z.infer<typeof packetSchema>;

export class CouncilError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "CouncilError";
  }
}
