import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  API_BASE_URL,
  getApiUrl,
  normalizeErrorMessage,
  ApiError,
  apiFetch,
  getProject,
} from "../api";

describe("API Client and Base URL Config (TASK 05.9)", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("handles empty base URL as same origin and strips trailing slashes", () => {
    expect(getApiUrl("/api/projects")).toBe(
      `${API_BASE_URL ? API_BASE_URL : ""}/api/projects`,
    );
    expect(getApiUrl("api/health/")).toBe(
      `${API_BASE_URL ? API_BASE_URL : ""}/api/health`,
    );
    expect(getApiUrl("/")).toBe(`${API_BASE_URL ? API_BASE_URL : ""}/`);
  });

  it("normalises FastAPI 422 validation error array into a readable message", () => {
    const raw422 = JSON.stringify({
      detail: [
        {
          loc: ["body", "url"],
          msg: "Field required",
          type: "missing",
        },
        {
          loc: ["body", "title"],
          msg: "String should have at least 1 character",
          type: "string_too_short",
        },
      ],
    });

    const msg = normalizeErrorMessage(raw422, 422);
    expect(msg).toBe(
      "url: Field required; title: String should have at least 1 character",
    );
  });

  it("normalises string detail and custom { error } responses", () => {
    const detailError = JSON.stringify({ detail: "Project not found" });
    expect(normalizeErrorMessage(detailError, 404)).toBe("Project not found");

    const customError = JSON.stringify({ error: "Invalid GitHub repository" });
    expect(normalizeErrorMessage(customError, 400)).toBe(
      "Invalid GitHub repository",
    );
  });

  it("handles non-JSON error bodies gracefully without crashing", () => {
    const rawHtml = "<html><body><h1>502 Bad Gateway</h1></body></html>";
    const msg = normalizeErrorMessage(rawHtml, 502);
    expect(msg).toBeDefined();
    expect(typeof msg).toBe("string");
  });

  it("handles 429 and 500 status codes with clear feedback", () => {
    expect(normalizeErrorMessage("", 429)).toContain("Too many requests");
    expect(normalizeErrorMessage("", 500)).toContain("Server error");
  });

  it("sends credentials: 'include' with every request to preserve owner cookie", async () => {
    let capturedOptions: RequestInit | undefined;

    globalThis.fetch = vi.fn().mockImplementation((url, options) => {
      capturedOptions = options;
      return Promise.resolve(
        new Response(JSON.stringify({ id: "proj-1", title: "Test" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    });

    await getProject("proj-1");

    expect(capturedOptions?.credentials).toBe("include");
  });

  it("throws ApiError with normalized details on 422 error", async () => {
    const raw422 = JSON.stringify({
      detail: [{ loc: ["body", "repo_url"], msg: "Invalid URL format" }],
    });

    globalThis.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(raw422, {
          status: 422,
          statusText: "Unprocessable Entity",
        }),
      ),
    );

    await expect(apiFetch("/api/test")).rejects.toThrow(ApiError);
    try {
      await apiFetch("/api/test");
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(422);
      expect(apiErr.detail).toContain("repo_url: Invalid URL format");
    }
  });

  it("catches network failure and translates to ApiError with status 0", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Failed to fetch"));

    await expect(apiFetch("/api/ping")).rejects.toThrow(ApiError);
    try {
      await apiFetch("/api/ping");
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(0);
      expect(apiErr.message).toContain("Failed to fetch");
    }
  });
});
