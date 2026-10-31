import { describe, it, expect, vi } from "vitest";
import {
  exportPlanAsJson,
  exportPlanAsMarkdown,
  downloadPlanAsJson,
  downloadPlanAsMarkdown,
} from "../export";
import type { BuildGraph, Project } from "@/types";

describe("Export plan (TASK 05.8)", () => {
  const sampleProject: Project = {
    id: "proj-123",
    title: "Kalp.io & Dependency Builder: Next Gen",
    description:
      'A tool that generates dependency graphs <with> "special" characters!',
    status: "completed",
    created_at: "2026-10-31T12:00:00Z",
  };

  const sampleGraph: BuildGraph = {
    nodes: [
      {
        id: "step-1",
        key: "01.1",
        title: "Setup & Database `init`",
        phase: "Phase 1: Setup",
        status: "completed",
        purpose: "Initialize SQLite schema & migrations.",
        dependencies: [],
        files: ["db/schema.sql", "db/init.ts"],
        criteria: ["Schema creates tables without error"],
        tests: ["test migration rollback"],
      },
      {
        id: "step-2",
        key: "01.2",
        title: "Scaffold Auth & Tokens (JWT)",
        phase: "Phase 1: Setup",
        status: "in_progress",
        purpose: "Setup bearer tokens with HMAC-SHA256 signature.",
        dependencies: ["step-1"],
        files: ["src/auth.ts"],
        criteria: ["Token signed and verified"],
        tests: ["test expired token", "test invalid signature"],
      },
      {
        id: "step-3",
        key: "02.1",
        title: "GraphQL & REST Endpoints",
        phase: "Phase 2: API",
        status: "pending",
        purpose: "Expose query/mutation layer.",
        dependencies: ["step-1", "step-2"],
        files: ["src/api/routes.ts"],
        criteria: ["200 OK returned on health check"],
        tests: ["test health endpoint"],
      },
    ],
    edges: [
      { id: "e1-2", source: "step-1", target: "step-2" },
      { id: "e1-3", source: "step-1", target: "step-3" },
      { id: "e2-3", source: "step-2", target: "step-3" },
    ],
  };

  it("exports valid JSON with all nodes, edges, and dependencies", () => {
    const jsonString = exportPlanAsJson(sampleGraph, sampleProject);
    const parsed = JSON.parse(jsonString);

    expect(parsed.project.id).toBe("proj-123");
    expect(parsed.nodes_count).toBe(3);
    expect(parsed.edges_count).toBe(3);
    expect(parsed.nodes).toHaveLength(3);

    // Verify dependencies are preserved
    const step3 = parsed.nodes.find((n: { id: string }) => n.id === "step-3");
    expect(step3).toBeDefined();
    expect(step3.dependencies).toEqual(["step-1", "step-2"]);
    expect(step3.title).toBe("GraphQL & REST Endpoints");
  });

  it("exports Markdown checklist with phases, checkboxes, criteria, files, and dependencies", () => {
    const md = exportPlanAsMarkdown(sampleGraph, sampleProject);

    expect(md).toContain("# Kalp.io & Dependency Builder: Next Gen");
    expect(md).toContain("## Phase 1: Setup");
    expect(md).toContain("## Phase 2: API");

    // Completed step checkbox
    expect(md).toContain("### [x] `01.1` Setup & Database `init`");
    // In progress or pending step checkbox
    expect(md).toContain("### [ ] `01.2` Scaffold Auth & Tokens (JWT)");
    expect(md).toContain("### [ ] `02.1` GraphQL & REST Endpoints");

    // Dependencies included
    expect(md).toContain("**Dependencies:**");
    expect(md).toContain("  - `step-1`");
    expect(md).toContain("  - `step-2`");

    // Files included
    expect(md).toContain("**Files / Modules:**");
    expect(md).toContain("  - `src/auth.ts`");
    expect(md).toContain("  - `db/schema.sql`");

    // Acceptance criteria included
    expect(md).toContain("**Acceptance Criteria:**");
    expect(md).toContain("  - Token signed and verified");
  });

  it("handles 50-node graph and special characters without throwing", () => {
    const largeGraph: BuildGraph = {
      nodes: Array.from({ length: 50 }, (_, i) => ({
        id: `node-${i}`,
        key: `0${Math.floor(i / 10) + 1}.${i % 10}`,
        title: `Task #${i + 1} with <special> & "symbols" / % * [brackets]`,
        phase: `Phase ${Math.floor(i / 10) + 1}`,
        status: i % 2 === 0 ? "completed" : "pending",
        dependencies: i > 0 ? [`node-${i - 1}`] : [],
        purpose: `Purpose for task ${i + 1}`,
        files: [`file_${i}.ts`],
        criteria: [`Criteria for step ${i}`],
      })),
      edges: Array.from({ length: 49 }, (_, i) => ({
        id: `edge-${i}`,
        source: `node-${i}`,
        target: `node-${i + 1}`,
      })),
    };

    const json = exportPlanAsJson(largeGraph, sampleProject);
    const parsed = JSON.parse(json);
    expect(parsed.nodes_count).toBe(50);
    expect(parsed.nodes[49].dependencies).toEqual(["node-48"]);

    const md = exportPlanAsMarkdown(largeGraph, sampleProject);
    expect(md).toContain('Task #50 with <special> & "symbols"');
    expect(md).toContain("`node-48`");
  });

  it("handles trigger download helpers in browser environment", () => {
    const mockClick = vi.fn();
    const mockAnchor = {
      href: "",
      download: "",
      click: mockClick,
    };

    const mockDocument = {
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
      },
      createElement: vi.fn(() => mockAnchor),
    };

    // Provide browser globals
    vi.stubGlobal("document", mockDocument);
    vi.stubGlobal("window", {});
    vi.stubGlobal(
      "Blob",
      class MockBlob {
        constructor(
          public parts: unknown[],
          public options?: unknown,
        ) {}
      },
    );
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:http://mock-url"),
      revokeObjectURL: vi.fn(),
    });

    downloadPlanAsJson(sampleGraph, sampleProject);
    expect(mockClick).toHaveBeenCalled();
    expect(mockAnchor.download).toBe(
      "kalp-io-dependency-builder-next-gen.json",
    );

    downloadPlanAsMarkdown(sampleGraph, sampleProject);
    expect(mockClick).toHaveBeenCalledTimes(2);
    expect(mockAnchor.download).toBe("kalp-io-dependency-builder-next-gen.md");

    vi.unstubAllGlobals();
  });
});
