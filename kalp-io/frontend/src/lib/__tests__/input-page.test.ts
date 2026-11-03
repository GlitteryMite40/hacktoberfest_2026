import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { readIdeaFile, validateIdea } from "@/lib/idea-input";
import { readProgress, runStages, type Progress } from "@/lib/run-flow";
import type { Project } from "@/types";

describe("Input Validation (empty input & character limits)", () => {
  it("rejects empty input with clear guidance", () => {
    const error = validateIdea("");
    expect(error).toContain("Add your idea first");
  });

  it("rejects input with only whitespace", () => {
    const error = validateIdea("    \n\t  ");
    expect(error).toContain("Add your idea first");
  });

  it("rejects input that is too short (< 10 chars)", () => {
    const error = validateIdea("App idea", 1000, 10);
    expect(error).toContain(
      "Your idea is 8 characters. Add a little more detail",
    );
  });

  it("rejects input exceeding character limit", () => {
    const max = 20;
    const error = validateIdea(
      "This is definitely way too long for max",
      max,
      5,
    );
    expect(error).toContain("characters. Kalp.io can read up to 20");
  });

  it("accepts valid input within limits", () => {
    const error = validateIdea(
      "Build a collaborative whiteboard with live cursors.",
    );
    expect(error).toBeNull();
  });
});

describe("File Upload (oversized file & extension validation)", () => {
  it("rejects files with unsupported extensions", async () => {
    const file = {
      name: "diagram.png",
      size: 50,
      text: async () => "content",
    };
    const result = await readIdeaFile(file);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Upload a .txt or .md file instead");
    }
  });

  it("rejects oversized file by size check before full read", async () => {
    const textSpy = vi.fn().mockResolvedValue("dummy");
    const maxChars = 100;
    const file = {
      name: "large_spec.md",
      size: 100 * 5, // exceeds max * 4 bytes
      text: textSpy,
    };
    const result = await readIdeaFile(file, maxChars);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("is too big");
    }
    expect(textSpy).not.toHaveBeenCalled();
  });

  it("rejects file whose text content exceeds character limit", async () => {
    const maxChars = 25;
    const longContent =
      "This file text content exceeds twenty five characters.";
    const file = {
      name: "spec.txt",
      size: 50,
      text: async () => longContent,
    };
    const result = await readIdeaFile(file, maxChars);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Kalp.io can read up to 25");
    }
  });

  it("successfully reads valid .txt and .md files", async () => {
    const validContent =
      "Project specification: Build an automated testing framework.";
    const file = {
      name: "idea.md",
      size: validContent.length,
      text: async () => validContent,
    };
    const result = await readIdeaFile(file);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.text).toBe(validContent);
    }
  });
});

describe("Stage Run & API Failure / Retry Handling", () => {
  it("handles API failure gracefully and marks phase as failed", async () => {
    const initialProgress: Progress = {
      stages: [
        { key: "analysis", label: "Analysis", status: "pending" },
        { key: "architecture", label: "Architecture", status: "pending" },
      ],
      phase: "running",
    };

    const mockRun = vi
      .fn()
      .mockRejectedValue(new ApiError(500, "Gemini quota exceeded"));
    const mockGet = vi.fn().mockResolvedValue({
      id: "p-123",
      title: "Test",
      status: "failed",
      stages: [
        {
          key: "analysis",
          label: "Analysis",
          status: "failed",
          error: "Quota error",
        },
        { key: "architecture", label: "Architecture", status: "pending" },
      ],
    } as Project);

    const onProgress = vi.fn();
    const outcome = await runStages(
      "p-123",
      initialProgress,
      { run: mockRun, get: mockGet },
      onProgress,
    );

    expect(outcome.kind).toBe("failed");
    if (outcome.kind === "failed") {
      expect(outcome.message).toContain("Gemini quota exceeded");
      expect(outcome.progress.phase).toBe("failed");
    }
  });

  it("completes all stages when API succeeds", async () => {
    const initialProgress: Progress = {
      stages: [
        { key: "s1", label: "Step 1", status: "pending" },
        { key: "s2", label: "Step 2", status: "pending" },
      ],
      phase: "running",
    };

    let callCount = 0;
    const mockRun = vi.fn().mockImplementation(async () => {
      callCount += 1;
    });

    const mockGet = vi.fn().mockImplementation(async () => {
      if (callCount === 1) {
        return {
          id: "p-123",
          title: "Test",
          status: "running",
          stages: [
            { key: "s1", label: "Step 1", status: "done" },
            { key: "s2", label: "Step 2", status: "pending" },
          ],
        } as Project;
      }
      return {
        id: "p-123",
        title: "Test",
        status: "completed",
        stages: [
          { key: "s1", label: "Step 1", status: "done" },
          { key: "s2", label: "Step 2", status: "done" },
        ],
      } as Project;
    });

    const onProgress = vi.fn();
    const outcome = await runStages(
      "p-123",
      initialProgress,
      { run: mockRun, get: mockGet },
      onProgress,
    );

    expect(outcome.kind).toBe("done");
    if (outcome.kind === "done") {
      expect(outcome.progress.phase).toBe("done");
      expect(outcome.progress.stages.every((s) => s.status === "done")).toBe(
        true,
      );
    }
  });

  it("resumes correctly from a project snapshot", () => {
    const project: Project = {
      id: "p-resumed",
      title: "Resumed Project",
      status: "running",
      stages: [
        { key: "spec", label: "Specification", status: "done" },
        { key: "graph", label: "Graph generation", status: "running" },
      ],
    };

    const progress = readProgress(project);
    expect(progress.phase).toBe("running");
    expect(progress.stages[0]?.status).toBe("done");
    expect(progress.stages[1]?.status).toBe("running");
  });
});
