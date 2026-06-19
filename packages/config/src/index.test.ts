import { describe, it, expect, beforeEach, afterEach } from "vitest";

describe("getPipelineEnv", () => {
  const origEnv = process.env;

  beforeEach(() => {
    process.env = { ...origEnv };
  });

  afterEach(() => {
    process.env = origEnv;
  });

  it("throws when ANTHROPIC_API_KEY is missing", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const { getPipelineEnv } = await import("./index.js");
    expect(() => getPipelineEnv()).toThrow(/ANTHROPIC_API_KEY.*[Rr]equired/);
  });

  it("returns default model when CLAUDE_MODEL is not set", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-test";
    delete process.env.CLAUDE_MODEL;
    const { getPipelineEnv } = await import("./index.js");
    const env = getPipelineEnv();
    expect(env.CLAUDE_MODEL).toBe("claude-sonnet-4-6");
  });

  it("returns custom model when CLAUDE_MODEL is set", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-test";
    process.env.CLAUDE_MODEL = "claude-opus-4-8";
    const { getPipelineEnv } = await import("./index.js");
    const env = getPipelineEnv();
    expect(env.CLAUDE_MODEL).toBe("claude-opus-4-8");
  });
});
