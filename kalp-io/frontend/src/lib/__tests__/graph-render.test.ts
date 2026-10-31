import { describe, expect, it } from "vitest";
import {
  extractPhase,
  toFlow,
  toStepStatus,
  type StepStatus,
} from "@/lib/plan-map";
import type { BuildGraph, BuildNode } from "@/types";

describe("Graph Render (50-node graph layout & accessibility)", () => {
  it("renders and lays out a 50-node graph with Dagre across multiple phases", () => {
    // Generate a 50-node graph with 5 phases, 10 nodes per phase
    const nodes: BuildNode[] = [];
    const edges: { source: string; target: string }[] = [];

    const PHASES = ["01 Setup", "02 Core", "03 API", "04 UI", "05 Deploy"];

    for (let i = 1; i <= 50; i++) {
      const phaseIndex = Math.floor((i - 1) / 10);
      const phaseName = PHASES[phaseIndex]!;
      const nodeId = `node-${i}`;

      // Dependencies: connect to previous node in same phase or cross-phase
      const dependencies: string[] = [];
      if (i > 1 && (i - 1) % 10 !== 0) {
        dependencies.push(`node-${i - 1}`);
      } else if (i > 10) {
        // First node in phase depends on previous phase node
        dependencies.push(`node-${i - 10}`);
      }

      for (const dep of dependencies) {
        edges.push({ source: dep, target: nodeId });
      }

      nodes.push({
        id: nodeId,
        key: `0${phaseIndex + 1}.${((i - 1) % 10) + 1}`,
        title: `Task ${i} - ${phaseName}`,
        description: `Detailed description for task ${i}`,
        phase: phaseName,
        status: i <= 20 ? "completed" : i <= 25 ? "in_progress" : "pending",
        dependencies,
      });
    }

    const fiftyNodeGraph: BuildGraph = { nodes, edges };

    // Layout graph with Dagre
    const flowResult = toFlow(fiftyNodeGraph, { direction: "LR" });

    // Verify all 50 nodes are present
    expect(flowResult.nodes).toHaveLength(50);
    expect(flowResult.edges).toHaveLength(edges.length);

    // Verify every node has valid finite coordinates
    for (const node of flowResult.nodes) {
      expect(Number.isFinite(node.position.x)).toBe(true);
      expect(Number.isFinite(node.position.y)).toBe(true);
      expect(node.data.title).toContain("Task");
      expect(node.data.phase).toBeDefined();
    }

    // Verify Dagre laid out nodes across space (no collapsing into 0,0)
    const xCoords = flowResult.nodes.map((n) => n.position.x);
    const yCoords = flowResult.nodes.map((n) => n.position.y);
    const minX = Math.min(...xCoords);
    const maxX = Math.max(...xCoords);
    const minY = Math.min(...yCoords);
    const maxY = Math.max(...yCoords);

    expect(maxX - minX).toBeGreaterThan(500); // multiple ranks wide
    expect(maxY - minY).toBeGreaterThan(100); // multiple rows high

    // Verify layout works in TB (top to bottom) direction as well
    const tbResult = toFlow(fiftyNodeGraph, { direction: "TB" });
    expect(tbResult.nodes).toHaveLength(50);
    const tbYCoords = tbResult.nodes.map((n) => n.position.y);
    expect(Math.max(...tbYCoords) - Math.min(...tbYCoords)).toBeGreaterThan(
      500,
    );
  });

  it("maps all statuses accurately for coloring", () => {
    const testCases: [unknown, StepStatus][] = [
      ["completed", "done"],
      ["done", "done"],
      ["in_progress", "in_progress"],
      ["started", "in_progress"],
      ["ready", "next"],
      ["next_up", "next"],
      ["committed", "committed"],
      ["blocked", "locked"],
      ["locked", "locked"],
      ["failed", "failed"],
      ["needs_review", "review"],
      ["pending", "not_started"],
      ["unknown_status", "not_started"],
    ];

    for (const [input, expected] of testCases) {
      expect(toStepStatus(input)).toBe(expected);
    }
  });

  it("extracts phase from node.phase, node.stage, or key prefix", () => {
    expect(extractPhase({ id: "1", phase: "Architecture" })).toBe(
      "Architecture",
    );
    expect(extractPhase({ id: "2", stage: "Database" })).toBe("Database");
    expect(extractPhase({ id: "3", key: "03.2" })).toBe("Phase 03");
    expect(extractPhase({ id: "4", step_key: "01.1" })).toBe("Phase 01");
    expect(extractPhase({ id: "5", metadata: { phase: "Frontend" } })).toBe(
      "Frontend",
    );
    expect(extractPhase({ id: "6" })).toBeUndefined();
  });

  it("ensures empty graphs layout cleanly without error", () => {
    const empty = toFlow({ nodes: [] });
    expect(empty.nodes).toHaveLength(0);
    expect(empty.edges).toHaveLength(0);
  });
});
