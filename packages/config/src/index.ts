import { z } from "zod";

const pipelineEnvSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1, "ANTHROPIC_API_KEY is required"),
  CLAUDE_MODEL: z.string().default("claude-sonnet-4-6"),
  DATABASE_URL: z.string().optional(),
  DATABASE_PROVIDER: z.enum(["sqlite", "postgresql"]).optional(),
});

const webEnvSchema = z.object({
  DATABASE_URL: z.string().optional(),
  DATABASE_PROVIDER: z.enum(["sqlite", "postgresql"]).optional(),
  TRIAGE_API_SECRET: z.string().optional(),
});

function validateEnv<T extends z.ZodTypeAny>(schema: T): z.infer<T> {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Environment validation failed:\n${issues}\n\nSee .env.example for required vars.`);
  }
  return result.data;
}

/** Validated env for the pipeline app. Call once at startup. */
export function getPipelineEnv() {
  return validateEnv(pipelineEnvSchema);
}

/** Validated env for the web app. Call once at startup (e.g. in route.ts). */
export function getWebEnv() {
  return validateEnv(webEnvSchema);
}

/** The Claude model to use, read from CLAUDE_MODEL env var. */
export const CLAUDE_MODEL = process.env.CLAUDE_MODEL ?? "claude-sonnet-4-6";
