import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isLlmMockActive, generateLlmResponse } from "../llm";

describe("LLM Mock Safeguards (TASK 07.4)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns false when LLM_MOCK is unset", () => {
    delete process.env.LLM_MOCK;
    delete process.env.NEXT_PUBLIC_LLM_MOCK;
    expect(isLlmMockActive()).toBe(false);
  });

  it("activates mock mode when LLM_MOCK=1 in non-production", () => {
    process.env.LLM_MOCK = "1";
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "test",
      configurable: true,
    });
    expect(isLlmMockActive()).toBe(true);
  });

  it("throws error if LLM_MOCK=1 in production mode", () => {
    process.env.LLM_MOCK = "1";
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "production",
      configurable: true,
    });
    expect(() => isLlmMockActive()).toThrow(/SECURITY ERROR/);
  });

  it("returns mock response without calling external API when LLM_MOCK=1", async () => {
    process.env.LLM_MOCK = "1";
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "test",
      configurable: true,
    });

    const response = await generateLlmResponse({
      prompt: "Build an authentication service",
    });

    expect(response.mocked).toBe(true);
    expect(response.model).toBe("mock-gemini-2.5-flash");
    expect(response.text).toContain("Mock Step: Initialize project");
  });
});
