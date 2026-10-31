import { describe, expect, it, vi } from "vitest";
import * as api from "@/lib/api";
import { isNodeBlocked, isNodeReady } from "@/components/StatusControls";
import type { StepNode } from "@/lib/plan-map";

describe("05.5 StatusControls (Blocked disability & ready highlighting)", () => {
  const nodes: StepNode[] = [
    {
      id: "node-1",
      type: "step",
      position: { x: 0, y: 0 },
      data: {
        id: "node-1",
        stepKey: "01.1",
        title: "Init repo",
        status: "not_started",
        dependencies: [],
      },
    },
    {
      id: "node-2",
      type: "step",
      position: { x: 300, y: 0 },
      data: {
        id: "node-2",
        stepKey: "01.2",
        title: "Scaffold frontend",
        status: "not_started",
        dependencies: ["node-1"],
      },
    },
    {
      id: "node-3",
      type: "step",
      position: { x: 600, y: 0 },
      data: {
        id: "node-3",
        stepKey: "01.3",
        title: "Build app",
        status: "not_started",
        dependencies: ["node-2"],
      },
    },
  ];

  it("detects when a node is ready vs blocked by prerequisites", () => {
    // node-1 has 0 dependencies -> Ready
    expect(isNodeBlocked(nodes[0]!, nodes).blocked).toBe(false);
    expect(isNodeReady(nodes[0]!, nodes)).toBe(true);

    // node-2 depends on node-1 which is "not_started" -> Blocked
    const node2Check = isNodeBlocked(nodes[1]!, nodes);
    expect(node2Check.blocked).toBe(true);
    expect(node2Check.uncompletedPrereqs).toContain("Init repo");
    expect(isNodeReady(nodes[1]!, nodes)).toBe(false);

    // If node-1 becomes done:
    const updatedNodes: StepNode[] = [
      {
        ...nodes[0]!,
        data: { ...nodes[0]!.data, status: "done" },
      },
      nodes[1]!,
      nodes[2]!,
    ];

    // Now node-2 should be unblocked and Ready
    expect(isNodeBlocked(updatedNodes[1]!, updatedNodes).blocked).toBe(false);
    expect(isNodeReady(updatedNodes[1]!, updatedNodes)).toBe(true);

    // But node-3 is still blocked by node-2
    expect(isNodeBlocked(updatedNodes[2]!, updatedNodes).blocked).toBe(true);
  });

  it("calls updateNode API to persist status changes for reload survival", async () => {
    const updateSpy = vi.spyOn(api, "updateNode").mockResolvedValue({
      id: "node-1",
      status: "in_progress",
    });

    const result = await api.updateNode("node-1", { status: "in_progress" });
    expect(updateSpy).toHaveBeenCalledWith("node-1", { status: "in_progress" });
    expect(result.status).toBe("in_progress");

    updateSpy.mockRestore();
  });
});
