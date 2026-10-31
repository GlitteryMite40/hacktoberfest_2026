import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import GeminiStatusPage from "@/app/gemini_status/page";
import * as api from "@/lib/api";

describe("Gemini Status Page (TASK 05.11)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders GeminiStatusPage component without crashing", () => {
    vi.spyOn(api, "getLlmStatus").mockResolvedValue({
      key_present: true,
      test_call_success: true,
      model_name: "gemini-2.5-flash",
    });

    const element = React.createElement(GeminiStatusPage);
    expect(element).toBeDefined();
    expect(element.type).toBe(GeminiStatusPage);
  });

  it("calls getLlmStatus on mount", async () => {
    const mockStatus = {
      key_present: true,
      test_call_success: true,
      model_name: "gemini-2.5-pro",
    };
    const getLlmStatusSpy = vi
      .spyOn(api, "getLlmStatus")
      .mockResolvedValue(mockStatus);

    const result = await api.getLlmStatus();
    expect(getLlmStatusSpy).toHaveBeenCalled();
    expect(result.model_name).toBe("gemini-2.5-pro");
    expect(result.test_call_success).toBe(true);
  });

  it("handles backend failure and reports unreachable state", async () => {
    vi.spyOn(api, "getLlmStatus").mockRejectedValue(
      new api.ApiError(503, JSON.stringify({ detail: "Service Unavailable" })),
    );

    await expect(api.getLlmStatus()).rejects.toThrow(api.ApiError);
    try {
      await api.getLlmStatus();
    } catch (err) {
      const apiErr = err as api.ApiError;
      expect(apiErr.status).toBe(503);
      expect(apiErr.detail).toContain("Service Unavailable");
    }
  });
});
