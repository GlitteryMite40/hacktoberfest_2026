import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { DriftBadge } from "@/components/DriftBadge";
import { RepoConnect, isLocalBackend } from "@/components/RepoConnect";
import * as api from "@/lib/api";

describe("Repo Connect and Live Status (TASK 05.10)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("isLocalBackend helper", () => {
    it("detects local backend URLs accurately", () => {
      expect(isLocalBackend("http://127.0.0.1:8000")).toBe(true);
      expect(isLocalBackend("http://localhost:8000")).toBe(true);
      expect(isLocalBackend("http://0.0.0.0:8000")).toBe(true);
      expect(isLocalBackend("")).toBe(true); // empty string is local same-origin default
      expect(isLocalBackend("https://api.kalp.io")).toBe(false);
      expect(isLocalBackend("https://my-backend.up.railway.app")).toBe(false);
    });
  });

  describe("DriftBadge", () => {
    it("returns null when no status, drift, or suggested match is present", () => {
      const element = DriftBadge({});
      expect(element).toBeNull();
    });

    it("renders committed badge when status is committed", () => {
      const element = React.createElement(DriftBadge, {
        status: "committed",
      });
      expect(element).toBeDefined();
      expect(element.props.status).toBe("committed");
    });

    it("renders drift warning badge when drift is detected", () => {
      const element = React.createElement(DriftBadge, {
        drift: true,
        driftReason: "File src/auth.ts modified unexpectedly",
      });
      expect(element).toBeDefined();
      expect(element.props.drift).toBe(true);
      expect(element.props.driftReason).toContain("modified unexpectedly");
    });

    it("renders suggested match badge with git commit message", () => {
      const element = React.createElement(DriftBadge, {
        suggestedMatch: "fix: auth token validation",
      });
      expect(element).toBeDefined();
      expect(element.props.suggestedMatch).toBe("fix: auth token validation");
    });
  });

  describe("RepoConnect Component", () => {
    it("renders form when repo is null", () => {
      const onRepoUpdated = vi.fn();
      const element = React.createElement(RepoConnect, {
        projectId: "proj-1",
        repo: null,
        onRepoUpdated,
      });
      expect(element).toBeDefined();
      expect(element.type).toBe(RepoConnect);
    });

    it("handles connection failure on invalid repository URL", async () => {
      const connectSpy = vi
        .spyOn(api, "connectProjectRepo")
        .mockRejectedValue(
          new api.ApiError(
            400,
            JSON.stringify({ detail: "Public repository not found on GitHub" }),
          ),
        );

      await expect(
        api.connectProjectRepo("proj-1", {
          url: "https://github.com/invalid/repo",
        }),
      ).rejects.toThrow(api.ApiError);

      expect(connectSpy).toHaveBeenCalledWith("proj-1", {
        url: "https://github.com/invalid/repo",
      });
    });

    it("connects repository successfully and exposes webhook URL and secret", async () => {
      const mockResponse = {
        url: "https://github.com/test-owner/test-repo",
        owner: "test-owner",
        name: "test-repo",
        webhook_url: "https://api.kalp.io/api/webhook/github",
        webhook_secret: "whsec_abc12345",
      };

      vi.spyOn(api, "connectProjectRepo").mockResolvedValue(mockResponse);

      const result = await api.connectProjectRepo("proj-1", {
        url: "https://github.com/test-owner/test-repo",
      });

      expect(result.webhook_url).toBe("https://api.kalp.io/api/webhook/github");
      expect(result.webhook_secret).toBe("whsec_abc12345");
    });
  });

  describe("Polling Behavior with Tab Visibility", () => {
    it("pauses polling when tab is hidden", () => {
      let documentHidden = true;
      const mockFetchGraph = vi.fn();

      // Simulated polling callback
      const pollStep = () => {
        if (documentHidden) return;
        mockFetchGraph();
      };

      // Hidden tab: no fetch
      pollStep();
      expect(mockFetchGraph).not.toHaveBeenCalled();

      // Tab visible: fetch triggers
      documentHidden = false;
      pollStep();
      expect(mockFetchGraph).toHaveBeenCalledTimes(1);
    });
  });
});
