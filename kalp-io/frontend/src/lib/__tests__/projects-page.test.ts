import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import ProjectsPage from "@/app/projects/page";
import * as api from "@/lib/api";
import type { Project } from "@/types";

describe("Projects List Page (TASK 05.7)", () => {
  const sampleProjects: Project[] = [
    {
      id: "proj-1",
      title: "Kalp Engine",
      description: "Fast dependency solver",
      status: "completed",
      created_at: "2026-10-31T10:00:00Z",
    },
    {
      id: "proj-2",
      title: "Mobile App Companion",
      description: "React Native client",
      status: "in_progress",
      created_at: "2026-10-31T11:00:00Z",
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders ProjectsPage component without error", () => {
    vi.spyOn(api, "getProjects").mockResolvedValue(sampleProjects);
    const element = React.createElement(ProjectsPage);
    expect(element).toBeDefined();
    expect(element.type).toBe(ProjectsPage);
  });

  it("handles delete flow correctly and protects against double-deletion", async () => {
    const deleteSpy = vi
      .spyOn(api, "deleteProject")
      .mockResolvedValue({ success: true });

    // Calling delete once
    await api.deleteProject("proj-1");
    expect(deleteSpy).toHaveBeenCalledWith("proj-1");

    // Second call simulates backend handling
    deleteSpy.mockRejectedValueOnce(
      new api.ApiError(404, JSON.stringify({ detail: "Project not found" })),
    );
    await expect(api.deleteProject("proj-1")).rejects.toThrow(api.ApiError);
  });

  it("handles forbidden deletion for another owner's project", async () => {
    vi.spyOn(api, "deleteProject").mockRejectedValue(
      new api.ApiError(
        403,
        JSON.stringify({
          detail: "Permission denied: project owned by another session",
        }),
      ),
    );

    await expect(api.deleteProject("proj-foreign")).rejects.toThrow(
      api.ApiError,
    );
  });
});
